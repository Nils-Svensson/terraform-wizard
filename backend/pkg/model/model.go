package model


// Package model defines the core data structures for representing Terraform resources and their relationships.
import (
	"github.com/hashicorp/hcl/v2"
)



type Resource struct {
	ID            string
	Type          string
	Provider      string
	Name          string
	Region        string
	Attributes    map[string]string
	DependsOn     []string
	Expressions   map[string]hcl.Expression `json:"-"`

	DeclaredCount *int
	ForEach       bool
	SourceFiles   []string

	Category      ResourceCategory
	Location 	 *ResourceLocation
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
    Compute         ResourceCategory = "compute"
    Networking      ResourceCategory = "networking"
    Storage         ResourceCategory = "storage"
    DataEngineering ResourceCategory = "data_engineering"
    AI				ResourceCategory = "ai"
    IAM             ResourceCategory = "iam"
    Security        ResourceCategory = "security"
    Observability   ResourceCategory = "observability"
	Billing         ResourceCategory = "billing"
	DNS 		  	ResourceCategory = "dns"
	Other		    ResourceCategory = "other"
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
