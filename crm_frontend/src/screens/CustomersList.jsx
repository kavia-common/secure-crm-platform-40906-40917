import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, Pagination, useServerTable } from "../components/data/Table";
import { Input, Select } from "../components/forms/Controls";
import { useToast } from "../components/feedback/Toast";
import { shouldUseFallback } from "../services/runtimeFlags";

/**
 * PUBLIC_INTERFACE
 * CustomersList: customers listing with search and owner filter, sortable table.
 * - Uses server API when available.
 * - Silently falls back to demo store when backend is unavailable or returns 404.
 * - Caches probe result so subsequent loads do not call the real endpoint again this session.
 */
export default function CustomersList() {
  const navigate = useNavigate();
  const toast = useToast();

  // UI state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");

  // Owner filter options (derived from demo data only when fallback is active)
  const [ownerOptions, setOwnerOptions] = useState([""]);

  useEffect(() => {
    let unsub = null;
    if (shouldUseFallback("customers")) {
      import("../services/demoStore")
        .then(({ getDemoCustomers, subscribeDemoCustomers }) => {
          const compute = () => {
            const set = new Set((getDemoCustomers() || []).map((c) => c.owner_id).filter(Boolean));
            setOwnerOptions(["", ...Array.from(set)]);
          };
          compute();
          unsub = subscribeDemoCustomers(() => compute());
        })
        .catch(() => {
          setOwnerOptions([""]);
        });
    } else {
      setOwnerOptions([""]);
    }
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Server table with transparent fallback and probe caching
  const {
    rows: apiRowsRaw,
    total,
    loading,
  } = useServerTable({
    path: "/customers",
    page,
    pageSize,
    sort,
    filter: { q: q || undefined, owner_id: owner || undefined },
    fallbackKey: "customers",
  });

  const rows = useMemo(() => {
    return (apiRowsRaw || []).map((r, i) => ({
      id: r.id || r.customer_id || r.cust_id || String(i + 1),
      name: r.name || r.customer_name || "(no name)",
      email: r.email || "",
      phone: r.phone || "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      created_at: r.created_at || r.createdAt || "",
    }));
  }, [apiRowsRaw]);

  // Columns
  const columns = useMemo(
    () => [
      { key: "id", header: "ID", sortable: true },
      { key: "name", header: "Name", sortable: true },
      { key: "email", header: "Email", sortable: true },
      { key: "phone", header: "Phone" },
      {
        key: "tags",
        header: "Tags",
        render: (v) => (Array.isArray(v) ? v.join(", ") : v || ""),
      },
      { key: "created_at", header: "Created At", sortable: true },
    ],
    []
  );

  const handleRowClick = (row) => {
    if (!row?.id) return;
    navigate(`/customers/${encodeURIComponent(row.id)}`);
  };

  return (
    <section aria-labelledby="customers-title">
      <h1 id="customers-title">Customers</h1>

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
            name="cust_search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by ID, name or email"
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select
            label="Owner"
            name="cust_owner"
            value={owner}
            onChange={(e) => {
              setOwner(e.target.value);
              setPage(1);
            }}
            options={(ownerOptions || []).map((o) => ({
              label: o ? o : "All",
              value: o,
            }))}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        sort={sort}
        onSortChange={setSort}
        loading={loading}
        emptyText={loading ? "Loading…" : "No customers"}
        onRowClick={handleRowClick}
      />

      <div style={{ marginTop: 8 }}>
        <Pagination page={page} pageSize={pageSize} total={total || 0} onPageChange={setPage} />
      </div>
    </section>
  );
}
