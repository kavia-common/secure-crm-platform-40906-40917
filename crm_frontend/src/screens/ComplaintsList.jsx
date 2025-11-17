import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, Pagination, useServerTable } from "../components/data/Table";
import { Input, Select } from "../components/forms/Controls";
import { StatusPill } from "../components/primitives/MetaPrimitives";
import { Modal } from "../components/overlays/Overlays";
import { eventBus } from "../services/ws";
import { getApiClient, transitionComplaint } from "../services/apiClient";
import { shouldUseFallback } from "../services/runtimeFlags";

/**
 * PUBLIC_INTERFACE
 * ComplaintsList: complaints listing with search/status/severity filters and sorting.
 * - Uses server API when available.
 * - Silently falls back to demo store when backend is unavailable or returns 404.
 * - Caches probe result so subsequent loads do not call the real endpoint again this session.
 * - No demo indicators shown in UI.
 */
export default function ComplaintsList() {
  const navigate = useNavigate();

  // UI state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [reloadTick, setReloadTick] = useState(0); // used to trigger refetch after actions

  // Server table with transparent fallback and probe caching
  const {
    rows: apiRowsRaw,
    total,
    loading,
  } = useServerTable({
    path: "/complaints",
    page,
    pageSize,
    sort,
    // severity maps to backend param, while priority is the UI term
    filter: { q: q || undefined, status: status || undefined, severity: priority || undefined, _t: reloadTick },
    fallbackKey: "complaints",
  });

  const rows = useMemo(() => {
    return (apiRowsRaw || []).map((r, i) => ({
      id: r.id || String(i + 1),
      title: r.title || r.category || `Complaint #${i + 1}`,
      customer: r.customer || r.customer_name || r.customer_id || "",
      status: r.status || "New",
      escalation: r.escalation || r.level || "-",
      priority: r.priority || r.severity || "",
      created_at: r.created_at || r.createdAt || "",
    }));
  }, [apiRowsRaw]);

  // Columns
  const columns = useMemo(
    () => [
      { key: "id", header: "ID", sortable: true },
      { key: "title", header: "Title", sortable: true },
      { key: "customer", header: "Customer", sortable: true },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (v) => <StatusPill status={v} />,
      },
      { key: "escalation", header: "Escalation", sortable: true },
      { key: "priority", header: "Priority", sortable: true },
      { key: "created_at", header: "Created At", sortable: true },
      {
        key: "actions",
        header: "Actions",
        render: (_v, row) => {
          const final = String(row.status || "").toLowerCase();
          const disabled = final === "closed";
          return (
            <button
              aria-label={`Mark complaint ${row.id} closed`}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) setConfirm({ open: true, id: row.id, title: row.title || row.id });
              }}
              style={{
                border: "1px solid rgba(17,24,39,.12)",
                background: "var(--color-surface)",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                fontWeight: 700,
              }}
              disabled={disabled}
            >
              Mark Closed
            </button>
          );
        },
      },
    ],
    []
  );

  const [confirm, setConfirm] = useState({ open: false, id: null, title: "" });

  const handleRowClick = (row) => {
    if (!row?.id) return;
    navigate(`/complaints/${encodeURIComponent(row.id)}`);
  };

  const handleClose = async () => {
    const targetId = confirm.id;
    if (!targetId) return;
    setConfirm({ open: false, id: null, title: "" });

    try {
      // If resource is unavailable this session, update demo store directly
      if (shouldUseFallback("complaints")) {
        const { updateDemoComplaint } = await import("../services/demoStore");
        const updated = updateDemoComplaint(String(targetId), {
          status: "Closed",
          closed_at: new Date().toISOString(),
        });
        eventBus.emit("complaint:closed", updated || { id: targetId, status: "Closed" });
        setReloadTick((x) => x + 1);
        return;
      }

      // Else call real API (with built-in mocks if API disabled)
      const api = getApiClient(async () => null);
      const data = await transitionComplaint(api, targetId);
      eventBus.emit("complaint:closed", data || { id: targetId, status: "Closed" });
      setReloadTick((x) => x + 1);
    } catch {
      // Suppress toasts per silent fallback requirement
    }
  };

  return (
    <section aria-labelledby="complaints-title">
      <h1 id="complaints-title">Complaints</h1>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          margin: "12px 0",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 240 }}>
          <Input
            label="Search"
            name="cmp_search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by ID, title or customer"
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select
            label="Status"
            name="cmp_status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={[
              { label: "All", value: "" },
              { label: "Open", value: "Open" },
              { label: "In Progress", value: "In Progress" },
              { label: "Overdue", value: "Overdue" },
              { label: "Closed", value: "Closed" },
            ]}
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select
            label="Priority"
            name="cmp_priority"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            options={[
              { label: "All", value: "" },
              { label: "Low", value: "Low" },
              { label: "Medium", value: "Medium" },
              { label: "High", value: "High" },
            ]}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        sort={sort}
        onSortChange={setSort}
        loading={loading}
        emptyText={loading ? "Loading…" : "No complaints"}
        onRowClick={handleRowClick}
    />

      <div style={{ marginTop: 8 }}>
        <Pagination page={page} pageSize={pageSize} total={total || 0} onPageChange={setPage} />
      </div>

      <Modal
        open={confirm.open}
        onClose={() => setConfirm({ open: false, id: null, title: "" })}
        title="Mark Complaint as Closed?"
        footer={
          <>
            <button
              aria-label="Cancel"
              onClick={() => setConfirm({ open: false, id: null, title: "" })}
              style={{ border: "1px solid rgba(17,24,39,.12)", padding: "6px 10px", borderRadius: 6, background: "var(--color-surface)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              aria-label="Confirm mark as closed"
              onClick={handleClose}
              style={{ border: "none", padding: "8px 12px", borderRadius: 6, background: "var(--color-primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              Confirm
            </button>
          </>
        }
      >
        <p>Are you sure you want to mark “{confirm.title}” as Closed?</p>
      </Modal>
    </section>
  );
}
