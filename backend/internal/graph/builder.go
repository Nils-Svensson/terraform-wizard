package graph

import (
	"fmt"

	"github.com/Nils-Svensson/terraform-wizard/backend/internal/registry"
	"github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"
)

type Builder struct {
	// registryManager provides access to provider specific
	// categorization rules (GCP, AWS, Azure, etc).
	registryManager *registry.RegistryManager
}

// NewBuilder constructs a Builder with access to registries.
// The builder does NOT load registries itself; they must be pre-loaded
func NewBuilder(rm *registry.RegistryManager) *Builder {
	return &Builder{registryManager: rm}
}

func (b *Builder) Build(resources []*model.Resource) *Graph {

	fmt.Println("BUILD INPUT COUNT:", len(resources))
	for _, r := range resources {
		fmt.Println("RESOURCE:", r.Name, r.DisplayName)
		if r.DeclaredCount != nil {
			fmt.Println("DeclaredCount value:", *r.DeclaredCount)
		}

	}

	g := NewGraph()

	// 1. Add nodes
	for _, r := range resources {
		if r.Type == "module" {
			r.Category = model.Module
		} else if reg := b.registryManager.Get(r.Provider); reg != nil {
			r.Category = reg.GetResourceCategory(r.Type)
		} else {
			r.Category = model.Other
		}
		g.AddNode(r)
	}

	// 2. Add basic dependency edges
	for _, r := range resources {
		for _, dep := range r.DependsOn {
			g.AddEdge(dep, r.ID, "depends_on")
		}
	}

	return g
}
