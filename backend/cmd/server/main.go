package main

import (
	"log"
	"net/http"

	"github.com/Nils-Svensson/terraform-wizard/backend/internal/api"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/graph"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/ingest"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/parser"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/storage"
)

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// Initialize services
	memStorage := storage.New()                // in-memory session storage
	parserService := parser.New()              // HCL / Terraform parser
	ingestService := ingest.New(parserService) // file ingest service, depends on parser
	buildService := graph.NewBuilder()

	// Initialize handlers
	uploadHandler := api.NewUploadHandler(ingestService, memStorage)
	graphHandler := api.NewGraphHandler(buildService, memStorage)
	//statsHandler := api.NewStatsHandler(memStorage)   // assume you have this

	// Set up router
	mux := http.NewServeMux()

	handler := enableCORS(mux)

	// Upload endpoints
	mux.HandleFunc("/upload", uploadHandler.UploadTerraform)
	mux.HandleFunc("/clear", uploadHandler.ClearSession)

	// Graph & stats endpoints
	mux.HandleFunc("/graph", graphHandler.BuildGraph)
	//mux.HandleFunc("/stats", statsHandler.GetStats)

	// Start server
	addr := ":8080"
	log.Printf("Terraform Wizard backend running at http://localhost%s\n", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
