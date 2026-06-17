import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { Report, ReportsListResponse, ReportContent } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import ReportCard from '../components/ReportCard';
import Skeleton, { LoadingDots } from '../components/Skeleton';

const MAX_CHARS = 500;
const BLOCKER_TYPES = ['无', '沟通协调', '资源缺失', '需求不明确', '技术难题', '其他'];

const getBgColor = (len: number) => {
  if (len <= 100) return '#e3f2fd';
  if (len <= 300) return '#e8f5e9';
  return '#fff8e1';
};

const CharTextarea: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => {
  const len = value.length;
  const isOver = len > MAX_CHARS;

  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: '#424242',
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{
            width: '100%',
            padding: '14px 16px 28px 16px',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            fontSize: 14,
            resize: 'vertical',
            minHeight: 100,
            lineHeight: 1.6,
            background: getBgColor(len),
            transition: 'all 0.2s',
            boxSizing: 'border-box',
            color: isOver ? '#c62828' : '#212121',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#3949ab';
            (e.currentTarget as HTMLTextAreaElement).style.boxShadow =
              '0 0 0 3px rgba(57,73,171,0.1)';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#e0e0e0';
            (e.currentTarget as HTMLTextAreaElement).style.boxShadow = 'none';
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 12,
            fontSize: 11,
            color: isOver ? '#c62828' : '#757575',
            fontWeight: 500,
          }}
        >
          {len}/{MAX_CHARS}
        </div>
      </div>
    </div>
  );
};

const MyReports: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  const [formType, setFormType] = useState<'daily' | 'weekly'>('daily');
  const [formContent, setFormContent] = useState<ReportContent>({
    done: '',
    plan: '',
    blocker: '',
  });
  const [blockerType, setBlockerType] = useState('无');
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (!user) return;
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = (await axiosClient.get('/reports', {
          params: { userId: user.id, page: pageNum, pageSize: 20 },
        })) as unknown as ReportsListResponse;

        if (append) {
          setReports((prev) => [...prev, ...res.data]);
        } else {
          setReports(res.data);
        }
        setHasMore(res.hasMore);
        setPage(pageNum);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchReports(1);
  }, [fetchReports]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchReports(page + 1, true);
        }
      },
      { rootMargin: '300px', threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchReports]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (formContent.done.length > MAX_CHARS || formContent.plan.length > MAX_CHARS || formContent.blocker.length > MAX_CHARS) {
      return;
    }

    setSubmitting(true);
    try {
      const res = (await axiosClient.post('/reports', {
        userId: user.id,
        type: formType,
        content: formContent,
        blockerType,
      })) as unknown as { success: boolean; data: Report };

      if (res.success) {
        setReports((prev) => [res.data, ...prev]);
        setFormContent({ done: '', plan: '', blocker: '' });
        setBlockerType('无');

        setTimeout(() => {
          addNotification(
            `${user.name}刚刚提交了${formType === 'daily' ? '今日汇报' : '本周汇报'}`,
            user.name
          );
        }, 10000);
      }
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReport = (updated: Report) => {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  return (
    <div className="page-enter" style={{ padding: 32 }} ref={scrollRef}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#212121', marginBottom: 4 }}>
          我的汇报
        </h1>
        <p style={{ fontSize: 14, color: '#757575' }}>提交工作汇报，查看历史记录</p>
      </div>

      <div
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          maxWidth: 720,
          margin: '0 auto 40px auto',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#212121', marginBottom: 24 }}>
          提交新的汇报
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => setFormType('daily')}
              style={{
                flex: 1,
                padding: '12px 0',
                background: formType === 'daily' ? '#3949ab' : '#f5f5f5',
                color: formType === 'daily' ? '#fff' : '#424242',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.15s',
                border: formType === 'daily' ? 'none' : '2px solid transparent',
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
              onMouseEnter={(e) => {
                if (formType !== 'daily') {
                  (e.currentTarget as HTMLButtonElement).style.background = '#eeeeee';
                }
              }}
              onMouseLeave={(e) => {
                if (formType !== 'daily') {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
                }
              }}
            >
              📋 今日汇报（晨会）
            </button>
            <button
              type="button"
              onClick={() => setFormType('weekly')}
              style={{
                flex: 1,
                padding: '12px 0',
                background: formType === 'weekly' ? '#7b1fa2' : '#f5f5f5',
                color: formType === 'weekly' ? '#fff' : '#424242',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
              onMouseEnter={(e) => {
                if (formType !== 'weekly') {
                  (e.currentTarget as HTMLButtonElement).style.background = '#eeeeee';
                }
              }}
              onMouseLeave={(e) => {
                if (formType !== 'weekly') {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
                }
              }}
            >
              📊 本周汇报（周报）
            </button>
          </div>

          <CharTextarea
            label={formType === 'daily' ? '今日完成' : '本周完成'}
            value={formContent.done}
            onChange={(v) => setFormContent((prev) => ({ ...prev, done: v }))}
            placeholder="请输入完成的工作内容..."
          />

          <CharTextarea
            label={formType === 'daily' ? '明日计划' : '下周计划'}
            value={formContent.plan}
            onChange={(v) => setFormContent((prev) => ({ ...prev, plan: v }))}
            placeholder="请输入计划的工作内容..."
          />

          <CharTextarea
            label="遇到的阻碍"
            value={formContent.blocker}
            onChange={(v) => setFormContent((prev) => ({ ...prev, blocker: v }))}
            placeholder="请输入遇到的问题或阻碍，如无可填写「暂无」..."
          />

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#424242',
                marginBottom: 10,
              }}
            >
              阻碍类型
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {BLOCKER_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBlockerType(t)}
                  style={{
                    padding: '6px 14px',
                    background: blockerType === t ? '#3949ab' : '#f5f5f5',
                    color: blockerType === t ? '#fff' : '#424242',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (blockerType !== t) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#eeeeee';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (blockerType !== t) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
                    }
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px 0',
              background: formType === 'daily' ? '#3949ab' : '#7b1fa2',
              color: '#ffffff',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              transition: 'all 0.15s',
              opacity: submitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.9)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'none';
            }}
            onMouseDown={(e) => {
              if (!submitting) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
              }
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            {submitting ? '提交中...' : '📤 提交汇报'}
          </button>
        </form>
      </div>

      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#212121',
            marginBottom: 20,
          }}
        >
          历史汇报 ({reports.length})
        </h3>

        {loading ? (
          <div>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              background: '#fff',
              borderRadius: 12,
              color: '#757575',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <div style={{ fontSize: 15 }}>暂无汇报记录，快来提交第一条吧！</div>
          </div>
        ) : (
          <div>
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onUpdate={handleUpdateReport}
              />
            ))}
            {loadingMore && <LoadingDots />}
            <div ref={observerRef} style={{ height: 20 }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReports;
