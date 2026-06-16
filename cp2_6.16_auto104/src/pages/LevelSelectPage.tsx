import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Lock, Play } from 'lucide-react';

interface LevelInfo {
  id: number;
  name: string;
  difficulty: number;
}

interface ProgressData {
  unlockedLevels: number[];
  completedLevels: number[];
}

export default function LevelSelectPage() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [progress, setProgress] = useState<ProgressData>({
    unlockedLevels: [1],
    completedLevels: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [levelsRes, progressRes] = await Promise.all([
          fetch('/api/levels'),
          fetch('/api/progress')
        ]);
        
        const levelsData = await levelsRes.json();
        const progressData = await progressRes.json();
        
        setLevels(levelsData);
        setProgress(progressData);
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleLevelClick = (levelId: number) => {
    if (progress.unlockedLevels.includes(levelId)) {
      navigate(`/game/${levelId}`);
    }
  };

  const renderStars = (difficulty: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i <= difficulty
                ? 'text-[#ffa502] fill-[#ffa502]'
                : 'text-[#636e72]'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 
          className="text-5xl font-bold text-white mb-4"
          style={{
            textShadow: '0 0 30px rgba(0, 210, 255, 0.5)'
          }}
        >
          时间回溯
        </h1>
        <p className="text-white/60 text-lg">
          操控时间分身，解开时空谜题
        </p>
        <div className="mt-4 text-white/40 text-sm">
          已通关 {progress.completedLevels.length} / {levels.length} 关
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        {levels.map(level => {
          const isUnlocked = progress.unlockedLevels.includes(level.id);
          const isCompleted = progress.completedLevels.includes(level.id);
          
          return (
            <div
              key={level.id}
              onClick={() => handleLevelClick(level.id)}
              className={`
                w-[200px] h-[150px] rounded-xl p-4 flex flex-col justify-between
                transition-all duration-300 ease-out cursor-pointer
                ${isUnlocked
                  ? 'bg-[#2d3436] hover:bg-[#3d4446] hover:scale-105 hover:shadow-lg hover:shadow-[#00d2ff]/20'
                  : 'bg-[#636e72]/50 cursor-not-allowed'
                }
              `}
              style={{
                border: isCompleted ? '2px solid #2ed573' : '2px solid transparent'
              }}
            >
              <div className="flex justify-between items-start">
                <div className={`
                  text-2xl font-bold
                  ${isUnlocked ? 'text-white' : 'text-white/40'}
                `}>
                  {level.id}
                </div>
                {!isUnlocked && (
                  <Lock className="w-5 h-5 text-white/40" />
                )}
                {isCompleted && (
                  <div className="w-6 h-6 rounded-full bg-[#2ed573] flex items-center justify-center">
                    <Play className="w-3 h-3 text-white fill-white" />
                  </div>
                )}
              </div>
              
              <div>
                <div className={`
                  text-lg font-medium mb-2
                  ${isUnlocked ? 'text-white' : 'text-white/40'}
                `}>
                  {level.name}
                </div>
                <div className="flex items-center justify-between">
                  {renderStars(level.difficulty)}
                  {isUnlocked && (
                    <span className="text-white/40 text-xs">
                      难度 {level.difficulty}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-white/40 text-sm text-center max-w-md">
        <p className="mb-2">操作说明：</p>
        <p>A/D 或 ←/→ 移动 · W/↑/空格 跳跃 · R 召唤时间分身</p>
        <p className="mt-2 text-white/30">
          时间分身会复现你过去3秒的操作，利用分身踩踏开关开辟道路
        </p>
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3 + Math.random() * 0.5,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
