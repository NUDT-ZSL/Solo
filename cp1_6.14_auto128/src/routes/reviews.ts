import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Review, DeadlineConfig } from '../types.js';

const router = Router();

const reviews: Review[] = [
  {
    id: 'rev-1',
    submissionId: 'sub-1',
    reviewerId: 'student-2',
    rating: 4,
    comment: '整体设计不错，色彩搭配很和谐，但是字体可以再大一些。',
    createdAt: '2024-01-16T09:00:00Z',
  },
  {
    id: 'rev-2',
    submissionId: 'sub-1',
    reviewerId: 'student-3',
    rating: 5,
    comment: '很有创意的设计！构图很棒，色彩搭配专业。',
    createdAt: '2024-01-16T10:30:00Z',
  },
  {
    id: 'rev-3',
    submissionId: 'sub-2',
    reviewerId: 'student-1',
    rating: 4,
    comment: '设计风格现代，但是排版可以再优化一下。',
    createdAt: '2024-01-16T11:00:00Z',
  },
  {
    id: 'rev-4',
    submissionId: 'sub-2',
    reviewerId: 'student-3',
    rating: 3,
    comment: '中规中矩，还需要更多创意元素。',
    createdAt: '2024-01-16T12:00:00Z',
  },
  {
    id: 'rev-5',
    submissionId: 'sub-3',
    reviewerId: 'student-1',
    rating: 5,
    comment: '非常棒的抽象设计，色彩渐变很流畅！',
    createdAt: '2024-01-16T13:00:00Z',
  },
  {
    id: 'rev-6',
    submissionId: 'sub-3',
    reviewerId: 'student-2',
    rating: 4,
    comment: '创意十足，但信息传达可以更清晰一些。',
    createdAt: '2024-01-16T14:00:00Z',
  },
];

const deadlines: DeadlineConfig[] = [
  {
    classId: 'class-001',
    assignmentId: 'assign-001',
    startDate: '2024-01-10',
    endDate: '2024-12-31',
    isLocked: false,
  },
];

const checkDeadlineLock = () => {
  const now = new Date();
  deadlines.forEach((d) => {
    const endDate = new Date(d.endDate);
    if (now > endDate && !d.isLocked) {
      d.isLocked = true;
      console.log(
        `[Deadline Locked] 班级 ${d.classId} 作业 ${d.assignmentId} 评分已截止，发送邮件通知...`
      );
    }
  });
};

setInterval(checkDeadlineLock, 60000);

router.get('/submission/:submissionId', (req, res) => {
  const { submissionId } = req.params;
  const submissionReviews = reviews.filter(
    (r) => r.submissionId === submissionId
  );

  res.json(submissionReviews);
});

router.get('/stats/:submissionId', (req, res) => {
  const { submissionId } = req.params;
  const submissionReviews = reviews.filter(
    (r) => r.submissionId === submissionId
  );

  if (submissionReviews.length === 0) {
    return res.json({ avgRating: 0, reviewCount: 0 });
  }

  const total = submissionReviews.reduce((sum, r) => sum + r.rating, 0);
  const avg = total / submissionReviews.length;

  res.json({
    avgRating: Math.round(avg * 10) / 10,
    reviewCount: submissionReviews.length,
  });
});

router.get('/aggregate/all', (_req, res) => {
  const statsMap = new Map<
    string,
    { submissionId: string; avgRating: number; reviewCount: number }
  >();

  reviews.forEach((review) => {
    const existing = statsMap.get(review.submissionId);
    if (existing) {
      existing.avgRating =
        (existing.avgRating * existing.reviewCount + review.rating) /
        (existing.reviewCount + 1);
      existing.reviewCount += 1;
    } else {
      statsMap.set(review.submissionId, {
        submissionId: review.submissionId,
        avgRating: review.rating,
        reviewCount: 1,
      });
    }
  });

  const result = Array.from(statsMap.values()).map((s) => ({
    ...s,
    avgRating: Math.round(s.avgRating * 10) / 10,
  }));

  result.sort((a, b) => b.avgRating - a.avgRating);

  const ranked = result.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  res.json(ranked);
});

router.get('/deadline', (req, res) => {
  const { classId, assignmentId } = req.query;
  const config = deadlines.find(
    (d) => d.classId === classId && d.assignmentId === assignmentId
  );

  if (!config) {
    return res.json({
      classId,
      assignmentId,
      startDate: '',
      endDate: '',
      isLocked: false,
    });
  }

  res.json(config);
});

router.post('/deadline', (req, res) => {
  const { classId, assignmentId, startDate, endDate } = req.body;

  const existingIndex = deadlines.findIndex(
    (d) => d.classId === classId && d.assignmentId === assignmentId
  );

  const config: DeadlineConfig = {
    classId,
    assignmentId,
    startDate,
    endDate,
    isLocked: false,
  };

  if (existingIndex >= 0) {
    deadlines[existingIndex] = config;
  } else {
    deadlines.push(config);
  }

  console.log(
    `[Deadline Set] 班级 ${classId} 作业 ${assignmentId} 评分时间: ${startDate} ~ ${endDate}`
  );

  res.json(config);
});

router.post('/', (req, res) => {
  const { submissionId, reviewerId, rating, comment } = req.body;

  if (!submissionId || !reviewerId || !rating) {
    return res.status(400).json({ error: '缺少必要信息' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }

  const existing = reviews.find(
    (r) => r.submissionId === submissionId && r.reviewerId === reviewerId
  );

  if (existing) {
    existing.rating = rating;
    existing.comment = comment || '';
    existing.createdAt = new Date().toISOString();
    return res.json(existing);
  }

  const review: Review = {
    id: uuidv4(),
    submissionId,
    reviewerId,
    rating,
    comment: comment || '',
    createdAt: new Date().toISOString(),
  };

  reviews.push(review);

  res.status(201).json(review);
});

export default router;
