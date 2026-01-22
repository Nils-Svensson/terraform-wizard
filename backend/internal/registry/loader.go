package registry

import (
	"os"
	"context"
	"io"
)

type FileSource struct {
	Path string
	Provider string
}

func (f *FileSource) Name() string {
	return f.Provider
}



func (f *FileSource) Load(ctx context.Context) (io.ReadCloser, error) {
	return os.Open(f.Path)
}


/*func LoadFromFile(path string) (*Registry, error) {
	// Read the YAML file
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var r Registry
	// Unmarshal YAML data into the struct
	if err := yaml.Unmarshal(data, &r); err != nil {
		return nil, err
	}

	return &r, nil

}*/
