import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import MapView from './components/MapView';
import Timeline from './components/Timeline';
import type { Memory } from './types';
import './index.css';

function App() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [highlightedMemoryId, setHighlightedMemoryId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      const filtered = memories.filter(m => 
        new Date(m.created_at).getFullYear() === selectedYear
      );
      setFilteredMemories(filtered);
    } else {
      setFilteredMemories(memories);
    }
  }, [memories, selectedYear]);

  const fetchMemories = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get<{ success: boolean; data: Memory[] }>('/api/memories');
      if (response.data.success) {
        setMemories(response.data.data);
        setFilteredMemories(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemorySelect = (memory: Memory | null) => {
    setSelectedMemory(memory);
    if (memory) {
      setHighlightedMemoryId(memory.id);
      setTimeout(() => setHighlightedMemoryId(null), 2000);
    }
  };

  const handleTimelineMemoryClick = (memory: Memory) => {
    setHighlightedMemoryId(memory.id);
    setSelectedMemory(memory);
    setTimeout(() => setHighlightedMemoryId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="map-container" style={{ background: '#FAF6F0' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Timeline
        memories={filteredMemories}
        selectedMemoryId={selectedMemory?.id || null}
        onMemoryClick={handleTimelineMemoryClick}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />
      <MapView
        memories={memories}
        selectedMemory={selectedMemory}
        onMemorySelect={handleMemorySelect}
        highlightedMemoryId={highlightedMemoryId}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
