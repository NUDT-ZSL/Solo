import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
  Activity,
  CreateActivityRequest,
  VoteRequest,
  CommentRequest,
  ScheduleRecommendation,
  TimeOption,
  Vote,
} from './types';

const app = express();
app.use(express.json());

const PORT = 3000;

let activities: Activity[] = [
  {
    id: 'demo-1',
    name: '周末户外徒步',
    description: '组织社区成员一起去郊外徒步，享受大自然，增进邻里感情。',
    creator: '张小明',
    deadline: Date.now() + 2 * 24 * 60 * 60 * 1000,
    location: '城市森林公园南门',
    timeOptions: [
      { id: 'opt-1', date: '2026-06-14', startTime: '08:00', endTime: '12:00', name: '周六上午', votes: 5 },
      { id: 'opt-2', date: '2026-06-14', startTime: '14:00', endTime: '18:00', name: '周六下午', votes: 3 },
      { id: 'opt-3', date: '2026-06-15', startTime: '09:00', endTime: '13:00', name: '周日上午', votes: 7 },
      { id: 'opt-4', date: '2026-06-15', startTime: '15:00', endTime: '19:00', name: '周日下午', votes: 2 },
    ],
    votes: [],
    comments: [
      { id: 'c1', userId: 'u1', userName: '李华', content: '周日上午天气应该不错！', timestamp: Date.now() - 3600000 },
      { id: 'c2', userId: 'u2', userName: '王芳', content: '我周六下午有空', timestamp: Date.now() - 7200000 },
    ],
  },
  {
    id: 'demo-2',
    name: '读书分享会',
    description: '每月一次的读书分享活动，本月主题是科幻文学。',
    creator: '李华',
    deadline: Date.now() + 5 * 24 * 60 * 60 * 1000,
    location: '社区活动中心二楼会议室',
    timeOptions: [
      { id: 'opt-5', date: '2026-06-17', startTime: '19:00', endTime: '21:00', name: '周二晚', votes: 4 },
      { id: 'opt-6', date: '2026-06-18', startTime: '19:00', endTime: '21:00', name: '周三晚', votes: 6 },
      { id: 'opt-7', date: '2026-06-19', startTime: '19:00', endTime: '21:00', name: '周四晚', votes: 3 },
    ],
    votes: [],
    comments: [],
  },
  {
    id: 'demo-3',
    name: '亲子烘焙课',
    description: '邀请专业烘焙老师教大家一起做曲奇饼干，适合带小朋友参加。',
    creator: '王芳',
    deadline: Date.now() - 1 * 60 * 60 * 1000,
    location: '社区厨房',
    timeOptions: [
      { id: 'opt-8', date: '2026-06-21', startTime: '10:00', endTime: '12:00', name: '周六上午场', votes: 8 },
      { id: 'opt-9', date: '2026-06-21', startTime: '14:00', endTime: '16:00', name: '周六下午场', votes: 11 },
      { id: 'opt-10', date: '2026-06-22', startTime: '10:00', endTime: '12:00', name: '周日上午场', votes: 5 },
    ],
    votes: [],
    comments: [
      { id: 'c3', userId: 'u3', userName: '张伟', content: '下午场时间更充裕', timestamp: Date.now() - 86400000 },
    ],
    recommendedOptionId: 'opt-9',
  },
];

function hasTimeConflict(options1: TimeOption[], options2: TimeOption[]): boolean {
  for (const opt1 of options1) {
    for (const opt2 of options2) {
      if (opt1.date === opt2.date) {
        const start1 = parseInt(opt1.startTime.replace(':', ''));
        const end1 = parseInt(opt1.endTime.replace(':', ''));
        const start2 = parseInt(opt2.startTime.replace(':', ''));
        const end2 = parseInt(opt2.endTime.replace(':', ''));
        if (start1 < end2 && start2 < end1) {
          return true;
        }
      }
    }
  }
  return false;
}

function getUserVotes(activity: Activity, userId: string): TimeOption[] {
  const userVoteOptionIds = activity.votes
    .filter((v) => v.userId === userId)
    .map((v) => v.optionId);
  return activity.timeOptions.filter((opt) => userVoteOptionIds.includes(opt.id));
}

app.get('/api/activities', (_req: Request, res: Response) => {
  res.json(activities);
});

app.post('/api/activity', (req: Request, res: Response) => {
  const body: CreateActivityRequest = req.body;
  if (!body.name || !body.description || !body.creator || !body.deadline || !body.location) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  if (!body.timeOptions || body.timeOptions.length < 2) {
    return res.status(400).json({ error: '至少需要两个时间选项' });
  }

  const newActivity: Activity = {
    id: uuidv4(),
    name: body.name,
    description: body.description,
    creator: body.creator,
    deadline: body.deadline,
    location: body.location,
    timeOptions: body.timeOptions.map((opt) => ({
      ...opt,
      id: uuidv4(),
      votes: 0,
    })),
    votes: [],
    comments: [],
  };

  activities.unshift(newActivity);
  res.json(newActivity);
});

app.post('/api/vote', (req: Request, res: Response) => {
  const body: VoteRequest = req.body;
  const activity = activities.find((a) => a.id === body.activityId);

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  if (Date.now() > activity.deadline) {
    return res.status(400).json({ error: '投票已截止' });
  }

  const existingUserVotes = activity.votes.filter((v) => v.userId === body.userId);
  const existingOptionIds = existingUserVotes.map((v) => v.optionId);

  const optionsToRemove = existingOptionIds.filter((id) => !body.optionIds.includes(id));
  optionsToRemove.forEach((optId) => {
    const opt = activity.timeOptions.find((o) => o.id === optId);
    if (opt) opt.votes = Math.max(0, opt.votes - 1);
  });
  activity.votes = activity.votes.filter(
    (v) => !(v.userId === body.userId && optionsToRemove.includes(v.optionId))
  );

  const newOptionIds = body.optionIds.filter((id) => !existingOptionIds.includes(id));
  newOptionIds.forEach((optId) => {
    const opt = activity.timeOptions.find((o) => o.id === optId);
    if (opt) {
      opt.votes += 1;
      activity.votes.push({ optionId: optId, userId: body.userId });
    }
  });

  res.json(activity);
});

app.post('/api/comment', (req: Request, res: Response) => {
  const body: CommentRequest = req.body;
  const activity = activities.find((a) => a.id === body.activityId);

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const newComment = {
    id: uuidv4(),
    userId: body.userId,
    userName: body.userName,
    content: body.content,
    timestamp: Date.now(),
  };

  activity.comments.unshift(newComment);
  res.json(newComment);
});

app.post('/api/activities/schedule', (req: Request, res: Response) => {
  const { activityId } = req.body;
  const activity = activities.find((a) => a.id === activityId);

  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const scores: Record<string, number> = {};
  const conflicts: Record<string, string[]> = {};
  const userVotesMap: Record<string, TimeOption[]> = {};

  activity.votes.forEach((vote) => {
    if (!userVotesMap[vote.userId]) {
      userVotesMap[vote.userId] = getUserVotes(activity, vote.userId);
    }
  });

  activity.timeOptions.forEach((opt) => {
    scores[opt.id] = opt.votes;
    conflicts[opt.id] = [];
  });

  const userIds = Object.keys(userVotesMap);
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      if (hasTimeConflict(userVotesMap[userIds[i]], userVotesMap[userIds[j]])) {
        userVotesMap[userIds[i]].forEach((opt) => {
          if (!conflicts[opt.id].includes(userIds[j])) {
            conflicts[opt.id].push(userIds[j]);
          }
        });
        userVotesMap[userIds[j]].forEach((opt) => {
          if (!conflicts[opt.id].includes(userIds[i])) {
            conflicts[opt.id].push(userIds[i]);
          }
        });
      }
    }
  }

  let bestOption: TimeOption | null = null;
  let bestScore = -1;

  activity.timeOptions.forEach((opt) => {
    const adjustedScore = scores[opt.id] - conflicts[opt.id].length * 0.5;
    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestOption = opt;
    }
  });

  if (bestOption) {
    activity.recommendedOptionId = bestOption.id;
  }

  const recommendation: ScheduleRecommendation = {
    activityId,
    recommendedOption: bestOption,
    scores,
    conflicts,
  };

  res.json(recommendation);
});

app.listen(PORT, () => {
  console.log(`活动策划服务已启动: http://localhost:${PORT}`);
});
