import React, { useState } from 'react';
import type { ComponentType, SurveyComponent } from '../types';

interface ComponentRendererProps {
  component: SurveyComponent;
  mode: 'editor' | 'preview';
  answer?: string | string[] | number;
  onAnswerChange?: (value: string | string[] | number) => void;
  onLabelReady?: (ready: boolean) => void;
  showLabelDelay?: boolean;
}

const defaultLabels: Record<ComponentType, string> = {
  radio: '请选择一个选项',
  checkbox: '请选择多个选项',
  rating: '请您为我们的服务打分',
  text: '请输入您的意见',
  select: '请从下拉列表中选择'
};

const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  component,
  mode,
  answer,
  onAnswerChange,
  showLabelDelay = false
}) => {
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [labelVisible, setLabelVisible] = useState(!showLabelDelay);

  React.useEffect(() => {
    if (showLabelDelay) {
      const timer = setTimeout(() => {
        setLabelVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showLabelDelay]);

  const playClickSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
    }
  };

  const renderRating = () => {
    const rating = (answer as number) || 0;
    const displayRating = mode === 'preview' && hoverRating > 0 ? hoverRating : rating;

    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${displayRating >= star ? (mode === 'preview' && hoverRating > 0 ? 'hovered' : 'filled') : ''}`}
            onMouseEnter={() => mode === 'preview' && setHoverRating(star)}
            onMouseLeave={() => mode === 'preview' && setHoverRating(0)}
            onClick={() => {
              if (mode === 'preview') {
                playClickSound();
                onAnswerChange?.(star);
              }
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const renderRadio = () => {
    const selected = (answer as string) || '';
    const options = component.options || ['选项A', '选项B', '选项C'];

    return (
      <div>
        {options.map((option, index) => (
          <div
            key={index}
            className={`radio-option ${selected === option ? 'selected' : ''}`}
            onClick={() => mode === 'preview' && onAnswerChange?.(option)}
          >
            <div className="radio-dot">
              <div className="radio-dot-inner" />
            </div>
            <span className="option-text">{option}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderCheckbox = () => {
    const selected = (answer as string[]) || [];
    const options = component.options || ['选项A', '选项B', '选项C'];

    const toggleOption = (option: string) => {
      if (mode !== 'preview') return;
      const current = [...selected];
      const index = current.indexOf(option);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(option);
      }
      onAnswerChange?.(current);
    };

    return (
      <div>
        {options.map((option, index) => (
          <div
            key={index}
            className={`checkbox-option ${selected.includes(option) ? 'selected' : ''}`}
            onClick={() => toggleOption(option)}
          >
            <div className="checkbox-box">
              {selected.includes(option) && '✓'}
            </div>
            <span className="option-text">{option}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderText = () => {
    const value = (answer as string) || '';

    return (
      <input
        type="text"
        className="text-input"
        placeholder="请输入..."
        value={value}
        readOnly={mode === 'editor'}
        onChange={(e) => mode === 'preview' && onAnswerChange?.(e.target.value)}
      />
    );
  };

  const renderSelect = () => {
    const value = (answer as string) || '';
    const options = component.options || ['选项一', '选项二', '选项三', '选项四'];

    return (
      <select
        className="select-input"
        value={value}
        disabled={mode === 'editor'}
        onChange={(e) => mode === 'preview' && onAnswerChange?.(e.target.value)}
      >
        <option value="">请选择</option>
        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  };

  const label = component.label || defaultLabels[component.type];

  return (
    <div>
      <div className={`component-label ${labelVisible ? 'fade-in' : ''}`} style={{ opacity: labelVisible ? 1 : 0 }}>
        {label}
      </div>
      {component.type === 'radio' && renderRadio()}
      {component.type === 'checkbox' && renderCheckbox()}
      {component.type === 'rating' && renderRating()}
      {component.type === 'text' && renderText()}
      {component.type === 'select' && renderSelect()}
    </div>
  );
};

export default ComponentRenderer;
