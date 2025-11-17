import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiClient, transitionServiceRequest } from "../services/apiClient";
import {
  getDemoServiceRequests,
  subscribeDemoServiceRequests,
  updateDemoServiceRequest,
} from "../services/demoStore";
import { eventBus } from "../services/ws";
import { useToast } from "../components/feedback/Toast";
import { Button } from "../components/primitives/Button";
import { StatusPill } from "../components/primitives/MetaPrimitives";
import { Modal } from "../components/overlays/Overlays";

/**
 * PUBLIC_INTERFACE
 * ServiceRequestDetailView: displays a single service request with tabs for Summary, Timeline/Comments, Related.
 * - Fetches from API GET /service-requests/{id} if available, falls back to demoStore on 404.
 * - Shows header with title/status and action button (Resolve if not resolved).
 * - Tabs: Summary (details), Timeline (placeholder), Related (placeholder).
 * - Listens to eventBus for real-time updates (sr:resolved).
 * - Accessible layout with landmarks and aria labels.
 */
export default function ServiceRequestDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dummyAuth } = useAuth();
  const toast = useToast();

  const [sr, setSr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [confirm, setConfirm] = useState({ open: false });

  // Fetch SR from API or demo store
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (dummyAuth) {
        // Demo mode: find in demoStore
        const all = getDemoServiceRequests();
        const found = all.find((s) => s.id === id);
        if (!cancelled) {
          if (found) {
            setSr(found);
          } else {
            setError("Service request not found");
          }
          setLoading(false);
        }
        return;
      }

      // API mode: try GET /service-requests/{id}
      try {
        const api = getApiClient(async () => null);
        const { data } = await api.get(`/service-requests/${encodeURIComponent(id)}`);
        if (!cancelled) {
          // Normalize server response
          const normalized = {
            id: data.id || data.sr_id || id,
            title: data.title || data.type || "(no title)",
            customer: data.customer || data.customer_name || data.customer_id || "",
            status: data.status || "New",
            priority: data.priority || "",
            description: data.description || "",
            created_at: data.created_at || data.createdAt || "",
            due_date: data.due_date || data.dueDate || null,
            resolved_at: data.resolved_at || data.resolvedAt || null,
          };
          setSr(normalized);
          setLoading(false);
        }
      } catch (e) {
        const status = e?.response?.status;
        if (status === 404) {
          // Silent fallback to demo
          const all = getDemoServiceRequests();
          const found = all.find((s) => s.id === id);
          if (!cancelled) {
            if (found) {
              setSr(found);
            } else {
              setError("Service request not found");
            }
            setLoading(false);
          }
        } else {
          if (!cancelled) {
            setError(e?.message || "Failed to load service request");
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
    const unsub = subscribeDemoServiceRequests(() => {
      const all = getDemoServiceRequests();
      const found = all.find((s) => s.id === id);
      if (found) setSr(found);
    });
    return unsub;
  }, [id, dummyAuth]);

  // Listen to eventBus for real-time updates
  useEffect(() => {
    const unsub = eventBus.on("sr:resolved", (payload) => {
      if (payload?.id === id) {
        setSr((prev) => (prev ? { ...prev, status: "Resolved", resolved_at: payload.resolved_at || new Date().toISOString() } : prev));
        toast.push(`Service Request ${id} resolved`, "success");
      }
    });
    return unsub;
  }, [id, toast]);

  // Handle Resolve action
  const handleResolve = async () => {
    setConfirm({ open: false });

    try {
      if (dummyAuth) {
        const updated = updateDemoServiceRequest(id, {
          status: "Resolved",
          resolved_at: new Date().toISOString(),
        });
        setSr((prev) => (prev ? { ...prev, ...updated } : updated));
        toast.push(`Service Request ${id} resolved (demo)`, "success");
        eventBus.emit("sr:resolved", { id, status: "Resolved" });
        return;
      }

      const api = getApiClient(async () => null);
      const data = await transitionServiceRequest(api, id, "resolved");
      setSr((prev) => (prev ? { ...prev, ...data } : data));
      toast.push(`Service Request ${id} resolved`, "success");
      eventBus.emit("sr:resolved", data || { id, status: "Resolved" });
    } catch (e) {
      const msg = e?.response?.status ? `Server error (${e.response.status})` : (e?.message || "Network error");
      toast.push(`Failed to resolve SR ${id}: ${msg}`, "error");
    }
  };

  const isResolved = useMemo(() => {
    const s = String(sr?.status || "").toLowerCase();
    return s === "resolved" || s === "closed";
  }, [sr]);

  if (loading) {
    return (
      <section aria-labelledby="sr-detail-title" aria-busy="true">
        <p>Loading service request...</p>
      </section>
    );
  }

  if (error || !sr) {
    return (
      <section aria-labelledby="sr-detail-title">
        <h1 id="sr-detail-title">Service Request Not Found</h1>
        <p style={{ color: "var(--color-error)" }}>{error || "Service request not found"}</p>
        <Button onClick={() => navigate("/service-requests")}>Back to List</Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="sr-detail-title">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" onClick={() => navigate("/service-requests")} aria-label="Back to service requests">
          ← Back
        </Button>
        <h1 id="sr-detail-title" style={{ flex: 1, margin: 0 }}>
          {sr.title || sr.id}
        </h1>
        <StatusPill status={sr.status} />
        {!isResolved && (
          <Button onClick={() => setConfirm({ open: true })} aria-label="Mark service request as resolved">
            Resolve
          </Button>
        )}
      </div>

      {/* Tabs */}
      <nav aria-label="Service request detail tabs" style={{ borderBottom: "2px solid var(--color-secondary)", marginBottom: 16 }}>
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
              <dd style={{ margin: 0 }}>{sr.id}</dd>
              <dt style={{ fontWeight: 700 }}>Customer:</dt>
              <dd style={{ margin: 0 }}>{sr.customer || "(no customer)"}</dd>
              <dt style={{ fontWeight: 700 }}>Priority:</dt>
              <dd style={{ margin: 0 }}>{sr.priority || "N/A"}</dd>
              <dt style={{ fontWeight: 700 }}>Status:</dt>
              <dd style={{ margin: 0 }}>{sr.status}</dd>
              <dt style={{ fontWeight: 700 }}>Created:</dt>
              <dd style={{ margin: 0 }}>{sr.created_at || "N/A"}</dd>
              {sr.due_date && (
                <>
                  <dt style={{ fontWeight: 700 }}>Due Date:</dt>
                  <dd style={{ margin: 0 }}>{sr.due_date}</dd>
                </>
              )}
              {sr.resolved_at && (
                <>
                  <dt style={{ fontWeight: 700 }}>Resolved:</dt>
                  <dd style={{ margin: 0 }}>{sr.resolved_at}</dd>
                </>
              )}
              <dt style={{ fontWeight: 700 }}>Description:</dt>
              <dd style={{ margin: 0 }}>{sr.description || "(no description)"}</dd>
            </dl>
          </div>
        )}

        {activeTab === "timeline" && (
          <div style={{ background: "var(--color-surface)", padding: 16, borderRadius: 8 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Timeline / Comments</h2>
            <p style={{ color: "var(--color-text)", opacity: 0.7 }}>No comments available yet.</p>
          </div>
        )}

        {activeTab === "related" && (
          <div style={{ background: "var(--color-surface)", padding: 16, borderRadius: 8 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Related Items</h2>
            <p style={{ color: "var(--color-text)", opacity: 0.7 }}>No related items found.</p>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Modal
        open={confirm.open}
        onClose={() => setConfirm({ open: false })}
        title="Mark as Resolved?"
        footer={
          <>
            <button
              aria-label="Cancel"
              onClick={() => setConfirm({ open: false })}
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
        <p>Are you sure you want to mark "{sr.title || sr.id}" as Resolved?</p>
      </Modal>
    </section>
  );
}
