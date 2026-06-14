import { useState } from 'react';
import { Check } from 'lucide-react';
import type { VoicePart } from '@/types';
import { getDifficultyLabel, getDifficultyColor } from '@/utils/dataGenerator';
import './ScoreTable.css';

interface ScoreTableProps {
  voiceParts: VoicePart[];
  pieceId: string;
  onUpdateProgress: (voicePartId: string, increment: number) => void;
  onUpdateTarget: (voicePartId: string, targetRange: string) => void;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function getProgressGradient(progress: number): string {
  if (progress <= 30) {
    const factor = progress / 30;
    const color = interpolateColor('#ef4444', '#eab308', factor);
    return `linear-gradient(90deg, #ef4444, ${color})`;
  } else if (progress <= 70) {
    const factor = (progress - 30) / 40;
    const color = interpolateColor('#eab308', '#22c55e', factor);
    return `linear-gradient(90deg, #eab308, ${color})`;
  } else {
    const factor = (progress - 70) / 30;
    const color = interpolateColor('#22c55e', '#16a34a', factor);
    return `linear-gradient(90deg, #22c55e, ${color})`;
  }
}

function getProgressTextColor(progress: number): string {
  if (progress >= 70) return '#22c55e';
  if (progress >= 30) return '#eab308';
  return '#ef4444';
}

export default function ScoreTable({
  voiceParts,
  onUpdateProgress,
  onUpdateTarget,
}: ScoreTableProps) {
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState('');

  const handleMarkComplete = (voicePartId: string) => {
    onUpdateProgress(voicePartId, 10);
  };

  const handleTargetClick = (part: VoicePart) => {
    setEditingTarget(part.id);
    setTargetValue(part.targetRange);
  };

  const handleTargetBlur = (voicePartId: string) => {
    if (targetValue.trim()) {
      onUpdateTarget(voicePartId, targetValue.trim());
    }
    setEditingTarget(null);
  };

  const handleTargetKeyDown = (e: React.KeyboardEvent, voicePartId: string) => {
    if (e.key === 'Enter') {
      handleTargetBlur(voicePartId);
    }
  };

  return (
    <div className="score-table-container">
      <table className="score-table">
        <thead>
          <tr>
            <th>声部</th>
            <th>难度</th>
            <th>练习目标</th>
            <th>完成进度</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {voiceParts.map((part) => (
            <tr key={part.id} className="score-table-row">
              <td>
                <div className="voice-part-cell">
                  <div
                    className="voice-part-color"
                    style={{ backgroundColor: part.color }}
                  />
                  <span className="voice-part-name">{part.name}</span>
                </div>
              </td>
              <td>
                <span
                  className="difficulty-badge"
                  style={{ backgroundColor: getDifficultyColor(part.difficulty) }}
                >
                  {getDifficultyLabel(part.difficulty)}
                </span>
              </td>
              <td>
                {editingTarget === part.id ? (
                  <input
                    type="text"
                    className="target-input"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    onBlur={() => handleTargetBlur(part.id)}
                    onKeyDown={(e) => handleTargetKeyDown(e, part.id)}
                    autoFocus
                  />
                ) : (
                  <span className="target-text" onClick={() => handleTargetClick(part)}>
                    {part.targetRange}
                  </span>
                )}
              </td>
              <td>
                <div className="progress-cell">
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${part.progress}%`,
                        background: getProgressGradient(part.progress),
                      }}
                    />
                  </div>
                  <span
                    className="progress-text"
                    style={{ color: getProgressTextColor(part.progress) }}
                  >
                    {part.progress}%
                  </span>
                </div>
              </td>
              <td>
                <button
                  className="btn btn-success mark-complete-btn"
                  onClick={() => handleMarkComplete(part.id)}
                  disabled={part.progress >= 100}
                >
                  <Check size={16} />
                  <span>标记已完成</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
