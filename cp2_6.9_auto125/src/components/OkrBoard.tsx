import React, { useState, useMemo, useRef } from 'react';
import type { Objective, Quarter } from '../types';
import { OkrCard } from './OkrCard';
import { useWebSocket } from './WebSocketProvider';

interface OkrBoardProps {
  okrs: Objective[];
}

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export const OkrBoard: React.FC<OkrBoardProps> = ({ okrs }) => {
  const { onlineUsers } = useWebSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQuarter, setNewQuarter] = useState<Quarter>('Q2');
  const [newOwner, setNewOwner] = useState('');
  const [activeQuarter, setActiveQuarter] = useState<Quarter | 'ALL'>('ALL');
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<number | null>(null);

  const suggestions = useMemo(() => {
    const titles = new Set<string>();
    const owners = new Set<string>();
    okrs.forEach(o => {
      if (o.title) titles.add(o.title);
      if (o.owner) owners.add(o.owner);
    });
    return [...titles, ...owners];
  }, [okrs]);

  const filteredOkrs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return okrs.filter(o => {
      if (activeQuarter !== 'ALL' && o.quarter !== activeQuarter) return false;
      if (!q) return true;
      return (
        o.title.toLowerCase().includes(q) ||
        o.owner.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q)
      );
    });
  }, [okrs, searchQuery, activeQuarter]);

  const handleSearchChange = (v: string) => {
    if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    setSearchQuery(v);
    if (v) {
      searchTimeoutRef.current = window.setTimeout(() => {
        setVisibleIds(new Set(filteredOkrs.map(o => o.id)));
      }, 50);
    } else {
      setVisibleIds(new Set());
    }
  };

  const groupedByQuarter = useMemo(() => {
    const groups: Record<Quarter, Objective[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
    filteredOkrs.forEach(o => groups[o.quarter].push(o));
    return groups;
  }, [filteredOkrs]);

  const handleCreate = async () => {
    if (!newTitle.trim() || newTitle.length > 50) return;
    if (newDescription.length > 200) return;
    try {
      const res = await fetch('/api/okrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          quarter: newQuarter,
          owner: newOwner.trim() || '未分配'
        })
      });
      if (res.ok) {
        const created = await res.json() as Objective;
        setJustCreatedId(created.id);
        setTimeout(() => setJustCreatedId(null), 500);
        setNewTitle('');
        setNewDescription('');
        setNewOwner('');
        setShowForm(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#2C3E50',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#45B7D1" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.5px' }}>OKR Tracker</h1>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索目标标题或负责人..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px'
              }}
              list="okr-suggestions"
            />
            <datalist id="okr-suggestions">
              {suggestions.map((s, i) => <option key={i} value={s} />)}
            </datalist>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }} title={`${onlineUsers.length} 位用户在线`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span style={{ fontSize: '13px', color: '#CBD5E1' }}>{onlineUsers.length}</span>
            <div style={{ display: 'flex', gap: '-4px' }}>
              {onlineUsers.slice(0, 3).map((u, i) => (
                <span
                  key={u.id}
                  style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: u.color,
                    marginLeft: i > 0 ? '-4px' : '4px',
                    border: '2px solid #2C3E50'
                  }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              background: '#45B7D1',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建目标
          </button>
        </div>
      </div>

      {showForm && (
        <div
          style={{
            background: '#fff',
            margin: '20px 24px',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            animation: 'slideInFromTop 0.4s ease'
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2C3E50', marginBottom: '16px' }}>新建 Objective</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="目标标题（最多50字）*"
                maxLength={50}
                style={{ flex: 1, minWidth: '200px' }}
              />
              <input
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="负责人"
                style={{ width: '150px' }}
              />
              <select
                value={newQuarter}
                onChange={(e) => setNewQuarter(e.target.value as Quarter)}
                style={{ width: '100px' }}
              >
                {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="目标描述（最多200字）"
              maxLength={200}
              rows={2}
              style={{ resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  padding: '8px 16px',
                  background: '#EEF2F7',
                  color: '#6B7C93',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                style={{
                  padding: '8px 20px',
                  background: newTitle.trim() ? '#2C3E50' : '#CBD5E1',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: newTitle.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '16px 24px' }}>
        <div
          className="mobile-tabs"
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            overflowX: 'auto',
            paddingBottom: '4px'
          }}
        >
          {(['ALL', ...QUARTERS] as const).map(q => (
            <button
              key={q}
              onClick={() => setActiveQuarter(q)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: activeQuarter === q ? '#2C3E50' : '#fff',
                color: activeQuarter === q ? '#fff' : '#6B7C93',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              {q === 'ALL' ? '全部' : `${q} (${groupedByQuarter[q].length})`}
            </button>
          ))}
        </div>

        {filteredOkrs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <p style={{ marginTop: '16px', fontSize: '15px', color: '#6B7C93', fontWeight: 500 }}>未找到匹配目标</p>
            <p style={{ marginTop: '4px', fontSize: '13px', color: '#94A3B8' }}>
              {searchQuery ? '尝试其他关键词或清除搜索' : '点击右上角"新建目标"开始创建你的第一个OKR'}
            </p>
          </div>
        ) : (
          <div
            className="board-columns"
            style={{
              display: 'grid',
              gridTemplateColumns: activeQuarter === 'ALL' ? 'repeat(4, 1fr)' : '1fr',
              gap: '20px',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            {(activeQuarter === 'ALL' ? QUARTERS : [activeQuarter as Quarter]).map(quarter => (
              <div key={quarter} style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    padding: '0 4px'
                  }}
                >
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#2C3E50' }}>{quarter}</h2>
                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
                    {groupedByQuarter[quarter].length} 个目标
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {groupedByQuarter[quarter].map((okr) => (
                    <div
                      key={okr.id}
                      style={{
                        animation: (visibleIds.size > 0 && !visibleIds.has(okr.id))
                          ? 'fadeOut 0.3s ease forwards'
                          : 'fadeIn 0.3s ease'
                      }}
                    >
                      <OkrCard objective={okr} isNew={justCreatedId === okr.id} />
                    </div>
                  ))}
                  {groupedByQuarter[quarter].length === 0 && (
                    <div
                      style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        border: '2px dashed #E2E8F0',
                        borderRadius: '12px',
                        color: '#94A3B8',
                        fontSize: '13px'
                      }}
                    >
                      暂无目标
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .board-columns {
            grid-template-columns: 1fr !important;
          }
          .mobile-tabs {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
};
