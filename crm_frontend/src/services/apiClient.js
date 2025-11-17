import axios from "axios";

/**
 * Build a fallback absolute API base when REACT_APP_API_BASE is not provided:
 * - Uses current window origin but swaps port 3000 -> 3001
 * - Appends '/api/v1'
 */
function computeFallbackBaseUrl() {
  // If no window (SSR/CI), just return a safe default
  if (typeof window === "undefined") return "/api/v1";

  try {
    const { protocol, hostname } = window.location;
    let port = window.location.port;

    // Port normalization: default dev mapping 3000 -> 3001
    if (port === "3000") {
      port = "3001";
    }

    const origin = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
    return `${origin}/api/v1`;
  } catch {
    return "/api/v1";
  }
}

/**
 * Normalize base URL input:
 * - Preferred value: REACT_APP_API_BASE
 * - Fallback: window.origin with 3000 -> 3001 + '/api/v1'
 * - Ensures single leading slash for relative paths
 * - Trims any trailing slash
 * - Upgrades legacy "/api" to "/api/v1"
 */
function normalizeBaseUrl(input) {
  let val = (input && String(input).trim()) || "";

  if (!val) {
    val = computeFallbackBaseUrl();
  }

  // Remove trailing slash to avoid double-slashes when joining
  if (val.length > 1 && val.endsWith("/")) {
    val = val.slice(0, -1);
  }

  // If not absolute URL, ensure it starts with a single "/"
  const isAbsolute = /^https?:\/\//i.test(val);
  if (!isAbsolute && !val.startsWith("/")) {
    val = `/${val}`;
  }

  // Upgrade legacy default to versioned API
  if (val === "/api") {
    val = "/api/v1";
  }

  return val;
}

/**
 * PUBLIC_INTERFACE
 * getApiClient returns a configured axios instance with auth headers and interceptors.
 * - Respects REACT_APP_API_BASE (default: computed with port swap and '/api/v1')
 * - Adds timeout via REACT_APP_API_TIMEOUT_MS (default: 15000ms)
 * - Logs detailed error info for network vs HTTP errors
 * - Detects HTTPS/HTTP mixed-content risk and warns in console
 * - Includes optional mock layer guarded by REACT_APP_FEATURE_ENABLE_API
 */
export function getApiClient(getToken) {
  const baseURL = normalizeBaseUrl(process.env.REACT_APP_API_BASE);
  const enableApi = String(process.env.REACT_APP_FEATURE_ENABLE_API || "true") === "true";
  const timeout = Number.parseInt(process.env.REACT_APP_API_TIMEOUT_MS || "15000", 10);

  // Info log for quick diagnostics
  // eslint-disable-next-line no-console
  console.info("[API] Using baseURL:", baseURL);

  // Warn if front-end is HTTPS but API base is HTTP (mixed-content will be blocked by browsers)
  if (typeof window !== "undefined") {
    try {
      const isHttps = window.location?.protocol === "https:";
      const apiIsHttp = /^http:\/\//i.test(baseURL);
      if (isHttps && apiIsHttp) {
        // eslint-disable-next-line no-console
        console.warn(
          "[API] Mixed-content risk: UI is served over HTTPS but REACT_APP_API_BASE is HTTP. " +
            "Browsers will block requests. Use an HTTPS API URL, set up a dev proxy, or use a relative path (/api/v1).",
          { baseURL }
        );
      }
    } catch {
      // ignore env detection errors
    }
  }

  const instance = axios.create({
    baseURL,
    withCredentials: true,
    timeout,
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use(async (config) => {
    const token = typeof getToken === "function" ? await getToken() : null;
    if (token) {
      // Attach bearer token without logging it
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      // Robust logging for diagnostics without leaking sensitive data
      const info = {
        code: err?.code,
        message: err?.message,
        method: err?.config?.method,
        baseURL: err?.config?.baseURL,
        url: err?.config?.url,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        // Keep response data for debugging if backend returns structured error
        responseData: err?.response?.data,
      };

      // eslint-disable-next-line no-console
      if (info.code === "ERR_NETWORK" || !err?.response) {
        console.error("[API] Network error", info);
      } else {
        console.error("[API] HTTP error", info);
      }
      return Promise.reject(err);
    }
  );

  if (!enableApi) {
    // Lightweight mock shim for common endpoints so UI continues to function offline.
    instance.get = async (path, { params } = {}) => {
      if (path === "/customers") {
        const page = Number(params?.page || 1);
        const pageSize = Number(params?.page_size || 10);
        const q = (params?.q || "").toLowerCase();
        const all = mockCustomers();
        const filtered = q ? all.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) : all;
        const start = (page - 1) * pageSize;
        const items = filtered.slice(start, start + pageSize);
        return { data: { items, total: filtered.length } };
      }
      if (path === "/complaints") {
        const page = Number(params?.page || 1);
        const pageSize = Number(params?.page_size || 10);
        const all = mockComplaints();
        const start = (page - 1) * pageSize;
        const items = all.slice(start, start + pageSize);
        return { data: { items, total: all.length } };
      }
      if (path === "/auth/me") {
        return { data: { id: "u1", username: "demo", email: "demo@example.com", roles: ["user"] } };
      }
      // Fallback mock
      return { data: { items: [], total: 0 } };
    };
    instance.post = async (path, body) => {
      if (path === "/service-requests") {
        return { data: { id: String(Math.floor(Math.random() * 10000)), ...body, status: "Open" } };
      }
      if (path === "/auth/login") {
        return {
          data: {
            access_token: btoa(`mock.${Date.now()}`),
            refresh_token: btoa(`refresh.${Date.now()}`),
            token_type: "bearer",
          },
        };
      }
      if (path === "/auth/logout") {
        return { data: { ok: true } };
      }
      return { data: { ok: true } };
    };
  }

  return instance;
}

/**
 * PUBLIC_INTERFACE
 * Simple diagnostics: probe backend root health endpoints and log results.
 * Handles both absolute and relative API bases.
 */
export async function logConnectivityDiagnostics() {
  try {
    const base = normalizeBaseUrl(process.env.REACT_APP_API_BASE);
    let origin = "";

    if (/^https?:\/\//i.test(base)) {
      const u = new URL(base);
      origin = u.origin;
    } else {
      // Relative base -> use window origin
      if (typeof window !== "undefined") {
        const { protocol, hostname } = window.location;
        let port = window.location.port;
        if (port === "3000") port = "3001";
        origin = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
      } else {
        origin = "";
      }
    }

    const urls = [`${origin}/`, `${origin}/ready`];

    // eslint-disable-next-line no-console
    console.info("[API] Connectivity check against:", urls);

    for (const url of urls) {
      try {
        const res = await fetch(url, { credentials: "include" });
        const text = await res.text();
        // eslint-disable-next-line no-console
        console.info(`[API] Probe ${url} -> ${res.status}`, text);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[API] Probe failed: ${url}`, e?.message || e);
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[API] Connectivity diagnostics failed to run:", e?.message || e);
  }
}

// Simple mock datasets
function mockCustomers() {
  const base = [
    { id: "c1", name: "Acme Corp", email: "ops@acme.example", phone: "+1-555-1001", segment: "Enterprise" },
    { id: "c2", name: "Globex", email: "support@globex.example", phone: "+1-555-1002", segment: "Enterprise" },
    { id: "c3", name: "Initech", email: "help@initech.example", phone: "+1-555-1003", segment: "SMB" },
    { id: "c4", name: "Umbrella", email: "care@umbrella.example", phone: "+1-555-1004", segment: "Enterprise" },
    { id: "c5", name: "Soylent", email: "hello@soylent.example", phone: "+1-555-1005", segment: "SMB" },
    { id: "c6", name: "Stark Industries", email: "service@stark.example", phone: "+1-555-1006", segment: "Enterprise" },
    { id: "c7", name: "Wayne Enterprises", email: "contact@wayne.example", phone: "+1-555-1007", segment: "Enterprise" },
    { id: "c8", name: "Hooli", email: "it@hooli.example", phone: "+1-555-1008", segment: "Mid-Market" },
    { id: "c9", name: "Massive Dynamic", email: "ops@md.example", phone: "+1-555-1009", segment: "Enterprise" },
    { id: "c10", name: "Cyberdyne", email: "noreply@cyberdyne.example", phone: "+1-555-1010", segment: "SMB" },
  ];
  // Expand to 50 rows for pagination feel
  return Array.from({ length: 50 }, (_, i) => {
    const b = base[i % base.length];
    return { ...b, id: `c${i + 1}`, name: `${b.name} ${i + 1}` };
  });
}

function mockComplaints() {
  const statuses = ["Open", "Closed", "Overdue"];
  return Array.from({ length: 42 }, (_, i) => ({
    id: `cmp-${i + 1}`,
    title: `Complaint #${i + 1}`,
    status: statuses[i % statuses.length],
    created_at: new Date(Date.now() - i * 86400000).toISOString().slice(0, 19).replace("T", " "),
  }));
}
