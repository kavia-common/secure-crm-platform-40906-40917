import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiClient, transitionComplaint } from "../services/apiClient";
import {
  getDemoComplaints,
  subscribeDemoComplaints,
  updateDemoComplaint,
  getDemoServiceRequests,
  getDemoCustomers,
} from "../services/demoStore";
import { eventBus } from "../services/ws";
import {
  shouldUseFallback,
  markResourceUnavailable,
  markResourceAvailable,
} from "../services/runtimeFlags";
import { useToast } from "../components/feedback/Toast";
import { Button } from "../components/primitives/Button";
import { StatusPill, Tabs } from "../components/primitives/MetaPrimitives";
import { Modal } from "../components/overlays/Overlays";

/**
 * PUBLIC_INTERFACE
 * ComplaintDetailView: displays a single complaint with tabs for Summary, Timeline, Related, Attachments.
 * - Fetches from API GET /complaints/{id} if available, falls back to demoStore on 404.
 * - Timeline: fetches GET /complaints/{id}/timeline with silent demo fallback; real-time updates.
 * - Related: shows related customer and linked service requests.
 * - Attachments: lists files with upload (disabled in demo).
 * - Actions: Close button (disabled if already closed or in demo without API).
 * - Real-time: subscribes to eventBus for live updates (complaint:closed, complaint:event).
 * - Accessible: proper roles, aria labels, focus management, aria-live for timeline.
 */
export default function ComplaintDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dummyAuth } = useAuth();
  const toast = useToast();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [confirm, setConfirm] = useState({ open: false });

  // Timeline state
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const timelineRegion = useRef(null);

  // Related state
  const [related, setRelated] = useState({ customer: null, srs: [] });
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);

  // Fetch complaint from API or demo store
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const useFallback = shouldUseFallback("complaints");
      if (dummyAuth || useFallback) {
        // Demo mode
        const all = getDemoComplaints();
        const found = all.find((c) => c.id === id);
        if (!cancelled) {
          if (found) {
            setComplaint(found);
            setApiAvailable(false);
          } else {
            setError("Complaint not found");
          }
          setLoading(false);
        }
        return;
      }

      // API mode: try GET /complaints/{id}
      try {
        const api = getApiClient(async () => null);
        const { data } = await api.get(`/complaints/${encodeURIComponent(id)}`);
        if (!cancelled) {
          // Normalize
          const normalized = {
            id: data.id || id,
            title: data.title || data.category || "(no title)",
            customer_id: data.customer_id || "",
            customer: data.customer || data.customer_name || data.customer_id || "",
            status: data.status || "New",
            escalation: data.escalation || data.level || "L0",
            priority: data.priority || data.severity || "Medium",
            created_at: data.created_at || data.createdAt || "",
            closed_at: data.closed_at || data.closedAt || null,
          };
          setComplaint(normalized);
          setApiAvailable(true);
          markResourceAvailable("complaints");
          setLoading(false);
        }
      } catch (e) {
        const status = e?.response?.status;
        if (status === 404) {
          // Silent fallback to demo
          markResourceUnavailable("complaints");
          const all = getDemoComplaints();
          const found = all.find((c) => c.id === id);
          if (!cancelled) {
            if (found) {
              setComplaint(found);
              setApiAvailable(false);
            } else {
              setError("Complaint not found");
            }
            setLoading(false);
          }
        } else {
          if (!cancelled) {
            setError(e?.message || "Failed to load complaint");
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
    const unsub = subscribeDemoComplaints(() => {
      const all = getDemoComplaints();
      const found = all.find((c) => c.id === id);
      if (found) setComplaint(found);
    });
    return unsub;
  }, [id, apiAvailable]);

  // Listen to eventBus for real-time updates (complaint:closed)
  useEffect(() => {
    const unsub = eventBus.on("complaint:closed", (payload) => {
      if (payload?.id === id) {
        setComplaint((prev) =>
          prev ? { ...prev, status: "Closed", closed_at: payload.closed_at || new Date().toISOString() } : prev
        );
        toast.push(`Complaint ${id} closed`, "success");
      }
    });
    return unsub;
  }, [id, toast]);

  // Listen for timeline events
  useEffect(() => {
    const unsub = eventBus.on("complaint:event", (payload) => {
      if (payload?.complaint_id === id) {
        setTimeline((prev) => [payload, ...prev]);
        // Announce to screen readers
        if (timelineRegion.current) {
          timelineRegion.current.textContent = `New event: ${payload.description || "Update"}`;
        }
      }
    });
    return unsub;
  }, [id]);

  // Fetch timeline when tab is selected
  useEffect(() => {
    if (activeTab !== "timeline" || !complaint) return;

    let cancelled = false;

    async function loadTimeline() {
      setTimelineLoading(true);

      // Try API first
      if (apiAvailable) {
        try {
          const api = getApiClient(async () => null);
          const { data } = await api.get(`/complaints/${encodeURIComponent(id)}/timeline`);
          if (!cancelled) {
            const events = Array.isArray(data) ? data : data?.events || [];
            setTimeline(events);
            setTimelineLoading(false);
            markResourceAvailable("complaint-timeline");
          }
          return;
        } catch (e) {
          // Silent fallback
          markResourceUnavailable("complaint-timeline");
        }
      }

      // Demo fallback: synthetic timeline
      if (!cancelled) {
        const demo = [
          {
            id: "evt-1",
            type: "created",
            timestamp: complaint.created_at || new Date().toISOString(),
            description: "Complaint created",
            actor: "System",
          },
          {
            id: "evt-2",
            type: "status_change",
            timestamp: new Date(Date.now() - 43200000).toISOString(),
            description: `Status changed to ${complaint.status}`,
            actor: "Support Agent",
          },
        ];
        if (complaint.closed_at) {
          demo.push({
            id: "evt-3",
            type: "closed",
            timestamp: complaint.closed_at,
            description: "Complaint closed",
            actor: "Manager",
          });
        }
        setTimeline(demo);
        setTimelineLoading(false);
      }
    }

    loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [activeTab, complaint, id, apiAvailable]);

  // Fetch related customer and SRs when tab is selected
  useEffect(() => {
    if (activeTab !== "related" || !complaint) return;

    let cancelled = false;

    async function loadRelated() {
      setRelatedLoading(true);

      // Try API first
      if (apiAvailable) {
        try {
          const api = getApiClient(async () => null);
          const { data } = await api.get(`/complaints/${encodeURIComponent(id)}/related`);
          if (!cancelled) {
            setRelated({
              customer: data?.customer || null,
              srs: data?.service_requests || [],
            });
            setRelatedLoading(false);
            return;
          }
        } catch (e) {
          // Silent fallback
        }
      }

      // Demo fallback: lookup from demo stores
      if (!cancelled) {
        const customers = getDemoCustomers();
        const allSrs = getDemoServiceRequests();
        const cust = customers.find((c) => c.id === complaint.customer_id || c.name === complaint.customer);
        const srs = allSrs.filter(
          (sr) => sr.customer_id === complaint.customer_id || sr.customer === complaint.customer
        );
        setRelated({ customer: cust || null, srs });
        setRelatedLoading(false);
      }
    }

    loadRelated();
    return () => {
      cancelled = true;
    };
  }, [activeTab, complaint, id, apiAvailable]);

  // Fetch attachments when tab is selected
  useEffect(() => {
    if (activeTab !== "attachments" || !complaint) return;

    let cancelled = false;

    async function loadAttachments() {
      setAttachLoading(true);

      // Try API first
      if (apiAvailable) {
        try {
          const api = getApiClient(async () => null);
          const { data } = await api.get(`/complaints/${encodeURIComponent(id)}/attachments`);
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

      // Demo fallback: synthetic
      if (!cancelled) {
        setAttachments([
          {
            id: "att-1",
            name: "customer_correspondence.pdf",
            size: 156789,
            type: "application/pdf",
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
  }, [activeTab, complaint, id, apiAvailable]);

  // Handle Close action
  const handleClose = async () => {
    setConfirm({ open: false });

    try {
      if (!apiAvailable) {
        // Demo mode
        const updated = updateDemoComplaint(id, {
          status: "Closed",
          closed_at: new Date().toISOString(),
        });
        setComplaint((prev) => (prev ? { ...prev, ...updated } : updated));
        toast.push(`Complaint ${id} closed (demo)`, "success");
        eventBus.emit("complaint:closed", { id, status: "Closed" });
        return;
      }

      // API mode
      const api = getApiClient(async () => null);
      const data = await transitionComplaint(api, id);
      setComplaint((prev) => (prev ? { ...prev, ...data } : data));
      toast.push(`Complaint ${id} closed`, "success");
      eventBus.emit("complaint:closed", data || { id, status: "Closed" });
    } catch (e) {
      const msg = e?.response?.status ? `Server error (${e.response.status})` : e?.message || "Network error";
      toast.push(`Failed to close complaint ${id}: ${msg}`, "error");
    }
  };

  const isClosed = useMemo(() => {
    const s = String(complaint?.status || "").toLowerCase();
    return s === "closed";
  }, [complaint]);

  // Tab change handler
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  if (loading) {
    return (
      <section aria-labelledby="complaint-detail-title" aria-busy="true">
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

  if (error || !complaint) {
    return (
      <section aria-labelledby="complaint-detail-title">
        <h1 id="complaint-detail-title">Complaint Not Found</h1>
        <p style={{ color: "var(--color-error)" }}>{error || "Complaint not found"}</p>
        <Button onClick={() => navigate("/complaints")}>Back to List</Button>
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
            <dd style={{ margin: 0 }}>{complaint.id}</dd>
            <dt style={{ fontWeight: 700 }}>Title:</dt>
            <dd style={{ margin: 0 }}>{complaint.title}</dd>
            <dt style={{ fontWeight: 700 }}>Customer:</dt>
            <dd style={{ margin: 0 }}>{complaint.customer || "(no customer)"}</dd>
            <dt style={{ fontWeight: 700 }}>Priority:</dt>
            <dd style={{ margin: 0 }}>{complaint.priority || "N/A"}</dd>
            <dt style={{ fontWeight: 700 }}>Status:</dt>
            <dd style={{ margin: 0 }}>
              <StatusPill status={complaint.status} />
            </dd>
            <dt style={{ fontWeight: 700 }}>Escalation:</dt>
            <dd style={{ margin: 0 }}>{complaint.escalation || "N/A"}</dd>
            <dt style={{ fontWeight: 700 }}>Created:</dt>
            <dd style={{ margin: 0 }}>
              {complaint.created_at ? new Date(complaint.created_at).toLocaleString() : "N/A"}
            </dd>
            {complaint.closed_at && (
              <>
                <dt style={{ fontWeight: 700 }}>Closed:</dt>
                <dd style={{ margin: 0 }}>{new Date(complaint.closed_at).toLocaleString()}</dd>
              </>
            )}
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
                  {evt.actor && <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>by {evt.actor}</div>}
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
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Related Customer & Service Requests</h2>
          {relatedLoading ? (
            <p>Loading related items...</p>
          ) : (
            <>
              <section aria-labelledby="related-customer-title" style={{ marginBottom: 16 }}>
                <h3 id="related-customer-title" style={{ fontSize: 16, marginBottom: 8 }}>
                  Customer
                </h3>
                {related.customer ? (
                  <button
                    onClick={() => navigate(`/customers/${related.customer.id}`)}
                    style={{
                      background: "none",
                      border: "1px solid rgba(17,24,39,.12)",
                      borderRadius: 6,
                      padding: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                    aria-label={`View customer ${related.customer.name}`}
                  >
                    <div style={{ fontWeight: 600 }}>{related.customer.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{related.customer.email}</div>
                  </button>
                ) : (
                  <p style={{ opacity: 0.7 }}>No customer linked.</p>
                )}
              </section>
              <section aria-labelledby="related-srs-title">
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
    <section aria-labelledby="complaint-detail-title">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" onClick={() => navigate("/complaints")} aria-label="Back to complaints">
          ← Back
        </Button>
        <h1 id="complaint-detail-title" style={{ flex: 1, margin: 0 }}>
          {complaint.title || complaint.id}
        </h1>
        <StatusPill status={complaint.status} />
        {!isClosed && (
          <Button onClick={() => setConfirm({ open: true })} aria-label="Mark complaint as closed">
            Close
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} active={activeTab} onChange={handleTabChange} />

      {/* Confirm Dialog */}
      <Modal
        open={confirm.open}
        onClose={() => setConfirm({ open: false })}
        title="Mark Complaint as Closed?"
        footer={
          <>
            <button
              aria-label="Cancel"
              onClick={() => setConfirm({ open: false })}
              style={{
                border: "1px solid rgba(17,24,39,.12)",
                padding: "6px 10px",
                borderRadius: 6,
                background: "var(--color-surface)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              aria-label="Confirm mark as closed"
              onClick={handleClose}
              style={{
                border: "none",
                padding: "8px 12px",
                borderRadius: 6,
                background: "var(--color-primary)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Confirm
            </button>
          </>
        }
      >
        <p>Are you sure you want to mark "{complaint.title || complaint.id}" as Closed?</p>
      </Modal>
    </section>
  );
}
