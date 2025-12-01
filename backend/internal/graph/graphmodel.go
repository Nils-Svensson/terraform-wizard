package graph

import "github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"

type Node struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Name     string                 `json:"name"`
	Provider string                 `json:"provider"`
	Region   string                 `json:"region"`
	Attr     map[string]interface{} `json:"attr"`
}

type Edge struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Relation string `json:"relation"`
}

type Graph struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

func NewGraph() *Graph {
	return &Graph{
		Nodes: []Node{},
		Edges: []Edge{},
	}
}

func (g *Graph) AddNode(r *model.Resource) {
	g.Nodes = append(g.Nodes, Node{
		ID:       r.ID,
		Type:     r.Type,
		Name:     r.Name,
		Provider: r.Provider,
		Region:   r.Region,
		Attr:     r.Attributes,
	})
}

func (g *Graph) AddEdge(from, to, relation string) {
	g.Edges = append(g.Edges, Edge{
		From:     from,
		To:       to,
		Relation: relation,
	})
}
