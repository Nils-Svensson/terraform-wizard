package graph

import (
	"strings"

	"github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"
)

// an attribute whose name contains any of these strings has its value replaced with "[redacted]".
var sensitiveAttrSuffixes = []string{
	"password", "passwd", "secret", "token", "api_key", "apikey",
	"access_key", "secret_key", "private_key", "client_secret",
	"auth_token", "certificate", "cert_pem", "private_pem",
	"credential", "credentials",
}

func redactSensitiveAttrs(attrs map[string]string) map[string]string {
	if len(attrs) == 0 {
		return attrs
	}
	out := make(map[string]string, len(attrs))
	for k, v := range attrs {
		lower := strings.ToLower(k)
		sensitive := false
		for _, s := range sensitiveAttrSuffixes {
			if strings.Contains(lower, s) {
				sensitive = true
				break
			}
		}
		if sensitive {
			out[k] = "[redacted]"
		} else {
			out[k] = v
		}
	}
	return out
}

type Node struct {
	ID       string                  `json:"id"`
	Type     string                  `json:"type"`
	Name     string                  `json:"name"`
	Provider string                  `json:"provider"`
	Attr     map[string]string       `json:"attr,omitempty"`
	DisplayName string               `json:"displayname,omitempty"`

	InstanceCount   *int 			 `json:"instancecount"`
	ForEach         bool 			 `json:"foreach"`
	OccurrenceCount int  			 `json:"occurrencecount"`

	Category model.ResourceCategory  `json:"category"`
	Location *model.ResourceLocation `json:"location,omitempty"`

	ModulePath string 				 `json:"modulepath,omitempty"`
	FilePath   string 				 `json:"filepath,omitempty"`
	LineNumber int					 `json:"line,omitempty"`
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
			g.Nodes[i].OccurrenceCount++ // increment counter
			return
		}
	}

	g.Nodes = append(g.Nodes, Node{
		ID:              r.ID,
		Type:            r.Type,
		Name:            r.Name,
		Provider:        r.Provider,
		DisplayName:     r.DisplayName,
		Attr:            redactSensitiveAttrs(r.Attributes),
		OccurrenceCount: 1,
		InstanceCount:   r.DeclaredCount,
		ForEach:         r.ForEach,
		Category:        r.Category,
		Location:        r.Location,
		FilePath:        r.FilePath,
		LineNumber:      r.LineNumber,
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
