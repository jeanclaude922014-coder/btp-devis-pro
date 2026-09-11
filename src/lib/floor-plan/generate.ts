import { ROOM_CATALOG, roomLabel } from "./catalog";
import { footprintForArea, tileRects } from "./layout";
import type { FloorPlanRequest, FloorSpec, RoomInstance, RoomType } from "./types";

const EPSILON = 0.05;

function distributeCount(total: number, buckets: number): number[] {
  const result = new Array(buckets).fill(0);
  for (let i = 0; i < total; i++) {
    result[i % buckets] += 1;
  }
  return result;
}

/** Types de pièce (avec répétitions) attribués à chaque étage, du RDC vers le dernier niveau. */
function buildFloorRoomTypes(request: Required<FloorPlanRequest>): RoomType[][] {
  const floors: RoomType[][] = Array.from({ length: request.floorsCount }, () => []);

  if (request.floorsCount === 1) {
    floors[0].push("salon", "cuisine", "salle_a_manger");
    for (let i = 0; i < request.chambres; i++) floors[0].push("chambre");
    for (let i = 0; i < request.sallesDeBain; i++) floors[0].push("sdb");
    floors[0].push("wc", "circulation");
    if (request.garage) floors[0].push("garage");
    if (request.terrasse) floors[0].push("terrasse");
    if (request.bureau) floors[0].push("bureau");
    return floors;
  }

  floors[0].push("salon", "cuisine", "salle_a_manger", "wc", "circulation");
  if (request.garage) floors[0].push("garage");
  if (request.terrasse) floors[0].push("terrasse");

  const upperFloorsCount = request.floorsCount - 1;
  const chambresPerFloor = distributeCount(request.chambres, upperFloorsCount);
  const sdbPerFloor = distributeCount(request.sallesDeBain, upperFloorsCount);

  for (let level = 1; level < request.floorsCount; level++) {
    const idx = level - 1;
    const floor = floors[level];
    for (let i = 0; i < chambresPerFloor[idx]; i++) floor.push("chambre");
    for (let i = 0; i < sdbPerFloor[idx]; i++) floor.push("sdb");
    floor.push("circulation");
  }

  if (request.bureau) {
    floors[request.floorsCount - 1].push("bureau");
  }

  return floors;
}

/** Bord du rectangle qui n'est pas sur le périmètre extérieur de l'étage (là où placer la porte). */
function pickDoorEdge(
  rect: { x: number; y: number; width: number; height: number },
  floorWidth: number,
  floorDepth: number
): RoomInstance["doorEdge"] {
  const onLeft = rect.x <= EPSILON;
  const onTop = rect.y <= EPSILON;
  const onRight = rect.x + rect.width >= floorWidth - EPSILON;
  const onBottom = rect.y + rect.height >= floorDepth - EPSILON;

  if (!onBottom) return "bottom";
  if (!onRight) return "right";
  if (!onTop) return "top";
  if (!onLeft) return "left";
  return "bottom";
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let state = seed || 1;
  const next = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateFloors(
  request: Required<FloorPlanRequest>,
  layoutSeed: number
): FloorSpec[] {
  const floorRoomTypes = buildFloorRoomTypes(request);
  const typeCounters: Partial<Record<RoomType, number>> = {};
  const floorLabels = ["Rez-de-chaussée", "Étage 1", "Étage 2", "Étage 3", "Étage 4"];

  return floorRoomTypes.map((types, level) => {
    const { widthM, depthM } = footprintForArea(request.surfacePerFloorM2);

    const weighted = types.map((type, i) => ({
      id: `${level}-${type}-${i}`,
      type,
      areaWeight: ROOM_CATALOG[type].areaWeight,
    }));
    const totalWeight = weighted.reduce((s, r) => s + r.areaWeight, 0);
    const items = weighted
      .map((r) => ({
        id: r.id,
        type: r.type,
        areaM2: (r.areaWeight / totalWeight) * request.surfacePerFloorM2,
      }))
      .sort((a, b) => b.areaM2 - a.areaM2);

    // Variation entre régénérations : on mélange légèrement l'ordre de pavage (même surfaces).
    const orderedForTiling = seededShuffle(items, layoutSeed + level);
    const placed = tileRects(orderedForTiling, 0, 0, widthM, depthM);
    const placedById = new Map(placed.map((p) => [p.id, p]));

    const rooms: RoomInstance[] = items.map((item) => {
      const rect = placedById.get(item.id)!;
      const countSoFar = typeCounters[item.type] ?? 0;
      typeCounters[item.type] = countSoFar + 1;
      return {
        id: item.id,
        type: item.type,
        label: roomLabel(item.type, countSoFar, countOfType(items, item.type)),
        areaM2: Math.round(item.areaM2 * 10) / 10,
        x: Math.round(rect.x * 100) / 100,
        y: Math.round(rect.y * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        doorEdge: pickDoorEdge(rect, widthM, depthM),
      };
    });

    return {
      level,
      label: floorLabels[level] ?? `Étage ${level}`,
      widthM: Math.round(widthM * 100) / 100,
      depthM: Math.round(depthM * 100) / 100,
      rooms,
    };
  });
}

function countOfType(items: { type: RoomType }[], type: RoomType): number {
  return items.filter((i) => i.type === type).length;
}
