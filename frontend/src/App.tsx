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
        padding: 40,
        minHeight: "100vh",
        background: "#0f172a",      // Deep blue/black
        color: "white",
      }}
    >
      <h1 style={{ marginBottom: 30 }}>Terraform Wizard</h1>

      <FileUpload
        sessionId={sessionId}
        onSessionId={setSessionId}
        onGraphData={setGraphData}
      />

      {/* Show session info if available */}
      {sessionId && (
        <div style={{ marginTop: 30 }}>
          <h2>Session Created</h2>
          <p>
            <strong>ID:</strong> {sessionId}
          </p>
        </div>
      )}

      {/* Only render GraphWindow when graphData exists */}
      {graphData && (
        <div style={{ marginTop: 40 }}>
          <GraphWindow graphData={graphData} />
        </div>
      )}
    </div>
  );
}

export default App;
