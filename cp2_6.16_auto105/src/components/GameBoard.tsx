import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recipe, useGameRecords } from '../hooks/useGameRecords';

interface GameBoardProps {
  recipe: Recipe;
  category: string;
}

interface MatchingState {
  [stepId: number]: number | null;
}

interface ShuffledStep {
  originalIndex: number;
  description: string;
  placed: boolean;
}

export function GameBoard({ recipe, category }: GameBoardProps) {
  const navigate = useNavigate();
  const { submitGameRecord } = useGameRecords();
  
  const [score, setScore] = useState(0);
  const [timeUsed, setTimeUsed] = useState(0);
  const [correctMatches, setCorrectMatches] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [errorButton, setErrorButton] = useState<number | null>(null);
  const [successCheck, setSuccessCheck] = useState<number | null>(null);
  const [matchingState, setMatchingState] = useState<MatchingState>({});
  const [shuffledSteps, setShuffledSteps] = useState<ShuffledStep[]>([]);
  const [draggedStep, setDraggedStep] = useState<number | null>(null);
  const [dragOverStep, setDragOverStep] = useState<number | null>(null);
  const [funFact, setFunFact] = useState('');
  
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const shuffled = recipe.steps
      .map((step, index) => ({
        originalIndex: index,
        description: step.description,
        placed: false,
      }))
      .sort(() => Math.random() - 0.5);
    setShuffledSteps(shuffled);
    
    const state: MatchingState = {};
    recipe.steps.forEach((_, index) => {
      state[index] = null;
    });
    setMatchingState(state);
    
    const randomFact = recipe.funFacts[Math.floor(Math.random() * recipe.funFacts.length)];
    setFunFact(randomFact);
    
    audioRefs.current = recipe.steps.map(() => null);
    
    timerRef.current = setInterval(() => {
      setTimeUsed((prev) => prev + 1);
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recipe]);

  const playSound = useCallback((stepIndex: number) => {
    const audio = audioRefs.current[stepIndex];
    if (!audio) return;
    
    audio.currentTime = 0;
    setPlayingAudio(stepIndex);
    
    audio.onended = () => {
      setPlayingAudio(null);
    };
    
    audio.onerror = () => {
      setPlayingAudio(null);
    };
    
    audio.play().catch(() => {
      setPlayingAudio(null);
    });
  }, []);

  const handleDragStart = (e: React.DragEvent, stepIndex: number) => {
    setDraggedStep(stepIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', stepIndex.toString());
  };

  const handleDragEnd = () => {
    setDraggedStep(null);
    setDragOverStep(null);
  };

  const handleDragOver = (e: React.DragEvent, stepIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStep(stepIndex);
  };

  const handleDragLeave = () => {
    setDragOverStep(null);
  };

  const handleDrop = (e: React.DragEvent, targetStepIndex: number) => {
    e.preventDefault();
    setDragOverStep(null);
    
    if (draggedStep === null) return;
    if (matchingState[targetStepIndex] !== null) return;
    
    const shuffledIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const shuffledStep = shuffledSteps[shuffledIndex];
    
    if (shuffledStep.placed) return;
    
    setTotalAttempts((prev) => prev + 1);
    
    if (shuffledStep.originalIndex === targetStepIndex) {
      setScore((prev) => prev + 10);
      setCorrectMatches((prev) => prev + 1);
      setSuccessCheck(targetStepIndex);
      
      setTimeout(() => {
        setSuccessCheck(null);
      }, 1000);
      
      setMatchingState((prev) => ({
        ...prev,
        [targetStepIndex]: shuffledIndex,
      }));
      
      setShuffledSteps((prev) =>
        prev.map((step, idx) =>
          idx === shuffledIndex ? { ...step, placed: true } : step
        )
      );
      
      const newCorrectMatches = correctMatches + 1;
      if (newCorrectMatches === recipe.steps.length) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setTimeout(() => {
          setIsGameComplete(true);
        }, 500);
      }
    } else {
      setScore((prev) => Math.max(0, prev - 5));
      setErrorButton(targetStepIndex);
      setTimeout(() => {
        setErrorButton(null);
      }, 500);
    }
    
    setDraggedStep(null);
  };

  const handlePlayAgain = () => {
    navigate(`/game/${category}`);
  };

  const handleBackHome = () => {
    navigate('/');
  };

  const handleSubmitRecord = useCallback(async () => {
    const accuracy = totalAttempts > 0 ? (correctMatches / totalAttempts) * 100 : 100;
    try {
      await submitGameRecord({
        recipeId: recipe.id,
        recipeName: recipe.name,
        category,
        timeUsed,
        score,
        accuracy,
      });
    } catch (err) {
      console.error('Failed to submit game record:', err);
    }
  }, [recipe, category, timeUsed, score, correctMatches, totalAttempts, submitGameRecord]);

  useEffect(() => {
    if (isGameComplete) {
      handleSubmitRecord();
    }
  }, [isGameComplete, handleSubmitRecord]);

  const accuracy = totalAttempts > 0 ? Math.round((correctMatches / totalAttempts) * 100) : 0;

  return (
    <div className="game-container">
      <div className="game-header">
        <div>
          <h2 className="page-title" style={{ marginBottom: 0 }}>{recipe.name}</h2>
          <p className="page-subtitle" style={{ marginBottom: 0, marginTop: 4 }}>
            聆听音效，拖拽步骤卡片到对应位置
          </p>
        </div>
        <div className="game-info">
          <div className="game-info-item">
            <span className="game-info-label">用时</span>
            <span className="game-info-value">{timeUsed}s</span>
          </div>
          <div className="game-info-item">
            <span className="game-info-label">得分</span>
            <span className="game-info-value">{score}</span>
          </div>
          <div className="game-info-item">
            <span className="game-info-label">正确率</span>
            <span className="game-info-value">{accuracy}%</span>
          </div>
        </div>
      </div>

      <div className="game-board">
        <div className="sound-section">
          <h3 className="section-title">🎵 音效按钮</h3>
          <div className="sound-buttons">
            {recipe.steps.map((step, index) => (
              <div key={step.id} className="sound-button-container">
                <button
                  className={`sound-button ${playingAudio === index ? 'playing' : ''} ${errorButton === index ? 'error' : ''}`}
                  onClick={() => playSound(index)}
                  disabled={playingAudio !== null}
                >
                  {playingAudio === index ? (
                    <>
                      <span>🔊</span>
                      <span>播放中...</span>
                    </>
                  ) : (
                    <>
                      <span>▶️</span>
                      <span>步骤 {step.id}</span>
                    </>
                  )}
                </button>
                <audio
                  ref={(el) => {
                    audioRefs.current[index] = el;
                  }}
                  src={step.audio}
                  preload="auto"
                />
                {successCheck === index && (
                  <span className="success-check">✓</span>
                )}
                <div
                  className={`drop-zone ${dragOverStep === index ? 'drag-over' : ''} ${matchingState[index] !== null ? 'has-card' : ''}`}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {matchingState[index] !== null ? (
                    <div className="drag-card" style={{ opacity: 1 }}>
                      {shuffledSteps[matchingState[index]!].description}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>拖拽步骤到此处</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="drag-section">
          <h3 className="section-title">📝 步骤卡片</h3>
          <div className="drag-cards">
            {shuffledSteps.map((step, index) => (
              <div
                key={index}
                className={`drag-card ${draggedStep === index ? 'dragging' : ''} ${step.placed ? 'placed' : ''}`}
                draggable={!step.placed}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
              >
                {step.description}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isGameComplete && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">🎉 游戏完成！</h2>
            <div className="modal-stats">
              <div className="modal-stat">
                <span className="modal-stat-label">用时</span>
                <span className="modal-stat-value">{timeUsed}s</span>
              </div>
              <div className="modal-stat">
                <span className="modal-stat-label">正确率</span>
                <span className="modal-stat-value">{accuracy}%</span>
              </div>
              <div className="modal-stat">
                <span className="modal-stat-label">总得分</span>
                <span className="modal-stat-value">{score}</span>
              </div>
            </div>
            <div className="fun-fact-card">
              <span className="fun-fact-label">💡 趣味烹饪知识</span>
              {funFact}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleBackHome}>
                返回首页
              </button>
              <button className="btn btn-primary" onClick={handlePlayAgain}>
                再玩一次
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
