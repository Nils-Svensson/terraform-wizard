package storage

import (
	"sync"

	"backend/pkg/model"
)

type Storage struct {
	mu       sync.RWMutex
	sessions map[string][]model.Resource
}

func New() *Storage {
	return &Storage{
		sessions: make(map[string][]model.Resource),
	}
}

func (s *Storage) Save(sessionID string, resources []model.Resource) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[sessionID] = resources
}

func (s *Storage) Get(sessionID string) ([]model.Resource, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res, ok := s.sessions[sessionID]
	return res, ok
}
