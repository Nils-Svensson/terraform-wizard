package ingest

import (
	"io"
	"mime/multipart"

	"terraform-wizard/backend/internal/parser"
	"terraform-wizard/backend/pkg/model"
)

type Service struct {
	parser *parser.Service
}

func New(parser *parser.Service) *Service {
	return &Service{parser: parser}
}

func (s *Service) ProcessFiles(files []*multipart.FileHeader) ([]*model.Resource, error) {
	var all []*model.Resource

	for _, f := range files {
		file, err := f.Open()
		if err != nil {
			return nil, err
		}
		defer file.Close()

		content, err := io.ReadAll(file)
		if err != nil {
			return nil, err
		}

		resources, err := s.parser.Parse(content)
		if err != nil {
			return nil, err
		}

		all = append(all, resources...)
	}

	return all, nil
}
