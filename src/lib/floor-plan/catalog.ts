import type { RoomType } from "./types";

/** Poids relatif de surface (avant normalisation) et libellé affiché pour chaque type de pièce. */
export const ROOM_CATALOG: Record<RoomType, { label: string; areaWeight: number }> = {
  salon: { label: "Salon", areaWeight: 1.4 },
  cuisine: { label: "Cuisine", areaWeight: 0.7 },
  salle_a_manger: { label: "Salle à manger", areaWeight: 0.6 },
  chambre: { label: "Chambre", areaWeight: 1.0 },
  sdb: { label: "Salle de bain", areaWeight: 0.35 },
  wc: { label: "WC", areaWeight: 0.18 },
  garage: { label: "Garage", areaWeight: 1.2 },
  terrasse: { label: "Terrasse", areaWeight: 0.8 },
  bureau: { label: "Bureau", areaWeight: 0.7 },
  circulation: { label: "Circulation", areaWeight: 0.5 },
};

export function roomLabel(type: RoomType, index: number, total: number): string {
  const base = ROOM_CATALOG[type].label;
  return total > 1 ? `${base} ${index + 1}` : base;
}
