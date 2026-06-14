import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Submission } from '../types.js';

const router = Router();

const submissions: Submission[] = [
  {
    id: 'sub-1',
    userId: 'student-1',
    userNickname: '小明',
    classId: 'class-001',
    assignmentId: 'assign-001',
    title: '第一周作业：海报设计',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=creative%20poster%20design%20with%20blue%20and%20yellow%20colors%20minimalist%20style&image_size=square_hd',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'sub-2',
    userId: 'student-2',
    userNickname: '小红',
    classId: 'class-001',
    assignmentId: 'assign-001',
    title: '第一周作业：海报设计',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20poster%20design%20with%20warm%20colors%20geometric%20shapes&image_size=square_hd',
    createdAt: '2024-01-15T11:20:00Z',
  },
  {
    id: 'sub-3',
    userId: 'student-3',
    userNickname: '小华',
    classId: 'class-001',
    assignmentId: 'assign-001',
    title: '第一周作业：海报设计',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20poster%20design%20with%20gradient%20colors%20clean%20layout&image_size=square_hd',
    createdAt: '2024-01-15T14:00:00Z',
  },
];

router.get('/', (req, res) => {
  const { classId, assignmentId } = req.query;

  let filtered = submissions;

  if (classId) {
    filtered = filtered.filter((s) => s.classId === classId);
  }

  if (assignmentId) {
    filtered = filtered.filter((s) => s.assignmentId === assignmentId);
  }

  filtered.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json(filtered);
});

router.get('/:id', (req, res) => {
  const submission = submissions.find((s) => s.id === req.params.id);

  if (!submission) {
    return res.status(404).json({ error: '作业不存在' });
  }

  res.json(submission);
});

router.post('/', (req, res) => {
  const { userId, userNickname, classId, assignmentId, title, imageUrl } =
    req.body;

  if (!userId || !classId || !assignmentId || !imageUrl) {
    return res.status(400).json({ error: '缺少必要信息' });
  }

  const submission: Submission = {
    id: uuidv4(),
    userId,
    userNickname: userNickname || '匿名学员',
    classId,
    assignmentId,
    title: title || '作业提交',
    imageUrl,
    createdAt: new Date().toISOString(),
  };

  submissions.unshift(submission);

  res.status(201).json(submission);
});

export default router;
