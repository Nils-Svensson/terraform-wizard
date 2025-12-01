package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path"
	"strings"

	"github.com/Nils-Svensson/terraform-wizard/backend/internal/ingest"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/storage"

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

	fmt.Println("Multipart Form Values:", r.MultipartForm.Value)
	fmt.Println("Query session_id:", r.URL.Query().Get("session_id"))
	fmt.Println("FormValue session_id:", r.FormValue("session_id"))

	// Optional session ID from query parameters
	sessionID := r.URL.Query().Get("session_id")

	msg := fmt.Sprintf("sessionID: %s", sessionID)
	fmt.Println(msg)

	// If empty, try form field (for POST)
	if sessionID == "" {
		if val := r.FormValue("session_id"); val != "" {
			sessionID = val
		}
	}

	if sessionID == "" || !isValidUUID(sessionID) {
		sessionID = h.storage.NewSession()
		fmt.Println("SessionID: ", sessionID)
	} else {
		// IMPORTANT: clear previous data
		h.storage.Delete(sessionID)
	}

	// Validate file field
	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		http.Error(w, "no files uploaded", http.StatusBadRequest)
		return
	}

	// Validate extensions
	for _, f := range files {
		fmt.Printf("Received file: '%s'\n", f.Filename)

		filename := strings.ToLower(path.Base(f.Filename))

		// Remove macOS duplicate suffixes, like "(kopia)" or "(copy)"
		filename = strings.Split(filename, " (")[0]
		filename = strings.TrimSpace(filename)

		if strings.HasSuffix(filename, ".tf") || strings.HasSuffix(filename, ".tf.json") {
			// accept
		} else {
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
