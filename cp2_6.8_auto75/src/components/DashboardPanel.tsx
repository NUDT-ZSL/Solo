import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { useHotkeys } from 'react-hotkeys-hook';
import type { StudentInfo, EditEvent, CodeCheckResult, ErrorTrendPoint } from '../types';

const WINDOW_MS = 5000;
const MAX_WINDOWS = 20;
const MAX_HISTORY_MS = 120000;

interface HeatmapCellData {
  studentIndex: number;
  windowIndex: number;
  studentId: string;
  nickname: string;
  windowStart: number;
  avgFrequency: number;
}

const frequencyToColor = (freq: number): string => {
  const clamped = Math.min(Math.max(freq, 0), 5) / 5;
  const r = Math.round(clamped * 255);
  const b = Math.round((1 - clamped) * 205);
  const g = Math.round((1 - clamped) * 100 + clamped * 50);
  return `rgb(${r}, ${g}, ${b})`;
};

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const DashboardPanel: React.FC = () => {
  const {
    roomCode,
    roomName,
    nickname,
    roomState,
    editEvents,
    codeCheckResults,
    selectedStudentId,
    studentDetail,
    requestStudentDetail,
    broadcastStudentCode,
    setSelectedStudentId,
    disconnect,
  } = useApp();

  const [now, setNow] = useState<number>(Date.now());
  const [hoverCell, setHoverCell] = useState<HeatmapCellData | null>(null);
  const [highlightedCell, setHighlightedCell] = useState<{ studentId: string; ts: number } | null>(null);
  const highlightAnimRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useHotkeys('ctrl+c, meta+c', () => {
    if (selectedStudentId) {
      broadcastStudentCode(selectedStudentId);
    }
  }, [selectedStudentId, broadcastStudentCode]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      requestStudentDetail(selectedStudentId);
    }
  }, [selectedStudentId, requestStudentDetail]);

  const students = useMemo<StudentInfo[]>(
    () => roomState?.students ?? [],
    [roomState]
  );

  const heatmapData = useMemo<HeatmapCellData[][]>(() => {
    const nowTs = now;
    const windowsStart = nowTs - (MAX_WINDOWS - 1) * WINDOW_MS;

    const grid: HeatmapCellData[][] = [];

    for (let wi = 0; wi < MAX_WINDOWS; wi++) {
      const row: HeatmapCellData[] = [];
      const windowStart = windowsStart + wi * WINDOW_MS;
      const windowEnd = windowStart + WINDOW_MS;

      for (let si = 0; si < Math.max(students.length, 10); si++) {
        const student = students[si];
        if (!student) {
          row.push({
            studentIndex: si,
            windowIndex: wi,
            studentId: '',
            nickname: '',
            windowStart,
            avgFrequency: -1,
          });
          continue;
        }

        const eventsInWindow = editEvents.filter(
          (e) =>
            e.studentId === student.id &&
            e.timestamp >= windowStart &&
            e.timestamp < windowEnd
        );

        const avgFreq =
          eventsInWindow.length > 0
            ? eventsInWindow.reduce((sum, e) => sum + e.frequency, 0) / eventsInWindow.length
            : 0;

        row.push({
          studentIndex: si,
          windowIndex: wi,
          studentId: student.id,
          nickname: student.nickname,
          windowStart,
          avgFrequency: avgFreq,
        });
      }
      grid.push(row);
    }

    return grid;
  }, [now, students, editEvents]);

  const errorTrendData = useMemo<ErrorTrendPoint[]>(() => {
    const cutoff = now - MAX_HISTORY_MS;
    const buckets = new Map<number, number>();
    const bucketSize = 10000;

    for (let t = Math.floor(cutoff / bucketSize) * bucketSize; t <= now; t += bucketSize) {
      buckets.set(t, 0);
    }

    codeCheckResults.forEach((r: CodeCheckResult) => {
      if (r.hasError && r.timestamp >= cutoff) {
        const bucket = Math.floor(r.timestamp / bucketSize) * bucketSize;
        buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
      }
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ts, errors]) => ({
        time: formatTime(ts),
        timestamp: ts,
        errors,
      }));
  }, [now, codeCheckResults]);

  const handleCellClick = (cell: HeatmapCellData) => {
    if (!cell.studentId) return;
    setSelectedStudentId(cell.studentId);
    setHighlightedCell({ studentId: cell.studentId, ts: Date.now() });
    if (highlightAnimRef.current) clearTimeout(highlightAnimRef.current);
    highlightAnimRef.current = setTimeout(() => setHighlightedCell(null), 400);
  };

  const renderRecentSnippets = () => {
    if (!studentDetail || studentDetail.recentSnippets.length === 0) {
      return <div style={styles.emptyText}>暂无代码片段</div>;
    }
    return studentDetail.recentSnippets.slice(0, 10).map((snap, i) => (
      <div key={i} style={styles.snippetItem}>
        <div style={styles.snippetTime}>{formatTime(snap.timestamp)}</div>
        <pre style={styles.snippetCode}>
          {snap.code.split('\n').map((line) => line.slice(0, 50)).join('\n')}
        </pre>
      </div>
    ));
  };

  const renderErrorHistory = () => {
    if (!studentDetail || studentDetail.errorHistory.length === 0) {
      return <div style={styles.emptyText}>暂无错误记录</div>;
    }
    return studentDetail.errorHistory.slice(0, 10).map((err, i) => (
      <div key={i} style={styles.errorItem}>
        <div style={styles.errorHeader}>
          <span style={styles.errorType}>{err.errorType || 'UnknownError'}</span>
          <span style={styles.errorLine}>行 {err.errorLine ?? '-'}</span>
          <span style={styles.errorTime}>{formatTime(err.timestamp)}</span>
        </div>
        <div style={styles.errorMsg}>{err.errorMessage}</div>
      </div>
    ));
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <span style={styles.roomCodeBadge}>房间码: {roomCode}</span>
          <span style={styles.roomName}>{roomName || '加载中...'}</span>
          <span style={styles.teacherBadge}>讲师 · {nickname}</span>
        </div>
        <div style={styles.topBarRight}>
          <span style={styles.studentCount}>
            在线 {students.filter((s) => s.connected).length}/10
          </span>
          <button style={styles.leaveBtn} onClick={disconnect}>
            结束课堂
          </button>
        </div>
      </div>

      <div style={styles.mainArea}>
        <div style={styles.leftPanel}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>全班编辑频率热力图</h3>
              <div style={styles.legend}>
                <span style={styles.legendLabel}>0次/秒</span>
                <div style={styles.legendBar} />
                <span style={styles.legendLabel}>5+次/秒</span>
              </div>
            </div>
            <div style={styles.heatmapWrap}>
              <div style={styles.heatmapHeaderRow}>
                <div style={styles.heatmapCorner} />
                {students.slice(0, 10).map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      ...styles.heatmapColHeader,
                      ...(selectedStudentId === s.id ? styles.colHeaderSelected : {}),
                    }}
                    title={s.nickname}
                  >
                    {s.nickname.slice(0, 4)}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 10 - students.length) }).map((_, i) => (
                  <div key={`empty-${i}`} style={styles.heatmapColHeaderEmpty} />
                ))}
              </div>
              <div style={styles.heatmapBody}>
                <div style={styles.heatmapRowLabels}>
                  {heatmapData.map((row, wi) => (
                    <div key={wi} style={styles.heatmapRowLabel}>
                      {formatTime(row[0]?.windowStart ?? 0)}
                    </div>
                  ))}
                </div>
                <div style={styles.heatmapGrid}>
                  {heatmapData.map((row, wi) => (
                    <div key={wi} style={styles.heatmapRow}>
                      {row.map((cell, si) => {
                        const isHighlighted =
                          highlightedCell?.studentId === cell.studentId;
                        const isSelectedCol = cell.studentId === selectedStudentId;
                        const hasData = cell.avgFrequency >= 0;
                        return (
                          <div
                            key={`${wi}-${si}`}
                            style={{
                              ...styles.heatmapCell,
                              background: hasData ? frequencyToColor(cell.avgFrequency) : '#1a1a1a',
                              opacity: hasData ? 1 : 0.3,
                              ...(isSelectedCol ? styles.cellSelectedCol : {}),
                              ...(isHighlighted ? styles.cellHighlighted : {}),
                            }}
                            onMouseEnter={() => hasData && setHoverCell(cell)}
                            onMouseLeave={() => setHoverCell(null)}
                            onClick={() => handleCellClick(cell)}
                          >
                            {hoverCell === cell && (
                              <div style={styles.cellTooltip}>
                                <div style={styles.tooltipName}>{cell.nickname}</div>
                                <div style={styles.tooltipTime}>{formatTime(cell.windowStart)}</div>
                                <div style={styles.tooltipFreq}>{cell.avgFrequency.toFixed(1)} 次/秒</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>全班编译错误趋势（最近2分钟）</h3>
              <span style={styles.updateHint}>每10秒更新</span>
            </div>
            <div style={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={errorTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" strokeOpacity={0.15} />
                  <XAxis
                    dataKey="time"
                    stroke="#858585"
                    tick={{ fill: '#858585', fontSize: 11 }}
                    tickLine={{ stroke: '#333' }}
                    axisLine={{ stroke: '#333' }}
                  />
                  <YAxis
                    stroke="#858585"
                    tick={{ fill: '#858585', fontSize: 11 }}
                    tickLine={{ stroke: '#333' }}
                    axisLine={{ stroke: '#333' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1E1E1E',
                      border: '1px solid #333',
                      borderRadius: 8,
                      color: '#E0E0E0',
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#858585' }}
                    formatter={(value: number) => [`${value} 个错误`, '错误数']}
                  />
                  <Line
                    type="monotone"
                    dataKey="errors"
                    stroke="#FF6B6B"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#FF6B6B', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#FF6B6B' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>学生列表</h3>
            </div>
            <div style={styles.studentList}>
              {students.length === 0 && (
                <div style={styles.emptyText}>暂无学生加入</div>
              )}
              {students.map((s) => (
                <div
                  key={s.id}
                  style={{
                    ...styles.studentItem,
                    ...(selectedStudentId === s.id ? styles.studentItemSelected : {}),
                  }}
                  onClick={() => setSelectedStudentId(s.id)}
                >
                  <div style={styles.studentAvatar}>
                    {s.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.studentInfo}>
                    <div style={styles.studentName}>{s.nickname}</div>
                    <div style={styles.studentStatus}>
                      <span
                        style={{
                          ...styles.statusDot,
                          background: s.connected ? '#4ECDC4' : '#666',
                        }}
                      />
                      {s.connected ? '在线' : '已断开'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...styles.card, flex: 1, overflow: 'hidden' }}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                {selectedStudent ? `${selectedStudent.nickname} 的代码详情` : '选择学生查看详情'}
              </h3>
              {selectedStudent && (
                <button
                  style={styles.broadcastBtn}
                  onClick={() => broadcastStudentCode(selectedStudent.id)}
                >
                  广播此代码
                </button>
              )}
            </div>

            {selectedStudent && (
              <div style={styles.detailContent}>
                <div style={styles.detailSection}>
                  <div style={styles.sectionTitle}>最近代码片段</div>
                  <div style={styles.snippetList}>{renderRecentSnippets()}</div>
                </div>
                <div style={styles.detailSection}>
                  <div style={styles.sectionTitle}>错误历史</div>
                  <div style={styles.errorList}>{renderErrorHistory()}</div>
                </div>
              </div>
            )}

            {!selectedStudent && (
              <div style={styles.detailPlaceholder}>
                <div style={styles.placeholderIcon}>👆</div>
                <div style={styles.placeholderText}>点击左侧学生列表或热力图单元格查看详情</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#121212',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    background: '#1E1E1E',
    borderBottom: '1px solid #333',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: 12,
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  roomCodeBadge: {
    background: '#F5A623',
    color: '#121212',
    padding: '4px 12px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 1,
  },
  roomName: {
    color: '#E0E0E0',
    fontSize: 14,
  },
  teacherBadge: {
    background: 'rgba(78, 205, 196, 0.15)',
    color: '#4ECDC4',
    padding: '3px 10px',
    borderRadius: 4,
    fontSize: 12,
  },
  studentCount: {
    color: '#858585',
    fontSize: 13,
  },
  leaveBtn: {
    padding: '6px 14px',
    background: 'rgba(255, 107, 107, 0.15)',
    color: '#FF6B6B',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    gap: 16,
    padding: 16,
    overflow: 'hidden',
  },
  leftPanel: {
    width: '60%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  },
  rightPanel: {
    width: '40%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  },
  card: {
    background: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexShrink: 0,
  },
  cardTitle: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: 600,
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  legendLabel: {
    color: '#858585',
    fontSize: 11,
  },
  legendBar: {
    width: 100,
    height: 8,
    borderRadius: 4,
    background: 'linear-gradient(to right, rgb(0, 100, 205), rgb(255, 50, 50))',
  },
  heatmapWrap: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  },
  heatmapHeaderRow: {
    display: 'flex',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    background: '#1E1E1E',
    zIndex: 2,
    paddingBottom: 4,
  },
  heatmapCorner: {
    width: 56,
    flexShrink: 0,
  },
  heatmapColHeader: {
    flex: 1,
    minWidth: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#858585',
    padding: '4px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  colHeaderSelected: {
    color: '#4ECDC4',
    fontWeight: 600,
  },
  heatmapColHeaderEmpty: {
    flex: 1,
    minWidth: 30,
  },
  heatmapBody: {
    display: 'flex',
    flex: 1,
  },
  heatmapRowLabels: {
    width: 56,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  heatmapRowLabel: {
    height: 24,
    fontSize: 9,
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 6,
    whiteSpace: 'nowrap',
  },
  heatmapGrid: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  heatmapRow: {
    display: 'flex',
    height: 24,
    gap: 2,
  },
  heatmapCell: {
    flex: 1,
    minWidth: 20,
    borderRadius: 2,
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform 0.15s, box-shadow 0.15s, border 0.15s',
    border: '1px solid transparent',
  },
  cellSelectedCol: {
    border: '1px solid rgba(255,255,255,0.25)',
  },
  cellHighlighted: {
    animation: 'highlight-pulse 400ms ease-out',
    border: '2px solid #FFFFFF',
    transform: 'scale(1.1)',
    zIndex: 3,
  },
  cellTooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#000',
    color: '#fff',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 11,
    whiteSpace: 'nowrap',
    zIndex: 10,
    pointerEvents: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    marginBottom: 4,
  },
  tooltipName: {
    fontWeight: 600,
    marginBottom: 2,
  },
  tooltipTime: {
    color: '#aaa',
    fontSize: 10,
  },
  tooltipFreq: {
    color: '#4ECDC4',
    marginTop: 2,
    fontWeight: 500,
  },
  chartWrap: {
    flex: 1,
    minHeight: 180,
  },
  updateHint: {
    color: '#666',
    fontSize: 11,
  },
  studentList: {
    maxHeight: 200,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  studentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  studentItemSelected: {
    background: 'rgba(78, 205, 196, 0.1)',
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(78, 205, 196, 0.2)',
    color: '#4ECDC4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 13,
    flexShrink: 0,
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  studentStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: '#858585',
    fontSize: 11,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
  emptyText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    padding: 20,
  },
  detailContent: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionTitle: {
    color: '#858585',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  snippetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  snippetItem: {
    background: '#121212',
    borderRadius: 6,
    padding: 8,
  },
  snippetTime: {
    color: '#666',
    fontSize: 10,
    marginBottom: 4,
  },
  snippetCode: {
    margin: 0,
    fontFamily: "'Fira Code', monospace",
    fontSize: 11,
    lineHeight: 1.4,
    color: '#B0B0B0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  errorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  errorItem: {
    background: 'rgba(255, 107, 107, 0.08)',
    borderRadius: 6,
    padding: '8px 10px',
    border: '1px solid rgba(255, 107, 107, 0.2)',
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  errorType: {
    color: '#FF6B6B',
    fontSize: 11,
    fontWeight: 600,
  },
  errorLine: {
    color: '#858585',
    fontSize: 10,
  },
  errorTime: {
    color: '#666',
    fontSize: 10,
    marginLeft: 'auto',
  },
  errorMsg: {
    color: '#B0B0B0',
    fontSize: 11,
    lineHeight: 1.4,
  },
  broadcastBtn: {
    padding: '5px 12px',
    background: '#4ECDC4',
    color: '#121212',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  detailPlaceholder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  placeholderIcon: {
    fontSize: 32,
    opacity: 0.4,
  },
  placeholderText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
  },
};

export default DashboardPanel;
