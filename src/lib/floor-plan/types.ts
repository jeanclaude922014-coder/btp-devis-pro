export type RoomType =
  | "salon"
  | "cuisine"
  | "salle_a_manger"
  | "chambre"
  | "sdb"
  | "wc"
  | "garage"
  | "terrasse"
  | "bureau"
  | "circulation";

export interface RoomInstance {
  id: string;
  type: RoomType;
  label: string;
  areaM2: number;
  /** Coordonnées en mètres, origine en haut à gauche de l'étage. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Bord du rectangle sur lequel dessiner la porte : "top" | "right" | "bottom" | "left". */
  doorEdge: "top" | "right" | "bottom" | "left";
}

export interface FloorSpec {
  level: number; // 0 = RDC, 1 = étage 1, ...
  label: string;
  widthM: number;
  depthM: number;
  rooms: RoomInstance[];
}

export interface FloorPlanRequest {
  floorsCount: number;
  surfacePerFloorM2: number;
  chambres: number;
  sallesDeBain: number;
  garage: boolean;
  terrasse: boolean;
  bureau: boolean;
}

export type ConversationStep =
  | "floors"
  | "surface"
  | "chambres"
  | "sdb"
  | "garage"
  | "terrasse"
  | "bureau"
  | "review"
  | "done";

export interface FloorPlanSpec {
  version: 1;
  step: ConversationStep;
  request: Partial<FloorPlanRequest>;
  floors: FloorSpec[];
  layoutSeed: number;
}

export interface QuickReply {
  label: string;
  value: string;
}

export interface ChatTurnResult {
  spec: FloorPlanSpec;
  assistantMessage: string;
  quickReplies?: QuickReply[];
}

export function emptyFloorPlanSpec(): FloorPlanSpec {
  return {
    version: 1,
    step: "floors",
    request: {},
    floors: [],
    layoutSeed: 1,
  };
}
