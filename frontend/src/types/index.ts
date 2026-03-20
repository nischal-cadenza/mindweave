export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  framework: string | null;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, string>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  properties: Record<string, string>;
}

export interface GraphDelta {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphStatus {
  state: "initializing" | "ready" | "degraded" | "disabled";
  message: string | null;
  model: string | null;
}

export type GraphConnectionState = "connecting" | "live" | "reconnecting";

export interface ChatResponse {
  reply: string;
  framework: string | null;
  graph_delta: GraphDelta;
  graph_status: GraphStatus;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}
