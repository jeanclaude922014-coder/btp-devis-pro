"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/floor-plans";
import type { QuickReply } from "@/lib/floor-plan/types";

const initialState: FormState = { error: "" };

type Message = { id: string; role: string; content: string };

export function ChatPanel({
  action,
  messages,
  quickReplies,
  done,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  messages: Message[];
  quickReplies?: QuickReply[];
  done: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user"
                  ? "bg-blue-800 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {done && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border border-green-200 bg-green-50 px-3.5 py-2 text-sm text-green-800">
              Plan finalisé. Exportez-le en PDF ci-dessus, ou créez un nouveau plan depuis la liste.
            </div>
          </div>
        )}
      </div>

      {quickReplies && quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-200 p-3">
          {quickReplies.map((qr) => (
            <form key={qr.value} action={formAction}>
              <input type="hidden" name="kind" value="quick_reply" />
              <input type="hidden" name="value" value={qr.value} />
              <input type="hidden" name="label" value={qr.label} />
              <button
                type="submit"
                disabled={pending}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-60"
              >
                {qr.label}
              </button>
            </form>
          ))}
        </div>
      )}

      {!done && (
        <form action={formAction} className="flex gap-2 border-t border-slate-200 p-3">
          <input type="hidden" name="kind" value="text" />
          <input
            key={messages.length}
            name="value"
            required
            autoComplete="off"
            placeholder="Écrivez votre message..."
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
          >
            Envoyer
          </button>
        </form>
      )}
      {state.error && <p className="px-3 pb-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
