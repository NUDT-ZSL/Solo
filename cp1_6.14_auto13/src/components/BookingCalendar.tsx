import React, { useCallback } from 'react';
import { Course, Booking, createBooking, cancelBooking } from '../api/requests';
import toast from 'react-hot-toast';

interface BookingCalendarProps {
  courses: Course[];
  bookings: Booking[];
  userId: string;
  onBookingChange: () => void;
}

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function getNext7Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function BookingCalendar({ courses, bookings, userId, onBookingChange }: BookingCalendarProps) {
  const next7Days = getNext7Days();

  const userBookedCourseIds = new Set(
    bookings.filter(b => b.userId === userId && b.status !== 'cancelled').map(b => b.courseId)
  );

  const userBookingMap = new Map(
    bookings.filter(b => b.userId === userId && b.status !== 'cancelled').map(b => [b.courseId, b])
  );

  const getCoursesForDay = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return courses.filter(c => c.date === dateStr);
  }, [courses]);

  const handleBook = useCallback(async (courseId: string) => {
    try {
      await createBooking(userId, courseId);
      toast.success('预约成功！');
      onBookingChange();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '预约失败');
    }
  }, [userId, onBookingChange]);

  const handleCancel = useCallback(async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
      toast.success('已取消预约');
      onBookingChange();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '取消失败');
    }
  }, [onBookingChange]);

  return (
    <div className="booking-calendar">
      <h2 className="section-title">📅 未来一周课程</h2>
      <div className="calendar-grid">
        {next7Days.map((date, dayIdx) => {
          const dayCourses = getCoursesForDay(date);
          const dateStr = date.toISOString().split('T')[0];
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <div key={dayIdx} className={`calendar-day ${isToday ? 'today' : ''}`}>
              <div className="day-header">
                <span className="day-name">{DAYS[date.getDay()]}</span>
                <span className="day-date">{date.getMonth() + 1}/{date.getDate()}</span>
              </div>
              <div className="day-courses">
                {dayCourses.length === 0 ? (
                  <div className="no-course">暂无课程</div>
                ) : (
                  dayCourses.map(course => {
                    const isFull = (course.remaining ?? 0) <= 0;
                    const isBooked = userBookedCourseIds.has(course._id);
                    const booking = userBookingMap.get(course._id);
                    const isPrivate = course.type === 'private';

                    return (
                      <div
                        key={course._id}
                        className={`course-cell ${isFull && !isBooked ? 'full' : ''} ${isBooked ? 'booked' : ''} ${isPrivate ? 'private' : ''}`}
                      >
                        <div className="course-name">{course.name}</div>
                        <div className="course-time">{course.time} · {course.duration}分钟</div>
                        <div className="course-coach">🏋️ {course.coachName}</div>
                        <div className="course-spots">
                          {isFull && !isBooked ? (
                            <span className="full-tag">已满</span>
                          ) : (
                            <span>剩余 {course.remaining ?? 0}/{course.capacity}</span>
                          )}
                        </div>
                        <div className="course-action">
                          {isBooked ? (
                            <button
                              className="btn-cancel-booking"
                              onClick={() => booking && handleCancel(booking._id)}
                              disabled={booking?.status === 'checked-in'}
                            >
                              {booking?.status === 'checked-in' ? '已签到' : '取消预约'}
                            </button>
                          ) : (
                            <button
                              className="btn-book"
                              disabled={isFull}
                              onClick={() => handleBook(course._id)}
                            >
                              {isFull ? '已满' : '预约'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
