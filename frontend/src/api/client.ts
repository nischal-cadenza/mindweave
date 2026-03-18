import type { ChatResponse, GraphDelta } from "../types";

const API_BASE = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function postChat(
  message: string,
  conversationId: string
): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
}

export async function getGraph(): Promise<GraphDelta> {
  return request<GraphDelta>("/graph");
}

export async function postExport(
  conversationId: string,
  commitToGithub = false
): Promise<{ markdown: string; github_url: string | null }> {
  return request("/export", {
    method: "POST",
    body: JSON.stringify({
      conversation_id: conversationId,
      commit_to_github: commitToGithub,
    }),
  });
}
