import React, { useMemo, useState } from "react";
import { DataTable, Pagination, useServerTable } from "../components/data/Table";
import { Input } from "../components/forms/Controls";

/**
 * PUBLIC_INTERFACE
 * Customer 360 with server-side table for customers and quick filter.
 */
export default function Customer360() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [q, setQ] = useState("");
  const pageSize = 10;

  const { rows, total, loading } = useServerTable({
    path: "/customers",
    page,
    pageSize,
    sort,
    filter: { q },
  });

  const columns = useMemo(
    () => [
      { key: "name", header: "Customer", sortable: true },
      { key: "email", header: "Email", sortable: true },
      { key: "phone", header: "Phone" },
      { key: "segment", header: "Segment", sortable: true },
    ],
    []
  );

  return (
    <section aria-labelledby="c360-title">
      <h1 id="c360-title">Customer 360</h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <Input
          label="Quick search"
          name="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable columns={columns} rows={rows} sort={sort} onSortChange={setSort} loading={loading} emptyText={loading ? "Loading…" : "No customers"} />
      <div style={{ marginTop: 8 }}>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
    </section>
  );
}
