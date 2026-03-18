import { useCallback } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { GraphCanvas } from "./components/GraphCanvas";
import { useChat } from "./hooks/useChat";
import { useGraphData } from "./hooks/useGraphData";
import { useWebSocket } from "./hooks/useWebSocket";

export default function App() {
  const { graphData, mergeDelta, resetGraph } = useGraphData();
  const {
    messages,
    sendMessage,
    isLoading,
    activeFramework,
    conversationId,
    resetConversation,
  } = useChat(mergeDelta);
  const { isConnected } = useWebSocket(mergeDelta);

  const handleReset = useCallback(() => {
    resetConversation();
    resetGraph();
  }, [resetConversation, resetGraph]);

  return (
    <div className="h-screen flex bg-slate-900">
      {/* Chat Panel — left half */}
      <div className="w-1/2 border-r border-slate-700">
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          activeFramework={activeFramework}
          conversationId={conversationId}
          onSend={sendMessage}
          onReset={handleReset}
        />
      </div>

      {/* Graph Canvas — right half */}
      <div className="w-1/2">
        <GraphCanvas graphData={graphData} isConnected={isConnected} />
      </div>
    </div>
  );
}
