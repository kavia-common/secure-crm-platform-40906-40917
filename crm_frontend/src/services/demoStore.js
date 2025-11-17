import { v4 as uuidv4 } from "uuid";

/**
 * Demo in-memory + localStorage store for Service Requests.
 * Items are persisted under DEMO_SR_KEY and broadcast changes via a window event.
 */

export const DEMO_SR_KEY = "demo_service_requests";
const DEMO_SR_EVENT = "demo_sr_updated";

let mem = null;

// PUBLIC_INTERFACE
export function getDemoServiceRequests() {
  /** Returns a list of demo service requests sorted by created_at (desc). */
  ensureLoaded();
  const arr = Array.isArray(mem) ? [...mem] : [];
  arr.sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
  return arr;
}

// PUBLIC_INTERFACE
export function addDemoServiceRequest(input) {
  /**
   * Adds a new service request to the demo store.
   * input: { title, customer_id, priority, description?, due_date? }
   * Returns created item (with id, status, created_at).
   */
  ensureLoaded();

  const now = new Date();
  const id = `SR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}-${uuidv4().slice(0, 6).toUpperCase()}`;

  const item = {
    id,
    title: String(input?.title || "Untitled"),
    customer_id: String(input?.customer_id || ""),
    customer: customerNameFromId(String(input?.customer_id || "")),
    priority: String(input?.priority || "Medium"),
    status: "Open",
    description: input?.description || "",
    due_date: input?.due_date || null,
    created_at: now.toISOString(),
  };

  mem.push(item);
  persist();
  emitChange();
  return item;
}

// PUBLIC_INTERFACE
export function updateDemoServiceRequest(id, patch) {
  /** Updates an existing request by id with fields from patch. */
  ensureLoaded();
  const idx = mem.findIndex((x) => x.id === id);
  if (idx >= 0) {
    mem[idx] = { ...mem[idx], ...patch };
    persist();
    emitChange();
    return mem[idx];
  }
  return null;
}

// PUBLIC_INTERFACE
export function subscribeDemoServiceRequests(callback) {
  /** Subscribes to change events; returns an unsubscribe function. */
  const handler = () => {
    try {
      callback();
    } catch {
      // ignore subscriber errors
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener(DEMO_SR_EVENT, handler);
    return () => window.removeEventListener(DEMO_SR_EVENT, handler);
  }
  return () => {};
}

function emitChange() {
  if (typeof window !== "undefined" && typeof window.CustomEvent === "function") {
    try {
      window.dispatchEvent(new CustomEvent(DEMO_SR_EVENT));
    } catch {
      // ignore
    }
  }
}

function ensureLoaded() {
  if (mem !== null) return;
  // Try to load from localStorage first
  try {
    const raw = localStorage.getItem(DEMO_SR_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    mem = Array.isArray(arr) ? arr : [];
  } catch {
    mem = [];
  }
}

function persist() {
  try {
    localStorage.setItem(DEMO_SR_KEY, JSON.stringify(mem));
  } catch {
    // ignore persistence errors (privacy mode, etc.)
  }
}

function customerNameFromId(id) {
  const map = {
    c1: "Acme Corp",
    c2: "Globex",
    c3: "Initech",
    c4: "Umbrella",
    c5: "Soylent",
  };
  return map[id] || id || "Unknown";
}
