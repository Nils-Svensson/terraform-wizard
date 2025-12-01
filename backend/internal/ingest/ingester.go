package ingest

import (
	"fmt"
	"io"
	"mime/multipart"

	"github.com/Nils-Svensson/terraform-wizard/backend/internal/parser"
	"github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"
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
		fmt.Println("file name: ", file)
		if err != nil {
			return nil, err
		}
		defer file.Close()

		content, err := io.ReadAll(file)
		if err != nil {
			return nil, err
		}

		resources, err := s.parser.Parse(content, f.Filename)
		if err != nil {
			return nil, err
		}

		all = append(all, resources...)
	}

	return all, nil
}
