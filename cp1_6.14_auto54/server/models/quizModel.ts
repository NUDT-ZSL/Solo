import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { DatabaseSchema, Question, Paper, Submission, AnswerRecord, Difficulty, QuestionType } from '../types';

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

export async function getDb(): Promise<Low<DatabaseSchema>> {
  if (!dbInstance) {
    dbInstance = new Low(adapter, defaultData);
    await dbInstance.read();
    if (!dbInstance.data) {
      dbInstance.data = defaultData;
      await dbInstance.write();
    }
  }
  return dbInstance;
}

export const questionModel = {
  async list(filter?: { knowledgePoint?: string; difficulty?: Difficulty; type?: QuestionType }): Promise<Question[]> {
    const db = await getDb();
    let questions = [...db.data.questions];
    if (filter?.knowledgePoint) {
      questions = questions.filter((q) => q.knowledgePoint.includes(filter.knowledgePoint!));
    }
    if (filter?.difficulty) {
      questions = questions.filter((q) => q.difficulty === filter.difficulty);
    }
    if (filter?.type) {
      questions = questions.filter((q) => q.type === filter.type);
    }
    return questions.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getById(id: string): Promise<Question | null> {
    const db = await getDb();
    return db.data.questions.find((q) => q.id === id) || null;
  },

  async create(input: Omit<Question, 'id' | 'createdAt'>): Promise<Question> {
    const db = await getDb();
    const question: Question = {
      ...input,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    db.data.questions.push(question);
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
    await db.write();
    return created;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    const before = db.data.questions.length;
    db.data.questions = db.data.questions.filter((q) => q.id !== id);
    await db.write();
    return db.data.questions.length < before;
  },

  async getKnowledgePoints(): Promise<string[]> {
    const db = await getDb();
    const set = new Set<string>();
    db.data.questions.forEach((q) => set.add(q.knowledgePoint));
    return Array.from(set);
  },
};

export const paperModel = {
  async list(): Promise<Paper[]> {
    const db = await getDb();
    return [...db.data.papers].sort((a, b) => b.createdAt - a.createdAt);
  },

  async getById(id: string): Promise<(Paper & { questions: Question[] }) | null> {
    const db = await getDb();
    const paper = db.data.papers.find((p) => p.id === id);
    if (!paper) return null;
    const questions = paper.questionIds
      .map((qid) => db.data.questions.find((q) => q.id === qid))
      .filter((q): q is Question => !!q);
    return { ...paper, questions };
  },

  async create(input: {
    title: string;
    selectedQuestionIds: string[];
    duration: number;
    difficultyRatio: { easy: number; medium: number; hard: number };
  }): Promise<Paper> {
    const db = await getDb();
    const allSelected = input.selectedQuestionIds
      .map((id) => db.data.questions.find((q) => q.id === id))
      .filter((q): q is Question => !!q);

    const easyPool = allSelected.filter((q) => q.difficulty === 'easy');
    const mediumPool = allSelected.filter((q) => q.difficulty === 'medium');
    const hardPool = allSelected.filter((q) => q.difficulty === 'hard');

    const totalCount = Math.min(allSelected.length, 20);
    const { easy: easyRatio, medium: mediumRatio, hard: hardRatio } = input.difficultyRatio;
    const ratioSum = easyRatio + mediumRatio + hardRatio;
    let easyCount = Math.round((easyRatio / ratioSum) * totalCount);
    let mediumCount = Math.round((mediumRatio / ratioSum) * totalCount);
    let hardCount = totalCount - easyCount - mediumCount;

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
      picked = allSelected;
    } else {
      const easyPicked = pickRandom(easyPool, Math.min(easyCount, easyPool.length));
      const mediumPicked = pickRandom(mediumPool, Math.min(mediumCount, mediumPool.length));
      const hardPicked = pickRandom(hardPool, Math.min(hardCount, hardPool.length));
      picked = [...easyPicked, ...mediumPicked, ...hardPicked];
      while (picked.length < totalCount && allSelected.length > picked.length) {
        const remaining = allSelected.filter((q) => !picked.find((p) => p.id === q.id));
        if (remaining.length === 0) break;
        picked.push(remaining[Math.floor(Math.random() * remaining.length)]);
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
    await db.write();
    return paper;
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
      (r) => r.paperId === record.paperId && r.questionId === record.questionId && r.studentId === record.studentId
    );
    if (existingIdx >= 0) {
      db.data.answerRecords[existingIdx] = { ...answerRecord, id: db.data.answerRecords[existingIdx].id };
    } else {
      db.data.answerRecords.push(answerRecord);
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
    await db.write();
    return newSubmission;
  },

  async getAnswerRecords(paperId: string): Promise<AnswerRecord[]> {
    const db = await getDb();
    return db.data.answerRecords.filter((r) => r.paperId === paperId);
  },
};
