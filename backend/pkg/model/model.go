package model


// Package model defines the core data structures for representing Terraform resources and their relationships.
// This includes the Resource struct, which captures both pure parsing data as well as enriched information like categories and locations.

import (
	"github.com/hashicorp/hcl/v2"
)



type Resource struct {

	// core identifying fields
	ID            string // e.g. "aws_instance.web"
	Type          string // e.g. "aws_instance
	Provider      string // e.g. "aws
	Name          string // e.g. "web"

	// raw attributes and expressions from HCL parsing
	Attributes    map[string]string // literal attributes with resolved values where possible
	Expressions   map[string]hcl.Expression `json:"-"` // raw HCL expressions for attributes that couldn't be resolved to literals during parsing
	SourceFiles   []string // list of source files where this resource is declared
	DependsOn     []string // IDs of other resources this one depends on (from "depends_on" attribute)
	// UnresolvedDependencies []string // TODO: future field — references that were detected but not matched to any declared resource/module block
	FilePath      string   // source file where this resource block is declared
	LineNumber    int      // line number of the resource block declaration

	//derived and enriched fields
	DisplayName   string // A more user-friendly name, if available
	DeclaredCount *int	//aka "instance count"
	ForEach       bool // true if this resource uses "for_each" 
	Category      ResourceCategory // e.g. compute, storage, networking, etc. (enriched from registry)
	Location 	 *ResourceLocation // enriched from attributes like "region", "zone", "location", etc.
}

type ResourceLocation struct {
	Kind  string // "region" | "zone" | "location" | "global"
	Value string // literal or expression string
}

type ProviderContext struct {
	Provider string
	Region   string
}

type Graph struct {
	Nodes []Resource
	Edges map[string][]string // from → to
}

type ResourceCategory string

const (
    Compute        ResourceCategory = "compute"
    Networking     ResourceCategory = "networking"
    Storage        ResourceCategory = "storage"
    Data           ResourceCategory = "data"
    Messaging      ResourceCategory = "messaging"
    AI              ResourceCategory = "ai"
    IAM            ResourceCategory = "iam"
    Security       ResourceCategory = "security"
    Observability  ResourceCategory = "observability"
    Billing        ResourceCategory = "billing"
    DNS            ResourceCategory = "dns"
    Module         ResourceCategory = "module"
    Other          ResourceCategory = "other"
)


type Stats struct {
	TotalResources    int
	ComputeCount      int
	StorageCount      int
	GPUCount          int
	NetworkingCount   int
	DistinctLocations int // Different datacenters, or geographical regions
	CloudProviders    []string
}

type CostEstimate struct {
	MonthlyUSD float64
	Breakdown  map[string]float64 // resource → cost
}
