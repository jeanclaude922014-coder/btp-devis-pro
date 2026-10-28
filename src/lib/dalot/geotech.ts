/**
 * Vérifications géotechniques du corps : portance (Terzaghi / EC7 annexe D), contact du
 * radier, tassement élastique, flottaison et stabilité du remblai d'accès (Fellenius).
 */

import { GAMMA_W, type Analysis } from "./analysis";
import type { Check } from "./checks";
import type { DalotInput } from "./fields";

const rad = (d: number) => (d * Math.PI) / 180;

export function bearingFactors(phiDeg: number) {
  const t = Math.tan(rad(phiDeg));
  const Nq = phiDeg === 0 ? 1 : Math.exp(Math.PI * t) * Math.tan(rad(45 + phiDeg / 2)) ** 2;
  const Nc = phiDeg === 0 ? 5.14 : (Nq - 1) / t;
  const Ng = 2 * (Nq - 1) * t;
  return { Nq, Nc, Ng };
}

/** Portance limite d'une semelle rectangulaire B × L (kPa). */
export function qLimit(B: number, L: number, phi: number, c: number, gamma: number, Df: number, submerged: boolean) {
  const { Nq, Nc, Ng } = bearingFactors(phi);
  const r = Math.min(1, B / L);
  const sq = 1 + r * Math.sin(rad(phi));
  const sg = 1 - 0.3 * r;
  const sc = phi === 0 ? 1 + 0.2 * r : (sq * Nq - 1) / (Nq - 1);
  const g = submerged ? gamma - GAMMA_W : gamma;
  const q0 = gamma * Df;
  return { qu: c * Nc * sc + q0 * Nq * sq + 0.5 * g * B * Ng * sg, Nq, Nc, Ng, sq, sg, sc, q0 };
}

/** Coefficient d'influence pour une fondation rigide rectangulaire (Giroud). */
function influenceCf(LB: number) {
  const pts: [number, number][] = [[1, 0.82], [1.5, 0.98], [2, 1.12], [3, 1.33], [5, 1.6], [10, 2.0], [100, 3.0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, fa] = pts[i], [b, fb] = pts[i + 1];
    if (LB <= b) return fa + ((fb - fa) * (Math.log(LB) - Math.log(a))) / (Math.log(b) - Math.log(a));
  }
  return 3;
}

export type GeoResult = {
  B: number;
  qu: number;
  qrefELS: number;
  qrefELU: number;
  pMaxELS: number;
  pMinELS: number;
  pMaxELU: number;
  settlement: number; // cm
  flotation: number | null;
  slope: { FS: number; xc: number; yc: number; R: number; H: number; n: number } | null;
  factors: ReturnType<typeof qLimit>;
};

export function geotechChecks(inp: DalotInput, an: Analysis): { checks: Check[]; result: GeoResult } {
  const { model, els, elu, combos } = an;
  const ns = an.quantities.ns;
  const nR = an.quantities.nRaft;
  const B = model.xRight - model.xLeft;
  const Hext = inp.er + inp.hInt + inp.es;
  const pELSmax = Array.from(els.max.slice(3 * ns, 3 * ns + nR));
  const pELSmin = Array.from(els.min.slice(3 * ns, 3 * ns + nR));
  const pELUmax = Array.from(elu.max.slice(3 * ns, 3 * ns + nR));
  const iMax = pELSmax.indexOf(Math.max(...pELSmax));
  const iMin = pELSmin.indexOf(Math.min(...pELSmin));
  const iMaxU = pELUmax.indexOf(Math.max(...pELUmax));
  const pMaxELS = pELSmax[iMax], pMinELS = pELSmin[iMin], pMaxELU = pELUmax[iMaxU];
  // Contrainte de référence (3σmax + σmin)/4 sur l'enveloppe.
  const qrefELS = (3 * pMaxELS + Math.max(0, Math.min(...pELSmax))) / 4;
  const qrefELU = (3 * pMaxELU + Math.max(0, Math.min(...pELUmax))) / 4;
  const submerged = inp.nappe && inp.hw >= 0;
  const factors = qLimit(B, Math.max(B, inp.L), inp.phiSol, inp.cSol, inp.gammaSol, inp.Df, submerged);
  const qu = factors.qu;
  const checks: Check[] = [];
  const dom = "Géotechnique et stabilité";
  const cname = (ci: number) => combos[ci]?.id;

  checks.push({
    id: "G-PORT-ELS", domain: dom, element: "Sol sous radier",
    label: "Portance ELS : qref = (3σmax + σmin)/4 ≤ q0 + (qu − q0)/3", value: qrefELS, limit: factors.q0 + (qu - factors.q0) / 3, unit: "kPa",
    status: qrefELS <= factors.q0 + (qu - factors.q0) / 3 ? "conforme" : "non_conforme", combo: cname(els.cMax[3 * ns + iMax]),
    ref: "Fascicule 62 titre V / EC7 annexe D (Terzaghi)",
  });
  checks.push({
    id: "G-PORT-ELU", domain: dom, element: "Sol sous radier",
    label: "Portance ELU : qref ≤ q0 + (qu − q0)/2", value: qrefELU, limit: factors.q0 + (qu - factors.q0) / 2, unit: "kPa",
    status: qrefELU <= factors.q0 + (qu - factors.q0) / 2 ? "conforme" : "non_conforme", combo: cname(elu.cMax[3 * ns + iMaxU]),
    ref: "Fascicule 62 titre V / EC7 annexe D (Terzaghi)",
  });
  if (inp.qadm !== null) {
    checks.push({
      id: "G-QADM", domain: dom, element: "Sol sous radier",
      label: "Contrainte de référence ELS ≤ contrainte admissible de l'étude géotechnique", value: qrefELS, limit: inp.qadm * 1000, unit: "kPa",
      status: qrefELS <= inp.qadm * 1000 ? "conforme" : "non_conforme", combo: cname(els.cMax[3 * ns + iMax]),
      ref: "Rapport géotechnique",
    });
  } else {
    checks.push({
      id: "G-QADM", domain: dom, element: "Sol sous radier", label: "Contrainte admissible de l'étude géotechnique",
      status: "non_verifie", ref: "Rapport géotechnique", detail: "Contrainte admissible non renseignée : seule la portance calculée est vérifiée.",
    });
  }
  // Contact radier/sol (Fascicule 62 titre V) : 100 % comprimé sous charges permanentes,
  // au moins 75 % sous combinaisons rares (enveloppe, donc sécuritaire).
  const perm = Array.from({ length: nR }, (_, k) =>
    Math.min(an.cases.G[3 * ns + k] + an.cases.Pmax[3 * ns + k], an.cases.G[3 * ns + k] + an.cases.Pmin[3 * ns + k]));
  const permMin = Math.min(...perm);
  checks.push({
    id: "G-CONTACT-QP", domain: dom, element: "Interface radier / sol",
    label: "Contact sous charges permanentes : radier entièrement comprimé (σmin ≥ 0)", value: permMin, limit: 0, unit: "kPa",
    status: permMin >= 0 ? "conforme" : "non_conforme", ref: "Fascicule 62 titre V, B.3.3 (surface comprimée 100 %)",
  });
  const compressed = pELSmin.reduce((acc, p, k) => acc + (p >= 0 ? model.raftTrib[k] : 0), 0) / B;
  checks.push({
    id: "G-CONTACT", domain: dom, element: "Interface radier / sol",
    label: "Contact sous combinaisons rares : surface comprimée ≥ 75 %", value: compressed * 100, limit: 75, unit: "%",
    status: compressed >= 0.75 ? "conforme" : "non_conforme", combo: cname(els.cMin[3 * ns + iMin]),
    ref: "Fascicule 62 titre V, B.3.3 (surface comprimée ≥ 75 %)",
    detail: pMinELS < 0 ? `Décollement local sous trafic (σmin = ${pMinELS.toFixed(1)} kPa, enveloppe), admis dans la limite de 25 % de la surface.` : undefined,
  });

  // Tassement élastique sous charges permanentes.
  const pG = Array.from(an.cases.G.slice(3 * ns, 3 * ns + nR)).map((v, k) => v + 0.5 * (an.cases.Pmax[3 * ns + k] + an.cases.Pmin[3 * ns + k]));
  const qMean = pG.reduce((s, v, k) => s + v * model.raftTrib[k], 0) / B;
  const qNet = Math.max(0, qMean - inp.gammaSol * inp.Df);
  const Cf = influenceCf(Math.max(1, inp.L / B));
  let settlement = ((qNet * B * (1 - inp.nuSol ** 2) * Cf) / (inp.EsSol * 1000)) * 100;
  let tassLabel = `Tassement élastique s = q·B·(1−ν²)·Cf/E (Cf = ${Cf.toFixed(2)})`;
  let tassRef = "Méthode élastique (Giroud), charges permanentes";
  if (inp.oedo.actif) {
    // Couche normalement consolidée, contrainte au milieu de la couche, diffusion 2/1.
    const z = inp.Df + inp.oedo.H / 2;
    const gEff = inp.nappe ? inp.gammaSol - GAMMA_W : inp.gammaSol;
    const s0 = Math.max(1, gEff * z);
    const ds = (qNet * B * inp.L) / ((B + inp.oedo.H / 2) * (inp.L + inp.oedo.H / 2));
    settlement = ((inp.oedo.H * inp.oedo.Cc) / (1 + inp.oedo.e0)) * Math.log10((s0 + ds) / s0) * 100;
    tassLabel = `Tassement œdométrique s = H·Cc/(1+e0)·log((σ'0+Δσ)/σ'0), σ'0 = ${s0.toFixed(0)} kPa, Δσ = ${ds.toFixed(0)} kPa`;
    tassRef = "Méthode œdométrique (couche compressible normalement consolidée)";
  }
  checks.push({
    id: "G-TASS", domain: dom, element: "Sol sous radier",
    label: tassLabel, value: settlement, limit: inp.tassementMax, unit: "cm",
    status: settlement <= inp.tassementMax ? "conforme" : "non_conforme", ref: tassRef,
  });

  // Flottaison (ouvrage vide, nappe haute).
  let flotation: number | null = null;
  if (inp.nappe) {
    // Sous-pression nette γw·min(hw, H)·B ; le remblai immergé au-dessus de la dalle est déjaugé.
    const U = GAMMA_W * Math.min(inp.hw, Hext) * B;
    const concrete = (B * Hext - inp.openings.reduce((acc, o) => acc + o * inp.hInt, 0)) * inp.gammaBA;
    const submergedCover = Math.min(Math.max(0, inp.hw - Hext), inp.hr + inp.ech);
    const W = concrete + an.caseLoads.gTop * B - GAMMA_W * submergedCover * B;
    flotation = W / U;
    checks.push({
      id: "G-FLOT", domain: dom, element: "Ouvrage complet (vide)",
      label: "Flottaison : FS = poids stabilisant / sous-pression ≥ 1,10", value: flotation, limit: 1.1,
      status: flotation >= 1.1 ? "conforme" : "non_conforme", ref: "EC7 §2.4.7.4 (UPL), ouvrage vide",
    });
  } else {
    checks.push({
      id: "G-FLOT", domain: dom, element: "Ouvrage complet", label: "Flottaison",
      status: "non_applicable", ref: "EC7 §2.4.7.4", detail: "Pas de nappe déclarée au-dessus du radier.",
    });
  }
  checks.push({
    id: "G-GLISS", domain: dom, element: "Corps du dalot", label: "Glissement et renversement d'ensemble du corps",
    status: "non_applicable", ref: "—", detail: "Ouvrage fermé soumis à des poussées symétriques : les efforts horizontaux s'équilibrent dans le cadre.",
  });

  // Talus du remblai d'accès.
  let slope: GeoResult["slope"] = null;
  if (inp.talus.actif) {
    const H = Hext + inp.hr + inp.ech - inp.Df;
    if (H < 1) {
      checks.push({
        id: "G-TALUS", domain: dom, element: "Talus du remblai", label: "Stabilité du talus (Fellenius)",
        status: "non_applicable", ref: "—", detail: "Remblai de hauteur inférieure à 1 m.",
      });
    } else {
      slope = fellenius(H, inp.talus.pente, inp.gammaR, inp.talus.phi, inp.talus.c, inp.phiSol, inp.cSol, inp.gammaSol, inp.Lr / 2 + 1, inp.qRemblai);
      checks.push({
        id: "G-TALUS", domain: dom, element: "Talus du remblai d'accès",
        label: `Stabilité générale (Fellenius, H = ${H.toFixed(2)} m, fruit ${inp.talus.pente}/1) : FS ≥ 1,5`, value: slope.FS, limit: 1.5,
        status: slope.FS >= 1.5 ? "conforme" : "non_conforme", ref: "Méthode des tranches de Fellenius, cercles de glissement",
      });
    }
  } else {
    checks.push({
      id: "G-TALUS", domain: dom, element: "Talus du remblai", label: "Stabilité du talus",
      status: "non_applicable", ref: "—", detail: "Vérification désactivée par l'utilisateur (talus justifié par ailleurs).",
    });
  }

  return {
    checks,
    result: { B, qu, qrefELS, qrefELU, pMaxELS, pMinELS, pMaxELU, settlement, flotation, slope, factors },
  };
}

/**
 * Recherche du cercle critique (Fellenius). Repère : crête à gauche (x ≤ 0, y = H), talus
 * descendant jusqu'au pied (x = n·H, y = 0), terrain naturel horizontal au-delà.
 */
export function fellenius(
  H: number, n: number, gR: number, phiR: number, cR: number, phiF: number, cF: number, gF: number,
  crestHalf: number, q: number
) {
  const ys = (x: number) => (x <= 0 ? H : x >= n * H ? 0 : H - x / n);
  let best = { FS: Infinity, xc: 0, yc: 0, R: 0, H, n };
  const tR = Math.tan(rad(phiR)), tF = Math.tan(rad(phiF));
  for (let i = 0; i <= 24; i++) {
    const xc = -0.5 * H + ((n * H + H) * i) / 24;
    for (let j = 0; j <= 16; j++) {
      const yc = H * (1 + (2.5 * j) / 16);
      for (const yt of [-0.6 * H, -0.4 * H, -0.2 * H, 0, 0.15 * H, 0.3 * H]) {
        const R = yc - yt;
        const x0 = xc - R, x1 = xc + R;
        if (x0 > n * H) continue;
        // Entrée du cercle sur la plateforme (au niveau de la crête), sans dépasser l'axe de la route.
        if (R > yc - H && xc - Math.sqrt(R * R - (yc - H) ** 2) < -crestHalf) continue;
        const nS = 50;
        let num = 0, den = 0, area = 0;
        for (let k = 0; k < nS; k++) {
          const xm = x0 + ((x1 - x0) * (k + 0.5)) / nS;
          const b = (x1 - x0) / nS;
          const dy = Math.sqrt(Math.max(0, R * R - (xm - xc) ** 2));
          const yb = yc - dy;
          const h = ys(xm) - yb;
          if (h <= 0) continue;
          let W = 0;
          // Partie remblai (y > 0) et partie sol de fondation (y < 0).
          const top = ys(xm);
          W += gR * Math.max(0, top - Math.max(yb, 0)) * b;
          W += gF * Math.max(0, Math.min(0, top) - yb) * b;
          if (xm <= 0 && xm >= -crestHalf) W += q * b;
          const sinA = (xc - xm) / R;
          const cosA = dy / R;
          const l = b / Math.max(cosA, 0.05);
          const inEmb = yb >= 0;
          num += (inEmb ? cR : cF) * l + W * cosA * (inEmb ? tR : tF);
          den += W * sinA;
          area += h * b;
        }
        if (den <= 0 || area < 0.05 * H * H) continue;
        const FS = num / den;
        if (FS < best.FS) best = { FS, xc, yc, R, H, n };
      }
    }
  }
  return best;
}
