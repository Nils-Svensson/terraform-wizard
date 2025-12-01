package parser

import (
	"fmt"

	"github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"
	"github.com/hashicorp/hcl/v2"
	"github.com/hashicorp/hcl/v2/hclparse"
	"github.com/hashicorp/hcl/v2/hclsyntax"
	"github.com/zclconf/go-cty/cty/gocty"
)

type Service struct {
	parser *hclparse.Parser
}

func New() *Service {
	return &Service{
		parser: hclparse.NewParser(),
	}
}

func (s *Service) Parse(content []byte, filname string) ([]*model.Resource, error) {
	file, diag := s.parser.ParseHCL(content, filname)
	if diag.HasErrors() {
		return nil, fmt.Errorf("failed to parse HCL: %s", diag.Error())
	}

	body, ok := file.Body.(*hclsyntax.Body)
	if !ok {
		return nil, fmt.Errorf("file is not valid HCL syntax")
	}

	var resources []*model.Resource

	for _, block := range body.Blocks {
		// Only "resource" and "data" blocks
		if block.Type != "resource" && block.Type != "data" {
			continue
		}

		if len(block.Labels) < 2 {
			continue
		}

		resourceType := block.Labels[0]
		resourceName := block.Labels[1]

		r := &model.Resource{
			ID:          fmt.Sprintf("%s.%s", resourceType, resourceName),
			Type:        resourceType,
			Name:        resourceName,
			Provider:    extractProvider(resourceType),
			Attributes:  map[string]any{},
			DependsOn:   []string{},
			Expressions: map[string]hcl.Expression{},
		}

		// Extract attributes
		for key, attr := range block.Body.Attributes {
			r.Expressions[key] = attr.Expr

			val, diag := attr.Expr.Value(nil)
			if !diag.HasErrors() {
				var out interface{}
				if err := gocty.FromCtyValue(val, &out); err == nil {
					r.Attributes[key] = out

					if key == "region" {
						if str, ok := out.(string); ok {
							r.Region = str
						}
					}
				}
			}
		}

		// Fallback: detect region from provider blocks
		if r.Region == "" {
			r.Region = findRegionInProviders(body)
		}

		resources = append(resources, r)
	}

	s.detectDependencies(resources)

	return resources, nil
}

func extractProvider(resourceType string) string {
	for i := 0; i < len(resourceType); i++ {
		if resourceType[i] == '_' {
			return resourceType[:i]
		}
	}
	return ""
}

// findRegionInProviders searches for provider blocks with a "region" attribute
// !!!NOTE: needs to be extended to detect regions inside variables, modules etc...!!!
func findRegionInProviders(body *hclsyntax.Body) string {
	for _, block := range body.Blocks {
		if block.Type != "provider" {
			continue
		}

		for key, attr := range block.Body.Attributes {
			if key == "region" {
				val, diag := attr.Expr.Value(nil)
				if !diag.HasErrors() {
					var out interface{}
					if err := gocty.FromCtyValue(val, &out); err == nil {
						if str, ok := out.(string); ok {
							return str
						}
					}
				}
			}
		}
	}
	return ""
}

func (s *Service) detectDependencies(resources []*model.Resource) {
	resourceIndex := make(map[string]bool)
	for _, r := range resources {
		resourceIndex[r.ID] = true
	}

	for _, res := range resources {
		for _, expr := range res.Expressions {
			traversals := expr.Variables()

			for _, tr := range traversals {
				if id := extractResourceID(tr); id != "" && resourceIndex[id] {
					res.DependsOn = append(res.DependsOn, id)
				}
			}
		}
	}
}

// extractResourceID tries to convert a traversal like:
// aws_instance.web.id  -> aws_instance.web
// aws_vpc.main         -> aws_vpc.main
// module.network.vpc   -> ""   (not a resource)
// var.region           -> ""   (ignore variables)

// !!!NOTE: needs to be modified to address more complex expressions!!!
func extractResourceID(tr hcl.Traversal) string {
	if len(tr) < 2 {
		return "" // must have at least resource_type + resource_name
	}

	// The root must be a resource type like "aws_vpc"
	root, ok := tr[0].(hcl.TraverseRoot)
	if !ok {
		return ""
	}

	typeName := root.Name

	// Reject certain roots
	if typeName == "var" || typeName == "local" {
		return ""
	}

	// Next element must be the resource name
	attr, ok := tr[1].(hcl.TraverseAttr)
	if !ok {
		return ""
	}

	resourceName := attr.Name

	return fmt.Sprintf("%s.%s", typeName, resourceName)
}
