import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface PerQuestionTime {
  questionIndex: number;
  timeSpent: number;
  correct: boolean;
}

type StudentStatus = 'normal' | 'stuck' | 'timeout';

interface StudentData {
  id: string;
  name: string;
  currentQuestion: number;
  totalQuestions: number;
  accuracy: number;
  status: StudentStatus;
  perQuestionTimes: PerQuestionTime[];
  stuckOnQuestion: number | null;
}

const TOTAL_QUESTIONS = 50;
const AVG_TIME_PER_QUESTION = 30;

const SURNAMES = [
  '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈',
  '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '许', '何',
  '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏', '陶',
];
const GIVEN_NAMES = [
  '明', '华', '强', '伟', '芳', '娜', '敏', '静', '丽', '磊',
  '鑫', '洋', '勇', '艳', '杰', '涛', '慧', '宇', '峰', '莉',
  '博', '瑶', '昊', '轩', '琳', '晨', '瑞', '欣', '睿', '莹',
];

function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdDev + mean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function generateChineseName(): string {
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const givenNameLen = Math.random() > 0.5 ? 2 : 1;
  let given = '';
  for (let i = 0; i < givenNameLen; i++) {
    given += GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)];
  }
  return surname + given;
}

function createStudent(id?: string): StudentData {
  const studentId = id || uuidv4();
  const currentQuestion = Math.round(clamp(gaussianRandom(TOTAL_QUESTIONS * 0.5, TOTAL_QUESTIONS * 0.15), 1, TOTAL_QUESTIONS));
  const baseAccuracy = clamp(gaussianRandom(0.7, 0.15), 0.1, 1.0);

  const perQuestionTimes: PerQuestionTime[] = [];
  let correctCount = 0;
  for (let i = 0; i < currentQuestion; i++) {
    const isCorrect = Math.random() < baseAccuracy;
    if (isCorrect) correctCount++;
    const timeSpent = Math.max(5, gaussianRandom(AVG_TIME_PER_QUESTION, 8));
    perQuestionTimes.push({
      questionIndex: i + 1,
      timeSpent: Math.round(timeSpent * 10) / 10,
      correct: isCorrect,
    });
  }

  const accuracy = currentQuestion > 0 ? Math.round((correctCount / currentQuestion) * 100) : 0;
  const avgTime = perQuestionTimes.length > 0
    ? perQuestionTimes.reduce((s, q) => s + q.timeSpent, 0) / perQuestionTimes.length
    : AVG_TIME_PER_QUESTION;
  const lastTime = perQuestionTimes.length > 0 ? perQuestionTimes[perQuestionTimes.length - 1].timeSpent : 0;

  let status: StudentStatus = 'normal';
  let stuckOnQuestion: number | null = null;
  if (lastTime > avgTime * 2 && lastTime > AVG_TIME_PER_QUESTION * 2) {
    status = 'stuck';
    stuckOnQuestion = currentQuestion;
  }
  if (lastTime > avgTime * 3) {
    status = 'timeout';
    stuckOnQuestion = currentQuestion;
  }

  return {
    id: studentId,
    name: generateChineseName(),
    currentQuestion,
    totalQuestions: TOTAL_QUESTIONS,
    accuracy,
    status,
    perQuestionTimes,
    stuckOnQuestion,
  };
}

let students: StudentData[] = [];
for (let i = 0; i < 20; i++) {
  students.push(createStudent());
}

function updateAllStudents(): void {
  students = students.map(student => {
    if (student.currentQuestion >= student.totalQuestions) {
      return { ...student, status: 'normal' as StudentStatus, stuckOnQuestion: null };
    }

    const newQuestion = Math.min(student.currentQuestion + 1, student.totalQuestions);
    const isCorrect = Math.random() < 0.7;

    const avgTimeForStudent = student.perQuestionTimes.length > 0
      ? student.perQuestionTimes.reduce((s, q) => s + q.timeSpent, 0) / student.perQuestionTimes.length
      : AVG_TIME_PER_QUESTION;

    let timeSpent: number;
    if (student.stuckOnQuestion !== null && student.stuckOnQuestion === newQuestion) {
      timeSpent = Math.round((avgTimeForStudent * 2 + Math.abs(gaussianRandom(0, 5))) * 10) / 10;
      timeSpent = Math.max(timeSpent, avgTimeForStudent * 2);
    } else {
      timeSpent = Math.round(Math.max(5, gaussianRandom(AVG_TIME_PER_QUESTION, 8)) * 10) / 10;
    }

    const newPerQuestionTimes = [
      ...student.perQuestionTimes,
      { questionIndex: newQuestion, timeSpent, correct: isCorrect },
    ];

    const correctCount = newPerQuestionTimes.filter(q => q.correct).length;
    const newAccuracy = newPerQuestionTimes.length > 0 ? Math.round((correctCount / newPerQuestionTimes.length) * 100) : 0;
    const newAvgTime = newPerQuestionTimes.reduce((s, q) => s + q.timeSpent, 0) / newPerQuestionTimes.length;

    let newStatus: StudentStatus = 'normal';
    let newStuckOnQuestion: number | null = null;
    if (timeSpent > newAvgTime * 2 && timeSpent > AVG_TIME_PER_QUESTION * 2) {
      newStatus = 'stuck';
      newStuckOnQuestion = newQuestion;
    }
    if (timeSpent > newAvgTime * 3) {
      newStatus = 'timeout';
      newStuckOnQuestion = newQuestion;
    }

    return {
      ...student,
      currentQuestion: newQuestion,
      accuracy: newAccuracy,
      status: newStatus,
      perQuestionTimes: newPerQuestionTimes,
      stuckOnQuestion: newStuckOnQuestion,
    };
  });
}

setInterval(updateAllStudents, 3000);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/exam/status', (req, res) => {
  const forceStuck = req.query.force_stuck as string | undefined;
  const forceUnstuck = req.query.force_unstuck as string | undefined;

  let result = [...students];

  if (forceStuck) {
    result = result.map(s => {
      if (s.id === forceStuck) {
        const avgTime = s.perQuestionTimes.length > 0
          ? s.perQuestionTimes.reduce((sum, q) => sum + q.timeSpent, 0) / s.perQuestionTimes.length
          : AVG_TIME_PER_QUESTION;
        const stuckTime = Math.round((avgTime * 2 + Math.abs(gaussianRandom(0, 5))) * 10) / 10;
        const updatedTimes = [...s.perQuestionTimes];
        if (updatedTimes.length > 0) {
          updatedTimes[updatedTimes.length - 1] = {
            ...updatedTimes[updatedTimes.length - 1],
            timeSpent: Math.max(stuckTime, avgTime * 2),
          };
        }
        return {
          ...s,
          status: 'stuck' as StudentStatus,
          stuckOnQuestion: s.currentQuestion,
          perQuestionTimes: updatedTimes,
        };
      }
      return s;
    });
  }

  if (forceUnstuck) {
    result = result.map(s => {
      if (s.id === forceUnstuck) {
        return {
          ...s,
          status: 'normal' as StudentStatus,
          stuckOnQuestion: null,
        };
      }
      return s;
    });
  }

  res.json({ students: result, timestamp: Date.now() });
});

app.post('/api/exam/students', (req, res) => {
  const { name } = req.body as { name?: string };
  const newStudent = createStudent();
  if (name && name.length >= 2 && name.length <= 4) {
    newStudent.name = name;
  }
  students.push(newStudent);
  res.json({ student: newStudent, timestamp: Date.now() });
});

app.delete('/api/exam/students/:id', (req, res) => {
  const { id } = req.params;
  const before = students.length;
  students = students.filter(s => s.id !== id);
  const removed = students.length < before;
  res.json({ success: removed, timestamp: Date.now() });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Exam monitor API server running on http://localhost:${PORT}`);
});
