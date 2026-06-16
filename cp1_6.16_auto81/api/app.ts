import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

interface CourseData {
  id: string
  studentName: string
  studentAvatar: string
  time: string
  piece: string
  studentId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface PlayLogData {
  id: string
  studentId: string
  date: string
  piece: string
  duration: number
  note: string
}

interface StudentData {
  id: string
  name: string
  attendanceRate: number
}

interface PieceData {
  id: string
  name: string
  tags: string[]
}

const avatarColors = ['#4A90D9', '#6C63FF', '#E74C3C', '#27AE60', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22']

const students: StudentData[] = [
  { id: 's1', name: '张小明', attendanceRate: 92 },
  { id: 's2', name: '李雨桐', attendanceRate: 85 },
  { id: 's3', name: '王子涵', attendanceRate: 78 },
  { id: 's4', name: '陈思雨', attendanceRate: 95 },
  { id: 's5', name: '刘梓萱', attendanceRate: 88 },
  { id: 's6', name: '赵一鸣', attendanceRate: 72 },
  { id: 's7', name: '孙艺涵', attendanceRate: 90 },
  { id: 's8', name: '周诗琪', attendanceRate: 83 },
]

const today = new Date().getDay() || 7

const courses: CourseData[] = [
  { id: 'c1', studentName: '张小明', studentAvatar: avatarColors[0], time: '09:00-09:45', piece: '车尔尼599 第45首', studentId: 's1', dayOfWeek: today, startTime: '09:00', endTime: '09:45' },
  { id: 'c2', studentName: '李雨桐', studentAvatar: avatarColors[1], time: '10:00-10:45', piece: '巴赫小前奏曲', studentId: 's2', dayOfWeek: today, startTime: '10:00', endTime: '10:45' },
  { id: 'c3', studentName: '王子涵', studentAvatar: avatarColors[2], time: '11:00-11:45', piece: '莫扎特奏鸣曲K545', studentId: 's3', dayOfWeek: today, startTime: '11:00', endTime: '11:45' },
  { id: 'c4', studentName: '陈思雨', studentAvatar: avatarColors[3], time: '14:00-14:45', piece: '肖邦夜曲Op.9 No.2', studentId: 's4', dayOfWeek: today, startTime: '14:00', endTime: '14:45' },
  { id: 'c5', studentName: '刘梓萱', studentAvatar: avatarColors[4], time: '15:00-15:45', piece: '车尔尼849 第12首', studentId: 's5', dayOfWeek: today, startTime: '15:00', endTime: '15:45' },
  { id: 'c6', studentName: '赵一鸣', studentAvatar: avatarColors[5], time: '16:00-16:45', piece: '克莱门蒂小奏鸣曲', studentId: 's6', dayOfWeek: today, startTime: '16:00', endTime: '16:45' },
  { id: 'c7', studentName: '孙艺涵', studentAvatar: avatarColors[6], time: '17:00-17:45', piece: '德彪西月光', studentId: 's7', dayOfWeek: today, startTime: '17:00', endTime: '17:45' },
]

function generateLogs(studentId: string): PlayLogData[] {
  const pieces = ['车尔尼599 第45首', '巴赫小前奏曲', '莫扎特奏鸣曲K545', '肖邦夜曲Op.9 No.2', '车尔尼849 第12首', '克莱门蒂小奏鸣曲', '德彪西月光']
  const notes = ['今天练习比较顺利，节奏稳定', '左手需要加强练习', '注意力度变化', '整体不错，需要加快速度', '练习效果很好，可以进入下一首', '指法需要纠正', '连奏部分有进步', '踏板使用需要更熟练']
  const logs: PlayLogData[] = []
  const now = new Date()

  for (let i = 0; i < 8; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    logs.push({
      id: `log_${studentId}_${i}`,
      studentId,
      date: dateStr,
      piece: pieces[Math.floor(Math.random() * pieces.length)],
      duration: 15 + Math.floor(Math.random() * 60),
      note: notes[Math.floor(Math.random() * notes.length)],
    })
  }

  return logs
}

const allLogs: PlayLogData[] = students.flatMap((s) => generateLogs(s.id))

const pieces: PieceData[] = [
  { id: 'p1', name: '车尔尼599 第45首', tags: ['练习曲', '初级'] },
  { id: 'p2', name: '巴赫小前奏曲', tags: ['巴洛克', '中级'] },
  { id: 'p3', name: '莫扎特奏鸣曲K545', tags: ['古典', '中级'] },
  { id: 'p4', name: '肖邦夜曲Op.9 No.2', tags: ['浪漫', '高级'] },
  { id: 'p5', name: '车尔尼849 第12首', tags: ['练习曲', '中级'] },
  { id: 'p6', name: '克莱门蒂小奏鸣曲', tags: ['古典', '初级'] },
  { id: 'p7', name: '德彪西月光', tags: ['印象派', '高级'] },
  { id: 'p8', name: '拜厄钢琴基本教程 第80首', tags: ['练习曲', '初级'] },
  { id: 'p9', name: '巴赫创意曲二部 No.1', tags: ['巴洛克', '中级'] },
  { id: 'p10', name: '贝多芬致爱丽丝', tags: ['古典', '中级'] },
  { id: 'p11', name: '舒曼梦幻曲', tags: ['浪漫', '中级'] },
  { id: 'p12', name: '哈农练指法 No.20', tags: ['练习曲', '初级'] },
  { id: 'p13', name: '柴可夫斯基四季-六月船歌', tags: ['浪漫', '高级'] },
  { id: 'p14', name: '格里格培尔金特组曲', tags: ['浪漫', '中级'] },
  { id: 'p15', name: '门德尔松春之歌', tags: ['浪漫', '高级'] },
]

function checkConflict(
  newSlot: { dayOfWeek: number; startTime: string; endTime: string },
  existingSlots: CourseData[]
): { courseName: string; time: string }[] {
  const conflicts: { courseName: string; time: string }[] = []

  for (const slot of existingSlots) {
    if (slot.dayOfWeek !== newSlot.dayOfWeek) continue

    const newStart = timeToMinutes(newSlot.startTime)
    const newEnd = timeToMinutes(newSlot.endTime)
    const existStart = timeToMinutes(slot.startTime)
    const existEnd = timeToMinutes(slot.endTime)

    if (newStart < existEnd && newEnd > existStart) {
      conflicts.push({
        courseName: `${slot.studentName}的课程`,
        time: `${slot.startTime}-${slot.endTime}`,
      })
    }
  }

  return conflicts
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

app.get('/api/teacher/schedule', (_req: Request, res: Response) => {
  const todayCourses = courses.filter((c) => c.dayOfWeek === today)
  res.json({ courses: todayCourses })
})

app.post('/api/logs', (req: Request, res: Response) => {
  const { studentId, piece, duration, note, date } = req.body

  if (!studentId || !piece || !duration || !note) {
    res.status(400).json({ success: false, message: '缺少必填字段' })
    return
  }

  if (duration < 5 || duration > 120) {
    res.status(400).json({ success: false, message: '练习时长需在5-120分钟之间' })
    return
  }

  const newLog: PlayLogData = {
    id: `log_${Date.now()}`,
    studentId,
    date: date || new Date().toISOString().split('T')[0],
    piece,
    duration,
    note,
  }

  allLogs.push(newLog)
  res.json({ success: true, message: '日志提交成功' })
})

app.get('/api/student/logs', (req: Request, res: Response) => {
  const studentId = req.query.studentId as string
  if (!studentId) {
    res.status(400).json({ logs: [] })
    return
  }

  const logs = allLogs
    .filter((l) => l.studentId === studentId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  res.json({ logs })
})

app.get('/api/parent/data', (req: Request, res: Response) => {
  const studentId = req.query.studentId as string
  const studentName = req.query.studentName as string

  let student: StudentData | undefined

  if (studentId) {
    student = students.find((s) => s.id === studentId)
  } else if (studentName) {
    student = students.find((s) => s.name === studentName)
  }

  if (!student) {
    res.status(404).json({ success: false, message: '未找到该学生' })
    return
  }

  const studentLogs = allLogs.filter((l) => l.studentId === student!.id)
  const weeklyLogs: { date: string; totalMinutes: number }[] = []
  const now = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLogs = studentLogs.filter((l) => l.date === dateStr)
    weeklyLogs.push({
      date: dateStr,
      totalMinutes: dayLogs.reduce((sum, l) => sum + l.duration, 0),
    })
  }

  res.json({
    attendanceRate: student.attendanceRate,
    weeklyLogs,
    studentName: student.name,
  })
})

app.get('/api/pieces', (_req: Request, res: Response) => {
  res.json({ pieces })
})

app.post('/api/schedule', (req: Request, res: Response) => {
  const { dayOfWeek, startTime, endTime, studentName, piece } = req.body

  if (!dayOfWeek || !startTime || !endTime || !studentName || !piece) {
    res.status(400).json({ success: false, message: '缺少必填字段' })
    return
  }

  const conflicts = checkConflict({ dayOfWeek, startTime, endTime }, courses)

  if (conflicts.length > 0) {
    res.json({ success: false, conflicts, message: '课表时间冲突' })
    return
  }

  const student = students.find((s) => s.name === studentName)
  const newCourse: CourseData = {
    id: `c_${Date.now()}`,
    studentName,
    studentAvatar: avatarColors[Math.floor(Math.random() * avatarColors.length)],
    time: `${startTime}-${endTime}`,
    piece,
    studentId: student?.id || '',
    dayOfWeek,
    startTime,
    endTime,
  }

  courses.push(newCourse)
  res.json({ success: true, message: '课表添加成功' })
})

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, role } = req.body

  res.json({
    success: true,
    token: 'mock_token_' + Date.now(),
    user: { id: 'u1', name: username || '用户', role: role || 'teacher' },
  })
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

export default app
