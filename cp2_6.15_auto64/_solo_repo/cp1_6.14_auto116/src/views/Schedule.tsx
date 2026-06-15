import React, { useEffect, useRef, useState, useMemo } from 'react'
import http from '../http'
import CourseCard, { Course } from '../components/CourseCard'

type Role = 'admin' | 'student' | 'teacher'

interface ScheduleProps {
  onToast: (message: string) => void
  onBottomNotify: (message: string) => void
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)

const pad = (n: number) => n.toString().padStart(2, '0')
const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const getStartOfWeek = (base: Date) => {
  const d = new Date(base)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

const getCourseAbbr = (name: string) => {
  if (name.length <= 2) return name
  return name.slice(0, 2)
}

const Schedule: React.FC<ScheduleProps> = ({ onToast, onBottomNotify }) => {
  const [role, setRole] = useState<Role>('student')
  const [courses, setCourses] = useState<Course[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleCourse, setRescheduleCourse] = useState<Course | null>(null)
  const [studentId] = useState('s1')
  const [teacherInfo, setTeacherInfo] = useState<any>(null)
  const [dragging, setDragging] = useState<{ course: Course; startY: number; offset: number } | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const startOfWeek = useMemo(() => {
    const base = new Date()
    base.setDate(base.getDate() + weekOffset * 7)
    return getStartOfWeek(base)
  }, [weekOffset])

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [startOfWeek])

  const fetchCourses = async () => {
    try {
      const end = new Date(startOfWeek)
      end.setDate(end.getDate() + 7)
      const res = await http.get('/calendar', {
        params: { start: startOfWeek.toISOString(), end: end.toISOString() }
      })
      setCourses(res.data)
    } catch (err: any) {
      onToast(err.message || '加载课程失败')
    }
  }

  const fetchTeacherInfo = async () => {
    try {
      const res = await http.get('/teacher/schedule')
      setTeacherInfo(res.data)
    } catch (err: any) {
      console.warn('获取教师信息失败', err.message)
    }
  }

  useEffect(() => { fetchCourses() }, [startOfWeek])

  useEffect(() => {
    if (role === 'teacher') fetchTeacherInfo()
    else setTeacherInfo(null)
  }, [role])

  const getCourseWeekday = (c: Course) => new Date(c.startTime).getDay()
  const getCourseHour = (c: Course) => {
    const d = new Date(c.startTime)
    return d.getHours() + d.getMinutes() / 60
  }
  const getCourseDurationBlock = (c: Course) => c.duration / 60

  const weekCoursesByDay = useMemo(() => {
    const map: Record<number, Course[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    courses.forEach(c => {
      const day = getCourseWeekday(c)
      if (day >= 0 && day <= 6) map[day].push(c)
    })
    return map
  }, [courses])

  const isEnrolled = (c: Course) => c.studentIds.includes(studentId)

  const handleEnroll = async (course: Course) => {
    try {
      await http.post(`/courses/${course.id}/enroll`, { studentId })
      onBottomNotify(`成功选课：${course.name}`)
      setSelectedCourse({ ...course, enrolledStudents: course.enrolledStudents + 1, studentIds: [...course.studentIds, studentId] })
      await fetchCourses()
    } catch (err: any) {
      onToast(err.message || '选课失败')
    }
  }

  const handleDrop = async (course: Course) => {
    try {
      await http.post(`/courses/${course.id}/drop`, { studentId })
      onBottomNotify(`已退课：${course.name}`)
      setSelectedCourse({ ...course, enrolledStudents: course.enrolledStudents - 1, studentIds: course.studentIds.filter(id => id !== studentId) })
      await fetchCourses()
    } catch (err: any) {
      onToast(err.message || '退课失败')
    }
  }

  const handleDeleteCourse = async (course: Course) => {
    if (!window.confirm(`确定删除课程「${course.name}」吗？`)) return
    try {
      await http.delete(`/courses/${course.id}`)
      onBottomNotify(`已删除课程：${course.name}`)
      await fetchCourses()
    } catch (err: any) {
      onToast(err.message || '删除失败')
    }
  }

  const handleSaveCourse = async (data: Partial<Course> & { name: string; duration: number; teacher: string; maxStudents: number; startTime: string }) => {
    try {
      if (editingCourse) {
        await http.put(`/courses/${editingCourse.id}`, data)
        onBottomNotify(`已更新课程：${data.name}`)
        setEditingCourse(null)
        setShowEditModal(false)
        await fetchCourses()
      } else {
        await http.post('/courses', data)
        onBottomNotify(`已创建课程：${data.name}`)
        setShowEditModal(false)
        await fetchCourses()
      }
    } catch (err: any) {
      if (err.data?.conflict) {
        const ok = window.confirm('该时间段与其他课程冲突，是否仍然保存？')
        if (ok) {
          try {
            if (editingCourse) await http.put(`/courses/${editingCourse.id}`, { ...data, force: true })
            onBottomNotify('已强制更新课程时间')
            setEditingCourse(null)
            setShowEditModal(false)
            await fetchCourses()
          } catch (err2: any) {
            onToast(err2.message || '保存失败')
          }
        }
      } else {
        onToast(err.message || '保存失败')
      }
    }
  }

  const handleSubmitReschedule = async (originalTime: string, newTime: string, remark: string) => {
    if (!rescheduleCourse) return
    try {
      await http.post('/reschedule', { courseId: rescheduleCourse.id, originalTime, newTime, remark })
      onBottomNotify('调课申请已提交，等待管理员审核')
      setShowRescheduleModal(false)
      setRescheduleCourse(null)
    } catch (err: any) {
      onToast(err.message || '提交失败')
    }
  }

  const handleDragStart = (e: React.MouseEvent, course: Course) => {
    if (role !== 'teacher') return
    e.preventDefault()
    const startY = e.clientY
    setDragging({ course, startY, offset: 0 })

    const onMove = (ev: MouseEvent) => {
      const diff = ev.clientY - startY
      const snapped = Math.round(diff / 60) * 60
      setDragging(prev => prev ? { ...prev, offset: snapped } : null)
    }

    const onUp = async () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      setDragging(prev => {
        if (!prev || prev.offset === 0) return null
        const hourBlocks = Math.round(prev.offset / 60)
        const oldDate = new Date(prev.course.startTime)
        const newDate = new Date(oldDate)
        newDate.setHours(newDate.getHours() + hourBlocks)

        const doUpdate = async (time: string) => {
          try {
            await http.put(`/courses/${prev.course.id}`, { startTime: time })
            onBottomNotify(`已调整「${prev.course.name}」时间`)
            fetchCourses()
          } catch (err: any) {
            if (err.data?.conflict) {
              const ok = window.confirm('新时间与其他课程冲突，是否覆盖？')
              if (ok) {
                try {
                  await http.put(`/courses/${prev.course.id}`, { startTime: time, force: true })
                  onBottomNotify('已强制调整时间')
                  fetchCourses()
                } catch (err2: any) {
                  onToast(err2.message || '调整失败')
                }
              }
            } else {
              onToast(err.message || '调整失败')
            }
          }
        }
        doUpdate(newDate.toISOString())
        return null
      })
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const renderWeeklyGrid = () => {
    return (
      <div style={{ background: '#ffffff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 20, transition: 'box-shadow 0.2s ease' }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '46px repeat(7, 46px)', gap: 4, justifyContent: 'center' }}>
          <div />
          {weekDates.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString()
            return (
              <div key={i} style={{
                width: 46,
                height: 46,
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: isToday ? '#3498db' : '#f8f9fa',
                color: isToday ? '#ffffff' : '#2c3e50',
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.2,
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: 10, opacity: 0.8 }}>{WEEKDAYS[i]}</span>
                <span>{d.getDate()}</span>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, alignItems: 'center' }}>
          {HOURS.map(h => (
            <div key={h} style={{ display: 'grid', gridTemplateColumns: '46px repeat(7, 46px)', gap: 4 }}>
              <div className="calendar-cell" style={{
                width: 46, height: 46, borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#95a5a6', boxSizing: 'border-box'
              }}>
                {pad(h)}:00
              </div>
              {weekDates.map((d, dayIdx) => {
                const dayCourses = weekCoursesByDay[dayIdx]?.filter(c => {
                  const ch = new Date(c.startTime).getHours()
                  return ch === h
                }) || []
                const hasCourse = dayCourses.length > 0
                const course = dayCourses[0]
                return (
                  <div
                    key={dayIdx}
                    className="calendar-cell"
                    onClick={() => {
                      if (course) {
                        setSelectedCourse(course)
                        setShowCourseModal(true)
                      }
                    }}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 4,
                      background: hasCourse ? '#ebf5fb' : '#ffffff',
                      border: hasCourse ? '1px solid #d4e6f1' : '1px solid #f0f0f0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: hasCourse ? 'pointer' : 'default',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if (hasCourse) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(52,152,219,0.2)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {hasCourse && course && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#3498db',
                        lineHeight: 1.1,
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 40
                      }}>
                        {getCourseAbbr(course.name)}
                      </span>
                    )}
                    {hasCourse && course && (
                      <span style={{
                        fontSize: 8,
                        color: '#7f8c8d',
                        lineHeight: 1
                      }}>
                        {pad(new Date(course.startTime).getHours())}:{pad(new Date(course.startTime).getMinutes())}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderTimeGridView = () => {
    const HOUR_HEIGHT = 60
    return (
      <div ref={calendarRef} style={{ position: 'relative', background: '#ffffff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #ecf0f1' }}>
          <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: '#95a5a6', fontWeight: 500 }}>时间</div>
          {weekDates.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString()
            return (
              <div key={i} style={{
                padding: 12, textAlign: 'center',
                background: isToday ? '#ebf5fb' : 'transparent',
                borderLeft: i === 0 ? 'none' : '1px solid #ecf0f1'
              }}>
                <div style={{ fontSize: 12, color: '#7f8c8d' }}>{WEEKDAYS[i]}</div>
                <div style={{ fontSize: 16, fontWeight: isToday ? 700 : 600, color: isToday ? '#3498db' : '#2c3e50', marginTop: 2 }}>
                  {formatDate(d)}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', position: 'relative' }}>
          <div>
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_HEIGHT, padding: '4px 8px', fontSize: 11, color: '#95a5a6', textAlign: 'right', borderTop: '1px solid #f4f6f7', boxSizing: 'border-box' }}>
                {pad(h)}:00
              </div>
            ))}
          </div>

          {weekDates.map((d, dayIdx) => (
            <div key={dayIdx} style={{ position: 'relative', borderLeft: dayIdx === 0 ? 'none' : '1px solid #ecf0f1', borderTop: '1px solid #f4f6f7' }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: '1px solid #f4f6f7' }} />
              ))}

              {weekCoursesByDay[dayIdx]?.map(course => {
                const hour = getCourseHour(course)
                const topOffset = (hour - HOURS[0]) * HOUR_HEIGHT
                const height = getCourseDurationBlock(course) * HOUR_HEIGHT
                const enrolled = isEnrolled(course)
                const isDragging = dragging?.course.id === course.id
                const displayTop = isDragging ? topOffset + (dragging?.offset ?? 0) : topOffset
                const statusColors: Record<string, string> = { upcoming: '#3498db', ongoing: '#2ecc71', ended: '#95a5a6' }
                return (
                  <div
                    key={course.id}
                    onMouseDown={(e) => handleDragStart(e, course)}
                    onClick={() => { setSelectedCourse(course); setShowCourseModal(true) }}
                    style={{
                      position: 'absolute', left: 4, right: 4, top: displayTop, height: height - 4,
                      background: isDragging
                        ? 'rgba(52, 152, 219, 0.5)'
                        : enrolled
                          ? `linear-gradient(135deg, ${statusColors[course.status]}dd, ${statusColors[course.status]})`
                          : `linear-gradient(135deg, #ffffff, #f8f9fa)`,
                      color: enrolled ? '#ffffff' : '#2c3e50',
                      borderRadius: 8, padding: '6px 8px', fontSize: 11, lineHeight: 1.3,
                      boxShadow: isDragging ? '0 8px 24px rgba(52,152,219,0.3)' : '0 2px 6px rgba(0,0,0,0.08)',
                      cursor: role === 'teacher' ? 'grab' : 'pointer',
                      overflow: 'hidden', zIndex: isDragging ? 100 : 10,
                      border: enrolled ? 'none' : `1px solid ${statusColors[course.status]}55`,
                      transition: isDragging ? 'none' : 'all 0.15s ease',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isDragging) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.12)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = isDragging ? '0 8px 24px rgba(52,152,219,0.3)' : '0 2px 6px rgba(0,0,0,0.08)'
                    }}
                  >
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {course.name.slice(0, 6)}
                    </div>
                    <div style={{ opacity: enrolled ? 0.9 : 0.6, fontSize: 10, marginTop: 2 }}>
                      {formatTime(new Date(course.startTime))} · {course.teacher.slice(0, 3)}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const roleTabs = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      {(['student', 'teacher', 'admin'] as Role[]).map(r => (
        <button
          key={r}
          onClick={() => setRole(r)}
          style={{
            padding: '8px 18px', borderRadius: 8,
            border: role === r ? 'none' : '1px solid #dfe4ea',
            background: role === r ? '#2c3e50' : '#ffffff',
            color: role === r ? '#ffffff' : '#2c3e50',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          {r === 'student' ? '学员视角' : r === 'teacher' ? '教师视角' : '管理员视角'}
        </button>
      ))}
    </div>
  )

  const weekNav = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #dfe4ea', background: '#fff', cursor: 'pointer', fontSize: 13 }}>上周</button>
        <button onClick={() => setWeekOffset(0)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #3498db', background: '#3498db', color: '#fff', cursor: 'pointer', fontSize: 13 }}>本周</button>
        <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #dfe4ea', background: '#fff', cursor: 'pointer', fontSize: 13 }}>下周</button>
        <div style={{ marginLeft: 12, fontSize: 14, fontWeight: 600, color: '#2c3e50' }}>
          {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
        </div>
      </div>
      {role === 'admin' && (
        <button onClick={() => { setEditingCourse(null); setShowEditModal(true) }} style={{
          padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3498db',
          color: '#ffffff', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease'
        }}>+ 新建课程</button>
      )}
    </div>
  )

  if (role === 'teacher') {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', margin: -24, padding: 0 }}>
        <div style={{
          width: 220, background: '#2c3e50', padding: 24, boxSizing: 'border-box',
          color: '#ecf0f1', flexShrink: 0, display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{teacherInfo?.teacher || '张老师'}</div>
          <div style={{ fontSize: 12, color: '#95a5a6', marginBottom: 32 }}>教师工作台</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 14, color: '#ecf0f1', marginBottom: 6 }}>总课时</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#3498db' }}>
                {teacherInfo?.totalHours ?? 0} <span style={{ fontSize: 14, fontWeight: 400 }}>小时</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#ecf0f1', marginBottom: 6 }}>本周课时</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2ecc71' }}>
                {teacherInfo?.weekHours ?? 0} <span style={{ fontSize: 14, fontWeight: 400 }}>小时</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#ecf0f1', marginBottom: 6 }}>本周课程数</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#e67e22' }}>
                {teacherInfo?.courses?.length ?? 0} <span style={{ fontSize: 14, fontWeight: 400 }}>节</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (teacherInfo?.courses?.length > 0) {
                setRescheduleCourse(teacherInfo.courses[0])
                setShowRescheduleModal(true)
              }
            }}
            style={{
              marginTop: 'auto', padding: '12px 16px', borderRadius: 8, border: '1px solid #3498db',
              background: 'transparent', color: '#3498db', fontSize: 13, cursor: 'pointer',
              fontWeight: 500, transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,152,219,0.15)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >发起调课申请</button>
        </div>

        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {roleTabs}
          {weekNav}
          <div style={{ fontSize: 12, color: '#95a5a6', marginBottom: 12 }}>
            提示：拖拽课程块可直接调整上课时间
          </div>
          {renderTimeGridView()}
        </div>

        {showCourseModal && selectedCourse && (
          <CourseDetailModal course={selectedCourse} role={role}
            onClose={() => { setShowCourseModal(false); setSelectedCourse(null) }}
            onEnroll={handleEnroll} onDrop={handleDrop}
            onEdit={(c) => { setEditingCourse(c); setShowEditModal(true); setShowCourseModal(false) }}
            onDelete={handleDeleteCourse}
            onRequestReschedule={(c) => { setRescheduleCourse(c); setShowRescheduleModal(true); setShowCourseModal(false) }}
            isEnrolled={isEnrolled(selectedCourse)} />
        )}
        {showEditModal && <CourseEditModal course={editingCourse} onClose={() => { setShowEditModal(false); setEditingCourse(null) }} onSave={handleSaveCourse} />}
        {showRescheduleModal && rescheduleCourse && <RescheduleModal course={rescheduleCourse} onClose={() => { setShowRescheduleModal(false); setRescheduleCourse(null) }} onSubmit={handleSubmitReschedule} />}
      </div>
    )
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
      {roleTabs}
      {weekNav}

      {role === 'admin' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2c3e50', marginBottom: 12 }}>课程管理</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {courses.map(c => (
              <CourseCard key={c.id} course={c}
                onEdit={(course) => { setEditingCourse(course); setShowEditModal(true) }}
                onDelete={handleDeleteCourse}
                onClick={(course) => { setSelectedCourse(course); setShowCourseModal(true) }} />
            ))}
            {courses.length === 0 && <div style={{ padding: 40, color: '#95a5a6', fontSize: 13 }}>暂无课程，点击「新建课程」开始排课</div>}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: '#2c3e50' }}>
        {role === 'student' ? '周历选课视图' : '周历视图'}
      </div>

      {role === 'student' ? renderWeeklyGrid() : renderTimeGridView()}

      {showCourseModal && selectedCourse && (
        <CourseDetailModal course={selectedCourse} role={role}
          onClose={() => { setShowCourseModal(false); setSelectedCourse(null) }}
          onEnroll={handleEnroll} onDrop={handleDrop}
          onEdit={(c) => { setEditingCourse(c); setShowEditModal(true); setShowCourseModal(false) }}
          onDelete={handleDeleteCourse}
          onRequestReschedule={(c) => { setRescheduleCourse(c); setShowRescheduleModal(true); setShowCourseModal(false) }}
          isEnrolled={isEnrolled(selectedCourse)} />
      )}
      {showEditModal && <CourseEditModal course={editingCourse} onClose={() => { setShowEditModal(false); setEditingCourse(null) }} onSave={handleSaveCourse} />}
      {showRescheduleModal && rescheduleCourse && <RescheduleModal course={rescheduleCourse} onClose={() => { setShowRescheduleModal(false); setRescheduleCourse(null) }} onSubmit={handleSubmitReschedule} />}
    </div>
  )
}

interface CDMProps {
  course: Course; role: Role; onClose: () => void
  onEnroll: (c: Course) => void; onDrop: (c: Course) => void
  onEdit: (c: Course) => void; onDelete: (c: Course) => void
  onRequestReschedule: (c: Course) => void; isEnrolled: boolean
}

const CourseDetailModal: React.FC<CDMProps> = ({ course, role, onClose, onEnroll, onDrop, onEdit, onDelete, onRequestReschedule, isEnrolled }) => {
  const statusMap: Record<string, { label: string; color: string }> = {
    upcoming: { label: '即将开课', color: '#3498db' },
    ongoing: { label: '进行中', color: '#2ecc71' },
    ended: { label: '已结束', color: '#95a5a6' }
  }
  const status = statusMap[course.status]
  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: 420, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'inline-block', background: status.color, color: '#fff', fontSize: 12, padding: '3px 10px', borderRadius: 8, marginBottom: 8 }}>
              {status.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#2c3e50' }}>{course.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#95a5a6' }}>x</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10, fontSize: 13, marginBottom: 20 }}>
          <div style={{ color: '#7f8c8d' }}>授课教师</div><div style={{ color: '#2c3e50', fontWeight: 500 }}>{course.teacher}</div>
          <div style={{ color: '#7f8c8d' }}>课程时长</div><div style={{ color: '#2c3e50', fontWeight: 500 }}>{course.duration} 分钟</div>
          <div style={{ color: '#7f8c8d' }}>上课时间</div><div style={{ color: '#2c3e50', fontWeight: 500 }}>{formatDateTime(course.startTime)}</div>
          <div style={{ color: '#7f8c8d' }}>报名人数</div>
          <div style={{ color: course.enrolledStudents >= course.maxStudents ? '#e74c3c' : '#2ecc71', fontWeight: 600 }}>
            {course.enrolledStudents} / {course.maxStudents} 人
          </div>
        </div>
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, fontSize: 13, color: '#34495e', marginBottom: 24, lineHeight: 1.6 }}>
          {course.description || '暂无课程描述'}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {role === 'student' && (
            isEnrolled ? (
              <button onClick={() => onDrop(course)} style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #e74c3c',
                background: 'transparent', color: '#e74c3c', fontSize: 13, fontWeight: 500, cursor: 'pointer'
              }}>退选此课程</button>
            ) : (
              <button onClick={() => onEnroll(course)} disabled={course.status === 'ended' || course.enrolledStudents >= course.maxStudents} style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                background: course.status === 'ended' || course.enrolledStudents >= course.maxStudents ? '#95a5a6' : '#3498db',
                color: '#fff', fontSize: 13, fontWeight: 500, cursor: course.status === 'ended' || course.enrolledStudents >= course.maxStudents ? 'not-allowed' : 'pointer'
              }}>
                {course.status === 'ended' ? '课程已结束' : course.enrolledStudents >= course.maxStudents ? '人数已满' : '立即选课'}
              </button>
            )
          )}
          {role === 'teacher' && (
            <button onClick={() => onRequestReschedule(course)} style={{
              flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #3498db',
              background: 'transparent', color: '#3498db', fontSize: 13, fontWeight: 500, cursor: 'pointer'
            }}>申请调课</button>
          )}
          {role === 'admin' && (
            <>
              <button onClick={() => onEdit(course)} style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #3498db',
                background: 'transparent', color: '#3498db', fontSize: 13, fontWeight: 500, cursor: 'pointer'
              }}>编辑课程</button>
              <button onClick={() => onDelete(course)} style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #e74c3c',
                background: 'transparent', color: '#e74c3c', fontSize: 13, fontWeight: 500, cursor: 'pointer'
              }}>删除课程</button>
            </>
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}

interface CEMProps { course: Course | null; onClose: () => void; onSave: (data: any) => void }

const CourseEditModal: React.FC<CEMProps> = ({ course, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: course?.name || '', duration: course?.duration || 90,
    teacher: course?.teacher || '', maxStudents: course?.maxStudents || 20,
    description: course?.description || '',
    startTime: course ? toDatetimeLocal(course.startTime) : toDatetimeLocal(new Date(Date.now() + 86400000).toISOString()),
    status: course?.status || 'upcoming'
  })
  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: 440, maxWidth: '90vw', padding: 24, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50' }}>{course ? '编辑课程' : '新建课程'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#95a5a6' }}>x</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="课程名称" required>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="请输入课程名称" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="时长（分钟）" required>
              <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: +e.target.value })} style={inputStyle} />
            </FormField>
            <FormField label="最大人数" required>
              <input type="number" value={form.maxStudents} onChange={e => setForm({ ...form, maxStudents: +e.target.value })} style={inputStyle} />
            </FormField>
          </div>
          <FormField label="授课教师" required>
            <input value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })} style={inputStyle} placeholder="请输入教师姓名" />
          </FormField>
          <FormField label="上课时间" required>
            <input type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} style={inputStyle} />
          </FormField>
          <FormField label="课程描述">
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="请输入课程描述" />
          </FormField>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #dfe4ea', background: '#fff', fontSize: 13, cursor: 'pointer' }}>取消</button>
          <button onClick={() => {
            if (!form.name || !form.teacher || !form.startTime || !form.duration || !form.maxStudents) { alert('请填写所有必填字段'); return }
            onSave({ ...form, startTime: new Date(form.startTime).toISOString() })
          }} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#3498db', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>保存</button>
        </div>
      </div>
    </ModalOverlay>
  )
}

interface RMProps { course: Course; onClose: () => void; onSubmit: (originalTime: string, newTime: string, remark: string) => void }

const RescheduleModal: React.FC<RMProps> = ({ course, onClose, onSubmit }) => {
  const [newTime, setNewTime] = useState(toDatetimeLocal(new Date(new Date(course.startTime).getTime() + 86400000).toISOString()))
  const [remark, setRemark] = useState('')
  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: 420, maxWidth: '90vw', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50' }}>调课申请</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#95a5a6' }}>x</button>
        </div>
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#2c3e50', fontWeight: 600, marginBottom: 6 }}>{course.name}</div>
          <div style={{ fontSize: 12, color: '#7f8c8d' }}>原时间：<span style={{ color: '#e74c3c' }}>{formatDateTime(course.startTime)}</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="新上课时间" required>
            <input type="datetime-local" value={newTime} onChange={e => setNewTime(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="调课原因/备注">
            <textarea value={remark} onChange={e => setRemark(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="请说明调课原因" />
          </FormField>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #dfe4ea', background: '#fff', fontSize: 13, cursor: 'pointer' }}>取消</button>
          <button onClick={() => {
            if (!newTime) { alert('请选择新的上课时间'); return }
            onSubmit(course.startTime, new Date(newTime).toISOString(), remark)
          }} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#3498db', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>提交申请</button>
        </div>
      </div>
    </ModalOverlay>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dfe4ea',
  fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s ease'
}

const FormField: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, color: '#34495e', fontWeight: 500 }}>
      {label} {required && <span style={{ color: '#e74c3c' }}>*</span>}
    </label>
    {children}
  </div>
)

const ModalOverlay: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: 20, boxSizing: 'border-box'
  }}>
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
)

export default Schedule
