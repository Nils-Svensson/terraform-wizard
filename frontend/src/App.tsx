import { useState } from "react";
import "./App.css";

import FileUpload from "./components/FileUpload";
import GraphWindow from "./components/GraphWindow";

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<any | null>(null);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: "#0f172a",
        color: "white",
        overflow: "hidden",
        flexDirection: "row",
      }}
    >
      {/* LEFT SIDEBAR */}
      <div
        style={{
          width: "320px",
          padding: "20px",
          borderRight: "1px solid #334155",
          overflowY: "auto",
        }}
      >
        <h1 style={{ marginBottom: 20 }}>Terraform Wizard</h1>

        <FileUpload
          sessionId={sessionId}
          onSessionId={setSessionId}
          onGraphData={setGraphData}
        />

        {sessionId && (
          <div style={{ marginTop: 30 }}>
            <h2>Session Created</h2>
            <p><strong>ID:</strong> {sessionId}</p>
          </div>
        )}
      </div>

      {/* GRAPH PANEL */}
      <div
        style={{
          flex: 1,
          padding: "10px",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <GraphWindow graphData={graphData} />
      </div>
    </div>
  );
}

export default App;
