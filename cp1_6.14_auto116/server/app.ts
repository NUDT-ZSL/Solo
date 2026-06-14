import express, { Request, Response } from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

type CourseStatus = 'upcoming' | 'ongoing' | 'ended'

interface Course {
  id: string
  name: string
  duration: number
  teacher: string
  maxStudents: number
  description: string
  startTime: string
  status: CourseStatus
  enrolledStudents: number
  studentIds: string[]
}

interface RescheduleRequest {
  id: string
  courseId: string
  courseName: string
  teacher: string
  originalTime: string
  newTime: string
  remark: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

interface Student {
  id: string
  name: string
  lastActiveAt: string
}

const now = new Date()
const startOfWeek = new Date(now)
startOfWeek.setDate(now.getDate() - now.getDay())
startOfWeek.setHours(0, 0, 0, 0)

const addDays = (base: Date, days: number, h = 9, m = 0) => {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

let courses: Course[] = [
  {
    id: 'c1',
    name: 'Python基础编程',
    duration: 90,
    teacher: '张老师',
    maxStudents: 20,
    description: '从零开始学习Python语言基础语法与常用库',
    startTime: addDays(startOfWeek, 1, 9, 0),
    status: 'upcoming',
    enrolledStudents: 12,
    studentIds: ['s1', 's2', 's3']
  },
  {
    id: 'c2',
    name: '英语口语提升',
    duration: 60,
    teacher: '李老师',
    maxStudents: 15,
    description: '日常口语对话与发音纠正',
    startTime: addDays(startOfWeek, 2, 10, 0),
    status: 'ongoing',
    enrolledStudents: 10,
    studentIds: ['s1', 's4']
  },
  {
    id: 'c3',
    name: '数学思维训练',
    duration: 120,
    teacher: '王老师',
    maxStudents: 25,
    description: '小学高年级数学思维拓展课程',
    startTime: addDays(startOfWeek, 3, 14, 0),
    status: 'upcoming',
    enrolledStudents: 18,
    studentIds: ['s2', 's5']
  },
  {
    id: 'c4',
    name: '少儿美术启蒙',
    duration: 90,
    teacher: '赵老师',
    maxStudents: 12,
    description: '创意绘画与手工制作',
    startTime: addDays(startOfWeek, 4, 15, 30),
    status: 'ended',
    enrolledStudents: 8,
    studentIds: ['s3']
  },
  {
    id: 'c5',
    name: '钢琴入门课',
    duration: 45,
    teacher: '陈老师',
    maxStudents: 6,
    description: '一对一钢琴基础教学',
    startTime: addDays(startOfWeek, 5, 16, 0),
    status: 'upcoming',
    enrolledStudents: 4,
    studentIds: []
  }
]

let rescheduleRequests: RescheduleRequest[] = [
  {
    id: 'r1',
    courseId: 'c1',
    courseName: 'Python基础编程',
    teacher: '张老师',
    originalTime: addDays(startOfWeek, 1, 9, 0),
    newTime: addDays(startOfWeek, 1, 14, 0),
    remark: '本周一上午临时有事，申请调整到下午',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'r2',
    courseId: 'c3',
    courseName: '数学思维训练',
    teacher: '王老师',
    originalTime: addDays(startOfWeek, 3, 14, 0),
    newTime: addDays(startOfWeek, 3, 16, 0),
    remark: '学校会议冲突',
    status: 'pending',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
]

const students: Student[] = [
  { id: 's1', name: '小明', lastActiveAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 's2', name: '小红', lastActiveAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 's3', name: '小刚', lastActiveAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 's4', name: '小丽', lastActiveAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: 's5', name: '小华', lastActiveAt: new Date(Date.now() - 86400000 * 3).toISOString() }
]

const currentStudentId = 's1'
const currentTeacher = '张老师'

const genId = () => Math.random().toString(36).slice(2, 10)

const checkTimeConflict = (startTime: string, duration: number, excludeId?: string): boolean => {
  const start = new Date(startTime).getTime()
  const end = start + duration * 60 * 1000
  return courses.some(c => {
    if (excludeId && c.id === excludeId) return false
    const cStart = new Date(c.startTime).getTime()
    const cEnd = cStart + c.duration * 60 * 1000
    return start < cEnd && end > cStart
  })
}

const checkStudentConflict = (studentId: string, startTime: string, duration: number, excludeCourseId?: string): boolean => {
  const start = new Date(startTime).getTime()
  const end = start + duration * 60 * 1000
  return courses.some(c => {
    if (excludeCourseId && c.id === excludeCourseId) return false
    if (!c.studentIds.includes(studentId)) return false
    const cStart = new Date(c.startTime).getTime()
    const cEnd = cStart + c.duration * 60 * 1000
    return start < cEnd && end > cStart
  })
}

app.get('/api/courses', (_req: Request, res: Response) => {
  res.json(courses)
})

app.get('/api/courses/:id', (req: Request, res: Response) => {
  const course = courses.find(c => c.id === req.params.id)
  if (!course) return res.status(404).json({ error: '课程不存在' })
  res.json(course)
})

app.post('/api/courses', (req: Request, res: Response) => {
  const { name, duration, teacher, maxStudents, description, startTime } = req.body
  if (!name || !duration || !teacher || !maxStudents || !startTime) {
    return res.status(400).json({ error: '缺少必填字段' })
  }
  const conflict = checkTimeConflict(startTime, duration)
  if (conflict) {
    return res.status(409).json({ error: '该时间段已有课程安排' })
  }
  const newCourse: Course = {
    id: genId(),
    name,
    duration,
    teacher,
    maxStudents,
    description: description || '',
    startTime,
    status: 'upcoming',
    enrolledStudents: 0,
    studentIds: []
  }
  courses.push(newCourse)
  res.status(201).json(newCourse)
})

app.put('/api/courses/:id', (req: Request, res: Response) => {
  const idx = courses.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: '课程不存在' })
  const { startTime, duration } = req.body
  if (startTime) {
    const actualDuration = duration ?? courses[idx].duration
    const conflict = checkTimeConflict(startTime, actualDuration, req.params.id)
    if (conflict) {
      return res.status(409).json({ error: '该时间段已有课程安排', conflict: true })
    }
  }
  courses[idx] = { ...courses[idx], ...req.body }
  res.json(courses[idx])
})

app.delete('/api/courses/:id', (req: Request, res: Response) => {
  const len = courses.length
  courses = courses.filter(c => c.id !== req.params.id)
  if (courses.length === len) return res.status(404).json({ error: '课程不存在' })
  res.json({ success: true })
})

app.get('/api/calendar', (req: Request, res: Response) => {
  const { start, end } = req.query as { start?: string; end?: string }
  let filtered = courses
  if (start && end) {
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    filtered = courses.filter(c => {
      const t = new Date(c.startTime).getTime()
      return t >= s && t <= e
    })
  }
  res.json(filtered)
})

app.post('/api/courses/:id/enroll', (req: Request, res: Response) => {
  const { studentId } = req.body
  const sid = studentId || currentStudentId
  const course = courses.find(c => c.id === req.params.id)
  if (!course) return res.status(404).json({ error: '课程不存在' })
  if (course.studentIds.includes(sid)) {
    return res.status(400).json({ error: '您已选该课程' })
  }
  if (course.enrolledStudents >= course.maxStudents) {
    return res.status(400).json({ error: '该课程人数已满' })
  }
  if (checkStudentConflict(sid, course.startTime, course.duration, course.id)) {
    return res.status(409).json({ error: '该时间段与您已选课程时间重叠' })
  }
  course.studentIds.push(sid)
  course.enrolledStudents++
  res.json({ success: true, course })
})

app.post('/api/courses/:id/drop', (req: Request, res: Response) => {
  const { studentId } = req.body
  const sid = studentId || currentStudentId
  const course = courses.find(c => c.id === req.params.id)
  if (!course) return res.status(404).json({ error: '课程不存在' })
  if (!course.studentIds.includes(sid)) {
    return res.status(400).json({ error: '您未选该课程' })
  }
  course.studentIds = course.studentIds.filter(id => id !== sid)
  course.enrolledStudents--
  res.json({ success: true, course })
})

app.get('/api/teacher/schedule', (req: Request, res: Response) => {
  const { teacher } = req.query as { teacher?: string }
  const t = teacher || currentTeacher
  const teacherCourses = courses.filter(c => c.teacher === t)
  const totalHours = teacherCourses.reduce((acc, c) => acc + c.duration, 0) / 60

  const weekStart = new Date(startOfWeek).getTime()
  const weekEnd = weekStart + 7 * 24 * 3600 * 1000
  const weekHours = teacherCourses
    .filter(c => {
      const t = new Date(c.startTime).getTime()
      return t >= weekStart && t < weekEnd
    })
    .reduce((acc, c) => acc + c.duration, 0) / 60

  res.json({
    teacher: t,
    courses: teacherCourses,
    totalHours: Math.round(totalHours * 10) / 10,
    weekHours: Math.round(weekHours * 10) / 10
  })
})

app.get('/api/reschedule', (_req: Request, res: Response) => {
  const sorted = [...rescheduleRequests].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  res.json(sorted)
})

app.post('/api/reschedule', (req: Request, res: Response) => {
  const { courseId, originalTime, newTime, remark } = req.body
  const course = courses.find(c => c.id === courseId)
  if (!course) return res.status(404).json({ error: '课程不存在' })
  const request: RescheduleRequest = {
    id: genId(),
    courseId,
    courseName: course.name,
    teacher: course.teacher,
    originalTime,
    newTime,
    remark: remark || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
  rescheduleRequests.push(request)
  res.status(201).json(request)
})

app.post('/api/reschedule/:id/approve', (req: Request, res: Response) => {
  const r = rescheduleRequests.find(x => x.id === req.params.id)
  if (!r) return res.status(404).json({ error: '请求不存在' })
  const course = courses.find(c => c.id === r.courseId)
  if (!course) return res.status(404).json({ error: '关联课程不存在' })

  const newStart = new Date(r.newTime).getTime()
  const newEnd = newStart + course.duration * 60 * 1000
  const hasConflict = courses.some(c => {
    if (c.id === course.id) return false
    const cs = new Date(c.startTime).getTime()
    const ce = cs + c.duration * 60 * 1000
    return newStart < ce && newEnd > cs
  })

  if (hasConflict) {
    return res.status(409).json({ error: '新时间与其他课程冲突', conflict: true })
  }

  course.startTime = r.newTime
  r.status = 'approved'
  res.json({ success: true, course, affectedStudents: course.studentIds })
})

app.post('/api/reschedule/:id/reject', (req: Request, res: Response) => {
  const r = rescheduleRequests.find(x => x.id === req.params.id)
  if (!r) return res.status(404).json({ error: '请求不存在' })
  r.status = 'rejected'
  res.json({ success: true })
})

app.get('/api/dashboard/stats', (_req: Request, res: Response) => {
  const weekStart = new Date(startOfWeek).getTime()
  const weekEnd = weekStart + 7 * 24 * 3600 * 1000
  const weekCourseCount = courses.filter(c => {
    const t = new Date(c.startTime).getTime()
    return t >= weekStart && t < weekEnd
  }).length

  const pendingRequests = rescheduleRequests.filter(r => r.status === 'pending').length

  const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000
  const activeCount = students.filter(s => new Date(s.lastActiveAt).getTime() >= sevenDaysAgo).length
  const activityRate = students.length > 0 ? Math.round((activeCount / students.length) * 100) : 0

  res.json({
    weekCourseCount,
    pendingRequests,
    activityRate,
    pendingList: rescheduleRequests.filter(r => r.status === 'pending')
  })
})

app.get('/api/student/current', (_req: Request, res: Response) => {
  const s = students.find(x => x.id === currentStudentId)
  res.json({ studentId: currentStudentId, name: s?.name || '学员' })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
