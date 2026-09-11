"use client";

import { useState } from "react";
import type { FloorSpec } from "@/lib/floor-plan/types";
import { PlanViewer2D } from "./plan-viewer-2d";
import { PlanViewer3D } from "./plan-viewer-3d";

export function PlanWorkspace({ floors, scale }: { floors: FloorSpec[]; scale: string }) {
  const [tab, setTab] = useState<"2d" | "3d">("2d");

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-slate-200 p-2">
        <button
          type="button"
          onClick={() => setTab("2d")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "2d" ? "bg-blue-800 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Plan 2D
        </button>
        <button
          type="button"
          onClick={() => setTab("3d")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "3d" ? "bg-blue-800 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Vue 3D
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "2d" ? <PlanViewer2D floors={floors} scale={scale} /> : <PlanViewer3D floors={floors} />}
      </div>
    </div>
  );
}
