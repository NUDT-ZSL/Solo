import React, { useState, useEffect, useCallback } from 'react';
import MoodLedger from './components/MoodLedger';
import AddEntryForm from './components/AddEntryForm';
import { Entry, EmotionType, EMOTION_CONFIG } from './types';

const App: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [formExpanded, setFormExpanded] = useState(false);
  const [filterEmotion, setFilterEmotion] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/entries');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 10000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  const handleAddEntry = async (text: string, amount: number, emotion: EmotionType) => {
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, amount, emotion }),
      });
      if (res.ok) {
        await fetchEntries();
        if (isMobile) setFormExpanded(false);
      }
    } catch (err) {
      console.error('Failed to create entry:', err);
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return iso;
    }
  };

  const filteredAndSortedEntries = [...entries]
    .filter((e) => filterEmotion === 'all' || e.emotion === filterEmotion)
    .sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? tb - ta : ta - tb;
    });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 100,
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            padding: '8px 14px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '13px',
          }}
        >
          📊 共 {entries.length} 条记录
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="管理后台"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease-in-out',
            transform: sidebarOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.2)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          ⚙️
        </button>
      </div>

      {!isMobile ? (
        <div
          style={{
            width: '340px',
            flexShrink: 0,
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '20px',
            overflowY: 'auto',
          }}
        >
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #FFD700 0%, #F97316 50%, #8B5CF6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '6px',
              }}
            >
              奇想账本
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.6 }}>
              用故事与情感<br />记录每一笔开销
            </p>
          </div>
          <AddEntryForm onSubmit={handleAddEntry} />
        </div>
      ) : (
        <AddEntryForm
          onSubmit={handleAddEntry}
          collapsed={!formExpanded}
          onExpand={() => setFormExpanded(true)}
        />
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '20px' : '40px',
          overflow: 'auto',
        }}
      >
        <MoodLedger entries={entries} />
      </div>

      <div
        onClick={() => setSidebarOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: sidebarOpen ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
          pointerEvents: sidebarOpen ? 'auto' : 'none',
          transition: 'background 0.4s ease-in-out',
          zIndex: 200,
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: isMobile ? '100%' : '480px',
          maxWidth: '100%',
          height: '100vh',
          background: 'rgba(22, 33, 62, 0.98)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: sidebarOpen ? '-10px 0 40px rgba(0, 0, 0, 0.5)' : 'none',
        }}
      >
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
              📋 记录管理
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
              共 {filteredAndSortedEntries.length} / {entries.length} 条记录
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease-in-out',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 100, 100, 0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: '16px 24px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>筛选:</span>
            <select
              value={filterEmotion}
              onChange={(e) => setFilterEmotion(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all" style={{ background: '#16213e' }}>全部情感</option>
              {(Object.keys(EMOTION_CONFIG) as EmotionType[]).map((type) => (
                <option key={type} value={type} style={{ background: '#16213e' }}>
                  {EMOTION_CONFIG[type].label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease-in-out',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            {sortOrder === 'desc' ? '⏬ 时间倒序' : '⏫ 时间正序'}
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
          }}
        >
          {filteredAndSortedEntries.length === 0 ? (
            <div
              style={{
                padding: '60px 24px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <p style={{ fontSize: '14px' }}>暂无记录</p>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>开始记录你的第一笔心情吧</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#16213e',
                  zIndex: 1,
                }}
              >
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '11px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    ID
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '11px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    心情文字
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '11px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    金额
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '11px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    情感
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '11px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    时间
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedEntries.map((entry) => {
                  const config = EMOTION_CONFIG[entry.emotion];
                  return (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.2s ease-in-out',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                      }}
                    >
                      <td
                        style={{
                          padding: '12px 16px',
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          maxWidth: '80px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={entry.id}
                      >
                        {entry.id.slice(0, 8)}...
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          color: '#ffffff',
                          fontSize: '13px',
                          maxWidth: '180px',
                        }}
                      >
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={entry.text}
                        >
                          {entry.text}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 600,
                          textAlign: 'right',
                        }}
                      >
                        <span style={{ color: config.color }}>¥{entry.amount}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: `${config.color}22`,
                            border: `1px solid ${config.color}44`,
                            fontSize: '12px',
                            color: config.color,
                          }}
                        >
                          {entry.emotion === 'happy' && '😊'}
                          {entry.emotion === 'anxious' && '😰'}
                          {entry.emotion === 'calm' && '😌'}
                          {entry.emotion === 'surprised' && '🎉'}
                          {entry.emotion === 'tired' && '😴'}
                          {config.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatTime(entry.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
