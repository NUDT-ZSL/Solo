import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

interface Paper {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  authors: string[];
  reviewerIds: string[];
}

interface Reviewer {
  id: string;
  name: string;
  email: string;
  expertise: string[];
}

interface ScoreItem {
  innovation: number;
  technicalDepth: number;
  experimentalCompleteness: number;
  writingQuality: number;
}

interface ReviewScore {
  id: string;
  paperId: string;
  reviewerId: string;
  scores: ScoreItem;
  comment: string;
  submitted: boolean;
  arbitratedScores: ScoreItem | null;
  isArbitrated: boolean;
}

interface ConflictFlag {
  paperId: string;
  dimension: string;
  reviewerIds: string[];
  scoreValues: number[];
  resolved: boolean;
  arbitratedScore: number | null;
}

let papers: Paper[] = [
  {
    id: 'p1',
    title: 'Deep Reinforcement Learning for Autonomous Navigation',
    abstract: 'This paper presents a novel deep reinforcement learning approach for autonomous navigation in complex urban environments. Our method combines hierarchical policy optimization with attention-based scene understanding to achieve state-of-the-art performance on multiple benchmark datasets.',
    keywords: ['reinforcement learning', 'autonomous navigation', 'deep learning', 'robotics'],
    authors: ['Zhang Wei', 'Li Ming'],
    reviewerIds: [],
  },
  {
    id: 'p2',
    title: 'Transformer-based Code Generation with Type Awareness',
    abstract: 'We propose a transformer architecture enhanced with type-aware attention mechanisms for automatic code generation. The model leverages static type information to produce more syntactically and semantically correct code, reducing error rates by 35% compared to baseline approaches.',
    keywords: ['transformer', 'code generation', 'type systems', 'NLP'],
    authors: ['Wang Fang', 'Chen Lei'],
    reviewerIds: [],
  },
  {
    id: 'p3',
    title: 'Federated Learning under Non-IID Data Distribution',
    abstract: 'This work addresses the challenge of non-IID data in federated learning systems. We introduce a dynamic clustering framework that adaptively groups clients with similar data distributions, significantly improving convergence speed and model accuracy across heterogeneous devices.',
    keywords: ['federated learning', 'non-IID', 'distributed systems', 'privacy'],
    authors: ['Liu Yang', 'Zhao Jun'],
    reviewerIds: [],
  },
  {
    id: 'p4',
    title: 'Graph Neural Networks for Molecular Property Prediction',
    abstract: 'We present a novel graph neural network architecture specifically designed for molecular property prediction. Our approach incorporates edge-level attention and multi-scale message passing to capture both local and global chemical structures, achieving superior performance on MoleculeNet benchmarks.',
    keywords: ['graph neural networks', 'molecular prediction', 'cheminformatics', 'drug discovery'],
    authors: ['Sun Hui', 'Zhou Peng'],
    reviewerIds: [],
  },
  {
    id: 'p5',
    title: 'Efficient Attention Mechanisms for Long-Document Summarization',
    abstract: 'This paper introduces an efficient sparse attention mechanism for summarizing long documents. By combining local windowed attention with global sentinel tokens, our model processes documents of up to 32K tokens with linear memory complexity while maintaining competitive ROUGE scores.',
    keywords: ['attention mechanism', 'summarization', 'efficient NLP', 'sparse attention'],
    authors: ['Huang Xin', 'Xu Rui'],
    reviewerIds: [],
  },
];

let reviewers: Reviewer[] = [
  { id: 'r1', name: 'Dr. Alice Chen', email: 'alice@university.edu', expertise: ['reinforcement learning', 'deep learning', 'robotics'] },
  { id: 'r2', name: 'Dr. Bob Smith', email: 'bob@research.org', expertise: ['transformer', 'NLP', 'code generation'] },
  { id: 'r3', name: 'Dr. Carol Wang', email: 'carol@institute.edu', expertise: ['federated learning', 'distributed systems', 'privacy'] },
  { id: 'r4', name: 'Dr. David Liu', email: 'david@lab.org', expertise: ['graph neural networks', 'molecular prediction', 'drug discovery'] },
  { id: 'r5', name: 'Dr. Eva Zhou', email: 'eva@university.edu', expertise: ['attention mechanism', 'summarization', 'efficient NLP'] },
  { id: 'r6', name: 'Dr. Frank Zhang', email: 'frank@research.edu', expertise: ['deep learning', 'autonomous navigation', 'computer vision'] },
];

let scores: ReviewScore[] = [];
let conflicts: ConflictFlag[] = [];

app.get('/api/papers', (_req, res) => {
  res.json(papers);
});

app.post('/api/papers', (req, res) => {
  const { title, abstract, keywords, authors } = req.body;
  if (!title || !abstract || !keywords || !authors) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const paper: Paper = {
    id: uuidv4(),
    title,
    abstract,
    keywords,
    authors,
    reviewerIds: [],
  };
  papers.push(paper);
  res.status(201).json(paper);
});

app.put('/api/papers/:id/assign', (req, res) => {
  const { id } = req.params;
  const { reviewerIds } = req.body;
  const paper = papers.find((p) => p.id === id);
  if (!paper) {
    res.status(404).json({ error: 'Paper not found' });
    return;
  }
  paper.reviewerIds = reviewerIds;
  res.json(paper);
});

app.post('/api/papers/batch-assign', (req, res) => {
  const { assignments } = req.body as { assignments: { paperId: string; reviewerIds: string[] }[] };
  const results: Paper[] = [];
  for (const a of assignments) {
    const paper = papers.find((p) => p.id === a.paperId);
    if (paper) {
      paper.reviewerIds = a.reviewerIds;
      results.push(paper);
    }
  }
  res.json(results);
});

app.get('/api/reviewers', (_req, res) => {
  res.json(reviewers);
});

app.post('/api/reviewers', (req, res) => {
  const { name, email, expertise } = req.body;
  if (!name || !email || !expertise) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const reviewer: Reviewer = {
    id: uuidv4(),
    name,
    email,
    expertise,
  };
  reviewers.push(reviewer);
  res.status(201).json(reviewer);
});

app.get('/api/reviewers/:id/papers', (req, res) => {
  const { id } = req.params;
  const assigned = papers.filter((p) => p.reviewerIds.includes(id));
  res.json(assigned);
});

app.get('/api/scores', (_req, res) => {
  res.json(scores);
});

app.get('/api/scores/paper/:paperId', (req, res) => {
  const { paperId } = req.params;
  const paperScores = scores.filter((s) => s.paperId === paperId);
  res.json(paperScores);
});

app.post('/api/scores', (req, res) => {
  const { paperId, reviewerId, scores: scoreValues, comment } = req.body;
  const existing = scores.find((s) => s.paperId === paperId && s.reviewerId === reviewerId);
  if (existing) {
    existing.scores = scoreValues;
    existing.comment = comment;
    existing.submitted = true;
    checkConflicts(paperId);
    res.json(existing);
    return;
  }
  const score: ReviewScore = {
    id: uuidv4(),
    paperId,
    reviewerId,
    scores: scoreValues,
    comment,
    submitted: true,
    arbitratedScores: null,
    isArbitrated: false,
  };
  scores.push(score);
  checkConflicts(paperId);
  res.status(201).json(score);
});

app.put('/api/scores/:id/arbitrate', (req, res) => {
  const { id } = req.params;
  const { arbitratedScores } = req.body;
  const score = scores.find((s) => s.id === id);
  if (!score) {
    res.status(404).json({ error: 'Score not found' });
    return;
  }
  score.arbitratedScores = arbitratedScores;
  score.isArbitrated = true;
  res.json(score);
});

app.get('/api/conflicts', (_req, res) => {
  res.json(conflicts);
});

app.get('/api/conflicts/paper/:paperId', (req, res) => {
  const { paperId } = req.params;
  const paperConflicts = conflicts.filter((c) => c.paperId === paperId);
  res.json(paperConflicts);
});

app.put('/api/conflicts/:paperId/:dimension/resolve', (req, res) => {
  const { paperId, dimension } = req.params;
  const { arbitratedScore } = req.body;
  const conflict = conflicts.find(
    (c) => c.paperId === paperId && c.dimension === dimension && !c.resolved
  );
  if (!conflict) {
    res.status(404).json({ error: 'Conflict not found' });
    return;
  }
  conflict.resolved = true;
  conflict.arbitratedScore = arbitratedScore;
  const paperScores = scores.filter((s) => s.paperId === paperId);
  for (const s of paperScores) {
    if (!s.arbitratedScores) {
      s.arbitratedScores = { ...s.scores };
    }
    const dim = dimension as keyof ScoreItem;
    s.arbitratedScores[dim] = arbitratedScore;
    s.isArbitrated = true;
  }
  res.json(conflict);
});

function checkConflicts(paperId: string): void {
  const paperScores = scores.filter((s) => s.paperId === paperId && s.submitted);
  if (paperScores.length < 2) return;
  const dimensions: (keyof ScoreItem)[] = [
    'innovation',
    'technicalDepth',
    'experimentalCompleteness',
    'writingQuality',
  ];
  for (const dim of dimensions) {
    const vals = paperScores.map((s) => s.scores[dim]);
    const maxDiff = Math.max(...vals) - Math.min(...vals);
    if (maxDiff > 5) {
      const existing = conflicts.find(
        (c) => c.paperId === paperId && c.dimension === dim && !c.resolved
      );
      if (!existing) {
        conflicts.push({
          paperId,
          dimension: dim,
          reviewerIds: paperScores.map((s) => s.reviewerId),
          scoreValues: vals,
          resolved: false,
          arbitratedScore: null,
        });
      } else {
        existing.scoreValues = vals;
      }
    } else {
      const idx = conflicts.findIndex(
        (c) => c.paperId === paperId && c.dimension === dim && !c.resolved
      );
      if (idx >= 0) {
        conflicts.splice(idx, 1);
      }
    }
  }
}

app.get('/api/summary', (_req, res) => {
  const weights = { innovation: 0.3, technicalDepth: 0.25, experimentalCompleteness: 0.25, writingQuality: 0.2 };
  const summary = papers.map((paper) => {
    const paperScores = scores.filter((s) => s.paperId === paper.id && s.submitted);
    const paperConflicts = conflicts.filter((c) => c.paperId === paper.id && !c.resolved);
    if (paperScores.length === 0) {
      return {
        paperId: paper.id,
        title: paper.title,
        totalScore: 0,
        scoreBreakdown: { innovation: 0, technicalDepth: 0, experimentalCompleteness: 0, writingQuality: 0 },
        reviewerCount: 0,
        conflicts: paperConflicts,
      };
    }
    const avgScores: ScoreItem = {
      innovation: 0,
      technicalDepth: 0,
      experimentalCompleteness: 0,
      writingQuality: 0,
    };
    const dims: (keyof ScoreItem)[] = ['innovation', 'technicalDepth', 'experimentalCompleteness', 'writingQuality'];
    for (const dim of dims) {
      const effectiveScores = paperScores.map((s) => {
        if (s.isArbitrated && s.arbitratedScores) {
          return s.arbitratedScores[dim];
        }
        return s.scores[dim];
      });
      const conflictForDim = paperConflicts.find((c) => c.dimension === dim);
      if (conflictForDim && conflictForDim.arbitratedScore !== null) {
        avgScores[dim] = conflictForDim.arbitratedScore;
      } else {
        avgScores[dim] = effectiveScores.reduce((a: number, b: number) => a + b, 0) / effectiveScores.length;
      }
    }
    const totalScore =
      avgScores.innovation * weights.innovation +
      avgScores.technicalDepth * weights.technicalDepth +
      avgScores.experimentalCompleteness * weights.experimentalCompleteness +
      avgScores.writingQuality * weights.writingQuality;
    return {
      paperId: paper.id,
      title: paper.title,
      totalScore: Math.round(totalScore * 100) / 100,
      scoreBreakdown: {
        innovation: Math.round(avgScores.innovation * 100) / 100,
        technicalDepth: Math.round(avgScores.technicalDepth * 100) / 100,
        experimentalCompleteness: Math.round(avgScores.experimentalCompleteness * 100) / 100,
        writingQuality: Math.round(avgScores.writingQuality * 100) / 100,
      },
      reviewerCount: paperScores.length,
      conflicts: paperConflicts,
    };
  });
  summary.sort((a, b) => b.totalScore - a.totalScore);
  res.json(summary);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
