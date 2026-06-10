import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OceanCanvas } from './components/OceanCanvas';
import { BottleDetail } from './components/BottleDetail';
import type { Bottle } from '../shared/types';

interface SelectedBottle {
  bottle: Bottle;
  position: { x: number; y: number };
}

const App: React.FC = () => {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [selected, setSelected] = useState<SelectedBottle | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [progress, setProgress] = useState(0);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<number>(0);

  useEffect(() => {
    const fetchBottles = async () => {
      try {
        const res = await fetch('/api/bottles');
        if (res.ok) {
          const data = await res.json();
          setBottles(data);
        }
      } catch (e) {
        console.warn('Failed to fetch bottles:', e);
      }
    };

    fetchBottles();

    pollRef.current = window.setInterval(fetchBottles, 2000);

    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    fetch('/api/canvas-size', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ width: window.innerWidth, height: window.innerHeight })
    }).catch(() => {});
  }, []);

  const handleBottleClick = useCallback((bottle: Bottle, x: number, y: number) => {
    fetch(`/api/bottles/${bottle.id}/touch`, { method: 'POST' }).catch(() => {});
    setSelected({ bottle, position: { x, y } });
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelected(null);
  }, []);

  const handleCollect = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/bottles/${id}/collect`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setBottles((prev) => prev.map((b) => (b.id === id ? updated : b)));
        setSelected((s) => s ? { ...s, bottle: updated } : null);
      }
    } catch (e) {
        console.error(e);
      }
  }, []);

  const handleRelease = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/bottles/${id}/release`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setBottles((prev) => prev.map((b) => (b.id === id ? updated : b)));
      }
    } catch (e) {
        console.error(e);
      }
  }, []);

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('音频文件不能超过10MB');
      return;
    }
    if (!['audio/wav', 'audio/mpeg', 'audio/mp3'].includes(file.type) &&
        !file.name.match(/\.(wav|mp3)$/i)) {
      alert('请上传WAV或MP3格式的音频文件');
      return;
    }
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    const tempAudio = new Audio(url);
    tempAudio.addEventListener('loadedmetadata', () => {
      if (tempAudio.duration > 10) {
        alert('音频时长不能超过10秒');
        setAudioFile(null);
        setAudioDuration(0);
      } else {
        setAudioDuration(tempAudio.duration);
      }
    });
  };

  const handleSubmit = async () => {
    if (!audioFile || !lat || !lng) return;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return;

    setSubmitting(true);
    setProgress(0);

    try {
      const reader = new FileReader();
      reader.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };

      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioFile);
      });

      setProgress(80);

      const res = await fetch('/api/bottles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: latNum,
          lng: lngNum,
          audioData: dataUrl,
          audioDuration
        })
      });

      setProgress(100);

      if (res.ok) {
        const newBottle = await res.json();
        setBottles((prev) => [...prev, newBottle]);
        setTimeout(() => {
          setShowCreateModal(false);
          setLat('');
          setLng('');
          setAudioFile(null);
          setAudioDuration(0);
          setProgress(0);
          setSubmitting(false);
        }, 400);
      } else {
        alert('投放失败，请重试');
        setSubmitting(false);
        setProgress(0);
      }
    } catch (e) {
      console.error(e);
      alert('投放失败，请重试');
      setSubmitting(false);
      setProgress(0);
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const parts = searchQuery.split(/[,\s]+/).map(s => parseFloat(s.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const targetX = ((parts[1] + 180) / 360) * window.innerWidth;
        const targetY = ((90 - parts[0]) / 180) * window.innerHeight;
        let nearest: Bottle | null = null;
        let nearestDist = Infinity;
        for (const b of bottles) {
          const dx = b.x - targetX;
          const dy = b.y - targetY;
          const d = dx * dx + dy * dy;
          if (d < nearestDist) {
            nearestDist = d;
            nearest = b;
          }
        }
        if (nearest) {
          handleBottleClick(nearest, nearest.x, nearest.y);
        }
      }
    }
  };

  return (
    <div className="app-container">
      <OceanCanvas bottles={bottles} onBottleClick={handleBottleClick} />

      <div className="sidebar">
        <button
          className="sidebar-btn"
          onClick={() => setShowCreateModal(true)}
          title="投放漂流瓶"
        >
          🌊
        </button>
        <input
          className="sidebar-search"
          type="text"
          placeholder="搜索坐标..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {selected && (
        <BottleDetail
          key={selected.bottle.id}
          bottle={selected.bottle}
          position={selected.position}
          onClose={handleCloseDetail}
          onCollect={handleCollect}
          onRelease={handleRelease}
        />
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowCreateModal(false)}>
          <div className="create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">投放漂流瓶</div>

            <div className="coord-row">
              <div className="form-group">
                <label className="form-label">纬度</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="-90 ~ 90"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  step="0.0001"
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">经度</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="-180 ~ 180"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  step="0.0001"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">音频文件 (WAV/MP3, 最长10秒)</label>
              <label className="file-upload">
                <input type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" onChange={handleAudioSelect} disabled={submitting} />
                <div>📁 点击选择音频文件</div>
                {audioFile && <div className="file-name">{audioFile.name} ({audioDuration.toFixed(1)}s</div>}
              </label>
            </div>

            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !audioFile || !lat || !lng}
            >
              {submitting ? '投放中...' : '投放漂流瓶'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
