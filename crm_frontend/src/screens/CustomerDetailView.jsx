import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiClient } from "../services/apiClient";
import {
  getDemoCustomers,
  subscribeDemoCustomers,
  getDemoServiceRequests,
  getDemoComplaints,
} from "../services/demoStore";
import { eventBus } from "../services/ws";
import {
  shouldUseFallback,
  markResourceUnavailable,
  markResourceAvailable,
} from "../services/runtimeFlags";
import { Button } from "../components/primitives/Button";
import { Tabs } from "../components/primitives/MetaPrimitives";

/**
 * PUBLIC_INTERFACE
 * CustomerDetailView: displays a single customer with tabs for Summary, Timeline, Related, Attachments.
 * - Fetches from API GET /customers/{id} if available, falls back to demoStore on 404.
 * - Timeline: fetches GET /customers/{id}/timeline with silent demo fallback.
 * - Related: shows related service requests and complaints (navigable).
 * - Attachments: lists files with upload (disabled in demo).
 * - Real-time: subscribes to eventBus for live updates.
 * - Accessible: proper roles, aria labels, focus management.
 */
export default function CustomerDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dummyAuth } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");

  // Timeline state
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const timelineRegion = useRef(null);

  // Related state
  const [related, setRelated] = useState({ srs: [], complaints: [] });
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);

  // Fetch customer from API or demo store
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const useFallback = shouldUseFallback("customers");
      if (dummyAuth || useFallback) {
        // Demo mode
        const all = getDemoCustomers();
        const found = all.find((c) => c.id === id);
        if (!cancelled) {
          if (found) {
            setCustomer(found);
            setApiAvailable(false);
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
          setApiAvailable(true);
          markResourceAvailable("customers");
          setLoading(false);
        }
      } catch (e) {
        const status = e?.response?.status;
        if (status === 404) {
          // Silent fallback to demo
          markResourceUnavailable("customers");
          const all = getDemoCustomers();
          const found = all.find((c) => c.id === id);
          if (!cancelled) {
            if (found) {
              setCustomer(found);
              setApiAvailable(false);
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
    if (apiAvailable) return;
    const unsub = subscribeDemoCustomers(() => {
      const all = getDemoCustomers();
      const found = all.find((c) => c.id === id);
      if (found) setCustomer(found);
    });
    return unsub;
  }, [id, apiAvailable]);

  // Fetch timeline when tab is selected
  useEffect(() => {
    if (activeTab !== "timeline" || !customer) return;

    let cancelled = false;

    async function loadTimeline() {
      setTimelineLoading(true);

      // Try API first
      if (apiAvailable) {
        try {
          const api = getApiClient(async () => null);
          const { data } = await api.get(`/customers/${encodeURIComponent(id)}/timeline`);
          if (!cancelled) {
            const events = Array.isArray(data) ? data : data?.events || [];
            setTimeline(events);
            setTimelineLoading(false);
            markResourceAvailable("customer-timeline");
          }
          return;
        } catch (e) {
          // Silent fallback
          markResourceUnavailable("customer-timeline");
        }
      }

      // Demo fallback: synthetic timeline
      if (!cancelled) {
        const demo = [
          {
            id: "evt-1",
            type: "created",
            timestamp: customer.created_at || new Date().toISOString(),
            description: "Customer created",
            actor: "System",
          },
          {
            id: "evt-2",
            type: "update",
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            description: "Contact information updated",
            actor: "Admin",
          },
        ];
        setTimeline(demo);
        setTimelineLoading(false);
      }
    }

    loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [activeTab, customer, id, apiAvailable]);

  // Fetch related SRs and complaints when tab is selected
  useEffect(() => {
    if (activeTab !== "related" || !customer) return;

    let cancelled = false;

    async function loadRelated() {
      setRelatedLoading(true);

      // Try API first (hypothetical endpoint)
      if (apiAvailable) {
        try {
          const api = getApiClient(async () => null);
          const { data } = await api.get(`/customers/${encodeURIComponent(id)}/related`);
          if (!cancelled) {
            setRelated({
              srs: data?.service_requests || [],
              complaints: data?.complaints || [],
            });
            setRelatedLoading(false);
            return;
          }
        } catch (e) {
          // Silent fallback
        }
      }

      // Demo fallback: filter from demo stores
      if (!cancelled) {
        const allSrs = getDemoServiceRequests();
        const allComplaints = getDemoComplaints();
        const srs = allSrs.filter((sr) => sr.customer_id === id || sr.customer === customer.name);
        const complaints = allComplaints.filter((c) => c.customer_id === id || c.customer === customer.name);
        setRelated({ srs, complaints });
        setRelatedLoading(false);
      }
    }

    loadRelated();
    return () => {
      cancelled = true;
    };
  }, [activeTab, customer, id, apiAvailable]);

  // Fetch attachments when tab is selected
  useEffect(() => {
    if (activeTab !== "attachments" || !customer) return;

    let cancelled = false;

    async function loadAttachments() {
      setAttachLoading(true);

      // Try API first
      if (apiAvailable) {
        try {
          const api = getApiClient(async () => null);
          const { data } = await api.get(`/customers/${encodeURIComponent(id)}/attachments`);
          if (!cancelled) {
            const files = Array.isArray(data) ? data : data?.files || [];
            setAttachments(files);
            setAttachLoading(false);
            return;
          }
        } catch (e) {
          // Silent fallback
        }
      }

      // Demo fallback: empty or synthetic
      if (!cancelled) {
        setAttachments([
          {
            id: "att-1",
            name: "contract.pdf",
            size: 245678,
            type: "application/pdf",
            uploaded_at: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: "att-2",
            name: "support_logs.txt",
            size: 12345,
            type: "text/plain",
            uploaded_at: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
        setAttachLoading(false);
      }
    }

    loadAttachments();
    return () => {
      cancelled = true;
    };
  }, [activeTab, customer, id, apiAvailable]);

  // Real-time: listen for customer updates
  useEffect(() => {
    const unsub = eventBus.on("customer:updated", (payload) => {
      if (payload?.id === id) {
        setCustomer((prev) => (prev ? { ...prev, ...payload } : payload));
      }
    });
    return unsub;
  }, [id]);

  // Real-time: listen for timeline events
  useEffect(() => {
    const unsub = eventBus.on("customer:event", (payload) => {
      if (payload?.customer_id === id) {
        setTimeline((prev) => [payload, ...prev]);
        // Announce to screen readers
        if (timelineRegion.current) {
          timelineRegion.current.textContent = `New event: ${payload.description || "Update"}`;
        }
      }
    });
    return unsub;
  }, [id]);

  // Tab change handler with focus management
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    // Focus will be managed by Tabs component
  };

  if (loading) {
    return (
      <section aria-labelledby="customer-detail-title" aria-busy="true">
        <div style={{ padding: 16 }}>
          <div
            style={{
              width: 200,
              height: 20,
              background: "var(--color-secondary)",
              borderRadius: 4,
              marginBottom: 12,
            }}
          />
          <div
            style={{
              width: 300,
              height: 16,
              background: "var(--color-secondary)",
              borderRadius: 4,
            }}
          />
        </div>
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

  const tabs = [
    {
      value: "summary",
      label: "Summary",
      content: (
        <div style={{ background: "var(--color-surface)", padding: 16, borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Summary</h2>
            {!apiAvailable && (
              <span
                style={{ fontSize: 12, color: "var(--color-text)", opacity: 0.6 }}
                aria-label="Edit disabled in demo mode"
              >
                (demo mode)
              </span>
            )}
          </div>
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
            <dd style={{ margin: 0 }}>
              {customer.created_at ? new Date(customer.created_at).toLocaleString() : "N/A"}
            </dd>
          </dl>
        </div>
      ),
    },
    {
      value: "timeline",
      label: "Timeline",
      content: (
        <div style={{ background: "var(--color-surface)", padding: 16, borderRadius: 8 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Timeline</h2>
          {/* Screen reader live region for new events */}
          <div
            ref={timelineRegion}
            aria-live="polite"
            aria-atomic="true"
            style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
          />
          {timelineLoading ? (
            <p>Loading timeline...</p>
          ) : timeline.length === 0 ? (
            <p style={{ color: "var(--color-text)", opacity: 0.7 }}>No events recorded yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {timeline.map((evt) => (
                <li
                  key={evt.id}
                  style={{
                    borderLeft: "3px solid var(--color-primary)",
                    paddingLeft: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--color-text)", opacity: 0.7 }}>
                    {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : "Unknown time"}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{evt.description || evt.type}</div>
                  {evt.actor && (
                    <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>by {evt.actor}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      value: "related",
      label: "Related",
      content: (
        <div style={{ background: "var(--color-surface)", padding: 16, borderRadius: 8 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Related Service Requests & Complaints</h2>
          {relatedLoading ? (
            <p>Loading related items...</p>
          ) : (
            <>
              <section aria-labelledby="related-srs-title" style={{ marginBottom: 16 }}>
                <h3 id="related-srs-title" style={{ fontSize: 16, marginBottom: 8 }}>
                  Service Requests ({related.srs.length})
                </h3>
                {related.srs.length === 0 ? (
                  <p style={{ opacity: 0.7 }}>No service requests found.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {related.srs.map((sr) => (
                      <li key={sr.id} style={{ marginBottom: 8 }}>
                        <button
                          onClick={() => navigate(`/service-requests/${sr.id}`)}
                          style={{
                            background: "none",
                            border: "1px solid rgba(17,24,39,.12)",
                            borderRadius: 6,
                            padding: 8,
                            cursor: "pointer",
                            textAlign: "left",
                            width: "100%",
                          }}
                          aria-label={`View service request ${sr.id}`}
                        >
                          <div style={{ fontWeight: 600 }}>{sr.title || sr.id}</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            {sr.status} • {sr.priority}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section aria-labelledby="related-complaints-title">
                <h3 id="related-complaints-title" style={{ fontSize: 16, marginBottom: 8 }}>
                  Complaints ({related.complaints.length})
                </h3>
                {related.complaints.length === 0 ? (
                  <p style={{ opacity: 0.7 }}>No complaints found.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {related.complaints.map((c) => (
                      <li key={c.id} style={{ marginBottom: 8 }}>
                        <button
                          onClick={() => navigate(`/complaints/${c.id}`)}
                          style={{
                            background: "none",
                            border: "1px solid rgba(17,24,39,.12)",
                            borderRadius: 6,
                            padding: 8,
                            cursor: "pointer",
                            textAlign: "left",
                            width: "100%",
                          }}
                          aria-label={`View complaint ${c.id}`}
                        >
                          <div style={{ fontWeight: 600 }}>{c.title || c.id}</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            {c.status} • {c.priority}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      ),
    },
    {
      value: "attachments",
      label: "Attachments",
      content: (
        <div style={{ background: "var(--color-surface)", padding: 16, borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Attachments</h2>
            <button
              disabled={!apiAvailable}
              title={!apiAvailable ? "Upload disabled in demo mode" : "Upload file"}
              style={{
                border: "none",
                padding: "6px 12px",
                borderRadius: 6,
                background: apiAvailable ? "var(--color-primary)" : "rgba(17,24,39,.12)",
                color: apiAvailable ? "#fff" : "rgba(17,24,39,.4)",
                fontWeight: 600,
                cursor: apiAvailable ? "pointer" : "not-allowed",
              }}
              aria-label="Upload attachment"
            >
              Upload
            </button>
          </div>
          {attachLoading ? (
            <p>Loading attachments...</p>
          ) : attachments.length === 0 ? (
            <p style={{ opacity: 0.7 }}>No attachments found.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {attachments.map((att) => (
                <li
                  key={att.id}
                  style={{
                    border: "1px solid rgba(17,24,39,.12)",
                    borderRadius: 6,
                    padding: 8,
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{att.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {att.type} • {(att.size / 1024).toFixed(1)} KB •{" "}
                      {att.uploaded_at ? new Date(att.uploaded_at).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                  <button
                    style={{
                      border: "1px solid rgba(17,24,39,.12)",
                      background: "var(--color-surface)",
                      padding: "4px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                    aria-label={`Download ${att.name}`}
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
  ];

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
      <Tabs tabs={tabs} active={activeTab} onChange={handleTabChange} />
    </section>
  );
}
