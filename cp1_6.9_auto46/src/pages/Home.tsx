import { useState, useMemo } from 'react';
import {
  BottleListItem,
  Stats,
  BottleColor,
  COLOR_MAP,
  CreateBottleRequest,
} from '../types';

interface HomeProps {
  bottles: BottleListItem[];
  stats: Stats;
  loading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  onNavigate: (route: { name: 'home' } | { name: 'bottle'; id: string }) => void;
  onCreateBottle: () => void;
}

const COLORS: BottleColor[] = ['red', 'blue', 'green', 'purple', 'gold'];

function getDefaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
}

function getMaxDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const Home: React.FC<HomeProps> = ({
  bottles,
  stats,
  loading,
  error,
  setError,
  onNavigate,
  onCreateBottle,
}) => {
  const [message, setMessage] = useState('');
  const [unlockDate, setUnlockDate] = useState(getDefaultDate());
  const [color, setColor] = useState<BottleColor>('blue');
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      message.trim().length > 0 &&
      message.trim().length <= 500 &&
      !!unlockDate &&
      new Date(unlockDate).getTime() > Date.now()
    );
  }, [message, unlockDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);
    setCreatedId(null);

    const body: CreateBottleRequest = {
      message: message.trim(),
      unlockDate: new Date(unlockDate).toISOString(),
      color,
    };

    try {
      const res = await fetch('/api/bottle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '创建失败');
      }
      setCreatedId(data.id);
      setMessage('');
      setUnlockDate(getDefaultDate());
      setColor('blue');
      onCreateBottle();
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdId) return;
    try {
      await navigator.clipboard.writeText(createdId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  };

  const handleViewBottle = (id: string) => {
    onNavigate({ name: 'bottle', id });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">漂流瓶·时光胶囊</h1>
        <p className="app-subtitle">DRIFT BOTTLE · TIME CAPSULE</p>
      </header>

      <div className="grid-layout">
        <div className="card">
          <h2 className="section-title">🍾 封装新漂流瓶</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">时光讯息（最多 500 字）</label>
              <textarea
                className="form-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                placeholder="将你的心事、期许或秘密写在这里，未来的某一天才会被揭晓..."
              />
              <div className="char-count">{message.length} / 500</div>
            </div>

            <div className="form-group">
              <label className="form-label">解锁日期（未来 30 天内）</label>
              <input
                type="datetime-local"
                className="form-input"
                value={unlockDate}
                min={getDefaultDate()}
                max={getMaxDate()}
                onChange={(e) => setUnlockDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">瓶身颜色</label>
              <div className="color-picker">
                {COLORS.map((c) => (
                  <div
                    key={c}
                    className={`color-option ${color === c ? 'selected' : ''}`}
                    style={{ background: COLOR_MAP[c].hex }}
                    onClick={() => setColor(c)}
                    title={COLOR_MAP[c].name}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn"
              disabled={!canSubmit || submitting}
              style={{ width: '100%' }}
            >
              {submitting ? '封装中...' : '🌊 封装漂流瓶'}
            </button>

            {error && <div className="error-message">{error}</div>}

            {createdId && (
              <div className="success-message">
                🎉 漂流瓶已成功投入大海！
                <br />
                瓶身编号：<span className="new-bottle-id">{createdId}</span>
                <br />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopy}
                  style={{ marginTop: '0.8rem' }}
                >
                  {copied ? '✅ 已复制' : '📋 复制编号'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleViewBottle(createdId)}
                  style={{ marginTop: '0.8rem', marginLeft: '0.5rem' }}
                >
                  🔍 查看漂流瓶
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="card">
          <h2 className="section-title">🔍 我的漂流瓶 ({bottles.length})</h2>
          <div className="id-input-section" style={{ margin: '0 0 2rem 0' }}>
            <label className="form-label" style={{ textAlign: 'left' }}>
              输入瓶身编号查看
            </label>
            <div className="id-input-row">
              <input
                type="text"
                className="form-input"
                placeholder="8 位编号"
                id="bottle-id-input"
                maxLength={8}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (
                      document.getElementById(
                        'bottle-id-input'
                      ) as HTMLInputElement
                    ).value;
                    if (val.trim()) handleViewBottle(val.trim().toUpperCase());
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const val = (
                    document.getElementById(
                      'bottle-id-input'
                    ) as HTMLInputElement
                  ).value;
                  if (val.trim()) handleViewBottle(val.trim().toUpperCase());
                }}
              >
                查看
              </button>
            </div>
          </div>

          {bottles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌊</div>
              <p>海面平静，暂无漂流瓶</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                在左侧创建你的第一个漂流瓶吧！
              </p>
            </div>
          ) : (
            <div className="bottle-list">
              {bottles
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .map((b) => (
                  <div
                    key={b.id}
                    className="bottle-item"
                    onClick={() => handleViewBottle(b.id)}
                  >
                    <div className="bottle-item-left">
                      <div
                        className="bottle-indicator"
                        style={{
                          background: COLOR_MAP[b.color].hex,
                          color: COLOR_MAP[b.color].hex,
                        }}
                      />
                      <div className="bottle-info">
                        <div className="bottle-id">{b.id}</div>
                        <div className="bottle-date">
                          解锁：{formatDate(b.unlockDate)}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`bottle-status ${
                        b.isUnlocked ? 'status-unlocked' : 'status-locked'
                      }`}
                    >
                      {b.isUnlocked ? '✓ 已解锁' : '⏳ 锁定中'}
                    </div>
                  </div>
                ))}
            </div>
          )}
          {loading && <div className="loading-spinner" />}
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="stats-section" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
          <h2 className="section-title">📊 海洋统计</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.lockedCount}</div>
              <div className="stat-label">🌊 海上漂流中（未解锁）</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalCount}</div>
              <div className="stat-label">📦 漂流瓶总数</div>
            </div>
          </div>

          <h3 className="section-title" style={{ fontSize: '1.1rem' }}>
            ✨ 最近被开启的漂流瓶
          </h3>
          {stats.recentOpened.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem' }}>
                暂无可公开的漂流瓶记录
              </p>
            </div>
          ) : (
            <div className="opened-list">
              {stats.recentOpened.map((r) => (
                <div key={r.id} className="opened-item">
                  <div className="opened-summary">「{r.summary}」</div>
                  <div className="opened-meta">
                    <span>编号：{r.id}</span>
                    <span>开启于：{formatDate(r.openedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
