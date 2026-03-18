import { useCallback, useRef, useState } from "react";
import { postChat } from "../api/client";
import type { ChatMessage } from "../types";

function generateId() {
  return crypto.randomUUID();
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFramework, setActiveFramework] = useState<string | null>(null);
  const conversationIdRef = useRef(generateId());

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

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.reply,
        timestamp: new Date().toISOString(),
        framework: response.framework,
      };
      setMessages((prev) => [...prev, assistantMsg]);
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
  }, []);

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
    conversationId: conversationIdRef.current,
    resetConversation,
  };
}
