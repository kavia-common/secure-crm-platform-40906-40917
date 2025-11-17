import { v4 as uuidv4 } from "uuid";

/**
 * Demo in-memory + localStorage store for Service Requests, Customers, and Complaints.
 * Each collection persists to localStorage and broadcasts change events via window CustomEvent.
 *
 * Collections:
 * - Service Requests (existing): DEMO_SR_KEY, DEMO_SR_EVENT
 * - Customers (new): DEMO_CUSTOMERS_KEY, DEMO_CUSTOMERS_EVENT
 * - Complaints (new): DEMO_COMPLAINTS_KEY, DEMO_COMPLAINTS_EVENT
 */

// Keys and Events
export const DEMO_SR_KEY = "demo_service_requests";
const DEMO_SR_EVENT = "demo_sr_updated";

export const DEMO_CUSTOMERS_KEY = "demo_customers";
const DEMO_CUSTOMERS_EVENT = "demo_customers_updated";

export const DEMO_COMPLAINTS_KEY = "demo_complaints";
const DEMO_COMPLAINTS_EVENT = "demo_complaints_updated";

// In-memory caches
let mem_sr = null;
let mem_customers = null;
let mem_complaints = null;

/* =========================
 * Utilities
 * ========================= */

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v;
  } catch {
    return fallback;
  }
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore quota/private mode errors
  }
}

function emit(evtName) {
  if (typeof window !== "undefined" && typeof window.CustomEvent === "function") {
    try {
      window.dispatchEvent(new CustomEvent(evtName));
    } catch {
      // ignore
    }
  }
}

/* =========================
 * Service Requests (existing)
 * ========================= */

// Deterministic seed dataset with stable UUIDs to ensure consistency across refreshes
const SR_SEED = (() => {
  const baseTs = Date.now();
  const mk = (over, idx) => {
    const created = new Date(baseTs - idx * 3600_000).toISOString(); // hourly back
    const updated = new Date(baseTs - idx * 1800_000).toISOString(); // 30m back
    return {
      id: over.id, // fixed UUID-based ID for stability
      title: over.title,
      customer_id: over.customer_id,
      customer: customerNameFromId(over.customer_id),
      priority: over.priority,
      status: over.status,
      description: over.description || "",
      due_date: over.sla_due_at || null,
      sla_due_at: over.sla_due_at || null,
      assignee: over.assignee || ["alex", "jamie", "taylor", "sam", "morgan"][idx % 5],
      created_at: created,
      updated_at: updated,
    };
  };
  // Hard-coded UUIDs for stability
  const rows = [
    { id: "0f1ef4e8-0f9b-4d1e-8b76-7e07a0b8a101", title: "Cannot login to portal", customer_id: "c1", status: "Open", priority: "High", sla_due_at: new Date(baseTs + 4 * 3600_000).toISOString() },
    { id: "1c2d3e4f-5a6b-7c8d-9e01-2f3a4b5c6d02", title: "Payment failure during checkout", customer_id: "c2", status: "In Progress", priority: "Urgent", sla_due_at: new Date(baseTs + 2 * 3600_000).toISOString() },
    { id: "2a3b4c5d-6e7f-8091-a2b3-c4d5e6f70813", title: "Mobile app crashes on launch", customer_id: "c3", status: "Open", priority: "High" },
    { id: "3b4c5d6e-7f80-91a2-b3c4-d5e6f7a8b914", title: "Invoice discrepancies for July", customer_id: "c4", status: "Resolved", priority: "Medium" },
    { id: "4c5d6e7f-8091-a2b3-c4d5-e6f7a8b9c015", title: "Feature request: dark mode", customer_id: "c5", status: "Closed", priority: "Low" },
    { id: "5d6e7f80-91a2-b3c4-d5e6-f7a8b9c0d116", title: "SLA breach warning: API latency", customer_id: "c6", status: "Overdue", priority: "Urgent" },
    { id: "6e7f8091-a2b3-c4d5-e6f7-a8b9c0d1e217", title: "Email notifications not received", customer_id: "c7", status: "In Progress", priority: "Medium" },
    { id: "7f8091a2-b3c4-d5e6-f7a8-b9c0d1e2f318", title: "Data export CSV malformed", customer_id: "c8", status: "Open", priority: "Low" },
    { id: "8091a2b3-c4d5-e6f7-a8b9-c0d1e2f30419", title: "SSO integration issues", customer_id: "c9", status: "In Progress", priority: "High" },
    { id: "91a2b3c4-d5e6-f7a8-b9c0-d1e2f3041520", title: "Account locked unexpectedly", customer_id: "c10", status: "Open", priority: "Medium" },
    { id: "a2b3c4d5-e6f7-a8b9-c0d1-e2f304152621", title: "Webhook retries failing", customer_id: "c11", status: "Resolved", priority: "Medium" },
    { id: "b3c4d5e6-f7a8-b9c0-d1e2-f30415263722", title: "Search results inconsistent", customer_id: "c12", status: "Open", priority: "Low" },
    { id: "c4d5e6f7-a8b9-c0d1-e2f3-041526374823", title: "Analytics dashboard not loading", customer_id: "c13", status: "Overdue", priority: "High" },
    { id: "d5e6f7a8-b9c0-d1e2-f304-152637482924", title: "Cannot reset password", customer_id: "c14", status: "Closed", priority: "Low" },
    { id: "e6f7a8b9-c0d1-e2f3-0415-263748293025", title: "Billing address update fails", customer_id: "c15", status: "In Progress", priority: "Medium" },
    { id: "f7a8b9c0-d1e2-f304-1526-374829302126", title: "Chat widget unresponsive", customer_id: "c16", status: "Open", priority: "Low" },
    { id: "08b9c0d1-e2f3-0415-2637-482930212627", title: "Compliance export request", customer_id: "c17", status: "Resolved", priority: "Medium" },
    { id: "19c0d1e2-f304-1526-3748-293021262728", title: "Sandbox environment down", customer_id: "c18", status: "Open", priority: "Urgent" },
    { id: "2ad1e2f3-0415-2637-4829-302126272829", title: "Attachment upload times out", customer_id: "c19", status: "In Progress", priority: "High" },
    { id: "3be2f304-1526-3748-2930-212627282930", title: "API key rotation assistance", customer_id: "c20", status: "Open", priority: "Low" },
  ];
  return rows.map((r, i) => mk(r, i));
})();

function ensureSRLoaded() {
  if (mem_sr !== null) return;
  const raw = safeGet(DEMO_SR_KEY);
  let arr = raw ? safeParse(raw, []) : [];
  if (!Array.isArray(arr) || arr.length === 0) {
    // Seed customers first for name lookup
    ensureCustomersLoaded();
    arr = SR_SEED;
    safeSet(DEMO_SR_KEY, arr);
  }
  mem_sr = arr;
}

function persistSR() {
  safeSet(DEMO_SR_KEY, mem_sr || []);
}

/**
 * PUBLIC_INTERFACE
 * Returns a list of demo service requests sorted by created_at desc.
 */
export function getDemoServiceRequests() {
  /** Returns a list of demo service requests sorted by created_at (desc). */
  ensureSRLoaded();
  const arr = Array.isArray(mem_sr) ? [...mem_sr] : [];
  arr.sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
  return arr;
}

/**
 * PUBLIC_INTERFACE
 * Adds a new service request to the demo store (with generated id and timestamps).
 */
export function addDemoServiceRequest(input) {
  /**
   * Adds a new service request to the demo store.
   * input: { title, customer_id, priority, description?, due_date? }
   * Returns created item (with id, status, created_at).
   */
  ensureSRLoaded();

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
    updated_at: now.toISOString(),
    assignee: input?.assignee || null,
    sla_due_at: input?.sla_due_at || null,
  };

  mem_sr.push(item);
  persistSR();
  emit(DEMO_SR_EVENT);
  return item;
}

/**
 * PUBLIC_INTERFACE
 * Updates an existing service request by id with fields from patch.
 */
export function updateDemoServiceRequest(id, patch) {
  /** Updates an existing request by id with fields from patch. */
  ensureSRLoaded();
  const idx = mem_sr.findIndex((x) => x.id === id);
  if (idx >= 0) {
    mem_sr[idx] = { ...mem_sr[idx], ...patch, updated_at: new Date().toISOString() };
    persistSR();
    emit(DEMO_SR_EVENT);
    return mem_sr[idx];
  }
  return null;
}

/**
 * PUBLIC_INTERFACE
 * Append additional mock service requests for pagination/testing.
 */
export function seedMoreServiceRequests(count = 10) {
  /** Append N generated service requests to the demo dataset and persist. */
  ensureSRLoaded();
  ensureCustomersLoaded();
  const statuses = ["Open", "In Progress", "Resolved", "Closed", "Overdue"];
  const priorities = ["Low", "Medium", "High", "Urgent"];
  const assignees = ["alex", "jamie", "taylor", "sam", "morgan"];
  const now = Date.now();

  const items = Array.from({ length: Math.max(0, Number(count) || 0) }, (_, i) => {
    const created = new Date(now - (i + 1) * 7200_000); // every 2h back
    const id = uuidv4();
    const customerIdx = (mem_customers?.length || 20) > 0 ? (i % mem_customers.length) : i % 20;
    const customer_id = (mem_customers?.[customerIdx]?.id) || `c${(customerIdx % 20) + 1}`;
    return {
      id,
      title: `Generated SR #${mem_sr.length + i + 1}`,
      customer_id,
      customer: customerNameFromId(customer_id),
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      description: "",
      created_at: created.toISOString(),
      updated_at: created.toISOString(),
      assignee: assignees[i % assignees.length],
      sla_due_at: new Date(created.getTime() + 24 * 3600_000).toISOString(),
      due_date: new Date(created.getTime() + 24 * 3600_000).toISOString(),
    };
  });

  mem_sr.push(...items);
  persistSR();
  emit(DEMO_SR_EVENT);
  return items.length;
}

/**
 * PUBLIC_INTERFACE
 * Subscribes to service requests change events; returns an unsubscribe function.
 */
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

/* =========================
 * Aliases for generalized API names (for components expecting generic store)
 * ========================= */

// PUBLIC_INTERFACE
export function addServiceRequest(input) {
  /**
   * Alias for addDemoServiceRequest, providing a generic API to add
   * a service request in demo/fallback mode while ensuring stable ID semantics.
   */
  return addDemoServiceRequest(input);
}

// PUBLIC_INTERFACE
export function subscribeServiceRequests(callback) {
  /**
   * Alias for subscribeDemoServiceRequests, allowing generic components
   * to listen to updates without importing demo-specific names.
   */
  return subscribeDemoServiceRequests(callback);
}

// PUBLIC_INTERFACE
export function getServiceRequests() {
  /**
   * Alias for getDemoServiceRequests, returning all demo SRs
   * sorted by created_at desc for immediate list rendering.
   */
  return getDemoServiceRequests();
}

/* =========================
 * Customers (new)
 * ========================= */

function ensureCustomersLoaded() {
  if (mem_customers !== null) return;
  const raw = safeGet(DEMO_CUSTOMERS_KEY);
  let arr = raw ? safeParse(raw, []) : [];
  if (!Array.isArray(arr) || arr.length === 0) {
    arr = seedCustomers();
    safeSet(DEMO_CUSTOMERS_KEY, arr);
  }
  mem_customers = arr;
}

function persistCustomers() {
  safeSet(DEMO_CUSTOMERS_KEY, mem_customers || []);
}

/**
 * PUBLIC_INTERFACE
 * Get all demo customers, sorted by created_at desc.
 */
export function getDemoCustomers() {
  /** Returns demo customers sorted by created_at desc. */
  ensureCustomersLoaded();
  const arr = Array.isArray(mem_customers) ? [...mem_customers] : [];
  arr.sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
  return arr;
}

/**
 * PUBLIC_INTERFACE
 * Adds a new demo customer to the store (demo only).
 */
export function addDemoCustomer(input) {
  /** Adds a new customer to the demo store. */
  ensureCustomersLoaded();
  const now = new Date();
  const id = `c${(mem_customers.length || 0) + 1}`;
  const item = {
    id,
    name: String(input?.name || "New Customer"),
    email: String(input?.email || "unknown@example.com"),
    phone: String(input?.phone || ""),
    tags: Array.isArray(input?.tags) ? input.tags : [],
    owner_id: String(input?.owner_id || "u1"),
    created_at: now.toISOString(),
  };
  mem_customers.push(item);
  persistCustomers();
  emit(DEMO_CUSTOMERS_EVENT);
  return item;
}

/**
 * PUBLIC_INTERFACE
 * Updates an existing customer by id with fields from patch.
 */
export function updateDemoCustomer(id, patch) {
  /** Update customer by id. */
  ensureCustomersLoaded();
  const idx = mem_customers.findIndex((x) => x.id === id);
  if (idx >= 0) {
    mem_customers[idx] = { ...mem_customers[idx], ...patch };
    persistCustomers();
    emit(DEMO_CUSTOMERS_EVENT);
    return mem_customers[idx];
  }
  return null;
}

/**
 * PUBLIC_INTERFACE
 * Subscribe to customers collection updates; returns unsubscribe fn.
 */
export function subscribeDemoCustomers(callback) {
  /** Subscribe to customers change events. */
  const handler = () => {
    try {
      callback();
    } catch {
      // ignore
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener(DEMO_CUSTOMERS_EVENT, handler);
    return () => window.removeEventListener(DEMO_CUSTOMERS_EVENT, handler);
  }
  return () => {};
}

/* =========================
 * Complaints (new)
 * ========================= */

function ensureComplaintsLoaded() {
  if (mem_complaints !== null) return;
  const raw = safeGet(DEMO_COMPLAINTS_KEY);
  let arr = raw ? safeParse(raw, []) : [];
  if (!Array.isArray(arr) || arr.length === 0) {
    // Seed using current customers so customer mapping exists
    ensureCustomersLoaded();
    arr = seedComplaints(mem_customers);
    safeSet(DEMO_COMPLAINTS_KEY, arr);
  }
  mem_complaints = arr;
}

function persistComplaints() {
  safeSet(DEMO_COMPLAINTS_KEY, mem_complaints || []);
}

/**
 * PUBLIC_INTERFACE
 * Get all demo complaints, sorted by created_at desc.
 */
export function getDemoComplaints() {
  /** Returns demo complaints sorted by created_at desc. */
  ensureComplaintsLoaded();
  const arr = Array.isArray(mem_complaints) ? [...mem_complaints] : [];
  arr.sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
  return arr;
}

/**
 * PUBLIC_INTERFACE
 * Adds a new complaint (demo).
 */
export function addDemoComplaint(input) {
  /** Adds a new complaint to the demo store. */
  ensureComplaintsLoaded();
  const now = new Date();
  const idx = (mem_complaints?.length || 0) + 1;
  const id = String(input?.id || `cmp-${idx}`);
  const customer_id = String(input?.customer_id || "c1");
  const item = {
    id,
    title: String(input?.title || `Complaint #${idx}`),
    customer_id,
    customer: customerNameFromId(customer_id),
    status: String(input?.status || "Open"),
    escalation: String(input?.escalation || "L1"),
    priority: String(input?.priority || "Medium"),
    created_at: now.toISOString(),
  };
  mem_complaints.push(item);
  persistComplaints();
  emit(DEMO_COMPLAINTS_EVENT);
  return item;
}

/**
 * PUBLIC_INTERFACE
 * Updates a complaint by id with fields from patch.
 */
export function updateDemoComplaint(id, patch) {
  /** Update complaint by id. */
  ensureComplaintsLoaded();
  const idx = mem_complaints.findIndex((x) => x.id === id);
  if (idx >= 0) {
    mem_complaints[idx] = { ...mem_complaints[idx], ...patch };
    persistComplaints();
    emit(DEMO_COMPLAINTS_EVENT);
    return mem_complaints[idx];
  }
  return null;
}

/**
 * PUBLIC_INTERFACE
 * Subscribe to complaints changes; returns unsubscribe fn.
 */
export function subscribeDemoComplaints(callback) {
  /** Subscribe to complaints change events. */
  const handler = () => {
    try {
      callback();
    } catch {
      // ignore
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener(DEMO_COMPLAINTS_EVENT, handler);
    return () => window.removeEventListener(DEMO_COMPLAINTS_EVENT, handler);
  }
  return () => {};
}

// PUBLIC_INTERFACE
export function addComplaint(input) {
  /** Generic alias for adding a complaint in demo/fallback mode. */
  return addDemoComplaint(input);
}

// PUBLIC_INTERFACE
export function getComplaints() {
  /** Generic alias for reading all complaints in demo/fallback mode. */
  return getDemoComplaints();
}

// PUBLIC_INTERFACE
export function subscribeComplaints(cb) {
  /** Generic alias for subscribing to complaints changes. */
  return subscribeDemoComplaints(cb);
}

/* =========================
 * Helpers / Seeds
 * ========================= */

function customerNameFromId(id) {
  const map = {
    c1: "Acme Corp 1",
    c2: "Globex 2",
    c3: "Initech 3",
    c4: "Umbrella 4",
    c5: "Soylent 5",
  };
  return map[id] || id || "Unknown";
}

function seedCustomers() {
  // Deterministic dataset based on base companies, expanded to 50 records
  const base = [
    { name: "Acme Corp", email: "ops@acme.example", phone: "+1-555-1001", tags: ["Enterprise", "VIP"] },
    { name: "Globex", email: "support@globex.example", phone: "+1-555-1002", tags: ["Enterprise"] },
    { name: "Initech", email: "help@initech.example", phone: "+1-555-1003", tags: ["SMB"] },
    { name: "Umbrella", email: "care@umbrella.example", phone: "+1-555-1004", tags: ["Enterprise", "Regulated"] },
    { name: "Soylent", email: "hello@soylent.example", phone: "+1-555-1005", tags: ["SMB", "Prospect"] },
    { name: "Stark Industries", email: "service@stark.example", phone: "+1-555-1006", tags: ["Enterprise", "Partner"] },
    { name: "Wayne Enterprises", email: "contact@wayne.example", phone: "+1-555-1007", tags: ["Enterprise"] },
    { name: "Hooli", email: "it@hooli.example", phone: "+1-555-1008", tags: ["Mid-Market"] },
    { name: "Massive Dynamic", email: "ops@md.example", phone: "+1-555-1009", tags: ["Enterprise"] },
    { name: "Cyberdyne", email: "noreply@cyberdyne.example", phone: "+1-555-1010", tags: ["SMB"] },
  ];

  const owners = ["u1", "u2", "u3"];
  const arr = Array.from({ length: 50 }, (_, i) => {
    const b = base[i % base.length];
    const id = `c${i + 1}`;
    const created = new Date(Date.now() - i * 86400000).toISOString();
    return {
      id,
      name: `${b.name} ${i + 1}`,
      email: b.email.replace("@", `.${i + 1}@`),
      phone: b.phone,
      tags: b.tags,
      owner_id: owners[i % owners.length],
      created_at: created,
    };
  });
  return arr;
}

function seedComplaints(customers) {
  const statuses = ["Open", "In Progress", "Overdue", "Closed"];
  const priorities = ["Low", "Medium", "High"];
  const levels = ["L0", "L1", "L2", "L3"];

  const arr = Array.from({ length: 42 }, (_, i) => {
    const id = `cmp-${i + 1}`;
    const cust = customers?.[i % (customers?.length || 1)];
    const customer_id = cust?.id || `c${(i % 10) + 1}`;
    const customer = cust?.name || customerNameFromId(customer_id);
    const created = new Date(Date.now() - i * 43200000).toISOString(); // every 12h back
    return {
      id,
      title: `Complaint #${i + 1}`,
      customer_id,
      customer,
      status: statuses[i % statuses.length],
      escalation: levels[i % levels.length],
      priority: priorities[i % priorities.length],
      created_at: created,
    };
  });
  return arr;
}
