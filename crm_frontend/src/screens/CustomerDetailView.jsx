import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiClient } from "../services/apiClient";
import {
  getDemoCustomers,
  subscribeDemoCustomers,
} from "../services/demoStore";
import { Button } from "../components/primitives/Button";

/**
 * PUBLIC_INTERFACE
 * CustomerDetailView: displays a single customer with tabs for Summary, Timeline, Related.
 * - Fetches from API GET /customers/{id} if available, falls back to demoStore on 404.
 * - Shows header with customer name.
 * - Tabs: Summary (contact details), Timeline (interactions placeholder), Related (SRs/Complaints placeholder).
 * - Accessible layout with landmarks and aria labels.
 */
export default function CustomerDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dummyAuth } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");

  // Fetch customer from API or demo store
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (dummyAuth) {
        // Demo mode
        const all = getDemoCustomers();
        const found = all.find((c) => c.id === id);
        if (!cancelled) {
          if (found) {
            setCustomer(found);
          } else {
            setError("Customer not found");
          }
          setLoading(false);
        }
        return;
      }

      // API mode: try GET /customers/{id}
      try {
        const api = getApiClient(async () => null);
        const { data } = await api.get(`/customers/${encodeURIComponent(id)}`);
        if (!cancelled) {
          // Normalize
          const normalized = {
            id: data.id || data.customer_id || id,
            name: data.name || data.customer_name || "(no name)",
            email: data.email || "",
            phone: data.phone || "",
            tags: Array.isArray(data.tags) ? data.tags : [],
            owner_id: data.owner_id || "",
            created_at: data.created_at || data.createdAt || "",
          };
          setCustomer(normalized);
          setLoading(false);
        }
      } catch (e) {
        const status = e?.response?.status;
        if (status === 404) {
          // Silent fallback to demo
          const all = getDemoCustomers();
          const found = all.find((c) => c.id === id);
          if (!cancelled) {
            if (found) {
              setCustomer(found);
            } else {
              setError("Customer not found");
            }
            setLoading(false);
          }
        } else {
          if (!cancelled) {
            setError(e?.message || "Failed to load customer");
            setLoading(false);
          }
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, dummyAuth]);

  // Subscribe to demo store updates
  useEffect(() => {
    if (!dummyAuth) return;
    const unsub = subscribeDemoCustomers(() => {
      const all = getDemoCustomers();
      const found = all.find((c) => c.id === id);
      if (found) setCustomer(found);
    });
    return unsub;
  }, [id, dummyAuth]);

  if (loading) {
    return (
      <section aria-labelledby="customer-detail-title" aria-busy="true">
        <p>Loading customer...</p>
      </section>
    );
  }

  if (error || !customer) {
    return (
      <section aria-labelledby="customer-detail-title">
        <h1 id="customer-detail-title">Customer Not Found</h1>
        <p style={{ color: "var(--color-error)" }}>{error || "Customer not found"}</p>
        <Button onClick={() => navigate("/customers")}>Back to List</Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="customer-detail-title">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" onClick={() => navigate("/customers")} aria-label="Back to customers">
          ← Back
        </Button>
        <h1 id="customer-detail-title" style={{ flex: 1, margin: 0 }}>
          {customer.name}
        </h1>
      </div>

      {/* Tabs */}
      <nav aria-label="Customer detail tabs" style={{ borderBottom: "2px solid var(--color-secondary)", marginBottom: 16 }}>
        <ul style={{ display: "flex", gap: 16, listStyle: "none", padding: 0, margin: 0 }}>
          {["summary", "timeline", "related"].map((tab) => (
            <li key={tab}>
              <button
                onClick={() => setActiveTab(tab)}
                aria-current={activeTab === tab ? "page" : undefined}
                style={{
                  background: "none",
                  border: "none",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: activeTab === tab ? 700 : 400,
                  borderBottom: activeTab === tab ? "3px solid var(--color-primary)" : "3px solid transparent",
                  color: activeTab === tab ? "var(--color-primary)" : "var(--color-text)",
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Tab Content */}
      <div role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "summary" && (
          <div style={{ background: "var(--color-surface)", padding: 16, borderRadius: 8 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Summary</h2>
            <dl style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "8px 16px" }}>
              <dt style={{ fontWeight: 700 }}>ID:</dt>
              <dd style={{ margin: 0 }}>{customer.id}</dd>
              <dt style={{ fontWeight: 700 }}>Name:</dt>
              <dd style={{ margin: 0 }}>{customer.name}</dd>
              <dt style={{ fontWeight: 700 }}>Email:</dt>
              <dd style={{ margin: 0 }}>{customer.email || "N/A"}</dd>
              <dt style={{ fontWeight: 700 }}>Phone:</dt>
              <dd style={{ margin: 0 }}>{customer.phone || "N/A"}</dd>
              <dt style={{ fontWeight: 700 }}>Tags:</dt>
              <dd style={{ margin: 0 }}>{customer.tags?.length > 0 ? customer.tags.join(", ") : "None"}</dd>
              <dt style={{ fontWeight: 700 }}>Owner ID:</dt>
              <dd style={{ margin: 0 }}>{customer.owner_id || "N/A"}</dd>
              <dt style={{ fontWeight: 700 }}>Created:</dt>
              <dd style={{ margin: 0 }}>{customer.created_at || "N/A"}</dd>
            </dl>
          </div>
        )}

        {activeTab === "timeline" && (
          <div style={{ background: "var(--color-surface)", padding: 16, borderRadius: 8 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Timeline / Interactions</h2>
            <p style={{ color: "var(--color-text)", opacity: 0.7 }}>No interactions recorded yet.</p>
          </div>
        )}

        {activeTab === "related" && (
          <div style={{ background: "var(--color-surface)", padding: 16, borderRadius: 8 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Related Service Requests & Complaints</h2>
            <p style={{ color: "var(--color-text)", opacity: 0.7 }}>No related items found.</p>
          </div>
        )}
      </div>
    </section>
  );
}
