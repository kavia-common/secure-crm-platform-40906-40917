import React from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

/**
 * PUBLIC_INTERFACE
 * LineChartCard: simple responsive line chart card.
 */
export function LineChartCard({ title, data = [], xKey = "name", yKey = "value" }) {
  return (
    <section style={{ background: "var(--color-surface)", borderRadius: 12, padding: 12, boxShadow: "var(--shadow-sm)" }} aria-label={title}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>{title}</h3>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(17,24,39,.08)" vertical={false} />
            <XAxis dataKey={xKey} stroke="rgba(17,24,39,.6)" />
            <YAxis stroke="rgba(17,24,39,.6)" />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke="var(--color-primary)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/**
 * PUBLIC_INTERFACE
 * BarChartCard: simple responsive bar chart card.
 */
export function BarChartCard({ title, data = [], xKey = "name", yKey = "value" }) {
  return (
    <section style={{ background: "var(--color-surface)", borderRadius: 12, padding: 12, boxShadow: "var(--shadow-sm)" }} aria-label={title}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>{title}</h3>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(17,24,39,.08)" vertical={false} />
            <XAxis dataKey={xKey} stroke="rgba(17,24,39,.6)" />
            <YAxis stroke="rgba(17,24,39,.6)" />
            <Tooltip />
            <Bar dataKey={yKey} fill="var(--color-primary)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
