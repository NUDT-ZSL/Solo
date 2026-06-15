import { useEffect, useCallback } from 'react';
import { useMusicStore, Note, Chord, HistoryItem } from '../store';
import { parseMelody } from '../melody/MelodyParser';
import { generateChords } from '../melody/ChordGenerator';
import { usePlaybackController } from '../audio/PlaybackController';

const NOTE_NAMES: Record<number, string> = {
  0: '1',
  2: '2',
  4: '3',
  5: '4',
  7: '5',
  9: '6',
  11: '7',
};

function midiToDisplay(midi: number): string {
  const pc = ((midi - 60) % 12 + 12) % 12;
  return NOTE_NAMES[pc] ?? '?';
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso.slice(5, 16);
  }
}

export default function App() {
  const melodyText = useMusicStore((s) => s.melodyText);
  const notes = useMusicStore((s) => s.notes);
  const chords = useMusicStore((s) => s.chords);
  const bpm = useMusicStore((s) => s.bpm);
  const currentPosition = useMusicStore((s) => s.currentPosition);
  const currentChordIndex = useMusicStore((s) => s.currentChordIndex);
  const history = useMusicStore((s) => s.history);
  const historyOpen = useMusicStore((s) => s.historyOpen);

  const setMelodyText = useMusicStore((s) => s.setMelodyText);
  const setNotes = useMusicStore((s) => s.setNotes);
  const setChords = useMusicStore((s) => s.setChords);
  const setBpm = useMusicStore((s) => s.setBpm);
  const setHistory = useMusicStore((s) => s.setHistory);
  const setHistoryOpen = useMusicStore((s) => s.setHistoryOpen);
  const setCurrentPosition = useMusicStore((s) => s.setCurrentPosition);
  const setCurrentChordIndex = useMusicStore((s) => s.setCurrentChordIndex);

  const { play, stop, toggle, playChord, isPlaying, isPaused } = usePlaybackController();

  // 缓存和弦分析结果
  const chordCache = useCallback(() => {
    if (notes.length === 0) return [];
    return generateChords(notes);
  }, [notes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setMelodyText(text);
    const parsed = parseMelody(text);
    setNotes(parsed);
    if (parsed.length > 0) {
      const cached = generateChords(parsed);
      setChords(cached);
    } else {
      setChords([]);
    }
  };

  const handleGenerateChords = () => {
    const generated = chordCache();
    setChords(generated);
  };

  const handlePlay = () => {
    if (chords.length === 0) {
      handleGenerateChords();
    }
    setTimeout(() => {
      play();
    }, 0);
  };

  const handleSave = async () => {
    if (notes.length === 0 || chords.length === 0) return;
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          melody: notes,
          chords,
          melodyText,
        }),
      });
      if (res.ok) {
        await loadHistory();
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setHistory(json.data as HistoryItem[]);
        }
      }
    } catch (err) {
      console.error('Load history failed:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(history.filter((h) => h.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleReload = (item: HistoryItem) => {
    stop();
    setCurrentPosition(-1);
    setCurrentChordIndex(-1);
    setMelodyText(item.melodyText);
    setNotes(item.melody as Note[]);
    setChords(item.chords as Chord[]);
    setHistoryOpen(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const canPlay = notes.length > 0;
  const canSave = notes.length > 0 && chords.length > 0;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎼 智能旋律伴奏生成器</h1>
        <p>输入简谱旋律，自动配和弦，享受即兴创作的乐趣</p>
      </header>

      <div className="main-layout">
        <div className="left-panel">
          <div className="score-input-area">
            <div className="score-input-title">✏️ 简谱输入区</div>
            <textarea
              className="score-input"
              value={melodyText}
              onChange={handleInputChange}
              placeholder="例如：1 2 3 5 或带时值：1- 2 3 5--&#10;支持 # 升号 b 降号，用空格分隔"
              spellCheck={false}
            />
            <div className="input-hint">
              提示：1-7 表示音符，- 表示延长一拍，# 升号 / b 降号，空格分隔
            </div>
          </div>

          <div className="notes-display">
            {notes.length === 0 ? (
              <div className="empty-state">输入旋律后，这里会显示解析的音符序列</div>
            ) : (
              notes.map((n, i) => (
                <div
                  key={i}
                  className={`note-card ${currentPosition === i ? 'active' : ''}`}
                  title={`MIDI: ${n.note}，时值：${n.duration}拍`}
                >
                  {midiToDisplay(n.note)}
                  {n.duration > 1 && (
                    <div className="duration-dots">
                      {Array.from({ length: n.duration - 1 }).map((_, j) => (
                        <span key={j} className="duration-dot" />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="action-row">
            <button
              className="btn btn-primary"
              onClick={handlePlay}
              disabled={!canPlay}
              style={{ opacity: canPlay ? 1 : 0.5, cursor: canPlay ? 'pointer' : 'not-allowed' }}
            >
              ▶ 播放
            </button>
            <button className="btn btn-secondary" onClick={handleGenerateChords}>
              🎵 生成和弦
            </button>
            <button
              className="btn btn-success"
              onClick={handleSave}
              disabled={!canSave}
              style={{ opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
            >
              💾 保存
            </button>
          </div>
        </div>

        <div className="right-panel">
          <div className="panel-title">🎹 和弦预览与控制</div>

          <div className="chords-display">
            {chords.length === 0 ? (
              <div className="empty-state">生成和弦后，这里会显示和弦序列</div>
            ) : (
              chords.map((c, i) => (
                <div
                  key={i}
                  className={`chord-block ${c.quality} ${currentChordIndex === i ? 'highlighted' : ''}`}
                  onClick={() => playChord(c)}
                  title={`${c.chord} (${c.quality}) - 点击试听`}
                >
                  {c.chord}
                </div>
              ))
            )}
          </div>

          <div className="controls-section">
            <div className="play-controls">
              <button
                className="stop-btn"
                onClick={stop}
                title="停止"
              >
                ⏹
              </button>
              <button className="play-btn" onClick={toggle} title={isPlaying ? (isPaused ? '继续' : '暂停') : '播放'}>
                {!isPlaying ? '▶' : isPaused ? '▶' : '⏸'}
              </button>
              <button
                className="stop-btn"
                onClick={() => setBpm(Math.max(40, bpm - 10))}
                title="减速"
              >
                -
              </button>
              <button
                className="stop-btn"
                onClick={() => setBpm(Math.min(200, bpm + 10))}
                title="加速"
              >
                +
              </button>
            </div>

            <div className="bpm-control">
              <div className="bpm-label">
                <span>速度 (BPM)</span>
                <span style={{ color: '#ff7043' }}>{bpm}</span>
              </div>
              <input
                type="range"
                className="bpm-slider"
                min="40"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        </div>
      </div>

      <button className="history-toggle-btn" onClick={() => setHistoryOpen(true)}>
        📚 历史记录 ({history.length})
      </button>

      <div
        className={`drawer-overlay ${historyOpen ? 'open' : ''}`}
        onClick={() => setHistoryOpen(false)}
      />

      <div className={`drawer ${historyOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-title">📚 历史记录</div>
          <button className="drawer-close" onClick={() => setHistoryOpen(false)}>
            ✕
          </button>
        </div>

        <div className="history-list">
          {history.length === 0 ? (
            <div className="history-empty">暂无历史记录，创作并保存一段旋律吧！</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-item-info">
                  <div className="history-date">{formatDate(item.createdAt)}</div>
                  <div className="history-melody-preview">
                    {item.melodyText || '（旋律文本）'}
                  </div>
                  <div className="history-chord-count">{item.chords.length} 个和弦</div>
                </div>
                <div className="history-item-actions">
                  <button
                    className="icon-btn reload"
                    onClick={() => handleReload(item)}
                    title="重新加载"
                  >
                    ↻
                  </button>
                  <button
                    className="icon-btn delete"
                    onClick={() => handleDelete(item.id)}
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
