import React, { useEffect, useMemo, useState } from "react";
import { getApiClient } from "../../services/apiClient";
import { useAuth } from "../../auth/AuthContext";

/**
 * PUBLIC_INTERFACE
 * Pagination: accessible pagination control.
 */
export function Pagination({ page, pageSize, total, onPageChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const items = [];
  for (let i = 1; i <= pages; i++) items.push(i);
  return (
    <nav aria-label="Pagination" style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <button
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(17,24,39,.12)", background: "var(--color-surface)", cursor: "pointer" }}
      >
        ‹
      </button>
      {items.slice(0, 7).map((n) => (
        <button
          key={n}
          aria-current={n === page ? "page" : undefined}
          onClick={() => onPageChange?.(n)}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid rgba(17,24,39,.12)",
            background: n === page ? "var(--color-secondary)" : "var(--color-surface)",
            cursor: "pointer",
            fontWeight: n === page ? 700 : 600,
          }}
        >
          {n}
        </button>
      ))}
      <button
        aria-label="Next page"
        disabled={page >= pages}
        onClick={() => onPageChange?.(page + 1)}
        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(17,24,39,.12)", background: "var(--color-surface)", cursor: "pointer" }}
      >
        ›
      </button>
      <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
        Page {page} of {pages} ({total} items)
      </span>
    </nav>
  );
}

/**
 * PUBLIC_INTERFACE
 * useServerTable: fetches data using API with server pagination/sort/filter.
 */
export function useServerTable({ path, page, pageSize, sort, filter }) {
  const { getToken } = useAuth();
  const api = useMemo(() => getApiClient(getToken), [getToken]);
  const [state, setState] = useState({ rows: [], total: 0, loading: false, error: null });

  useEffect(() => {
    let cancel = false;
    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const params = {
          page,
          page_size: pageSize,
          sort: sort?.key ? `${sort.key}:${sort.dir || "asc"}` : undefined,
          ...filter,
        };
        const { data } = await api.get(path, { params });
        // Expect backend S3 to implement: { items: [], total: number }
        const items = data?.items || [];
        const total = Number(data?.total ?? items.length);
        if (!cancel) setState({ rows: items, total, loading: false, error: null });
      } catch (e) {
        if (!cancel) setState((s) => ({ ...s, loading: false, error: e?.message || "Failed to load" }));
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [api, path, page, pageSize, sort, JSON.stringify(filter)]);

  return state;
}

/**
 * PUBLIC_INTERFACE
 * DataTable: simple table with clickable header sorting and server-mode hooks.
 */
export function DataTable({ columns, rows, sort, onSortChange, loading, emptyText = "No data" }) {
  const handleSort = (key) => {
    if (!onSortChange) return;
    const isSame = sort?.key === key;
    const dir = isSame && sort?.dir === "asc" ? "desc" : "asc";
    onSortChange({ key, dir });
  };
  return (
    <div style={{ border: "1px solid rgba(17,24,39,.12)", borderRadius: 10, overflow: "hidden", background: "var(--color-surface)" }}>
      <table role="grid" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "rgba(17,24,39,.03)" }}>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                onClick={() => c.sortable && handleSort(c.key)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(17,24,39,.12)",
                  cursor: c.sortable ? "pointer" : "default",
                  userSelect: "none",
                }}
                aria-sort={
                  sort?.key === c.key ? (sort.dir === "desc" ? "descending" : "ascending") : undefined
                }
                aria-label={c.sortable ? `${c.header} column, ${sort?.key === c.key ? sort.dir : "sortable"}` : c.header}
              >
                {c.header}
                {c.sortable && sort?.key === c.key ? (sort.dir === "asc" ? " ▲" : " ▼") : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 16, textAlign: "center" }}>
                Loading…
              </td>
            </tr>
          ) : rows?.length ? (
            rows.map((r, idx) => (
              <tr key={r.id || idx} style={{ borderBottom: "1px solid rgba(17,24,39,.06)" }}>
                {columns.map((c) => (
                  <td key={c.key} style={{ padding: "10px 12px" }}>
                    {typeof c.render === "function" ? c.render(r[c.key], r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} style={{ padding: 16, textAlign: "center", color: "rgba(17,24,39,.7)" }}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
