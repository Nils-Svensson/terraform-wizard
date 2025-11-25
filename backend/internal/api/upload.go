package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"terraform-wizard/backend/internal/ingest"
	"terraform-wizard/backend/internal/storage"

	"github.com/google/uuid"
)

type UploadHandler struct {
	ingest  *ingest.Service
	storage *storage.Storage
}

func NewUploadHandler(ingest *ingest.Service, storage *storage.Storage) *UploadHandler {
	return &UploadHandler{ingest: ingest, storage: storage}
}

func (h *UploadHandler) UploadTerraform(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Parse multipart form (50MB)
	err := r.ParseMultipartForm(50 << 20)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Optional session ID from query parameters
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" || !isValidUUID(sessionID) {
		sessionID = h.storage.NewSession()
	}

	// Validate file field
	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		http.Error(w, "no files uploaded", http.StatusBadRequest)
		return
	}

	// Validate extensions
	for _, f := range files {
		filename := strings.ToLower(f.Filename)
		if !strings.HasSuffix(filename, ".tf") && !strings.HasSuffix(filename, ".tf.json") {
			http.Error(w, "invalid file format: "+filename, http.StatusBadRequest)
			return
		}
	}

	// Parse files → resources
	resources, err := h.ingest.ProcessFiles(files)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Save into storage
	h.storage.Save(sessionID, resources)

	// Respond with session ID
	json.NewEncoder(w).Encode(map[string]string{
		"session_id": sessionID,
	})
}

func (h *UploadHandler) ClearSession(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	if sessionID != "" && isValidUUID(sessionID) {
		h.storage.Delete(sessionID)
	}

	// Return new sessionID
	newSessionID := h.storage.NewSession()
	json.NewEncoder(w).Encode(map[string]string{
		"session_id": newSessionID,
	})
}

// Helper to validate UUID format
func isValidUUID(u string) bool {
	_, err := uuid.Parse(u)
	return err == nil
}
