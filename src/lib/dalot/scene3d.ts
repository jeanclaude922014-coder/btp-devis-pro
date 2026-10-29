/**
 * Maquette 3D de l'ouvrage complet (three.js) : corps, murs et radiers de tête, bêches, murs en
 * aile et leurs semelles, garde-corps, remblai, chaussée et terrain ; ferraillage barre par barre
 * du corps et des ouvrages de tête ; convoi à sa position défavorable avec ses volumes de
 * diffusion ; enveloppe des moments. Partagée par la visionneuse et par la note de calcul.
 */

import * as THREE from "three";
import { transverseSpread } from "./analysis";
import { stripBlocks } from "./convoys";
import { bodyBars } from "./drawings";
import type { Study } from "./engine";
import { GARDE_CORPS, gardeCorpsPosts } from "./quantities";

export type Scene3DOptions = {
  concrete: "opaque" | "transparent" | "masque";
  fill: boolean;
  convoy: string;
  rebar: boolean;
  cut: boolean;
  efforts: boolean;
};

export type CameraPreset = "iso" | "dessus" | "face" | "cote";

/** Position défavorable d'un convoi pour le moment maximal en travée de dalle. */
export function governing(study: Study, convoyId: string) {
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

export type Governing = NonNullable<ReturnType<typeof governing>>;

/** Maquette 3D au format DXF (R12) : faces 3DFACE et lignes 3D, un calque par élément. */
export function sceneToDxf(scene: THREE.Scene): string {
  const out: string[] = ["0", "SECTION", "2", "ENTITIES"];
  const n = (x: number) => x.toFixed(4);
  const v = new THREE.Vector3();
  // Repère DXF : x en travers, y le long de l'ouvrage, z vertical.
  const P = (p: THREE.Vector3) => [n(p.x), n(p.z), n(p.y)];
  scene.updateMatrixWorld(true);
  scene.traverse((obj) => {
    const layer = obj.userData.layer as string | undefined;
    if (!layer) return;
    const geo = (obj as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    const pos = geo?.getAttribute("position");
    if (!geo || !pos) return;
    const get = (i: number) => P(v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld));
    if ((obj as THREE.LineSegments).isLineSegments) {
      for (let i = 0; i + 1 < pos.count; i += 2) {
        const a = get(i), b = get(i + 1);
        out.push("0", "LINE", "8", layer, "10", a[0], "20", a[1], "30", a[2], "11", b[0], "21", b[1], "31", b[2]);
      }
      return;
    }
    const idx = geo.getIndex();
    const tri = idx ? idx.count / 3 : pos.count / 3;
    for (let k = 0; k < tri; k++) {
      const ids = [0, 1, 2].map((j) => (idx ? idx.getX(3 * k + j) : 3 * k + j));
      const [a, b, c] = ids.map(get);
      out.push("0", "3DFACE", "8", layer,
        "10", a[0], "20", a[1], "30", a[2], "11", b[0], "21", b[1], "31", b[2],
        "12", c[0], "22", c[1], "32", c[2], "13", c[0], "23", c[1], "33", c[2]);
    }
  });
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\r\n") + "\r\n";
}

/** Accumulateur de segments d'aciers (une géométrie par calque, rendu rapide). */
class Bars {
  main: number[] = [];
  rep: number[] = [];
  seg(a: THREE.Vector3, b: THREE.Vector3, main = true) { (main ? this.main : this.rep).push(a.x, a.y, a.z, b.x, b.y, b.z); }
  poly(pts: THREE.Vector3[], main = true) { for (let k = 0; k < pts.length - 1; k++) this.seg(pts[k], pts[k + 1], main); }
  addTo(parent: THREE.Object3D, clip: THREE.Plane[]) {
    for (const [pts, color, layer] of [[this.main, 0xdc2626, "ACIERS"], [this.rep, 0x2563eb, "REPARTITION"]] as const) {
      if (!pts.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      const seg = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, clippingPlanes: clip }));
      seg.userData.layer = layer;
      parent.add(seg);
    }
  }
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildScene(study: Study, o: Scene3DOptions, gov: Governing | null) {
  const inp = study.input;
  const model = study.analysis.model;
  const B = model.xRight - model.xLeft;
  const H = inp.er + inp.hInt + inp.es;
  const L = inp.L;
  const t = inp.tetes;
  const c = inp.cover;
  const a = (t.angle * Math.PI) / 180;
  const tanA = t.murs ? Math.tan(a) : 0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeef2f7);
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(B * 2, H * 6, L * 1.5);
  scene.add(sun);

  const clip = o.cut ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), L / 2)] : [];
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xb8c0cc, roughness: 0.85, side: THREE.DoubleSide, clippingPlanes: clip,
    transparent: o.concrete !== "opaque", opacity: o.concrete === "transparent" ? 0.28 : 1, depthWrite: o.concrete === "opaque",
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x475569, clippingPlanes: clip });
  const addConcrete = (geo: THREE.BufferGeometry, pos?: THREE.Vector3, layer = "CORPS", parent: THREE.Object3D = scene) => {
    if (o.concrete === "masque") return;
    const mesh = new THREE.Mesh(geo, concreteMat);
    mesh.userData.layer = layer;
    if (pos) mesh.position.copy(pos);
    parent.add(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat);
    edges.position.copy(mesh.position);
    parent.add(edges);
  };
  const bars = new Bars();

  // ── Corps : section extrudée sur la longueur ──
  const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(B, 0), new THREE.Vector2(B, H), new THREE.Vector2(0, H)]);
  let x = inp.eExt;
  inp.openings.forEach((op, k) => {
    const g = Math.min(inp.gousset, op / 4, inp.hInt / 4);
    const yb = inp.er, yt = inp.er + inp.hInt, x0 = x, x1 = x + op;
    const pts = g > 0
      ? [[x0 + g, yb], [x1 - g, yb], [x1, yb + g], [x1, yt - g], [x1 - g, yt], [x0 + g, yt], [x0, yt - g], [x0, yb + g]]
      : [[x0, yb], [x1, yb], [x1, yt], [x0, yt]];
    shape.holes.push(new THREE.Path(pts.map(([u, v]) => new THREE.Vector2(u, v))));
    x = x1 + (k < inp.openings.length - 1 ? inp.eInt : 0);
  });
  addConcrete(new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false }));

  // ── Murs de tête, radiers de tête, bêches ──
  const hw = study.heads.headWall;
  const hHead = hw.H;
  const ends = [{ z0: 0, s: -1 }, { z0: L, s: 1 }] as const;
  for (const { z0, s } of ends) {
    if (hHead > 0) addConcrete(new THREE.BoxGeometry(B, hHead, t.murTeteEp), V(B / 2, H + hHead / 2, z0 + s * t.murTeteEp / 2), "MUR_TETE");
    if (t.radierLong > 0) {
      const w = B + 2 * t.radierLong * tanA;
      // Radier de tête trapézoïdal (s'évase entre les murs en aile).
      const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(B, 0), new THREE.Vector2(B + t.radierLong * tanA, t.radierLong), new THREE.Vector2(-t.radierLong * tanA, t.radierLong)]);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: inp.er, bevelEnabled: false });
      geo.rotateX(Math.PI / 2);
      geo.translate(0, inp.er, 0);
      if (s < 0) geo.scale(1, 1, -1);
      geo.translate(0, 0, z0);
      addConcrete(geo, undefined, "RADIER_TETE");
      if (t.becheProf > 0) addConcrete(new THREE.BoxGeometry(w, t.becheProf, t.becheEp), V(B / 2, -t.becheProf / 2, z0 + s * (t.radierLong - t.becheEp / 2)), "BECHES");
    }
  }

  // ── Murs en aile (voile + semelle), dans le repère local de chaque aile ──
  const wing = study.heads.wing;
  const wingGroups: { grp: THREE.Group }[] = [];
  if (wing && t.murs) {
    const hRoot = Math.min(wing.Htot, H + hHead);
    const ws = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(t.long, 0), new THREE.Vector2(t.long, wing.Hend), new THREE.Vector2(0, hRoot)]);
    const geo = new THREE.ExtrudeGeometry(ws, { depth: t.ep, bevelEnabled: false });
    for (const [sx, xr] of [[-1, 0], [1, B]] as const) for (const [sz, zr] of [[-1, 0], [1, L]] as const) {
      const dx = sx * Math.sin(a), dz = sz * Math.cos(a);
      const grp = new THREE.Group();
      grp.position.set(xr, 0, zr);
      grp.rotation.y = Math.atan2(-dz, dx);
      scene.add(grp);
      wingGroups.push({ grp });
      addConcrete(geo, undefined, "MURS_AILE", grp);
      const zf = t.ep / 2 - t.semelle / 2;
      addConcrete(new THREE.BoxGeometry(t.long, t.semEp, t.semelle), V(t.long / 2, -t.semEp / 2, zf + t.semelle / 2), "SEMELLES", grp);
    }
  }

  // ── Garde-corps ──
  if (t.gardeCorps) {
    const G = GARDE_CORPS;
    for (const z of [G.post / 2, L - G.post / 2]) {
      for (const px of gardeCorpsPosts(B)) addConcrete(new THREE.BoxGeometry(G.post, G.h - G.lisseH, G.post), V(px, H + (G.h - G.lisseH) / 2, z), "GARDE_CORPS");
      addConcrete(new THREE.BoxGeometry(B, G.lisseH, G.lisseW), V(B / 2, H + G.h - G.lisseH / 2, z), "GARDE_CORPS");
    }
  }

  // ── Remblai, chaussée, terrain ──
  const top = H + inp.hr + inp.ech;
  if (o.fill) {
    const fillMat = new THREE.MeshStandardMaterial({ color: 0xc8a165, transparent: true, opacity: 0.18, depthWrite: false, clippingPlanes: clip });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(B + 6, top, L), fillMat);
    fill.position.set(B / 2, top / 2, L / 2);
    scene.add(fill);
  }
  const roadW = inp.Lr;
  const ext = Math.max(t.radierLong, wing && t.murs ? t.long : 0);
  if (o.fill || o.convoy) {
    // Chaussée : bande translucide sur la largeur de l'ouvrage, pour laisser voir le corps et le ferraillage.
    const road = new THREE.Mesh(new THREE.BoxGeometry(B + 2 * ext * tanA + 4, 0.03, roadW), new THREE.MeshStandardMaterial({ color: 0x1f2937, transparent: true, opacity: 0.35, depthWrite: false, clippingPlanes: clip }));
    road.position.set(B / 2, top + 0.02, L / 2);
    scene.add(road);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(B + 2 * ext + 30, L + 2 * ext + 30), new THREE.MeshStandardMaterial({ color: 0x8fb47a }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(B / 2, -0.01, L / 2);
  scene.add(ground);

  // ── Convoi à sa position défavorable : roues et volumes de diffusion ──
  if (gov) {
    const cfg = gov.t.def.configs[gov.pos.config];
    const toX = (px: number) => (gov.pos.reversed ? gov.pos.X - px : gov.pos.X + px) - model.xLeft;
    const z0 = L / 2 - roadW / 2 + 0.6;
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });
    const { footprint } = stripBlocks(cfg, study.analysis.D, transverseSpread(inp));
    const diffMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const yb = H - inp.es / 2;
    cfg.patches.forEach((p, i) => {
      const cx = toX(p.x), cz = z0 + p.y;
      const box = new THREE.Mesh(new THREE.BoxGeometry(p.ax, 0.25, p.ay), wheelMat);
      box.position.set(cx, top + 0.15, cz);
      box.userData.layer = "CONVOI";
      scene.add(box);
      const f = footprint[i];
      if (!f) return;
      // Tronc de pyramide : empreinte au contact (haut) → empreinte diffusée au feuillet moyen de la dalle.
      const v = [
        [cx - p.ax / 2, top, cz - p.ay / 2], [cx + p.ax / 2, top, cz - p.ay / 2], [cx + p.ax / 2, top, cz + p.ay / 2], [cx - p.ax / 2, top, cz + p.ay / 2],
        [cx - f.ax / 2, yb, cz - f.ay / 2], [cx + f.ax / 2, yb, cz - f.ay / 2], [cx + f.ax / 2, yb, cz + f.ay / 2], [cx - f.ax / 2, yb, cz + f.ay / 2],
      ];
      const quads = [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]];
      const pos: number[] = [];
      for (const [i0, i1, i2, i3] of quads) for (const k of [i0, i1, i2, i0, i2, i3]) pos.push(...v[k]);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.Mesh(g, diffMat);
      m.userData.layer = "DIFFUSION";
      scene.add(m);
    });
  }

  // ── Enveloppe des moments ELU tracée dans la bande de calcul (côté fibre tendue) ──
  if (o.efforts) {
    const an = study.analysis;
    const env = an.elu;
    let vmax = 1e-9;
    for (let k = 0; k < an.quantities.ns; k++) vmax = Math.max(vmax, Math.abs(env.max[k]), Math.abs(env.min[k]));
    const amp = (Math.min(B, H) * 0.3) / vmax;
    const zP = o.cut ? L / 2 + 0.02 : -0.06;
    const yOff = inp.er / 2;
    for (const [vals, color] of [[env.max, 0xdc2626], [env.min, 0x2563eb]] as const) {
      const tris: number[] = [], lines: number[] = [];
      for (const m of model.members) {
        const a0 = model.nodes[m.nodes[0]], a1 = model.nodes[m.nodes[m.nodes.length - 1]];
        const ux = (a1.x - a0.x) / m.length, uy = (a1.y - a0.y) / m.length;
        const nx = -uy, ny = ux;
        const pt = (k: number) => {
          const nd = model.nodes[m.nodes[k]];
          const v = -vals[m.station0 + k] * amp;
          return { ax: nd.x - model.xLeft, ay: nd.y + yOff, cx: nd.x - model.xLeft + nx * v, cy: nd.y + yOff + ny * v };
        };
        for (let k = 0; k < m.nodes.length - 1; k++) {
          const p0 = pt(k), p1 = pt(k + 1);
          tris.push(p0.ax, p0.ay, zP, p0.cx, p0.cy, zP, p1.cx, p1.cy, zP, p0.ax, p0.ay, zP, p1.cx, p1.cy, zP, p1.ax, p1.ay, zP);
          lines.push(p0.cx, p0.cy, zP, p1.cx, p1.cy, zP);
        }
      }
      const g1 = new THREE.BufferGeometry();
      g1.setAttribute("position", new THREE.Float32BufferAttribute(tris, 3));
      scene.add(new THREE.Mesh(g1, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })));
      const g2 = new THREE.BufferGeometry();
      g2.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
      const ls = new THREE.LineSegments(g2, new THREE.LineBasicMaterial({ color }));
      ls.userData.layer = color === 0xdc2626 ? "MOMENTS_MAX" : "MOMENTS_MIN";
      scene.add(ls);
    }
  }

  // ── Ferraillage barre par barre ──
  if (o.rebar) {
    const zEnd = o.cut ? L / 2 : L - c;
    // Corps
    for (const b of bodyBars(study)) {
      const g = study.design.groups.find((gg) => gg.id === b.group);
      if (!g) continue;
      for (let z = c; z <= L - c + 1e-9; z += g.bars.s) {
        if (o.cut && z > L / 2) break;
        bars.poly(b.pts.map(([px, py]) => V(px, py, z)));
      }
      for (let k = 0; k < b.pts.length - 1; k++) {
        const [x0, y0] = b.pts[k], [x1, y1] = b.pts[k + 1];
        const len = Math.hypot(x1 - x0, y1 - y0);
        for (let u = 0.05; u < len; u += g.rep.s) {
          const px = x0 + ((x1 - x0) * u) / len, py = y0 + ((y1 - y0) * u) / len;
          bars.seg(V(px, py, c), V(px, py, zEnd), false);
        }
      }
    }
    if (!o.cut) {
      for (const { z0, s } of ends) {
        // Mur de tête : barres verticales en attente dans la dalle, filants horizontaux.
        if (hHead > 0) {
          for (const zf of [c, t.murTeteEp - c]) {
            const z = z0 + s * zf;
            for (let px = c; px <= B - c + 1e-9; px += hw.bars.s) bars.seg(V(px, H - inp.es + c, z), V(px, H + hHead - c, z));
            for (let py = H + 0.05; py <= H + hHead - c + 1e-9; py += hw.rep.s) bars.seg(V(c, py, z), V(B - c, py, z), false);
          }
        }
        // Radier de tête : deux nappes de barres transversales, barres longitudinales.
        if (t.radierLong > 0) {
          for (let d = c; d <= t.radierLong - c + 1e-9; d += 0.2) {
            const z = z0 + s * d;
            for (const py of [c, inp.er - c]) bars.seg(V(-d * tanA + c, py, z), V(B + d * tanA - c, py, z));
          }
          const xa = -t.radierLong * tanA + c, xb = B + t.radierLong * tanA - c;
          for (let px = xa; px <= xb + 1e-9; px += 0.2) {
            const d0 = tanA > 0 ? Math.max(0, px < 0 ? -px / tanA : px > B ? (px - B) / tanA : 0) : 0;
            if (d0 >= t.radierLong - c) continue;
            for (const py of [c + 0.012, inp.er - c - 0.012]) bars.seg(V(px, py, z0 + s * Math.max(c, d0 + c)), V(px, py, z0 + s * (t.radierLong - c)), false);
          }
          // Bêche : cadres verticaux et filants.
          if (t.becheProf > 0) {
            const zb0 = z0 + s * (t.radierLong - t.becheEp + c), zb1 = z0 + s * (t.radierLong - c);
            const w = B + 2 * t.radierLong * tanA;
            for (let px = -t.radierLong * tanA + c; px <= -t.radierLong * tanA + w - c + 1e-9; px += 0.2) {
              bars.poly([V(px, inp.er - c, zb0), V(px, -t.becheProf + c, zb0), V(px, -t.becheProf + c, zb1), V(px, inp.er - c, zb1)]);
            }
            for (let py = -t.becheProf + c; py <= 0; py += 0.25) for (const zz of [zb0, zb1]) bars.seg(V(-t.radierLong * tanA + c, py, zz), V(-t.radierLong * tanA + w - c, py, zz), false);
          }
        }
      }
      // Murs en aile : barres verticales et horizontales sur les deux faces, cadres de semelle.
      if (wing && t.murs) {
        const hRoot = Math.min(wing.Htot, H + hHead);
        const topAt = (u: number) => hRoot + ((wing.Hend - hRoot) * u) / t.long;
        const zf = t.ep / 2 - t.semelle / 2;
        for (const { grp } of wingGroups) {
          const wb = new Bars();
          for (const zz of [c, t.ep - c]) {
            for (let u = c; u <= t.long - c + 1e-9; u += wing.bars.s) wb.seg(V(u, -t.semEp + c, zz), V(u, topAt(u) - c, zz));
            for (let v = c; v <= hRoot - c + 1e-9; v += wing.rep.s) {
              const uMax = v <= wing.Hend ? t.long - c : (t.long * (hRoot - v)) / (hRoot - wing.Hend) - c;
              if (uMax > c) wb.seg(V(c, v, zz), V(uMax, v, zz), false);
            }
          }
          for (let u = c; u <= t.long - c + 1e-9; u += wing.footBars.s) {
            wb.poly([V(u, -c, zf + c), V(u, -t.semEp + c, zf + c), V(u, -t.semEp + c, zf + t.semelle - c), V(u, -c, zf + t.semelle - c), V(u, -c, zf + c)]);
          }
          for (let w = zf + c; w <= zf + t.semelle - c + 1e-9; w += 0.2) for (const py of [-c, -t.semEp + c]) wb.seg(V(c, py, w), V(t.long - c, py, w), false);
          wb.addTo(grp, clip);
        }
      }
      // Garde-corps : 4 barres par poteau, 4 filants de lisse.
      if (t.gardeCorps) {
        const G = GARDE_CORPS;
        for (const zc of [G.post / 2, L - G.post / 2]) {
          for (const px of gardeCorpsPosts(B)) {
            for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
              const xx = px + dx * (G.post / 2 - c), zz = zc + dz * (G.post / 2 - c);
              bars.seg(V(xx, H - G.ancrage, zz), V(xx, H + G.h - c, zz));
            }
            for (let py = H + 0.05; py <= H + G.h - G.lisseH; py += 0.15) {
              const r = G.post / 2 - c;
              bars.poly([V(px - r, py, zc - r), V(px + r, py, zc - r), V(px + r, py, zc + r), V(px - r, py, zc + r), V(px - r, py, zc - r)], false);
            }
          }
          for (const py of [H + G.h - G.lisseH + c, H + G.h - c]) for (const dz of [-1, 1]) bars.seg(V(c, py, zc + dz * (G.lisseW / 2 - c)), V(B - c, py, zc + dz * (G.lisseW / 2 - c)));
        }
      }
    }
    bars.addTo(scene, clip);
  }

  const R = Math.max(B + 2 * ext * tanA, L + 2 * ext, H) * 1.25;
  return { scene, B, L, H, R, center: V(B / 2, H / 2, L / 2) };
}

/** Position de caméra pour une vue type. */
export function cameraFor(preset: CameraPreset, center: THREE.Vector3, R: number) {
  const c = center;
  switch (preset) {
    case "dessus": return V(c.x + 0.001, c.y + R * 1.6, c.z + 0.001);
    case "face": return V(c.x, c.y + R * 0.15, c.z - R * 1.5);
    case "cote": return V(c.x + R * 1.5, c.y + R * 0.15, c.z);
    default: return V(c.x + R * 0.9, c.y + R * 0.75, c.z + R * 0.9);
  }
}

/** Rendu hors écran d'une vue de la maquette (images de la note de calcul). */
export async function renderSceneImage(study: Study, o: Scene3DOptions, width: number, height: number, preset: CameraPreset = "iso") {
  const gov = o.convoy ? governing(study, o.convoy) : null;
  const { scene, R, center } = buildScene(study, o, gov);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.localClippingEnabled = true;
  renderer.setSize(width, height, false);
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 1000);
  camera.position.copy(cameraFor(preset, center, R));
  camera.lookAt(center);
  renderer.render(scene, camera);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
  renderer.dispose();
  scene.traverse((obj) => {
    const m = obj as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
  });
  if (!blob) return null;
  return { data: new Uint8Array(await blob.arrayBuffer()), width, height };
}
