import { useState } from 'react';
import type { Puzzle } from '@/data/types';
import { ARTIFACT_COLORS } from '@/data/types';
import './CollectionPanel.css';

interface CollectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  collection: string[];
  puzzles: Puzzle[];
  newArtifacts: string[];
}

interface ArtifactCardProps {
  puzzle: Puzzle;
  isNew: boolean;
}

function ArtifactThumbnail({ type, color }: { type: string; color: string }) {
  if (type === '陶罐') {
    return (
      <svg width="60" height="60" viewBox="0 0 60 60">
        <ellipse cx="30" cy="48" rx="18" ry="5" fill={color} opacity="0.7" />
        <path d="M15 25 Q15 15 30 15 Q45 15 45 25 L42 45 Q30 50 18 45 Z" fill={color} />
        <ellipse cx="30" cy="15" rx="12" ry="3" fill={color} />
        <ellipse cx="30" cy="12" rx="8" ry="2" fill={color} opacity="0.8" />
      </svg>
    );
  }
  if (type === '石碑') {
    return (
      <svg width="60" height="60" viewBox="0 0 60 60">
        <rect x="12" y="48" width="36" height="6" rx="2" fill={color} opacity="0.7" />
        <rect x="20" y="15" width="20" height="35" rx="2" fill={color} />
        <polygon points="20,15 30,8 40,15" fill={color} />
        <rect x="24" y="22" width="12" height="2" rx="1" fill="#fff" opacity="0.3" />
        <rect x="24" y="28" width="12" height="2" rx="1" fill="#fff" opacity="0.3" />
        <rect x="24" y="34" width="12" height="2" rx="1" fill="#fff" opacity="0.3" />
      </svg>
    );
  }
  return (
    <svg width="60" height="60" viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="22" fill={color} />
      <circle cx="30" cy="30" r="8" fill="#2d2d3d" />
      <circle cx="30" cy="30" r="22" fill="none" stroke="#fff" strokeWidth="1" opacity="0.2" />
      <circle cx="30" cy="30" r="16" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.15" />
    </svg>
  );
}

function ArtifactCard({ puzzle, isNew }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = ARTIFACT_COLORS[puzzle.artifactType as keyof typeof ARTIFACT_COLORS];

  return (
    <div className="artifact-card-wrapper">
      <div
        className={`artifact-card ${expanded ? 'expanded' : ''}`}
        onClick={() => setExpanded(!expanded)}
        style={{ animation: 'cardFlip 0.6s ease-out' }}
      >
        {isNew && (
          <div className="new-badge" style={{ animation: 'newBadge 1s ease-in-out infinite' }}>
            NEW
          </div>
        )}
        <div className="card-thumbnail" style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)` }}>
          <ArtifactThumbnail type={puzzle.artifactType} color={color} />
        </div>
        <div className="card-info">
          <h3 className="card-name">{puzzle.artifactName}</h3>
          <p className="card-type" style={{ color }}>{puzzle.artifactType}</p>
        </div>
      </div>
      {expanded && (
        <div className="card-story" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {puzzle.story}
        </div>
      )}
    </div>
  );
}

export default function CollectionPanel({ isOpen, onClose, collection, puzzles, newArtifacts }: CollectionPanelProps) {
  const collectedPuzzles = puzzles.filter((p) => collection.includes(p.id));

  return (
    <>
      {isOpen && (
        <div className="collection-backdrop" onClick={onClose} style={{ animation: 'fadeIn 0.3s ease-out' }} />
      )}
      <div
        className={`collection-panel ${isOpen ? 'open' : ''}`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-out',
        }}
      >
        <div className="panel-header">
          <h2 className="panel-title">📜 收藏品</h2>
          <button className="panel-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="panel-progress">
          <span>已收集: {collectedPuzzles.length} / {puzzles.length}</span>
        </div>
        <div className="collection-grid">
          {collectedPuzzles.length === 0 ? (
            <div className="empty-collection">
              <p>还没有收集到任何文物</p>
              <p className="hint">点击密室中的文物开始解谜吧！</p>
            </div>
          ) : (
            collectedPuzzles.map((puzzle) => (
              <ArtifactCard
                key={puzzle.id}
                puzzle={puzzle}
                isNew={newArtifacts.includes(puzzle.id)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
