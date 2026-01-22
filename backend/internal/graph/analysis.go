package graph

// Contains graph analysis functions such as cycle detection,
// connected components identification, depth calculation, etc.

import (
	"fmt"
)

// Data derived from graph traversal algorithms
type TraversalData struct {
	ComponentID string `json:"component_id"`
	Depth       int    `json:"depth"`
	IsCyclic    bool   `json:"is_cyclic"`
}

type GraphAnalysis struct {
	TraversalData map[string]TraversalData `json:"traversalData"` // keyed by nodeID
	Degree 	  	  map[string]int           `json:"degree"`        // keyed by nodeID
}

// BuildAdjacency constructs forward and reverse adjacency lists from the graph.
func BuildAdjacency(g *Graph) (map[string][]string, map[string][]string) {
	forward := make(map[string][]string)
	reverse := make(map[string][]string)

	for _, n := range g.Nodes {
		forward[n.ID] = []string{} // initialize empty slices keyed by node IDs
		reverse[n.ID] = []string{}
	}

	// e.From and e.To are node IDs under the hood.
	for _, e := range g.Edges {
		forward[e.From] = append(forward[e.From], e.To) // Appends nodes reachable from 'e.From' to the slice
		reverse[e.To] = append(reverse[e.To], e.From)   // Appends nodes that can reach 'e.To' to the slice
	}
	fmt.Println("EDGES:")
	for _, e := range g.Edges {
		fmt.Printf("  %s -> %s\n", e.From, e.To)
	}

	return forward, reverse
}
func findDegree(g * Graph) map[string]int {

	degree := make(map[string]int)
	for _, n := range g.Nodes {
		degree[n.ID] = 0
	}
	for _, e := range g.Edges {
		degree[e.From]++
		degree[e.To]++
	}
	return degree
}

func findComponents(g *Graph) map[string]string {
	forward, reverse := BuildAdjacency(g)

	component := make(map[string]string)
	visited := make(map[string]bool) // Keeps track of visited nodes and prevents infinite recursion

	componentIndex := 0

	var dfs func(string)
	dfs = func(id string) {
		visited[id] = true
		component[id] = fmt.Sprintf("component-%d", componentIndex)

		// Visit everything this node depends on / points to
		for _, n := range forward[id] {
			if !visited[n] {
				dfs(n)
			}
		}
		// Visit everything that depends on this node
		for _, n := range reverse[id] {
			if !visited[n] {
				dfs(n)
			}
		}
	}

	for _, n := range g.Nodes {
		if !visited[n.ID] {
			componentIndex++
			dfs(n.ID)
		}
	}

	return component
}

// Given a connected component (set of nodes), computes depth of each node and wether it's part of a cycle.
func analyzeComponent(nodes []string, forward map[string][]string, reverse map[string][]string,
) map[string]TraversalData {

	data := make(map[string]TraversalData)
	indegree := make(map[string]int)

	for _, id := range nodes {
		indegree[id] = len(reverse[id]) // number of incoming edges for a node
		data[id] = TraversalData{Depth: 0}
	}

	queue := []string{}

	for id, deg := range indegree {
		if deg == 0 {
			queue = append(queue, id)
		}
	}

	visitedCount := 0

	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		visitedCount++

		for _, next := range forward[cur] {
			indegree[next]--
			if indegree[next] == 0 {
				data[next] = TraversalData{
					Depth: data[cur].Depth + 1,
				}
				queue = append(queue, next)
			}
		}
	}

	// Cycle detection
	if visitedCount < len(nodes) {
		for id, deg := range indegree {
			if deg > 0 {
				td := data[id]
				td.IsCyclic = true
				data[id] = td
			}
		}
	}

	return data
}

func AnalyzeGraph(g *Graph) *GraphAnalysis {
	forward, reverse := BuildAdjacency(g)
	componentMap := findComponents(g)
	degree := findDegree(g)

	// group nodes by component
	components := make(map[string][]string)
	for nodeID, compID := range componentMap {
		components[compID] = append(components[compID], nodeID)
	}

	result := &GraphAnalysis{
		TraversalData: make(map[string]TraversalData),
		Degree:        degree,
	}

	// Analyze each component separately
	for compID, nodes := range components {
		compData := analyzeComponent(nodes, forward, reverse)
		for nodeID, td := range compData {
			td.ComponentID = compID
			result.TraversalData[nodeID] = td
		}
	}

	return result
}
