import React, { useState } from 'react';
import type { LearningPath, LearningStep } from '../types';
import { skillsApi } from '../utils/http';

interface PathPlannerProps {
  onRefresh: () => void;
}

const PathPlanner: React.FC<PathPlannerProps> = ({ onRefresh }) => {
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycleNames, setCycleNames] = useState<string[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCycleNames([]);
    try {
      const result = await skillsApi.getPath();
      setPath(result);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.error) {
        setError(data.error);
        if (data.cycleNames) {
          setCycleNames(data.cycleNames);
        }
      } else {
        setError('生成学习路径失败');
      }
      setPath(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#2c3e50' }}>
        学习路径规划
      </h3>

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: loading ? '#78909c' : '#2c3e50',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 16,
          transition: 'background 0.2s ease',
        }}
      >
        {loading ? '正在生成...' : '🗺️ 生成学习路径'}
      </button>

      {error && (
        <div
          style={{
            background: '#ffebee',
            border: '1px solid #ef9a9a',
            color: '#c62828',
            padding: '10px 14px',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: 4 }}>❌ {error}</div>
          {cycleNames.length > 0 && (
            <div style={{ fontSize: 12, color: '#d32f2f' }}>
              涉及循环的节点：{cycleNames.join(' → ')}
            </div>
          )}
        </div>
      )}

      {path && (
        <div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 16,
              padding: 12,
              background: '#f5f5f5',
              borderRadius: 8,
            }}
          >
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#2c3e50' }}>
                {path.steps.length}
              </div>
              <div style={{ fontSize: 11, color: '#78909c' }}>待学习步骤</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#64b5f6' }}>
                {path.remainingHours}h
              </div>
              <div style={{ fontSize: 11, color: '#78909c' }}>剩余时长</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#81c784' }}>
                {path.totalHours}h
              </div>
              <div style={{ fontSize: 11, color: '#78909c' }}>总时长</div>
            </div>
          </div>

          {path.steps.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 24,
                color: '#81c784',
                fontSize: 14,
                background: '#f1f8e9',
                borderRadius: 8,
              }}
            >
              🎉 所有技能已掌握！
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {path.steps.map((step, idx) => (
                <PathStep key={step.nodeId} step={step} index={idx} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PathStep: React.FC<{ step: LearningStep; index: number }> = ({ step, index }) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '10px 12px',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        borderLeft: '3px solid #64b5f6',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#2c3e50',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13, color: '#2c3e50' }}>
          {step.name}
        </div>
        {step.description && (
          <div style={{ fontSize: 12, color: '#90a4ae', marginTop: 2 }}>
            {step.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {step.estimatedHours > 0 && (
            <span
              style={{
                fontSize: 11,
                background: '#e3f2fd',
                color: '#1565c0',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              ⏱ {step.estimatedHours}h
            </span>
          )}
          {step.prerequisiteNames.length > 0 && (
            <span
              style={{
                fontSize: 11,
                background: '#fce4ec',
                color: '#c62828',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              需要: {step.prerequisiteNames.join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PathPlanner;
