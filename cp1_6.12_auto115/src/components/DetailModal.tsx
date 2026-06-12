import React, { useMemo } from 'react';
import type { StudentData } from '../types';

interface DetailModalProps {
  student: StudentData | null;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = React.memo(({ student, onClose }) => {
  if (!student) return null;

  const maxTime = useMemo(() => {
    if (student.perQuestionTimes.length === 0) return 1;
    return Math.max(...student.perQuestionTimes.map(q => q.timeSpent));
  }, [student.perQuestionTimes]);

  const avgTime = useMemo(() => {
    if (student.perQuestionTimes.length === 0) return 0;
    return student.perQuestionTimes.reduce((s, q) => s + q.timeSpent, 0) / student.perQuestionTimes.length;
  }, [student.perQuestionTimes]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px',
          minWidth: '420px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: '#1E1E2E',
            }}>
              {student.name}
            </h2>
            <p style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: '#666',
            }}>
              第 {student.currentQuestion}/{student.totalQuestions} 题 · 正确率 {student.accuracy}%
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: '#999',
              padding: '4px 8px',
              borderRadius: '8px',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '16px',
          fontSize: '12px',
          color: '#666',
        }}>
          <span>平均耗时: <strong style={{ color: '#1E1E2E' }}>{avgTime.toFixed(1)}s</strong></span>
          <span>
            状态:
            <strong style={{
              color: student.status === 'normal' ? '#27AE60' : student.status === 'stuck' ? '#F39C12' : '#E74C3C',
            }}>
              {student.status === 'normal' ? ' 正常' : student.status === 'stuck' ? ' 卡住' : ' 超时'}
            </strong>
          </span>
        </div>

        <div style={{
          borderTop: '1px solid #eee',
          paddingTop: '16px',
        }}>
          <h3 style={{
            margin: '0 0 12px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#1E1E2E',
          }}>
            答题时间线
          </h3>

          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '3px',
            height: '160px',
            padding: '0 4px',
            overflowX: 'auto',
          }}>
            {student.perQuestionTimes.map((q, idx) => {
              const heightPercent = (q.timeSpent / maxTime) * 100;
              const isStuckBar = q.timeSpent > avgTime * 2;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    fontSize: '8px',
                    color: '#999',
                    lineHeight: 1,
                  }}>
                    {q.timeSpent.toFixed(0)}
                  </span>
                  <div
                    style={{
                      width: '10px',
                      height: `${Math.max(heightPercent, 4)}px`,
                      background: isStuckBar
                        ? (q.correct ? '#F39C12' : '#E74C3C')
                        : (q.correct ? '#27AE60' : '#E74C3C'),
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s ease',
                      position: 'relative',
                    }}
                  />
                  <span style={{
                    fontSize: '7px',
                    color: '#999',
                    width: '10px',
                    textAlign: 'center',
                  }}>
                    {q.questionIndex}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '12px',
            fontSize: '11px',
            color: '#666',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#27AE60', display: 'inline-block' }} />
              正确
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#E74C3C', display: 'inline-block' }} />
              错误
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#F39C12', display: 'inline-block' }} />
              耗时过长
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
DetailModal.displayName = 'DetailModal';

export default DetailModal;
