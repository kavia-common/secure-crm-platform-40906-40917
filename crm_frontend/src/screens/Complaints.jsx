import React, { useMemo, useState } from "react";
import { DataTable, Pagination, useServerTable } from "../components/data/Table";
import { StatusPill } from "../components/primitives/MetaPrimitives";

/**
 * PUBLIC_INTERFACE
 * Complaints list with server-side table.
 */
export default function Complaints() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const pageSize = 10;

  const { rows, total, loading } = useServerTable({
    path: "/complaints",
    page,
    pageSize,
    sort,
  });

  const columns = useMemo(
    () => [
      { key: "id", header: "ID", sortable: true },
      { key: "title", header: "Title", sortable: true },
      { key: "status", header: "Status", sortable: true, render: (v) => <StatusPill status={v} /> },
      { key: "created_at", header: "Created", sortable: true },
    ],
    []
  );

  return (
    <section aria-labelledby="complaints-title">
      <h1 id="complaints-title">Complaints</h1>
      <DataTable columns={columns} rows={rows} sort={sort} onSortChange={setSort} loading={loading} />
      <div style={{ marginTop: 8 }}>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
    </section>
  );
}
