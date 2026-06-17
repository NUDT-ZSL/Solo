import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axiosClient from '../api/axiosClient';
import { Report, ReportsListResponse } from '../types';
import ReportCard from '../components/ReportCard';
import Skeleton, { LoadingDots } from '../components/Skeleton';
import DateRangeFilter from '../components/DateRangeFilter';
import { format, subDays } from 'date-fns';

const TeamReports: React.FC = () => {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = React.useRef<HTMLDivElement>(null);

  const fetchReports = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params: Record<string, any> = {
          startDate,
          endDate,
          page: pageNum,
          pageSize: 20,
        };
        if (selectedUserId !== 'all') {
          params.userId = selectedUserId;
        }
        const res = (await axiosClient.get('/reports', {
          params,
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
    [startDate, endDate, selectedUserId]
  );

  useEffect(() => {
    setPage(1);
    fetchReports(1);
  }, [startDate, endDate, selectedUserId, fetchReports]);

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

  const handleDateChange = (s: string, e: string) => {
    setStartDate(s);
    setEndDate(e);
  };

  const handleUpdateReport = (updated: Report) => {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const members = useMemo(() => {
    const unique = new Map<string, string>();
    reports.forEach((r) => {
      if (r.user) {
        unique.set(r.user.id, r.user.name);
      }
    });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [reports]);

  const groupedReports = useMemo(() => {
    if (selectedUserId !== 'all') {
      return { [selectedUserId]: reports };
    }
    const groups: Record<string, Report[]> = {};
    reports.forEach((r) => {
      const key = r.userId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [reports, selectedUserId]);

  const getMemberInfo = (userId: string, group: Report[]) => {
    const first = group.find((r) => r.user);
    return first?.user;
  };

  return (
    <div className="page-enter" style={{ padding: 32 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#212121', marginBottom: 4 }}>
          团队汇报
        </h1>
        <p style={{ fontSize: 14, color: '#757575' }}>查看全部团队成员的工作汇报</p>
      </div>

      <DateRangeFilter startDate={startDate} endDate={endDate} onChange={handleDateChange} />

      {members.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 14, color: '#757575', fontWeight: 500 }}>成员筛选：</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedUserId('all')}
              style={{
                padding: '7px 16px',
                background: selectedUserId === 'all' ? '#3949ab' : '#ffffff',
                color: selectedUserId === 'all' ? '#ffffff' : '#424242',
                border: '1px solid ' + (selectedUserId === 'all' ? '#3949ab' : '#e0e0e0'),
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (selectedUserId !== 'all') {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedUserId !== 'all') {
                  (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                }
              }}
            >
              全部成员
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedUserId(m.id)}
                style={{
                  padding: '7px 16px',
                  background: selectedUserId === m.id ? '#3949ab' : '#ffffff',
                  color: selectedUserId === m.id ? '#ffffff' : '#424242',
                  border: '1px solid ' + (selectedUserId === m.id ? '#3949ab' : '#e0e0e0'),
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (selectedUserId !== m.id) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedUserId !== m.id) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                  }
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
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
            maxWidth: 720,
            margin: '0 auto',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 15 }}>所选日期范围内暂无汇报记录</div>
        </div>
      ) : (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {Object.entries(groupedReports).map(([userId, group]) => {
            const memberInfo = getMemberInfo(userId, group);
            return (
              <div key={userId} style={{ marginBottom: 32 }}>
                {selectedUserId === 'all' && memberInfo && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 16,
                      padding: '12px 16px',
                      background: '#fff',
                      borderRadius: 8,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <img
                      src={memberInfo.avatarUrl}
                      alt={memberInfo.name}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: '2px solid #e0e0e0',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#212121' }}>
                        {memberInfo.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#757575' }}>
                        {memberInfo.role === 'manager' ? '管理者' : '团队成员'}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '6px 14px',
                        background: '#e8eaf6',
                        color: '#3949ab',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {group.length} 条
                    </div>
                  </div>
                )}
                {group.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onUpdate={handleUpdateReport}
                  />
                ))}
              </div>
            );
          })}
          {loadingMore && <LoadingDots />}
          <div ref={observerRef} style={{ height: 20 }} />
        </div>
      )}
    </div>
  );
};

export default TeamReports;
