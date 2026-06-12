import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { coursesApi } from '../api';
import type { Course, CourseSlot } from '../types';

const CoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<CourseSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<CourseSlot | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datesWithSlots, setDatesWithSlots] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await coursesApi.getCourses();
      if (res.data.success && res.data.data) {
        setCourses(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedCourse(res.data.data[0]);
        }
      }
    } catch (error) {
      console.error('加载课程失败:', error);
    }
  };

  useEffect(() => {
    if (selectedCourse) {
      loadSlotsForMonth();
    }
  }, [selectedCourse, currentMonth]);

  const loadSlotsForMonth = async () => {
    if (!selectedCourse) return;
    try {
      const res = await coursesApi.getCourseSlots(selectedCourse.id);
      if (res.data.success && res.data.data) {
        const dates = new Set(res.data.data
          .filter(s => s.booked_count < s.max_capacity)
          .map(s => s.date)
        );
        setDatesWithSlots(dates);
      }
    } catch (error) {
      console.error('加载时段失败:', error);
    }
  };

  const loadSlotsForDate = async (date: string) => {
    if (!selectedCourse) return;
    setLoadingSlots(true);
    setError('');
    try {
      const res = await coursesApi.getCourseSlots(selectedCourse.id, date);
      if (res.data.success && res.data.data) {
        setSlots(res.data.data);
      }
    } catch (error) {
      setError('加载时段失败，请重试');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    if (datesWithSlots.has(dateStr)) {
      setSelectedDate(dateStr);
      setSelectedSlot(null);
      loadSlotsForDate(dateStr);
    }
  };

  const handleSubmitBooking = async () => {
    if (!selectedSlot || !selectedCourse) return;
    if (!customerName.trim()) {
      setError('请填写姓名');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请填写正确的手机号');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await coursesApi.createBooking({
        slot_id: selectedSlot.id,
        course_id: selectedCourse.id,
        customer_name: customerName,
        phone
      });

      setBookedSlots(prev => new Set([...prev, selectedSlot.id]));
      setShowSuccess(true);
      setCustomerName('');
      setPhone('');

      setTimeout(() => {
        setShowSuccess(false);
        setSelectedSlot(null);
        setSelectedDate(null);
        loadSlotsForMonth();
      }, 2000);
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { error?: string } } }).response?.data;
      setError(errorData?.error || '预约失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20
          }}
        >
          <button
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: 'white',
              color: '#4a3728',
              fontWeight: 600,
              fontSize: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}
          >
            ‹
          </button>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#4a3728' }}>
            {year}年{month + 1}月
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: 'white',
              color: '#4a3728',
              fontWeight: 600,
              fontSize: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}
          >
            ›
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginBottom: 8
          }}
        >
          {weekDays.map(d => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: '#999',
                padding: '8px 0'
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4
          }}
        >
          {days.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} />;
            }
            const dateStr = date.toISOString().split('T')[0];
            const isToday = date.getTime() === today.getTime();
            const hasSlots = datesWithSlots.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isPast = date < today;

            return (
              <button
                key={dateStr}
                onClick={() => !isPast && handleDateClick(date)}
                disabled={isPast || !hasSlots}
                style={{
                  position: 'relative',
                  padding: '10px 0',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: isSelected ? 600 : 400,
                  backgroundColor: isSelected
                    ? '#8B5E3C'
                    : isToday
                    ? '#bfdbfe'
                    : 'transparent',
                  color: isSelected
                    ? 'white'
                    : isPast
                    ? '#ccc'
                    : hasSlots
                    ? '#4a3728'
                    : '#bbb',
                  cursor: isPast || !hasSlots ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {date.getDate()}
                {hasSlots && !isPast && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      left: 6,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: isSelected ? 'white' : '#22c55e'
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#4a3728', marginBottom: 8 }}>体验课程</h1>
        <p style={{ fontSize: 15, color: '#8B5E3C' }}>亲手制作一件属于自己的皮具作品</p>
      </div>

      {courses.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 32,
            flexWrap: 'wrap'
          }}
        >
          {courses.map(course => (
            <button
              key={course.id}
              onClick={() => {
                setSelectedCourse(course);
                setSelectedDate(null);
                setSelectedSlot(null);
                setSlots([]);
              }}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: selectedCourse?.id === course.id ? 600 : 500,
                backgroundColor: selectedCourse?.id === course.id ? '#8B5E3C' : 'white',
                color: selectedCourse?.id === course.id ? 'white' : '#4a3728',
                boxShadow: selectedCourse?.id === course.id
                  ? '0 2px 12px rgba(139, 94, 60, 0.3)'
                  : '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minWidth: 140
              }}
            >
              <span style={{ fontSize: 15 }}>{course.name}</span>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                {course.duration} · ¥{course.price}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedCourse && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 32,
            maxWidth: 900,
            margin: '0 auto'
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)'
            }}
          >
            {renderCalendar()}
          </div>

          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <h4 style={{ fontSize: 16, fontWeight: 600, color: '#4a3728', marginBottom: 16 }}>
              {selectedDate
                ? `${selectedDate} 可选时段`
                : '请先在左侧选择日期'}
            </h4>

            {selectedDate && (
              <>
                {loadingSlots ? (
                  <div style={{ color: '#999', fontSize: 14 }}>加载中...</div>
                ) : slots.length === 0 ? (
                  <div style={{ color: '#999', fontSize: 14 }}>该日期暂无可预约时段</div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 20
                    }}
                  >
                    {slots.map(slot => {
                      const isBooked = bookedSlots.has(slot.id);
                      const isFull = slot.booked_count >= slot.max_capacity;
                      const isDisabled = isBooked || isFull;

                      return (
                        <button
                          key={slot.id}
                          onClick={() => !isDisabled && setSelectedSlot(slot)}
                          disabled={isDisabled}
                          style={{
                            width: 100,
                            padding: '10px 0',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            backgroundColor: isBooked
                              ? '#d1d5db'
                              : selectedSlot?.id === slot.id
                              ? '#8B5E3C'
                              : isFull
                              ? '#f3f4f6'
                              : '#FFF8F0',
                            color: isBooked
                              ? '#9ca3af'
                              : selectedSlot?.id === slot.id
                              ? 'white'
                              : isFull
                              ? '#9ca3af'
                              : '#8B5E3C',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          {isBooked && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          {slot.time}
                          {!isFull && !isBooked && (
                            <span style={{ fontSize: 10, opacity: 0.7 }}>
                              ({slot.max_capacity - slot.booked_count})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {selectedSlot && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div
                  style={{
                    padding: 12,
                    backgroundColor: '#FFF8F0',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#4a3728'
                  }}
                >
                  <p>课程：{selectedCourse.name}</p>
                  <p>时间：{selectedDate} {selectedSlot.time}</p>
                  <p>费用：¥{selectedCourse.price}</p>
                </div>
                <input
                  type="text"
                  placeholder="请输入您的姓名"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
                {error && (
                  <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>
                )}
                <button
                  onClick={handleSubmitBooking}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#8B5E3C',
                    color: 'white',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600
                  }}
                >
                  {isSubmitting ? '预约中...' : '确认预约'}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedDate(null);
              setSelectedSlot(null);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1500,
              display: 'none'
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            style={{
              position: 'fixed',
              top: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 24px',
              backgroundColor: '#22c55e',
              color: 'white',
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            预约成功！
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .page-container > div:nth-child(4) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CoursesPage;
