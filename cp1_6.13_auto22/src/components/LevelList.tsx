import React, { useState, useEffect } from 'react';
import { listLevels, deleteLevel } from '../api';
import type { LevelSummary } from '../types';

interface LevelListProps {
  onLoadLevel: (id: string) => void;
  currentLevelId?: string;
  refreshTrigger?: number;
}

const LevelList: React.FC<LevelListProps> = ({ onLoadLevel, currentLevelId, refreshTrigger }) => {
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLevels();
  }, [refreshTrigger]);

  const fetchLevels = async () => {
    try {
      setLoading(true);
      const data = await listLevels();
      setLevels(data);
    } catch (err) {
      console.error('加载关卡列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个关卡吗？')) {
      try {
        await deleteLevel(id);
        setLevels(levels.filter(l => l._id !== id));
      } catch (err) {
        console.error('删除关卡失败:', err);
        alert('删除失败');
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      style={{
        width: 240,
        background: '#16161a',
        borderRight: '1px solid #2e2e32',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '16px 12px',
          borderBottom: '1px solid #2e2e32',
        }}
      >
        <h3
          style={{
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          已保存关卡
        </h3>
        <p style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          共 {levels.length} 个关卡
        </p>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {loading ? (
          <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: 20 }}>
            加载中...
          </p>
        ) : levels.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: 20 }}>
            暂无保存的关卡
          </p>
        ) : (
          levels.map((level) => (
            <div
              key={level._id}
              onClick={() => onLoadLevel(level._id)}
              style={{
                padding: 12,
                background: currentLevelId === level._id ? '#3b82f6' : '#2a2a2e',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (currentLevelId !== level._id) {
                  e.currentTarget.style.background = '#3a3a3e';
                }
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                if (currentLevelId !== level._id) {
                  e.currentTarget.style.background = '#2a2a2e';
                }
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 160,
                  }}
                  title={level.name}
                >
                  {level.name}
                </span>
                <button
                  onClick={(e) => handleDelete(e, level._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 14,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    padding: 2,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  title="删除"
                >
                  ✕
                </button>
              </div>
              <p
                style={{
                  color: currentLevelId === level._id ? '#bfdbfe' : '#6b7280',
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                {formatDate(level.updatedAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LevelList;
