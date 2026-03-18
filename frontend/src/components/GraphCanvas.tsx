import { useCallback, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { GraphData } from "../types";

const NODE_COLORS: Record<string, string> = {
  Person: "#3b82f6",
  Concept: "#22c55e",
  Project: "#f97316",
  Tool: "#a855f7",
  Event: "#ef4444",
};

const DEFAULT_COLOR = "#64748b";

interface GraphCanvasProps {
  graphData: GraphData;
  isConnected: boolean;
}

export function GraphCanvas({ graphData, isConnected }: GraphCanvasProps) {
  const fgRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const label = node.label || node.id;
      const fontSize = Math.max(12 / globalScale, 3);
      const nodeColor = NODE_COLORS[node.type] || DEFAULT_COLOR;
      const radius = 5;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = nodeColor;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Label
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(label, node.x, node.y + radius + 2);
    },
    []
  );

  const forceGraphData = {
    nodes: graphData.nodes.map((n) => ({ ...n })),
    links: graphData.links.map((l) => ({ ...l })),
  };

  return (
    <div className="relative h-full w-full bg-[#0f172a]">
      {/* Connection indicator */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 text-xs">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span className="text-slate-400">
          {isConnected ? "Live" : "Reconnecting..."}
        </span>
      </div>

      {/* Node count */}
      <div className="absolute top-3 left-3 z-10 text-xs text-slate-500">
        {graphData.nodes.length} nodes · {graphData.links.length} edges
      </div>

      {graphData.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-600 text-sm">
          Knowledge graph will appear here
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          graphData={forceGraphData}
          nodeCanvasObject={nodeCanvasObject}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkColor={() => "rgba(100,116,139,0.4)"}
          linkLabel="label"
          backgroundColor="#0f172a"
          cooldownTicks={100}
          width={undefined}
          height={undefined}
        />
      )}
    </div>
  );
}
