package registry

import (
	"context"
	"fmt"
	"sync"
)

type RegistryManager struct {
	mu         sync.RWMutex
	registries map[string]*Registry
}

func NewRegistryManager() *RegistryManager {
	return &RegistryManager{
		registries: make(map[string]*Registry),
	}
}

func (m *RegistryManager) LoadSource(
	ctx context.Context,
	source RegistrySource,
) error {

	rc, err := source.Load(ctx)
	if err != nil {
		return fmt.Errorf("load source %s: %w", source.Name(), err)
	}
	defer rc.Close()

	reg := &Registry{}
	if err := reg.Load(ctx, rc); err != nil {
		return fmt.Errorf("parse registry %s: %w", source.Name(), err)
	}

	m.mu.Lock()
	m.registries[source.Name()] = reg
	m.mu.Unlock()

	return nil
}

func (m *RegistryManager) Get(provider string) *Registry {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.registries[provider]
}

/*// RegistryManager holds provider specific registries (GCP, AWS, Azure, etc).
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
*/