import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveVote,
  VoteResult,
  getActiveVote,
  getVoteResult,
  castVote,
} from '../client/votes';
import { Book, searchBooks } from '../client/books';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, CartesianGrid,
} from 'recharts';

interface VotesProps {
  userId: string;
  username: string;
  avatar: string;
  isAdmin: boolean;
  onCreateVote?: (title: string, bookIds: string[]) => void;
}

const countDown = (endsAt: number) => {
  const diff = Math.max(0, endsAt - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const COLORS = ['#d97706', '#ea580c', '#f59e0b', '#92400e', '#b45309'];

const Votes: React.FC<VotesProps> = ({ userId, username, avatar, isAdmin, onCreateVote }) => {
  const [active, setActive] = useState<ActiveVote | null>(null);
  const [result, setResult] = useState<VoteResult | null>(null);
  const [countdown, setCountdown] = useState('');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [voteTitle, setVoteTitle] = useState('下个月共读哪本书？');
  const [pickList, setPickList] = useState<Book[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const av = await getActiveVote();
    setActive(av);
    if (av) {
      if (av.userVoteMap && av.userVoteMap[userId]) {
        setSelectedBook(av.userVoteMap[userId]);
      }
      const res = await getVoteResult(av._id);
      setResult(res);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  useEffect(() => {
    if (!active) return;
    const tick = () => setCountdown(countDown(active.endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  const isVoted = active?.userVoteMap?.[userId];
  const isEnded = active ? active.endsAt <= Date.now() : false;

  const handleVote = async () => {
    if (!selectedBook || !active || isVoted || isEnded) return;
    setLoading(true);
    try {
      await castVote(active._id, userId, selectedBook);
      await load();
    } catch (e: any) {
      alert(e.response?.data?.error || '投票失败');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = async () => {
    const all = await searchBooks();
    setPickList(all);
    setPicked([]);
    setShowCreate(true);
  };

  const togglePick = (id: string) => {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) :
      prev.length >= 5 ? prev : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (picked.length < 3 || !voteTitle.trim()) return;
    if (onCreateVote) {
      onCreateVote(voteTitle.trim(), picked);
    }
    setShowCreate(false);
    await load();
  };

  const exportPNG = async () => {
    if (!posterRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(posterRef.current, { scale: 2, backgroundColor: '#fff7ed' });
    const link = document.createElement('a');
    link.download = `vote-result-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const barData = useMemo(() => {
    if (!result) return [];
    return result.result.map((r) => ({
      name: r.book.title.length > 6 ? r.book.title.slice(0, 6) + '..' : r.book.title,
      fullName: r.book.title,
      票数: r.count,
      id: r.book._id,
    }));
  }, [result]);

  const pieData = useMemo(() => {
    if (!result) return [];
    return result.result.map((r) => ({
      name: r.book.title,
      value: r.count,
      percent: r.percent.toFixed(1),
    }));
  }, [result]);

  const winLabel = useMemo(() => {
    if (!result || result.total === 0) return '';
    const top = result.result[0];
    return top ? `🏆 ${top.book.title} 以 ${top.count} 票（${top.percent.toFixed(1)}%）获得第一` : '';
  }, [result]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>🗳️ 投票</h1>
        {isAdmin && (
          <button className="btn-primary" onClick={openCreate}>➕ 发起新投票</button>
        )}
      </div>

      {active ? (
        <>
          <div className="vote-banner">
            <div className="vote-banner-title">{active.title}</div>
            <div style={{ marginBottom: '10px', fontSize: '13px', opacity: 0.9 }}>
              {isEnded ? '投票已结束，以下为最终结果' : `距离投票结束还有 ${countdown}`}
            </div>
            <div className="vote-banner-countdown">{countdown}</div>
            <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.9 }}>
              共 {active.total} 人参与投票
            </div>
          </div>

          {!isEnded && !isVoted && (
            <div className="card dashboard-full">
              <h2 className="section-title">请选择一本你想共读的书（点击后确认投票）</h2>
              <div className="vote-options-list">
                {active.books.map((b) => (
                  <div
                    key={b._id}
                    className={`vote-option ${selectedBook === b._id ? 'selected' : ''}`}
                    onClick={() => setSelectedBook(b._id)}
                  >
                    <img src={b.cover} alt={b.title} style={{ width: 48, height: 72, borderRadius: 6, objectFit: 'cover' }} />
                    <div className="vote-option-book">
                      <div className="vote-option-title">{b.title}</div>
                      <div className="vote-option-author">作者：{b.author} · {b.pages}页 · ⭐{b.rating}</div>
                      {active.counts[b._id] > 0 && (
                        <div className="vote-option-bar-wrap">
                          <div className="vote-option-bar"
                               style={{ width: `${((active.counts[b._id] || 0) / Math.max(1, active.total)) * 100}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="vote-option-count">{active.counts[b._id] || 0} 票</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <button
                  className="btn-primary"
                  onClick={handleVote}
                  disabled={!selectedBook || loading}
                >
                  {loading ? '投票中...' : '确认投票'}
                </button>
              </div>
            </div>
          )}

          {(isEnded || isVoted) && (
            <div className="card dashboard-full">
              <h2 className="section-title">📊 投票结果</h2>
              {winLabel && <div style={{ textAlign: 'center', fontWeight: 700, color: '#d97706', marginBottom: '20px', fontSize: '16px' }}>{winLabel}</div>}
              <div className="vote-options-list">
                {result?.result.map((r) => (
                  <div key={r.book._id} className="vote-option selected">
                    <img src={r.book.cover} alt={r.book.title} style={{ width: 48, height: 72, borderRadius: 6, objectFit: 'cover' }} />
                    <div className="vote-option-book">
                      <div className="vote-option-title">{r.book.title}</div>
                      <div className="vote-option-author">{r.book.author}</div>
                      <div className="vote-option-bar-wrap">
                        <div className="vote-option-bar" style={{ width: `${r.percent}%` }} />
                      </div>
                    </div>
                    <div className="vote-option-count">
                      {r.count}<div style={{ fontSize: '11px', color: '#7a5a48' }}>{r.percent.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(isEnded || result && result.total > 0) && (
            <div ref={posterRef} className="poster-container">
              <div className="poster-title">🎉 读书俱乐部投票结果海报</div>
              <div className="poster-subtitle">{active.title} · 共{result?.total || 0}人参与 · {new Date(active.createdAt).toLocaleDateString()}</div>
              <div className="poster-charts">
                <div className="chart-card">
                  <div className="chart-title">📊 各图书得票对比（柱状图）</div>
                  <div className="bar-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d6" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7a5a48' }} angle={-30} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 10, fill: '#7a5a48' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '12px' }} />
                        <Bar dataKey="票数" radius={[6, 6, 0, 0]}>
                          {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="chart-card">
                  <div className="chart-title">🥧 得票占比（饼图）</div>
                  <div className="pie-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name.slice(0,4)}.. ${percent}%`}
                          labelLine={false}
                        >
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="poster-footer">— ReadCircle 读书俱乐部 · {new Date().toLocaleDateString()} —</div>
            </div>
          )}

          {(isEnded || (result && result.total > 0)) && (
            <div className="poster-actions">
              <button className="btn-primary" onClick={exportPNG}>💾 导出海报为PNG</button>
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <div style={{ fontSize: '16px', color: '#7a5a48', marginBottom: '16px' }}>暂无进行中的投票</div>
          {isAdmin && <button className="btn-primary" onClick={openCreate}>➕ 发起第一轮投票</button>}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-title">发起投票</div>
            <div className="form-group">
              <label>投票主题</label>
              <input className="form-input" value={voteTitle} onChange={(e) => setVoteTitle(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>选择候选图书（3-5本），已选 {picked.length}/5</label>
              <div className="book-picker">
                {pickList.map((b) => (
                  <div
                    key={b._id}
                    className={`book-picker-item ${picked.includes(b._id) ? 'selected' : ''}`}
                    onClick={() => togglePick(b._id)}
                  >
                    <div className="book-picker-checkbox">
                      {picked.includes(b._id) && '✓'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.title}</div>
                      <div style={{ fontSize: '11px', color: '#a08a74' }}>{b.author}</div>
                    </div>
                  </div>
                ))}
                {pickList.length === 0 && <div style={{ textAlign: 'center', color: '#a08a74', fontSize: '12px', padding: '12px' }}>书库暂无图书</div>}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>取消</button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={picked.length < 3 || !voteTitle.trim()}
              >
                发起投票（72小时）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Votes;
