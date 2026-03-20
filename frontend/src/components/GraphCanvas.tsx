import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type {
  GraphConnectionState,
  GraphData,
  GraphEdge,
  GraphNode,
  GraphStatus,
} from "../types";

const NODE_COLORS: Record<string, string> = {
  Person: "#38bdf8",
  Concept: "#34d399",
  Project: "#fb923c",
  Tool: "#c084fc",
  Event: "#f87171",
};

const DEFAULT_COLOR = "#94a3b8";
const CLUSTER_LABEL_ZOOM = 1.4;
const ALL_LABEL_ZOOM = 2.2;
const SEARCH_LIMIT = 6;
const LEGEND_TYPES = ["Person", "Concept", "Project", "Tool", "Event"];

interface GraphCanvasProps {
  graphData: GraphData;
  graphStatus: GraphStatus | null;
  connectionState: GraphConnectionState;
}

interface ForceNode extends GraphNode {
  x?: number;
  y?: number;
  val?: number;
}

interface ForceLink extends Omit<GraphEdge, "source" | "target"> {
  source: string | ForceNode;
  target: string | ForceNode;
}

interface GraphBanner {
  message: string;
  tone: "info" | "warning";
}

function toNodeId(value: string | number | ForceNode | undefined): string {
  if (typeof value === "object" && value !== null) {
    return String(value.id);
  }

  return String(value ?? "");
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const doubled =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const value = Number.parseInt(doubled, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function getNodeValue(degree: number): number {
  return 2.4 + Math.min(degree, 18) * 0.65;
}

function getNodeRadius(node: ForceNode): number {
  return 4 + ((node.val ?? 2.4) * 0.9);
}

function getEmptyState(
  status: GraphStatus | null,
  connectionState: GraphConnectionState
) {
  if (connectionState === "reconnecting") {
    return {
      title: "Backend reconnecting",
      body: "The API and live graph stream are rejoining. Your conversation map will resume automatically.",
    };
  }

  if (connectionState === "connecting") {
    return {
      title: "Preparing the conversation map",
      body: "MindWeave is checking the backend and waiting for the knowledge graph to come online.",
    };
  }

  if (!status || status.state === "initializing") {
    return {
      title: "Preparing the conversation map",
      body: "MindWeave is starting the graph pipeline for this conversation.",
    };
  }

  if (status.state === "degraded" || status.state === "disabled") {
    return {
      title: "Graph temporarily degraded",
      body:
        status.message ??
        "The graph extractor hit a temporary issue. Chat still works, and the map will recover when the backend does.",
    };
  }

  return {
    title: "Waiting for graphable facts",
    body:
      "Ask about people, tools, projects, decisions, risks, timelines, or cause-and-effect relationships to make the graph appear.",
  };
}

function getBanner(
  status: GraphStatus | null,
  connectionState: GraphConnectionState
): GraphBanner | null {
  if (connectionState === "reconnecting") {
    return {
      tone: "info",
      message: "Backend reconnecting. Live graph updates will resume automatically.",
    };
  }

  if (connectionState === "connecting") {
    return {
      tone: "info",
      message: "Connecting to the backend. Graph updates will appear once the API is ready.",
    };
  }

  if (status?.state === "degraded" || status?.state === "disabled") {
    return {
      tone: "warning",
      message:
        status.message ??
        "Graph temporarily degraded. Chat still works while the graph pipeline recovers.",
    };
  }

  return null;
}

export function GraphCanvas({
  graphData,
  graphStatus,
  connectionState,
}: GraphCanvasProps) {
  const fgRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hasUserMovedCamera, setHasUserMovedCamera] = useState(false);

  const previousNodeCountRef = useRef(0);
  const pendingAutoFitRef = useRef(false);
  const programmaticCameraRef = useRef(false);
  const cameraTimerRef = useRef<number | null>(null);

  const {
    degreeById,
    adjacencyById,
    incomingById,
    outgoingById,
    topNodeIds,
    nodeLookup,
  } = useMemo(() => {
    const degree = new Map<string, number>();
    const adjacency = new Map<string, Set<string>>();
    const incoming = new Map<string, GraphEdge[]>();
    const outgoing = new Map<string, GraphEdge[]>();
    const nodeById = new Map<string, GraphNode>();

    for (const node of graphData.nodes) {
      degree.set(node.id, 0);
      adjacency.set(node.id, new Set());
      incoming.set(node.id, []);
      outgoing.set(node.id, []);
      nodeById.set(node.id, node);
    }

    for (const edge of graphData.links) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
      outgoing.get(edge.source)?.push(edge);
      incoming.get(edge.target)?.push(edge);
    }

    const highestDegreeIds = [...degree.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([nodeId]) => nodeId);

    return {
      degreeById: degree,
      adjacencyById: adjacency,
      incomingById: incoming,
      outgoingById: outgoing,
      topNodeIds: highestDegreeIds,
      nodeLookup: nodeById,
    };
  }, [graphData]);

  const forceGraphData = useMemo(
    () => ({
      nodes: graphData.nodes.map((node) => ({
        ...node,
        val: getNodeValue(degreeById.get(node.id) ?? 0),
      })) as ForceNode[],
      links: graphData.links.map((link) => ({ ...link })) as ForceLink[],
    }),
    [degreeById, graphData]
  );

  const forceNodeLookup = useMemo(() => {
    return new Map(forceGraphData.nodes.map((node) => [node.id, node]));
  }, [forceGraphData.nodes]);

  const selectedNode = selectedNodeId ? nodeLookup.get(selectedNodeId) ?? null : null;
  const selectedForceNode = selectedNodeId
    ? forceNodeLookup.get(selectedNodeId) ?? null
    : null;

  const selectedNeighborhood = useMemo(() => {
    if (!selectedNodeId) {
      return null;
    }

    return new Set([selectedNodeId, ...(adjacencyById.get(selectedNodeId) ?? [])]);
  }, [adjacencyById, selectedNodeId]);

  const highlightedLabelIds = useMemo(() => {
    const visible = new Set<string>();

    for (const nodeId of [selectedNodeId, hoveredNodeId]) {
      if (!nodeId) {
        continue;
      }

      visible.add(nodeId);
      adjacencyById.get(nodeId)?.forEach((neighborId) => visible.add(neighborId));
    }

    if (zoomLevel >= CLUSTER_LABEL_ZOOM) {
      topNodeIds.forEach((nodeId) => visible.add(nodeId));
    }

    if (zoomLevel >= ALL_LABEL_ZOOM) {
      graphData.nodes.forEach((node) => visible.add(node.id));
    }

    return visible;
  }, [adjacencyById, graphData.nodes, hoveredNodeId, selectedNodeId, topNodeIds, zoomLevel]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return [...graphData.nodes]
      .filter((node) => node.label.toLowerCase().includes(query))
      .sort((left, right) => {
        const leftStarts = left.label.toLowerCase().startsWith(query) ? 0 : 1;
        const rightStarts = right.label.toLowerCase().startsWith(query) ? 0 : 1;

        if (leftStarts !== rightStarts) {
          return leftStarts - rightStarts;
        }

        const degreeDelta =
          (degreeById.get(right.id) ?? 0) - (degreeById.get(left.id) ?? 0);
        if (degreeDelta !== 0) {
          return degreeDelta;
        }

        return left.label.localeCompare(right.label);
      })
      .slice(0, SEARCH_LIMIT);
  }, [degreeById, graphData.nodes, searchQuery]);

  const banner = useMemo(
    () => getBanner(graphStatus, connectionState),
    [connectionState, graphStatus]
  );
  const emptyState = useMemo(
    () => getEmptyState(graphStatus, connectionState),
    [connectionState, graphStatus]
  );

  const clearCameraTimer = useCallback(() => {
    if (cameraTimerRef.current !== null) {
      window.clearTimeout(cameraTimerRef.current);
      cameraTimerRef.current = null;
    }
  }, []);

  const markProgrammaticCamera = useCallback(
    (durationMs = 900) => {
      clearCameraTimer();
      programmaticCameraRef.current = true;
      cameraTimerRef.current = window.setTimeout(() => {
        programmaticCameraRef.current = false;
        cameraTimerRef.current = null;
      }, durationMs);
    },
    [clearCameraTimer]
  );

  const runZoomToFit = useCallback(
    (durationMs = 700) => {
      if (!fgRef.current || graphData.nodes.length === 0) {
        return;
      }

      markProgrammaticCamera(durationMs + 200);
      fgRef.current.zoomToFit(durationMs, 100);
      setHasUserMovedCamera(false);
    },
    [graphData.nodes.length, markProgrammaticCamera]
  );

  const focusNode = useCallback(
    (nodeId: string) => {
      const node = forceNodeLookup.get(nodeId);
      setSelectedNodeId(nodeId);
      setHasUserMovedCamera(true);

      if (
        node &&
        typeof node.x === "number" &&
        typeof node.y === "number" &&
        fgRef.current
      ) {
        markProgrammaticCamera(900);
        fgRef.current.centerAt(node.x, node.y, 700);
        fgRef.current.zoom(Math.max(ALL_LABEL_ZOOM, zoomLevel), 700);
      }
    },
    [forceNodeLookup, markProgrammaticCamera, zoomLevel]
  );

  useEffect(() => {
    if (graphData.nodes.length === 0) {
      setSelectedNodeId(null);
      setHoveredNodeId(null);
      setSearchQuery("");
      setZoomLevel(1);
      setHasUserMovedCamera(false);
      previousNodeCountRef.current = 0;
      pendingAutoFitRef.current = false;
      return;
    }

    if (previousNodeCountRef.current === 0) {
      pendingAutoFitRef.current = true;
    }

    previousNodeCountRef.current = graphData.nodes.length;
  }, [graphData.nodes.length]);

  useEffect(() => {
    if (selectedNodeId && !nodeLookup.has(selectedNodeId)) {
      setSelectedNodeId(null);
    }

    if (hoveredNodeId && !nodeLookup.has(hoveredNodeId)) {
      setHoveredNodeId(null);
    }
  }, [hoveredNodeId, nodeLookup, selectedNodeId]);

  useEffect(() => {
    return () => {
      clearCameraTimer();
    };
  }, [clearCameraTimer]);

  const nodeCanvasObject = useCallback(
    (node: ForceNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const nodeId = node.id;
      if (!highlightedLabelIds.has(nodeId)) {
        return;
      }

      const label = node.label || node.id;
      const fontSize = Math.max(12 / globalScale, 4.5);
      const nodeColor = NODE_COLORS[node.type] || DEFAULT_COLOR;
      const isSelected = nodeId === selectedNodeId;
      const isHovered = nodeId === hoveredNodeId;
      const radius = getNodeRadius(node);
      const paddingX = 8 / globalScale;
      const paddingY = 4 / globalScale;

      ctx.save();
      ctx.font = `600 ${fontSize}px sans-serif`;

      const textWidth = ctx.measureText(label).width;
      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = fontSize + paddingY * 2;
      const labelX = (node.x ?? 0) - boxWidth / 2;
      const labelY = (node.y ?? 0) + radius + 6 / globalScale;

      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, radius + 3 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = isSelected
          ? withAlpha(nodeColor, 0.95)
          : "rgba(248, 250, 252, 0.9)";
        ctx.lineWidth = Math.max(2 / globalScale, 0.8);
        ctx.stroke();
      }

      drawRoundedRect(
        ctx,
        labelX,
        labelY,
        boxWidth,
        boxHeight,
        7 / globalScale
      );
      ctx.fillStyle = isSelected
        ? withAlpha(nodeColor, 0.92)
        : isHovered
          ? "rgba(30, 41, 59, 0.94)"
          : "rgba(15, 23, 42, 0.82)";
      ctx.fill();

      ctx.strokeStyle = isSelected
        ? withAlpha(nodeColor, 1)
        : "rgba(148, 163, 184, 0.28)";
      ctx.lineWidth = Math.max(1 / globalScale, 0.5);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(label, node.x ?? 0, labelY + boxHeight / 2);
      ctx.restore();
    },
    [highlightedLabelIds, hoveredNodeId, selectedNodeId]
  );

  const selectedNodeIncoming = selectedNodeId
    ? (incomingById.get(selectedNodeId) ?? []).map((edge) => ({
        edge,
        otherNode: nodeLookup.get(edge.source),
      }))
    : [];

  const selectedNodeOutgoing = selectedNodeId
    ? (outgoingById.get(selectedNodeId) ?? []).map((edge) => ({
        edge,
        otherNode: nodeLookup.get(edge.target),
      }))
    : [];

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#081121]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(192,132,252,0.14),transparent_30%)]" />

      <div className="absolute left-4 right-4 top-4 z-10 rounded-3xl border border-slate-700/70 bg-slate-900/90 px-4 py-4 shadow-2xl shadow-slate-950/35 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-300/85">
              Conversation Map
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {selectedNode ? selectedNode.label : "Focused knowledge graph"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {selectedNode
                ? `${selectedNode.type} · ${degreeById.get(selectedNode.id) ?? 0} connections`
                : "Click a node to focus its immediate neighborhood, then zoom for more labels."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5">
              {graphData.nodes.length} nodes
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5">
              {graphData.links.length} edges
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 ${
                connectionState === "live"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-sky-500/30 bg-sky-500/10 text-sky-200"
              }`}
            >
              {connectionState === "live"
                ? "Live"
                : connectionState === "reconnecting"
                  ? "Reconnecting"
                  : "Connecting"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {LEGEND_TYPES.map((type) => (
            <span
              key={type}
              className="rounded-full border border-slate-700/80 bg-slate-800/75 px-2.5 py-1 text-xs text-slate-200"
            >
              <span
                className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                style={{ backgroundColor: NODE_COLORS[type] }}
              />
              {type}
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-3">
          <div className="relative min-w-[18rem] flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  event.preventDefault();
                  focusNode(searchResults[0].id);
                }

                if (event.key === "Escape") {
                  setSearchQuery("");
                }
              }}
              placeholder="Search for a node label..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/75 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              disabled={graphData.nodes.length === 0}
            />

            {searchQuery.trim() && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 shadow-xl shadow-slate-950/40">
                {searchResults.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => focusNode(node.id)}
                    className="flex w-full items-center justify-between border-b border-slate-800/80 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-900"
                  >
                    <span>
                      <span className="block text-sm font-medium text-white">
                        {node.label}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {node.type} · {degreeById.get(node.id) ?? 0} connections
                      </span>
                    </span>
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: NODE_COLORS[node.type] || DEFAULT_COLOR,
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => runZoomToFit()}
            disabled={graphData.nodes.length === 0}
            className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Fit
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedNodeId(null);
              setHoveredNodeId(null);
              setSearchQuery("");
            }}
            disabled={!selectedNodeId && !searchQuery}
            className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Focus
          </button>
        </div>
      </div>

      {graphData.nodes.length === 0 ? (
        <div className="flex h-full items-center justify-center px-8 pt-32">
          <div className="max-w-lg rounded-3xl border border-slate-700/70 bg-slate-900/80 px-8 py-7 text-center shadow-xl shadow-slate-950/30 backdrop-blur">
            <p className="text-lg font-semibold text-white">{emptyState.title}</p>
            <p className="mt-3 text-sm leading-7 text-slate-400">{emptyState.body}</p>
            {graphStatus?.model && (
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                Graph model: {graphStatus.model}
              </p>
            )}
          </div>
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          graphData={forceGraphData}
          nodeRelSize={5.5}
          nodeVal={(node: ForceNode) => node.val ?? 2.4}
          nodeColor={(node: ForceNode) => {
            const baseColor = NODE_COLORS[node.type] || DEFAULT_COLOR;

            if (!selectedNeighborhood) {
              return baseColor;
            }

            return selectedNeighborhood.has(node.id)
              ? baseColor
              : withAlpha(baseColor, 0.16);
          }}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={nodeCanvasObject}
          linkColor={(link: ForceLink) => {
            const sourceId = toNodeId(link.source);
            const targetId = toNodeId(link.target);

            if (!selectedNeighborhood) {
              return "rgba(148, 163, 184, 0.24)";
            }

            return selectedNeighborhood.has(sourceId) && selectedNeighborhood.has(targetId)
              ? "rgba(125, 211, 252, 0.55)"
              : "rgba(71, 85, 105, 0.14)";
          }}
          linkWidth={(link: ForceLink) => {
            const sourceId = toNodeId(link.source);
            const targetId = toNodeId(link.target);

            if (!selectedNeighborhood) {
              return 1;
            }

            return selectedNeighborhood.has(sourceId) && selectedNeighborhood.has(targetId)
              ? 1.9
              : 0.8;
          }}
          linkDirectionalArrowLength={(link: ForceLink) => {
            const sourceId = toNodeId(link.source);
            const targetId = toNodeId(link.target);

            if (!selectedNeighborhood) {
              return 4;
            }

            return selectedNeighborhood.has(sourceId) && selectedNeighborhood.has(targetId)
              ? 6
              : 3;
          }}
          linkDirectionalArrowColor={(link: ForceLink) => {
            const sourceId = toNodeId(link.source);
            const targetId = toNodeId(link.target);

            if (!selectedNeighborhood) {
              return "rgba(148, 163, 184, 0.2)";
            }

            return selectedNeighborhood.has(sourceId) && selectedNeighborhood.has(targetId)
              ? "rgba(125, 211, 252, 0.55)"
              : "rgba(71, 85, 105, 0.14)";
          }}
          linkDirectionalArrowRelPos={1}
          cooldownTicks={100}
          backgroundColor="#081121"
          onNodeClick={(node: ForceNode) => focusNode(node.id)}
          onNodeHover={(node: ForceNode | null) =>
            setHoveredNodeId(node ? node.id : null)
          }
          onBackgroundClick={() => setSelectedNodeId(null)}
          onNodeDragEnd={() => setHasUserMovedCamera(true)}
          onZoom={(transform: { k: number }) => setZoomLevel(transform.k)}
          onZoomEnd={(transform: { k: number }) => {
            setZoomLevel(transform.k);

            if (!programmaticCameraRef.current) {
              setHasUserMovedCamera(true);
            }
          }}
          onEngineStop={() => {
            if (pendingAutoFitRef.current && !hasUserMovedCamera) {
              runZoomToFit();
              pendingAutoFitRef.current = false;
            }
          }}
          width={undefined}
          height={undefined}
        />
      )}

      {graphData.nodes.length > 0 && banner && (
        <div
          className={`absolute bottom-4 left-4 z-10 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
            banner.tone === "info"
              ? "border-sky-500/30 bg-sky-500/10 text-sky-100"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
          }`}
        >
          {banner.message}
        </div>
      )}

      {selectedNode && selectedForceNode && (
        <aside className="absolute bottom-4 right-4 top-40 z-10 w-80 overflow-y-auto rounded-3xl border border-slate-700/80 bg-slate-950/92 p-5 shadow-2xl shadow-slate-950/45 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Node details
              </p>
              <h3 className="mt-1 text-xl font-semibold text-white">
                {selectedNode.label}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5">
              {selectedNode.type}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5">
              {degreeById.get(selectedNode.id) ?? 0} connections
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5">
              Zoom {zoomLevel.toFixed(1)}x
            </span>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Properties
            </p>
            {Object.keys(selectedNode.properties).length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                No additional properties were attached to this node.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {Object.entries(selectedNode.properties).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-800 bg-slate-900/85 px-3 py-2"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {key}
                    </p>
                    <p className="mt-1 text-sm text-slate-200">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Incoming relationships
            </p>
            {selectedNodeIncoming.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                Nothing points into this node yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {selectedNodeIncoming.map(({ edge, otherNode }, index) => (
                  <button
                    key={`${edge.source}-${edge.target}-${edge.label}-incoming-${index}`}
                    type="button"
                    onClick={() => otherNode && focusNode(otherNode.id)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/85 px-3 py-3 text-left transition hover:border-slate-600 hover:bg-slate-900"
                  >
                    <p className="text-sm font-medium text-white">
                      {otherNode?.label ?? edge.source}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-sky-300/80">
                      {edge.label}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Outgoing relationships
            </p>
            {selectedNodeOutgoing.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                This node has no outgoing relationships yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {selectedNodeOutgoing.map(({ edge, otherNode }, index) => (
                  <button
                    key={`${edge.source}-${edge.target}-${edge.label}-outgoing-${index}`}
                    type="button"
                    onClick={() => otherNode && focusNode(otherNode.id)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/85 px-3 py-3 text-left transition hover:border-slate-600 hover:bg-slate-900"
                  >
                    <p className="text-sm font-medium text-white">
                      {otherNode?.label ?? edge.target}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-sky-300/80">
                      {edge.label}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
