import { useState, useCallback, useRef, useEffect } from 'react';
import { StarField, StarData } from './StarField';
import { UIOverlay } from './UIOverlay';
import { AudioFeatures, AudioAnalyzer } from './AudioAnalyzer';

const API_BASE = '/api';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getOrCreateUserId(): string {
  let id = localStorage.getItem('yinji_user_id');
  if (!id) {
    id = generateId();
    localStorage.setItem('yinji_user_id', id);
  }
  return id;
}

export default function App() {
  const [stars, setStars] = useState<StarData[]>([]);
  const [hoveredStar, setHoveredStar] = useState<StarData | null>(null);
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null);
  const userIdRef = useRef(getOrCreateUserId());

  useEffect(() => {
    fetch(`${API_BASE}/stars`)
      .then((r) => r.json())
      .then((data: StarData[]) => setStars(data))
      .catch(() => {
        const demo: StarData[] = Array.from({ length: 8 }, (_, i) => {
          const gradients = [
            { start: '#ff4444', end: '#ff8800', label: '热烈红橙' },
            { start: '#00cccc', end: '#4488ff', label: '平静蓝绿' },
            { start: '#8855aa', end: '#778899', label: '忧郁紫灰' },
          ];
          const g = gradients[i % 3];
          return {
            id: generateId(),
            gradient: g,
            audioUrl: '',
            duration: 3000 + Math.random() * 7000,
            playCount: Math.floor(Math.random() * 20),
            mergeCount: Math.floor(Math.random() * 3),
            ownerId: generateId(),
            waveform: Array.from({ length: 120 }, () => Math.random()),
            createdAt: Date.now() - Math.random() * 86400000,
          };
        });
        setStars(demo);
      });
  }, []);

  const handleRecord = useCallback(async (blob: Blob, features: AudioFeatures) => {
    const id = generateId();
    const audioUrl = URL.createObjectURL(blob);

    const newStar: StarData = {
      id,
      gradient: features.gradient,
      audioUrl,
      duration: blob.size,
      playCount: 0,
      mergeCount: 0,
      ownerId: userIdRef.current,
      waveform: features.waveform,
      createdAt: Date.now(),
    };

    const formData = new FormData();
    formData.append('audio', blob, `${id}.webm`);
    formData.append('ownerId', userIdRef.current);
    formData.append('gradient', JSON.stringify(features.gradient));
    formData.append('waveform', JSON.stringify(features.waveform));

    fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    }).catch(() => {});

    setStars((prev) => [...prev, newStar]);
  }, []);

  const handleStarClick = useCallback((star: StarData) => {
    setSelectedStar(star);
    setStars((prev) =>
      prev.map((s) => (s.id === star.id ? { ...s, playCount: s.playCount + 1 } : s))
    );
  }, []);

  const handleStarHover = useCallback((star: StarData | null) => {
    setHoveredStar(star);
  }, []);

  const handleMerge = useCallback((fromUserId: string, toStarId: string) => {
    setStars((prev) => {
      const toStar = prev.find((s) => s.id === toStarId);
      if (!toStar) return prev;

      const fromStar = prev.find((s) => s.ownerId === fromUserId && s.id !== toStarId);
      if (!fromStar) return prev;

      const mixedGradient = AudioAnalyzer.mixGradients(fromStar.gradient, toStar.gradient);

      return prev.map((s) => {
        if (s.id === toStarId) {
          return {
            ...s,
            mergeCount: s.mergeCount + 1,
            gradient: mixedGradient,
          };
        }
        return s;
      });
    });

    setSelectedStar(null);

    fetch(`${API_BASE}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUserId, toStarId }),
    }).catch(() => {});
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedStar(null);
  }, []);

  return (
    <>
      <StarField
        stars={stars}
        onStarClick={handleStarClick}
        onStarHover={handleStarHover}
        currentUserId={userIdRef.current}
      />
      <UIOverlay
        hoveredStar={hoveredStar}
        selectedStar={selectedStar}
        allStars={stars}
        currentUserId={userIdRef.current}
        onRecord={handleRecord}
        onMerge={handleMerge}
        onCloseCard={handleCloseCard}
      />
    </>
  );
}
