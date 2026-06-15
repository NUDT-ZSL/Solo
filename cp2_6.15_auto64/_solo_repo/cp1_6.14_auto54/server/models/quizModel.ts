import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type {
  DatabaseSchema,
  Question,
  Paper,
  Submission,
  AnswerRecord,
  Difficulty,
  QuestionType,
  PaperAnalysis,
  QuestionAnalysis,
  PaperWithQuestions,
} from '../types';

const dbDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbFile = path.join(dbDir, 'db.json');
const adapter = new JSONFile<DatabaseSchema>(dbFile);
const defaultData: DatabaseSchema = {
  questions: [],
  papers: [],
  submissions: [],
  answerRecords: [],
};

let dbInstance: Low<DatabaseSchema> | null = null;

type QuestionIndex = Map<string, Question>;
type PaperIndex = Map<string, Paper>;
type AnswerByPaperIndex = Map<string, AnswerRecord[]>;
type SubmissionByPaperIndex = Map<string, Submission[]>;

const questionIdx: QuestionIndex = new Map();
const paperIdx: PaperIndex = new Map();
const answerByPaperIdx: AnswerByPaperIndex = new Map();
const submissionByPaperIdx: SubmissionByPaperIndex = new Map();
let indexBuilt = false;

function buildIndex(data: DatabaseSchema) {
  if (indexBuilt) return;
  data.questions.forEach((q) => questionIdx.set(q.id, q));
  data.papers.forEach((p) => paperIdx.set(p.id, p));

  for (const rec of data.answerRecords) {
    if (!answerByPaperIdx.has(rec.paperId)) {
      answerByPaperIdx.set(rec.paperId, []);
    }
    answerByPaperIdx.get(rec.paperId)!.push(rec);
  }

  for (const sub of data.submissions) {
    if (!submissionByPaperIdx.has(sub.paperId)) {
      submissionByPaperIdx.set(sub.paperId, []);
    }
    submissionByPaperIdx.get(sub.paperId)!.push(sub);
  }

  indexBuilt = true;
}

function invalidateAllIndex() {
  questionIdx.clear();
  paperIdx.clear();
  answerByPaperIdx.clear();
  submissionByPaperIdx.clear();
  indexBuilt = false;
}

export async function getDb(): Promise<Low<DatabaseSchema>> {
  if (!dbInstance) {
    dbInstance = new Low(adapter, defaultData);
    await dbInstance.read();
    if (!dbInstance.data) {
      dbInstance.data = defaultData;
      await dbInstance.write();
    }
    buildIndex(dbInstance.data);
  }
  return dbInstance;
}

export const questionModel = {
  async list(filter?: { knowledgePoint?: string; difficulty?: Difficulty; type?: QuestionType }): Promise<Question[]> {
    const db = await getDb();
    let questions = db.data.questions;
    if (filter?.knowledgePoint) {
      questions = questions.filter((q) => q.knowledgePoint.includes(filter.knowledgePoint!));
    }
    if (filter?.difficulty) {
      questions = questions.filter((q) => q.difficulty === filter.difficulty);
    }
    if (filter?.type) {
      questions = questions.filter((q) => q.type === filter.type);
    }
    return [...questions].sort((a, b) => b.createdAt - a.createdAt);
  },

  async getById(id: string): Promise<Question | null> {
    if (indexBuilt && questionIdx.has(id)) {
      return questionIdx.get(id)!;
    }
    const db = await getDb();
    return db.data.questions.find((q) => q.id === id) || null;
  },

  async getByIds(ids: string[]): Promise<Question[]> {
    if (indexBuilt) {
      return ids.map((id) => questionIdx.get(id)).filter((q): q is Question => !!q);
    }
    const db = await getDb();
    return ids
      .map((id) => db.data.questions.find((q) => q.id === id))
      .filter((q): q is Question => !!q);
  },

  async create(input: Omit<Question, 'id' | 'createdAt'>): Promise<Question> {
    const db = await getDb();
    const question: Question = {
      ...input,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    db.data.questions.push(question);
    questionIdx.set(question.id, question);
    await db.write();
    return question;
  },

  async bulkCreate(inputs: Omit<Question, 'id' | 'createdAt'>[]): Promise<Question[]> {
    const db = await getDb();
    const now = Date.now();
    const created: Question[] = inputs.map((input, idx) => ({
      ...input,
      id: uuidv4(),
      createdAt: now + idx,
    }));
    db.data.questions.push(...created);
    created.forEach((q) => questionIdx.set(q.id, q));
    await db.write();
    return created;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    const before = db.data.questions.length;
    db.data.questions = db.data.questions.filter((q) => q.id !== id);
    questionIdx.delete(id);
    await db.write();
    return db.data.questions.length < before;
  },

  async getKnowledgePoints(): Promise<string[]> {
    const db = await getDb();
    const set = new Set<string>();
    db.data.questions.forEach((q) => set.add(q.knowledgePoint));
    return Array.from(set);
  },

  async getByDifficulty(difficulty: Difficulty): Promise<Question[]> {
    const db = await getDb();
    return db.data.questions.filter((q) => q.difficulty === difficulty);
  },

  async getByKnowledgePoint(kp: string): Promise<Question[]> {
    const db = await getDb();
    return db.data.questions.filter((q) => q.knowledgePoint === kp);
  },

  async rebuildIndex() {
    const db = await getDb();
    invalidateAllIndex();
    buildIndex(db.data);
  },
};

export const paperModel = {
  async list(): Promise<Paper[]> {
    const db = await getDb();
    return [...db.data.papers].sort((a, b) => b.createdAt - a.createdAt);
  },

  async getById(id: string): Promise<PaperWithQuestions | null> {
    const paper = indexBuilt ? paperIdx.get(id) : null;
    if (!paper) {
      const db = await getDb();
      const found = db.data.papers.find((p) => p.id === id);
      if (!found) return null;
      const questions = await questionModel.getByIds(found.questionIds);
      return { ...found, questions };
    }
    const questions = await questionModel.getByIds(paper.questionIds);
    return { ...paper, questions };
  },

  async create(input: {
    title: string;
    selectedQuestionIds: string[];
    duration: number;
    difficultyRatio: { easy: number; medium: number; hard: number };
  }): Promise<Paper> {
    const db = await getDb();
    const allSelected = await questionModel.getByIds(input.selectedQuestionIds);

    const easyPool = allSelected.filter((q) => q.difficulty === 'easy');
    const mediumPool = allSelected.filter((q) => q.difficulty === 'medium');
    const hardPool = allSelected.filter((q) => q.difficulty === 'hard');

    const totalCount = Math.min(allSelected.length, 20);
    const { easy: easyRatio, medium: mediumRatio, hard: hardRatio } = input.difficultyRatio;
    const ratioSum = easyRatio + mediumRatio + hardRatio || 1;

    let easyCount = Math.round((easyRatio / ratioSum) * totalCount);
    let mediumCount = Math.round((mediumRatio / ratioSum) * totalCount);
    let hardCount = totalCount - easyCount - mediumCount;

    if (hardCount < 0) {
      hardCount = 0;
      mediumCount = totalCount - easyCount;
    }

    const pickRandom = <T>(arr: T[], n: number): T[] => {
      const copy = [...arr];
      const result: T[] = [];
      for (let i = 0; i < n && copy.length > 0; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy.splice(idx, 1)[0]);
      }
      return result;
    };

    let picked: Question[] = [];
    if (allSelected.length <= 10) {
      picked = [...allSelected];
    } else {
      const easyPicked = pickRandom(easyPool, Math.min(easyCount, easyPool.length));
      const mediumPicked = pickRandom(mediumPool, Math.min(mediumCount, mediumPool.length));
      const hardPicked = pickRandom(hardPool, Math.min(hardCount, hardPool.length));
      picked = [...easyPicked, ...mediumPicked, ...hardPicked];

      const pickedIds = new Set(picked.map((q) => q.id));
      while (picked.length < totalCount) {
        const remaining = allSelected.filter((q) => !pickedIds.has(q.id));
        if (remaining.length === 0) break;
        const next = remaining[Math.floor(Math.random() * remaining.length)];
        picked.push(next);
        pickedIds.add(next.id);
      }
    }

    picked = picked.sort(() => Math.random() - 0.5);

    const paper: Paper = {
      id: uuidv4(),
      title: input.title,
      questionIds: picked.map((q) => q.id),
      duration: input.duration,
      difficultyRatio: input.difficultyRatio,
      createdAt: Date.now(),
    };
    db.data.papers.push(paper);
    paperIdx.set(paper.id, paper);
    await db.write();
    return paper;
  },
};

export const analysisModel = {
  async getPaperAnalysis(paperId: string): Promise<PaperAnalysis> {
    const db = await getDb();
    const paper = indexBuilt ? paperIdx.get(paperId) : db.data.papers.find((p) => p.id === paperId);

    if (!paper) {
      return { paperId, totalSubmissions: 0, avgTotalScore: 0, questionAnalysis: [] };
    }

    const allRecords = indexBuilt
      ? answerByPaperIdx.get(paperId) || []
      : db.data.answerRecords.filter((r) => r.paperId === paperId);

    const submissions = indexBuilt
      ? submissionByPaperIdx.get(paperId) || []
      : db.data.submissions.filter((s) => s.paperId === paperId);

    const recordsByQuestion = new Map<string, AnswerRecord[]>();
    for (const rec of allRecords) {
      if (!recordsByQuestion.has(rec.questionId)) {
        recordsByQuestion.set(rec.questionId, []);
      }
      recordsByQuestion.get(rec.questionId)!.push(rec);
    }

    const questionAnalysis: QuestionAnalysis[] = paper.questionIds.map((qId, idx) => {
      const qRecords = recordsByQuestion.get(qId) || [];
      const totalAttempts = qRecords.length;

      let correctCount = 0;
      let scoreSum = 0;
      const studentAnswers: QuestionAnalysis['studentAnswers'] = [];

      for (const r of qRecords) {
        scoreSum += r.score;
        if (r.isCorrect) correctCount++;
        studentAnswers.push({
          studentId: r.studentId,
          studentName: r.studentName,
          answer: r.answer,
          score: r.score,
          isCorrect: r.isCorrect,
        });
      }

      const correctRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
      const avgScore = totalAttempts > 0 ? Math.round(scoreSum / totalAttempts) : 0;

      return {
        questionId: qId,
        questionIndex: idx + 1,
        totalAttempts,
        correctCount,
        correctRate,
        avgScore,
        studentAnswers,
      };
    });

    let scoreSum = 0;
    for (const sub of submissions) {
      scoreSum += sub.totalScore;
    }
    const avgTotalScore = submissions.length > 0 ? Math.round(scoreSum / submissions.length) : 0;

    return {
      paperId,
      totalSubmissions: submissions.length,
      avgTotalScore,
      questionAnalysis,
    };
  },

  async getStudentAnswersForQuestion(paperId: string, questionId: string): Promise<AnswerRecord[]> {
    const db = await getDb();
    const allRecords = indexBuilt
      ? answerByPaperIdx.get(paperId) || []
      : db.data.answerRecords.filter((r) => r.paperId === paperId);
    return allRecords.filter((r) => r.questionId === questionId);
  },

  async getStudentSubmission(paperId: string, studentId: string): Promise<Submission | null> {
    const db = await getDb();
    return db.data.submissions.find((s) => s.paperId === paperId && s.studentId === studentId) || null;
  },

  invalidatePaperAnalysis(paperId: string) {
  },
};

export const submissionModel = {
  async listByPaper(paperId: string): Promise<Submission[]> {
    const db = await getDb();
    return db.data.submissions
      .filter((s) => s.paperId === paperId)
      .sort((a, b) => b.submittedAt - a.submittedAt);
  },

  async saveAnswer(record: Omit<AnswerRecord, 'id' | 'submittedAt'>): Promise<AnswerRecord> {
    const db = await getDb();
    const answerRecord: AnswerRecord = {
      ...record,
      id: uuidv4(),
      submittedAt: Date.now(),
    };

    const existingIdx = db.data.answerRecords.findIndex(
      (r) =>
        r.paperId === record.paperId &&
        r.questionId === record.questionId &&
        r.studentId === record.studentId
    );

    if (existingIdx >= 0) {
      answerRecord.id = db.data.answerRecords[existingIdx].id;
      db.data.answerRecords[existingIdx] = answerRecord;
    } else {
      db.data.answerRecords.push(answerRecord);
    }

    if (indexBuilt) {
      if (!answerByPaperIdx.has(record.paperId)) {
        answerByPaperIdx.set(record.paperId, []);
      }
      const arr = answerByPaperIdx.get(record.paperId)!;
      if (existingIdx >= 0) {
        const idx = arr.findIndex((r) => r.id === answerRecord.id);
        if (idx >= 0) arr[idx] = answerRecord;
        else arr.push(answerRecord);
      } else {
        arr.push(answerRecord);
      }
    }

    await db.write();
    return answerRecord;
  },

  async getDraftAnswers(paperId: string, studentId: string): Promise<AnswerRecord[]> {
    const db = await getDb();
    return db.data.answerRecords.filter((r) => r.paperId === paperId && r.studentId === studentId);
  },

  async submit(submission: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission> {
    const db = await getDb();
    const newSubmission: Submission = {
      ...submission,
      id: uuidv4(),
      submittedAt: Date.now(),
    };
    db.data.submissions.push(newSubmission);

    if (indexBuilt) {
      if (!submissionByPaperIdx.has(submission.paperId)) {
        submissionByPaperIdx.set(submission.paperId, []);
      }
      submissionByPaperIdx.get(submission.paperId)!.push(newSubmission);
    }

    await db.write();
    return newSubmission;
  },

  async getAnswerRecords(paperId: string): Promise<AnswerRecord[]> {
    const db = await getDb();
    return db.data.answerRecords.filter((r) => r.paperId === paperId);
  },
};
