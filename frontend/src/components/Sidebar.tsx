import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";

interface Props {
  sessionId: string | null;
  onSessionId: (id: string | null) => void;
  onGraphData: (graph: any) => void;
  selectedNodeId?: string | null;
  blastRadius?: Set<string>;
  graphData?: any;
  onClearSelection?: () => void;
}

type StoredFile = { name: string; content: string };
type GithubInfo = { sessionId: string; repoUrl: string; branch: string; fetchedFiles: string[] };

const FILES_KEY  = "tw_files";
const GRAPH_KEY  = "tw_graph";
const SOURCE_KEY = "tw_source";
const GRAPH_TTL  = 24 * 60 * 60 * 1000; // 24 hours

// Reconstruct a pseudo-HCL preview from the flat attribute map.
function buildPreview(type: string, name: string, attrs: Record<string, string> | undefined): string {
  const lines = [`resource "${type}" "${name}" {`];
  const blocks: Record<string, Record<string, string>> = {};

  for (const [key, val] of Object.entries(attrs ?? {})) {
    const dot = key.indexOf(".");
    if (dot === -1) {
      lines.push(`  ${key} = ${val}`);
    } else {
      const prefix = key.slice(0, dot);
      const rest = key.slice(dot + 1);
      if (!blocks[prefix]) blocks[prefix] = {};
      blocks[prefix][rest] = val;
    }
  }

  for (const [block, subAttrs] of Object.entries(blocks)) {
    lines.push(`  ${block} {`);
    for (const [k, v] of Object.entries(subAttrs)) {
      lines.push(`    ${k} = ${v}`);
    }
    lines.push(`  }`);
  }

  lines.push("}");
  return lines.join("\n");
}

// ── Git repo clone ────────────────────────────────────────────────────────────

function RepoCloneSection({
  repoUrl, setRepoUrl,
  branch, setBranch,
  fetchedFiles,
  loading,
  cloneError,
  onDismissCloneError,
  onLoad,
}: {
  repoUrl: string;
  setRepoUrl: (v: string) => void;
  branch: string;
  setBranch: (v: string) => void;
  fetchedFiles: string[];
  loading: boolean;
  cloneError: string | null;
  onDismissCloneError: () => void;
  onLoad: (token: string) => Promise<void>;
}) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-xs text-foreground/50 uppercase tracking-wider font-medium">From GitHub</p>

      <input
        type="url"
        placeholder="https://github.com/owner/repo"
        value={repoUrl}
        onChange={e => setRepoUrl(e.target.value)}
        className="w-full text-xs rounded-md border border-purple-800/30 bg-background/50 px-3 py-2 placeholder:text-foreground/30 focus:outline-none focus:border-purple-600/50"
      />

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Branch (main)"
          value={branch}
          onChange={e => setBranch(e.target.value)}
          className="flex-1 text-xs rounded-md border border-purple-800/30 bg-background/50 px-3 py-2 placeholder:text-foreground/30 focus:outline-none focus:border-purple-600/50"
        />
        <Button
          variant="default"
          onClick={() => onLoad(token)}
          disabled={loading || !repoUrl.trim()}
          className="shrink-0"
        >
          {loading ? "Loading…" : "Load"}
        </Button>
      </div>

      {!showToken ? (
        <button
          onClick={() => setShowToken(true)}
          className="text-xs text-foreground/40 hover:text-foreground/60"
        >
          + Add GitHub token (avoids rate limits)
        </button>
      ) : (
        <div className="space-y-1">
          <input
            type="password"
            placeholder="ghp_… (optional)"
            value={token}
            onChange={e => setToken(e.target.value)}
            title="GitHub personal access token — used only for this request to fetch your repository. Never stored. Recommended: fine-grained PAT scoped to Contents: read on the target repo only."
            className="w-full text-xs rounded-md border border-purple-800/30 bg-background/50 px-3 py-2 placeholder:text-foreground/30 focus:outline-none focus:border-purple-600/50"
          />
          <p className="text-xs text-foreground/35">
            Recommended: fine-grained PAT with <em>Contents: read</em> on the target repo only. Never stored.
          </p>
        </div>
      )}

      {cloneError && (
        <div className="flex items-start gap-2">
          <p className="flex-1 text-xs text-red-400">{cloneError}</p>
          <button onClick={onDismissCloneError} className="text-red-400/60 hover:text-red-400 text-xs leading-none mt-0.5" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {fetchedFiles.length > 0 && (
        <details className="group">
          <summary className="text-xs text-foreground/50 cursor-pointer hover:text-foreground/70 list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            {fetchedFiles.length} .tf files fetched
          </summary>
          <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto pl-3">
            {fetchedFiles.map(f => (
              <li key={f} className="text-xs font-mono text-foreground/50 truncate">{f}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ── File upload ───────────────────────────────────────────────────────────────

export default function FileUpload({
  sessionId,
  onSessionId,
  onGraphData,
  selectedNodeId,
  blastRadius,
  graphData,
  onClearSelection,
}: Props) {
  // Upload path state
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);

  // GitHub path state (lifted so it can be persisted)
  const [repoUrl, setRepoUrl]         = useState("");
  const [branch, setBranch]           = useState("main");
  const [fetchedFiles, setFetchedFiles] = useState<string[]>([]);
  const [githubSessionId, setGithubSessionId] = useState<string | null>(null);

  // Which path produced the current graph
  const [sourceType, setSourceType]   = useState<"upload" | "github" | null>(null);

  const [loading, setLoading]         = useState(false);
  const [cloneError, setCloneError]   = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Restore on mount ──────────────────────────────────────────────────────

  useEffect(() => {
    // Uploaded files
    try {
      const raw = localStorage.getItem(FILES_KEY);
      if (raw) {
        const parsed: StoredFile[] = JSON.parse(raw);
        setStoredFiles(parsed);
      }
    } catch {
      localStorage.removeItem(FILES_KEY);
    }

    // Source info (github session or upload marker)
    try {
      const raw = localStorage.getItem(SOURCE_KEY);
      if (raw) {
        const src = JSON.parse(raw);
        setSourceType(src.type ?? null);
        if (src.type === "github") {
          setRepoUrl(src.repoUrl ?? "");
          setBranch(src.branch ?? "main");
          setFetchedFiles(src.fetchedFiles ?? []);
          setGithubSessionId(src.sessionId ?? null);
          onSessionId(src.sessionId ?? null);
        }
      }
    } catch {
      localStorage.removeItem(SOURCE_KEY);
    }

    // Graph data (with TTL)
    try {
      const raw = localStorage.getItem(GRAPH_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < GRAPH_TTL) {
          onGraphData(data);
        } else {
          localStorage.removeItem(GRAPH_KEY);
        }
      }
    } catch {
      localStorage.removeItem(GRAPH_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist files whenever they change ───────────────────────────────────

  useEffect(() => {
    if (storedFiles.length === 0) {
      localStorage.removeItem(FILES_KEY);
    } else {
      localStorage.setItem(FILES_KEY, JSON.stringify(storedFiles));
    }
  }, [storedFiles]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function persistGraph(data: any) {
    try {
      localStorage.setItem(GRAPH_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch {
      // Storage quota — silently skip
    }
  }

  function persistSource(type: "upload" | "github", extra?: Omit<GithubInfo, "sessionId"> & { sessionId: string }) {
    localStorage.setItem(SOURCE_KEY, JSON.stringify({ type, ...extra }));
  }

  // ── GitHub load ───────────────────────────────────────────────────────────

  async function handleGithubLoad(token: string) {
    setCloneError(null);
    setFetchedFiles([]);
    setLoading(true);
    // Abandon manual upload state
    setStoredFiles([]);
    setUploadError(null);
    localStorage.removeItem(FILES_KEY);

    try {
      const cloneRes = await fetch("/api/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, branch, token: token || undefined }),
      });

      if (!cloneRes.ok) {
        const txt = await cloneRes.text();
        throw new Error(txt || `Clone failed (${cloneRes.status})`);
      }

      const json = await cloneRes.json();
      const sid: string = json.session_id;
      const files: string[] = json.files ?? [];

      setGithubSessionId(sid);
      setFetchedFiles(files);
      onSessionId(sid);
      setSourceType("github");
      persistSource("github", { sessionId: sid, repoUrl, branch, fetchedFiles: files });

      const graphRes = await fetch(`/api/graph?session_id=${sid}`);
      if (!graphRes.ok) {
        const txt = await graphRes.text();
        throw new Error(txt || `Graph fetch failed (${graphRes.status})`);
      }
      const graphJson = await graphRes.json();
      onGraphData(graphJson);
      persistGraph(graphJson);
    } catch (err: any) {
      setCloneError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  // ── Manual upload handling ────────────────────────────────────────────────

  const handleNewFiles = useCallback(
    async (incoming: File[]) => {
      setUploadError(null);
      setCloneError(null);
      onSessionId(null);
      setGithubSessionId(null);
      setFetchedFiles([]);
      setSourceType("upload");
      localStorage.removeItem(SOURCE_KEY);

      const converted = await Promise.all(
        incoming.map(async f => ({ name: f.name, content: await f.text() }))
      );
      setStoredFiles(prev => [...prev, ...converted]);
    },
    [onSessionId]
  );

  const onDrop = useCallback((accepted: File[]) => handleNewFiles(accepted), [handleNewFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".tf"], "application/json": [".tf.json"] },
    multiple: true,
  });

  // ── Generate graph ────────────────────────────────────────────────────────

  async function handleGenerateGraph() {
    if (sourceType === "github") {
      // Reset layout by giving GraphWindow a fresh graphData reference.
      // The shallow copy changes the object identity, triggering the layout effect.
      if (graphData) onGraphData({ ...graphData });
      return;
    }

    if (storedFiles.length === 0) {
      setUploadError("No files selected");
      return;
    }

    setLoading(true);
    setUploadError(null);

    try {
      const form = new FormData();
      if (sessionId) form.append("session_id", sessionId);

      storedFiles.forEach(f => {
        form.append("files", new File([new Blob([f.content], { type: "text/plain" })], f.name));
      });

      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const txt = await uploadRes.text();
        throw new Error(txt || `Upload failed (${uploadRes.status})`);
      }

      const uploadJson = await uploadRes.json();
      const newSession = uploadJson.session_id;
      if (!newSession) throw new Error("No session_id returned from upload");
      onSessionId(newSession);

      const graphRes = await fetch(`/api/graph?session_id=${newSession}`);
      if (!graphRes.ok) {
        const txt = await graphRes.text();
        throw new Error(txt || `Graph fetch failed (${graphRes.status})`);
      }

      const graphJson = await graphRes.json();
      onGraphData(graphJson);
      persistGraph(graphJson);
      persistSource("upload");
    } catch (err: any) {
      setUploadError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  // ── Clear ─────────────────────────────────────────────────────────────────

  function handleClear() {
    setStoredFiles([]);
    setGithubSessionId(null);
    setFetchedFiles([]);
    setRepoUrl("");
    setBranch("main");
    setSourceType(null);
    setCloneError(null);
    setUploadError(null);
    onSessionId(null);
    onGraphData(null);
    onClearSelection?.();
    localStorage.removeItem(FILES_KEY);
    localStorage.removeItem(GRAPH_KEY);
    localStorage.removeItem(SOURCE_KEY);
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const hasGraph     = !!graphData;
  const hasUpload    = storedFiles.length > 0;
  const hasGithub    = sourceType === "github" && !!githubSessionId;
  const canGenerate  = !loading && (hasUpload || (hasGithub && hasGraph));
  const canClear     = !loading && (hasUpload || hasGithub || hasGraph);

  const selectedNode = selectedNodeId
    ? graphData?.graph?.nodes?.find((n: any) => n.id === selectedNodeId)
    : null;
  const brNodes: any[] = selectedNodeId
    ? (graphData?.graph?.nodes ?? []).filter((n: any) => blastRadius?.has(n.id))
    : [];
  const uniqueFiles = new Set(brNodes.map((n: any) => n.filepath).filter(Boolean));

  return (
    <div className="space-y-4">

      {/* ── Git repo clone ── */}
      <RepoCloneSection
        repoUrl={repoUrl}
        setRepoUrl={setRepoUrl}
        branch={branch}
        setBranch={setBranch}
        fetchedFiles={fetchedFiles}
        loading={loading && sourceType === "github"}
        cloneError={cloneError}
        onDismissCloneError={() => setCloneError(null)}
        onLoad={handleGithubLoad}
      />

      <Separator className="bg-purple-800/30" />

      {/* ── Upload ── */}
      <div className="space-y-3">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-5 transition-all cursor-pointer ${
            isDragActive
              ? "border-purple-600 bg-purple-950/30 shadow-lg shadow-purple-500/20"
              : "border-purple-800/30 bg-background/30 hover:border-purple-600/50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-2 rounded-lg bg-purple-950/50">
              <svg className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
                <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
              </svg>
            </div>
            <p className="text-xs font-medium">
              {isDragActive ? "Drop files to upload" : "Drag & drop .tf or .tf.json files"}
            </p>
          </div>
        </div>

        {storedFiles.length > 0 && (
          <ul className="space-y-0.5">
            {storedFiles.map((f, idx) => (
              <li key={`${f.name}-${idx}`} className="text-xs font-mono text-foreground/60 truncate">{f.name}</li>
            ))}
          </ul>
        )}

        {uploadError && (
          <div className="flex items-start gap-2">
            <p className="flex-1 text-xs text-red-400">{uploadError}</p>
            <button onClick={() => setUploadError(null)} className="text-red-400/60 hover:text-red-400 text-xs leading-none mt-0.5" aria-label="Dismiss error">✕</button>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={handleGenerateGraph}
            disabled={!canGenerate}
          >
            {loading && sourceType !== "github" ? "Generating…" : "Generate Graph"}
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={!canClear}>
            Clear
          </Button>
        </div>
      </div>

      <Separator className="bg-purple-800/30" />

      {/* ── Blast Radius — always visible ── */}
      <div className="space-y-3">

        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-purple-400/80 font-medium">
            {selectedNodeId ? "Selected Resource" : "Blast Radius"}
          </span>
          {selectedNodeId && (
            <button
              onClick={onClearSelection}
              className="text-foreground/40 hover:text-foreground/80 text-xs leading-none"
              aria-label="Clear selection"
            >
              ✕
            </button>
          )}
        </div>

        {!selectedNodeId ? (
          <p className="text-xs text-foreground/40">Click a resource in the graph to see its blast radius.</p>
        ) : (
          <div className="space-y-3">

            {selectedNode?.filepath && (
              <div className="text-xs font-mono text-foreground/40 truncate" title={`${selectedNode.filepath}:${selectedNode.line ?? "?"}`}>
                {selectedNode.filepath}:{selectedNode.line ?? "?"}
              </div>
            )}

            <div className="rounded-lg border border-purple-800/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Blast Radius</span>
                <span className="text-xs text-foreground/50">
                  {brNodes.length} resource{brNodes.length !== 1 ? "s" : ""} · {uniqueFiles.size} file{uniqueFiles.size !== 1 ? "s" : ""}
                </span>
              </div>

              {brNodes.length === 0 ? (
                <p className="text-xs text-foreground/40">No dependents — safe to remove.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto overflow-x-auto">
                  {brNodes.map((n: any) => (
                    <li key={n.id} className="flex items-baseline gap-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-purple-300">{n.id}</span>
                      {n.filepath && (
                        <span className="text-xs text-foreground/40 font-mono">
                          {n.filepath}:{n.line ?? "?"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedNode && (
              <div className="space-y-1">
                <div className="font-mono text-xs text-purple-300">{selectedNodeId}</div>
                <pre className="text-xs bg-background/50 border border-purple-800/30 rounded p-3 overflow-auto max-h-48 font-mono text-foreground/80 whitespace-pre-wrap">
                  {buildPreview(selectedNode.type ?? "", selectedNode.name ?? "", selectedNode.attr)}
                </pre>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
