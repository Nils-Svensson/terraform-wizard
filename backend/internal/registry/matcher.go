package registry

import (
	"strings"
	"github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"
)


func (r *Registry) GetResourceCategory(resourceType string) model.ResourceCategory {

	// TODO: implement longest prefix match
	for category, prefixes := range r.Categories {
		for _, prefix := range prefixes {
			if strings.HasPrefix(resourceType, prefix) {
				return model.ResourceCategory(category)
			}
		}
	}
	return model.Other
}
