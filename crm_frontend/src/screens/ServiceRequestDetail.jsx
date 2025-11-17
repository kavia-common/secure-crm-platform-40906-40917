import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs } from "../components/primitives/MetaPrimitives";
import { StatusPill } from "../components/primitives/MetaPrimitives";
import { DataTable } from "../components/data/Table";

/**
 * PUBLIC_INTERFACE
 * Service Request Detail with tabs and activity table example.
 */
export default function ServiceRequestDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState("summary");

  const columns = useMemo(
    () => [
      { key: "ts", header: "Time", sortable: true },
      { key: "actor", header: "Actor", sortable: true },
      { key: "action", header: "Action", sortable: true },
      { key: "notes", header: "Notes" },
    ],
    []
  );

  const rows = useMemo(
    () => [
      { id: 1, ts: new Date().toLocaleString(), actor: "Agent A", action: "Updated priority", notes: "Set to High" },
      { id: 2, ts: new Date().toLocaleString(), actor: "System", action: "Auto-assign", notes: "Assigned to Team 1" },
    ],
    []
  );

  const tabs = useMemo(
    () => [
      {
        label: "Summary",
        value: "summary",
        content: (
          <div style={{ display: "grid", gap: 8 }}>
            <div><strong>ID:</strong> {id}</div>
            <div><strong>Title:</strong> Sample SR</div>
            <div>
              <strong>Status:</strong> <StatusPill status="Open" />
            </div>
            <div><strong>Customer:</strong> Acme Corp</div>
          </div>
        ),
      },
      {
        label: "Activity",
        value: "activity",
        content: <DataTable columns={columns} rows={rows} />,
      },
      {
        label: "Attachments",
        value: "attachments",
        content: <p>Files list will appear here.</p>,
      },
    ],
    [id, columns, rows]
  );

  return (
    <section aria-labelledby="srd-title">
      <h1 id="srd-title">Service Request Detail</h1>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
    </section>
  );
}
