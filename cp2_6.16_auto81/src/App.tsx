import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from './components/Editor';
import Playback from './components/Playback';
import TrackList from './components/TrackList';
import { ScoreData, Track, Note, Duration, generateId, pitchToName, DURATION_MAP } from './types';
import * as api from './api';

const DEFAULT_TRACKS: Track[] = [
  { id: 'track-1', name: '钢琴', color: '#e94560', solo: false, mute: false, visible: true },
  { id: 'track-2', name: '小提琴', color: '#00d4ff', solo: false, mute: false, visible: true },
  { id: 'track-3', name: '大提琴', color: '#533483', solo: false, mute: false, visible: true },
];

function createDefaultScore(): ScoreData {
  return {
    id: 'score-' + generateId(),
    title: '未命名乐曲',
    composer: '未知',
    tracks: DEFAULT_TRACKS,
    notes: [],
  };
}

export default function App() {
  const [score, setScore] = useState<ScoreData>(createDefaultScore);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [previewVersion, setPreviewVersion] = useState<ScoreData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const result = await api.saveScore(score);
      showToast(`保存成功！版本 v${result.version}`);
    } catch {
      showToast('保存失败', 'error');
    }
  }, [score, showToast]);

  const handleLoadVersions = useCallback(async () => {
    try {
      const v = await api.getVersions(score.id);
      setVersions(v);
      setShowVersionPanel(true);
    } catch {
      showToast('加载版本历史失败', 'error');
    }
  }, [score.id, showToast]);

  const handleVersionPreview = useCallback(async (version: number) => {
    try {
      const v = await api.getVersion(score.id, version);
      setPreviewVersion(v.data);
    } catch {
      showToast('加载版本失败', 'error');
    }
  }, [score.id, showToast]);

  const handleRestoreVersion = useCallback(() => {
    if (previewVersion) {
      setScore(previewVersion);
      setPreviewVersion(null);
      showToast('已回滚到选中版本');
    }
  }, [previewVersion, showToast]);

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      api.saveScore(score).catch(() => {});
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [score]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNotesChange = useCallback((notes: Note[]) => {
    setScore(prev => ({ ...prev, notes }));
  }, []);

  const handleTrackUpdate = useCallback((track: Track) => {
    setScore(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => (t.id === track.id ? track : t)),
    }));
  }, []);

  const handleNoteSelect = useCallback((note: Note | null) => {
    setSelectedNote(note);
  }, []);

  const handleTitleChange = useCallback((title: string) => {
    setScore(prev => ({ ...prev, title }));
  }, []);

  const handleComposerChange = useCallback((composer: string) => {
    setScore(prev => ({ ...prev, composer }));
  }, []);

  const displayScore = previewVersion || score;
  const activeTracks = score.tracks.filter(t => !t.mute || t.solo);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a2e',
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          height: 48,
          background: toast.type === 'success' ? '#2d6a4f' : '#e94560',
          color: '#fff',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          fontSize: 14,
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.message}
        </div>
      )}

      <div style={{
        height: 56,
        background: '#16213e',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        borderBottom: '1px solid #0f3460',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#e94560', marginRight: 24 }}>
          ♪ 乐谱协作编辑器
        </div>
        <input
          value={displayScore.title}
          onChange={e => !previewVersion && handleTitleChange(e.target.value)}
          style={{
            background: 'transparent',
            border: '1px solid #4a4a6a',
            borderRadius: 6,
            color: '#fff',
            padding: '6px 12px',
            fontSize: 14,
            width: 200,
            outline: 'none',
          }}
          placeholder="乐曲标题"
        />
        <input
          value={displayScore.composer}
          onChange={e => !previewVersion && handleComposerChange(e.target.value)}
          style={{
            background: 'transparent',
            border: '1px solid #4a4a6a',
            borderRadius: 6,
            color: '#fff',
            padding: '6px 12px',
            fontSize: 14,
            width: 140,
            outline: 'none',
          }}
          placeholder="作曲者"
        />
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSave}
          style={{
            width: 120,
            height: 40,
            borderRadius: 8,
            background: '#533483',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#6d3b9a')}
          onMouseOut={e => (e.currentTarget.style.background = '#533483')}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          💾 保存
        </button>
        <button
          onClick={handleLoadVersions}
          style={{
            width: 120,
            height: 40,
            borderRadius: 8,
            background: '#0f3460',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#1a4a7a')}
          onMouseOut={e => (e.currentTarget.style.background = '#0f3460')}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          📜 版本历史
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <TrackList
          tracks={score.tracks}
          onTrackUpdate={handleTrackUpdate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Editor
            score={displayScore}
            onNotesChange={handleNotesChange}
            onNoteSelect={handleNoteSelect}
            isPlaying={isPlaying}
            playbackPosition={playbackPosition}
            previewMode={!!previewVersion}
          />
          <div style={{
            height: 40,
            background: '#0f3460',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: 13,
            color: '#aaa',
            gap: 20,
            flexShrink: 0,
          }}>
            {selectedNote && (
              <>
                <span>选中音符: <b style={{ color: '#00d4ff' }}>{pitchToName(selectedNote.pitch)}</b></span>
                <span>时值: <b style={{ color: '#e94560' }}>{selectedNote.duration}</b></span>
              </>
            )}
            <div style={{ flex: 1 }} />
            <span>音符数: {displayScore.notes.length}</span>
          </div>
        </div>

        {showVersionPanel && (
          <div style={{
            width: 300,
            background: '#1a1a2e',
            borderLeft: '1px solid #0f3460',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #0f3460',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>版本历史</span>
              <button
                onClick={() => { setShowVersionPanel(false); setPreviewVersion(null); }}
                style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {versions.length === 0 && (
                <div style={{ color: '#666', textAlign: 'center', marginTop: 40 }}>暂无版本记录</div>
              )}
              {versions.map(v => (
                <div
                  key={v.version}
                  style={{
                    background: previewVersion && previewVersion.id === v.data?.id ? '#0f3460' : '#16213e',
                    border: previewVersion ? '2px dashed #e94560' : '1px solid #0f3460',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => handleVersionPreview(v.version)}
                >
                  <div style={{ fontWeight: 700, color: '#e94560', fontSize: 14 }}>v{v.version}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{v.timestamp}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>作者: {v.authorIp}</div>
                </div>
              ))}
            </div>
            {previewVersion && (
              <div style={{ padding: 12, borderTop: '1px solid #0f3460' }}>
                <button
                  onClick={handleRestoreVersion}
                  style={{
                    width: '100%',
                    height: 40,
                    borderRadius: 8,
                    background: '#e94560',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                  onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  回滚到此版本
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Playback
        notes={displayScore.notes}
        tracks={score.tracks}
        isPlaying={isPlaying}
        onPlayToggle={() => setIsPlaying(!isPlaying)}
        onStop={() => { setIsPlaying(false); setPlaybackPosition(0); }}
        playbackPosition={playbackPosition}
        onPlaybackPositionChange={setPlaybackPosition}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
