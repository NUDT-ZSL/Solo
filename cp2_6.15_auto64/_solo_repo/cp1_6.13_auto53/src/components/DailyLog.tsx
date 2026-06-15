import React, { useState, useEffect, useRef } from 'react';
import { Plus, Camera, Star, Clock } from 'lucide-react';
import type { DailyLogEntry } from '../types';
import { logApi } from '../utils/api';

interface DailyLogProps {
  bookingId: string;
}

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    feeding: 'var(--color-feeding)',
    walking: 'var(--color-walking)',
    bathing: 'var(--color-bathing)',
    medication: 'var(--color-medication)',
  };
  return colors[type] || 'var(--color-gray-400)';
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    feeding: '喂食',
    walking: '遛狗',
    bathing: '洗澡',
    medication: '吃药',
  };
  return labels[type] || type;
};

const getTypeEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    feeding: '🍽️',
    walking: '🐕',
    bathing: '🛁',
    medication: '💊',
  };
  return emojis[type] || '📝';
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DailyLog: React.FC<DailyLogProps> = ({ bookingId }) => {
  const [logs, setLogs] = useState<DailyLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLog, setNewLog] = useState({
    type: 'feeding' as 'feeding' | 'walking' | 'bathing' | 'medication',
    notes: '',
    rating: 5,
    photoUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLogs();
  }, [bookingId]);

  const loadLogs = async () => {
    try {
      const data = await logApi.getByBooking(bookingId);
      setLogs(data);
    } catch (err) {
      console.error('加载日志失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.notes.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await logApi.create({
        bookingId,
        type: newLog.type,
        notes: newLog.notes,
        rating: newLog.rating,
        photoUrl: newLog.photoUrl || undefined,
      });
      setLogs(prev => [created, ...prev]);
      setNewLog({ type: 'feeding', notes: '', rating: 5, photoUrl: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error('创建日志失败:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewLog(prev => ({ ...prev, photoUrl: file.name }));
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ margin: 0 }}>每日看护日志</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={18} />
          记录日志
        </button>
      </div>

      {showAddForm && (
        <div
          className="card fade-in"
          style={{
            padding: '24px',
            marginBottom: '24px',
            borderRadius: '12px',
          }}
        >
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>添加看护记录</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                活动类型
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['feeding', 'walking', 'bathing', 'medication'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewLog(prev => ({ ...prev, type }))}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: `2px solid ${newLog.type === type ? getTypeColor(type) : 'var(--color-border)'}`,
                      background: newLog.type === type ? getTypeColor(type) : 'white',
                      color: newLog.type === type ? 'white' : 'var(--color-text)',
                      fontWeight: newLog.type === type ? '500' : '400',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {getTypeEmoji(type)} {getTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                备注
              </label>
              <textarea
                value={newLog.notes}
                onChange={e => setNewLog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="请输入看护情况描述..."
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                评分
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewLog(prev => ({ ...prev, rating: star }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Star
                      size={24}
                      fill={star <= newLog.rating ? '#fbbf24' : 'none'}
                      color={star <= newLog.rating ? '#fbbf24' : 'var(--color-gray-300)'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                照片
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div
                onClick={handlePhotoClick}
                style={{
                  border: '2px dashed var(--color-gray-300)',
                  borderRadius: '8px',
                  padding: '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: newLog.photoUrl ? 'var(--color-bg-alt)' : 'white',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-gray-300)';
                }}
              >
                {newLog.photoUrl ? (
                  <div>
                    <Camera size={32} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
                    <div style={{ color: 'var(--color-text)' }}>{newLog.photoUrl}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
                      点击更换照片
                    </div>
                  </div>
                ) : (
                  <div>
                    <Camera size={32} style={{ color: 'var(--color-gray-400)', marginBottom: '8px' }} />
                    <div style={{ color: 'var(--color-text-light)' }}>点击上传照片</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !newLog.notes.trim()}
              >
                {isSubmitting ? '保存中...' : '保存记录'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: '120px',
                borderRadius: '12px',
              }}
            />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--color-text-light)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
          <p>暂无看护记录</p>
          <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>点击"记录日志"添加第一条记录</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {logs.map((log, index) => (
            <div
              key={log.id}
              className="card fade-in"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                animationDelay: `${index * 0.05}s`,
              }}
            >
              <div
                style={{
                  width: '6px',
                  background: getTypeColor(log.type),
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, padding: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '999px',
                      background: `${getTypeColor(log.type)}15`,
                      color: getTypeColor(log.type),
                      fontSize: '0.85rem',
                      fontWeight: '500',
                    }}
                  >
                    {getTypeEmoji(log.type)} {getTypeLabel(log.type)}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.85rem',
                      color: 'var(--color-text-light)',
                    }}
                  >
                    <Clock size={14} />
                    {formatTime(log.timestamp)}
                  </span>
                  {log.rating && (
                    <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < log.rating! ? '#fbbf24' : 'none'}
                          color={i < log.rating! ? '#fbbf24' : 'var(--color-gray-300)'}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <p
                  style={{
                    margin: 0,
                    lineHeight: '1.6',
                    color: 'var(--color-text)',
                  }}
                >
                  {log.notes}
                </p>

                {log.photoUrl && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'var(--color-bg-alt)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Camera size={18} style={{ color: 'var(--color-text-light)' }} />
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                      {log.photoUrl}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DailyLog;
