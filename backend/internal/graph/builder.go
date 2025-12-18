package graph

import (
	"fmt"

	"github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"
)

type Builder struct{}

func NewBuilder() *Builder {
	return &Builder{}
}

func (b *Builder) Build(resources []*model.Resource) *Graph {

	fmt.Println("BUILD INPUT COUNT:", len(resources))
	for _, r := range resources {
		fmt.Println("RESOURCE:", r.ID, r.Type, r.Name)
	}

	g := NewGraph()

	// 1. Add nodes
	for _, r := range resources {
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
