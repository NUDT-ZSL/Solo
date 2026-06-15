import { useState, useMemo } from 'react';
import { submitRecord } from '../api';

interface RecordPanelProps {
  exerciseTypes: string[];
  onSubmitted: () => void;
}

function RecordPanel({ exerciseTypes, onSubmitted }: RecordPanelProps) {
  const [exerciseType, setExerciseType] = useState(exerciseTypes[0] || '跑步');
  const [duration, setDuration] = useState<number>(30);
  const [intensity, setIntensity] = useState<number>(5);
  const [avgHeartRate, setAvgHeartRate] = useState<number>(120);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatedCalories = useMemo(() => {
    const multipliers: Record<string, number> = {
      '跑步': 10, '游泳': 8, '力量训练': 7, '瑜伽': 4, '骑行': 7,
      '篮球': 9, '羽毛球': 7, '跳绳': 11, '登山': 8, 'HIIT': 12
    };
    const base = multipliers[exerciseType] || 6;
    return Math.round(base * duration * (0.5 + intensity * 0.05));
  }, [exerciseType, duration, intensity]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      await submitRecord({
        exercise_type: exerciseType,
        duration,
        intensity,
        avg_heart_rate: avgHeartRate,
      });

      setSuccess(true);
      onSubmitted();

      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="record-panel">
      <h2 className="panel-title">📝 添加训练记录</h2>

      <div className="form-group">
        <label className="form-label">运动类型</label>
        <select
          className="form-select"
          value={exerciseType}
          onChange={(e) => setExerciseType(e.target.value)}
        >
          {exerciseTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">运动时长 (分钟)</label>
        <input
          type="number"
          className="form-input"
          min="1"
          max="480"
          value={duration}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 0;
            setDuration(Math.max(1, Math.min(480, val)));
          }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">主观强度 ({intensity}/10)</label>
        <div className="slider-container">
          <input
            type="range"
            className="slider-input"
            min="1"
            max="10"
            step="1"
            value={intensity}
            onChange={(e) => setIntensity(parseInt(e.target.value))}
          />
          <span className="slider-value">{intensity}</span>
        </div>
        <div className="intensity-labels">
          <span>轻松</span>
          <span>中等</span>
          <span>极限</span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">平均心率 (bpm)</label>
        <input
          type="number"
          className="form-input"
          min="40"
          max="220"
          value={avgHeartRate}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 0;
            setAvgHeartRate(Math.max(40, Math.min(220, val)));
          }}
        />
      </div>

      <button
        className="submit-btn"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? '提交中...' : '✓ 提交记录'}
      </button>

      {success && (
        <div className="submit-success">🎉 记录已保存！预计消耗 {estimatedCalories} 千卡</div>
      )}
      {error && (
        <div className="submit-success" style={{ borderColor: '#ff6b6b', color: '#ff6b6b', backgroundColor: 'rgba(255,107,107,0.1)' }}>
          ❌ {error}
        </div>
      )}

      <div className="preview-section">
        <div className="preview-title">📊 本次训练预览</div>
        <div className="mini-stats">
          <div className="mini-stat-item">
            <div className="mini-stat-label">类型</div>
            <div className="mini-stat-value" style={{ fontSize: '14px' }}>{exerciseType}</div>
          </div>
          <div className="mini-stat-item">
            <div className="mini-stat-label">时长</div>
            <div className="mini-stat-value purple">{duration}<span style={{ fontSize: '12px' }}> 分</span></div>
          </div>
          <div className="mini-stat-item">
            <div className="mini-stat-label">心率</div>
            <div className="mini-stat-value red">{avgHeartRate}<span style={{ fontSize: '12px' }}> bpm</span></div>
          </div>
          <div className="mini-stat-item">
            <div className="mini-stat-label">消耗</div>
            <div className="mini-stat-value" style={{ color: '#ffd93d' }}>{estimatedCalories}<span style={{ fontSize: '12px' }}> kcal</span></div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default RecordPanel;
