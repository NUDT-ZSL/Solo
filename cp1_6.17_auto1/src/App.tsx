import { useState, useEffect, useCallback, useRef } from 'react';
import type { Character, StagePosition, Song, GameView, HitResult, ScoreRecord, GameState } from './types';
import { generateNotes, calculateFallDuration } from './modules/noteGenerator';
import { calculateHit, findClosestNote, calculateRating, calculateAccuracy, JUDGEMENT_WINDOWS } from './modules/scoreCalculator';
import RoleSelector from './components/RoleSelector';
import Stage from './components/Stage';
import NotePanel from './components/NotePanel';
import SongSelector from './components/SongSelector';
import Leaderboard from './components/Leaderboard';

const initialPositions: StagePosition[] = [
  { id: 'center', name: '中心', x: 400, y: 250, character: null },
  { id: 'left', name: '左侧', x: 200, y: 250, character: null },
  { id: 'right', name: '右侧', x: 600, y: 250, character: null },
  { id: 'back', name: '后方', x: 400, y: 100, character: null }
];

const initialGameState: GameState = {
  notes: [],
  currentTime: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfectCount: 0,
  goodCount: 0,
  okCount: 0,
  missCount: 0,
  isPlaying: false,
  currentSong: null
};

export default function App() {
  const [currentView, setCurrentView] = useState<GameView>('stage');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [positions, setPositions] = useState<StagePosition[]>(initialPositions);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [hitEffects, setHitEffects] = useState<Array<{ id: string; judgement: HitResult['judgement']; trackIndex: number }>>([]);
  const [lightFlash, setLightFlash] = useState(false);
  const [jumpingTracks, setJumpingTracks] = useState<Set<number>>(new Set());
  const [lastHitJudgement, setLastHitJudgement] = useState<HitResult['judgement'] | null>(null);
  const [lastHitTrackIndex, setLastHitTrackIndex] = useState<number>(-1);
  const [, setActiveHitEffects] = useState<Array<{ id: string; judgement: HitResult['judgement']; trackIndex: number }>>([]);
  
  const hitResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const hitQueueRef = useRef<Array<{ id: string; judgement: HitResult['judgement']; trackIndex: number }>>([]);
  const isProcessingHitRef = useRef(false);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [playerName] = useState('玩家');
  const [fallDuration, setFallDuration] = useState(2);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/characters')
      .then(res => res.json())
      .then(data => setCharacters(data))
      .catch(err => console.error('Failed to fetch characters:', err));

    fetch('http://localhost:3001/api/songs')
      .then(res => res.json())
      .then(data => setSongs(data))
      .catch(err => console.error('Failed to fetch songs:', err));

    fetch('http://localhost:3001/api/scores')
      .then(res => res.json())
      .then(data => setScores(data))
      .catch(err => console.error('Failed to fetch scores:', err));
  }, []);

  useEffect(() => {
    return () => {
      if (hitResetTimerRef.current) {
        clearTimeout(hitResetTimerRef.current);
        hitResetTimerRef.current = null;
      }
      jumpTimersRef.current.forEach(timer => clearTimeout(timer));
      jumpTimersRef.current.clear();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [animationFrameId]);

  const handleDrop = useCallback((character: Character, positionId: string) => {
    setPositions(prev => {
      const newPositions = prev.map(p => {
        if (p.id === positionId) {
          return { ...p, character };
        }
        if (p.character?.id === character.id) {
          return { ...p, character: null };
        }
        return p;
      });
      return newPositions;
    });
  }, []);

  const handleRemoveCharacter = useCallback((positionId: string) => {
    setPositions(prev => prev.map(p => 
      p.id === positionId ? { ...p, character: null } : p
    ));
  }, []);

  const handleSelectSong = useCallback((song: Song) => {
    const notes = generateNotes(song, 4);
    const duration = calculateFallDuration(song.bpm);
    setFallDuration(duration);
    setGameState({
      ...initialGameState,
      notes,
      currentSong: song,
      isPlaying: true
    });
    setGameStartTime(performance.now());
    setCurrentView('game');
  }, []);

  const processHitQueue = useCallback(() => {
    if (isProcessingHitRef.current || hitQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingHitRef.current = true;
    const hit = hitQueueRef.current.shift()!;
    
    setActiveHitEffects(prev => [...prev, hit]);
    setHitEffects(prev => [...prev, hit]);
    setLastHitJudgement(hit.judgement);
    setLastHitTrackIndex(hit.trackIndex);
    setLightFlash(true);
    
    setJumpingTracks(prev => {
      const newSet = new Set(prev);
      newSet.add(hit.trackIndex);
      return newSet;
    });
    
    const existingJumpTimer = jumpTimersRef.current.get(hit.trackIndex);
    if (existingJumpTimer) {
      clearTimeout(existingJumpTimer);
    }
    
    const jumpTimer = setTimeout(() => {
      setJumpingTracks(prev => {
        const newSet = new Set(prev);
        newSet.delete(hit.trackIndex);
        return newSet;
      });
      jumpTimersRef.current.delete(hit.trackIndex);
    }, 300);
    jumpTimersRef.current.set(hit.trackIndex, jumpTimer);
    
    if (hitResetTimerRef.current) {
      clearTimeout(hitResetTimerRef.current);
    }
    
    hitResetTimerRef.current = setTimeout(() => {
      setLightFlash(false);
      setLastHitJudgement(null);
      setLastHitTrackIndex(-1);
      setActiveHitEffects(prev => prev.filter(e => e.id !== hit.id));
      hitResetTimerRef.current = null;
      
      isProcessingHitRef.current = false;
      if (hitQueueRef.current.length > 0) {
        setTimeout(() => processHitQueue(), 50);
      }
    }, 300);
    
    setTimeout(() => {
      setHitEffects(prev => prev.filter(e => e.id !== hit.id));
    }, 500);
  }, []);

  const triggerHitEffect = useCallback((judgement: HitResult['judgement'], trackIndex: number) => {
    const effectId = Date.now().toString() + Math.random() + '-' + Date.now();
    hitQueueRef.current.push({ id: effectId, judgement, trackIndex });
    
    if (!isProcessingHitRef.current) {
      processHitQueue();
    }
  }, [processHitQueue]);

  const handleKeyPress = useCallback((_key: string, trackIndex: number) => {
    if (!gameState.isPlaying) return;
    
    const currentTime = performance.now() - gameStartTime;
    const closestNote = findClosestNote(gameState.notes, currentTime, trackIndex);
    
    if (closestNote) {
      const hit = calculateHit(currentTime, closestNote.timestamp);
      
      setGameState(prev => {
        const newNotes = prev.notes.map(n => 
          n.id === closestNote.id ? { ...n, hit: true } : n
        );
        
        const newCombo = hit.judgement === 'Miss' ? 0 : prev.combo + 1;
        
        return {
          ...prev,
          notes: newNotes,
          score: prev.score + hit.score,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
          perfectCount: prev.perfectCount + (hit.judgement === 'Perfect' ? 1 : 0),
          goodCount: prev.goodCount + (hit.judgement === 'Good' ? 1 : 0),
          okCount: prev.okCount + (hit.judgement === 'OK' ? 1 : 0),
          missCount: prev.missCount + (hit.judgement === 'Miss' ? 1 : 0)
        };
      });
      
      triggerHitEffect(hit.judgement, trackIndex);
    }
  }, [gameState.isPlaying, gameState.notes, gameStartTime, triggerHitEffect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = { 'a': 0, 's': 1, 'd': 2, 'f': 3, 'A': 0, 'S': 1, 'D': 2, 'F': 3 };
      const trackIndex = keyMap[e.key];
      
      if (trackIndex !== undefined && currentView === 'game') {
        e.preventDefault();
        handleKeyPress(e.key.toUpperCase(), trackIndex);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, handleKeyPress]);

  useEffect(() => {
    if (!gameState.isPlaying || !gameState.currentSong) return;
    
    const gameLoop = () => {
      const currentTime = performance.now() - gameStartTime;
      const songDuration = gameState.currentSong!.duration * 1000;
      
      setGameState(prev => ({ ...prev, currentTime }));
      
      setGameState(prev => {
        const newNotes = prev.notes.map(note => {
          if (note.hit || note.missed) return note;
          if (currentTime - note.timestamp > JUDGEMENT_WINDOWS.OK) {
            triggerHitEffect('Miss', note.trackIndex);
            return { ...note, missed: true };
          }
          return note;
        });
        
        const missCount = newNotes.filter(n => n.missed).length;
        
        if (currentTime >= songDuration) {
          return { ...prev, notes: newNotes, isPlaying: false, missCount };
        }
        
        return { 
          ...prev, 
          notes: newNotes, 
          missCount,
          combo: newNotes.some(n => n.missed && currentTime - n.timestamp < 100) ? 0 : prev.combo
        };
      });
      
      if (currentTime < songDuration) {
        const id = requestAnimationFrame(gameLoop);
        setAnimationFrameId(id);
      } else {
        setCurrentView('result');
      }
    };
    
    const id = requestAnimationFrame(gameLoop);
    setAnimationFrameId(id);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameState.isPlaying, gameState.currentSong, gameStartTime, triggerHitEffect]);

  const saveScore = useCallback(async () => {
    const totalNotes = gameState.notes.length;
    const accuracy = calculateAccuracy(
      gameState.perfectCount,
      gameState.goodCount,
      gameState.okCount,
      totalNotes
    );
    const rating = calculateRating(accuracy);
    
    const scoreRecord: Omit<ScoreRecord, 'id' | 'createdAt'> = {
      playerName,
      songId: gameState.currentSong!.id,
      songName: gameState.currentSong!.name,
      totalScore: gameState.score,
      rating,
      accuracy,
      perfectCount: gameState.perfectCount,
      goodCount: gameState.goodCount,
      okCount: gameState.okCount,
      missCount: gameState.missCount
    };
    
    try {
      const response = await fetch('http://localhost:3001/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreRecord)
      });
      
      if (response.ok) {
        const data = await response.json();
        setScores(prev => [...prev, data.score].sort((a, b) => b.totalScore - a.totalScore).slice(0, 10));
      }
    } catch (err) {
      console.error('Failed to save score:', err);
    }
  }, [gameState, playerName]);

  useEffect(() => {
    if (currentView === 'result' && gameState.currentSong) {
      saveScore();
    }
  }, [currentView, gameState.currentSong, saveScore]);

  const handleBackToStage = () => {
    setGameState(initialGameState);
    setCurrentView('stage');
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };

  const handleBackToSelect = () => {
    setGameState(initialGameState);
    setCurrentView('select');
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };

  const totalNotes = gameState.notes.length;
  const accuracy = totalNotes > 0 
    ? calculateAccuracy(gameState.perfectCount, gameState.goodCount, gameState.okCount, totalNotes)
    : 0;
  const rating = calculateRating(accuracy);

  return (
    <div className="app-container">
      {currentView !== 'game' && (
        <RoleSelector 
          characters={characters} 
          onDrop={handleDrop}
          positions={positions}
        />
      )}
      
      <div className="main-content">
        {currentView === 'stage' && (
          <>
            <h1 className="view-title">🎵 虚拟乐队 - 舞台搭建</h1>
            <Stage 
              positions={positions}
              onDrop={handleDrop}
              onRemoveCharacter={handleRemoveCharacter}
              lightFlash={lightFlash}
              jumpingTracks={jumpingTracks}
              hitJudgement={lastHitJudgement}
              hitTrackIndex={lastHitTrackIndex}
            />
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={() => setCurrentView('select')}>
                选择曲目开始游戏
              </button>
            </div>
          </>
        )}
        
        {currentView === 'select' && (
          <>
            <h1 className="view-title">🎵 选择曲目</h1>
            <SongSelector 
              songs={songs}
              onSelectSong={handleSelectSong}
              onBack={() => setCurrentView('stage')}
            />
          </>
        )}
        
        {currentView === 'game' && gameState.currentSong && (
          <>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              width: '800px', 
              marginBottom: '10px',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ color: '#E0E0E0', fontSize: '20px' }}>{gameState.currentSong.name}</h2>
                <p style={{ color: '#95A5A6', fontSize: '14px' }}>BPM: {gameState.currentSong.bpm}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#4CAF50', fontSize: '24px', fontWeight: 'bold' }}>
                  分数: {gameState.score}
                </p>
                <p style={{ color: '#FFD93D', fontSize: '16px' }}>
                  连击: {gameState.combo} (最高: {gameState.maxCombo})
                </p>
              </div>
            </div>
            
            <Stage 
              positions={positions}
              onDrop={handleDrop}
              onRemoveCharacter={handleRemoveCharacter}
              lightFlash={lightFlash}
              jumpingTracks={jumpingTracks}
              hitJudgement={lastHitJudgement}
              hitTrackIndex={lastHitTrackIndex}
            />
            
            <NotePanel 
              notes={gameState.notes}
              currentTime={gameState.currentTime}
              fallDuration={fallDuration}
              bpm={gameState.currentSong?.bpm}
              positions={positions}
              hitEffects={hitEffects}
            />
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              width: '400px', 
              marginTop: '10px' 
            }}>
              {['A', 'S', 'D', 'F'].map((key, i) => (
                <div key={key} style={{
                  width: '50px',
                  height: '40px',
                  backgroundColor: positions[i]?.character?.color || '#2D2D4A',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  border: jumpingTracks.has(i) ? '3px solid #FFFFFF' : '2px solid #4CAF50',
                  transition: 'all 0.15s ease-out'
                }}>
                  {key}
                </div>
              ))}
            </div>
            
            <button 
              className="btn btn-secondary" 
              style={{ marginTop: '20px' }}
              onClick={handleBackToStage}
            >
              退出游戏
            </button>
          </>
        )}
        
        {currentView === 'result' && (
          <>
            <h1 className="view-title">🎉 演奏结束</h1>
            <div style={{
              backgroundColor: '#2D2D4A',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              minWidth: '500px'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: rating === 'S' ? '#FFD700' : rating === 'A' ? '#C0C0C0' : rating === 'B' ? '#CD7F32' : '#8B4513',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '60px',
                fontWeight: 'bold',
                color: '#1E1E2E',
                margin: '0 auto 20px',
                animation: 'scaleIn 0.4s ease-out'
              }}>
                {rating}
              </div>
              
              <h2 style={{ fontSize: '28px', marginBottom: '20px' }}>
                {gameState.currentSong?.name}
              </h2>
              
              <div style={{ fontSize: '48px', color: '#4CAF50', fontWeight: 'bold', marginBottom: '10px' }}>
                {gameState.score} 分
              </div>
              
              <div style={{ fontSize: '20px', color: '#95A5A6', marginBottom: '30px' }}>
                准确率: {accuracy.toFixed(1)}%
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '10px', 
                marginBottom: '30px' 
              }}>
                <div style={{ backgroundColor: '#00FF8833', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ color: '#00FF88', fontSize: '24px', fontWeight: 'bold' }}>
                    {gameState.perfectCount}
                  </div>
                  <div style={{ color: '#00FF88', fontSize: '14px' }}>Perfect</div>
                </div>
                <div style={{ backgroundColor: '#3498DB33', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ color: '#3498DB', fontSize: '24px', fontWeight: 'bold' }}>
                    {gameState.goodCount}
                  </div>
                  <div style={{ color: '#3498DB', fontSize: '14px' }}>Good</div>
                </div>
                <div style={{ backgroundColor: '#FFD93D33', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ color: '#FFD93D', fontSize: '24px', fontWeight: 'bold' }}>
                    {gameState.okCount}
                  </div>
                  <div style={{ color: '#FFD93D', fontSize: '14px' }}>OK</div>
                </div>
                <div style={{ backgroundColor: '#E74C3C33', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ color: '#E74C3C', fontSize: '24px', fontWeight: 'bold' }}>
                    {gameState.missCount}
                  </div>
                  <div style={{ color: '#E74C3C', fontSize: '14px' }}>Miss</div>
                </div>
              </div>
              
              <div style={{ color: '#95A5A6', marginBottom: '20px' }}>
                最高连击: {gameState.maxCombo}
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={handleBackToSelect}>
                  再玩一次
                </button>
                <button className="btn btn-secondary" onClick={handleBackToStage}>
                  返回舞台
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {currentView !== 'game' && (
        <Leaderboard scores={scores} />
      )}
    </div>
  );
}
