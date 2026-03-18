import { useCallback, useState } from "react";
import type { GraphData, GraphDelta } from "../types";

export function useGraphData() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });

  const mergeDelta = useCallback((delta: GraphDelta) => {
    setGraphData((prev) => {
      const existingNodeIds = new Set(prev.nodes.map((n) => n.id));
      const newNodes = delta.nodes.filter((n) => !existingNodeIds.has(n.id));

      const existingEdgeKeys = new Set(
        prev.links.map((e) => `${e.source}-${e.target}-${e.label}`)
      );
      const newLinks = delta.edges.filter(
        (e) => !existingEdgeKeys.has(`${e.source}-${e.target}-${e.label}`)
      );

      if (newNodes.length === 0 && newLinks.length === 0) return prev;

      return {
        nodes: [...prev.nodes, ...newNodes],
        links: [...prev.links, ...newLinks],
      };
    });
  }, []);

  const resetGraph = useCallback(() => {
    setGraphData({ nodes: [], links: [] });
  }, []);

  return { graphData, mergeDelta, resetGraph };
}
