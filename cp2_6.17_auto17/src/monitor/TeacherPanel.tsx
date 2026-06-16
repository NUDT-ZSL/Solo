import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWebSocket, User } from '../collaboration/useWebSocket';
import type { StudentMetrics, CursorPosition } from '../types';

interface TeacherPanelProps {
  roomId?: string;
  userId?: string;
  username?: string;
}

const COLORS = [
  '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#6366f1',
];

function getColorForIndex(index: number): string {
  return COLORS[index % COLORS.length];
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getStoredUser(): { userId: string; username: string } | null {
  try {
    const raw = localStorage.getItem('collab_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { userId: parsed.userId, username: parsed.username };
    }
  } catch (e) {
    void e;
  }
  try {
    const uid = localStorage.getItem('userId');
    const uname = localStorage.getItem('username');
    if (uid && uname) {
      return { userId: uid, username: uname };
    }
  } catch (e) {
    void e;
  }
  return null;
}

function pickColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

export default function TeacherPanel(props: TeacherPanelProps) {
  const params = useParams<{ roomId: string }>();
  const roomId = props.roomId || params.roomId || '';
  const storedUser = getStoredUser();
  const userId = props.userId || storedUser?.userId || 'teacher-' + Date.now();
  const username = props.username || storedUser?.username || 'Teacher';

  const {
    users,
    studentMetrics,
    isConnected,
    joinRoom,
    leaveRoom,
  } = useWebSocket();

  const teacherUser: User = {
    id: userId,
    username,
    role: 'teacher',
    color: pickColor(userId),
  };

  useEffect(() => {
    joinRoom(roomId, teacherUser);
    return () => {
      leaveRoom(roomId, userId);
    };
  }, [roomId, userId, teacherUser, joinRoom, leaveRoom]);

  const processedMetrics: StudentMetrics[] = studentMetrics.map((m: any) => ({
    userId: m.userId,
    username: m.username,
    connectedDuration: m.connectedDuration ?? Math.floor((m.activeTime || 0) / 1000),
    operationCount: m.operationCount ?? m.operations ?? 0,
    cursorPosition: m.cursorPosition ?? { row: 0, column: 0, position: 0 } as CursorPosition,
    activityHistory: m.activityHistory ?? new Array(5).fill(0).map((_, i) =>
      Math.floor(((m.operations || m.operationCount || 0) / 5) * (1 + Math.random() * 0.5 - 0.25)) + i
    ),
  }));

  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const drawChart = useCallback(() => {
    const canvas = chartCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = 280;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const mergedData = new Array(5).fill(0);
    processedMetrics.forEach((m) => {
      const history = m.activityHistory || [];
      for (let i = 0; i < 5; i++) {
        mergedData[i] += history[i] || 0;
      }
    });

    const maxValue = Math.max(...mergedData, 10);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      const value = Math.round(maxValue - (maxValue / gridLines) * i);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), padding.left - 10, y);
    }

    const barWidth = 20;
    const barGap = 8;
    const totalBarsWidth = 5 * barWidth + 4 * barGap;
    const startX = padding.left + (chartWidth - totalBarsWidth) / 2;

    for (let i = 0; i < 5; i++) {
      const value = mergedData[i];
      const barHeight = (value / maxValue) * chartHeight;
      const x = startX + i * (barWidth + barGap);
      const y = padding.top + chartHeight - barHeight;

      const t = barHeight > 0 ? Math.min(value / maxValue, 1) : 0;
      const gradient = ctx.createLinearGradient(0, y + barHeight, 0, y);
      gradient.addColorStop(0, lerpColor('#3b82f6', '#06b6d4', 0));
      gradient.addColorStop(1, lerpColor('#3b82f6', '#06b6d4', t));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = Math.min(4, barHeight / 2);
      if (radius > 0) {
        ctx.moveTo(x, y + barHeight);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, y + barHeight);
        ctx.closePath();
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();

      if (value > 0) {
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(value.toString(), x + barWidth / 2, y - 6);
      }

      const minutesAgo = 4 - i;
      const label = minutesAgo === 0 ? '现在' : `${minutesAgo}分钟前`;
      ctx.fillStyle = '#64748b';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x + barWidth / 2, padding.top + chartHeight + 12);
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('操作次数 (次)', 4, 8);
  }, [processedMetrics]);

  useEffect(() => {
    drawChart();
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  const onlineStudentsCount = processedMetrics.length;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to={`/editor/${encodeURIComponent(roomId)}`} style={styles.backLink}>
            <span style={styles.backIcon}>←</span>
            <span style={styles.backText}>返回编辑器</span>
          </Link>
          <h1 style={styles.pageTitle}>
            <span style={styles.titleIcon}>📊</span>
            教师监控面板
          </h1>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.roomBadge}>
            <span style={styles.roomBadgeIcon}>🏠</span>
            <span style={styles.roomBadgeLabel}>房间号:</span>
            <span style={styles.roomBadgeValue}>{roomId}</span>
          </div>
          <div style={styles.onlineBadge}>
            <span style={{
              ...styles.statusDot,
              background: isConnected ? 'var(--accent-success)' : 'var(--accent-warning)',
            }} />
            <span style={styles.onlineCount}>
              在线 <strong style={styles.onlineCountNum}>{onlineStudentsCount}</strong> 人
            </span>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.onlineUsersSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>在线用户列表</h2>
            <span style={styles.studentCount}>{users.length} 人在线</span>
          </div>
          <div style={styles.onlineUsersList}>
            {users.map((user, index) => {
              const userColor = getColorForIndex(index);
              return (
                <div key={user.id} style={styles.userListItem}>
                  <div style={{
                    ...styles.userAvatar,
                    background: user.color || userColor,
                  }}>
                    <span style={styles.userAvatarText}>
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.userInfo}>
                    <span style={styles.userName}>{user.username}</span>
                    <span style={styles.userId}>ID: {user.id.slice(0, 8)}...</span>
                  </div>
                  <div style={{
                    ...styles.userRoleBadge,
                    background: user.role === 'teacher'
                      ? 'rgba(168, 85, 247, 0.15)'
                      : 'rgba(59, 130, 246, 0.15)',
                    borderColor: user.role === 'teacher'
                      ? 'rgba(168, 85, 247, 0.3)'
                      : 'rgba(59, 130, 246, 0.3)',
                    color: user.role === 'teacher' ? '#a855f7' : '#3b82f6',
                  }}>
                    {user.role === 'teacher' ? '教师' : '学生'}
                  </div>
                  <div style={styles.userStatusIndicator}>
                    <span style={styles.onlineDotSmall} />
                    <span style={styles.userStatusText}>在线</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.chartSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>编辑活跃度 (近5分钟)</h2>
          </div>
          <div ref={containerRef} style={styles.chartContainer}>
            <canvas ref={chartCanvasRef} style={styles.canvas} />
          </div>
        </div>

        <div style={styles.studentsSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>学生列表</h2>
            <span style={styles.studentCount}>{onlineStudentsCount} 名学生</span>
          </div>

          {onlineStudentsCount === 0 ? (
            <div style={styles.emptyStudents}>
              <span style={styles.emptyStudentsIcon}>👨‍🎓</span>
              <span style={styles.emptyStudentsTitle}>暂无学生在线</span>
              <span style={styles.emptyStudentsHint}>等待学生加入房间...</span>
            </div>
          ) : (
            <div style={styles.studentGrid}>
              {processedMetrics.map((metric, index) => {
                const userColor = getColorForIndex(index);
                return (
                  <div key={metric.userId} style={styles.studentCard}>
                    <div style={{
                      ...styles.colorBar,
                      background: userColor,
                    }} />
                    <div style={styles.cardContent}>
                      <div style={styles.cardHeader}>
                        <div style={{
                          ...styles.avatar,
                          background: userColor,
                        }}>
                          <span style={styles.avatarText}>
                            {metric.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div style={styles.cardTitleRow}>
                          <span style={styles.studentName}>{metric.username}</span>
                          <div style={styles.onlineIndicator}>
                            <span style={styles.onlineDotSmall} />
                            <span style={styles.onlineLabel}>在线</span>
                          </div>
                        </div>
                      </div>

                      <div style={styles.statsGrid}>
                        <div style={styles.statItem}>
                          <span style={styles.statIcon}>⏱️</span>
                          <div style={styles.statContent}>
                            <span style={styles.statLabel}>连接时长</span>
                            <span style={styles.statValue}>
                              {formatDuration(metric.connectedDuration)}
                            </span>
                          </div>
                        </div>

                        <div style={styles.statItem}>
                          <span style={styles.statIcon}>✏️</span>
                          <div style={styles.statContent}>
                            <span style={styles.statLabel}>操作次数</span>
                            <span style={styles.statValue}>
                              {metric.operationCount.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div style={styles.statItem}>
                          <span style={styles.statIcon}>📍</span>
                          <div style={styles.statContent}>
                            <span style={styles.statLabel}>光标位置</span>
                            <span style={styles.statValue}>
                              行{metric.cursorPosition?.row ?? 0}
                              :
                              列{metric.cursorPosition?.column ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
  },
  onlineUsersSection: {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
  },
  onlineUsersList: {
    padding: '12px 24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  userListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    transition: 'background-color 0.15s',
  },
  userAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userAvatarText: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userId: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
  },
  userRoleBadge: {
    padding: '3px 10px',
    borderRadius: '999px',
    border: '1px solid',
    fontSize: '11px',
    fontWeight: 600,
    flexShrink: 0,
  },
  userStatusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexShrink: 0,
  },
  userStatusText: {
    fontSize: '11px',
    color: 'var(--accent-success)',
    fontWeight: 500,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
  },
  backIcon: {
    fontSize: '14px',
    color: 'var(--accent-primary)',
  },
  backText: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: 0,
  },
  titleIcon: {
    fontSize: '24px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  roomBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
  },
  roomBadgeIcon: {
    fontSize: '14px',
  },
  roomBadgeLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  roomBadgeValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
  },
  onlineBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 'var(--radius-md)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  onlineCount: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  onlineCountNum: {
    color: 'var(--accent-success)',
    fontSize: '15px',
  },
  content: {
    flex: 1,
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  chartSection: {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-color)',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  studentCount: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  chartContainer: {
    padding: '20px 24px',
    width: '100%',
  },
  canvas: {
    display: 'block',
    width: '100%',
  },
  studentsSection: {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
  },
  emptyStudents: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    gap: '12px',
  },
  emptyStudentsIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  emptyStudentsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  emptyStudentsHint: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  studentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
    padding: '20px 24px 24px',
  },
  studentCard: {
    background: 'var(--bg-primary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
  },
  colorBar: {
    height: '4px',
    width: '100%',
  },
  cardContent: {
    padding: '16px 18px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
  cardTitleRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  onlineIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  onlineDotSmall: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent-success)',
  },
  onlineLabel: {
    fontSize: '11px',
    color: 'var(--accent-success)',
    fontWeight: 500,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-sm)',
  },
  statIcon: {
    fontSize: '16px',
    flexShrink: 0,
    marginTop: '2px',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  statLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  statValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
  },
};
