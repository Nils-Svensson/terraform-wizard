package registry

import (
	"strings"
	"github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"
)

// to be optimized later
func (r *Registry) GetResourceCategory(resourceType string) model.ResourceCategory {
	var (
		bestCategory model.ResourceCategory = model.Other
		longestMatch int                    = 0
	)

	for category, prefixes := range r.Categories {
		for _, prefix := range prefixes {
			if strings.HasPrefix(resourceType, prefix) {
				if len(prefix) > longestMatch {
					longestMatch = len(prefix)
					bestCategory = model.ResourceCategory(category)
				}
			}
		}
	}

	return bestCategory
}

