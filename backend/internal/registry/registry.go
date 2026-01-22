package registry
import (
	"context"
	"io"
	"gopkg.in/yaml.v3"
)

type Registry struct {
	Providers  string              `yaml:"provider"`
	Categories map[string][]string `yaml:"categories"`
}

type RegistrySource interface {
	Name () string
	Load(ctx context.Context) (io.ReadCloser, error) // readcloser to allow caller to defer Close()
}

func (r *Registry) Load(ctx context.Context, reader io.Reader) error {
	decoder := yaml.NewDecoder(reader)
	return decoder.Decode(r)
}