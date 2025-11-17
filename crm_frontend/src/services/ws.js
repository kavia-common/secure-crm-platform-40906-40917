import { useEffect, useRef, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * useWebSocket provides a resilient websocket connection with exponential backoff, token handling.
 * If REACT_APP_FEATURE_ENABLE_WS=false, a mock timer emits sample messages to avoid runtime errors.
 *
 * Params:
 * - path: string path such as "/ws/notifications"
 * - getToken: async function returning token or null
 *
 * Returns: { status, lastMessage, send }
 */
export function useWebSocket(path, getToken) {
  const [status, setStatus] = useState("idle");
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const mockTimerRef = useRef(null);

  useEffect(() => {
    const enableWs = String(process.env.REACT_APP_FEATURE_ENABLE_WS || "true") === "true";
    let cancelled = false;

    async function startMock() {
      setStatus("mock");
      // Emit demo messages on intervals for inbox/metrics
      mockTimerRef.current = setInterval(() => {
        if (cancelled) return;
        if (path.includes("inbox")) {
          const channels = ["email", "chat", "social"];
          const ch = channels[Math.floor(Math.random() * channels.length)];
          setLastMessage({
            type: "message",
            payload: {
              id: Math.random().toString(36).slice(2),
              channel: ch,
              subject: `New ${ch} message`,
              from: `${ch}@example.com`,
              preview: "Lorem ipsum dolor sit amet…",
              ts: Date.now(),
            },
          });
        } else if (path.includes("metrics")) {
          setLastMessage({
            type: "kpi_update",
            payload: [
              { name: "Mon", value: Math.floor(Math.random() * 25) + 5 },
              { name: "Tue", value: Math.floor(Math.random() * 25) + 5 },
              { name: "Wed", value: Math.floor(Math.random() * 25) + 5 },
              { name: "Thu", value: Math.floor(Math.random() * 25) + 5 },
              { name: "Fri", value: Math.floor(Math.random() * 25) + 5 },
            ],
          });
        } else {
          setLastMessage({ type: "tick", payload: Date.now() });
        }
      }, 3000);
    }

    const connect = async () => {
      if (!enableWs) {
        await startMock();
        return;
      }

      const token = typeof getToken === "function" ? await getToken() : null;
      const base = process.env.REACT_APP_WS_URL || "";
      const url = `${base}${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

      setStatus("connecting");
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          retryRef.current = 0;
          if (!cancelled) setStatus("open");
        };
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            setLastMessage(data);
          } catch {
            setLastMessage(e.data);
          }
        };
        ws.onclose = () => {
          if (cancelled) return;
          setStatus("closed");
          const delay = Math.min(30000, 1000 * 2 ** retryRef.current++);
          setTimeout(connect, delay);
        };
        ws.onerror = () => {
          // Let onclose handle retries
        };
      } catch {
        // If browser blocks or URL invalid, fallback to mock
        await startMock();
      }
    };

    connect();
    return () => {
      cancelled = true;
      if (wsRef.current && wsRef.current.readyState < 2) {
        wsRef.current.close();
      }
      if (mockTimerRef.current) {
        clearInterval(mockTimerRef.current);
      }
    };
  }, [path, getToken]);

  return { status, lastMessage, send: (msg) => wsRef.current?.send?.(msg) };
}
