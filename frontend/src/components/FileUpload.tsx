import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  sessionId: string | null;
  onSessionId: (id: string | null) => void;
  onGraphData: (graph: any) => void;
}

export default function FileUpload({ sessionId, onSessionId, onGraphData }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When user selects new files we clear previous session and append files
  const handleNewFiles = useCallback((incoming: File[]) => {
    setError(null);
    onSessionId(null); // force new session on next upload
    setFiles((prev) => [...prev, ...incoming]);
  }, [onSessionId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleNewFiles(acceptedFiles);
  }, [handleNewFiles]);

  // Accept by extension: .tf and .tf.json. Using both MIME + extensions.
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".tf"],
      "application/json": [".tf.json"],
    },
    noClick: true, // we provide our own "Select files" button
    multiple: true,
  });

  // Clear file list and keep session cleared
  function handleClear() {
    setFiles([]);
    setError(null);
    onSessionId(null);
  }

  async function handleGenerateGraph() {
    if (files.length === 0) {
      setError("No files selected");
      return;
    }
  
    setLoading(true); //
    setError(null);

    try {
      // Build form with files (do NOT send session_id to force new session)
      const form = new FormData();

      if (sessionId) {
        console.log("Sending existing session_id:", sessionId);
        form.append("session_id", sessionId);
      }
      
      files.forEach((f) => form.append("files", f));

      const uploadRes = await fetch("http://localhost:8080/upload", {
        method: "POST",
        body: form,
      });

      // show backend error text if any
      if (!uploadRes.ok) {
        const txt = await uploadRes.text();
        throw new Error(txt || `Upload failed (${uploadRes.status})`);
      }
      
      const uploadJson = await uploadRes.json(); 
      const newSession = uploadJson.session_id;
      if (!newSession) throw new Error("No session_id returned from upload");

      onSessionId(newSession);

      // fetch graph
      const graphRes = await fetch(`http://localhost:8080/graph?session_id=${newSession}`);
      if (!graphRes.ok) {
        const txt = await graphRes.text();
        throw new Error(txt || `Graph fetch failed (${graphRes.status})`);
      }

      const graphJson = await graphRes.json();
      onGraphData(graphJson);

      // optionally keep files or clear them, we'll keep them so user can re-generate
    } catch (err: any) {
      console.error("GenerateGraph error:", err);
      setError(err.message || String(err));
      alert("Error: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div
        {...getRootProps()}
        style={{
          padding: 30,
          border: "2px dashed #4b5563",
          borderRadius: 10,
          background: isDragActive ? "#111827" : "#0b1220",
          color: "#e6eef8",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 16 }}>
              {isDragActive ? "Drop files to upload" : "Drag & drop .tf or .tf.json files here"}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#9aa7bd" }}>
              or
            </p>
          </div>

          <button
            type="button"
            onClick={open}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #335",
              background: "#1f6feb",
              color: "white",
              cursor: "pointer",
            }}
          >
            Select files
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 16, color: "#dfe9fb" }}>
          <strong>Selected files</strong>
          <ul>
            {files.map((f, idx) => (
              <li key={`${f.name}-${idx}`}>{f.name}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <div style={{ color: "#ffb4b4", marginTop: 8 }}>{error}</div>}

      <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
        <button
          onClick={handleGenerateGraph}
          disabled={loading || files.length === 0}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: loading ? "#2b6cb0" : "#2563eb",
            color: "white",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate Graph"}
        </button>

        <button
          onClick={handleClear}
          disabled={loading || files.length === 0}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #334",
            background: "#0b1220",
            color: "#cbd5e1",
            cursor: loading ? "default" : "pointer",
          }}
        >
          Clear Files
        </button>
      </div>
    </div>
  );
}
