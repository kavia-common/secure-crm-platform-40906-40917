import React, { useMemo, useState } from "react";
import { useWebSocket } from "../services/ws";
import { Tabs } from "../components/primitives/MetaPrimitives";
import { Badge } from "../components/primitives/MetaPrimitives";

/**
 * PUBLIC_INTERFACE
 * Omni-Channel Inbox: real-time messages via websocket (placeholder path).
 */
export default function OmniChannelInbox() {
  const [items, setItems] = useState([]);

  // Single websocket hook instance
  const { lastMessage } = useWebSocket("/ws/inbox", async () => null);
  React.useEffect(() => {
    if (lastMessage && lastMessage.type === "message") {
      setItems((prev) => [lastMessage.payload, ...prev].slice(0, 100));
    }
  }, [lastMessage]);

  const [tab, setTab] = useState("all");
  const tabs = useMemo(
    () => [
      {
        label: (
          <>
            All <Badge tone="neutral">{items.length}</Badge>
          </>
        ),
        value: "all",
        content: <MessageList items={items} />,
      },
      {
        label: "Email",
        value: "email",
        content: <MessageList items={items.filter((x) => x.channel === "email")} />,
      },
      {
        label: "Chat",
        value: "chat",
        content: <MessageList items={items.filter((x) => x.channel === "chat")} />,
      },
      {
        label: "Social",
        value: "social",
        content: <MessageList items={items.filter((x) => x.channel === "social")} />,
      },
    ],
    [items]
  );

  return (
    <section aria-labelledby="omni-title">
      <h1 id="omni-title">Omni-Channel Inbox</h1>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
    </section>
  );
}

function MessageList({ items }) {
  if (!items?.length) return <p style={{ opacity: 0.7 }}>No messages</p>;
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
      {items.map((m, idx) => (
        <li key={m.id || idx} style={{ background: "var(--color-surface)", padding: 12, borderRadius: 10, boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <strong>{m.subject || "New message"}</strong>
            <span style={{ fontSize: 12, opacity: 0.7 }}>from {m.from || "Unknown"}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
              {new Date(m.ts || Date.now()).toLocaleString()}
            </span>
          </div>
          <div style={{ marginTop: 6 }}>{m.preview || m.text || ""}</div>
        </li>
      ))}
    </ul>
  );
}
