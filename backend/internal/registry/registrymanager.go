package registry


// RegistryManager holds provider specific registries (GCP, AWS, Azure, etc).
// It acts as a runtime lookup table keyed by provider name
// (e.g. "google", "aws", "azurerm").
type RegistryManager struct {
	registries map[string]*Registry
}

// NewRegistryManager creates a manager from pre-loaded registries.
// main.go is responsible for loading YAML and wiring providers.
func NewRegistryManager(regs map[string]*Registry) *RegistryManager {
	return &RegistryManager{
		registries: regs,
	}
}

// Get returns the registry for a given provider.
// If the provider is unknown or unsupported, it returns nil.
// This allows callers to fall back gracefully.
func (m *RegistryManager) Get(provider string) *Registry {
	if r, ok := m.registries[provider]; ok {
		return r
	}
	return nil
}
