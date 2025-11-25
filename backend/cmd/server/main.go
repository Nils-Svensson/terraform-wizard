package main

import (
	"log"
	"net/http"

	"terraform-wizard/backend/internal/api"
	"terraform-wizard/backend/internal/graph"
	"terraform-wizard/backend/internal/ingest"
	"terraform-wizard/backend/internal/parser"
	"terraform-wizard/backend/internal/storage"
)

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

	// Upload endpoints
	mux.HandleFunc("/upload", uploadHandler.UploadTerraform)
	mux.HandleFunc("/clear", uploadHandler.ClearSession)

	// Graph & stats endpoints
	mux.HandleFunc("/graph", graphHandler.BuildGraph)
	//mux.HandleFunc("/stats", statsHandler.GetStats)

	// Start server
	addr := ":8080"
	log.Printf("Terraform Wizard backend running at http://localhost%s\n", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
