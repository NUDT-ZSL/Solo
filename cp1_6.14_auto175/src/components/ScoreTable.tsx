import { useState } from 'react';
import { Check } from 'lucide-react';
import type { VoicePart } from '@/types';
import { getDifficultyLabel } from '@/utils/dataGenerator';
import './ScoreTable.css';

interface ScoreTableProps {
  voiceParts: VoicePart[];
  pieceId: string;
  onUpdateProgress: (voicePartId: string, increment: number) => void;
  onUpdateTarget: (voicePartId: string, targetRange: string) => void;
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
                    className="voice-part-color" style={{ backgroundColor: part.color }} />
                  <span className="voice-part-name">{part.name}</span>
                </div>
              </td>
              <td>
                <span className={`difficulty-badge ${part.difficulty}`}>
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
                      style={{ width: `${part.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{part.progress}%</span>
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
