import React, { useState, useEffect, useCallback } from 'react';
import { Habit, WeeklyCheckIn } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface HabitModalProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (habitId: string, note: string) => Promise<void>;
  onError?: (message: string) => void;
}

const HabitModal: React.FC<HabitModalProps> = ({ habit, isOpen, onClose, onConfirm, onError }) => {
  const [note, setNote] = useState('');
  const [streak, setStreak] = useState(0);
  const [weeklyCheckins, setWeeklyCheckins] = useState<WeeklyCheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && habit) {
      setNote('');
      setStreak(0);
      setWeeklyCheckins([]);
      fetchHabitStats(habit._id);
    }
  }, [isOpen, habit]);

  const fetchHabitStats = useCallback(async (habitId: string) => {
    setLoading(true);
    try {
      const [statsRes, weeklyRes] = await Promise.all([
        fetch(`/api/habits/${habitId}/stats`),
        fetch(`/api/habits/${habitId}/weekly-checkins`)
      ]);
      
      if (!statsRes.ok) throw new Error('获取统计数据失败');
      if (!weeklyRes.ok) throw new Error('获取周打卡数据失败');
      
      const statsData = await statsRes.json();
      const weeklyData = await weeklyRes.json();
      setStreak(typeof statsData.streak === 'number' ? statsData.streak : 0);
      setWeeklyCheckins(Array.isArray(weeklyData) ? weeklyData : []);
    } catch (error) {
      console.error('Failed to fetch habit stats:', error);
      if (onError) onError('加载数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const handleConfirm = async () => {
    if (!habit || submitting || habit.isCheckedToday) return;
    
    setSubmitting(true);
    try {
      await onConfirm(habit._id, note);
      onClose();
    } catch (error) {
      console.error('Failed to check in:', error);
      if (onError) onError('打卡失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  const getDayLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'EEE', { locale: zhCN });
    } catch {
      return '';
    }
  };

  if (!isOpen || !habit) return null;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal} className="habit-modal-box">
        <h2 style={styles.title}>{habit.name}</h2>
        
        {loading ? (
          <div style={styles.loading}>加载中...</div>
        ) : (
          <>
            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{habit.targetFrequency}</span>
                <span style={styles.statLabel}>每周目标</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{streak}</span>
                <span style={styles.statLabel}>连续天数</span>
              </div>
            </div>

            <div style={styles.weeklySection}>
              <span style={styles.sectionLabel}>本周打卡</span>
              <div style={styles.weeklyDots}>
                {weeklyCheckins.map((day, index) => (
                  <div key={index} style={styles.dayContainer}>
                    <div
                      style={{
                        ...styles.weekDot,
                        backgroundColor: day.checked ? '#28a745' : '#dee2e6',
                      }}
                    />
                    <span style={styles.dayLabel}>{getDayLabel(day.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={styles.inputContainer}>
          <label style={styles.inputLabel}>今日备注（可选）</label>
          <textarea
            style={styles.textarea}
            className="habit-modal-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="记录今天的感受..."
            maxLength={200}
            disabled={submitting}
          />
        </div>

        <div style={styles.buttonRow}>
          <button 
            style={styles.cancelButton} 
            onClick={onClose} 
            disabled={submitting}
            className="habit-modal-btn habit-modal-btn-cancel"
          >
            取消
          </button>
          <button 
            style={{
              ...styles.confirmButton,
              opacity: habit.isCheckedToday || submitting ? 0.6 : 1,
              cursor: habit.isCheckedToday || submitting ? 'not-allowed' : 'pointer',
            }}
            onClick={handleConfirm}
            disabled={habit.isCheckedToday || submitting}
            className="habit-modal-btn habit-modal-btn-confirm"
          >
            {submitting ? '提交中...' : habit.isCheckedToday ? '今日已打卡' : '确认打卡'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MODAL_WIDTH = 320;
const MODAL_RADIUS = 16;
const TEXTAREA_WIDTH = 280;
const TEXTAREA_RADIUS = 8;
const BTN_RADIUS = 8;
const WEEK_DOT_SIZE = 12;

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'modalFadeIn 0.2s ease',
    padding: '20px',
  },
  modal: {
    width: `${MODAL_WIDTH}px`,
    minWidth: `${MODAL_WIDTH}px`,
    maxWidth: `${MODAL_WIDTH}px`,
    backgroundColor: '#ffffff',
    borderRadius: `${MODAL_RADIUS}px`,
    padding: '24px',
    boxSizing: 'border-box',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    animation: 'modalSlideUp 0.3s ease',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#343a40',
    margin: '0 0 20px 0',
    textAlign: 'center',
  },
  loading: {
    textAlign: 'center',
    color: '#6c757d',
    padding: '20px 0',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '24px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#28a745',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px',
  },
  weeklySection: {
    marginBottom: '20px',
  },
  sectionLabel: {
    fontSize: '14px',
    color: '#6c757d',
    display: 'block',
    marginBottom: '12px',
  },
  weeklyDots: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 8px',
  },
  dayContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  weekDot: {
    width: `${WEEK_DOT_SIZE}px`,
    height: `${WEEK_DOT_SIZE}px`,
    borderRadius: '50%',
  },
  dayLabel: {
    fontSize: '11px',
    color: '#6c757d',
  },
  inputContainer: {
    marginBottom: '20px',
  },
  inputLabel: {
    fontSize: '14px',
    color: '#6c757d',
    display: 'block',
    marginBottom: '8px',
  },
  textarea: {
    width: `${TEXTAREA_WIDTH}px`,
    maxWidth: `${TEXTAREA_WIDTH}px`,
    minWidth: `${TEXTAREA_WIDTH}px`,
    minHeight: '80px',
    padding: '12px',
    borderRadius: `${TEXTAREA_RADIUS}px`,
    border: '1px solid #dee2e6',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'border-color 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    borderRadius: `${BTN_RADIUS}px`,
    border: '1px solid #dee2e6',
    backgroundColor: '#ffffff',
    color: '#6c757d',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  confirmButton: {
    flex: 1,
    padding: '12px',
    borderRadius: `${BTN_RADIUS}px`,
    border: 'none',
    backgroundColor: '#28a745',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
};

const STYLE_ID = 'habit-modal-keyframes';
if (!document.getElementById(STYLE_ID)) {
  const styleSheet = document.createElement('style');
  styleSheet.id = STYLE_ID;
  styleSheet.textContent = `
    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .habit-modal-box {
      width: ${MODAL_WIDTH}px !important;
      border-radius: ${MODAL_RADIUS}px !important;
    }
    
    .habit-modal-textarea {
      width: ${TEXTAREA_WIDTH}px !important;
      border-radius: ${TEXTAREA_RADIUS}px !important;
    }

    .habit-modal-textarea:focus {
      border-color: #28a745 !important;
    }
    
    .habit-modal-btn:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    
    .habit-modal-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .habit-modal-btn-cancel:hover:not(:disabled) {
      background-color: #f8f9fa;
    }

    .habit-modal-btn-confirm:hover:not(:disabled) {
      background-color: #218838;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default HabitModal;
