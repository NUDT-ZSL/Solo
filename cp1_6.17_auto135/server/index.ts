import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Meeting, Note, TodoItem, Contact, Participant, DashboardStats } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let contacts: Contact[] = [
  { id: 'c1', name: '张三', email: 'zhangsan@example.com' },
  { id: 'c2', name: '李四', email: 'lisi@example.com' },
  { id: 'c3', name: '王五', email: 'wangwu@example.com' },
  { id: 'c4', name: '赵六', email: 'zhaoliu@example.com' },
  { id: 'c5', name: '钱七', email: 'qianqi@example.com' },
];

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const dayBefore = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

let meetings: Meeting[] = [
  {
    id: 'm1',
    title: '产品规划周会',
    dateTime: tomorrow.toISOString(),
    participants: [
      { id: 'c1', name: '张三' },
      { id: 'c2', name: '李四' },
      { id: 'c3', name: '王五' },
    ],
    location: '会议室A',
    agenda: '讨论Q2产品路线图，评审需求优先级',
    status: 'upcoming',
    notes: [
      {
        id: 'n1',
        content: '<p><strong>会议目标：</strong>确定Q2核心功能方向</p><ul><li>用户增长策略</li><li>核心体验优化</li></ul>',
        author: '张三',
        authorId: 'c1',
        createdAt: dayBefore.toISOString(),
        updatedAt: dayBefore.toISOString(),
        attachments: [],
      },
    ],
    todos: [
      { id: 't1', title: '完成用户调研报告', assigneeId: 'c2', priority: 'high', dueDate: inTwoDays.toISOString(), completed: false, createdAt: dayBefore.toISOString() },
      { id: 't2', title: '整理竞品分析', assigneeId: 'c3', priority: 'medium', dueDate: tomorrow.toISOString(), completed: true, createdAt: dayBefore.toISOString() },
    ],
    createdAt: dayBefore.toISOString(),
  },
  {
    id: 'm2',
    title: '技术架构评审',
    dateTime: yesterday.toISOString(),
    participants: [
      { id: 'c2', name: '李四' },
      { id: 'c4', name: '赵六' },
    ],
    location: '线上会议',
    agenda: '评审新模块技术架构方案',
    status: 'finished',
    notes: [
      {
        id: 'n2',
        content: '<p><strong>架构方案已确认：</strong></p><ol><li>采用微服务架构</li><li>数据库选择PostgreSQL</li></ol>',
        author: '李四',
        authorId: 'c2',
        createdAt: yesterday.toISOString(),
        updatedAt: yesterday.toISOString(),
        attachments: [],
      },
    ],
    todos: [
      { id: 't3', title: '编写技术设计文档', assigneeId: 'c4', priority: 'urgent', dueDate: now.toISOString(), completed: true, createdAt: yesterday.toISOString() },
      { id: 't4', title: '搭建开发环境', assigneeId: 'c2', priority: 'high', dueDate: tomorrow.toISOString(), completed: false, createdAt: yesterday.toISOString() },
      { id: 't5', title: '制定测试计划', assigneeId: 'c4', priority: 'low', dueDate: inTwoDays.toISOString(), completed: false, createdAt: yesterday.toISOString() },
    ],
    createdAt: dayBefore.toISOString(),
  },
  {
    id: 'm3',
    title: '设计评审会',
    dateTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    participants: [
      { id: 'c1', name: '张三' },
      { id: 'c3', name: '王五' },
      { id: 'c5', name: '钱七' },
    ],
    location: '设计工作室',
    agenda: '评审新版本UI设计稿',
    status: 'upcoming',
    notes: [],
    todos: [],
    createdAt: yesterday.toISOString(),
  },
  {
    id: 'm4',
    title: '每日站会',
    dateTime: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    participants: [
      { id: 'c1', name: '张三' },
      { id: 'c2', name: '李四' },
      { id: 'c3', name: '王五' },
      { id: 'c4', name: '赵六' },
    ],
    location: '大会议室',
    agenda: '同步项目进度，解决阻塞问题',
    status: 'upcoming',
    notes: [],
    todos: [
      { id: 't6', title: '修复登录bug', assigneeId: 'c2', priority: 'urgent', dueDate: now.toISOString(), completed: false, createdAt: yesterday.toISOString() },
    ],
    createdAt: yesterday.toISOString(),
  },
  {
    id: 'm5',
    title: '运营数据分析',
    dateTime: dayBefore.toISOString(),
    participants: [
      { id: 'c3', name: '王五' },
      { id: 'c5', name: '钱七' },
    ],
    location: '会议室B',
    agenda: '分析上月运营数据，制定下月计划',
    status: 'finished',
    notes: [
      {
        id: 'n3',
        content: '<p><strong>关键数据：</strong></p><ul><li>月活增长15%</li><li>留存率提升8%</li></ul>',
        author: '王五',
        authorId: 'c3',
        createdAt: dayBefore.toISOString(),
        updatedAt: dayBefore.toISOString(),
        attachments: [],
      },
    ],
    todos: [
      { id: 't7', title: '输出数据报告', assigneeId: 'c5', priority: 'medium', dueDate: yesterday.toISOString(), completed: true, createdAt: dayBefore.toISOString() },
    ],
    createdAt: dayBefore.toISOString(),
  },
];

const updateMeetingStatus = (meeting: Meeting): Meeting => {
  const now = new Date();
  const meetingTime = new Date(meeting.dateTime);
  const meetingEnd = new Date(meetingTime.getTime() + 60 * 60 * 1000);
  
  let status: Meeting['status'];
  if (now < meetingTime) {
    status = 'upcoming';
  } else if (now >= meetingTime && now <= meetingEnd) {
    status = 'ongoing';
  } else {
    status = 'finished';
  }
  
  return { ...meeting, status };
};

app.get('/api/meetings', (_req: Request, res: Response) => {
  const updatedMeetings = meetings.map(updateMeetingStatus);
  res.json(updatedMeetings);
});

app.get('/api/meetings/:id', (req: Request, res: Response) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  res.json(updateMeetingStatus(meeting));
});

app.post('/api/meetings', (req: Request, res: Response) => {
  const { title, dateTime, participantIds, location, agenda } = req.body;
  
  const participants: Participant[] = participantIds
    .map((id: string) => contacts.find(c => c.id === id))
    .filter((c): c is Contact => c !== undefined)
    .map(c => ({ id: c.id, name: c.name, avatar: c.avatar }));
  
  const newMeeting: Meeting = {
    id: uuidv4(),
    title,
    dateTime,
    participants,
    location: location || '',
    agenda: agenda || '',
    status: 'upcoming',
    notes: [],
    todos: [],
    createdAt: new Date().toISOString(),
  };
  
  meetings.unshift(newMeeting);
  res.status(201).json(newMeeting);
});

app.put('/api/meetings/:id', (req: Request, res: Response) => {
  const index = meetings.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  const { title, dateTime, participantIds, location, agenda } = req.body;
  
  const participants: Participant[] = participantIds
    .map((id: string) => contacts.find(c => c.id === id))
    .filter((c): c is Contact => c !== undefined)
    .map(c => ({ id: c.id, name: c.name, avatar: c.avatar }));
  
  meetings[index] = {
    ...meetings[index],
    title: title || meetings[index].title,
    dateTime: dateTime || meetings[index].dateTime,
    participants: participants || meetings[index].participants,
    location: location !== undefined ? location : meetings[index].location,
    agenda: agenda !== undefined ? agenda : meetings[index].agenda,
  };
  
  res.json(meetings[index]);
});

app.delete('/api/meetings/:id', (req: Request, res: Response) => {
  const index = meetings.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  meetings.splice(index, 1);
  res.status(204).send();
});

app.get('/api/meetings/:id/notes', (req: Request, res: Response) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  const sortedNotes = [...meeting.notes].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sortedNotes);
});

app.post('/api/meetings/:id/notes', (req: Request, res: Response) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  const { content, authorId } = req.body;
  const author = contacts.find(c => c.id === authorId);
  
  const newNote: Note = {
    id: uuidv4(),
    content,
    author: author?.name || '未知',
    authorId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: [],
  };
  
  meeting.notes.unshift(newNote);
  res.status(201).json(newNote);
});

app.put('/api/meetings/:id/notes/:noteId', (req: Request, res: Response) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  const noteIndex = meeting.notes.findIndex(n => n.id === req.params.noteId);
  if (noteIndex === -1) {
    return res.status(404).json({ error: '笔记不存在' });
  }
  
  const { content } = req.body;
  meeting.notes[noteIndex] = {
    ...meeting.notes[noteIndex],
    content,
    updatedAt: new Date().toISOString(),
  };
  
  res.json(meeting.notes[noteIndex]);
});

app.delete('/api/meetings/:id/notes/:noteId', (req: Request, res: Response) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  const noteIndex = meeting.notes.findIndex(n => n.id === req.params.noteId);
  if (noteIndex === -1) {
    return res.status(404).json({ error: '笔记不存在' });
  }
  
  meeting.notes.splice(noteIndex, 1);
  res.status(204).send();
});

app.post('/api/meetings/:id/notes/:noteId/attachments', (req: Request, res: Response) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  const note = meeting.notes.find(n => n.id === req.params.noteId);
  if (!note) {
    return res.status(404).json({ error: '笔记不存在' });
  }
  
  const { name, type, url, size } = req.body;
  
  const newAttachment = {
    id: uuidv4(),
    name,
    type,
    url,
    size,
    createdAt: new Date().toISOString(),
  };
  
  note.attachments.push(newAttachment);
  res.status(201).json(newAttachment);
});

app.get('/api/meetings/:id/todos', (req: Request, res: Response) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  const sortedTodos = [...meeting.todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  
  res.json(sortedTodos);
});

app.post('/api/meetings/:id/todos', (req: Request, res: Response) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  const { title, assigneeId, priority, dueDate } = req.body;
  
  const newTodo: TodoItem = {
    id: uuidv4(),
    title,
    assigneeId,
    priority,
    dueDate,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  
  meeting.todos.push(newTodo);
  res.status(201).json(newTodo);
});

app.put('/api/meetings/:id/todos/:todoId', (req: Request, res: Response) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  const todo = meeting.todos.find(t => t.id === req.params.todoId);
  if (!todo) {
    return res.status(404).json({ error: '待办事项不存在' });
  }
  
  const { title, assigneeId, priority, dueDate, completed } = req.body;
  
  if (title !== undefined) todo.title = title;
  if (assigneeId !== undefined) todo.assigneeId = assigneeId;
  if (priority !== undefined) todo.priority = priority;
  if (dueDate !== undefined) todo.dueDate = dueDate;
  if (completed !== undefined) todo.completed = completed;
  
  res.json(todo);
});

app.delete('/api/meetings/:id/todos/:todoId', (req: Request, res: Response) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: '会议不存在' });
  }
  
  const todoIndex = meeting.todos.findIndex(t => t.id === req.params.todoId);
  if (todoIndex === -1) {
    return res.status(404).json({ error: '待办事项不存在' });
  }
  
  meeting.todos.splice(todoIndex, 1);
  res.status(204).send();
});

app.get('/api/contacts', (_req: Request, res: Response) => {
  res.json(contacts);
});

app.get('/api/dashboard', (_req: Request, res: Response) => {
  const totalMeetings = meetings.length;
  
  const allTodos = meetings.flatMap(m => m.todos);
  const completedTodos = allTodos.filter(t => t.completed);
  const completedTodosRatio = allTodos.length > 0 ? completedTodos.length / allTodos.length : 0;
  
  const avgTodosPerMeeting = totalMeetings > 0 ? allTodos.length / totalMeetings : 0;
  
  const last7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const count = allTodos.filter(t => {
      const todoDate = new Date(t.createdAt).toISOString().split('T')[0];
      return todoDate === dateStr;
    }).length;
    
    last7Days.push({ date: dateStr, count });
  }
  
  const stats: DashboardStats = {
    totalMeetings,
    completedTodosRatio,
    avgTodosPerMeeting,
    last7DaysTodos: last7Days,
  };
  
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
