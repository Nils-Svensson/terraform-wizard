import React, { useState } from "react";

interface Props {
  onGraphData: (graph: any) => void;
}

const FileUpload: React.FC<Props> = ({ onGraphData }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(dropped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setError("");
  };

  const generateGraph = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError("");

    try {
      // 1. Upload files
      const form = new FormData();
      files.forEach((f) => form.append("files", f));

      const uploadRes = await fetch("http://localhost:8080/upload", {
        method: "POST",
        body: form,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const uploadData = await uploadRes.json();
      const sessionId = uploadData.session_id;

      // 2. Fetch graph
      const graphRes = await fetch(
        `http://localhost:8080/graph?session_id=${sessionId}`
      );

      if (!graphRes.ok) throw new Error("Graph fetch failed");

      const graph = await graphRes.json();
      onGraphData(graph);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        style={{
          border: "2px dashed #666",
          padding: 30,
          borderRadius: 8,
          textAlign: "center",
          background: isDragging ? "#eee" : "#fafafa",
          marginBottom: 20,
        }}
      >
        <p>Drop Terraform files (.tf / .tf.json) here</p>

        <input
          type="file"
          multiple
          accept=".tf,.tf.json"
          onChange={handleFileInput}
        />
      </div>

      {files.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <strong>Selected files:</strong>
          <ul>
            {files.map((f) => (
              <li key={f.name}>{f.name}</li>
            ))}
          </ul>

          <button onClick={clearFiles}>Clear</button>
        </div>
      )}

      <button onClick={generateGraph} disabled={loading || files.length === 0}>
        {loading ? "Processing..." : "Generate Graph"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default FileUpload;
