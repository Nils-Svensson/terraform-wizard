package graph

import "github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"

type Node struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Name     string                 `json:"name"`
	Provider string                 `json:"provider"`
	Region   string                 `json:"region"`
	Attr     map[string]interface{} `json:"attr"`
	Count    int                    `json:"count"`
}

type Edge struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Relation string `json:"relation"`
	Count    int    `json:"count"`
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
	for i, existing := range g.Nodes {
		if existing.ID == r.ID {
			g.Nodes[i].Count++ // increment counter
			return
		}
	}

	g.Nodes = append(g.Nodes, Node{
		ID:       r.ID,
		Type:     r.Type,
		Name:     r.Name,
		Provider: r.Provider,
		Region:   r.Region,
		Attr:     r.Attributes,
		Count:    1,
	})
}

func (g *Graph) AddEdge(from, to, relation string) {

	for i, e := range g.Edges {
		if e.From == from && e.To == to && e.Relation == relation {
			g.Edges[i].Count++
			return
		}
	}

	g.Edges = append(g.Edges, Edge{
		From:     from,
		To:       to,
		Relation: relation,
	})
}
