import { useState, useCallback, useEffect } from 'react';
import GameCanvas from '@/game/GameCanvas';
import PuzzlePanel from '@/game/PuzzlePanel';
import CollectionPanel from '@/components/CollectionPanel';
import ProgressBar from '@/components/ProgressBar';
import Notification from '@/components/Notification';
import { useCollection } from '@/data/hooks';
import type { ArtifactPosition, ArtifactReward, Puzzle } from '@/data/types';
import puzzlesData from '../server/puzzles.json';
import './App.css';

const puzzles = puzzlesData as Puzzle[];

export default function App() {
  const { collection, refresh: refreshCollection } = useCollection();
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [newArtifacts, setNewArtifacts] = useState<string[]>([]);

  const handleSelectArtifact = useCallback((id: string, _position: ArtifactPosition) => {
    setSelectedArtifactId(id);
  }, []);

  const handleClosePuzzle = useCallback(() => {
    setSelectedArtifactId(null);
  }, []);

  const handlePuzzleSuccess = useCallback(async (reward: ArtifactReward) => {
    setSelectedArtifactId(null);
    setNotification(reward.artifactName);
    setNewArtifacts((prev) => [...new Set([...prev, reward.id])]);
    await refreshCollection();
  }, [refreshCollection]);

  const handleNotificationClose = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    if (collectionOpen) {
      const timer = setTimeout(() => {
        setNewArtifacts([]);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [collectionOpen]);

  return (
    <div className="app-container">
      <div className="top-bar">
        <ProgressBar collected={collection.length} total={puzzles.length} />
        <button
          className="collection-btn"
          onClick={() => setCollectionOpen(true)}
          title="查看收藏"
        >
          <svg width="32" height="32" viewBox="0 0 32 32">
            <rect x="4" y="4" width="24" height="24" rx="3" fill="none" stroke="#ffd700" strokeWidth="1.5" />
            <line x1="9" y1="10" x2="23" y2="10" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="15" x2="20" y2="15" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="20" x2="18" y2="20" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="25" x2="15" y2="25" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="game-area">
        <GameCanvas onSelectArtifact={handleSelectArtifact} collection={collection} />
      </div>

      <h1 className="game-title">符文密室考古</h1>

      <PuzzlePanel
        artifactId={selectedArtifactId}
        onClose={handleClosePuzzle}
        onSuccess={handlePuzzleSuccess}
      />

      <CollectionPanel
        isOpen={collectionOpen}
        onClose={() => setCollectionOpen(false)}
        collection={collection}
        puzzles={puzzles}
        newArtifacts={newArtifacts}
      />

      <Notification message={notification} onClose={handleNotificationClose} />
    </div>
  );
}
