/**
 * ============================================================
 *  Express 后端服务层
 * ============================================================
 *
 *  调用关系:
 *    ├── 被调用方 (上游):
 *    │   └── 前端通过 src/api.ts -> fetch('/api/*') 请求本文件提供的接口
 *    └── 调用方 (下游):
 *        └── 操作内存数组 ideas (持久化层, 此处为简化模拟)
 *
 *  数据流向:
 *    前端 fetch POST/GET
 *        │
 *        ▼
 *    Express 路由处理器 (按类型校验 body/query)
 *        │
 *        ▼
 *    内存数组 ideas[] (读/写/过滤/排序)
 *        │
 *        ▼
 *    res.json() 返回 JSON 数据 -> 前端 api.ts 解析 -> 组件更新渲染
 *
 *  提供的 RESTful API:
 *    GET  /api/ideas?date=YYYY-MM-DD    获取所有Idea (可选按日期过滤)
 *    POST /api/ideas                    创建新Idea (含voiceBase64语音存储)
 *    GET  /api/members                  获取去重的成员姓名列表
 * ============================================================
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import cuid from 'cuid';
import type { Idea, IdeaType } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * 内存存储 - Idea 列表
 * 实际生产环境应替换为数据库 (MySQL/MongoDB/PostgreSQL等)
 */
let ideas: Idea[] = [];

/**
 * 校验IdeaType是否为合法值
 */
function isValidIdeaType(t: unknown): t is IdeaType {
  return t === 'progress' || t === 'blocker' || t === 'plan';
}

/**
 * GET /api/ideas
 * 获取所有Idea列表, 支持按日期过滤 (?date=YYYY-MM-DD)
 * 返回结果按时间戳逆序 (最新的在前)
 */
app.get('/api/ideas', (req: Request, res: Response) => {
  const { date } = req.query;
  let filteredIdeas = [...ideas];

  if (date && typeof date === 'string') {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    filteredIdeas = filteredIdeas.filter((idea) => {
      const ideaDate = new Date(idea.timestamp);
      return ideaDate >= targetDate && ideaDate < nextDate;
    });
  }

  filteredIdeas.sort((a, b) => b.timestamp - a.timestamp);
  res.json(filteredIdeas);
});

/**
 * POST /api/ideas
 * 创建新的Idea
 * Body: { memberName, content, type, voiceBase64? }
 *  - voiceBase64: 前端通过 Web Audio API 录制的语音文件, 以 base64 格式上传
 *                 后端将其存入 Idea.voiceUrl 字段, 前端通过 Audio(src=base64) 播放
 */
app.post('/api/ideas', (req: Request, res: Response) => {
  const { memberName, content, type, voiceBase64 } = req.body;

  if (!memberName || !content || !type) {
    return res.status(400).json({ error: '缺少必填字段: memberName, content, type' });
  }

  if (!isValidIdeaType(type)) {
    return res.status(400).json({ error: 'type 必须是 progress, blocker 或 plan' });
  }

  const newIdea: Idea = {
    id: cuid(),
    memberName: String(memberName),
    content: String(content),
    type: type as IdeaType,
    timestamp: Date.now(),
  };

  // 语音以 base64 字符串形式存储在 voiceUrl 字段中
  // 前端播放时直接将此 base64 作为 Audio 对象的 src
  if (voiceBase64 && typeof voiceBase64 === 'string') {
    newIdea.voiceUrl = voiceBase64;
  }

  ideas.push(newIdea);
  res.status(201).json(newIdea);
});

/**
 * GET /api/members
 * 获取已提交过 Idea 的所有成员姓名 (去重)
 * 用于前端姓名输入框的自动补齐候选列表
 */
app.get('/api/members', (_req: Request, res: Response) => {
  const memberSet = new Set<string>();
  ideas.forEach((idea) => memberSet.add(idea.memberName));
  res.json(Array.from(memberSet));
});

app.listen(PORT, () => {
  console.log(`声流站会后端服务已启动: http://localhost:${PORT}`);
  console.log(`  - GET  /api/ideas       获取所有动态`);
  console.log(`  - POST /api/ideas       创建新动态 (含语音)`);
  console.log(`  - GET  /api/members     获取成员列表 (自动补齐)`);
});
