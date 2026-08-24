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
	TraversalData     map[string]TraversalData `json:"traversalData"` // keyed by nodeID
	Degree 	  	      map[string]int           `json:"degree"`        // keyed by nodeID
	OrphanNodes       []string                 `json:"orphanNodes"`   // list of nodeIDs with no connections
	Roots 		      map[string][]string      `json:"roots"`         // keyed by componentID, values are nodeIDs of root nodes in that component
	TotalNodes 	  	  int                      `json:"totalNodes"`    // total number of nodes in the graph
	NodesPerComponent map[string]int    	   `json:"nodesByComponent"` // keyed by componentID, values are number of nodes in that component
	Components		  map[string][]string      `json:"components"`     // keyed by componentID, values
	MaxDepth		  map[string]int		   `json:"maxDepth"`       // keyed by componentID, values are max depth of that component  
	Parents 		  map[string][]string      `json:"parents"`        // keyed by nodeID, values are nodeIDs of parent nodes (nodes that point to this node)   
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

	return forward, reverse
}


// Calculates the degree of each node in the graph (number of incoming + outgoing edges).
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

func findOrphanNodes(g *Graph, degree map[string]int) []string {
	orphaned := []string{}
	for _, n := range g.Nodes {
		if degree[n.ID] == 0 {
			orphaned = append(orphaned, n.ID)
		}
	}
	return orphaned
}




func findComponents(g *Graph, forward, reverse map[string][]string) map[string]string {

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

func nodesPerComponent(componentMap map[string]string) map[string]int {
	counts := make(map[string]int)
	for _, compID := range componentMap {
		counts[compID]++
	}
	return counts
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
			// Update child depth on every edge traversal, taking the maximum
			// across all parents seen so far. This makes diamond-dependency
			// depth correct regardless of BFS processing order.
			if newDepth := data[cur].Depth + 1; newDepth > data[next].Depth {
				td := data[next]
				td.Depth = newDepth
				data[next] = td
			}
			if indegree[next] == 0 {
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



func findRoots(g *Graph, reverse map[string][]string, componentMap map[string]string) map[string][]string {

	roots := make(map[string][]string)

	for _, n := range g.Nodes {
		if len(reverse[n.ID]) == 0 {
			comp := componentMap[n.ID]
			roots[comp] = append(roots[comp], n.ID)
		}
	}

	return roots
}

func AnalyzeGraph(g *Graph) *GraphAnalysis {
	forward, reverse := BuildAdjacency(g)
	componentMap := findComponents(g, forward, reverse)
	degree := findDegree(g)
	orphanNodes := findOrphanNodes(g, degree)
	roots := findRoots(g, reverse, componentMap)
	npc := nodesPerComponent(componentMap)

	// group nodes by component
	components := make(map[string][]string)
	for nodeID, compID := range componentMap {
		components[compID] = append(components[compID], nodeID)
	}

	result := &GraphAnalysis{
		TraversalData: make(map[string]TraversalData),
		Degree:        degree,
		OrphanNodes:   orphanNodes,
		Roots:         roots,
		TotalNodes:    len(g.Nodes),
		Components:	   components,
		NodesPerComponent: npc,
		MaxDepth:	   make(map[string]int),
		Parents:       reverse, 
	}

	// Analyze each component separately
	for compID, nodes := range components {

		compData := analyzeComponent(nodes, forward, reverse)

		localMax := 0

		for nodeID, td := range compData {

			td.ComponentID = compID
			result.TraversalData[nodeID] = td

			if td.Depth > localMax {
				localMax = td.Depth
			}
		}

		result.MaxDepth[compID] = localMax
	}



	return result
}
