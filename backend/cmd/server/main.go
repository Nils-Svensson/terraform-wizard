package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/Nils-Svensson/terraform-wizard/backend/internal/api"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/graph"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/ingest"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/parser"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/registry"
	"github.com/Nils-Svensson/terraform-wizard/backend/internal/storage"
)

// enableCORS is a middleware that adds CORS headers to the response
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

	ctx := context.Background()

	sources := []registry.RegistrySource{
		&registry.FileSource{
			Provider: "google",
			Path:     "../../data/registries/gcp.yaml",
		},
		&registry.FileSource{
			Provider: "aws",
			Path:     "../../data/registries/aws.yaml",
		},
		&registry.FileSource{
			Provider: "azurerm",
			Path:     "../../data/registries/azure.yaml",
		},
	}

	mgr := registry.NewRegistryManager()

	for _, src := range sources {
		if err := mgr.LoadSource(ctx, src); err != nil {
			log.Fatalf("failed to load %s: %v", src.Name(), err)
		}
	}

	// Initialize services
	memStorage := storage.New()                // in-memory session storage
	parserService := parser.New()              // HCL / Terraform parser
	ingestService := ingest.New(parserService) // file ingest service, depends on parser
	buildService := graph.NewBuilder(mgr)      // Inject registry manager into graph builder

	// Initialize handlers
	uploadHandler := api.NewUploadHandler(ingestService, memStorage)
	graphHandler := api.NewGraphHandler(buildService, memStorage)
	//statsHandler := api.NewStatsHandler(memStorage)    to-do

	// Set up router
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	mux.HandleFunc("/healthz/", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})


	// Upload endpoints
	mux.HandleFunc("/upload", uploadHandler.UploadTerraform)
	mux.HandleFunc("/clear", uploadHandler.ClearSession)

	// Graph & stats endpoints
	mux.HandleFunc("/graph", graphHandler.BuildGraph)
	//mux.HandleFunc("/stats", statsHandler.GetStats) to-do

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Terraform Wizard backend"))
	})

	handler := enableCORS(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	addr := "0.0.0.0:" + port
	log.Printf("Terraform Wizard backend running on port%s\n", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
