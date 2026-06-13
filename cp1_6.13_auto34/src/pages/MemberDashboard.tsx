import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { Course, api } from '../utils/api';
import { ws } from '../utils/websocket';

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

function formatDateLabel(d: Date, idx: number): { weekday: string; day: string; month: string } {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const wd = idx === 0 ? '今天' : idx === 1 ? '明天' : weekdays[d.getDay()];
  return {
    weekday: wd,
    day: String(d.getDate()).padStart(2, '0'),
    month: `${d.getMonth() + 1}月`
  };
}

function CourseCard({
  course,
  courseTypeName,
  courseTypeColor,
  coachName,
  isFull,
  isBooked,
  isCancelled,
  shouldAnimate,
  onClick
}: {
  course: Course;
  courseTypeName: string;
  courseTypeColor: string;
  coachName: string;
  isFull: boolean;
  isBooked: boolean;
  isCancelled: boolean;
  shouldAnimate: boolean;
  onClick: () => void;
  onAnimationComplete?: () => void;
}) {
  const remaining = course.capacity - course.bookedCount;
  const disabled = isFull || isCancelled;
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (shouldAnimate) {
      setAnimating(true);
    }
  }, [shouldAnimate]);

  const handleAnimationEnd = () => {
    setAnimating(false);
  };

  return (
    <div
      onClick={() => !disabled && onClick()}
      className={`course-card ${disabled ? 'course-card-disabled' : ''}`}
      style={{
        background: courseTypeColor
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>{courseTypeName}</div>
          {isBooked && (
            <div
              style={{
                fontSize: 10,
                padding: '2px 8px',
                background: '#10b981',
                color: 'white',
                borderRadius: 10,
                fontWeight: 600
              }}
            >
              已预约
            </div>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>
          {course.startTime} - {course.endTime}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 2 }}>教练：{coachName}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#4b5563' }}>
            剩余
            <span
              className={animating ? 'number-pop' : ''}
              onAnimationEnd={handleAnimationEnd}
              style={{ fontWeight: 700, marginLeft: 4, fontSize: 14, color: remaining <= 2 ? '#dc2626' : '#1f2937' }}
            >
              {remaining}
            </span>
            /{course.capacity}
          </div>
        </div>
      </div>

      {disabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(156, 163, 175, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: 4
          }}
        >
          {isCancelled ? '已取消' : '已 满'}
        </div>
      )}
    </div>
  );
}

function CourseDetailModal({
  course,
  onClose,
  onBook,
  onCancel,
  courseTypeName,
  coachName,
  isBooked,
  bookingId
}: {
  course: Course;
  onClose: () => void;
  onBook: () => void;
  onCancel: (id: string) => void;
  courseTypeName: string;
  coachName: string;
  isBooked: boolean;
  bookingId?: string;
}) {
  const remaining = course.capacity - course.bookedCount;
  const isFull = remaining <= 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
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
          maxWidth: 420,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}
      >
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: '#1f2937' }}>课程详情</h3>
        <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>课程名称</span>
            <span style={{ fontWeight: 700, color: '#1f2937' }}>{courseTypeName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>日期</span>
            <span style={{ fontWeight: 700, color: '#1f2937' }}>{course.date}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>时间</span>
            <span style={{ fontWeight: 700, color: '#1f2937' }}>
              {course.startTime} - {course.endTime}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>教练</span>
            <span style={{ fontWeight: 700, color: '#1f2937' }}>{coachName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>剩余名额</span>
            <span style={{ fontWeight: 700, color: remaining <= 2 ? '#dc2626' : '#1f2937' }}>
              {remaining} / {course.capacity}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 12,
              background: '#f3f4f6',
              color: '#374151',
              fontWeight: 700
            }}
          >
            关闭
          </button>
          {isBooked && bookingId ? (
            <button
              onClick={() => onCancel(bookingId)}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                background: '#dc2626',
                color: 'white',
                fontWeight: 700
              }}
            >
              取消预约
            </button>
          ) : (
            <button
              onClick={onBook}
              disabled={isFull}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                background: isFull ? '#9ca3af' : 'linear-gradient(135deg, #1e3a5f, #3b82f6)',
                color: 'white',
                fontWeight: 700
              }}
            >
              {isFull ? '已满员' : '立即预约'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MemberDashboard() {
  const {
    currentMember,
    courseTypes,
    coaches,
    courses,
    refreshCourses,
    myBookings,
    refreshMyBookings
  } = useApp();

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [animatingCourses, setAnimatingCourses] = useState<Set<string>>(new Set());

  const weekDates = useMemo(() => getWeekDates(), []);

  useEffect(() => {
    const off = ws.on('booking:changed', (data: { courseId: string }) => {
      setAnimatingCourses((prev) => {
        const next = new Set(prev);
        next.add(data.courseId);
        setTimeout(() => {
          setAnimatingCourses((p) => {
            const n = new Set(p);
            n.delete(data.courseId);
            return n;
          });
        }, 400);
        return next;
      });
    });
    return () => off();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setBookingMessage({ type, text });
    setTimeout(() => setBookingMessage(null), 2500);
  };

  const handleBook = async () => {
    if (!selectedCourse || !currentMember) return;
    try {
      await api.createBooking({
        courseId: selectedCourse._id,
        memberId: currentMember._id,
        memberName: currentMember.name
      });
      showMessage('success', '预约成功！');
      await Promise.all([refreshCourses(), refreshMyBookings()]);
      setSelectedCourse(null);
    } catch (e: any) {
      showMessage('error', e.message || '预约失败');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await api.cancelBooking(bookingId);
      showMessage('success', '已取消预约');
      await Promise.all([refreshCourses(), refreshMyBookings()]);
      setSelectedCourse(null);
    } catch (e: any) {
      showMessage('error', e.message || '操作失败');
    }
  };

  const coursesByDate = useMemo(() => {
    const map = new Map<string, Course[]>();
    weekDates.forEach((d) => map.set(formatDateKey(d), []));
    courses.forEach((c) => {
      if (map.has(c.date)) {
        map.get(c.date)!.push(c);
      }
    });
    map.forEach((list) => list.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [courses, weekDates]);

  const getCT = (id: string) => courseTypes.find((c) => c._id === id);
  const getCoach = (id: string) => coaches.find((c) => c._id === id);

  const getBookingId = (courseId: string) => {
    const b = myBookings.find((b) => b.courseId === courseId);
    return b?._id;
  };

  const isBooked = (courseId: string) => myBookings.some((b) => b.courseId === courseId);

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      {bookingMessage && (
        <div
          style={{
            position: 'fixed',
            top: 80,
            right: 24,
            padding: '14px 24px',
            borderRadius: 12,
            background: bookingMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            fontWeight: 600,
            zIndex: 99999,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}
        >
          {bookingMessage.text}
        </div>
      )}

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>课程日历</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>未来 7 天课程安排，点击卡片查看详情并预约</p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 16,
          minWidth: 0,
          overflowX: 'auto'
        }}
        className="member-calendar"
      >
        {weekDates.map((d, idx) => {
          const label = formatDateLabel(d, idx);
          const dateKey = formatDateKey(d);
          const dayCourses = coursesByDate.get(dateKey) || [];
          return (
            <div key={dateKey} style={{ minWidth: 230 }}>
              <div
                style={{
                  padding: '14px 12px',
                  borderRadius: 12,
                  background: idx === 0 ? 'linear-gradient(135deg, #1e3a5f, #2d6a9f)' : '#f3f4f6',
                  color: idx === 0 ? 'white' : '#374151',
                  marginBottom: 12,
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{label.weekday}</div>
                <div style={{ fontSize: 22, fontWeight: 800, margin: '4px 0' }}>{label.day}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{label.month}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                {dayCourses.length === 0 ? (
                  <div style={{ padding: 24, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                    暂无课程
                  </div>
                ) : (
                  dayCourses.map((course) => {
                    const ct = getCT(course.courseTypeId);
                    const coach = getCoach(course.coachId);
                    const full = course.bookedCount >= course.capacity;
                    const booked = isBooked(course._id);
                    return (
                      <CourseCard
                        key={course._id}
                        course={course}
                        courseTypeName={ct?.name || '课程'}
                        courseTypeColor={ct?.color || '#e5e7eb'}
                        coachName={coach?.name || '未分配'}
                        isFull={full}
                        isBooked={booked}
                        isCancelled={course.status === 'cancelled'}
                        shouldAnimate={animatingCourses.has(course._id)}
                        onClick={() => setSelectedCourse(course)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {myBookings.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 16 }}>我的预约</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16
            }}
          >
            {myBookings.map((b) => {
              const ct = getCT(b.courseId ? (b.course?.courseTypeId || '') : '');
              const coach = b.course ? getCoach(b.course.coachId) : null;
              return (
                <div
                  key={b._id}
                  style={{
                    padding: 18,
                    borderRadius: 14,
                    background: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    borderLeft: `4px solid ${ct?.color || '#3b82f6'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, color: '#1f2937' }}>{ct?.name}</div>
                    <div
                      style={{
                        fontSize: 11,
                        padding: '3px 10px',
                        background: '#10b98120',
                        color: '#10b981',
                        borderRadius: 10,
                        fontWeight: 600
                      }}
                    >
                      已预约
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                    📅 {b.course?.date} {b.course?.startTime} - {b.course?.endTime}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>👨‍🏫 {coach?.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onBook={handleBook}
          onCancel={handleCancelBooking}
          courseTypeName={getCT(selectedCourse.courseTypeId)?.name || ''}
          coachName={getCoach(selectedCourse.coachId)?.name || ''}
          isBooked={isBooked(selectedCourse._id)}
          bookingId={getBookingId(selectedCourse._id)}
        />
      )}

      <style>{`
        @media (max-width: 1023px) {
          .member-calendar {
            grid-template-columns: repeat(7, 240px) !important;
          }
        }
        @media (max-width: 767px) {
          .member-calendar {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
