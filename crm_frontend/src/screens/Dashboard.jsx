import React, { useEffect, useMemo, useState } from "react";
import { LineChartCard, BarChartCard } from "../components/charts/Charts";
import { useWebSocket } from "../services/ws";
import { eventBus } from "../services/ws";
import { useAuth } from "../auth/AuthContext";
import { getDemoServiceRequests, getDemoComplaints } from "../services/demoStore";

/**
 * PUBLIC_INTERFACE
 * Dashboard screen: KPIs and charts, live updates via websocket placeholder.
 */
export default function Dashboard() {
  const { dummyAuth } = useAuth();
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
  const [closedToday, setClosedToday] = useState(8);
  const [openComplaints, setOpenComplaints] = useState(0);
  const [createdToday, setCreatedToday] = useState(0);

  // Initialize status counts from demo store in demo mode so KPIs reflect seeded data immediately
  useEffect(() => {
    if (!dummyAuth) return;
    const all = getDemoServiceRequests();
    const open = all.filter((r) => String(r.status).toLowerCase() === "open").length;
    const inProg = all.filter((r) => String(r.status).toLowerCase() === "in progress").length;
    const closed = all.filter((r) => String(r.status).toLowerCase() === "closed").length;
    setBar([
      { name: "Open", value: open },
      { name: "In Progress", value: inProg },
      { name: "Closed", value: closed },
    ]);

    const complaints = getDemoComplaints();
    const cmpOpen = complaints.filter((c) => String(c.status).toLowerCase() === "open").length;
    setOpenComplaints(cmpOpen);
  }, [dummyAuth]);

  // Websocket placeholder path; backend to implement in S3
  const { lastMessage } = useWebSocket("/ws/metrics", async () => null);

  useEffect(() => {
    if (lastMessage?.type === "kpi_update" && Array.isArray(lastMessage.payload)) {
      setSeries(lastMessage.payload);
    }
    if (lastMessage?.type === "status_counts" && Array.isArray(lastMessage.payload)) {
      setBar(lastMessage.payload);
    }
  }, [lastMessage]);

  useEffect(() => {
    const unsub1 = eventBus.on("sr:resolved", () => {
      // Increment Closed and decrement Open/Progress if available
      setBar((cur) => {
        const next = cur.map((b) => ({ ...b }));
        const idxClosed = next.findIndex((b) => b.name === "Closed");
        if (idxClosed >= 0) next[idxClosed].value += 1;
        const idxOpen = next.findIndex((b) => b.name === "Open");
        if (idxOpen >= 0 && next[idxOpen].value > 0) next[idxOpen].value -= 1;
        else {
          const idxProg = next.findIndex((b) => b.name === "In Progress");
          if (idxProg >= 0 && next[idxProg].value > 0) next[idxProg].value -= 1;
        }
        return next;
      });
      setClosedToday((n) => n + 1);
    });
    const unsub2 = eventBus.on("complaint:closed", () => {
      // Reflect in KPI: decrement open complaints, increment closed today
      setOpenComplaints((n) => (n > 0 ? n - 1 : 0));
      setClosedToday((n) => n + 1);
    });
    const unsub3 = eventBus.on("sr:created", () => {
      // New SR -> increment Open count in status distribution and created today
      setBar((cur) => {
        const next = cur.map((b) => ({ ...b }));
        const idxOpen = next.findIndex((b) => b.name === "Open");
        if (idxOpen >= 0) next[idxOpen].value += 1;
        else next.push({ name: "Open", value: 1 });
        return next;
      });
      setCreatedToday((n) => n + 1);
    });
    const unsub4 = eventBus.on("complaint:created", () => {
      setOpenComplaints((n) => n + 1);
      setCreatedToday((n) => n + 1);
    });
    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
      unsub4?.();
    };
  }, []);

  const kpis = useMemo(
    () => [
      { label: "Open SRs", value: bar.find((b) => b.name === "Open")?.value ?? 0 },
      { label: "Open Complaints", value: openComplaints },
      { label: "Created Today", value: createdToday },
      { label: "Closed Today", value: closedToday },
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
