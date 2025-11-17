import { useEffect, useRef, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * useWebSocket provides a resilient websocket connection with exponential backoff, token handling.
 */
export function useWebSocket(path, getToken) {
  const [status, setStatus] = useState("idle");
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const retryRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const connect = async () => {
      const token = typeof getToken === "function" ? await getToken() : null;
      const base = process.env.REACT_APP_WS_URL || "";
      const url = `${base}${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

      setStatus("connecting");
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
    };

    connect();
    return () => {
      cancelled = true;
      if (wsRef.current && wsRef.current.readyState < 2) {
        wsRef.current.close();
      }
    };
  }, [path, getToken]);

  return { status, lastMessage, send: (msg) => wsRef.current?.send(msg) };
}
