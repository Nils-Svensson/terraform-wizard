package registry

import (
	"os"

	"gopkg.in/yaml.v3"
)

func LoadFromFile(path string) (*Registry, error) {
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

}
