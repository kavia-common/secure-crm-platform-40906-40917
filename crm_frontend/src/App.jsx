import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { createApiClient, getWsUrl } from "./lib/api";

// PUBLIC_INTERFACE
/**
 * Root application shell with sidebar layout and an optional health check call.
 */
export default function App() {
  const api = createApiClient();
  const [health, setHealth] = useState({ ok: null, status: null, error: null });
  const [wsUrl, setWsUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    api
      .health()
      .then((res) => {
        if (!mounted) return;
        setHealth({
          ok: !!res.ok,
          status: res.status ?? null,
          error: res.ok ? null : res.error || (typeof res.data === "string" ? res.data : null)
        });
      })
      .catch((e) => {
        if (!mounted) return;
        setHealth({ ok: false, status: null, error: e?.message || "Network error" });
      });

    setWsUrl(getWsUrl());
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="h-full bg-background">
      <div className="flex h-full">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Topbar />
          <section className="p-6 bg-gradient-brand flex-1 overflow-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            >
              <div className="bg-surface rounded-lg shadow-soft border border-amber-200/70 p-4">
                <h2 className="font-semibold text-primary mb-2">Environment</h2>
                <div className="text-sm">
                  <div>
                    API_BASE_URL:{" "}
                    <code className="text-neutral-700">{api.baseUrl || "(same origin)"}</code>
                  </div>
                  <div>
                    WS_URL: <code className="text-neutral-700">{wsUrl || "(unset)"}</code>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-lg shadow-soft border border-amber-200/70 p-4">
                <h2 className="font-semibold text-primary mb-2">Backend Health</h2>
                {health.ok === null && <p className="text-sm text-neutral-600">Checking...</p>}
                {health.ok === true && (
                  <p className="text-sm text-green-700">
                    Healthy {health.status ? `(status ${health.status})` : ""}
                  </p>
                )}
                {health.ok === false && (
                  <p className="text-sm text-red-700">
                    Not reachable {health.status ? `(status ${health.status})` : ""}{" "}
                    {health.error ? `- ${health.error}` : ""}
                  </p>
                )}
                <p className="mt-2 text-xs text-neutral-500">
                  This check queries /health on the configured backend.
                </p>
              </div>

              <div className="bg-surface rounded-lg shadow-soft border border-amber-200/70 p-4">
                <h2 className="font-semibold text-primary mb-2">Modules</h2>
                <ul className="text-sm list-disc list-inside text-neutral-700">
                  <li>Customer 360</li>
                  <li>Service Requests & Complaints</li>
                  <li>Workflow Automation</li>
                  <li>Omni-channel Interaction</li>
                  <li>Reports & Analytics</li>
                  <li>Audit & Compliance</li>
                </ul>
              </div>
            </motion.div>
          </section>
        </main>
      </div>
    </div>
  );
}
