import React, { useEffect, useMemo, useState } from 'react';
import { generateFingerprint, getShortFingerprint } from './fingerprint';
import VoteCard from './voteCard';
import VoteCanvas from './voteCanvas';
import StatsBar from './statsBar';
import {
  Topic,
  Vote,
  addVote,
  getAllVotes,
  getTopic,
  getTopics,
  getVotesByTopic,
} from './storage';

type Route =
  | { name: 'home' }
  | { name: 'vote'; topicId: string }
  | { name: 'result'; topicId: string };

function parseRoute(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  if (h.startsWith('vote/')) return { name: 'vote', topicId: h.slice(5) };
  if (h.startsWith('result/')) return { name: 'result', topicId: h.slice(7) };
  return { name: 'home' };
}

function navigate(route: Route) {
  if (route.name === 'home') window.location.hash = '/';
  else if (route.name === 'vote') window.location.hash = `/vote/${route.topicId}`;
  else window.location.hash = `/result/${route.topicId}`;
}

const CHOICE_COLORS: Record<'A' | 'B' | 'C', string> = {
  A: '#ef4444',
  B: '#3b82f6',
  C: '#22c55e',
};

function calcTopicDivergence(votes: Vote[]): number {
  const map = new Map<string, 'A' | 'B' | 'C'>();
  for (const v of votes) {
    if (!map.has(v.fingerprint)) map.set(v.fingerprint, v.choice);
  }
  const arr = Array.from(map.values());
  const n = arr.length;
  if (n < 2) return 0;
  let diff = 0;
  const total = (n * (n - 1)) / 2;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (arr[i] !== arr[j]) diff++;
  return Math.round((diff / total) * 100);
}

function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const [fingerprint, setFingerprint] = useState<string>('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allVotes, setAllVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    (async () => {
      const fp = await generateFingerprint();
      setFingerprint(fp);
      const tps = await getTopics();
      setTopics(tps);
      const vs = await getAllVotes();
      setAllVotes(vs);
      setLoading(false);
    })();
  }, []);

  async function refreshVotes() {
    const vs = await getAllVotes();
    setAllVotes(vs);
  }

  const voteCountByTopic = useMemo(() => {
    const m = new Map<string, number>();
    const seen = new Set<string>();
    for (const v of allVotes) {
      const key = `${v.topicId}|${v.fingerprint}`;
      if (!seen.has(key)) {
        seen.add(key);
        m.set(v.topicId, (m.get(v.topicId) || 0) + 1);
      }
    }
    return m;
  }, [allVotes]);

  const userVotedTopics = useMemo(() => {
    const s = new Set<string>();
    for (const v of allVotes) if (v.fingerprint === fingerprint) s.add(v.topicId);
    return s;
  }, [allVotes, fingerprint]);

  const avgDivergence = useMemo(() => {
    if (topics.length === 0) return 0;
    let sum = 0;
    let count = 0;
    for (const t of topics) {
      const tv = allVotes.filter(v => v.topicId === t.id);
      const d = calcTopicDivergence(tv);
      if (tv.length >= 2) {
        sum += d;
        count++;
      }
    }
    return count > 0 ? Math.round(sum / count) : 0;
  }, [topics, allVotes]);

  const totalVotes = useMemo(() => {
    const s = new Set<string>();
    for (const v of allVotes) s.add(v.id);
    return s.size;
  }, [allVotes]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#f3f4f6', fontSize: 18 }}>加载中...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#111827',
        paddingBottom: 80,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      }}
    >
      <div
        style={{
          height: 44,
          background: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid #374151',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          onClick={() => navigate({ name: 'home' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: route.name !== 'home' ? 'pointer' : 'default',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <span style={{ color: '#f3f4f6', fontWeight: 700, fontSize: 15 }}>匿名投票</span>
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: '#374151',
            borderRadius: 100,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span style={{ color: '#d1d5db', fontSize: 12, fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>
            {getShortFingerprint(fingerprint)}
          </span>
        </div>
      </div>

      <div style={{ padding: '32px 24px' }}>
        {route.name === 'home' && (
          <HomePage
            topics={topics}
            voteCountByTopic={voteCountByTopic}
            userVotedTopics={userVotedTopics}
            onSelect={id => navigate({ name: 'vote', topicId: id })}
          />
        )}
        {route.name === 'vote' && (
          <VotePage
            topics={topics}
            topicId={route.topicId}
            fingerprint={fingerprint}
            onBack={() => navigate({ name: 'home' })}
            onVoted={() => {
              refreshVotes();
              navigate({ name: 'result', topicId: route.topicId });
            }}
            allVotes={allVotes}
          />
        )}
        {route.name === 'result' && (
          <ResultPage
            topicId={route.topicId}
            allVotes={allVotes}
            fingerprint={fingerprint}
            onBack={() => navigate({ name: 'vote', topicId: route.topicId })}
            onHome={() => navigate({ name: 'home' })}
          />
        )}
      </div>

      <StatsBar totalVotes={totalVotes} activeTopics={topics.length} avgDivergence={avgDivergence} />
    </div>
  );
}

interface HomePageProps {
  topics: Topic[];
  voteCountByTopic: Map<string, number>;
  userVotedTopics: Set<string>;
  onSelect: (id: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ topics, voteCountByTopic, userVotedTopics, onSelect }) => {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 36,
            fontWeight: 800,
            color: '#f3f4f6',
            letterSpacing: -0.5,
            marginBottom: 10,
          }}
        >
          探索群体观点的分歧
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: '#9ca3af' }}>
          无需注册，匿名参与投票，看看大家怎么想
        </p>
      </div>
      <div className="home-grid">
        {topics.map(topic => (
          <VoteCard
            key={topic.id}
            topic={topic}
            voteCount={voteCountByTopic.get(topic.id) || 0}
            userVoted={userVotedTopics.has(topic.id)}
            onClick={() => onSelect(topic.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface VotePageProps {
  topics: Topic[];
  topicId: string;
  fingerprint: string;
  onBack: () => void;
  onVoted: () => void;
  allVotes: Vote[];
}

const VotePage: React.FC<VotePageProps> = ({ topics, topicId, fingerprint, onBack, onVoted, allVotes }) => {
  const topic = topics.find(t => t.id === topicId);
  const [selected, setSelected] = useState<'A' | 'B' | 'C' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const topicVotes = useMemo(() => {
    const seen = new Map<string, Vote>();
    for (const v of allVotes) {
      if (v.topicId === topicId && !seen.has(v.fingerprint)) seen.set(v.fingerprint, v);
    }
    return Array.from(seen.values());
  }, [allVotes, topicId]);

  const existingVote = topicVotes.find(v => v.fingerprint === fingerprint);

  useEffect(() => {
    if (existingVote) setSelected(existingVote.choice);
  }, [existingVote]);

  if (!topic) {
    return <div style={{ color: '#f3f4f6' }}>话题不存在</div>;
  }

  const total = topicVotes.length;
  const counts = { A: 0, B: 0, C: 0 };
  for (const v of topicVotes) counts[v.choice]++;

  function handleChoice(c: 'A' | 'B' | 'C') {
    if (existingVote || submitting) return;
    setSelected(c);
    setSubmitting(true);
    const btn = document.activeElement as HTMLElement | null;
    if (btn) {
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (btn) btn.style.transform = 'scale(1)';
      }, 150);
    }
    setTimeout(async () => {
      await addVote(topicId, fingerprint, c);
      onVoted();
    }, 200);
  }

  const options: Array<{ key: 'A' | 'B' | 'C'; label: string; text: string }> = [
    { key: 'A', label: 'A', text: topic.optionA },
    { key: 'B', label: 'B', text: topic.optionB },
    { key: 'C', label: 'C', text: topic.optionC },
  ];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          padding: '8px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          marginBottom: 16,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        返回话题列表
      </button>
      <div style={{ background: '#1f2937', borderRadius: 16, padding: 40 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f3f4f6', marginBottom: 12 }}>
          {topic.title}
        </h2>
        <p style={{ margin: 0, fontSize: 15, color: '#9ca3af', lineHeight: 1.6, marginBottom: 8 }}>
          {topic.description}
        </p>
        <div style={{ fontSize: 13, color: '#60a5fa', marginBottom: 32 }}>
          已有 <span style={{ fontWeight: 700 }}>{total}</span> 人参与投票
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {options.map(opt => {
            const isSelected = selected === opt.key;
            const count = counts[opt.key];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const showBar = existingVote || selected !== null;
            return (
              <button
                key={opt.key}
                onClick={() => handleChoice(opt.key)}
                disabled={!!existingVote || submitting}
                style={{
                  position: 'relative',
                  padding: '20px 24px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: existingVote || submitting ? 'default' : 'pointer',
                  background: isSelected ? CHOICE_COLORS[opt.key] : '#374151',
                  color: isSelected ? '#fff' : '#9ca3af',
                  fontSize: 16,
                  fontWeight: 600,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'all 0.15s ease',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!existingVote && !submitting && !isSelected) {
                    e.currentTarget.style.background = '#4b5563';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={e => {
                  if (!existingVote && !submitting && !isSelected) {
                    e.currentTarget.style.background = '#374151';
                    e.currentTarget.style.color = '#9ca3af';
                  }
                }}
              >
                {showBar && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      background: isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(59,130,246,0.15)',
                      width: `${pct}%`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                )}
                <span
                  style={{
                    position: 'relative',
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {opt.label}
                </span>
                <span style={{ position: 'relative', flex: 1 }}>{opt.text}</span>
                {showBar && (
                  <span
                    style={{
                      position: 'relative',
                      fontSize: 14,
                      fontWeight: 700,
                      opacity: 0.9,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {pct}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {existingVote && (
          <div
            style={{
              marginTop: 32,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={onVoted}
              style={{
                padding: '12px 32px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              查看观点分布图
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ResultPageProps {
  topicId: string;
  allVotes: Vote[];
  fingerprint: string;
  onBack: () => void;
  onHome: () => void;
}

const ResultPage: React.FC<ResultPageProps> = ({ topicId, allVotes, fingerprint, onBack, onHome }) => {
  const [topic, setTopic] = useState<Topic | undefined>();
  const [votes, setVotes] = useState<Vote[]>([]);

  useEffect(() => {
    (async () => {
      const t = await getTopic(topicId);
      setTopic(t);
      const vs = await getVotesByTopic(topicId);
      setVotes(vs);
    })();
  }, [topicId]);

  if (!topic) {
    return <div style={{ color: '#f3f4f6' }}>话题不存在</div>;
  }

  const seen = new Map<string, Vote>();
  for (const v of votes) if (!seen.has(v.fingerprint)) seen.set(v.fingerprint, v);
  const dedupVotes = Array.from(seen.values());

  const hasUserVoted = dedupVotes.some(v => v.fingerprint === fingerprint);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            background: '#374151',
            border: 'none',
            color: '#d1d5db',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          返回投票
        </button>
        <button
          onClick={onHome}
          style={{
            background: 'transparent',
            border: '1px solid #374151',
            color: '#9ca3af',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          回到首页
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f3f4f6', marginBottom: 6 }}>
          {topic.title}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>{topic.description}</p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        {(['A', 'B', 'C'] as const).map(k => {
          const text = k === 'A' ? topic.optionA : k === 'B' ? topic.optionB : topic.optionC;
          const count = dedupVotes.filter(v => v.choice === k).length;
          const total = dedupVotes.length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={k}
              style={{
                flex: 1,
                minWidth: 180,
                padding: 16,
                borderRadius: 12,
                background: '#1f2937',
                border: `1px solid ${CHOICE_COLORS[k]}30`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: CHOICE_COLORS[k],
                  }}
                />
                <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 600 }}>
                  选项 {k}
                </span>
              </div>
              <div style={{ color: '#f3f4f6', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                {text}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: CHOICE_COLORS[k],
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {pct}%
                </span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{count} 票</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center' }}>
        <h3 style={{ color: '#f3f4f6', fontSize: 18, fontWeight: 700, margin: '0 0 16px 0' }}>
          用户观点分布与分歧网络
        </h3>
        {!hasUserVoted && dedupVotes.length === 0 ? (
          <div
            style={{
              padding: 60,
              background: '#1f2937',
              borderRadius: 12,
              color: '#9ca3af',
            }}
          >
            暂无投票数据，成为第一个投票的人吧！
          </div>
        ) : (
          <VoteCanvas votes={dedupVotes} />
        )}
      </div>
    </div>
  );
};

export default App;
