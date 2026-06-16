import { useState, useEffect, useCallback } from 'react';
import Stage from './components/Stage';
import NotePanel from './components/NotePanel';
import RoleSelector from './components/RoleSelector';
import { generateNotes, calculateFallDuration, Note } from './modules/noteGenerator';
import { calculateHit, calculateGrade, getGradeColor, HitResult } from './modules/scoreCalculator';
import type { Character, Song, ScoreEntry, PlacedCharacter, GameView, StagePosition } from './types';
import './App.css';

const STAGE_POSITIONS: StagePosition[] = [
  { id: 'center', name: '中心', x: 50, y: 60 },
  { id: 'left', name: '左侧', x: 25, y: 50 },
  { id: 'right', name: '右侧', x: 75, y: 50 },
  { id: 'back', name: '后方', x: 50, y: 30 }
];

const TRACK_KEYS = ['A', 'S', 'D', 'F'];

function App() {
  const [view, setView] = useState<GameView>('stage');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [placedCharacters, setPlacedCharacters] = useState<PlacedCharacter[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [gameNotes, setGameNotes] = useState<Note[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hitResults, setHitResults] = useState<{ result: HitResult; trackIndex: number; id: number }[]>([]);
  const [hitNotes, setHitNotes] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [playerName, setPlayerName] = useState('玩家');
  const [lightFlash, setLightFlash] = useState(false);
  const [jumpingTracks, setJumpingTracks] = useState<Set<number>>(new Set());
  const [perfectCount, setPerfectCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [resultData, setResultData] = useState<{ totalScore: number; grade: string; hitRate: number; totalNotes: number; gradeColor: string } | null>(null);

  useEffect(() => {
    fetch('/api/characters')
      .then(res => res.json())
      .then(data => setCharacters(data))
      .catch(err => console.error('Failed to load characters:', err));

    fetch('/api/songs')
      .then(res => res.json())
      .then(data => setSongs(data))
      .catch(err => console.error('Failed to load songs:', err));

    fetch('/api/scores')
      .then(res => res.json())
      .then(data => setScores(data))
      .catch(err => console.error('Failed to load scores:', err));
  }, []);

  const handleDropOnStage = useCallback((character: Character, positionId: string) => {
    setPlacedCharacters(prev => {
      const filtered = prev.filter(p => p.positionId !== positionId && p.characterId !== character.id);
      return [...filtered, { characterId: character.id, positionId, character }];
    });
  }, []);

  const startGame = useCallback((song: Song) => {
    const notes = generateNotes(song.bpm, song.duration, 4);
    setGameNotes(notes);
    setSelectedSong(song);
    setCurrentScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHitNotes(new Set());
    setHitResults([]);
    setPerfectCount(0);
    setGoodCount(0);
    setOkCount(0);
    setMissCount(0);
    setIsPlaying(false);
    setResultData(null);
    setView('game');
  }, []);

  const beginPlaying = useCallback(() => {
    setIsPlaying(true);
    setGameStartTime(performance.now());
  }, []);

  const triggerHitEffect = useCallback((trackIndex: number, result: HitResult) => {
    const effectId = Date.now();
    setHitResults(prev => [...prev, { result, trackIndex, id: effectId }]);
    setTimeout(() => {
      setHitResults(prev => prev.filter(h => h.id !== effectId));
    }, 500);

    if (result !== 'miss') {
      setLightFlash(true);
      setTimeout(() => setLightFlash(false), 200);

      setJumpingTracks(prev => {
        const next = new Set(prev);
        next.add(trackIndex);
        return next;
      });
      setTimeout(() => {
        setJumpingTracks(prev => {
          const next = new Set(prev);
          next.delete(trackIndex);
          return next;
        });
      }, 150);
    }
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    if (!isPlaying || !selectedSong) return;

    const trackIndex = TRACK_KEYS.indexOf(key.toUpperCase());
    if (trackIndex === -1) return;

    const currentTime = performance.now() - gameStartTime;
    const fallDuration = calculateFallDuration(selectedSong.bpm);
    const judgmentLineTime = currentTime;

    let closestNote: Note | null = null;
    let closestDiff = Infinity;

    for (const note of gameNotes) {
      if (note.trackIndex !== trackIndex) continue;
      if (hitNotes.has(note.id)) continue;

      const noteArrivalTime = note.time + fallDuration;
      const diff = judgmentLineTime - noteArrivalTime;
      const absDiff = Math.abs(diff);

      if (absDiff < closestDiff && absDiff <= 200) {
        closestDiff = absDiff;
        closestNote = note;
      }
    }

    if (closestNote) {
      const noteArrivalTime = closestNote.time + fallDuration;
      const hitResult = calculateHit(judgmentLineTime, noteArrivalTime);
      
      setHitNotes(prev => new Set([...prev, closestNote!.id]));
      setCurrentScore(prev => prev + hitResult.score * (1 + Math.floor(combo / 10) * 0.1));
      
      if (hitResult.result === 'perfect') {
        setPerfectCount(prev => prev + 1);
      } else if (hitResult.result === 'good') {
        setGoodCount(prev => prev + 1);
      } else if (hitResult.result === 'ok') {
        setOkCount(prev => prev + 1);
      } else {
        setMissCount(prev => prev + 1);
      }
      
      if (hitResult.result !== 'miss') {
        setCombo(prev => {
          const newCombo = prev + 1;
          setMaxCombo(max => Math.max(max, newCombo));
          return newCombo;
        });
      } else {
        setCombo(0);
      }

      triggerHitEffect(trackIndex, hitResult.result);
    }
  }, [isPlaying, selectedSong, gameNotes, hitNotes, combo, gameStartTime, triggerHitEffect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view === 'game' && isPlaying) {
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isPlaying, handleKeyPress]);

  useEffect(() => {
    if (!isPlaying || !selectedSong || gameNotes.length === 0) return;

    const fallDuration = calculateFallDuration(selectedSong.bpm);
    const gameDuration = selectedSong.duration + fallDuration + 1000;

    const checkMissedNotes = () => {
      const currentTime = performance.now() - gameStartTime;
      
      for (const note of gameNotes) {
        if (hitNotes.has(note.id)) continue;
        const noteArrivalTime = note.time + fallDuration;
        
        if (currentTime - noteArrivalTime > 200) {
          setHitNotes(prev => new Set([...prev, note.id]));
          setMissCount(prev => prev + 1);
          setCombo(0);
          triggerHitEffect(note.trackIndex, 'miss');
        }
      }
    };

    const missInterval = setInterval(checkMissedNotes, 50);

    const endTimer = setTimeout(() => {
      setIsPlaying(false);
      const totalNotes = gameNotes.length;
      const hitCount = perfectCount + goodCount + okCount;
      const hitRate = totalNotes > 0 ? Math.round((hitCount / totalNotes) * 100) : 0;
      const grade = calculateGrade(hitRate);
      const gradeColor = getGradeColor(grade);
      const totalScore = Math.floor(currentScore);

      const result = {
        totalScore,
        grade,
        hitRate,
        totalNotes,
        gradeColor
      };
      setResultData(result);

      fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName,
          songId: selectedSong.id,
          songName: selectedSong.name,
          totalScore,
          grade,
          hitRate
        })
      }).then(() => {
        fetch('/api/scores')
          .then(res => res.json())
          .then(data => setScores(data));
      });

      setView('result');
    }, gameDuration);

    return () => {
      clearInterval(missInterval);
      clearTimeout(endTimer);
    };
  }, [isPlaying, selectedSong, gameNotes, gameStartTime, hitNotes, currentScore, playerName, triggerHitEffect]);

  const renderSongSelect = () => (
    <div className="song-select">
      <h2>选择曲目</h2>
      <div className="song-list">
        {songs.map(song => (
          <div
            key={song.id}
            className="song-card"
            onClick={() => startGame(song)}
          >
            <h3>{song.name}</h3>
            <p>BPM: {song.bpm}</p>
            <p>难度: {song.difficulty}</p>
            <p>时长: {Math.floor(song.duration / 1000)}秒</p>
          </div>
        ))}
      </div>
      <button className="back-btn" onClick={() => setView('stage')}>
        返回舞台
      </button>
    </div>
  );

  const renderResult = () => (
    <div className="result-screen">
      <h2>演奏结束！</h2>
      {resultData && (
        <div className="result-content">
          <div 
            className="grade-badge" 
            style={{ 
              animation: 'gradeScale 0.4s ease-out',
              backgroundColor: resultData.gradeColor,
              boxShadow: `0 0 40px ${resultData.gradeColor}80`
            }}
          >
            {resultData.grade}
          </div>
          <div className="result-stats">
            <p>总得分: <span>{resultData.totalScore}</span></p>
            <p>命中率: <span>{resultData.hitRate}%</span></p>
            <p>最大连击: <span>{maxCombo}</span></p>
          </div>
        </div>
      )}
      <div className="result-buttons">
        <button onClick={() => selectedSong && startGame(selectedSong)}>
          再来一次
        </button>
        <button onClick={() => setView('songSelect')}>
          选择曲目
        </button>
        <button onClick={() => setView('stage')}>
          返回舞台
        </button>
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="game-view">
      <div className="game-header">
        <h2>{selectedSong?.name}</h2>
        <p>BPM: {selectedSong?.bpm}</p>
        <div className="score-display">
          <p>得分: {Math.floor(currentScore)}</p>
          <p>连击: {combo}</p>
        </div>
      </div>
      {!isPlaying ? (
        <div className="game-start">
          <p>准备好了吗？</p>
          <button onClick={beginPlaying}>开始演奏</button>
          <p className="hint">使用 A S D F 键演奏</p>
        </div>
      ) : (
        <NotePanel
          notes={gameNotes}
          bpm={selectedSong?.bpm || 120}
          hitNotes={hitNotes}
          hitResults={hitResults}
          isPlaying={isPlaying}
          gameStartTime={gameStartTime}
        />
      )}
      <div className="game-stage">
        <Stage
          characters={characters}
          placedCharacters={placedCharacters}
          positions={STAGE_POSITIONS}
          onDrop={handleDropOnStage}
          lightFlash={lightFlash}
          jumpingTracks={jumpingTracks}
          isGameMode={true}
        />
      </div>
    </div>
  );

  const renderStageView = () => (
    <div className="app-container">
      <div className="sidebar left-sidebar">
        <h3>角色选择</h3>
        <RoleSelector characters={characters} />
      </div>
      <div className="main-content">
        <h1 className="app-title">虚拟乐队舞台</h1>
        <Stage
          characters={characters}
          placedCharacters={placedCharacters}
          positions={STAGE_POSITIONS}
          onDrop={handleDropOnStage}
          lightFlash={false}
          jumpingTracks={new Set()}
          isGameMode={false}
        />
        <div className="stage-controls">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="输入玩家名"
          />
          <button
            className="start-btn"
            onClick={() => setView('songSelect')}
            disabled={placedCharacters.length === 0}
          >
            开始演出
          </button>
        </div>
      </div>
      <div className="sidebar right-sidebar">
        <h3>排行榜</h3>
        <div className="scoreboard">
          {scores.slice(0, 10).map((score, index) => (
            <div key={score.id} className="score-item">
              <span className="rank">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
              </span>
              <div className="score-info">
                <span className="player-name">{score.playerName}</span>
                <span className="score-value">{score.totalScore}分</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      {view === 'stage' && renderStageView()}
      {view === 'songSelect' && renderSongSelect()}
      {view === 'game' && renderGame()}
      {view === 'result' && renderResult()}
    </div>
  );
}

export default App;
