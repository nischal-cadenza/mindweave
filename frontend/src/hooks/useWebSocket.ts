import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphConnectionState, GraphDelta } from "../types";

const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;

export function useWebSocket(
  conversationId: string,
  onDelta: (delta: GraphDelta) => void
) {
  const [connectionState, setConnectionState] =
    useState<GraphConnectionState>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const hasConnectedOnceRef = useRef(false);
  const onDeltaRef = useRef(onDelta);
  const conversationIdRef = useRef(conversationId);
  onDeltaRef.current = onDelta;
  conversationIdRef.current = conversationId;

  const connect = useCallback(() => {
    setConnectionState(hasConnectedOnceRef.current ? "reconnecting" : "connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      hasConnectedOnceRef.current = true;
      setConnectionState("live");
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as {
          type?: string;
          conversation_id?: string;
          data?: GraphDelta;
        };
        if (
          msg.type === "graph_delta" &&
          msg.data &&
          (!msg.conversation_id || msg.conversation_id === conversationIdRef.current)
        ) {
          onDeltaRef.current(msg.data);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnectionState(hasConnectedOnceRef.current ? "reconnecting" : "connecting");
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
      retriesRef.current++;
      setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected: connectionState === "live", connectionState };
}
