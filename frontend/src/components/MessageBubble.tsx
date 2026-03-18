import type { ChatMessage } from "../types";
import { FrameworkBadge } from "./FrameworkBadge";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-slate-700 text-slate-100 rounded-bl-md"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs opacity-60">{time}</span>
          {message.framework &&
            message.framework !== "socratic" &&
            message.role === "assistant" && (
              <FrameworkBadge framework={message.framework} />
            )}
        </div>
      </div>
    </div>
  );
}
