import { useState, useEffect, useRef, useCallback } from 'react';
import { gameManager, Difficulty } from './GameManager';
import { Renderer } from './Renderer';
import { networkManager, Song, ScoreEntry } from './NetworkManager';
import { audioEngine } from './audioEngine';
import './index.css';

type Screen = 'menu' | 'game' | 'result';

function getBpmColor(bpm: number): string {
  if (bpm < 100) return '#3b82f6';
  if (bpm < 150) return '#8b5cf6';
  return '#ef4444';
}

function getRating(score: number): { grade: string; color: string } {
  if (score > 150) return { grade: 'S', color: '#facc15' };
  if (score >= 100) return { grade: 'A', color: '#22c55e' };
  if (score >= 50) return { grade: 'B', color: '#3b82f6' };
  return { grade: 'C', color: '#94a3b8' };
}

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [score, setScore] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [volume, setVolume] = useState(80);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [clickedCard, setClickedCard] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [currentSongName, setCurrentSongName] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const gameLoopRef = useRef<number | null>(null);

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      const data = await networkManager.fetchSongs();
      setSongs(data);
    } catch (err) {
      console.error('Failed to load songs:', err);
    }
  };

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    gameManager.setDifficulty(difficulty);
  }, [difficulty]);

  const handleStartGame = async (song: Song) => {
    setClickedCard(song.id);
    setLoading(true);

    try {
      const detail = await networkManager.fetchSongDetail(song.id);
      if (detail.beats && detail.audioUrl) {
        setCurrentSongName(song.name);
        setSelectedSong(song);
        setScreen('game');
        setScore(0);
        setShowResult(false);
        setSubmitted(false);
        setPlayerName('');
        setLeaderboard([]);
      }
    } catch (err) {
      console.error('Failed to load song:', err);
    } finally {
      setLoading(false);
      setClickedCard(null);
    }
  };

  useEffect(() => {
    if (screen !== 'game' || !canvasRef.current || !selectedSong) return;

    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    if (!container) return;

    const width = Math.max(800, Math.min(container.clientWidth, 1200));
    const height = Math.max(500, Math.min(window.innerHeight - 100, 600));

    canvas.width = width;
    canvas.height = height;

    const renderer = new Renderer(canvas);
    rendererRef.current = renderer;

    gameManager.init(width, height);
    gameManager.setDifficulty(difficulty);

    const startGame = async () => {
      try {
        const detail = await networkManager.fetchSongDetail(selectedSong.id);
        if (detail.beats && detail.audioUrl) {
          await gameManager.loadSong(
            detail.id,
            detail.name,
            detail.beats,
            detail.bpm,
            detail.duration,
            detail.audioUrl
          );

          gameManager.setOnScoreUpdate((newScore) => {
            setScore(newScore);
          });

          gameManager.setOnGameEnd((finalScore) => {
            setScore(finalScore);
            setShowResult(true);
            setTimeout(() => setScreen('result'), 500);
          });

          renderer.start(() => {
            gameManager.update();
            renderer.render(gameManager.getState());
          });

          gameManager.start();
        }
      } catch (err) {
        console.error('Failed to start game:', err);
      }
    };

    startGame();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        gameManager.handleJumpPress();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      renderer.stop();
      gameManager.stop();
      rendererRef.current = null;
    };
  }, [screen, selectedSong?.id, difficulty]);

  const handleSubmitScore = async () => {
    if (!playerName.trim() || !selectedSong || submitted) return;

    try {
      await gameManager.submitScore(playerName.trim());
      const board = await networkManager.fetchLeaderboard(selectedSong.id);
      setLeaderboard(board);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  };

  const handleBackToMenu = () => {
    gameManager.stop();
    if (rendererRef.current) {
      rendererRef.current.stop();
    }
    setScreen('menu');
    setShowResult(false);
    setSelectedSong(null);
  };

  const rating = getRating(score);

  return (
    <div className="app">
      {screen === 'menu' && (
        <div className="menu-screen">
          <div className="menu-header">
            <h1 className="game-title">
              <span className="title-gradient">RhythmTracer</span>
            </h1>
            <p className="game-subtitle">随音乐节拍，追逐你的节奏</p>
          </div>

          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="设置"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

          <div className="song-grid">
            {songs.map((song) => (
              <div
                key={song.id}
                className={`song-card ${clickedCard === song.id ? 'clicked' : ''} ${hoveredCard === song.id ? 'hovered' : ''}`}
                style={{ '--card-color': getBpmColor(song.bpm) } as React.CSSProperties}
                onClick={() => !loading && handleStartGame(song)}
                onMouseEnter={() => setHoveredCard(song.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="song-card-glow"></div>
                <div className="song-card-content">
                  <h3 className="song-name">{song.name}</h3>
                  <div className="song-info">
                    <span className="song-bpm">{song.bpm} BPM</span>
                    <span className="song-style">{song.style}</span>
                  </div>
                  <div className="song-duration">{song.duration}秒</div>
                </div>
              </div>
            ))}
          </div>

          <div className="menu-hint">
            <p>选择一首歌开始游戏，按空格键在正确时机落地获得高分</p>
          </div>
        </div>
      )}

      {screen === 'game' && (
        <div className="game-screen">
          <div className="game-hud">
            <div className="hud-left">
              <div className="song-info-hud">{currentSongName}</div>
            </div>
            <div className="hud-right">
              <div className="score-display">
                <span className="score-label">得分</span>
                <span className="score-value">{score}</span>
              </div>
            </div>
          </div>
          <div className="canvas-container">
            <canvas ref={canvasRef} className="game-canvas"></canvas>
            {loading && (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p>加载中...</p>
              </div>
            )}
          </div>
          <div className="game-controls">
            <button className="btn btn-secondary" onClick={handleBackToMenu}>
              返回菜单
            </button>
            <div className="hint-text">按 空格键 精准落地</div>
          </div>
        </div>
      )}

      {screen === 'result' && (
        <div className="result-screen">
          <div className={`result-card ${showResult ? 'visible' : ''}`}>
            <h2 className="result-title">游戏结束</h2>

            <div className="rating-display">
              <span className="rating-grade" style={{ color: rating.color }}>
                {rating.grade}
              </span>
            </div>

            <div className="final-score">
              <span className="final-score-label">最终得分</span>
              <span className="final-score-value">{score}</span>
            </div>

            {!submitted ? (
              <div className="submit-section">
                <input
                  type="text"
                  className="name-input"
                  placeholder="输入你的昵称"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={12}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitScore}
                  disabled={!playerName.trim()}
                >
                  提交高分
                </button>
              </div>
            ) : (
              <div className="leaderboard-section">
                <h3 className="leaderboard-title">🏆 TOP 10</h3>
                <div className="leaderboard-list">
                  {leaderboard.length === 0 ? (
                    <p className="no-scores">暂无记录</p>
                  ) : (
                    leaderboard.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`leaderboard-item ${entry.playerName === playerName.trim() ? 'is-you' : ''}`}
                      >
                        <span className={`rank rank-${index + 1}`}>#{index + 1}</span>
                        <span className="player-name">{entry.playerName}</span>
                        <span className="player-score">{entry.score}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="result-actions">
              <button className="btn btn-secondary" onClick={handleBackToMenu}>
                返回主菜单
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSettings(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h2 className="modal-title">设置</h2>

            <div className="setting-group">
              <label className="setting-label">
                <span>音量</span>
                <span className="setting-value">{volume}</span>
              </label>
              <input
                type="range"
                className="volume-slider"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>

            <div className="setting-group">
              <label className="setting-label">
                <span>难度</span>
              </label>
              <div className="difficulty-buttons">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    className={`difficulty-btn ${difficulty === d ? 'active' : ''}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d === 'easy' ? '简单' : d === 'normal' ? '普通' : '困难'}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => setShowSettings(false)}>
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
