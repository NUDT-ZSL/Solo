import React, { useState, useEffect, useCallback } from 'react';
import { User, Course, Booking, getCourses, createCourse, updateCourse, deleteCourse, getBookings, checkinBooking, cancelBooking } from '../api/requests';
import toast from 'react-hot-toast';

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    name: '',
    date: '',
    time: '',
    duration: 60,
    capacity: 15,
    type: 'group' as 'group' | 'private',
  });

  const loadData = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([
        getCourses(),
        getBookings({ days: 7 }),
      ]);
      setCourses(c);
      setBookings(b);
    } catch {
      toast.error('加载数据失败');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setCourseForm({ name: '', date: '', time: '', duration: 60, capacity: 15, type: 'group' });
    setEditingCourse(null);
    setShowCourseForm(false);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      name: course.name,
      date: course.date,
      time: course.time,
      duration: course.duration,
      capacity: course.capacity,
      type: course.type,
    });
    setShowCourseForm(true);
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await updateCourse(editingCourse._id, {
          name: courseForm.name,
          date: courseForm.date,
          time: courseForm.time,
          duration: courseForm.duration,
          capacity: courseForm.capacity,
          type: courseForm.type,
        });
        toast.success('课程已更新');
      } else {
        await createCourse({
          name: courseForm.name,
          coachId: user._id,
          coachName: user.name,
          date: courseForm.date,
          time: courseForm.time,
          duration: courseForm.duration,
          capacity: courseForm.capacity,
          type: courseForm.type,
        });
        toast.success('课程已创建');
      }
      resetForm();
      loadData();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('确定删除该课程？所有未签到预约将被自动取消。')) return;
    try {
      const result = await deleteCourse(courseId);
      toast.success(`课程已删除，${result.cancelledBookings?.length || 0}个预约已取消`);
      loadData();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleCheckin = async (bookingId: string) => {
    try {
      await checkinBooking(bookingId);
      toast.success('签到成功');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '签到失败');
    }
  };

  const handleCancelBookingAdmin = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
      toast.success('预约已取消');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '取消失败');
    }
  };

  const statusMap: Record<string, { label: string; className: string }> = {
    'booked': { label: '已预约', className: 'status-booked' },
    'checked-in': { label: '已签到', className: 'status-checkedin' },
    'cancelled': { label: '已取消', className: 'status-cancelled' },
  };

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');

  return (
    <div className="admin-dashboard">
      <div className="admin-layout">
        <div className="admin-left">
          <div className="admin-section-header">
            <h2 className="section-title">📚 课程管理</h2>
            <button className="add-btn" onClick={() => { resetForm(); setShowCourseForm(true); }}>+ 新增课程</button>
          </div>

          {showCourseForm && (
            <div className="course-form-card">
              <h3>{editingCourse ? '编辑课程' : '新增课程'}</h3>
              <form onSubmit={handleCourseSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>课程名称</label>
                    <input
                      type="text"
                      value={courseForm.name}
                      onChange={e => setCourseForm(f => ({ ...f, name: e.target.value }))}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>课程类型</label>
                    <select
                      value={courseForm.type}
                      onChange={e => setCourseForm(f => ({ ...f, type: e.target.value as 'group' | 'private' }))}
                      className="form-input"
                    >
                      <option value="group">团课</option>
                      <option value="private">私教课</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>日期</label>
                    <input
                      type="date"
                      value={courseForm.date}
                      onChange={e => setCourseForm(f => ({ ...f, date: e.target.value }))}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>时间</label>
                    <input
                      type="time"
                      value={courseForm.time}
                      onChange={e => setCourseForm(f => ({ ...f, time: e.target.value }))}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>时长(分钟)</label>
                    <input
                      type="number"
                      value={courseForm.duration}
                      onChange={e => setCourseForm(f => ({ ...f, duration: parseInt(e.target.value) || 0 }))}
                      className="form-input"
                      min={1}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>名额上限</label>
                    <input
                      type="number"
                      value={courseForm.capacity}
                      onChange={e => setCourseForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
                      className="form-input"
                      min={1}
                      max={15}
                      required
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">{editingCourse ? '保存修改' : '创建课程'}</button>
                  <button type="button" className="cancel-form-btn" onClick={resetForm}>取消</button>
                </div>
              </form>
            </div>
          )}

          <div className="course-list">
            {courses.map(course => (
              <div key={course._id} className="course-item">
                <div className="course-item-info">
                  <span className="course-item-name">{course.name}</span>
                  <span className="course-item-meta">{course.date} {course.time} · {course.duration}分钟 · {course.remaining ?? 0}/{course.capacity}人</span>
                  <span className={`course-type-tag ${course.type}`}>{course.type === 'group' ? '团课' : '私教'}</span>
                </div>
                <div className="course-item-actions">
                  <button className="action-btn edit-btn" onClick={() => handleEditCourse(course)}>编辑</button>
                  <button className="action-btn delete-btn" onClick={() => handleDeleteCourse(course._id)}>删除</button>
                </div>
              </div>
            ))}
            {courses.length === 0 && <div className="empty-state">暂无课程</div>}
          </div>
        </div>

        <div className="admin-right">
          <h2 className="section-title">📋 预约管理（未来7天）</h2>
          <div className="booking-table-wrapper">
            <table className="booking-table">
              <thead>
                <tr>
                  <th>会员</th>
                  <th>课程</th>
                  <th>日期</th>
                  <th>时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {activeBookings.map((booking, idx) => {
                  const s = statusMap[booking.status] || statusMap['booked'];
                  return (
                    <tr key={booking._id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                      <td>{booking.userName || booking.userId}</td>
                      <td>{booking.courseName}</td>
                      <td>{booking.date}</td>
                      <td>{booking.time}</td>
                      <td><span className={`status-tag ${s.className}`}>{s.label}</span></td>
                      <td className="action-cell">
                        {booking.status === 'booked' && (
                          <>
                            <button className="table-btn checkin-btn" onClick={() => handleCheckin(booking._id)}>签到</button>
                            <button className="table-btn cancel-table-btn" onClick={() => handleCancelBookingAdmin(booking._id)}>取消</button>
                          </>
                        )}
                        {booking.status === 'checked-in' && (
                          <span className="checked-in-label">✓ 已完成</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {activeBookings.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">暂无预约</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
