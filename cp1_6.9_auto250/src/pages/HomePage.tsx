import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { MOOD_COLORS, getMoodColor } from '../colors';
import { createCapsule, getCapsuleStatus, formatCountdown } from '../api';
import type { Capsule, FilterStatus, MoodColorKey, CreateCapsuleDto } from '../types';

const sectionStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '32px 24px 80px',
};

const cardStyle = (gradient: string, isExpired: boolean): React.CSSProperties => ({
  position: 'relative',
  borderRadius: '12px',
  padding: '24px',
  minHeight: '260px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  overflow: 'hidden',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  cursor: 'default',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  background: isExpired
    ? 'linear-gradient(135deg, rgba(120,120,130,0.3) 0%, rgba(80,80,90,0.25) 100%)'
    : `linear-gradient(135deg, ${gradient})`,
  boxShadow: isExpired
    ? '0 2px 16px rgba(0,0,0,0.2)'
    : '0 4px 24px rgba(0,0,0,0.25)',
  opacity: isExpired ? 0.55 : 1,
});

function CapsuleCard({ capsule, onOpen }: { capsule: Capsule; onOpen: (c: Capsule) => void }) {
  const navigate = useNavigate();
  const status = getCapsuleStatus(capsule);
  const mood = getMoodColor(capsule.moodColor);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (status === 'locked') {
      const timer = setInterval(() => forceTick((n) => n + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [status]);

  const countdown = formatCountdown(capsule.unlockDate);

  const handleCardClick = () => {
    if (status === 'expired') {
      alert('这段记忆已经随风而逝...\n胶囊开启超过24小时，内容已消失。');
      return;
    }
    if (status === 'unlocked') {
      onOpen(capsule);
    }
  };

  return (
    <div
      style={cardStyle(mood.gradient, status === 'expired')}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        if (status !== 'locked' || status === 'unlocked') {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = status === 'expired'
            ? '0 8px 32px rgba(0,0,0,0.35)'
            : `0 12px 40px rgba(${mood.rgb}, 0.35)`;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: status === 'expired'
              ? 'rgba(80,80,90,0.5)'
              : 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(4px)',
            letterSpacing: '0.5px',
          }}
        >
          {status === 'locked' && (
            <span>距解锁 {countdown.days}天{String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}</span>
          )}
          {status === 'unlocked' && <span>✨ 已解锁</span>}
          {status === 'expired' && <span>已过期</span>}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.8)',
            padding: '4px 10px',
            borderRadius: '10px',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          {status === 'expired' ? '往日遗珠' : mood.name}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 700,
          marginBottom: '10px',
          color: 'rgba(255,255,255,0.95)',
          textShadow: '0 1px 2px rgba(0,0,0,0.15)',
          lineHeight: 1.4,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {capsule.title}
        </h3>
        {status === 'expired' ? (
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.6)',
            fontStyle: 'italic',
            lineHeight: 1.6,
          }}>
            「这段记忆已经消散在时间长河中...」
          </p>
        ) : status === 'locked' ? (
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.6,
          }}>
            🔒 内容已封存，请静待启封之日
          </p>
        ) : (
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.6,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}>
            {capsule.content}
          </p>
        )}
      </div>

      <div style={{ marginTop: '16px' }}>
        {status === 'unlocked' && (
          <button
            className="pulse-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(capsule);
            }}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.95)',
              color: '#1a1a2e',
              letterSpacing: '2px',
              transition: 'all 0.2s ease',
            }}
          >
            ✨ 点击开启
          </button>
        )}
        {status === 'locked' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)',
          }}>
            <span>解锁日期：{new Date(capsule.unlockDate).toLocaleDateString('zh-CN')}</span>
            <span>📅</span>
          </div>
        )}
        {status === 'expired' && (
          <div style={{
            textAlign: 'center',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
            padding: '8px 0',
          }}>
            💫 已归于时光深处
          </div>
        )}
      </div>
    </div>
  );
}

function CreateForm() {
  const { addCapsule } = useAppContext();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [moodColor, setMoodColor] = useState<MoodColorKey>('duskOrange');
  const [unlockDate, setUnlockDate] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setUnlockDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 365);
    return d.toISOString().split('T')[0];
  }, []);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors: string[] = [];
    if (!title.trim() || title.length > 50) validationErrors.push('标题不能为空且最多50字');
    if (!content.trim() || content.length > 500) validationErrors.push('内容不能为空且最多500字');
    if (imageUrl.trim()) {
      try {
        new URL(imageUrl.trim());
      } catch {
        validationErrors.push('图片URL格式不正确');
      }
    }
    if (!unlockDate) validationErrors.push('请选择解锁日期');

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const dto: CreateCapsuleDto = {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
        moodColor,
        unlockDate: new Date(unlockDate + 'T00:00:00').toISOString(),
      };
      const created = await createCapsule(dto);
      addCapsule(created);
      setTitle('');
      setContent('');
      setImageUrl('');
      setMoodColor('duskOrange');
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors(['创建胶囊失败，请重试']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#f0f0f5',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  };

  const formCardStyle: React.CSSProperties = {
    borderRadius: '16px',
    padding: '28px',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  };

  return (
    <form style={formCardStyle} onSubmit={handleSubmit}>
      <h2 style={{
        fontSize: '22px',
        fontWeight: 700,
        marginBottom: '20px',
        color: '#fff',
      }}>
        ✍️ 封存一段记忆
      </h2>

      {errors.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(217,83,79,0.15)',
          marginBottom: '16px',
          color: '#F2BCCC',
          fontSize: '13px',
        }}>
          {errors.map((err, i) => <div key={i}>• {err}</div>)}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          标题 <span style={{ color: 'rgba(255,255,255,0.4)' }}>({title.length}/50)</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 50))}
          placeholder="给这段记忆起个名字..."
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          内容 <span style={{ color: 'rgba(255,255,255,0.4)' }}>({content.length}/500)</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          placeholder="写下你想留给未来的文字..."
          style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          图片URL <span style={{ color: 'rgba(255,255,255,0.4)' }}>(可选)</span>
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          心情颜色
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '10px',
        }}>
          {MOOD_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              title={c.name}
              onClick={() => setMoodColor(c.key)}
              style={{
                height: '36px',
                borderRadius: '10px',
                border: moodColor === c.key ? '2px solid #fff' : '2px solid transparent',
                background: c.gradient,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: moodColor === c.key ? 'scale(1.1)' : 'scale(1)',
                boxShadow: moodColor === c.key ? `0 0 0 3px rgba(${c.rgb},0.3)` : 'none',
              }}
            />
          ))}
        </div>
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
        }}>
          已选：{getMoodColor(moodColor).name}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          解锁日期 <span style={{ color: 'rgba(255,255,255,0.4)' }}>(1-365天后)</span>
        </label>
        <input
          type="date"
          value={unlockDate}
          onChange={(e) => setUnlockDate(e.target.value)}
          min={minDate}
          max={maxDate}
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '20px',
          border: 'none',
          background: getMoodColor(moodColor).gradient,
          color: '#fff',
          fontSize: '15px',
          fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
          letterSpacing: '3px',
          transition: 'all 0.2s ease',
          boxShadow: `0 4px 16px rgba(${getMoodColor(moodColor).rgb}, 0.35)`,
        }}
      >
        {submitting ? '封存中...' : '⏳ 封存胶囊'}
      </button>
    </form>
  );
}

export default function HomePage() {
  const { state, openCapsuleById, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [showColorFilter, setShowColorFilter] = useState(false);

  const handleOpen = useCallback(async (capsule: Capsule) => {
    const status = getCapsuleStatus(capsule);
    if (status !== 'unlocked') return;
    const updated = await openCapsuleById(capsule.id);
    if (updated) {
      navigate(`/capsule/${capsule.id}`);
    }
  }, [navigate, openCapsuleById]);

  const classified = useMemo(() => {
    const normal: Capsule[] = [];
    const expired: Capsule[] = [];
    for (const c of state.capsules) {
      if (getCapsuleStatus(c) === 'expired') {
        expired.push(c);
      } else {
        normal.push(c);
      }
    }
    return { normal, expired };
  }, [state.capsules]);

  const filteredNormal = useMemo(() => {
    let list = classified.normal;
    if (state.filterStatus !== 'all') {
      list = list.filter((c) => getCapsuleStatus(c) === state.filterStatus);
    }
    if (state.filterColor) {
      list = list.filter((c) => c.moodColor === state.filterColor);
    }
    return list;
  }, [classified.normal, state.filterStatus, state.filterColor]);

  const statusButtons: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'locked', label: '未解锁' },
    { key: 'unlocked', label: '已解锁' },
  ];

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  };

  return (
    <section style={sectionStyle}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 400px) 1fr',
        gap: '32px',
        marginBottom: '48px',
        '@media (max-width: 900px)': {
          gridTemplateColumns: '1fr',
        },
      } as React.CSSProperties}>
        <CreateForm />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            borderRadius: '16px',
            padding: '20px',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
                marginRight: '8px',
              }}>📊 状态筛选：</span>
              {statusButtons.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => dispatch({ type: 'SET_FILTER_STATUS', payload: btn.key })}
                  style={{
                    padding: '6px 18px',
                    borderRadius: '20px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: state.filterStatus === btn.key
                      ? 'linear-gradient(135deg, #9B72CF, #FF8C42)'
                      : 'rgba(255,255,255,0.08)',
                    color: state.filterStatus === btn.key ? '#fff' : 'rgba(255,255,255,0.75)',
                    boxShadow: state.filterStatus === btn.key
                      ? '0 4px 12px rgba(155,114,207,0.35)'
                      : 'none',
                  }}
                >
                  {btn.label}
                </button>
              ))}

              <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <button
                  onClick={() => setShowColorFilter((v) => !v)}
                  style={{
                    padding: '6px 18px',
                    borderRadius: '20px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: state.filterColor
                      ? getMoodColor(state.filterColor).gradient
                      : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    transition: 'all 0.2s ease',
                  }}
                >
                  🎨 心情色 {state.filterColor && `: ${getMoodColor(state.filterColor).name}`}
                  <span style={{ marginLeft: '6px', display: 'inline-block', transform: showColorFilter ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    ▾
                  </span>
                </button>
                {showColorFilter && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'rgba(26,26,46,0.95)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                      zIndex: 100,
                      animation: 'slideDownExpand 0.2s ease-out forwards',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      minWidth: '260px',
                    }}
                  >
                    <button
                      onClick={() => { dispatch({ type: 'SET_FILTER_COLOR', payload: null }); setShowColorFilter(false); }}
                      style={{
                        gridColumn: '1 / -1',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: state.filterColor === null ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.85)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginBottom: '4px',
                      }}
                    >
                      不筛选颜色（显示全部）
                    </button>
                    {MOOD_COLORS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => { dispatch({ type: 'SET_FILTER_COLOR', payload: c.key }); setShowColorFilter(false); }}
                        title={c.name}
                        style={{
                          padding: '10px 4px',
                          borderRadius: '10px',
                          border: state.filterColor === c.key ? '2px solid #fff' : '2px solid transparent',
                          background: c.gradient,
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 600,
                          transition: 'all 0.15s',
                          textAlign: 'center',
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            paddingLeft: '4px',
          }}>
            共 <b style={{ color: 'rgba(255,255,255,0.85)' }}>{filteredNormal.length}</b> 个胶囊
            {classified.expired.length > 0 && <>，另有 <b style={{ color: 'rgba(255,255,255,0.6)' }}>{classified.expired.length}</b> 段记忆已归于时光深处</>}
          </div>
        </div>
      </div>

      {filteredNormal.length > 0 ? (
        <div style={gridStyle} className="fade-in">
          {filteredNormal.map((c) => (
            <CapsuleCard key={c.id} capsule={c} onOpen={handleOpen} />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '80px 20px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '15px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          border: '1px dashed rgba(255,255,255,0.08)',
        }}>
          🌠 {state.filterStatus === 'locked' ? '还没有待解锁的胶囊' : state.filterStatus === 'unlocked' ? '暂无已解锁的胶囊' : state.filterColor ? `暂无「${getMoodColor(state.filterColor).name}」心情的胶囊` : '时光胶囊静静地等待你的第一封信...'}
        </div>
      )}

      {classified.expired.length > 0 && (
        <div style={{ marginTop: '64px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <div style={{
              width: '2px',
              height: '20px',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.4))',
              borderRadius: '1px',
            }} />
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '1px',
            }}>
              🌌 往日遗珠
            </h3>
            <span style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.35)',
              fontWeight: 300,
            }}>
              （开启已超过24小时，内容已消散）
            </span>
          </div>
          <div style={gridStyle} className="fade-in">
            {classified.expired.map((c) => (
              <CapsuleCard key={c.id} capsule={c} onOpen={handleOpen} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
