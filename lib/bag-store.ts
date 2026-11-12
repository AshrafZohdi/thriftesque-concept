// The bag lives in this browser only (D-009): piece codes plus the order form. Read through useSyncExternalStore so the server
// render (empty bag) and the browser agree. Falls back to memory when storage is blocked (some private modes).
import type { OrderForm } from "./order";

export type BagData = { codes: string[]; form: OrderForm };

const KEY = "tq-bag-v1";
const MAX_PIECES = 30;
export const EMPTY_BAG: BagData = { codes: [], form: { name: "", mode: "delivery", area: "" } };

export function parseBag(raw: string): BagData {
  try {
    const d = JSON.parse(raw);
    const codes = Array.isArray(d?.codes) ? [...new Set(d.codes.filter((c: unknown): c is string => typeof c === "string" && /^TQ-\d{4,}$/.test(c)))] : [];
    const f = d?.form ?? {};
    return {
      codes: (codes as string[]).slice(0, MAX_PIECES),
      form: {
        name: typeof f.name === "string" ? f.name.slice(0, 60) : "",
        mode: f.mode === "pickup" ? "pickup" : "delivery",
        area: typeof f.area === "string" ? f.area.slice(0, 60) : "",
      },
    };
  } catch {
    return EMPTY_BAG;
  }
}

let memory: string | null = null;
const listeners = new Set<() => void>();

function read(): string {
  if (memory !== null) return memory;
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export const bagStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    const onStorage = (e: StorageEvent) => e.key === KEY && fn();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(fn);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: read,
  getServerSnapshot: () => "",
  write(data: BagData) {
    const raw = JSON.stringify(data);
    try {
      localStorage.setItem(KEY, raw);
      memory = null;
    } catch {
      memory = raw;
    }
    listeners.forEach((fn) => fn());
  },
};
