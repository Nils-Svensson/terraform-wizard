package parser

import (
	"terraform-wizard/backend/pkg/model"
)

type Service struct{}

func New() *Service {
	return &Service{}
}

// For now, return an empty resource list until parsing is implemented.
func (s *Service) Parse(content []byte) ([]model.Resource, error) {
	// TODO: implement real HCL parsing
	return []model.Resource{}, nil
}
