import { useCallback, useEffect, useRef, useState } from "react";
import { getGraph, getGraphStatus, postChat } from "../api/client";
import type { ChatMessage, GraphDelta, GraphStatus } from "../types";

function generateId() {
  return crypto.randomUUID();
}

export function useChat(onGraphDelta?: (delta: GraphDelta) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFramework, setActiveFramework] = useState<string | null>(null);
  const [graphStatus, setGraphStatus] = useState<GraphStatus | null>({
    state: "initializing",
    message: "MindWeave is preparing the knowledge graph.",
    model: null,
  });
  const conversationIdRef = useRef(generateId());

  useEffect(() => {
    let isCancelled = false;
    let retryTimer: number | null = null;

    const loadGraphStatus = async (attempt = 0) => {
      try {
        const status = await getGraphStatus();
        if (!isCancelled) {
          setGraphStatus(status);
        }
      } catch (err) {
        if (!isCancelled) {
          setGraphStatus({
            state: "initializing",
            message:
              err instanceof Error
                ? "Waiting for the backend to reconnect."
                : "Knowledge graph status is temporarily unavailable.",
            model: null,
          });

          const delay = Math.min(1000 * 2 ** attempt, 15000);
          retryTimer = window.setTimeout(() => {
            void loadGraphStatus(attempt + 1);
          }, delay);
        }
      }
    };

    void loadGraphStatus();

    return () => {
      isCancelled = true;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      framework: null,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await postChat(text, conversationIdRef.current);
      setActiveFramework(response.framework);
      setGraphStatus(response.graph_status);

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.reply,
        timestamp: new Date().toISOString(),
        framework: response.framework,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (
        onGraphDelta &&
        (response.graph_delta.nodes.length > 0 || response.graph_delta.edges.length > 0)
      ) {
        onGraphDelta(response.graph_delta);
      } else if (onGraphDelta && response.graph_status.state === "ready") {
        void getGraph(conversationIdRef.current)
          .then((snapshot) => {
            onGraphDelta(snapshot);
          })
          .catch((graphErr) => {
            setGraphStatus({
              state: "degraded",
              message:
                graphErr instanceof Error ? graphErr.message : "Graph sync failed",
              model: response.graph_status.model,
            });
          });
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
        timestamp: new Date().toISOString(),
        framework: null,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [onGraphDelta]);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setActiveFramework(null);
    conversationIdRef.current = generateId();
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    activeFramework,
    graphStatus,
    conversationId: conversationIdRef.current,
    resetConversation,
  };
}
