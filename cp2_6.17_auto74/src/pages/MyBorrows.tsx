import { useEffect, useState, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import type { BorrowRecord } from '../types';
import { CURRENT_USER } from '../types';

interface FeedbackData {
  condition: 'normal' | 'wear' | 'damaged';
  comment: string;
}

const statusLabels: Record<BorrowRecord['status'], string> = {
  active: '借用中',
  overdue: '已逾期',
  returned: '已归还',
};

const conditionOptions: Array<{ value: FeedbackData['condition']; label: string; color: string }> = [
  { value: 'normal', label: '正常使用', color: '#4caf50' },
  { value: 'wear', label: '轻微磨损', color: '#ff9800' },
  { value: 'damaged', label: '损坏需修理', color: '#f44336' },
];

function useCountdown(endTime: string, isActive: boolean) {
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setNow(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  const end = dayjs(endTime);
  const diffMs = end.diff(now);
  const isOverdue = diffMs <= 0;

  const absMs = Math.abs(diffMs);
  const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((absMs / (1000 * 60)) % 60);
  const seconds = Math.floor((absMs / 1000) % 60);

  const timeStr = useMemo(() => {
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}天`);
    parts.push(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`
    );
    return parts.join(' ');
  }, [days, hours, minutes, seconds]);

  return { timeStr, isOverdue };
}

function BorrowCard({
  record,
  onReportSuccess,
}: {
  record: BorrowRecord;
  onReportSuccess: () => void;
}) {
  const isActiveOrOverdue = record.status === 'active' || record.status === 'overdue';
  const { timeStr, isOverdue } = useCountdown(record.endTime, isActiveOrOverdue);

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData>({
    condition: 'normal',
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmitFeedback = useCallback(async () => {
    if (feedback.comment.length > 100) {
      setError('评价不能超过100字');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowId: record.id,
          condition: feedback.condition,
          comment: feedback.comment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');

      onReportSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [record.id, feedback, onReportSuccess]);

  const isOverdueCard = isOverdue && record.status !== 'returned';

  return (
    <div className={`borrow-card ${isOverdueCard ? 'overdue' : ''}`}>
      <div className="borrow-card-header">
        <img src={record.toolPhoto} alt={record.toolName} />
        <div className="borrow-card-title">
          <h3>{record.toolName}</h3>
          <div className="borrow-meta">
            借用时长：{record.durationHours}小时 · 开始：
            {dayjs(record.startTime).format('MM-DD HH:mm')}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className={`borrow-status-badge ${record.status === 'overdue' || isOverdue ? 'overdue' : record.status}`}>
              {record.status === 'overdue' || isOverdue ? statusLabels.overdue : statusLabels[record.status]}
            </span>
          </div>
        </div>
        <div className="borrow-countdown">
          {record.status === 'returned' ? (
            <div style={{ fontSize: 13, color: '#4caf50', fontWeight: 600 }}>
              ✅ 已归还
              {record.feedback?.condition && (
                <div style={{ marginTop: 4, fontSize: 11, color: '#666', fontWeight: 400 }}>
                  {conditionOptions.find((c) => c.value === record.feedback?.condition)?.label}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="countdown-value">{isOverdue ? `-${timeStr}` : timeStr}</div>
              <div className="countdown-label">{isOverdue ? '已超时时长' : '剩余时间'}</div>
            </>
          )}
        </div>
      </div>

      {record.feedback?.comment && record.status === 'returned' && (
        <div
          style={{
            padding: 12,
            background: '#f5f5f5',
            borderRadius: 8,
            fontSize: 13,
            color: '#555',
            marginBottom: 12,
          }}
        >
          💬 评价：{record.feedback.comment}
        </div>
      )}

      {record.status !== 'returned' && (
        <div className="borrow-card-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowFeedback(!showFeedback)}
            style={{ flex: 1 }}
          >
            {showFeedback ? '取消' : '📝 提交归还反馈'}
          </button>
        </div>
      )}

      {showFeedback && record.status !== 'returned' && (
        <div className="feedback-form">
          <div className="form-group">
            <label className="form-label">工具使用状态</label>
            <div className="duration-group" style={{ marginBottom: 0 }}>
              {conditionOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`duration-option ${feedback.condition === opt.value ? 'selected' : ''}`}
                  onClick={() => setFeedback({ ...feedback, condition: opt.value })}
                  style={
                    feedback.condition === opt.value
                      ? { background: opt.color, color: '#fff', borderColor: opt.color }
                      : {}
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">简短评价（可选）</label>
            <textarea
              className="form-textarea"
              placeholder="描述使用情况，最多100字..."
              value={feedback.comment}
              onChange={(e) =>
                setFeedback({ ...feedback, comment: e.target.value.slice(0, 100) })
              }
              maxLength={100}
            />
            <div className="char-count">{feedback.comment.length}/100</div>
          </div>

          {error && (
            <div
              style={{
                padding: 10,
                background: '#ffebee',
                borderRadius: 6,
                color: '#c62828',
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              ❌ {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleSubmitFeedback}
            disabled={submitting}
            style={{ width: '100%' }}
          >
            {submitting ? '提交中...' : '确认归还并提交反馈'}
          </button>
        </div>
      )}
    </div>
  );
}

function MyBorrows() {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  const loadRecords = useCallback(() => {
    fetch(`/api/borrows?userId=${CURRENT_USER.id}`)
      .then((res) => res.json())
      .then((data: BorrowRecord[]) => {
        setRecords(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleReportSuccess = useCallback(() => {
    setSuccessMsg('✅ 反馈提交成功！');
    setTimeout(() => setSuccessMsg(''), 2500);
    loadRecords();
  }, [loadRecords]);

  return (
    <div>
      <h1 className="page-title">📋 我的借用记录</h1>

      {successMsg && <div className="success-message">{successMsg}</div>}

      {loading ? (
        <div className="loading">正在加载借用记录...</div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">暂无借用记录，快去工具大厅看看吧！</div>
        </div>
      ) : (
        <div className="borrows-list">
          {records.map((record) => (
            <BorrowCard
              key={record.id}
              record={record}
              onReportSuccess={handleReportSuccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyBorrows;
