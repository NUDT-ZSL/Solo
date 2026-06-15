import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { meetingApi } from '../api';
import type { Meeting } from '../types';

interface DashboardProps {
  onMeetingClick: (meetingId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onMeetingClick }) => {
  const { currentUser } = useApp();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadMeetings();
    }
  }, [currentUser]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const data = await meetingApi.getMeetings(currentUser!.id);
      setMeetings(data);
    } catch (error) {
      console.error('获取会议列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusText = (status: string) => {
    return status === 'in_progress' ? '进行中' : '已结束';
  };

  const getStatusColor = (status: string) => {
    return status === 'in_progress' ? '#22c55e' : '#9ca3af';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>我的选题会</h1>
        <p style={styles.subtitle}>共 {meetings.length} 个会议</p>
      </div>
      <div style={styles.grid}>
        {meetings.map((meeting) => (
        <div
          key={meeting.id}
          style={styles.card}
          className="meeting-card"
          onClick={() => onMeetingClick(meeting.id)}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={styles.cardHeader}>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor: getStatusColor(meeting.status),
              }}
            >
              {getStatusText(meeting.status)}
            </span>
            {meeting.unreadComments > 0 && (
              <div style={styles.badge}>{meeting.unreadComments}</div>
            )}
          </div>
          <h3 style={styles.cardTitle}>{meeting.title}</h3>
          <p style={styles.cardDate}>{formatDate(meeting.date)}</p>
          <div style={styles.cardFooter}>
            <span style={styles.participantsText}>
              {meeting.participants.length} 位参与者
            </span>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
  },
  loadingText: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  card: {
    width: '100%',
    height: '200px',
    backgroundColor: '#ffffff',
    border: '0.5px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#ffffff',
  },
  badge: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    minWidth: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#f43f5e',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    lineHeight: 1.4,
    marginTop: '16px',
    flex: 1,
  },
  cardDate: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '8px',
  },
  cardFooter: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f1f5f9',
  },
  participantsText: {
    fontSize: '13px',
    color: '#94a3b8',
  },
};

export default Dashboard;
