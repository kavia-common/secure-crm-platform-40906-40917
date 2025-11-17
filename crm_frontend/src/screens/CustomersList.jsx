import React, { useEffect, useMemo, useState } from "react";
import { DataTable, Pagination, useServerTable } from "../components/data/Table";
import { Input, Select } from "../components/forms/Controls";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/feedback/Toast";

/**
 * PUBLIC_INTERFACE
 * CustomersList: demo-mode customers listing with search and owner filter, sortable table,
 * and API fallback (GET /customers) when not in demo.
 * Row click shows a toast (detail route to be implemented).
 */
export default function CustomersList() {
  const { dummyAuth } = useAuth();
  const toast = useToast();

  // UI state
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");

  // DEMO data wiring
  const [demoAll, setDemoAll] = useState([]);

  useEffect(() => {
    if (!dummyAuth) return;
    // Lazy-import from demoStore to avoid cyclic imports in SSR/test
    import("../services/demoStore")
      .then(({ getDemoCustomers, subscribeDemoCustomers }) => {
        setDemoAll(getDemoCustomers());
        const unsub = subscribeDemoCustomers(() => setDemoAll(getDemoCustomers()));
        return unsub;
      })
      .catch(() => {});
  }, [dummyAuth]);

  const availableOwners = useMemo(() => {
    if (!dummyAuth) return [];
    const set = new Set(demoAll.map((c) => c.owner_id).filter(Boolean));
    return ["", ...Array.from(set)];
  }, [dummyAuth, demoAll]);

  const demoFilteredSorted = useMemo(() => {
    if (!dummyAuth) return [];
    let rows = Array.isArray(demoAll) ? [...demoAll] : [];
    if (q) {
      const term = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.id || "").toLowerCase().includes(term) ||
          String(r.name || "").toLowerCase().includes(term) ||
          String(r.email || "").toLowerCase().includes(term)
      );
    }
    if (owner) {
      rows = rows.filter((r) => String(r.owner_id || "") === String(owner));
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
  }, [dummyAuth, demoAll, q, owner, sort]);

  const demoPageRows = useMemo(() => {
    if (!dummyAuth) return [];
    const start = (page - 1) * pageSize;
    return demoFilteredSorted.slice(start, start + pageSize);
  }, [dummyAuth, demoFilteredSorted, page, pageSize]);

  // API mode
  const { rows: apiRowsRaw, total: apiTotal, loading: apiLoading, error: apiError } = useServerTable({
    path: "/customers",
    page,
    pageSize,
    sort,
    filter: { q: q || undefined, owner_id: owner || undefined },
  });

  useEffect(() => {
    if (!dummyAuth && apiError) {
      const base = process.env.REACT_APP_API_BASE || "/api/v1";
      toast.push(`Failed to load customers from ${base}/customers: ${apiError}`, "error");
    }
  }, [dummyAuth, apiError, toast]);

  const apiRows = useMemo(() => {
    if (dummyAuth) return [];
    return (apiRowsRaw || []).map((r, i) => ({
      id: r.id || r.customer_id || r.cust_id || String(i + 1),
      name: r.name || r.customer_name || "(no name)",
      email: r.email || "",
      phone: r.phone || "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      created_at: r.created_at || r.createdAt || "",
    }));
  }, [apiRowsRaw, dummyAuth]);

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
    // Detail route not implemented yet
    const id = row?.id || "";
    toast.push(`Customer detail (${id}) is not implemented yet.`, "info");
  };

  const rows = dummyAuth ? demoPageRows : apiRows;
  const total = dummyAuth ? demoFilteredSorted.length : apiTotal;
  const loading = dummyAuth ? false : apiLoading;

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
            options={(availableOwners || []).map((o) => ({
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
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
    </section>
  );
}
