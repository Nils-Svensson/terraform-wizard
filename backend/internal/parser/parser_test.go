package parser_test


import (
	"os"
	"testing"

	"github.com/Nils-Svensson/terraform-wizard/backend/internal/parser"
)

func TestTerraformParserDependencies(t *testing.T) {
	content, err := os.ReadFile("../testdata/complex_gcp.tf")
	if err != nil {
		t.Fatalf("failed to read tf file: %v", err)
	}

	p := parser.New()
	resources, err := p.Parse(content, "complex_gcp.tf")
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}

	index := map[string][]string{}
	for _, r := range resources {
		index[r.ID] = r.DependsOn
	}

	// ───────── Assertions ─────────

	assertDep(t, index, "google_compute_subnetwork.subnet",
		"google_compute_network.vpc",
	)

	assertDep(t, index, "google_compute_instance_template.web",
		"google_compute_subnetwork.subnet",
		"google_service_account.app",
	)

	assertDep(t, index, "google_compute_instance_group_manager.web",
		"google_compute_instance_template.web",
	)

	assertDep(t, index, "google_compute_autoscaler.web",
		"google_compute_instance_group_manager.web",
	)

	assertDep(t, index, "google_compute_global_forwarding_rule.http",
		"google_compute_target_http_proxy.proxy",
	)

	// Orphans
	assertNoDeps(t, index, "google_storage_bucket.assets")
	assertNoDeps(t, index, "google_pubsub_topic.events")
}

func assertDep(t *testing.T, index map[string][]string, node string, deps ...string) {
	t.Helper()

	actual := index[node]
	for _, expected := range deps {
		found := false
		for _, d := range actual {
			if d == expected {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("expected %s to depend on %s, got %v", node, expected, actual)
		}
	}
}

func assertNoDeps(t *testing.T, index map[string][]string, node string) {
	t.Helper()

	if len(index[node]) != 0 {
		t.Fatalf("expected %s to have no deps, got %v", node, index[node])
	}
}
