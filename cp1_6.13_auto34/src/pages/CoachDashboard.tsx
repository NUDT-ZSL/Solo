import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { Course } from '../utils/api';
import { api } from '../utils/api';

function getWeekDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getWeekdayShort(d: Date, idx: number): string {
  if (idx === 0) return '今';
  if (idx === 1) return '明';
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
}

function WeeklyBarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 140,
        padding: '0 24px 12px',
        gap: 8
      }}
    >
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100%',
            justifyContent: 'flex-end'
          }}
        >
          <div
            className="bar-chart-label"
          >
            {v}
          </div>
          <div
            className="bar-chart-bar"
            style={{
              height: `${(v / max) * 80}%`,
              minHeight: v > 0 ? 8 : 2
            }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            {labels[i]}
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckInQRModal({
  course,
  courseTypeName,
  onClose
}: {
  course: Course;
  courseTypeName: string;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setTimeout(onClose, 200);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onClose]);

  const qrSize = 200;
  const qrCells = 21;

  const qrPattern = useMemo(() => {
    const cells: boolean[][] = [];
    const seed = course._id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = 0; i < qrCells; i++) {
      cells[i] = [];
      for (let j = 0; j < qrCells; j++) {
        cells[i][j] = (Math.sin(seed * (i + 1) * (j + 1)) + 1) > 1.1;
      }
    }
    for (const [bx, by] of [[0, 0], [0, qrCells - 7], [qrCells - 7, 0]]) {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          const edge = i === 0 || i === 6 || j === 0 || j === 6;
          const inner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
          cells[bx + i][by + j] = edge || inner;
        }
      }
    }
    return cells;
  }, [course._id]);

  const cellSize = qrSize / qrCells;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 20,
          padding: 32,
          width: '100%',
          maxWidth: 380,
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
        }}
      >
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, color: '#1f2937' }}>签到二维码</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
          {courseTypeName} · {course.startTime}-{course.endTime}
        </p>
        <div
          style={{
            width: qrSize + 32,
            height: qrSize + 32,
            margin: '0 auto 20px',
            padding: 16,
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: 12,
            position: 'relative'
          }}
        >
          <svg width={qrSize} height={qrSize}>
            {qrPattern.map((row, i) =>
              row.map((filled, j) =>
                filled ? (
                  <rect
                    key={`${i}-${j}`}
                    x={j * cellSize}
                    y={i * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill="#1f2937"
                  />
                ) : null
              )
            )}
          </svg>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 40,
              height: 40,
              background: '#1e3a5f',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 18,
              fontWeight: 800,
              border: '3px solid white'
            }}
          >
            F
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 20
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: countdown <= 10 ? '#dc2626' : '#10b981',
              animation: 'pulse 1s infinite'
            }}
          />
          <span style={{ fontSize: 14, color: '#374151' }}>
            二维码将在 <strong style={{ fontSize: 18, color: countdown <= 10 ? '#dc2626' : '#1e3a5f' }}>{countdown}</strong> 秒后失效
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: 12,
            background: '#f3f4f6',
            color: '#374151',
            fontWeight: 700
          }}
        >
          关闭
        </button>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
      </div>
    </div>
  );
}

function CourseRowCard({
  course,
  courseTypeName,
  courseTypeColor,
  dateLabel,
  onCheckIn,
  isCancelled
}: {
  course: Course;
  courseTypeName: string;
  courseTypeColor: string;
  dateLabel: string;
  onCheckIn: () => void;
  isCancelled: boolean;
}) {
  const full = course.bookedCount >= course.capacity;
  const percent = Math.round((course.bookedCount / course.capacity) * 100);

  return (
    <div
      className="coach-course-card"
    >
      <div style={{ width: 6, height: '100%', background: courseTypeColor, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ minWidth: 90 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{dateLabel}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>
            {course.startTime}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>- {course.endTime}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>
            {courseTypeName}
            {isCancelled && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  padding: '2px 8px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: 10,
                  fontWeight: 600
                }}
              >
                已取消
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', maxWidth: 140 }}>
              <div
                style={{
                  height: '100%',
                  width: `${percent}%`,
                  background: full ? '#dc2626' : 'linear-gradient(90deg, #38bdf8, #3b82f6)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <span style={{ fontSize: 13, color: full ? '#dc2626' : '#374151', fontWeight: 700, minWidth: 64 }}>
              {course.bookedCount}/{course.capacity} 人
            </span>
          </div>
        </div>
      </div>
      <div style={{ paddingRight: 16 }}>
        <button
          onClick={onCheckIn}
          disabled={isCancelled}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            background: isCancelled ? '#9ca3af' : 'linear-gradient(135deg, #1e3a5f, #2d6a9f)',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}
        >
          开始签到
        </button>
      </div>
    </div>
  );
}

export default function CoachDashboard() {
  const { currentCoach, courseTypes, refreshCourses, courses } = useApp();
  const [checkInCourse, setCheckInCourse] = useState<Course | null>(null);

  useEffect(() => {
    refreshCourses();
  }, [currentCoach]);

  const weekDates = useMemo(() => getWeekDates(), []);
  const dateKeys = useMemo(() => weekDates.map(formatDateKey), [weekDates]);
  const weekdayLabels = useMemo(() => weekDates.map(getWeekdayShort), [weekDates]);

  const coachCourses = useMemo(() => {
    if (!currentCoach) return [];
    return courses
      .filter((c) => c.coachId === currentCoach._id)
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [courses, currentCoach]);

  const countsPerDay = useMemo(() => {
    const byDate = new Map(dateKeys.map((k) => [k, 0]));
    coachCourses.forEach((c) => {
      if (byDate.has(c.date)) byDate.set(c.date, byDate.get(c.date)! + 1);
    });
    return dateKeys.map((k) => byDate.get(k) || 0);
  }, [coachCourses, dateKeys]);

  const totalCourses = coachCourses.length;
  const activeCourses = coachCourses.filter((c) => c.status === 'active').length;
  const totalBookings = coachCourses.reduce((s, c) => s + c.bookedCount, 0);

  const getCT = (id: string) => courseTypes.find((c) => c._id === id);

  const getDateLabel = (dateStr: string) => {
    const idx = dateKeys.indexOf(dateStr);
    if (idx < 0) return dateStr;
    const d = weekDates[idx];
    const prefix = idx === 0 ? '今天' : idx === 1 ? '明天' : `周${['日','一','二','三','四','五','六'][d.getDay()]}`;
    return `${prefix} ${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div style={{ background: '#f0f4f8', minHeight: 'calc(100vh - 56px)' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)',
          padding: '32px 24px',
          color: 'white'
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>教练排班面板</h1>
          <p style={{ opacity: 0.85, fontSize: 14, marginBottom: 28 }}>查看您的课程安排与签到管理</p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              marginBottom: 28
            }}
          >
            {[
              { label: '本周课程总数', value: totalCourses, icon: '📚', color: 'rgba(255,255,255,0.12)' },
              { label: '进行中课程', value: activeCourses, icon: '✅', color: 'rgba(16,185,129,0.2)' },
              { label: '累计预约人次', value: totalBookings, icon: '👥', color: 'rgba(56,189,248,0.2)' }
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: s.color,
                  padding: 18,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: '16px 8px 8px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ padding: '0 16px 12px', fontSize: 14, opacity: 0.9, fontWeight: 600 }}>
              本周每日课程数量
            </div>
            <WeeklyBarChart data={countsPerDay} labels={weekdayLabels} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f' }}>我的课程（未来7天）</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>共 {coachCourses.length} 节课</div>
        </div>

        {coachCourses.length === 0 ? (
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 64,
              textAlign: 'center',
              color: '#9ca3af'
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#6b7280' }}>暂无课程安排</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {coachCourses.map((course) => {
              const ct = getCT(course.courseTypeId);
              return (
                <CourseRowCard
                  key={course._id}
                  course={course}
                  courseTypeName={ct?.name || '课程'}
                  courseTypeColor={ct?.color || '#9ca3af'}
                  dateLabel={getDateLabel(course.date)}
                  onCheckIn={() => setCheckInCourse(course)}
                  isCancelled={course.status === 'cancelled'}
                />
              );
            })}
          </div>
        )}
      </div>

      {checkInCourse && (
        <CheckInQRModal
          course={checkInCourse}
          courseTypeName={getCT(checkInCourse.courseTypeId)?.name || ''}
          onClose={() => setCheckInCourse(null)}
        />
      )}
    </div>
  );
}
