import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiClient, transitionComplaint } from "../services/apiClient";
import {
  getDemoComplaints,
  subscribeDemoComplaints,
  updateDemoComplaint,
} from "../services/demoStore";
import { eventBus } from "../services/ws";
import { useToast } from "../components/feedback/Toast";
import { Button } from "../components/primitives/Button";
import { StatusPill } from "../components/primitives/MetaPrimitives";
import { Modal } from "../components/overlays/Overlays";

/**
 * PUBLIC_INTERFACE
 * ComplaintDetailView: displays a single complaint with tabs for Summary, Timeline/Comments, Related.
 * - Fetches from API GET /complaints/{id} if available, falls back to demoStore on 404.
 * - Shows header with title/status and action button (Close if not closed).
 * - Tabs: Summary (details), Timeline (placeholder), Related (attachments placeholder).
 * - Listens to eventBus for real-time updates (complaint:closed).
 * - Accessible layout with landmarks and aria labels.
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

  // Fetch complaint from API or demo store
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (dummyAuth) {
        // Demo mode
        const all = getDemoComplaints();
        const found = all.find((c) => c.id === id);
        if (!cancelled) {
          if (found) {
            setComplaint(found);
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
            customer: data.customer || data.customer_name || data.customer_id || "",
            status: data.status || "New",
            escalation: data.escalation || data.level || "-",
            priority: data.priority || data.severity || "",
            created_at: data.created_at || data.createdAt || "",
            closed_at: data.closed_at || data.closedAt || null,
          };
          setComplaint(normalized);
          setLoading(false);
        }
      } catch (e) {
        const status = e?.response?.status;
        if (status === 404) {
          // Silent fallback to demo
          const all = getDemoComplaints();
          const found = all.find((c) => c.id === id);
          if (!cancelled) {
            if (found) {
              setComplaint(found);
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
    if (!dummyAuth) return;
    const unsub = subscribeDemoComplaints(() => {
      const all = getDemoComplaints();
      const found = all.find((c) => c.id === id);
      if (found) setComplaint(found);
    });
    return unsub;
  }, [id, dummyAuth]);

  // Listen to eventBus for real-time updates
  useEffect(() => {
    const unsub = eventBus.on("complaint:closed", (payload) => {
      if (payload?.id === id) {
        setComplaint((prev) => (prev ? { ...prev, status: "Closed", closed_at: payload.closed_at || new Date().toISOString() } : prev));
        toast.push(`Complaint ${id} closed`, "success");
      }
    });
    return unsub;
  }, [id, toast]);

  // Handle Close action
  const handleClose = async () => {
    setConfirm({ open: false });

    try {
      if (dummyAuth) {
        const updated = updateDemoComplaint(id, {
          status: "Closed",
          closed_at: new Date().toISOString(),
        });
        setComplaint((prev) => (prev ? { ...prev, ...updated } : updated));
        toast.push(`Complaint ${id} closed (demo)`, "success");
        eventBus.emit("complaint:closed", { id, status: "Closed" });
        return;
      }

      const api = getApiClient(async () => null);
      const data = await transitionComplaint(api, id);
      setComplaint((prev) => (prev ? { ...prev, ...data } : data));
      toast.push(`Complaint ${id} closed`, "success");
      eventBus.emit("complaint:closed", data || { id, status: "Closed" });
    } catch (e) {
      const msg = e?.response?.status ? `Server error (${e.response.status})` : (e?.message || "Network error");
      toast.push(`Failed to close complaint ${id}: ${msg}`, "error");
    }
  };

  const isClosed = useMemo(() => {
    const s = String(complaint?.status || "").toLowerCase();
    return s === "closed";
  }, [complaint]);

  if (loading) {
    return (
      <section aria-labelledby="complaint-detail-title" aria-busy="true">
        <p>Loading complaint...</p>
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
      <nav aria-label="Complaint detail tabs" style={{ borderBottom: "2px solid var(--color-secondary)", marginBottom: 16 }}>
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
              <dd style={{ margin: 0 }}>{complaint.id}</dd>
              <dt style={{ fontWeight: 700 }}>Customer:</dt>
              <dd style={{ margin: 0 }}>{complaint.customer || "(no customer)"}</dd>
              <dt style={{ fontWeight: 700 }}>Priority:</dt>
              <dd style={{ margin: 0 }}>{complaint.priority || "N/A"}</dd>
              <dt style={{ fontWeight: 700 }}>Status:</dt>
              <dd style={{ margin: 0 }}>{complaint.status}</dd>
              <dt style={{ fontWeight: 700 }}>Escalation:</dt>
              <dd style={{ margin: 0 }}>{complaint.escalation || "N/A"}</dd>
              <dt style={{ fontWeight: 700 }}>Created:</dt>
              <dd style={{ margin: 0 }}>{complaint.created_at || "N/A"}</dd>
              {complaint.closed_at && (
                <>
                  <dt style={{ fontWeight: 700 }}>Closed:</dt>
                  <dd style={{ margin: 0 }}>{complaint.closed_at}</dd>
                </>
              )}
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
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Related / Attachments</h2>
            <p style={{ color: "var(--color-text)", opacity: 0.7 }}>No attachments found.</p>
          </div>
        )}
      </div>

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
              style={{ border: "1px solid rgba(17,24,39,.12)", padding: "6px 10px", borderRadius: 6, background: "var(--color-surface)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              aria-label="Confirm mark as closed"
              onClick={handleClose}
              style={{ border: "none", padding: "8px 12px", borderRadius: 6, background: "var(--color-primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
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
