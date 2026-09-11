import type { RoomInstance } from "./types";

export const OUTER_WALL_THICKNESS_M = 0.2;
export const INNER_WALL_THICKNESS_M = 0.1;
const DOOR_WIDTH_M = 0.9;

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DoorMark {
  gap: Segment;
  leaf: Segment;
}

/** Ouverture de porte (segment à effacer dans le mur + trait du vantail) sur le bord assigné à la pièce. */
export function doorMarkForRoom(room: RoomInstance): DoorMark {
  const span = room.doorEdge === "top" || room.doorEdge === "bottom" ? room.width : room.height;
  const doorWidth = Math.min(DOOR_WIDTH_M, Math.max(span - 0.4, 0.6));

  switch (room.doorEdge) {
    case "bottom": {
      const cx = room.x + room.width / 2;
      const y = room.y + room.height;
      const x1 = cx - doorWidth / 2;
      const x2 = cx + doorWidth / 2;
      return { gap: { x1, y1: y, x2, y2: y }, leaf: { x1, y1: y, x2: x1, y2: y - doorWidth } };
    }
    case "top": {
      const cx = room.x + room.width / 2;
      const y = room.y;
      const x1 = cx - doorWidth / 2;
      const x2 = cx + doorWidth / 2;
      return { gap: { x1, y1: y, x2, y2: y }, leaf: { x1, y1: y, x2: x1, y2: y + doorWidth } };
    }
    case "right": {
      const cy = room.y + room.height / 2;
      const x = room.x + room.width;
      const y1 = cy - doorWidth / 2;
      const y2 = cy + doorWidth / 2;
      return { gap: { x1: x, y1, x2: x, y2 }, leaf: { x1: x, y1, x2: x - doorWidth, y2: y1 } };
    }
    case "left":
    default: {
      const cy = room.y + room.height / 2;
      const x = room.x;
      const y1 = cy - doorWidth / 2;
      const y2 = cy + doorWidth / 2;
      return { gap: { x1: x, y1, x2: x, y2 }, leaf: { x1: x, y1, x2: x + doorWidth, y2: y1 } };
    }
  }
}

/** Facteur mm-papier par mètre réel, pour une échelle "1/50" ou "1/100". */
export function scaleToMmPerMeter(scale: string): number {
  const denominator = Number(scale.split("/")[1]) || 100;
  return 1000 / denominator;
}
