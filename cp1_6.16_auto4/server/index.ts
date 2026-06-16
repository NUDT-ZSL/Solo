import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

export type Skill = '教学' | '翻译' | '技术' | '设计' | '医疗';

export interface Volunteer {
  id: string;
  name: string;
  skills: Skill[];
}

export interface Activity {
  id: string;
  name: string;
  date: string;
  requiredSkills: Skill[];
  maxParticipants: number;
  currentParticipants: number;
}

export interface ServiceRecord {
  id: string;
  volunteerName: string;
  activityId: string;
  activityName: string;
  date: string;
  hours: number;
  skills: Skill[];
}

const volunteers: Volunteer[] = [
  { id: uuidv4(), name: '张伟', skills: ['教学', '技术'] },
  { id: uuidv4(), name: '李娜', skills: ['翻译', '设计'] },
  { id: uuidv4(), name: '王芳', skills: ['医疗', '教学'] },
];

const activities: Activity[] = [
  { id: uuidv4(), name: '社区英语角', date: '2026-06-20', requiredSkills: ['教学', '翻译'], maxParticipants: 20, currentParticipants: 8 },
  { id: uuidv4(), name: '老年人IT培训', date: '2026-06-22', requiredSkills: ['技术', '教学'], maxParticipants: 15, currentParticipants: 5 },
  { id: uuidv4(), name: '健康义诊活动', date: '2026-06-25', requiredSkills: ['医疗'], maxParticipants: 30, currentParticipants: 12 },
  { id: uuidv4(), name: '社区海报设计', date: '2026-06-28', requiredSkills: ['设计'], maxParticipants: 8, currentParticipants: 3 },
  { id: uuidv4(), name: '国际志愿者交流', date: '2026-07-01', requiredSkills: ['翻译', '教学'], maxParticipants: 25, currentParticipants: 10 },
  { id: uuidv4(), name: '儿童编程启蒙', date: '2026-07-05', requiredSkills: ['技术', '教学'], maxParticipants: 18, currentParticipants: 6 },
];

let records: ServiceRecord[] = [
  { id: uuidv4(), volunteerName: '张伟', activityId: activities[0].id, activityName: '社区英语角', date: '2026-06-10', hours: 3, skills: ['教学'] },
  { id: uuidv4(), volunteerName: '张伟', activityId: activities[1].id, activityName: '老年人IT培训', date: '2026-06-12', hours: 4, skills: ['技术', '教学'] },
  { id: uuidv4(), volunteerName: '李娜', activityId: activities[3].id, activityName: '社区海报设计', date: '2026-06-11', hours: 2.5, skills: ['设计'] },
];

app.get('/api/volunteers', (_req: Request, res: Response) => {
  res.json(volunteers);
});

app.get('/api/activities', (_req: Request, res: Response) => {
  res.json(activities);
});

app.get('/api/records', (_req: Request, res: Response) => {
  res.json(records);
});

app.post('/api/records', (req: Request, res: Response) => {
  const { volunteerName, activityId, date, hours, skills } = req.body;

  if (!volunteerName || !activityId || !date || !hours || !skills) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const activity = activities.find((a) => a.id === activityId);
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const newRecord: ServiceRecord = {
    id: uuidv4(),
    volunteerName,
    activityId,
    activityName: activity.name,
    date,
    hours: Number(hours),
    skills,
  };

  records = [...records, newRecord];

  activity.currentParticipants = Math.min(activity.currentParticipants + 1, activity.maxParticipants);

  let volunteer = volunteers.find((v) => v.name === volunteerName);
  if (!volunteer) {
    volunteer = { id: uuidv4(), name: volunteerName, skills: [] };
    volunteers.push(volunteer);
  }
  const skillSet = new Set([...volunteer.skills, ...skills]);
  volunteer.skills = Array.from(skillSet) as Skill[];

  res.status(201).json(newRecord);
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
