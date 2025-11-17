import React, { useEffect, useMemo, useState } from "react";
import { LineChartCard, BarChartCard } from "../components/charts/Charts";
import { useWebSocket } from "../services/ws";

/**
 * PUBLIC_INTERFACE
 * Dashboard screen: KPIs and charts, live updates via websocket placeholder.
 */
export default function Dashboard() {
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

  const kpis = useMemo(
    () => [
      { label: "Open SRs", value: bar.find((b) => b.name === "Open")?.value ?? 0 },
      { label: "Closed Today", value: 8 },
      { label: "Avg. SLA (hrs)", value: 5.4 },
      { label: "CSAT", value: "92%" },
    ],
    [bar]
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
