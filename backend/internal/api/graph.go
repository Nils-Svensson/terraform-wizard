package api

import (
	"encoding/json"
	"net/http"
	"terraform-wizard/backend/internal/graph"
	"terraform-wizard/backend/internal/storage"
)

type GraphHandler struct {
	builder *graph.Builder
	storage *storage.Storage
}

func NewGraphHandler(builder *graph.Builder, storage *storage.Storage) *GraphHandler {
	return &GraphHandler{builder: builder, storage: storage}
}

func (h *GraphHandler) BuildGraph(w http.ResponseWriter, r http.Request) {
	sessionID := r.FormValue("session_id")
	resources, ok := h.storage.Get(sessionID)
	if !ok {
		http.Error(w, "no resources found", http.StatusBadRequest)
		return
	}

	g := h.builder.Build(resources)

	json.NewEncoder(w).Encode(g)

}
