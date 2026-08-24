package api

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strings"
	"time"

	"github.com/Nils-Svensson/terraform-wizard/backend/internal/ingest"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/storage"
)

type CloneHandler struct {
	ingest  *ingest.Service
	storage *storage.Storage
}

func NewCloneHandler(ingest *ingest.Service, storage *storage.Storage) *CloneHandler {
	return &CloneHandler{ingest: ingest, storage: storage}
}

type cloneRequest struct {
	RepoURL string `json:"repo_url"`
	Branch  string `json:"branch"`
	Token   string `json:"token"`
}

func (h *CloneHandler) CloneRepo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req cloneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	req.RepoURL = strings.TrimSpace(req.RepoURL)
	req.Branch = strings.TrimSpace(req.Branch)
	if req.Branch == "" {
		req.Branch = "main"
	}

	tarballURL, err := buildTarballURL(req.RepoURL, req.Branch)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	files, err := downloadTarball(ctx, tarballURL, req.Token)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to fetch repository: %s", err.Error()), http.StatusBadGateway)
		return
	}
	if len(files) == 0 {
		http.Error(w, "no .tf files found in repository", http.StatusUnprocessableEntity)
		return
	}

	resources, err := h.ingest.ProcessRaw(files)
	if err != nil {
		http.Error(w, fmt.Sprintf("parse error: %s", err.Error()), http.StatusUnprocessableEntity)
		return
	}

	sessionID := h.storage.NewSession()
	h.storage.Save(sessionID, resources)

	filePaths := make([]string, 0, len(files))
	for path := range files {
		filePaths = append(filePaths, path)
	}
	sort.Strings(filePaths)

	json.NewEncoder(w).Encode(map[string]any{
		"session_id": sessionID,
		"files":      filePaths,
	})
}

// buildTarballURL converts a GitHub repo URL to its tarball download URL.
// Input: https://github.com/owner/repo  Output: https://api.github.com/repos/owner/repo/tarball/branch
func buildTarballURL(rawURL, branch string) (string, error) {
	if !strings.HasPrefix(rawURL, "https://") {
		return "", fmt.Errorf("only https:// URLs are supported")
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL")
	}

	if err := blockPrivateHost(u.Hostname()); err != nil {
		return "", err
	}

	if u.Hostname() != "github.com" {
		return "", fmt.Errorf("only github.com repositories are supported")
	}

	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) < 2 {
		return "", fmt.Errorf("URL must be https://github.com/owner/repo")
	}
	owner, repo := parts[0], parts[1]
	repo = strings.TrimSuffix(repo, ".git")

	return fmt.Sprintf("https://api.github.com/repos/%s/%s/tarball/%s", owner, repo, branch), nil
}

// blockPrivateHost rejects hostnames that resolve to private/loopback addresses.
func blockPrivateHost(hostname string) error {
	blocked := []string{
		"localhost", "0.0.0.0",
		"metadata.google.internal", "metadata",
	}
	for _, b := range blocked {
		if strings.EqualFold(hostname, b) {
			return fmt.Errorf("invalid repository URL")
		}
	}

	// Block by IP literal
	if ip := net.ParseIP(hostname); ip != nil {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() {
			return fmt.Errorf("invalid repository URL")
		}
	}
	return nil
}

// downloadTarball fetches the GitHub tarball and returns a map of relative filepath → content
// for every .tf file found. The top-level directory emitted by GitHub is stripped.
func downloadTarball(ctx context.Context, tarballURL, token string) (map[string][]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, tarballURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{Timeout: 2 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("repository or branch not found")
	}
	if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("access denied — provide a GitHub token for private repos or if you hit rate limits")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub returned %d", resp.StatusCode)
	}

	gz, err := gzip.NewReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("decompress: %w", err)
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	files := make(map[string][]byte)

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("read tar: %w", err)
		}
		if hdr.Typeflag != tar.TypeReg {
			continue
		}

		name := hdr.Name
		// Strip the GitHub-generated top-level dir (owner-repo-sha/)
		if idx := strings.Index(name, "/"); idx >= 0 {
			name = name[idx+1:]
		}

		ext := strings.ToLower(path.Ext(name))
		if ext != ".tf" && !strings.HasSuffix(strings.ToLower(name), ".tf.json") {
			continue
		}

		// Cap individual file size at 5 MB
		content, err := io.ReadAll(io.LimitReader(tr, 5<<20))
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", name, err)
		}
		files[name] = content
	}

	return files, nil
}
