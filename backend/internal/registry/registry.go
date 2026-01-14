package registry

type Registry struct {
	Providers  string              `yaml:"provider"`
	Categories map[string][]string `yaml:"categories"`
}

