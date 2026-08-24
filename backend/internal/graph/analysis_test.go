package graph_test

import (
	"testing"

	"github.com/Nils-Svensson/terraform-wizard/backend/internal/graph"
)

// makeGraph builds a Graph from node IDs and directed edges.
// An edge {from, to} means "to depends on from" — matching AddEdge(dep, resourceID)
// in builder.go. Nodes with no incoming edges are roots at depth 0.
func makeGraph(nodeIDs []string, edges [][2]string) *graph.Graph {
	nodes := make([]graph.Node, len(nodeIDs))
	for i, id := range nodeIDs {
		nodes[i] = graph.Node{ID: id}
	}
	edgeList := make([]graph.Edge, len(edges))
	for i, e := range edges {
		edgeList[i] = graph.Edge{From: e[0], To: e[1], Relation: "dep"}
	}
	return &graph.Graph{Nodes: nodes, Edges: edgeList}
}

func depth(a *graph.GraphAnalysis, id string) int {
	return a.TraversalData[id].Depth
}

// TestChainDepth verifies a simple linear chain assigns depths 0,1,2,3.
// A→B→C→D: A is the dependency root; D is the final dependent.
func TestChainDepth(t *testing.T) {
	g := makeGraph(
		[]string{"A", "B", "C", "D"},
		[][2]string{{"A", "B"}, {"B", "C"}, {"C", "D"}},
	)
	a := graph.AnalyzeGraph(g)
	for id, want := range map[string]int{"A": 0, "B": 1, "C": 2, "D": 3} {
		if got := depth(a, id); got != want {
			t.Errorf("%s: depth want %d got %d", id, want, got)
		}
	}
}

// TestDiamondDepth verifies that a symmetric diamond gives D depth 2.
//
//	A
//	├─ B ─┐
//	└─ C ─┤
//	      D   depth(D) must be 2
func TestDiamondDepth(t *testing.T) {
	g := makeGraph(
		[]string{"A", "B", "C", "D"},
		[][2]string{{"A", "B"}, {"A", "C"}, {"B", "D"}, {"C", "D"}},
	)
	a := graph.AnalyzeGraph(g)
	if got := depth(a, "D"); got != 2 {
		t.Fatalf("D depth want 2 got %d", got)
	}
}

// TestAsymmetricDiamondDepth verifies that the longest path wins when
// parents of a shared node are at different depths.
//
// A → B ──────────────→ D   (depth 2 via B)
// A → C → C2 ─────────→ D   (depth 3 via C2)
//
// Correct depth(D) = 3.
func TestAsymmetricDiamondDepth(t *testing.T) {
	g := makeGraph(
		[]string{"A", "B", "C", "C2", "D"},
		[][2]string{
			{"A", "B"}, {"B", "D"},
			{"A", "C"}, {"C", "C2"}, {"C2", "D"},
		},
	)
	a := graph.AnalyzeGraph(g)
	for id, want := range map[string]int{"A": 0, "B": 1, "C": 1, "C2": 2, "D": 3} {
		if got := depth(a, id); got != want {
			t.Errorf("%s: depth want %d got %d", id, want, got)
		}
	}
}

// TestMultipleComponents verifies that disconnected components each get
// correct depths and distinct ComponentIDs.
func TestMultipleComponents(t *testing.T) {
	// Component 1: A→B→C
	// Component 2: X→Y
	g := makeGraph(
		[]string{"A", "B", "C", "X", "Y"},
		[][2]string{{"A", "B"}, {"B", "C"}, {"X", "Y"}},
	)
	a := graph.AnalyzeGraph(g)

	for id, want := range map[string]int{"A": 0, "B": 1, "C": 2, "X": 0, "Y": 1} {
		if got := depth(a, id); got != want {
			t.Errorf("%s: depth want %d got %d", id, want, got)
		}
	}

	comp1 := a.TraversalData["A"].ComponentID
	comp2 := a.TraversalData["X"].ComponentID
	if comp1 == "" || comp2 == "" {
		t.Fatal("component IDs must not be empty")
	}
	if comp1 == comp2 {
		t.Fatalf("A and X should be in different components, both got %q", comp1)
	}
	if a.TraversalData["B"].ComponentID != comp1 || a.TraversalData["C"].ComponentID != comp1 {
		t.Error("B and C should share A's component")
	}
}

// TestOrphanNodes verifies that nodes with no edges appear in OrphanNodes.
func TestOrphanNodes(t *testing.T) {
	g := makeGraph(
		[]string{"A", "B", "Orphan1", "Orphan2"},
		[][2]string{{"A", "B"}},
	)
	a := graph.AnalyzeGraph(g)

	orphanSet := map[string]bool{}
	for _, id := range a.OrphanNodes {
		orphanSet[id] = true
	}
	for _, id := range []string{"Orphan1", "Orphan2"} {
		if !orphanSet[id] {
			t.Errorf("%s should be in OrphanNodes", id)
		}
	}
	for _, id := range []string{"A", "B"} {
		if orphanSet[id] {
			t.Errorf("%s should not be in OrphanNodes", id)
		}
	}
}

// TestCyclicDetection verifies that nodes forming a cycle are marked isCyclic
// and still receive a ComponentID. D is a root that feeds into the cycle and
// should NOT be marked cyclic (its own indegree reaches zero).
func TestCyclicDetection(t *testing.T) {
	// D → A ─→ B ─→ C ─┐
	//          └────────┘  (A→B→C→A cycle)
	g := makeGraph(
		[]string{"A", "B", "C", "D"},
		[][2]string{{"A", "B"}, {"B", "C"}, {"C", "A"}, {"D", "A"}},
	)
	a := graph.AnalyzeGraph(g)

	for _, id := range []string{"A", "B", "C"} {
		td := a.TraversalData[id]
		if !td.IsCyclic {
			t.Errorf("%s should be marked cyclic", id)
		}
		if td.ComponentID == "" {
			t.Errorf("%s cyclic node must have a ComponentID", id)
		}
	}
	if a.TraversalData["D"].IsCyclic {
		t.Error("D should not be marked cyclic (its indegree is resolved)")
	}
	if a.TraversalData["D"].ComponentID == "" {
		t.Error("D must have a ComponentID even though it feeds into a cyclic component")
	}
}

// TestMaxDepthPerComponent verifies that MaxDepth tracks the longest chain
// within each component.
func TestMaxDepthPerComponent(t *testing.T) {
	// A→B→C→D→E  (max depth = 4)
	g := makeGraph(
		[]string{"A", "B", "C", "D", "E"},
		[][2]string{{"A", "B"}, {"B", "C"}, {"C", "D"}, {"D", "E"}},
	)
	a := graph.AnalyzeGraph(g)

	compID := a.TraversalData["A"].ComponentID
	if got := a.MaxDepth[compID]; got != 4 {
		t.Fatalf("MaxDepth want 4 got %d", got)
	}
}
