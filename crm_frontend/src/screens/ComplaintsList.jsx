import React, { useEffect, useMemo, useState } from "react";
import { DataTable, Pagination, useServerTable } from "../components/data/Table";
import { Input, Select } from "../components/forms/Controls";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/feedback/Toast";
import { StatusPill } from "../components/primitives/MetaPrimitives";
import { Modal } from "../components/overlays/Overlays";
import { eventBus } from "../services/ws";
import { getApiClient, transitionComplaint } from "../services/apiClient";
import { updateDemoComplaint } from "../services/demoStore";

/**
 * PUBLIC_INTERFACE
 * ComplaintsList: demo-mode complaints listing with search/status/priority filters and sorting.
 * Falls back to API GET /complaints when not in demo mode.
 * Row click shows a toast (detail route to be implemented).
 */
export default function ComplaintsList() {
  const { dummyAuth } = useAuth();
  const toast = useToast();

  // UI state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  // DEMO data wiring
  const [demoAll, setDemoAll] = useState([]);

  useEffect(() => {
    if (!dummyAuth) return;
    import("../services/demoStore")
      .then(({ getDemoComplaints, subscribeDemoComplaints }) => {
        setDemoAll(getDemoComplaints());
        const unsub = subscribeDemoComplaints(() => setDemoAll(getDemoComplaints()));
        return unsub;
      })
      .catch(() => {});
  }, [dummyAuth]);

  const demoFilteredSorted = useMemo(() => {
    if (!dummyAuth) return [];
    let rows = Array.isArray(demoAll) ? [...demoAll] : [];
    if (q) {
      const term = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.id || "").toLowerCase().includes(term) ||
          String(r.title || "").toLowerCase().includes(term) ||
          String(r.customer || "").toLowerCase().includes(term)
      );
    }
    if (status) {
      rows = rows.filter((r) => String(r.status || "") === String(status));
    }
    if (priority) {
      rows = rows.filter((r) => String(r.priority || "") === String(priority));
    }
    if (sort?.key) {
      const { key, dir } = sort;
      rows.sort((a, b) => {
        let av = a[key];
        let bv = b[key];
        if (key === "created_at") {
          av = new Date(av || 0).getTime();
          bv = new Date(bv || 0).getTime();
        } else {
          av = typeof av === "string" ? av.toLowerCase() : av;
          bv = typeof bv === "string" ? bv.toLowerCase() : bv;
        }
        if (av < bv) return dir === "asc" ? -1 : 1;
        if (av > bv) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [dummyAuth, demoAll, q, status, priority, sort]);

  const demoPageRows = useMemo(() => {
    if (!dummyAuth) return [];
    const start = (page - 1) * pageSize;
    return demoFilteredSorted.slice(start, start + pageSize);
  }, [dummyAuth, demoFilteredSorted, page, pageSize]);

  // API mode
  const { rows: apiRowsRaw, total: apiTotal, loading: apiLoading, error: apiError } = useServerTable({
    path: "/complaints",
    page,
    pageSize,
    sort,
    filter: { status: status || undefined, severity: priority || undefined },
  });

  useEffect(() => {
    if (!dummyAuth && apiError) {
      const base = process.env.REACT_APP_API_BASE || "/api/v1";
      toast.push(`Failed to load complaints from ${base}/complaints: ${apiError}`, "error");
    }
  }, [dummyAuth, apiError, toast]);

  const apiRows = useMemo(() => {
    if (dummyAuth) return [];
    return (apiRowsRaw || []).map((r, i) => ({
      id: r.id || String(i + 1),
      title: r.title || r.category || `Complaint #${i + 1}`,
      customer: r.customer || r.customer_name || r.customer_id || "",
      status: r.status || "New",
      escalation: r.escalation || r.level || "-",
      priority: r.priority || r.severity || "",
      created_at: r.created_at || r.createdAt || "",
    }));
  }, [apiRowsRaw, dummyAuth]);

  // Local rows with optimistic updates in API mode
  const [localRows, setLocalRows] = useState([]);
  useEffect(() => {
    setLocalRows(dummyAuth ? demoPageRows : apiRows);
  }, [dummyAuth, demoPageRows, apiRows]);

  const [confirm, setConfirm] = useState({ open: false, id: null, title: "" });

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

  const handleRowClick = (row) => {
    const id = row?.id || "";
    toast.push(`Complaint detail (${id}) is not implemented yet.`, "info");
  };

  const rows = localRows;
  const total = dummyAuth ? demoFilteredSorted.length : apiTotal;
  const loading = dummyAuth ? false : apiLoading;

  const handleClose = async () => {
    const targetId = confirm.id;
    if (!targetId) return;
    setConfirm({ open: false, id: null, title: "" });

    const prev = [...localRows];

    try {
      if (dummyAuth) {
        const updated = updateDemoComplaint(targetId, {
          status: "Closed",
          closed_at: new Date().toISOString(),
        });
        setLocalRows((rs) => rs.map((r) => (r.id === targetId ? { ...r, ...updated } : r)));
        eventBus.emit("complaint:closed", updated || { id: targetId, status: "Closed" });
        // Optional toast feedback
        return;
      }

      const api = getApiClient(async () => null);
      // Optimistic update
      setLocalRows((rs) => rs.map((r) => (r.id === targetId ? { ...r, status: "Closed", closed_at: new Date().toISOString() } : r)));

      const data = await transitionComplaint(api, targetId);
      setLocalRows((rs) => rs.map((r) => (r.id === targetId ? { ...r, ...data } : r)));
      eventBus.emit("complaint:closed", data || { id: targetId, status: "Closed" });
    } catch (e) {
      setLocalRows(prev);
      const status = e?.response?.status;
      const msg = status ? `Server error (${status})` : (e?.message || "Network error");
      // keep toast minimal for complaints list
      try { const toast = (await import("../components/feedback/Toast")).useToast?.(); toast?.push?.(`Failed to close complaint ${targetId}: ${msg}`, "error"); } catch {}
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
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
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
