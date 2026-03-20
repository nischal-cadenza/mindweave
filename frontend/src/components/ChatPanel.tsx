import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";
import { ExportButton } from "./ExportButton";
import { FrameworkBadge } from "./FrameworkBadge";
import { MessageBubble } from "./MessageBubble";

const STARTER_PROMPTS = [
  "Help me map the people, tools, and risks involved in launching MindWeave.",
  "Compare React, FastAPI, Neo4j, and OpenRouter for this product and show the trade-offs.",
  "Break down my app into the key decisions, dependencies, and failure modes.",
];

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  activeFramework: string | null;
  conversationId: string;
  onSend: (text: string) => void;
  onReset: () => void;
}

export function ChatPanel({
  messages,
  isLoading,
  activeFramework,
  conversationId,
  onSend,
  onReset,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    onSend(text);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white">MindWeave</h1>
          {activeFramework && <FrameworkBadge framework={activeFramework} />}
        </div>
        <div className="flex items-center gap-2">
          <ExportButton conversationId={conversationId} />
          <button
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-xl text-center">
              <p className="text-sm font-medium text-slate-200">
                Think through a real problem and MindWeave will map the entities and relationships live.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Conversations about people, tools, projects, trade-offs, risks, and timelines produce the richest graph.
              </p>
              <div className="mt-6 space-y-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-slate-700"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a person, project, tool, decision, trade-off, or risk..."
            className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
