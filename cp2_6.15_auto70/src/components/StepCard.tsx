import React, { useState, useEffect, useRef } from 'react';
import { useTimer } from '../composables/useTimer';
import type { RecipeStep, Ingredient } from '../types/recipe';
import './StepCard.css';

interface StepCardProps {
  step: RecipeStep;
  stepIndex: number;
  servings: number;
  baseServings: number;
  isFirst?: boolean;
  isLast?: boolean;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  stepIndex,
  servings,
  baseServings,
  isFirst = false,
  isLast = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [shouldFlash, setShouldFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const ratio = servings / baseServings;

  const handleComplete = () => {
    setShouldFlash(true);
    setTimeout(() => setShouldFlash(false), 1000);
  };

  const { remainingTime, status, progress, duration, start, pause, reset, setDuration, formatTime } = useTimer({
    initialDuration: step.duration,
    onComplete: handleComplete,
  });

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTimeClick = () => {
    if (status !== 'running') {
      setEditValue(String(Math.ceil(duration / 60)));
      setIsEditing(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    const minutes = parseInt(editValue, 10);
    if (!isNaN(minutes) && minutes > 0) {
      setDuration(minutes * 60);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return '进行中';
      case 'paused':
        return '已暂停';
      case 'finished':
        return '已完成';
      default:
        return '待开始';
    }
  };

  const getAdjustedAmount = (amount: number): string => {
    const adjusted = amount * ratio;
    if (Number.isInteger(adjusted)) {
      return String(adjusted);
    }
    return adjusted.toFixed(1);
  };

  const circumference = 2 * Math.PI * 22;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="step-card-wrapper">
      {!isFirst && <div className="step-card__connector" />}

      <div
        ref={cardRef}
        className={`step-card ${shouldFlash ? 'flash-animation' : ''} ${status === 'finished' ? 'step-card--finished' : ''}`}
        style={{ animationDelay: `${stepIndex * 0.1}s` }}
      >
        <div className="step-card__left">
          <div className="step-card__progress-ring">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle
                className="step-card__ring-bg"
                cx="26"
                cy="26"
                r="22"
                fill="none"
                strokeWidth="3"
              />
              <circle
                className="step-card__ring-progress"
                cx="26"
                cy="26"
                r="22"
                fill="none"
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                }}
              />
            </svg>
            <div className="step-card__step-number">{step.stepOrder}</div>
          </div>
        </div>

        <div className="step-card__content">
          <div className="step-card__header">
            <h3 className="step-card__title">{step.title}</h3>
            <div className="step-card__status" data-status={status}>
              {getStatusText()}
            </div>
          </div>

          <p className="step-card__description">{step.description}</p>

          {step.ingredients.length > 0 && (
            <div className="step-card__ingredients">
              <span className="step-card__ingredients-label">食材：</span>
              {step.ingredients.map((ing: Ingredient, idx: number) => (
                <span
                  key={ing.id}
                  className={`step-card__ingredient ${ing.replaced ? 'step-card__ingredient--replaced' : ''}`}
                >
                  <span className="step-card__ingredient-amount">
                    {getAdjustedAmount(ing.amount)}
                  </span>
                  <span className="step-card__ingredient-unit">{ing.unit}</span>
                  <span className="step-card__ingredient-name">
                    {ing.name}
                    {ing.replaced && ing.originalName && (
                      <span className="step-card__ingredient-original"> (原: {ing.originalName})</span>
                    )}
                  </span>
                  {idx < step.ingredients.length - 1 && <span className="step-card__ingredient-sep">、</span>}
                </span>
              ))}
            </div>
          )}

          <div className="step-card__timer">
            <div className="step-card__timer-display">
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="number"
                  value={editValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                  className="step-card__timer-input"
                  min="1"
                />
              ) : (
                <span className="step-card__timer-time" onClick={handleTimeClick}>
                  ⏱ {formatTime(remainingTime)}
                </span>
              )}
              <span className="step-card__timer-hint">
                {status !== 'running' ? '点击时间可编辑(分钟)' : ''}
              </span>
            </div>

            <div className="step-card__timer-controls">
              {status === 'idle' || status === 'finished' ? (
                <button className="step-card__btn step-card__btn--start" onClick={start}>
                  ▶ 开始
                </button>
              ) : status === 'running' ? (
                <button className="step-card__btn step-card__btn--pause" onClick={pause}>
                  ⏸ 暂停
                </button>
              ) : (
                <button className="step-card__btn step-card__btn--start" onClick={start}>
                  ▶ 继续
                </button>
              )}
              <button className="step-card__btn step-card__btn--reset" onClick={() => reset()} disabled={status === 'idle'}>
                ↺ 重置
              </button>
            </div>
          </div>
        </div>
      </div>

      {!isLast && <div className="step-card__connector step-card__connector--bottom" />}
    </div>
  );
};
