import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import { useGameLoop } from '../hooks/useGameLoop';

interface LevelData {
  id: number;
  name: string;
  difficulty: number;
  platforms: { x: number; y: number; width: number; height: number; movable?: boolean }[];
  spikes: { x: number; y: number }[];
  switches: { x: number; y: number; targetPlatformIndex: number }[];
  start: { x: number; y: number };
  goal: { x: number; y: number };
  worldWidth: number;
  worldHeight: number;
}

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState({
    cloneRemainingTime: 0,
    hasActiveClone: false,
    isRunning: true
  });
  const [levelComplete, setLevelComplete] = useState(false);
  const [recordingPulse, setRecordingPulse] = useState(false);
  const stateUpdateRef = useRef<number | null>(null);

  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setRecordingPulse(prev => !prev);
    }, 500);
    return () => clearInterval(pulseInterval);
  }, []);

  useEffect(() => {
    if (!id) return;
    
    const fetchLevel = async () => {
      try {
        const response = await fetch(`/api/level/${id}`);
        const data = await response.json();
        setLevelData(data);
      } catch (e) {
        console.error('Failed to load level:', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLevel();
  }, [id]);

  const handleLevelComplete = useCallback(async () => {
    setLevelComplete(true);
    if (id) {
      try {
        await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ completedLevel: parseInt(id) }),
        });
      } catch (e) {
        console.error('Failed to save progress:', e);
      }
    }
  }, [id]);

  const handleReset = useCallback(() => {
    setLevelComplete(false);
  }, []);

  const { resetLevel } = useGameLoop(
    canvasRef,
    levelData,
    handleLevelComplete,
    handleReset
  );

  useEffect(() => {
    const updateState = () => {
      setGameState(prev => ({
        cloneRemainingTime: Math.max(0, prev.cloneRemainingTime - 0.05),
        hasActiveClone: prev.hasActiveClone && prev.cloneRemainingTime > 0.05,
        isRunning: prev.isRunning
      }));
      stateUpdateRef.current = requestAnimationFrame(updateState);
    };
    
    stateUpdateRef.current = requestAnimationFrame(updateState);
    
    return () => {
      if (stateUpdateRef.current) {
        cancelAnimationFrame(stateUpdateRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.hasActiveClone) {
        setGameState(prev => ({
          ...prev,
          cloneRemainingTime: Math.max(0, prev.cloneRemainingTime - 0.1)
        }));
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [gameState.hasActiveClone]);

  const handleResetClick = () => {
    resetLevel();
    setLevelComplete(false);
  };

  const handleBackClick = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  if (!levelData) {
    return (
      <div className="min-h-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="text-white text-xl">关卡不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0c29] flex items-center justify-center p-4">
      <div 
        className="relative rounded-lg overflow-hidden"
        style={{
          boxShadow: '0 0 40px rgba(0, 210, 255, 0.2)',
          border: '4px solid rgba(26, 26, 46, 0.9)',
          backgroundColor: 'rgba(26, 26, 46, 0.9)'
        }}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="block"
        />

        <div className="absolute top-4 right-4 flex gap-3">
          <button
            onClick={handleResetClick}
            className="w-8 h-8 rounded-full bg-[#ff4757] hover:bg-[#ff6b81] flex items-center justify-center transition-all duration-300 ease-out hover:scale-110"
            title="重置关卡"
          >
            <RotateCcw className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleBackClick}
            className="px-4 h-8 rounded-md bg-[#2ed573] hover:bg-[#3ae37d] flex items-center justify-center transition-all duration-300 ease-out hover:scale-105"
            title="返回关卡选择"
          >
            <ArrowLeft className="w-4 h-4 text-white mr-1" />
            <span className="text-white text-sm font-medium">返回</span>
          </button>
        </div>

        <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full bg-[#ff4757] transition-opacity duration-300"
              style={{
                opacity: recordingPulse ? 1 : 0.3,
                boxShadow: recordingPulse ? '0 0 10px #ff4757' : 'none'
              }}
            />
            <span className="text-white/70 text-xs">录制中</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-[#333] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ff6b6b] transition-all duration-100"
                style={{
                  width: gameState.hasActiveClone 
                    ? `${(gameState.cloneRemainingTime / 6) * 100}%` 
                    : '0%'
                }}
              />
            </div>
            <span className="text-white/70 text-xs w-12">
              {gameState.hasActiveClone 
                ? `${gameState.cloneRemainingTime.toFixed(1)}s` 
                : '按R召唤'}
            </span>
          </div>

          <div className="text-white/70 text-xs border-l border-white/20 pl-4">
            关卡 {levelData.id}
          </div>
        </div>

        {levelComplete && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-[#1a1a2e] p-8 rounded-xl text-center border border-[#2ed573]/30" style={{ boxShadow: '0 0 40px rgba(46, 213, 115, 0.3)' }}>
              <h2 className="text-3xl font-bold text-[#2ed573] mb-4">关卡完成!</h2>
              <p className="text-white/70 mb-6">{levelData.name}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleResetClick}
                  className="px-6 py-2 bg-[#ff4757] hover:bg-[#ff6b81] text-white rounded-lg transition-all duration-300 ease-out hover:scale-105"
                >
                  再玩一次
                </button>
                <button
                  onClick={handleBackClick}
                  className="px-6 py-2 bg-[#2ed573] hover:bg-[#3ae37d] text-white rounded-lg transition-all duration-300 ease-out hover:scale-105"
                >
                  返回选关
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 text-white/30 text-xs">
          A/D移动 · W跳跃 · R回溯
        </div>
      </div>
    </div>
  );
}
