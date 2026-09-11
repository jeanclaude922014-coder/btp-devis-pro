"use client";

import { useState } from "react";
import type { FloorSpec, RoomInstance } from "@/lib/floor-plan/types";
import { doorMarkForRoom, INNER_WALL_THICKNESS_M, OUTER_WALL_THICKNESS_M } from "@/lib/floor-plan/drawing";

const PIXELS_PER_METER = 42;
const MARGIN_M = 1.3;

function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  vertical,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  vertical?: boolean;
}) {
  const tick = 0.08;
  return (
    <g stroke="#334155" strokeWidth={0.012} fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1 - tick} y1={y1 - tick} x2={x1 + tick} y2={y1 + tick} />
      <line x1={x2 - tick} y1={y2 - tick} x2={x2 + tick} y2={y2 + tick} />
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2}
        dy={vertical ? 0 : -0.08}
        dx={vertical ? -0.1 : 0}
        transform={vertical ? `rotate(-90 ${(x1 + x2) / 2} ${(y1 + y2) / 2})` : undefined}
        textAnchor="middle"
        fontSize={0.22}
        fill="#334155"
        stroke="none"
      >
        {label}
      </text>
    </g>
  );
}

function RoomShape({ room }: { room: RoomInstance }) {
  const door = doorMarkForRoom(room);
  const labelFontSize = Math.min(0.32, room.width / 5, room.height / 3);
  return (
    <g>
      <rect
        x={room.x}
        y={room.y}
        width={room.width}
        height={room.height}
        fill="#ffffff"
        stroke="#64748b"
        strokeWidth={INNER_WALL_THICKNESS_M}
      />
      <line
        x1={door.gap.x1}
        y1={door.gap.y1}
        x2={door.gap.x2}
        y2={door.gap.y2}
        stroke="#ffffff"
        strokeWidth={INNER_WALL_THICKNESS_M + 0.03}
      />
      <line x1={door.leaf.x1} y1={door.leaf.y1} x2={door.leaf.x2} y2={door.leaf.y2} stroke="#94a3b8" strokeWidth={0.025} />
      <text
        x={room.x + room.width / 2}
        y={room.y + room.height / 2 - 0.12}
        textAnchor="middle"
        fontSize={labelFontSize}
        fill="#1e293b"
      >
        {room.label}
      </text>
      <text
        x={room.x + room.width / 2}
        y={room.y + room.height / 2 + labelFontSize + 0.05}
        textAnchor="middle"
        fontSize={labelFontSize * 0.75}
        fill="#64748b"
      >
        {room.areaM2} m²
      </text>
    </g>
  );
}

export function PlanViewer2D({ floors, scale }: { floors: FloorSpec[]; scale: string }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  if (floors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-400">
        Le plan 2D apparaîtra ici une fois toutes les questions du chat répondues.
      </div>
    );
  }

  const floor = floors[Math.min(levelIndex, floors.length - 1)];
  const viewWidth = floor.widthM + MARGIN_M * 2;
  const viewHeight = floor.depthM + MARGIN_M * 2 + 0.6;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-3">
        <select
          value={levelIndex}
          onChange={(e) => setLevelIndex(Number(e.target.value))}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-600 focus:outline-none"
        >
          {floors.map((f, i) => (
            <option key={f.level} value={i}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.2) * 10) / 10))}
            className="h-7 w-7 rounded border border-slate-300 text-sm hover:bg-slate-50"
            aria-label="Zoom arrière"
          >
            −
          </button>
          <span className="w-10 text-center text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.2) * 10) / 10))}
            className="h-7 w-7 rounded border border-slate-300 text-sm hover:bg-slate-50"
            aria-label="Zoom avant"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-slate-50 p-4">
        <svg
          viewBox={`${-MARGIN_M} ${-MARGIN_M} ${viewWidth} ${viewHeight}`}
          width={floor.widthM * PIXELS_PER_METER * zoom}
          style={{ display: "block", margin: "0 auto", maxWidth: "none" }}
        >
          <rect
            x={0}
            y={0}
            width={floor.widthM}
            height={floor.depthM}
            fill="none"
            stroke="#1e293b"
            strokeWidth={OUTER_WALL_THICKNESS_M}
          />
          {floor.rooms.map((room) => (
            <RoomShape key={room.id} room={room} />
          ))}
          <DimensionLine x1={0} y1={-0.35} x2={floor.widthM} y2={-0.35} label={`${floor.widthM.toFixed(2)} m`} />
          <DimensionLine
            x1={-0.35}
            y1={0}
            x2={-0.35}
            y2={floor.depthM}
            label={`${floor.depthM.toFixed(2)} m`}
            vertical
          />
          <text
            x={floor.widthM / 2}
            y={floor.depthM + 0.55}
            textAnchor="middle"
            fontSize={0.26}
            fill="#334155"
          >
            {floor.label} — Échelle {scale}
          </text>
        </svg>
      </div>
    </div>
  );
}
