import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, Pagination, useServerTable } from "../components/data/Table";
import { Input, Select } from "../components/forms/Controls";
import { Button } from "../components/primitives/Button";
import { StatusPill } from "../components/primitives/MetaPrimitives";
import { useAuth } from "../auth/AuthContext";
import { Modal } from "../components/overlays/Overlays";
import { useToast } from "../components/feedback/Toast";
import { eventBus } from "../services/ws";
import { getApiClient, transitionServiceRequest } from "../services/apiClient";
import {
  getDemoServiceRequests,
  subscribeDemoServiceRequests,
  updateDemoServiceRequest,
} from "../services/demoStore";

/**
 * PUBLIC_INTERFACE
 * ServiceRequestsList: shows a list of Service Requests.
 * - Demo mode: reads from in-memory/localStorage demo store with client-side search/status filters and sorting.
 * - Non-demo mode: falls back to API GET /service-requests with server-side pagination/sort/filter.
 * - Row click navigates to /service-requests/:id
 */
export default function ServiceRequestsList() {
  const { dummyAuth } = useAuth();
  const navigate = useNavigate();

  // Shared UI state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");

  const toast = useToast();

  // Confirm dialog state
  const [confirm, setConfirm] = useState({ open: false, id: null, title: "" });

  // Local rows for optimistic update/rollback in API mode
  const [localRows, setLocalRows] = useState([]);
  useEffect(() => {
    // Keep in sync with source rows
    setLocalRows(dummyAuth ? demoPageRows : apiRows);
  }, [dummyAuth, demoPageRows, apiRows]);

  // Columns definition, including action column
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
      { key: "priority", header: "Priority", sortable: true },
      { key: "created_at", header: "Created At", sortable: true },
      {
        key: "actions",
        header: "Actions",
        render: (_v, row) => {
          const final = String(row.status || "").toLowerCase();
          const disabled = final === "resolved" || final === "closed";
          return (
            <Button
              variant="secondary"
              size="sm"
              disabled={disabled}
              aria-label={`Mark service request ${row.id} resolved`}
              onClick={(e) => {
                e.stopPropagation();
                setConfirm({ open: true, id: row.id, title: row.title || row.id });
              }}
            >
              Mark Resolved
            </Button>
          );
        },
      },
    ],
    []
  );

  // DEMO MODE path
  const [demoAll, setDemoAll] = useState([]);

  useEffect(() => {
    if (!dummyAuth) return;
    setDemoAll(getDemoServiceRequests());
    const unsub = subscribeDemoServiceRequests(() => setDemoAll(getDemoServiceRequests()));
    return unsub;
  }, [dummyAuth]);

  const demoFilteredSorted = useMemo(() => {
    if (!dummyAuth) return [];
    let rows = Array.isArray(demoAll) ? [...demoAll] : [];
    if (statusFilter) {
      rows = rows.filter((r) => String(r.status || "").toLowerCase() === String(statusFilter).toLowerCase());
    }
    if (q) {
      const term = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.title || "").toLowerCase().includes(term) ||
          String(r.customer || "").toLowerCase().includes(term) ||
          String(r.id || "").toLowerCase().includes(term)
      );
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
  }, [dummyAuth, demoAll, q, statusFilter, sort]);

  const demoPageRows = useMemo(() => {
    if (!dummyAuth) return [];
    const start = (page - 1) * pageSize;
    return demoFilteredSorted.slice(start, start + pageSize);
  }, [dummyAuth, demoFilteredSorted, page, pageSize]);

  // API MODE path
  const { rows: apiRowsRaw, total: apiTotal, loading: apiLoading } = useServerTable({
    path: "/service-requests",
    page,
    pageSize,
    sort,
    filter: { status: statusFilter || undefined },
  });
  const apiRows = useMemo(() => {
    if (dummyAuth) return [];
    // Map server payload to our columns shape defensively
    return (apiRowsRaw || []).map((r) => ({
      id: r.id || r.sr_id || "",
      title: r.title || r.type || "(no title)",
      customer: r.customer || r.customer_name || r.customer_id || "",
      status: r.status || "New",
      priority: r.priority || "",
      created_at: r.created_at || r.createdAt || "",
    }));
  }, [apiRowsRaw, dummyAuth]);

  // Render helpers
  const handleRowClick = (row) => {
    if (!row?.id) return;
    navigate(`/service-requests/${encodeURIComponent(row.id)}`);
  };

  const rows = localRows;
  const total = dummyAuth ? demoFilteredSorted.length : apiTotal;
  const loading = dummyAuth ? false : apiLoading;

  // Handle confirm resolve
  const handleResolve = async () => {
    const targetId = confirm.id;
    if (!targetId) return;
    setConfirm({ open: false, id: null, title: "" });

    // Snapshot for rollback
    const prev = [...localRows];

    try {
      if (dummyAuth) {
        const updated = updateDemoServiceRequest(targetId, {
          status: "Resolved",
          resolved_at: new Date().toISOString(),
        });
        setLocalRows((rs) => rs.map((r) => (r.id === targetId ? { ...r, ...updated } : r)));
        toast.push(`Service Request ${targetId} resolved (demo)`, "success");
        eventBus.emit("sr:resolved", { id: targetId, status: "Resolved" });
        return;
      }

      const api = getApiClient(async () => null);
      // Optimistic update
      setLocalRows((rs) =>
        rs.map((r) => (r.id === targetId ? { ...r, status: "Resolved", resolved_at: new Date().toISOString() } : r))
      );

      const data = await transitionServiceRequest(api, targetId, "resolved");
      // Reconcile with server response if provided
      setLocalRows((rs) => rs.map((r) => (r.id === targetId ? { ...r, ...data } : r)));
      toast.push(`Service Request ${targetId} marked as resolved`, "success");
      eventBus.emit("sr:resolved", data || { id: targetId, status: "Resolved" });
    } catch (e) {
      // Rollback on error
      setLocalRows(prev);
      const status = e?.response?.status;
      const msg = status ? `Server error (${status})` : (e?.message || "Network error");
      toast.push(`Failed to resolve SR ${targetId}: ${msg}`, "error");
    }
  };

  return (
    <section aria-labelledby="srl-title">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h1 id="srl-title" style={{ marginRight: "auto" }}>
          Service Requests
        </h1>
        <Button onClick={() => navigate("/service-requests/new")}>New Request</Button>
      </div>

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
            name="sr_search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by ID, title or customer"
          />
        </div>
        <div style={{ minWidth: 200 }}>
          <Select
            label="Status"
            name="sr_status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
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
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        sort={sort}
        onSortChange={setSort}
        loading={loading}
        emptyText={loading ? "Loading…" : "No service requests"}
        onRowClick={handleRowClick}
      />

      <div style={{ marginTop: 8 }}>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      <Modal
        open={confirm.open}
        onClose={() => setConfirm({ open: false, id: null, title: "" })}
        title="Mark as Resolved?"
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
              aria-label="Confirm mark as resolved"
              onClick={handleResolve}
              style={{ border: "none", padding: "8px 12px", borderRadius: 6, background: "var(--color-primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              Confirm
            </button>
          </>
        }
      >
        <p>Are you sure you want to mark “{confirm.title}” as Resolved?</p>
      </Modal>
    </section>
  );
}
