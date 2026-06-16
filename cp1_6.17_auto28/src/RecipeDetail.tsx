import React, { useState, useEffect, useRef } from 'react';
import type { Recipe, RecipeStep, StepStatus } from './types';
import { TimerManager, timerManager } from './TimerManager';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  onRateRecipe: (recipeId: string, score: number) => void;
}

const StarIcon: React.FC<{ filled: boolean; hovered: boolean; size?: number }> = ({
  filled,
  hovered,
  size = 24,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled || hovered ? '#FFD54F' : '#BDBDBD'}
    style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

interface TimerDisplayProps {
  stepId: string;
  durationSeconds: number;
  onExpire: () => void;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ stepId, durationSeconds, onExpire }) => {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'expired'>('idle');
  const [pulseKey, setPulseKey] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      timerManager.createTimer(
        stepId,
        durationSeconds,
        () => {
          setStatus('expired');
          setRemaining(0);
          onExpire();
        },
        (r) => {
          setRemaining(r);
          setPulseKey((prev) => prev + 1);
        }
      );
      initialized.current = true;
    }

    return () => {
      timerManager.destroyTimer(stepId);
      initialized.current = false;
    };
  }, [stepId, durationSeconds, onExpire]);

  const handleStart = () => {
    timerManager.startTimer(stepId);
    setStatus('running');
  };

  const handlePause = () => {
    timerManager.pauseTimer(stepId);
    setStatus('paused');
  };

  const handleReset = () => {
    timerManager.resetTimer(stepId);
    setRemaining(durationSeconds);
    setStatus('idle');
  };

  const displayTime = TimerManager.formatTime(remaining);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '12px',
        flexWrap: 'wrap',
      }}
    >
      <span
        key={pulseKey}
        className="timer-pulse"
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#424242',
          fontFamily: 'monospace',
          minWidth: '80px',
          display: 'inline-block',
        }}
      >
        {displayTime}
      </span>

      {status !== 'running' ? (
        <button
          onClick={handleStart}
          style={{
            padding: '8px 20px',
            background: '#FF7043',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#D84315';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FF7043';
          }}
        >
          ▶ 开始
        </button>
      ) : (
        <button
          onClick={handlePause}
          style={{
            padding: '8px 20px',
            background: '#FF7043',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s ease, transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#D84315';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FF7043';
          }}
        >
          ⏸ 暂停
        </button>
      )}

      <button
        onClick={handleReset}
        style={{
          padding: '8px 20px',
          background: '#FFFFFF',
          color: '#757575',
          border: '1px solid #E0E0E0',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#F5F5F5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#FFFFFF';
        }}
      >
        ↺ 重置
      </button>
    </div>
  );
};

interface StepCardProps {
  step: RecipeStep;
  index: number;
  status: StepStatus;
  onTimerExpire: () => void;
}

const StepCard: React.FC<StepCardProps> = ({ step, index, status, onTimerExpire }) => {
  const [shouldFlash, setShouldFlash] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const getStepNumberBg = () => {
    switch (status) {
      case 'completed':
        return '#66BB6A';
      case 'in-progress':
        return '#42A5F5';
      default:
        return '#E0E0E0';
    }
  };

  useEffect(() => {
    if (status === 'completed' && !shouldFlash) {
      setShouldFlash(true);
      const timer = setTimeout(() => {
        setShouldFlash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, shouldFlash]);

  return (
    <div
      ref={cardRef}
      className={shouldFlash ? 'flash-animation' : ''}
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(224, 224, 224, 1)',
        border: '2px solid transparent',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: getStepNumberBg(),
            color: status === 'pending' ? '#757575' : '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '16px',
            flexShrink: 0,
            transition: 'background 0.3s ease',
          }}
        >
          {status === 'completed' ? '✓' : index + 1}
        </div>

        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#424242',
              lineHeight: 1.6,
            }}
          >
            {step.description}
          </p>

          <TimerDisplay
            stepId={step.id}
            durationSeconds={step.durationSeconds}
            onExpire={onTimerExpire}
          />
        </div>
      </div>
    </div>
  );
};

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack, onRateRecipe }) => {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [hoveredStar, setHoveredStar] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const getStepStatus = (stepId: string): StepStatus => {
    if (completedSteps.has(stepId)) return 'completed';
    const stepIndex = recipe.steps.findIndex((s) => s.id === stepId);
    const completedArray = Array.from(completedSteps);
    if (completedArray.length > 0) {
      const lastCompletedIndex = Math.max(
        ...completedArray.map((id) => recipe.steps.findIndex((s) => s.id === id))
      );
      if (stepIndex === lastCompletedIndex + 1) return 'in-progress';
    } else if (stepIndex === 0) {
      return 'in-progress';
    }
    return 'pending';
  };

  const handleTimerExpire = (stepId: string) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      newSet.add(stepId);
      return newSet;
    });
  };

  const handleRate = (score: number) => {
    setUserRating(score);
    onRateRecipe(recipe.id, score);
  };

  const progress = (completedSteps.size / recipe.steps.length) * 100;

  return (
    <div
      className="recipe-detail"
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible ? 1 : 0,
        transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
      }}
    >
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: '#5D4037',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '20px',
          padding: '8px 0',
        }}
      >
        ← 返回列表
      </button>

      <div
        className="detail-header"
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1
          style={{
            margin: '0 0 16px 0',
            fontSize: '28px',
            fontWeight: 600,
            color: '#424242',
          }}
        >
          {recipe.name}
        </h1>

        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#757575' }}>制作进度</span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#43A047' }}>
              {completedSteps.size} / {recipe.steps.length} 步骤
            </span>
          </div>
          <div
            style={{
              height: '8px',
              background: '#E0E0E0',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #43A047 0%, #66BB6A 100%)',
                width: `${progress}%`,
                borderRadius: '4px',
                transition: 'width 0.5s ease-out',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '16px',
            fontSize: '14px',
            color: '#757575',
          }}
        >
          <span>⏱ {recipe.totalMinutes}分钟</span>
        </div>
      </div>

      <div
        className="steps-container"
        style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}
      >
        {recipe.steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            status={getStepStatus(step.id)}
            onTimerExpire={() => handleTimerExpire(step.id)}
          />
        ))}
      </div>

      <div
        className="rating-section"
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#424242' }}>
          为这道菜评分
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <div
              key={star}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => handleRate(star)}
            >
              <StarIcon
                filled={star <= userRating}
                hovered={star <= hoveredStar}
                size={32}
              />
            </div>
          ))}
        </div>
        {userRating > 0 && (
          <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: '#66BB6A' }}>
            感谢您的 {userRating} 星评价！
          </p>
        )}
      </div>
    </div>
  );
};
