package parser_test

import (
	"os"
	"testing"

	"github.com/Nils-Svensson/terraform-wizard/backend/internal/parser"
	"github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"
)

// ─── helpers ──────────────────────────────────────────────────────────────────

func buildIndex(resources []*model.Resource) map[string]*model.Resource {
	m := make(map[string]*model.Resource, len(resources))
	for _, r := range resources {
		m[r.ID] = r
	}
	return m
}

func idKeys(m map[string]*model.Resource) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

func containsStr(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}

func assertDep(t *testing.T, index map[string][]string, node string, deps ...string) {
	t.Helper()
	actual := index[node]
	for _, expected := range deps {
		if !containsStr(actual, expected) {
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

// ─── original test ────────────────────────────────────────────────────────────

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

// ─── module tests ─────────────────────────────────────────────────────────────

// TestModuleBlockParsed verifies that a module block is emitted as a resource
// with ID "module.<name>", that its DisplayName reflects the source path, and
// that a resource referencing the module captures that dependency.
func TestModuleBlockParsed(t *testing.T) {
	content, err := os.ReadFile("../testdata/module_basic.tf")
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}

	p := parser.New()
	resources, err := p.Parse(content, "module_basic.tf")
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}

	byID := buildIndex(resources)

	mod, ok := byID["module.networking"]
	if !ok {
		t.Fatalf("expected resource with ID 'module.networking', got IDs: %v", idKeys(byID))
	}

	if mod.DisplayName != "./modules/networking" {
		t.Errorf("expected DisplayName './modules/networking', got %q", mod.DisplayName)
	}

	app, ok := byID["aws_instance.app"]
	if !ok {
		t.Fatalf("expected resource 'aws_instance.app', got IDs: %v", idKeys(byID))
	}
	if !containsStr(app.DependsOn, "module.networking") {
		t.Errorf("aws_instance.app should depend on module.networking, got DependsOn=%v", app.DependsOn)
	}
}

// TestMissingModuleGraceful verifies that a reference to an undeclared module
// does not cause an error and is silently dropped from DependsOn.
func TestMissingModuleGraceful(t *testing.T) {
	content, err := os.ReadFile("../testdata/module_missing.tf")
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}

	p := parser.New()
	resources, err := p.Parse(content, "module_missing.tf")
	if err != nil {
		t.Fatalf("parse must not return an error for missing module refs, got: %v", err)
	}

	byID := buildIndex(resources)

	fn, ok := byID["aws_lambda_function.fn"]
	if !ok {
		t.Fatalf("expected resource 'aws_lambda_function.fn', got IDs: %v", idKeys(byID))
	}

	if containsStr(fn.DependsOn, "module.nonexistent") {
		t.Errorf("aws_lambda_function.fn should NOT depend on undeclared module.nonexistent, got DependsOn=%v", fn.DependsOn)
	}
}

// TestModuleChainDependencies verifies that a chain of module–module and
// resource–module references is resolved correctly.
func TestModuleChainDependencies(t *testing.T) {
	content, err := os.ReadFile("../testdata/module_chain.tf")
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}

	p := parser.New()
	resources, err := p.Parse(content, "module_chain.tf")
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}

	byID := buildIndex(resources)

	for _, id := range []string{"module.vpc", "module.eks", "helm_release.apps"} {
		if _, ok := byID[id]; !ok {
			t.Errorf("expected resource %q to exist, got IDs: %v", id, idKeys(byID))
		}
	}

	eks, ok := byID["module.eks"]
	if !ok {
		t.Fatalf("module.eks missing")
	}
	if !containsStr(eks.DependsOn, "module.vpc") {
		t.Errorf("module.eks should depend on module.vpc, got DependsOn=%v", eks.DependsOn)
	}

	apps, ok := byID["helm_release.apps"]
	if !ok {
		t.Fatalf("helm_release.apps missing")
	}
	if !containsStr(apps.DependsOn, "module.eks") {
		t.Errorf("helm_release.apps should depend on module.eks, got DependsOn=%v", apps.DependsOn)
	}
}

// TestModuleWithMetaArguments verifies that module blocks with count, for_each,
// and depends_on meta-arguments are parsed correctly and their dependencies
// are captured.
func TestModuleWithMetaArguments(t *testing.T) {
	content, err := os.ReadFile("../testdata/module_meta.tf")
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}

	p := parser.New()
	resources, err := p.Parse(content, "module_meta.tf")
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}

	byID := buildIndex(resources)

	for _, id := range []string{"module.bucket", "module.topic"} {
		if _, ok := byID[id]; !ok {
			t.Errorf("expected resource %q to exist, got IDs: %v", id, idKeys(byID))
		}
	}

	// module.topic depends on module.bucket via explicit depends_on
	topic, ok := byID["module.topic"]
	if !ok {
		t.Fatalf("module.topic missing")
	}
	if !containsStr(topic.DependsOn, "module.bucket") {
		t.Errorf("module.topic should depend on module.bucket (via depends_on), got DependsOn=%v", topic.DependsOn)
	}

	// google_pubsub_subscription.sub depends on module.topic
	sub, ok := byID["google_pubsub_subscription.sub"]
	if !ok {
		t.Fatalf("google_pubsub_subscription.sub missing")
	}
	if !containsStr(sub.DependsOn, "module.topic") {
		t.Errorf("google_pubsub_subscription.sub should depend on module.topic, got DependsOn=%v", sub.DependsOn)
	}
}

// TestExplicitDependsOn verifies that a resource with an explicit
// depends_on = [<other_resource>] meta-argument has that dependency captured.
func TestExplicitDependsOn(t *testing.T) {
	const src = `
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_internet_gateway" "gw" {
  vpc_id     = aws_vpc.main.id
  depends_on = [aws_vpc.main]
}
`
	p := parser.New()
	resources, err := p.Parse([]byte(src), "inline_depends_on.tf")
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}

	byID := buildIndex(resources)

	gw, ok := byID["aws_internet_gateway.gw"]
	if !ok {
		t.Fatalf("expected resource 'aws_internet_gateway.gw', got IDs: %v", idKeys(byID))
	}

	if !containsStr(gw.DependsOn, "aws_vpc.main") {
		t.Errorf("aws_internet_gateway.gw should depend on aws_vpc.main (explicit depends_on), got DependsOn=%v", gw.DependsOn)
	}
}
