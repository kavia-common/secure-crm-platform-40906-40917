import axios from "axios";

/**
 * PUBLIC_INTERFACE
 * getApiClient returns a configured axios instance with auth headers and interceptors.
 * Includes optional mock layer guarded by REACT_APP_FEATURE_ENABLE_API and REACT_APP_FEATURE_ENABLE_WS.
 */
export function getApiClient(getToken) {
  const baseURL = process.env.REACT_APP_API_BASE || "/api";
  const enableApi = String(process.env.REACT_APP_FEATURE_ENABLE_API || "true") === "true";

  const instance = axios.create({
    baseURL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use(async (config) => {
    const token = typeof getToken === "function" ? await getToken() : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      // Optionally handle global 401/403 etc.
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
