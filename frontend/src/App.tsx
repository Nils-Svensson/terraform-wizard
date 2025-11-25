import { useState } from "react";
import "./App.css";
import FileUpload from "./components/FileUpload";

function App() {
  const [graphData, setGraphData] = useState<any | null>(null);

  return (
    <div style={{ padding: 40 }}>
      <h1>Terraform Wizard</h1>

      {/* Upload UI */}
      <FileUpload onGraphData={(graph) => setGraphData(graph)} />

      {/* Display the graph JSON (temporary until we add visualization) */}
      {graphData && (
        <div style={{ marginTop: 30 }}>
          <h2>Graph Data</h2>
          <pre style={{ background: "#eee", padding: 20, borderRadius: 8 }}>
            {JSON.stringify(graphData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
