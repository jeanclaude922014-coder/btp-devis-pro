/**
 * Conservation des études dans la page hébergée : espace privé du compte (capacité `db`,
 * sous data/users/<id>/), sinon stockage du navigateur.
 */

import { normalizeSpec, type DalotSpec } from "@/lib/dalot/fields";

export type StudyItem = {
  id: string;
  name: string;
  seriesName: string | null;
  status: string;
  spec: DalotSpec;
  updatedAt: number;
};

export type Store = {
  kind: "compte" | "navigateur";
  list(): Promise<StudyItem[]>;
  save(item: StudyItem): Promise<void>;
  remove(id: string): Promise<void>;
};

type DbDoc = { id: string; exists: boolean; data(): Record<string, unknown> | undefined };
type DbRef = { get(): Promise<DbDoc>; set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> };
type DbColl = { doc(id: string): DbRef; get(): Promise<{ docs: DbDoc[] }> };
type Db = { collection(path: string): DbColl };
type ClaudeRuntime = { use(name: string): Promise<unknown> };

const LS_KEY = "dalotpro.etudes.v1";

function fromRecord(id: string, d: Record<string, unknown>): StudyItem | null {
  try {
    return {
      id,
      name: String(d.name ?? "Dalot"),
      seriesName: d.seriesName ? String(d.seriesName) : null,
      status: String(d.status ?? "non_verifie"),
      spec: normalizeSpec(JSON.parse(String(d.specJson))),
      updatedAt: Number(d.updatedAt ?? 0),
    };
  } catch {
    return null;
  }
}

function toRecord(item: StudyItem) {
  return {
    name: item.name, seriesName: item.seriesName, status: item.status,
    specJson: JSON.stringify(item.spec), updatedAt: item.updatedAt,
  };
}

function browserStore(): Store {
  const read = (): Record<string, Record<string, unknown>> => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}"); } catch { return {}; }
  };
  const write = (all: Record<string, Record<string, unknown>>) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(all)); } catch { /* stockage indisponible */ }
  };
  return {
    kind: "navigateur",
    async list() {
      return Object.entries(read()).map(([id, d]) => fromRecord(id, d)).filter((x): x is StudyItem => !!x);
    },
    async save(item) { const all = read(); all[item.id] = toRecord(item); write(all); },
    async remove(id) { const all = read(); delete all[id]; write(all); },
  };
}

export async function openStore(): Promise<Store> {
  const runtime = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!runtime?.use) return browserStore();
  try {
    const [db, user] = (await Promise.all([runtime.use("db"), runtime.use("user")])) as [Db | null, { id(): Promise<string | null> } | null];
    const uid = user ? await user.id() : null;
    if (!db || !uid) return browserStore();
    const coll = db.collection(`data/users/${uid}/etudes`);
    return {
      kind: "compte",
      async list() {
        const snap = await coll.get();
        return snap.docs.map((d) => (d.exists ? fromRecord(d.id, d.data() ?? {}) : null)).filter((x): x is StudyItem => !!x);
      },
      async save(item) { await coll.doc(item.id).set(toRecord(item)); },
      async remove(id) { await coll.doc(id).delete(); },
    };
  } catch {
    return browserStore();
  }
}

export function newId() {
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
