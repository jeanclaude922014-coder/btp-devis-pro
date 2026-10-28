"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { stripBlocks } from "@/lib/dalot/convoys";
import { transverseSpread } from "@/lib/dalot/analysis";
import { bodyBars, repMap } from "@/lib/dalot/drawings";
import type { Study } from "@/lib/dalot/engine";
import { slug } from "./download";

type Opts = { concrete: "opaque" | "transparent" | "masque"; fill: boolean; convoy: string; rebar: boolean; cut: boolean };

/** Position défavorable d'un convoi pour le moment maximal en travée de dalle. */
function governing(study: Study, convoyId: string) {
  const t = study.analysis.traffic.find((x) => x.def.id === convoyId && x.positions.length);
  if (!t) return null;
  let best = -1, val = -Infinity;
  for (const m of study.analysis.model.members.filter((mm) => mm.kind === "dalle")) {
    m.nodes.forEach((_, k) => {
      const q = m.station0 + k;
      if (t.max[q] > val) { val = t.max[q]; best = q; }
    });
  }
  const pos = t.positions[t.argMax[best]];
  return pos ? { t, pos, value: val } : null;
}

export function Viewer3D({ study }: { study: Study }) {
  const ref = useRef<HTMLDivElement>(null);
  const camState = useRef<{ p: THREE.Vector3; t: THREE.Vector3 } | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const convoys = study.analysis.traffic.filter((t) => t.positions.length);
  const [o, setO] = useState<Opts>({ concrete: "opaque", fill: true, convoy: convoys[0]?.def.id ?? "", rebar: false, cut: false });
  const gov = useMemo(() => governing(study, o.convoy), [study, o.convoy]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const inp = study.input;
    const model = study.analysis.model;
    const B = model.xRight - model.xLeft;
    const H = inp.er + inp.hInt + inp.es;
    const L = inp.L;
    const t = inp.tetes;
    const W = el.clientWidth || 800, Hh = el.clientHeight || 520;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(40, W / Hh, 0.05, 500);
    const R = Math.max(B, L, H) * 1.9;
    if (camState.current) camera.position.copy(camState.current.p); else camera.position.set(B / 2 + R * 0.9, H + R * 0.6, L / 2 + R * 0.9);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, Hh);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    el.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;
    const controls = new OrbitControls(camera, renderer.domElement);
    if (camState.current) controls.target.copy(camState.current.t); else controls.target.set(B / 2, H / 2, L / 2);
    controls.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(B * 2, H * 6, L * 1.5);
    scene.add(sun);

    const clip = o.cut ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), L / 2)] : [];
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xb8c0cc, roughness: 0.85, side: THREE.DoubleSide, clippingPlanes: clip,
      transparent: o.concrete !== "opaque", opacity: o.concrete === "transparent" ? 0.28 : 1, depthWrite: o.concrete === "opaque",
    });
    const addConcrete = (geo: THREE.BufferGeometry, pos?: THREE.Vector3, rotY = 0) => {
      if (o.concrete === "masque") return;
      const mesh = new THREE.Mesh(geo, concreteMat);
      if (pos) mesh.position.copy(pos);
      mesh.rotation.y = rotY;
      scene.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: 0x475569, clippingPlanes: clip }));
      edges.position.copy(mesh.position);
      edges.rotation.y = rotY;
      scene.add(edges);
    };

    // Corps : section extrudée sur la longueur.
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(B, 0), new THREE.Vector2(B, H), new THREE.Vector2(0, H)]);
    let x = inp.eExt;
    inp.openings.forEach((op, k) => {
      const g = Math.min(inp.gousset, op / 4, inp.hInt / 4);
      const yb = inp.er, yt = inp.er + inp.hInt, x0 = x, x1 = x + op;
      const pts = g > 0
        ? [[x0 + g, yb], [x1 - g, yb], [x1, yb + g], [x1, yt - g], [x1 - g, yt], [x0 + g, yt], [x0, yt - g], [x0, yb + g]]
        : [[x0, yb], [x1, yb], [x1, yt], [x0, yt]];
      shape.holes.push(new THREE.Path(pts.map(([a, b]) => new THREE.Vector2(a, b))));
      x = x1 + (k < inp.openings.length - 1 ? inp.eInt : 0);
    });
    addConcrete(new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false }));

    // Murs de tête, radiers de tête, murs en aile.
    const hHead = study.heads.headWall.H;
    for (const z of [-t.murTeteEp / 2, L + t.murTeteEp / 2]) addConcrete(new THREE.BoxGeometry(B, hHead, t.murTeteEp), new THREE.Vector3(B / 2, H + hHead / 2, z));
    const a = (t.angle * Math.PI) / 180;
    if (t.radierLong > 0) {
      const w = B + 2 * t.radierLong * Math.tan(a) * (t.murs ? 1 : 0);
      for (const z of [-t.radierLong / 2, L + t.radierLong / 2]) addConcrete(new THREE.BoxGeometry(w, inp.er, t.radierLong), new THREE.Vector3(B / 2, inp.er / 2, z));
    }
    if (study.heads.wing) {
      const w = study.heads.wing;
      const ws = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(t.long, 0), new THREE.Vector2(t.long, w.Hend), new THREE.Vector2(0, Math.min(w.Htot, H + hHead))]);
      const geo = new THREE.ExtrudeGeometry(ws, { depth: t.ep, bevelEnabled: false });
      for (const [sx, xr] of [[-1, 0], [1, B]] as const) for (const [sz, zr] of [[-1, 0], [1, L]] as const) {
        const dx = sx * Math.sin(a), dz = sz * Math.cos(a);
        addConcrete(geo, new THREE.Vector3(xr, 0, zr), Math.atan2(-dz, dx));
      }
    }

    // Remblai et chaussée.
    const top = H + inp.hr + inp.ech;
    if (o.fill) {
      const fillMat = new THREE.MeshStandardMaterial({ color: 0xc8a165, transparent: true, opacity: 0.18, depthWrite: false, clippingPlanes: clip });
      const fill = new THREE.Mesh(new THREE.BoxGeometry(B + 6, top, L), fillMat);
      fill.position.set(B / 2, top / 2, L / 2);
      scene.add(fill);
    }
    const roadW = inp.Lr;
    const road = new THREE.Mesh(new THREE.BoxGeometry(B + 16, 0.04, roadW), new THREE.MeshStandardMaterial({ color: 0x374151, transparent: true, opacity: 0.85, clippingPlanes: clip }));
    road.position.set(B / 2, top + 0.02, L / 2);
    scene.add(road);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(B + 30, L + 30), new THREE.MeshStandardMaterial({ color: 0x8fb47a }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(B / 2, -0.01, L / 2);
    scene.add(ground);

    // Convoi à sa position défavorable et empreintes diffusées sur la dalle.
    if (gov) {
      const cfg = gov.t.def.configs[gov.pos.config];
      const toX = (px: number) => (gov.pos.reversed ? gov.pos.X - px : gov.pos.X + px) - model.xLeft;
      const z0 = L / 2 - roadW / 2 + 0.6;
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });
      for (const p of cfg.patches) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(p.ax, 0.25, p.ay), wheelMat);
        box.position.set(toX(p.x), top + 0.15, z0 + p.y);
        scene.add(box);
      }
      const { footprint } = stripBlocks(cfg, study.analysis.D, transverseSpread(inp));
      const fpMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
      for (const p of footprint) {
        const r = new THREE.Mesh(new THREE.PlaneGeometry(p.ax, p.ay), fpMat);
        r.rotation.x = -Math.PI / 2;
        r.position.set(toX(p.x), H + 0.02, z0 + p.y);
        scene.add(r);
      }
    }

    // Ferraillage du corps.
    if (o.rebar) {
      const bars = bodyBars(study, repMap(study));
      const mainPts: number[] = [], repPts: number[] = [];
      const c = inp.cover;
      for (const b of bars) {
        const g = study.design.groups.find((gg) => gg.id === b.group);
        if (!g) continue;
        for (let z = c; z <= L - c + 1e-9; z += g.bars.s) {
          if (o.cut && z > L / 2) break;
          for (let k = 0; k < b.pts.length - 1; k++) mainPts.push(b.pts[k][0], b.pts[k][1], z, b.pts[k + 1][0], b.pts[k + 1][1], z);
        }
        for (let k = 0; k < b.pts.length - 1; k++) {
          const [x0, y0] = b.pts[k], [x1, y1] = b.pts[k + 1];
          const len = Math.hypot(x1 - x0, y1 - y0);
          for (let u = 0.05; u < len; u += g.rep.s) {
            const px = x0 + ((x1 - x0) * u) / len, py = y0 + ((y1 - y0) * u) / len;
            repPts.push(px, py, c, px, py, o.cut ? L / 2 : L - c);
          }
        }
      }
      const mk = (pts: number[], color: number) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color })));
      };
      mk(mainPts, 0xdc2626);
      mk(repPts, 0x2563eb);
    }

    let raf = 0;
    const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);
    return () => {
      camState.current = { p: camera.position.clone(), t: controls.target.clone() };
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
      });
      renderer.dispose();
    };
  }, [study, o, gov]);

  const savePng = () => {
    const url = rendererRef.current?.domElement.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `vue3d_${slug(study.input.ident.projet)}.png`;
    a.click();
  };

  const chip = (on: boolean) => `rounded px-2 py-1 text-xs font-medium ${on ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs text-slate-500">Béton</span>
        {(["opaque", "transparent", "masque"] as const).map((v) => <button key={v} onClick={() => setO({ ...o, concrete: v })} className={chip(o.concrete === v)}>{v === "masque" ? "masqué" : v}</button>)}
        <span className="ml-2 text-xs text-slate-500">Affichage</span>
        <button onClick={() => setO({ ...o, fill: !o.fill })} className={chip(o.fill)}>Remblai</button>
        <button onClick={() => setO({ ...o, rebar: !o.rebar })} className={chip(o.rebar)}>Ferraillage</button>
        <button onClick={() => setO({ ...o, cut: !o.cut })} className={chip(o.cut)}>Coupe à mi-longueur</button>
        <span className="ml-2 text-xs text-slate-500">Convoi</span>
        <select value={o.convoy} onChange={(e) => setO({ ...o, convoy: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-xs">
          <option value="">aucun</option>
          {convoys.map((c) => <option key={c.def.id} value={c.def.id}>{c.def.label}</option>)}
        </select>
        <button onClick={savePng} className="ml-auto rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Enregistrer l&apos;image</button>
      </div>
      <div ref={ref} className="h-[560px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100" />
      {gov && (
        <p className="text-xs text-slate-500">
          {gov.t.def.label} ({gov.t.def.configs[gov.pos.config].label}) à la position du moment maximal dans la dalle : essieu de référence à x = {gov.pos.X.toFixed(2).replace(".", ",")} m
          {gov.pos.reversed ? " (sens inverse)" : ""}, M = {gov.value.toFixed(1).replace(".", ",")} kN·m/m (caractéristique, δ inclus). En orange clair : empreintes diffusées au plan de la dalle.
          Souris : rotation (clic gauche), déplacement (clic droit), zoom (molette).
        </p>
      )}
    </div>
  );
}
