package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Nils-Svensson/terraform-wizard/backend/internal/graph"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/storage"
)

type GraphResponse struct {
	Graph    *graph.Graph 		   `json:"graph"`
	Analysis *graph.GraphAnalysis  `json:"analysis"`
}

type GraphHandler struct {
	builder *graph.Builder
	storage *storage.Storage
}

func NewGraphHandler(builder *graph.Builder, storage *storage.Storage) *GraphHandler {
	return &GraphHandler{builder: builder, storage: storage}
}

func (h *GraphHandler) BuildGraph(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	sessionID := r.URL.Query().Get("session_id")

	fmt.Println("Graph requested for session:", sessionID)

	if sessionID == "" {
		http.Error(w, "missing session_id", http.StatusBadRequest)
		return
	}

	resources, ok := h.storage.Get(sessionID)
	if !ok {
		http.Error(w, "no resources found for session", http.StatusNotFound)
		return
	}

	g := h.builder.Build(resources)
	analysis := graph.AnalyzeGraph(g)

	resp := GraphResponse{
		Graph:    g,
		Analysis: analysis,
	}
	

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
