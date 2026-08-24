package parser

import (
	"fmt"

	"github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"
	"github.com/hashicorp/hcl/v2"
	"github.com/hashicorp/hcl/v2/hclparse"
	"github.com/hashicorp/hcl/v2/hclsyntax"
	"github.com/zclconf/go-cty/cty"
	"github.com/zclconf/go-cty/cty/gocty"
	"strings"
)

type Service struct {
}

func New() *Service {

	return &Service{}
}

func (s *Service) Parse(content []byte, filename string) ([]*model.Resource, error) {
	parser := hclparse.NewParser()
	file, diag := parser.ParseHCL(content, filename)
	if diag.HasErrors() {
		return nil, fmt.Errorf("failed to parse HCL: %s", diag.Error())
	}

	body, ok := file.Body.(*hclsyntax.Body)
	if !ok {
		return nil, fmt.Errorf("file is not valid HCL syntax")
	}

	var resources []*model.Resource

	for _, block := range body.Blocks {
		// ── Module blocks ──────────────────────────────────────────────
		if block.Type == "module" {
			if len(block.Labels) < 1 {
				continue
			}
			moduleName := block.Labels[0]
			r := &model.Resource{
				ID:          fmt.Sprintf("module.%s", moduleName),
				Type:        "module",
				Name:        moduleName,
				Provider:    "module",
				Attributes:  map[string]string{},
				DependsOn:   []string{},
				Expressions: map[string]hcl.Expression{},
				FilePath:    filename,
				LineNumber:  block.TypeRange.Start.Line,
			}
			collectExpressionsFromBody(block.Body, r.Expressions)
			collectAttributes(block.Body, content, "", r.Attributes)
			// Use the source path as the display name
			if src, ok := r.Attributes["source"]; ok {
				r.DisplayName = strings.Trim(src, `"`)
			}
			resources = append(resources, r)
			continue
		}

		// ── Resource / data blocks ─────────────────────────────────────
		if block.Type != "resource" && block.Type != "data" {
			continue
		}

		if len(block.Labels) < 2 {
			continue
		}

		resourceType := block.Labels[0]
		resourceName := block.Labels[1]
		provider := extractProvider(resourceType)
		

		r := &model.Resource{
			ID:          fmt.Sprintf("%s.%s", resourceType, resourceName),
			Type:        resourceType,
			Name:        resourceName,
			Provider:    provider,
			Attributes:  map[string]string{},
			DependsOn:   []string{},
			Expressions: map[string]hcl.Expression{},
			ForEach:     false,
			Location:    nil,
			FilePath:    filename,
			LineNumber:  block.TypeRange.Start.Line,
		}

		// Collect ALL expressions recursively
		collectExpressionsFromBody(block.Body, r.Expressions)

		r.Attributes = map[string]string{}
		collectAttributes(block.Body, content, "", r.Attributes)

		locationPriority := []string{
			"zone",
			"location",
			"region",
			"locations",
			"global",
		}
		
		for _, k := range locationPriority {
			if v, ok := r.Attributes[k]; ok {
				r.Location = &model.ResourceLocation{
					Kind:  k,
					Value: v,
				}
				break
			}
		}
		
		// display name, try several common attribute names.
		// remember to change the rest of the code too.
		nameAttr := []string{
			"name",
			"resource_name",
			"resource_id",
			"display_name",
			"id",
		}

		for _, n := range nameAttr {
			if v, ok := r.Attributes[n]; ok {
				s := strings.Trim(v, `"`)
				r.DisplayName = s
				break
			}
		}
		// count
		if countAttr, exists := block.Body.Attributes["count"]; exists {
			val, diag := countAttr.Expr.Value(nil)
			if !diag.HasErrors() && val.IsKnown() && val.Type().Equals(cty.Number) {
				i, _ := val.AsBigFloat().Int64()
				ii := int(i)
				r.DeclaredCount = &ii
			}
		}

		if _, exists := block.Body.Attributes["for_each"]; exists {
			r.ForEach = true
		}


		resources = append(resources, r)
	}

	
	s.detectDependencies(resources)

	return resources, nil
}

// exprString extracts the original source string for an expression
func exprString(expr hcl.Expression, src []byte) string {
	r := expr.Range()
	return strings.TrimSpace(string(src[r.Start.Byte:r.End.Byte]))
}

// collectAttributes recursively collects all attributes from a body and its nested blocks
func collectAttributes(
	body *hclsyntax.Body,
	src []byte,
	prefix string,
	out map[string]string,
) {
	for name, attr := range body.Attributes {
		key := name
		if prefix != "" {
			key = prefix + "." + name
		}
		out[key] = exprString(attr.Expr, src)
	}

	for _, block := range body.Blocks {
		blockKey := block.Type
		if len(block.Labels) > 0 {
			blockKey += "[" + strings.Join(block.Labels, ",") + "]"
		}

		if prefix != "" {
			blockKey = prefix + "." + blockKey
		}

		collectAttributes(block.Body, src, blockKey, out)
	}
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

func collectExpressionsFromBody(
	body *hclsyntax.Body,
	out map[string]hcl.Expression,
) {
	// attributes at this level
	for name, attr := range body.Attributes {
		out[name] = attr.Expr
	}

	// recurse into nested blocks
	for _, block := range body.Blocks {
		collectExpressionsFromBody(block.Body, out)
	}
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
				id := extractResourceID(tr)
				if id == "" {
					continue
				}
				if resourceIndex[id] {
					res.DependsOn = append(res.DependsOn, id)
				}
				// TODO(silent-drop): if id is not in resourceIndex (e.g. a module
				// reference where the module block was never declared in any parsed
				// file), the dependency is silently dropped here. This can hide
				// dangling references that are bugs in the Terraform configuration.
				// To surface them, add an UnresolvedDependencies []string field to
				// model.Resource and append id here instead of discarding it.
			}
		}
	}
}

// extractResourceID tries to convert a traversal like:
// aws_instance.web.id       -> aws_instance.web
// aws_vpc.main              -> aws_vpc.main
// module.network.vpc_id     -> module.network  (module reference; output attr is stripped)
// var.region                -> ""              (ignore variables)

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
