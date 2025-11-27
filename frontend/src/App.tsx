import { useState } from "react";
import "./App.css";
import FileUpload from "./components/FileUpload";
import GraphWindow from "./components/GraphWindow";

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<any | null>(null);

  return (
    <div style={{ padding: 40 }}>
      <h1>Terraform Wizard</h1>

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

      {graphData && (
        <GraphWindow graphData={graphData} />
      )}
    </div>
  );
}

export default App;



