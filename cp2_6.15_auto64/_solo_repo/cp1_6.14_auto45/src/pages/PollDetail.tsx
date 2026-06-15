import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ResultChart from '../components/ResultChart';
import socket from '../socket';
import { Poll, PollResult, PollType, VoteSelection } from '../types';

const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 24;
const CHECKMARK_PATH_LENGTH = 33;

const PollDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<PollResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [rankingOrder, setRankingOrder] = useState<number[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [voteRecords, setVoteRecords] = useState<any[]>([]);
  const successSvgRef = useRef<SVGSVGElement>(null);
  const animationTimersRef = useRef<NodeJS.Timeout[]>([]);

  const fetchPoll = useCallback(async () => {
    if (!id) return;
    try {
      const [pollRes, resultsRes] = await Promise.all([
        axios.get(`/api/polls/${id}`),
        axios.get(`/api/polls/${id}/results`),
      ]);
      setPoll(pollRes.data);
      setResults(resultsRes.data.results);
      setRankingOrder(pollRes.data.options.map((_: string, i: number) => i));
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  useEffect(() => {
    return () => {
      animationTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    socket.emit('joinPoll', id);

    const handleVoteUpdate = (data: { results: PollResult[]; participantCount: number }) => {
      setResults(data.results);
      setPoll(prev => prev ? { ...prev, participant_count: data.participantCount } : null);
    };

    socket.on('voteUpdated', handleVoteUpdate);

    return () => {
      socket.emit('leavePoll', id);
      socket.off('voteUpdated', handleVoteUpdate);
    };
  }, [id]);

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  };

  const handleOptionClick = (index: number) => {
    if (hasVoted || !poll) return;

    if (poll.type === 'single') {
      setSelectedOptions([index]);
    } else if (poll.type === 'multiple') {
      setSelectedOptions(prev =>
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index]
      );
    }
  };

  const handleRatingChange = (optionIndex: number, rating: number) => {
    if (hasVoted) return;
    setRatings(prev => ({ ...prev, [optionIndex]: rating }));
    if (!selectedOptions.includes(optionIndex)) {
      setSelectedOptions(prev => [...prev, optionIndex]);
    }
  };

  const handleRankingMove = (index: number, direction: 'up' | 'down') => {
    if (hasVoted) return;
    const newOrder = [...rankingOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setRankingOrder(newOrder);
    setSelectedOptions(newOrder);
  };

  const handleSubmitVote = async () => {
    if (!poll || submitting) return;

    let selections: VoteSelection[] = [];

    if (poll.type === 'single' || poll.type === 'multiple') {
      if (selectedOptions.length === 0) {
        setError('请选择至少一个选项');
        return;
      }
      selections = selectedOptions.map(idx => ({ optionIndex: idx }));
    } else if (poll.type === 'rating') {
      if (selectedOptions.length === 0) {
        setError('请为选项评分');
        return;
      }
      selections = selectedOptions.map(idx => ({
        optionIndex: idx,
        rating: ratings[idx] || 3,
      }));
    } else if (poll.type === 'ranking') {
      selections = rankingOrder.map((optIdx, rankIdx) => ({
        optionIndex: optIdx,
        rankPosition: rankIdx + 1,
      }));
    }

    setSubmitting(true);
    setError('');
    try {
      await axios.post(`/api/polls/${poll.id}/vote`, { selections });
      setHasVoted(true);
      setShowSuccess(true);
      setFadeOut(false);

      animationTimersRef.current.forEach(timer => clearTimeout(timer));
      animationTimersRef.current = [];

      const drawDuration = 500;
      const holdDuration = 300;
      const fadeDuration = 500;

      const fadeOutTimer = setTimeout(() => {
        setFadeOut(true);
      }, drawDuration + holdDuration);

      const hideTimer = setTimeout(() => {
        setShowSuccess(false);
        setFadeOut(false);
      }, drawDuration + holdDuration + fadeDuration);

      animationTimersRef.current.push(fadeOutTimer, hideTimer);
    } catch (err: any) {
      setError(err.response?.data?.error || '投票失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (!id) return;
    window.open(`/api/polls/${id}/export`, '_blank');
  };

  const fetchRecords = async () => {
    if (!id) return;
    try {
      const res = await axios.get(`/api/polls/${id}/records`);
      setVoteRecords(res.data);
      setShowRecords(true);
    } catch (err) {
      console.error('Failed to fetch records:', err);
    }
  };

  const getTypeLabel = (type: PollType) => {
    const labels: Record<PollType, string> = {
      single: '单选',
      multiple: '多选',
      rating: '评分',
      ranking: '排序',
    };
    return labels[type];
  };

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  if (error && !poll) {
    return (
      <div style={styles.errorPage}>
        <p style={styles.errorText}>{error}</p>
        <Link to="/" style={styles.backLink}>返回列表</Link>
      </div>
    );
  }

  if (!poll) return null;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>{poll.title}</h1>
          <div style={styles.metaRow}>
            <span style={styles.typeTag}>{getTypeLabel(poll.type)}</span>
            <span style={styles.participants}>{poll.participant_count} 人参与</span>
            {poll.deadline && (
              <span style={styles.deadline}>
                截止: {new Date(poll.deadline).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
        </div>
        <div style={styles.headerRight}>
          <button
            onClick={handleExport}
            style={styles.exportBtn}
            className="ripple-button"
            title="导出CSV"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>投票选项</h2>

        {poll.type === 'ranking' ? (
          <div style={styles.rankingList}>
            {rankingOrder.map((optIdx, rankIdx) => (
              <div key={optIdx} style={styles.rankingItem}>
                <span style={styles.rankNumber}>{rankIdx + 1}</span>
                <span style={styles.rankingOption}>{poll.options[optIdx]}</span>
                <div style={styles.rankButtons}>
                  <button
                    onClick={() => handleRankingMove(rankIdx, 'up')}
                    style={{ ...styles.rankBtn, opacity: rankIdx === 0 ? 0.3 : 1 }}
                    disabled={rankIdx === 0 || hasVoted}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleRankingMove(rankIdx, 'down')}
                    style={{ ...styles.rankBtn, opacity: rankIdx === rankingOrder.length - 1 ? 0.3 : 1 }}
                    disabled={rankIdx === rankingOrder.length - 1 || hasVoted}
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.optionsGrid}>
            {poll.options.map((option, index) => {
              const isSelected = selectedOptions.includes(index);
              return (
                <div
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  style={{
                    ...styles.optionCard,
                    width: '220px',
                    height: '100px',
                    backgroundColor: isSelected ? '#6366f120' : '#2a2a3e',
                    border: isSelected ? '2px solid #6366f1' : '2px solid transparent',
                  }}
                  className="option-card"
                >
                  {isSelected && (
                    <div style={styles.checkMark}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  <span style={styles.optionText}>{option}</span>

                  {poll.type === 'rating' && (
                    <div style={styles.ratingStars} onClick={(e) => e.stopPropagation()}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          onClick={() => handleRatingChange(index, star)}
                          style={{
                            ...styles.star,
                            color: (ratings[index] || 0) >= star ? '#f59e0b' : '#4a4a6a',
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!hasVoted && (
          <button
            onClick={handleSubmitVote}
            disabled={submitting || (poll.type !== 'ranking' && selectedOptions.length === 0)}
            style={{
              ...styles.submitBtn,
              opacity: submitting || (poll.type !== 'ranking' && selectedOptions.length === 0) ? 0.6 : 1,
            }}
            className="ripple-button"
          >
            {submitting ? '提交中...' : '提交投票'}
          </button>
        )}

        {error && <div style={styles.errorMsg}>{error}</div>}
      </div>

      <div style={styles.section}>
        <ResultChart
          type={poll.type}
          options={poll.options}
          results={results}
          participantCount={poll.participant_count}
        />
      </div>

      <div style={styles.section}>
        <button
          onClick={() => {
            if (!showRecords) fetchRecords();
            else setShowRecords(false);
          }}
          style={styles.toggleRecordsBtn}
        >
          {showRecords ? '隐藏投票记录' : '查看投票记录'}
        </button>

        {showRecords && (
          <div style={styles.recordsContainer}>
            {voteRecords.length === 0 ? (
              <p style={styles.noRecords}>暂无投票记录</p>
            ) : (
              <div style={styles.recordsList}>
                {voteRecords.slice(0, 20).map((record, idx) => (
                  <div key={record.sessionId} style={styles.recordItem}>
                    <span style={styles.recordIndex}>{idx + 1}</span>
                    <span style={styles.recordIp}>{record.ip_prefix || '未知'}</span>
                    <span style={styles.recordTime}>
                      {new Date(record.voted_at).toLocaleString('zh-CN')}
                    </span>
                    <span style={styles.recordVotes}>
                      {record.votes?.length || 0} 个选项
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showSuccess && (
        <div
          style={{
            ...styles.successOverlay,
            animation: fadeOut ? 'fadeOut 0.5s ease-out forwards' : 'fadeInUp 0.3s ease-out',
          }}
        >
          <div style={styles.successCheckmark}>
            <svg width="80" height="80" viewBox="0 0 52 52" ref={successSvgRef}>
              <circle
                cx="26"
                cy="26"
                r="24"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                style={{
                  ...styles.circle,
                  strokeDasharray: CIRCLE_CIRCUMFERENCE,
                  strokeDashoffset: CIRCLE_CIRCUMFERENCE,
                }}
              />
              <path
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27l7 7 16-16"
                style={{
                  ...styles.checkmarkPath,
                  strokeDasharray: CHECKMARK_PATH_LENGTH,
                  strokeDashoffset: CHECKMARK_PATH_LENGTH,
                }}
              />
            </svg>
            <p
              style={{
                ...styles.successText,
                opacity: fadeOut ? 0 : 1,
                transition: 'opacity 0.5s ease-out',
              }}
            >
              投票成功!
            </p>
          </div>
        </div>
      )}

      <style>{`
        .option-card {
          transition: all 0.2s ease;
        }
        .option-card:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    animation: 'fadeInUp 0.4s ease-out',
  },
  loading: {
    textAlign: 'center',
    padding: '80px',
    color: '#94a3b8',
  },
  errorPage: {
    textAlign: 'center',
    padding: '80px',
  },
  errorText: {
    color: '#f87171',
    fontSize: '16px',
    marginBottom: '20px',
  },
  backLink: {
    color: '#6366f1',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: '12px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  typeTag: {
    fontSize: '12px',
    padding: '4px 12px',
    backgroundColor: '#6366f120',
    color: '#6366f1',
    borderRadius: '12px',
    fontWeight: 500,
  },
  participants: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  deadline: {
    fontSize: '13px',
    color: '#f59e0b',
  },
  headerRight: {
    display: 'flex',
    gap: '8px',
  },
  exportBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '16px',
  },
  optionsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px',
  },
  optionCard: {
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    cursor: 'pointer',
    position: 'relative',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  },
  checkMark: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: '14px',
    color: '#e2e8f0',
    fontWeight: 500,
    wordBreak: 'break-word',
  },
  ratingStars: {
    display: 'flex',
    gap: '4px',
    marginTop: '8px',
  },
  star: {
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '24px',
  },
  rankingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#2a2a3e',
    borderRadius: '8px',
  },
  rankNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
  },
  rankingOption: {
    flex: 1,
    fontSize: '14px',
    color: '#e2e8f0',
  },
  rankButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  rankBtn: {
    width: '24px',
    height: '20px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  submitBtn: {
    width: '200px',
    height: '48px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    borderRadius: '24px',
    border: 'none',
    fontSize: '15px',
    fontWeight: 600,
    display: 'block',
    margin: '0 auto',
    transition: 'background-color 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  errorMsg: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#f8717120',
    color: '#f87171',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
  },
  toggleRecordsBtn: {
    padding: '10px 20px',
    backgroundColor: '#2a2a3e',
    color: '#e2e8f0',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  recordsContainer: {
    marginTop: '16px',
    backgroundColor: '#1e1e2e',
    borderRadius: '12px',
    padding: '16px',
  },
  noRecords: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  recordsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  recordItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '10px 12px',
    backgroundColor: '#2a2a3e',
    borderRadius: '6px',
    fontSize: '13px',
  },
  recordIndex: {
    width: '24px',
    color: '#94a3b8',
  },
  recordIp: {
    flex: 1,
    color: '#e2e8f0',
    fontFamily: 'monospace',
  },
  recordTime: {
    color: '#94a3b8',
    fontSize: '12px',
  },
  recordVotes: {
    color: '#6366f1',
    fontSize: '12px',
  },
  successOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeInUp 0.3s ease-out',
  },
  successCheckmark: {
    textAlign: 'center',
    animation: 'fadeInUp 0.5s ease-out',
  },
  successText: {
    marginTop: '16px',
    fontSize: '18px',
    color: '#10b981',
    fontWeight: 600,
  },
  circle: {
    animation: 'checkmarkCircle 0.5s cubic-bezier(0.65, 0, 0.45, 1) forwards',
  },
  checkmarkPath: {
    animation: 'checkmark 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.2s forwards',
  },
};

export default PollDetail;
