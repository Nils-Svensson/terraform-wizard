package model

import (
	"github.com/hashicorp/hcl/v2"
)

type Resource struct {
	ID         string
	Type       string
	Provider   string
	Name       string
	Region     string
	Attributes map[string]any
	DependsOn  []string

	Expressions map[string]hcl.Expression `json:"-"`
}

type Graph struct {
	Nodes []Resource
	Edges map[string][]string // from → to
}

type Stats struct {
	TotalResources    int
	ComputeCount      int
	StorageCount      int
	GPUCount          int
	DistinctLocations int // Different datacenters, or geographical regions
	CloudProviders    []string
}

type CostEstimate struct {
	MonthlyUSD float64
	Breakdown  map[string]float64 // resource → cost
}
