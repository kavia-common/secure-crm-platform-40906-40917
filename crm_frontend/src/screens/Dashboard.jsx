import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LineChartCard, BarChartCard } from "../components/charts/Charts";
import { useWebSocket, eventBus } from "../services/ws";
import { useAuth } from "../auth/AuthContext";
import {
  getDemoServiceRequests,
  getComplaints as demoGetComplaints,
  subscribeComplaints as demoSubscribeComplaints,
} from "../services/demoStore";
import { getApiClient } from "../services/apiClient";

/**
 * PUBLIC_INTERFACE
 * Dashboard screen: KPIs and charts, live updates via websocket placeholder.
 * - Complaint KPIs are sourced from API when enabled, else from demoStore single source of truth.
 */
export default function Dashboard() {
  const { dummyAuth } = useAuth();

  // Charts
  const [series, setSeries] = useState([
    { name: "Mon", value: 12 },
    { name: "Tue", value: 18 },
    { name: "Wed", value: 9 },
    { name: "Thu", value: 21 },
    { name: "Fri", value: 16 },
  ]);
  const [bar, setBar] = useState([
    { name: "Open", value: 32 },
    { name: "In Progress", value: 21 },
    { name: "Closed", value: 44 },
  ]);

  // Complaint KPIs
  const [openComplaints, setOpenComplaints] = useState(0);
  const [createdToday, setCreatedToday] = useState(0);
  const [closedToday, setClosedToday] = useState(0);

  // Debounce helpers
  const debounceRef = useRef(null);
  const pendingKPIRef = useRef({ open: 0, created: 0, closed: 0 });

  function toUTCDateOnly(d) {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  }
  function isUTCDateToday(d) {
    const s = toUTCDateOnly(d);
    if (!s) return false;
    const now = new Date();
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    return s === today;
  }

  // Decide whether API is enabled
  const apiEnabled = String(process.env.REACT_APP_FEATURE_ENABLE_API || "true") === "true";

  const recomputeComplaintKPIs = useCallback((allComplaints) => {
    const items = Array.isArray(allComplaints) ? allComplaints : [];
    const open = items.filter((c) => {
      const s = String(c.status || "").toLowerCase();
      return s !== "closed" && s !== "resolved";
    }).length;
    const created = items.filter((c) => isUTCDateToday(c.created_at)).length;
    const closed = items.filter((c) => isUTCDateToday(c.closed_at)).length;

    // Guard against negatives and NaN
    const safe = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

    pendingKPIRef.current = { open: safe(open), created: safe(created), closed: safe(closed) };
    // Debounce UI update to avoid flicker on bursts
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOpenComplaints(pendingKPIRef.current.open);
      setCreatedToday(pendingKPIRef.current.created);
      setClosedToday(pendingKPIRef.current.closed);

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.info("[Dashboard] Complaint KPIs:", {
          open: pendingKPIRef.current.open,
          createdToday: pendingKPIRef.current.created,
          closedToday: pendingKPIRef.current.closed,
          source: apiEnabled ? "api" : "demo",
        });
      }
    }, 150);
  }, [apiEnabled]);

  // Initialize SR status chart in demo (fallback)
  useEffect(() => {
    // Always set SR bars from demo in this build; API SR aggregation is out of scope here.
    const all = getDemoServiceRequests();
    const norm = (s) => String(s || "").toLowerCase();
    const open = all.filter((r) => norm(r.status) === "open").length;
    const inProg = all.filter((r) => norm(r.status) === "in progress").length;
    const closed = all.filter((r) => norm(r.status) === "closed").length;
    setBar([
      { name: "Open", value: open },
      { name: "In Progress", value: inProg },
      { name: "Closed", value: closed },
    ]);
  }, []);

  // Fetch complaints from API or demoStore
  const loadComplaints = useCallback(async () => {
    try {
      if (apiEnabled) {
        const api = getApiClient();
        // Pull first few pages until threshold or break; for KPI counts we can just get one page with high page_size if supported
        const { data } = await api.get("/complaints", { params: { page: 1, page_size: 200 } });
        const items = Array.isArray(data?.items) ? data.items : [];
        recomputeComplaintKPIs(items);
        return;
      }
    } catch {
      // Fallback to demo on API error
    }
    // Demo fallback single source of truth
    const items = demoGetComplaints();
    recomputeComplaintKPIs(items);
  }, [apiEnabled, recomputeComplaintKPIs]);

  // Init on mount
  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // Subscribe to in-app demo store changes for complaints (when in demo/fallback)
  useEffect(() => {
    if (!apiEnabled) {
      const unsub = demoSubscribeComplaints(() => {
        const items = demoGetComplaints();
        recomputeComplaintKPIs(items);
      });
      return () => unsub?.();
    }
    return () => {};
  }, [apiEnabled, recomputeComplaintKPIs]);

  // Websocket placeholder path; backend to implement in future
  const { lastMessage } = useWebSocket("/ws/metrics", async () => null);

  useEffect(() => {
    if (lastMessage?.type === "kpi_update" && Array.isArray(lastMessage.payload)) {
      setSeries(lastMessage.payload);
    }
    if (lastMessage?.type === "status_counts" && Array.isArray(lastMessage.payload)) {
      setBar(lastMessage.payload);
    }
  }, [lastMessage]);

  // Event bus listeners for immediate UI updates
  useEffect(() => {
    const unsubResolved = eventBus.on("sr:resolved", () => {
      setBar((cur) => {
        const next = cur.map((b) => ({ ...b }));
        const idxClosed = next.findIndex((b) => b.name === "Closed");
        if (idxClosed >= 0) next[idxClosed].value = Math.max(0, (next[idxClosed].value || 0) + 1);
        const idxOpen = next.findIndex((b) => b.name === "Open");
        if (idxOpen >= 0 && (next[idxOpen].value || 0) > 0) next[idxOpen].value -= 1;
        else {
          const idxProg = next.findIndex((b) => b.name === "In Progress");
          if (idxProg >= 0 && (next[idxProg].value || 0) > 0) next[idxProg].value -= 1;
        }
        return next;
      });
      // SR closed does not affect complaint KPIs
    });
    const unsubSrCreated = eventBus.on("sr:created", () => {
      setBar((cur) => {
        const next = cur.map((b) => ({ ...b }));
        const idxOpen = next.findIndex((b) => b.name === "Open");
        if (idxOpen >= 0) next[idxOpen].value = Math.max(0, (next[idxOpen].value || 0) + 1);
        else next.push({ name: "Open", value: 1 });
        return next;
      });
    });

    // Complaint-specific events update KPIs immediately then re-validate via loadComplaints (debounced)
    const unsubCmpCreated = eventBus.on("complaint:created", () => {
      // optimistic
      setOpenComplaints((n) => Math.max(0, (n || 0) + 1));
      setCreatedToday((n) => Math.max(0, (n || 0) + 1));
      // reconcile from source
      loadComplaints();
    });
    const unsubCmpClosed = eventBus.on("complaint:closed", () => {
      setOpenComplaints((n) => Math.max(0, (n || 0) - 1));
      setClosedToday((n) => Math.max(0, (n || 0) + 1));
      loadComplaints();
    });

    return () => {
      unsubResolved?.();
      unsubSrCreated?.();
      unsubCmpCreated?.();
      unsubCmpClosed?.();
    };
  }, [loadComplaints]);

  const kpis = useMemo(
    () => [
      { label: "Open SRs", value: bar.find((b) => b.name === "Open")?.value ?? 0 },
      { label: "Open Complaints", value: Math.max(0, openComplaints || 0) },
      { label: "Created Today", value: Math.max(0, createdToday || 0) },
      { label: "Closed Today", value: Math.max(0, closedToday || 0) },
    ],
    [bar, openComplaints, createdToday, closedToday]
  );

  return (
    <section aria-labelledby="dash-title">
      <h1 id="dash-title">Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginTop: 12 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: "var(--color-surface)", padding: 12, borderRadius: 12, boxShadow: "var(--shadow-sm)" }} aria-label={k.label}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <LineChartCard title="Requests per Day" data={series} />
        <BarChartCard title="Status Distribution" data={bar} />
      </div>
    </section>
  );
}
