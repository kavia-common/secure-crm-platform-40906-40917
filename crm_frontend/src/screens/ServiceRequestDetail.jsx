import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs } from "../components/primitives/MetaPrimitives";
import { StatusPill } from "../components/primitives/MetaPrimitives";
import { DataTable } from "../components/data/Table";
import { Modal } from "../components/overlays/Overlays";
import { Button } from "../components/primitives/Button";
import { getApiClient, transitionServiceRequest } from "../services/apiClient";
import { eventBus } from "../services/ws";

/**
 * PUBLIC_INTERFACE
 * Service Request Detail with tabs and activity table example.
 */
export default function ServiceRequestDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState("summary");
  const [status, setStatus] = useState("Open");
  const [confirmOpen, setConfirmOpen] = useState(false);

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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong>ID:</strong> <span>{id}</span>
              <div style={{ marginLeft: "auto" }}>
                {["resolved", "closed"].includes(String(status).toLowerCase()) ? null : (
                  <Button
                    aria-label="Mark Service Request resolved"
                    onClick={() => setConfirmOpen(true)}
                    size="sm"
                    variant="secondary"
                  >
                    Mark Resolved
                  </Button>
                )}
              </div>
            </div>
            <div><strong>Title:</strong> Sample SR</div>
            <div>
              <strong>Status:</strong> <StatusPill status={status} />
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

  async function doResolve() {
    try {
      // Optimistic
      setStatus("Resolved");
      const api = getApiClient(async () => null);
      const data = await transitionServiceRequest(api, id, "resolved");
      if (data?.status) setStatus(data.status);
      eventBus.emit("sr:resolved", data || { id, status: "Resolved" });
    } catch {
      // Roll back to Open if API fails (minimal handling, real app would fetch)
      setStatus("Open");
    } finally {
      setConfirmOpen(false);
    }
  }

  return (
    <section aria-labelledby="srd-title">
      <h1 id="srd-title">Service Request Detail</h1>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Mark as Resolved?"
        footer={
          <>
            <button
              aria-label="Cancel"
              onClick={() => setConfirmOpen(false)}
              style={{ border: "1px solid rgba(17,24,39,.12)", padding: "6px 10px", borderRadius: 6, background: "var(--color-surface)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              aria-label="Confirm mark as resolved"
              onClick={doResolve}
              style={{ border: "none", padding: "8px 12px", borderRadius: 6, background: "var(--color-primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              Confirm
            </button>
          </>
        }
      >
        <p>Are you sure you want to mark this Service Request as Resolved?</p>
      </Modal>
    </section>
  );
}
