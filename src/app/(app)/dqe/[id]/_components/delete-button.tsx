"use client";

import { useState } from "react";

export function DeleteDqeButton({ action, dqeId }: { action: (formData: FormData) => void; dqeId: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
          setTimeout(() => setArmed(false), 4000);
        }
      }}
    >
      <input type="hidden" name="dqeId" value={dqeId} />
      <button
        type="submit"
        className={`rounded-md border px-3 py-1.5 text-sm ${
          armed ? "border-red-600 bg-red-600 text-white" : "border-slate-300 text-slate-600 hover:border-red-300 hover:text-red-700"
        }`}
      >
        {armed ? "Confirmer la suppression définitive ?" : "Supprimer ce DQE"}
      </button>
    </form>
  );
}
