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

        <div
  style={{
    marginBottom: "20px",
    padding: "12px",
    border: "1px solid #334155",
    borderRadius: "8px",
    background: "#020617",
    fontSize: "0.9rem",
    color: "#cbd5f5",
  }}
>
  <strong>Preview version</strong>
  <div style={{ marginTop: "6px", lineHeight: 1.4 }}>
    Terraform Wizard is under active development.
    <br />
    Core functionality works, but may be a bit rough around the edges.
  </div>
</div>


        <FileUpload
          sessionId={sessionId}
          onSessionId={setSessionId}
          onGraphData={setGraphData}
        />

        
        
         
        
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
