"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { buildScene, cameraFor, governing, sceneToDxf, type CameraPreset, type Scene3DOptions } from "@/lib/dalot/scene3d";
import type { Study } from "@/lib/dalot/engine";
import { downloadBlob, slug } from "./download";

type Opts = Scene3DOptions & { rotate: boolean; labels: boolean };

const LABEL_COLORS = { geo: "#0f172a", load: "#9a3412", effort: "#1d4ed8" } as const;

export function Viewer3D({ study }: { study: Study }) {
  const ref = useRef<HTMLDivElement>(null);
  const camState = useRef<{ p: THREE.Vector3; t: THREE.Vector3; n: number } | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const convoys = study.analysis.traffic.filter((t) => t.positions.length);
  const [o, setO] = useState<Opts>({ concrete: "opaque", fill: true, convoy: convoys[0]?.def.id ?? "", rebar: false, cut: false, efforts: false, rotate: false, labels: true, pressures: false, effortKind: "M" });
  const [view, setView] = useState<{ preset: CameraPreset; n: number }>({ preset: "iso", n: 0 });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const gov = useMemo(() => governing(study, o.convoy), [study, o.convoy]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const { scene, R, center, labels } = buildScene(study, o, gov);
    if (o.labels) {
      for (const l of labels) {
        const div = document.createElement("div");
        div.textContent = l.text;
        div.style.cssText = `font: bold 11px Arial, sans-serif; color: ${LABEL_COLORS[l.kind]}; background: rgba(255,255,255,0.88); border: 1px solid ${LABEL_COLORS[l.kind]}; border-radius: 3px; padding: 1px 4px; white-space: nowrap; pointer-events: none;`;
        const obj = new CSS2DObject(div);
        obj.position.copy(l.p);
        scene.add(obj);
      }
    }
    sceneRef.current = scene;
    const W = el.clientWidth || 800, Hh = el.clientHeight || 520;
    const camera = new THREE.PerspectiveCamera(40, W / Hh, 0.05, 1000);
    const keep = camState.current && view.n === camState.current.n;
    camera.position.copy(keep ? camState.current!.p : cameraFor(view.preset, center, R));
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, Hh);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    el.replaceChildren(renderer.domElement);
    el.style.position = "relative";
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(W, Hh);
    labelRenderer.domElement.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;";
    el.appendChild(labelRenderer.domElement);
    rendererRef.current = renderer;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(keep ? camState.current!.t : center);
    controls.enableDamping = true;
    controls.autoRotate = o.rotate;
    controls.autoRotateSpeed = 1.6;

    let raf = 0;
    const loop = () => { controls.update(); renderer.render(scene, camera); labelRenderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); labelRenderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);
    return () => {
      camState.current = { p: camera.position.clone(), t: controls.target.clone(), n: view.n };
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
  }, [study, o, gov, view]);

  const savePng = () => {
    rendererRef.current?.domElement.toBlob((blob) => {
      if (blob) void downloadBlob(blob, `vue3d_${slug(study.input.ident.projet)}.png`);
    }, "image/png");
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
        <button onClick={() => setO({ ...o, efforts: !o.efforts || o.effortKind !== "M", effortKind: "M" })} className={chip(o.efforts && o.effortKind !== "V")}>Moments</button>
        <button onClick={() => setO({ ...o, efforts: !o.efforts || o.effortKind !== "V", effortKind: "V" })} className={chip(o.efforts && o.effortKind === "V")}>Effort tranchant</button>
        <button onClick={() => setO({ ...o, pressures: !o.pressures })} className={chip(!!o.pressures)}>Pressions</button>
        <button onClick={() => setO({ ...o, labels: !o.labels })} className={chip(o.labels)}>Valeurs</button>
        <button onClick={() => setO({ ...o, rotate: !o.rotate })} className={chip(o.rotate)}>Rotation auto</button>
        <span className="ml-2 text-xs text-slate-500">Vue</span>
        {([["iso", "3/4"], ["dessus", "dessus"], ["face", "face"], ["cote", "côté"]] as const).map(([p, l]) => (
          <button key={p} onClick={() => setView({ preset: p, n: view.n + 1 })} className={chip(false)}>{l}</button>
        ))}
        <button onClick={() => { if (sceneRef.current) void downloadBlob(new Blob([sceneToDxf(sceneRef.current)], { type: "application/dxf" }), `maquette3d_${slug(study.input.ident.projet)}.dxf`); }}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Maquette DXF 3D</button>
        <button onClick={savePng} className="ml-auto rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Enregistrer l&apos;image</button>
      </div>
      <div ref={ref} className="h-[560px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100" />
      {gov && (
        <p className="text-xs text-slate-500">
          {gov.t.def.label} ({gov.t.def.configs[gov.pos.config].label}) à la position du moment maximal dans la dalle : essieu de référence à x = {gov.pos.X.toFixed(2).replace(".", ",")} m
          {gov.pos.reversed ? " (sens inverse)" : ""}, M = {gov.value.toFixed(1).replace(".", ",")} kN·m/m (caractéristique, δ inclus). En orange translucide : volumes de diffusion de chaque roue jusqu&apos;au feuillet moyen de la dalle.
          Souris : rotation (clic gauche), déplacement (clic droit), zoom (molette).
        </p>
      )}
    </div>
  );
}
