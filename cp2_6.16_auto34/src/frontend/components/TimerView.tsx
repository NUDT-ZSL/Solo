import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Recipe {
  id: string;
  name: string;
  cuisine: 'chinese' | 'western' | 'japanese' | 'other';
  ingredients: { name: string; amount: string }[];
  steps: { description: string; duration: number }[];
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

interface TimerViewProps {
  recipe: Recipe;
  onClose: () => void;
}

const TimerView: React.FC<TimerViewProps> = ({ recipe, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(recipe.steps[0]?.duration * 60 || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  const totalSteps = recipe.steps.length;
  const currentStepData = recipe.steps[currentStep];
  const totalStepTime = currentStepData?.duration * 60 || 0;
  const progress = totalStepTime > 0 ? ((totalStepTime - timeRemaining) / totalStepTime) * 100 : 0;
  const isLowTime = timeRemaining > 0 && timeRemaining / totalStepTime < 0.3;

  const updateTimer = useCallback((timestamp: number) => {
    if (!lastUpdateRef.current) {
      lastUpdateRef.current = timestamp;
    }

    const delta = timestamp - lastUpdateRef.current;

    if (delta >= 200) {
      lastUpdateRef.current = timestamp;
      
      setTimeRemaining((prev) => {
        if (prev <= 0.2) {
          setIsRunning(false);
          return 0;
        }
        return Math.max(0, prev - delta / 1000);
      });
    }

    if (isRunning && !isPaused) {
      animationRef.current = requestAnimationFrame(updateTimer);
    }
  }, [isRunning, isPaused]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      lastUpdateRef.current = 0;
      animationRef.current = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, isPaused, updateTimer]);

  useEffect(() => {
    if (timeRemaining <= 0 && isRunning) {
      setIsRunning(false);
    }
  }, [timeRemaining, isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(currentStepData?.duration * 60 || 0);
    lastUpdateRef.current = 0;
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setTimeRemaining(recipe.steps[nextStep].duration * 60);
      setIsRunning(false);
      setIsPaused(false);
      lastUpdateRef.current = 0;
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setTimeRemaining(recipe.steps[prevStep].duration * 60);
      setIsRunning(false);
      setIsPaused(false);
      lastUpdateRef.current = 0;
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fafafa',
    zIndex: 500,
    display: 'flex',
    flexDirection: 'column'
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
  };

  const headerLeftStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    transition: 'background-color 200ms ease, transform 150ms ease'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: '#333'
  };

  const progressBarContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '8px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    overflow: 'hidden'
  };

  const progressBarStyle: React.CSSProperties = {
    height: '100%',
    width: `${progress}%`,
    background: isLowTime && isRunning
      ? '#e53935'
      : 'linear-gradient(90deg, #ffb74d 0%, #ff7043 100%)',
    borderRadius: '4px',
    transition: 'width 0.2s linear, background-color 0.3s ease'
  };

  const progressBarClass = isLowTime && isRunning ? 'progress-bar-blink' : '';

  const contentStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%'
  };

  const stepIndicatorStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px'
  };

  const timerDisplayStyle: React.CSSProperties = {
    fontSize: '72px',
    fontWeight: 300,
    color: isLowTime && isRunning ? '#e53935' : '#ff7043',
    marginBottom: '24px',
    fontVariantNumeric: 'tabular-nums',
    textShadow: isLowTime && isRunning ? '0 0 20px rgba(229, 57, 53, 0.4)' : 'none',
    transition: 'color 0.3s ease'
  };

  const timerDisplayClass = isLowTime && isRunning ? 'timer-display-blink' : '';

  const stepDescriptionStyle: React.CSSProperties = {
    fontSize: '20px',
    color: '#333',
    textAlign: 'center',
    marginBottom: '32px',
    lineHeight: 1.6,
    minHeight: '64px'
  };

  const stepTimeStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#666',
    marginBottom: '32px'
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: '14px 32px',
    borderRadius: '24px',
    backgroundColor: '#ff7043',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 200ms ease, transform 150ms ease, box-shadow 200ms ease',
    minWidth: '140px'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '14px 32px',
    borderRadius: '24px',
    backgroundColor: '#fff',
    color: '#333',
    fontSize: '16px',
    fontWeight: 500,
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    transition: 'background-color 200ms ease, transform 150ms ease, border-color 200ms ease',
    minWidth: '120px'
  };

  const navButtonStyle: React.CSSProperties = {
    padding: '12px 24px',
    borderRadius: '20px',
    backgroundColor: '#fff',
    color: '#666',
    fontSize: '14px',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    transition: 'background-color 200ms ease, transform 150ms ease, border-color 200ms ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const ingredientsPreviewStyle: React.CSSProperties = {
    marginTop: '48px',
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    width: '100%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  };

  const ingredientsTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '16px'
  };

  const ingredientsListStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  };

  const ingredientTagStyle: React.CSSProperties = {
    padding: '6px 12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    fontSize: '13px',
    color: '#666'
  };

  const completedStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '48px'
  };

  const completedIconStyle: React.CSSProperties = {
    fontSize: '80px',
    marginBottom: '24px'
  };

  const completedTitleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '12px'
  };

  const completedTextStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#666',
    marginBottom: '32px'
  };

  const isCompleted = currentStep >= totalSteps;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ←
          </button>
          <div>
            <h1 style={titleStyle}>{recipe.name}</h1>
            <div style={{ fontSize: '13px', color: '#666' }}>
              共 {totalSteps} 步 · 总时长 {recipe.totalTime} 分钟
            </div>
          </div>
        </div>
      </div>

      <div style={progressBarContainerStyle}>
        <div style={progressBarStyle} className={progressBarClass} />
      </div>

      {isCompleted ? (
        <div style={contentStyle}>
          <div style={completedStyle}>
            <div style={completedIconStyle}>🎉</div>
            <h2 style={completedTitleStyle}>恭喜完成！</h2>
            <p style={completedTextStyle}>您已完成 {recipe.name} 的所有烹饪步骤</p>
            <button
              style={primaryButtonStyle}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e64a19';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ff7043';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              返回菜谱
            </button>
          </div>
        </div>
      ) : (
        <div style={contentStyle}>
          <div style={stepIndicatorStyle}>
            步骤 {currentStep + 1} / {totalSteps}
          </div>

          <div style={timerDisplayStyle} className={timerDisplayClass}>
            {formatTime(timeRemaining)}
          </div>

          <div style={stepDescriptionStyle}>
            {currentStepData?.description}
          </div>

          <div style={stepTimeStyle}>
            ⏱️ 预计用时: {currentStepData?.duration} 分钟
          </div>

          <div style={buttonRowStyle}>
            {!isRunning && !isPaused && (
              <button
                style={primaryButtonStyle}
                onClick={handleStart}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e64a19';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff7043';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ▶️ 开始计时
              </button>
            )}

            {isRunning && !isPaused && (
              <button
                style={secondaryButtonStyle}
                onClick={handlePause}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ⏸️ 暂停
              </button>
            )}

            {isPaused && (
              <button
                style={primaryButtonStyle}
                onClick={handleResume}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e64a19';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff7043';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ▶️ 继续
              </button>
            )}

            <button
              style={secondaryButtonStyle}
              onClick={handleReset}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.borderColor = '#ff7043';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              🔄 重置
            </button>
          </div>

          <div style={{ ...buttonRowStyle, marginTop: '24px' }}>
            <button
              style={{
                ...navButtonStyle,
                opacity: currentStep === 0 ? 0.5 : 1,
                pointerEvents: currentStep === 0 ? 'none' : 'auto'
              }}
              onClick={handlePrev}
              disabled={currentStep === 0}
              onMouseEnter={(e) => {
                if (currentStep > 0) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#ff7043';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
              onMouseDown={(e) => {
                if (currentStep > 0) {
                  e.currentTarget.style.transform = 'scale(0.97)';
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ← 上一步
            </button>

            <button
              style={navButtonStyle}
              onClick={handleNext}
              disabled={currentStep >= totalSteps - 1}
              onMouseEnter={(e) => {
                if (currentStep < totalSteps - 1) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#ff7043';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
              onMouseDown={(e) => {
                if (currentStep < totalSteps - 1) {
                  e.currentTarget.style.transform = 'scale(0.97)';
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              下一步 →
            </button>
          </div>

          <div style={ingredientsPreviewStyle}>
            <h3 style={ingredientsTitleStyle}>📋 所需食材</h3>
            <div style={ingredientsListStyle}>
              {recipe.ingredients.map((ing, index) => (
                <span key={index} style={ingredientTagStyle}>
                  {ing.name} {ing.amount}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress-blink {
          0%, 100% { 
            opacity: 1; 
            box-shadow: 0 0 0 rgba(229, 57, 53, 0);
          }
          50% { 
            opacity: 0.7; 
            box-shadow: 0 0 12px rgba(229, 57, 53, 0.6);
          }
        }
        .progress-bar-blink {
          animation: progress-blink 1s ease-in-out infinite;
        }
        @keyframes timer-blink {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.7;
            transform: scale(1.02);
          }
        }
        .timer-display-blink {
          animation: timer-blink 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TimerView;
