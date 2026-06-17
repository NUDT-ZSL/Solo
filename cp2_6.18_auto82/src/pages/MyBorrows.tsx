import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import type { Borrow, FeedbackCondition } from '../types';

const MyBorrows: React.FC = () => {
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackBorrowId, setFeedbackBorrowId] = useState<string | null>(null);
  const [feedbackCondition, setFeedbackCondition] = useState<FeedbackCondition>('normal');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchBorrows();
  }, []);

  const fetchBorrows = async () => {
    try {
      const res = await fetch('/api/borrows');
      const data = await res.json();
      setBorrows(data);
    } catch (error) {
      console.error('Failed to fetch borrows:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCountdown = useCallback((endTime: string) => {
    const end = dayjs(endTime);
    const diff = end.diff(now);

    if (diff <= 0) {
      return '已超时';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [now]);

  const getStatusLabel = (status: Borrow['status']) => {
    const labels = {
      active: '借用中',
      returned: '已归还',
      overdue: '已逾期',
    };
    return labels[status];
  };

  const openFeedbackModal = (borrowId: string, currentMemberName: string) => {
    setFeedbackBorrowId(borrowId);
    setFeedbackCondition('normal');
    setFeedbackComment('');
    setReporterName(currentMemberName);
  };

  const closeFeedbackModal = () => {
    setFeedbackBorrowId(null);
    setFeedbackCondition('normal');
    setFeedbackComment('');
    setReporterName('');
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeFeedbackModal();
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackBorrowId || !reporterName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/report/${feedbackBorrowId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          condition: feedbackCondition,
          comment: feedbackComment,
          reporter: reporterName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '提交失败');
      }

      closeFeedbackModal();
      fetchBorrows();
    } catch (err) {
      alert(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const conditionOptions: { value: FeedbackCondition; label: string }[] = [
    { value: 'normal', label: '正常' },
    { value: 'worn', label: '轻微磨损' },
    { value: 'damaged', label: '损坏需修理' },
  ];

  const activeBorrows = borrows.filter(b => b.status !== 'returned');
  const historyBorrows = borrows.filter(b => b.status === 'returned');

  if (loading) {
    return <div className="empty-state">加载中...</div>;
  }

  return (
    <div>
      <h1 className="page-title">我的借用记录</h1>

      {activeBorrows.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>进行中</h2>
          <div className="borrows-list">
            {activeBorrows.map(borrow => (
              <div
                key={borrow.id}
                className={`borrow-card${borrow.status === 'overdue' ? ' overdue' : ''}`}
              >
                <div className="borrow-card-header">
                  <div className="borrow-card-title">{borrow.toolName}</div>
                  <span className={`status-tag ${borrow.status === 'overdue' ? 'repairing' : borrow.status === 'active' ? 'borrowed' : 'available'}`}>
                    {getStatusLabel(borrow.status)}
                  </span>
                </div>
                <div className="borrow-card-meta">
                  借用人：{borrow.memberName} · {borrow.duration}小时
                </div>
                <div className="borrow-card-meta">
                  借用时间：{dayjs(borrow.startTime).format('YYYY-MM-DD HH:mm')}
                </div>
                <div className="borrow-card-meta">
                  应还时间：{dayjs(borrow.endTime).format('YYYY-MM-DD HH:mm')}
                </div>
                <div className="countdown">
                  {calculateCountdown(borrow.endTime)}
                </div>
                <div className="borrow-card-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => openFeedbackModal(borrow.id, borrow.memberName)}
                  >
                    归还并反馈
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {historyBorrows.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, margin: '32px 0 16px' }}>历史记录</h2>
          <div className="borrows-list">
            {historyBorrows.map(borrow => (
              <div key={borrow.id} className="borrow-card">
                <div className="borrow-card-header">
                  <div className="borrow-card-title">{borrow.toolName}</div>
                  <span className="status-tag available">
                    {getStatusLabel(borrow.status)}
                  </span>
                </div>
                <div className="borrow-card-meta">
                  借用人：{borrow.memberName} · {borrow.duration}小时
                </div>
                <div className="borrow-card-meta">
                  借用时间：{dayjs(borrow.startTime).format('YYYY-MM-DD HH:mm')}
                </div>
                {borrow.feedback && (
                  <div className="borrow-card-meta" style={{ marginTop: 8 }}>
                    <strong>反馈：</strong>
                    {conditionOptions.find(c => c.value === borrow.feedback?.condition)?.label}
                    {borrow.feedback.comment && ` - ${borrow.feedback.comment}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {borrows.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>暂无借用记录</p>
          <a href="/" className="btn btn-secondary" style={{ marginTop: 16 }}>
            去浏览工具
          </a>
        </div>
      )}

      {feedbackBorrowId && (
        <div
          className={`modal-overlay${feedbackBorrowId ? ' open' : ''}`}
          onClick={handleOverlayClick}
        >
          <div className="modal-content">
            <button className="modal-close" onClick={closeFeedbackModal}>
              ×
            </button>
            <h2 className="modal-title" style={{ marginBottom: 24 }}>
              归还反馈
            </h2>
            <form onSubmit={handleFeedbackSubmit}>
              <div className="form-group">
                <label htmlFor="reporterName">您的姓名</label>
                <input
                  type="text"
                  id="reporterName"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="请输入您的姓名"
                  maxLength={20}
                />
              </div>

              <div className="form-group">
                <label>工具状态</label>
                <div className="radio-group">
                  {conditionOptions.map(option => (
                    <div
                      key={option.value}
                      className={`radio-option${feedbackCondition === option.value ? ' selected' : ''}${feedbackCondition === option.value && option.value === 'damaged' ? ' damaged' : ''}`}
                      onClick={() => setFeedbackCondition(option.value)}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="comment">简短评价（限100字）</label>
                <textarea
                  id="comment"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value.slice(0, 100))}
                  placeholder="请描述工具使用情况..."
                  rows={3}
                  maxLength={100}
                />
                <div className="char-count">{feedbackComment.length}/100</div>
              </div>

              <div className="borrow-card-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeFeedbackModal}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !reporterName.trim()}
                >
                  {submitting ? '提交中...' : '提交反馈'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBorrows;
