import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  sessionId: string | null;
  onSessionId: (id: string) => void;
  onGraphData: (graph: any) => void;
}

export default function FileUpload({ sessionId, onSessionId, onGraphData }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle dropped or selected files
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".tf"] },
  });

  async function handleGenerateGraph() {
    if (files.length === 0) return;

    setLoading(true);

    try {
      // --- 1) Upload files (reusing existing session if available) ---
      const form = new FormData();

      if (sessionId) {
        form.append("session_id", sessionId);
      }

      files.forEach((f) => form.append("files", f));

      const uploadRes = await fetch('http://localhost:8080/upload', {
        method: "POST",
        body: form,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const uploadJson = await uploadRes.json();

      if (uploadJson.session_id) {
        onSessionId(uploadJson.session_id);
      }

      const activeSession = uploadJson.session_id;

      // --- 2) Request graph ---
      const graphRes = await fetch(
        `http://localhost:8080/graph?session_id=${activeSession}`
      );

      if (!graphRes.ok) throw new Error("Failed to fetch graph");

      const graphJson = await graphRes.json();
      onGraphData(graphJson);

    } catch (err) {
      console.error(err);
      alert("Error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setFiles([]);
  }

  return (
    <div>
      {/* Dropzone UI */}
      <div
        {...getRootProps()}
        style={{
          padding: 30,
          border: "2px dashed #888",
          borderRadius: 10,
          background: isDragActive ? "#1e2530" : "#151a22",
          cursor: "pointer",
          marginBottom: 20,
          color: "#e2e8f0"
        }}
      >
        <input {...getInputProps()} />

        {isDragActive ? (
          <p>Drop Terraform files here...</p>
        ) : (
          <p>Drag & drop Terraform (.tf) files, or click to select</p>
        )}
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <strong>Files:</strong>
          <ul>
            {files.map((f, i) => (
              <li key={i}>{f.name}</li>
            ))}
          </ul>

          <button
            onClick={handleClear}
            style={{ 
              marginTop: 10,
              padding: "6px 10px",
              background: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1, }}
          >
            Clear Files
          </button>
        </div>
      )}

      {/* Generate Graph Button */}
      <button
        onClick={handleGenerateGraph}
        disabled={loading || files.length === 0}
        style={{
          padding: "10px 20px",
          background: "#4caf50",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Processing..." : "Generate Graph"}
      </button>
    </div>
  );
}
