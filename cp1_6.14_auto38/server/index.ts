import express, { Request, Response } from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

interface Member {
  id: string;
  name: string;
  pinyin: string;
  instrument: string;
}

interface Assignment {
  memberId: string;
  part: string;
  status: 'confirmed' | 'pending' | 'adjust_request' | 'leave';
  adjustNote?: string;
}

interface Track {
  id: string;
  title: string;
  key: string;
  difficulty: 'easy' | 'medium' | 'hard';
  defaultParts: string[];
  assignments: Assignment[];
}

interface Project {
  id: string;
  title: string;
  date: string;
  venue: string;
  tracks: Track[];
  schedule: ScheduleSlot[];
  createdAt: string;
}

interface ScheduleSlot {
  id: string;
  dayIndex: number;
  timeSlot: number;
  memberId: string;
  part: string;
  projectId: string;
}

interface Feedback {
  id: string;
  projectId: string;
  memberId: string;
  rating: number;
  note: string;
  part: string;
  createdAt: string;
}

interface AdjustRequest {
  id: string;
  projectId: string;
  trackId: string;
  memberId: string;
  currentPart: string;
  requestedPart: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface Data {
  projects: Project[];
  members: Member[];
  feedbacks: Feedback[];
  adjustRequests: AdjustRequest[];
}

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const defaultData: Data = {
  projects: [
    {
      id: uuidv4(),
      title: '2026春季音乐会',
      date: '2026-06-20',
      venue: '音乐厅',
      createdAt: '2026-06-01',
      tracks: [
        {
          id: uuidv4(),
          title: 'D大调卡农',
          key: 'D大调',
          difficulty: 'medium',
          defaultParts: ['第一小提琴', '第二小提琴', '大提琴', '低音提琴'],
          assignments: [
            { memberId: 'm1', part: '第一小提琴', status: 'confirmed' },
            { memberId: 'm2', part: '第二小提琴', status: 'confirmed' },
            { memberId: 'm3', part: '大提琴', status: 'pending' },
            { memberId: 'm4', part: '低音提琴', status: 'adjust_request', adjustNote: '希望改拉大提琴' },
          ],
        },
        {
          id: uuidv4(),
          title: '蓝色多瑙河',
          key: 'D大调',
          difficulty: 'hard',
          defaultParts: ['第一小提琴', '第二小提琴', '中提琴', '大提琴', '长笛'],
          assignments: [
            { memberId: 'm1', part: '第一小提琴', status: 'confirmed' },
            { memberId: 'm5', part: '长笛', status: 'confirmed' },
            { memberId: 'm6', part: '中提琴', status: 'leave' },
          ],
        },
      ],
      schedule: [],
    },
  ],
  members: [
    { id: 'm1', name: '张明', pinyin: 'zhangming', instrument: '小提琴' },
    { id: 'm2', name: '李华', pinyin: 'lihua', instrument: '小提琴' },
    { id: 'm3', name: '王芳', pinyin: 'wangfang', instrument: '大提琴' },
    { id: 'm4', name: '赵强', pinyin: 'zhaoqiang', instrument: '低音提琴' },
    { id: 'm5', name: '陈静', pinyin: 'chenjing', instrument: '长笛' },
    { id: 'm6', name: '刘伟', pinyin: 'liuwei', instrument: '中提琴' },
  ],
  feedbacks: [],
  adjustRequests: [],
};

const adapter = new JSONFile<Data>('db.json');
const db = new Low(adapter, defaultData);

await db.write();

app.get('/api/projects', async (_req: Request, res: Response) => {
  await db.read();
  res.json(db.data.projects);
});

app.get('/api/projects/:id', async (req: Request, res: Response) => {
  await db.read();
  const project = db.data.projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: '项目不存在' });
  res.json(project);
});

app.post('/api/projects', async (req: Request, res: Response) => {
  await db.read();
  const newProject: Project = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString().split('T')[0],
    schedule: [],
    tracks: req.body.tracks.map((t: Partial<Track>) => ({
      ...t,
      id: uuidv4(),
      assignments: [],
    })),
  };
  db.data.projects.push(newProject);
  await db.write();
  res.status(201).json(newProject);
});

app.put('/api/projects/:id', async (req: Request, res: Response) => {
  await db.read();
  const index = db.data.projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '项目不存在' });
  db.data.projects[index] = { ...db.data.projects[index], ...req.body };
  await db.write();
  res.json(db.data.projects[index]);
});

app.get('/api/tracks', async (_req: Request, res: Response) => {
  await db.read();
  const tracks = db.data.projects.flatMap((p) => p.tracks);
  res.json(tracks);
});

app.get('/api/members', async (_req: Request, res: Response) => {
  await db.read();
  res.json(db.data.members);
});

app.post('/api/members', async (req: Request, res: Response) => {
  await db.read();
  const newMember: Member = {
    id: uuidv4(),
    ...req.body,
  };
  db.data.members.push(newMember);
  await db.write();
  res.status(201).json(newMember);
});

app.put('/api/projects/:projectId/tracks/:trackId/assignments/:memberId', async (req: Request, res: Response) => {
  await db.read();
  const project = db.data.projects.find((p) => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: '项目不存在' });
  
  const track = project.tracks.find((t) => t.id === req.params.trackId);
  if (!track) return res.status(404).json({ error: '曲目不存在' });

  const assignmentIndex = track.assignments.findIndex((a) => a.memberId === req.params.memberId);
  if (assignmentIndex === -1) {
    track.assignments.push({
      memberId: req.params.memberId,
      ...req.body,
    });
  } else {
    track.assignments[assignmentIndex] = {
      ...track.assignments[assignmentIndex],
      ...req.body,
    };
  }

  if (req.body.status === 'adjust_request') {
    const adjustRequest: AdjustRequest = {
      id: uuidv4(),
      projectId: req.params.projectId,
      trackId: req.params.trackId,
      memberId: req.params.memberId,
      currentPart: track.assignments[assignmentIndex].part,
      requestedPart: req.body.requestedPart || '',
      reason: req.body.adjustNote || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.data.adjustRequests.push(adjustRequest);
  }

  await db.write();
  res.json(track.assignments);
});

app.get('/api/adjust-requests', async (_req: Request, res: Response) => {
  await db.read();
  const requests = db.data.adjustRequests.map((r) => {
    const member = db.data.members.find((m) => m.id === r.memberId);
    const project = db.data.projects.find((p) => p.id === r.projectId);
    const track = project?.tracks.find((t) => t.id === r.trackId);
    return { ...r, memberName: member?.name, projectTitle: project?.title, trackTitle: track?.title };
  });
  res.json(requests);
});

app.put('/api/adjust-requests/:id', async (req: Request, res: Response) => {
  await db.read();
  const request = db.data.adjustRequests.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: '请求不存在' });

  request.status = req.body.status;

  if (req.body.status === 'approved') {
    const project = db.data.projects.find((p) => p.id === request.projectId);
    const track = project?.tracks.find((t) => t.id === request.trackId);
    const assignment = track?.assignments.find((a) => a.memberId === request.memberId);
    if (assignment) {
      assignment.part = request.requestedPart;
      assignment.status = 'confirmed';
      assignment.adjustNote = undefined;
    }
  }

  await db.write();
  res.json(request);
});

app.post('/api/schedule/:projectId', async (req: Request, res: Response) => {
  await db.read();
  const project = db.data.projects.find((p) => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: '项目不存在' });

  project.schedule = req.body;
  await db.write();
  res.json(project.schedule);
});

app.get('/api/schedule/:projectId', async (req: Request, res: Response) => {
  await db.read();
  const project = db.data.projects.find((p) => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: '项目不存在' });
  res.json(project.schedule);
});

app.get('/api/feedbacks/:projectId', async (req: Request, res: Response) => {
  await db.read();
  const feedbacks = db.data.feedbacks.filter((f) => f.projectId === req.params.projectId);
  const result = feedbacks.map((f) => {
    const member = db.data.members.find((m) => m.id === f.memberId);
    return { ...f, memberName: member?.name };
  });
  res.json(result);
});

app.post('/api/feedbacks', async (req: Request, res: Response) => {
  await db.read();
  const newFeedback: Feedback = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  db.data.feedbacks.push(newFeedback);
  await db.write();
  res.status(201).json(newFeedback);
});

app.get('/api/search', async (req: Request, res: Response) => {
  await db.read();
  const query = (req.query.q as string).toLowerCase();
  const results: Array<{ type: string; id: string; title: string; subtitle: string }> = [];

  db.data.projects.forEach((p) => {
    if (p.title.toLowerCase().includes(query)) {
      results.push({ type: 'project', id: p.id, title: p.title, subtitle: `${p.date} · ${p.venue}` });
    }
  });

  db.data.projects.forEach((p) => {
    p.tracks.forEach((t) => {
      if (t.title.toLowerCase().includes(query)) {
        results.push({ type: 'track', id: p.id, title: t.title, subtitle: `曲目 · ${p.title}` });
      }
    });
  });

  db.data.members.forEach((m) => {
    if (m.name.toLowerCase().includes(query) || m.pinyin.toLowerCase().includes(query) || m.pinyin[0]?.toLowerCase() === query[0]) {
      results.push({ type: 'member', id: m.id, title: m.name, subtitle: `${m.instrument} · 成员` });
    }
  });

  res.json(results);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
