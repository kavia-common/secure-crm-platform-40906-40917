import React, { useEffect, useMemo, useState } from "react";
import { getApiClient } from "../../services/apiClient";
import { useAuth } from "../../auth/AuthContext";
import {
  shouldUseFallback,
  markResourceUnavailable,
  markResourceAvailable,
} from "../../services/runtimeFlags";

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

function isNetworkError(e) {
  return !e?.response || e?.code === "ERR_NETWORK";
}
function isNotFound(e) {
  return e?.response?.status === 404;
}

async function buildFallbackRows(fallbackKey, { page, pageSize, sort, filter }) {
  try {
    const mod = await import("../../services/demoStore");
    const dir = (sort?.dir || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    const key = sort?.key;

    // Helpers
    const applySort = (rows) => {
      if (!key) return rows;
      const copy = [...rows];
      copy.sort((a, b) => {
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
      return copy;
    };
    const paginate = (rows) => {
      const start = (Number(page) - 1) * Number(pageSize);
      return rows.slice(start, start + Number(pageSize));
    };

    if (fallbackKey === "customers") {
      const all = mod.getDemoCustomers();
      const term = String(filter?.q || "").toLowerCase();
      const owner = filter?.owner_id ? String(filter.owner_id) : "";
      let rows = Array.isArray(all) ? [...all] : [];
      if (term) {
        rows = rows.filter(
          (r) =>
            String(r.id || "").toLowerCase().includes(term) ||
            String(r.name || "").toLowerCase().includes(term) ||
            String(r.email || "").toLowerCase().includes(term)
        );
      }
      if (owner) {
        rows = rows.filter((r) => String(r.owner_id || "") === owner);
      }
      rows = applySort(rows);
      const paged = paginate(rows);
      return { items: paged, total: rows.length };
    }

    if (fallbackKey === "complaints") {
      const all = mod.getDemoComplaints();
      const term = String(filter?.q || "").toLowerCase();
      const status = filter?.status ? String(filter.status) : "";
      const severity = filter?.severity ? String(filter.severity) : "";
      let rows = Array.isArray(all) ? [...all] : [];
      if (term) {
        rows = rows.filter(
          (r) =>
            String(r.id || "").toLowerCase().includes(term) ||
            String(r.title || "").toLowerCase().includes(term) ||
            String(r.customer || "").toLowerCase().includes(term)
        );
      }
      if (status) rows = rows.filter((r) => String(r.status || "") === status);
      if (severity) rows = rows.filter((r) => String(r.priority || "") === severity);
      rows = applySort(rows);
      const paged = paginate(rows);
      return { items: paged, total: rows.length };
    }

    if (fallbackKey === "service_requests") {
      const all = mod.getDemoServiceRequests();
      const term = String(filter?.q || "").toLowerCase();
      const status = filter?.status ? String(filter.status) : "";
      let rows = Array.isArray(all) ? [...all] : [];
      if (term) {
        rows = rows.filter(
          (r) =>
            String(r.id || "").toLowerCase().includes(term) ||
            String(r.title || "").toLowerCase().includes(term) ||
            String(r.customer || "").toLowerCase().includes(term)
        );
      }
      if (status) rows = rows.filter((r) => String(r.status || "").toLowerCase() === status.toLowerCase());
      rows = applySort(rows);
      const paged = paginate(rows);
      return { items: paged, total: rows.length };
    }
  } catch {
    // ignore dynamic import failures -> return empty dataset
  }
  return { items: [], total: 0 };
}

/**
 * PUBLIC_INTERFACE
 * useServerTable: fetches data using API with server pagination/sort/filter.
 * If a fallbackKey is provided, the hook will:
 * - Skip API calls when the resource is flagged unavailable in this session
 * - On 404/network error, mark unavailable and serve fallback data (demoStore)
 * - On success, mark the resource available (re-enables API automatically)
 */
export function useServerTable({ path, page, pageSize, sort, filter, fallbackKey = null }) {
  const { getToken } = useAuth();
  const api = useMemo(() => getApiClient(getToken), [getToken]);
  const [state, setState] = useState({ rows: [], total: 0, loading: false, error: null });

  useEffect(() => {
    let cancel = false;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));

      // Use fallback immediately if flagged or API disabled
      if (fallbackKey && shouldUseFallback(fallbackKey)) {
        const { items, total } = await buildFallbackRows(fallbackKey, { page, pageSize, sort, filter });
        if (!cancel) setState({ rows: items, total, loading: false, error: null });
        return;
      }

      try {
        const params = {
          page,
          page_size: pageSize,
          sort: sort?.key ? `${sort.key}:${sort.dir || "asc"}` : undefined,
          ...filter,
        };
        const { data } = await api.get(path, { params });
        const items = data?.items || [];
        const total = Number(data?.total ?? items.length);
        if (fallbackKey) markResourceAvailable(fallbackKey);
        if (!cancel) setState({ rows: items, total, loading: false, error: null });
      } catch (e) {
        if (fallbackKey && (isNetworkError(e) || isNotFound(e))) {
          // Cache unavailability and switch to fallback data silently
          markResourceUnavailable(fallbackKey);
          const { items, total } = await buildFallbackRows(fallbackKey, { page, pageSize, sort, filter });
          if (!cancel) setState({ rows: items, total, loading: false, error: null });
        } else {
          if (!cancel) setState((s) => ({ ...s, loading: false, error: e?.message || "Failed to load" }));
        }
      }
    }

    load();
    return () => {
      cancel = true;
    };
  }, [api, path, page, pageSize, sort, JSON.stringify(filter), fallbackKey]);

  return state;
}

/**
 * PUBLIC_INTERFACE
 * DataTable: simple table with clickable header sorting and server-mode hooks.
 */
export function DataTable({ columns, rows, sort, onSortChange, loading, emptyText = "No data", onRowClick }) {
  const handleSort = (key) => {
    if (!onSortChange) return;
    const isSame = sort?.key === key;
    const dir = isSame && sort?.dir === "asc" ? "desc" : "asc";
    onSortChange({ key, dir });
  };

  const clickable = typeof onRowClick === "function";

  return (
    <div style={{ border: "1px solid rgba(17,24,39,.12)", borderRadius: 10, overflow: "hidden", background: "var(--color-surface)" }}>
      <table role="grid" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "rgba(17,24,39,.03)" }}>
          <tr>
            {columns.map((c) =>
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
            )}
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
            rows.map((r, idx) => {
              const key = r.id || idx;
              const rowHandlers = clickable
                ? {
                    onClick: () => onRowClick(r),
                    onKeyDown: (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(r);
                      }
                    },
                    tabIndex: 0,
                    role: "row",
                    style: {
                      borderBottom: "1px solid rgba(17,24,39,.06)",
                      cursor: "pointer",
                    },
                    "aria-label": `Row ${String(r.id || idx)}`,
                  }
                : { style: { borderBottom: "1px solid rgba(17,24,39,.06)" } };

              return (
                <tr key={key} {...rowHandlers}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ padding: "10px 12px" }}>
                      {typeof c.render === "function" ? c.render(r[c.key], r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })
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
