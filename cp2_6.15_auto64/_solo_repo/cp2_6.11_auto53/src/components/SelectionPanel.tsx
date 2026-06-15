import React, { useRef } from 'react';
import type { ProgrammingLanguage, AlgorithmType } from '../types';
import { useRaceStore } from '../store/useRaceStore';
import { LANGUAGE_COLORS, ALGORITHM_LABELS } from '../types';

const ALL_LANGUAGES: ProgrammingLanguage[] = ['JavaScript', 'Python', 'C++', 'Go'];
const ALL_ALGORITHMS: AlgorithmType[] = ['bubbleSort', 'binarySearch', 'fibonacciRecursive'];

interface SelectionPanelProps {
  onStartRace: () => void;
}

function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple');

  const existing = button.getElementsByClassName('ripple')[0];
  if (existing) existing.remove();

  button.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

const SelectionPanel: React.FC<SelectionPanelProps> = ({ onStartRace }) => {
  const {
    selectedLanguages,
    selectedAlgorithm,
    toggleLanguage,
    setSelectedAlgorithm,
    isRacing
  } = useRaceStore();

  const canStart = selectedLanguages.length >= 2 && selectedAlgorithm !== null && !isRacing;
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleStart = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    if (canStart) onStartRace();
  };

  return (
    <div className="selection-panel">
      <div className="panel-title">⚡ 算 法 赛 跑</div>

      <div className="panel-group">
        <span className="panel-label">编程语言</span>
        <div className="select-wrapper">
          <select
            ref={selectRef}
            className="multi-select"
            value=""
            disabled={isRacing}
            onChange={(e) => {
              const val = e.target.value as ProgrammingLanguage;
              if (val) toggleLanguage(val);
              if (selectRef.current) selectRef.current.selectedIndex = 0;
            }}
          >
            <option value="">选择 2-4 种语言...</option>
            {ALL_LANGUAGES.map((lang) => (
              <option key={lang} value={lang} disabled={selectedLanguages.includes(lang)}>
                {lang} {selectedLanguages.includes(lang) ? '✓' : ''}
              </option>
            ))}
          </select>
          <div className="selected-tags">
            {selectedLanguages.map((lang) => (
              <span
                key={lang}
                className="tag-item"
                style={{ borderColor: LANGUAGE_COLORS[lang], color: LANGUAGE_COLORS[lang] }}
              >
                {lang}
                <span className="tag-close" onClick={() => !isRacing && toggleLanguage(lang)}>
                  ×
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-group">
        <span className="panel-label">算法场景</span>
        <div className="select-wrapper">
          <select
            className="multi-select"
            value={selectedAlgorithm || ''}
            disabled={isRacing}
            onChange={(e) => setSelectedAlgorithm(e.target.value as AlgorithmType)}
          >
            <option value="">选择算法...</option>
            {ALL_ALGORITHMS.map((algo) => (
              <option key={algo} value={algo}>
                {ALGORITHM_LABELS[algo]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        className="btn btn-primary"
        disabled={!canStart}
        onClick={handleStart}
      >
        {isRacing ? '赛 跑 中...' : '开 始 赛 跑'}
      </button>
    </div>
  );
};

export default SelectionPanel;
