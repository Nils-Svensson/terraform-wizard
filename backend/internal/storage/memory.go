package storage

import (
	"sync"

	"github.com/google/uuid"

	"github.com/Nils-Svensson/terraform-wizard/backend/pkg/model"
)

type SessionStorage interface {
	Save(sessionID string, resources []*model.Resource)
	Get(sessionID string) ([]*model.Resource, bool)
	Delete(sessionID string)
	Clear()
	NewSession() string
}

type Storage struct {
	mu       sync.RWMutex
	sessions map[string][]*model.Resource
}

func New() *Storage {
	return &Storage{
		sessions: make(map[string][]*model.Resource),
	}
}

func (s *Storage) Save(sessionID string, resources []*model.Resource) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[sessionID] = resources
}

func (s *Storage) Get(sessionID string) ([]*model.Resource, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res, ok := s.sessions[sessionID]
	return res, ok
}

func (s *Storage) Delete(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, sessionID)
}

func (s *Storage) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions = make(map[string][]*model.Resource)
}

func (s *Storage) NewSession() string {
	return uuid.New().String()
}
