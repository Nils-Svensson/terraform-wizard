
import React, { useState} from "react";

import type { DragEvent, ChangeEvent } from "react";

interface Props {
  onSessionId: (id: string) => void;
}

const FileUpload: React.FC<Props> = ({ onSessionId }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const response = await fetch("http://localhost:8080/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setUploading(false);

    if (data.session_id) {
      onSessionId(data.session_id);
    }
  };

  return (
    <div className="upload-container" style={{ maxWidth: 500, margin: "0 auto" }}>
      {/* Drop Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: "2px dashed #888",
          padding: "40px",
          textAlign: "center",
          borderRadius: 8,
          background: isDragging ? "#eee" : "transparent",
          cursor: "pointer",
        }}
      >
        <p>Drag & drop Terraform files here</p>
        <p>or click below to select</p>

        <input
          type="file"
          multiple
          accept=".tf,.tf.json"
          onChange={handleFileInput}
          style={{ marginTop: "10px" }}
        />
      </div>

      {/* Show selected files */}
      {files.length > 0 && (
        <ul style={{ marginTop: 20 }}>
          {files.map((f) => (
            <li key={f.name}>{f.name}</li>
          ))}
        </ul>
      )}

      {/* Upload button */}
      <button
        style={{
          marginTop: 20,
          padding: "10px 20px",
          fontSize: "1rem",
          cursor: "pointer",
        }}
        onClick={uploadFiles}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export default FileUpload;
