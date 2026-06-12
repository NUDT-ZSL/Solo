import { v4 as uuidv4 } from 'uuid';
import type { StudentData, StudentStatus, PerQuestionTime } from '../types';

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
  '博', '瑶', '昊', '轩', '瑶', '琳', '晨', '瑞', '欣', '睿',
];

function gaussianRandom(mean: number, stdDev: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
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

export function generateStudent(id?: string): StudentData {
  const studentId = id || uuidv4();
  const currentQuestion = Math.round(clamp(gaussianRandom(TOTAL_QUESTIONS * 0.5, TOTAL_QUESTIONS * 0.15), 1, TOTAL_QUESTIONS));
  const accuracy = clamp(gaussianRandom(0.7, 0.15), 0, 1);

  const perQuestionTimes: PerQuestionTime[] = [];
  let correctCount = 0;
  for (let i = 0; i < currentQuestion; i++) {
    const isCorrect = Math.random() < accuracy;
    if (isCorrect) correctCount++;
    const baseTime = gaussianRandom(AVG_TIME_PER_QUESTION, 8);
    const timeSpent = Math.max(5, baseTime);
    perQuestionTimes.push({
      questionIndex: i + 1,
      timeSpent: Math.round(timeSpent * 10) / 10,
      correct: isCorrect,
    });
  }

  const actualAccuracy = currentQuestion > 0 ? correctCount / currentQuestion : 0;
  const avgTime = perQuestionTimes.length > 0
    ? perQuestionTimes.reduce((sum, q) => sum + q.timeSpent, 0) / perQuestionTimes.length
    : AVG_TIME_PER_QUESTION;

  const lastQuestionTime = perQuestionTimes.length > 0 ? perQuestionTimes[perQuestionTimes.length - 1].timeSpent : 0;
  let status: StudentStatus = 'normal';
  let stuckOnQuestion: number | null = null;

  if (lastQuestionTime > avgTime * 2 && lastQuestionTime > AVG_TIME_PER_QUESTION * 2) {
    status = 'stuck';
    stuckOnQuestion = currentQuestion;
  }
  if (lastQuestionTime > avgTime * 3) {
    status = 'timeout';
    stuckOnQuestion = currentQuestion;
  }

  return {
    id: studentId,
    name: generateChineseName(),
    currentQuestion,
    totalQuestions: TOTAL_QUESTIONS,
    accuracy: Math.round(actualAccuracy * 100),
    status,
    perQuestionTimes,
    stuckOnQuestion,
  };
}

export function generateInitialStudents(count: number): StudentData[] {
  const students: StudentData[] = [];
  for (let i = 0; i < count; i++) {
    students.push(generateStudent());
  }
  return students;
}

export function updateStudentProgress(student: StudentData): StudentData {
  if (student.currentQuestion >= student.totalQuestions) {
    return { ...student, status: 'normal' };
  }

  const newCurrentQuestion = Math.min(student.currentQuestion + 1, student.totalQuestions);
  const isCorrect = Math.random() < 0.7;
  const avgTimeForStudent = student.perQuestionTimes.length > 0
    ? student.perQuestionTimes.reduce((sum, q) => sum + q.timeSpent, 0) / student.perQuestionTimes.length
    : AVG_TIME_PER_QUESTION;

  let timeSpent: number;
  if (student.stuckOnQuestion === student.currentQuestion + 1) {
    timeSpent = Math.round((avgTimeForStudent * 2 + gaussianRandom(0, 5)) * 10) / 10;
    timeSpent = Math.max(timeSpent, avgTimeForStudent * 2);
  } else {
    timeSpent = Math.round(Math.max(5, gaussianRandom(AVG_TIME_PER_QUESTION, 8)) * 10) / 10;
  }

  const newPerQuestionTimes = [
    ...student.perQuestionTimes,
    {
      questionIndex: newCurrentQuestion,
      timeSpent,
      correct: isCorrect,
    },
  ];

  const correctCount = newPerQuestionTimes.filter(q => q.correct).length;
  const newAccuracy = newPerQuestionTimes.length > 0 ? Math.round((correctCount / newPerQuestionTimes.length) * 100) : 0;

  const newAvgTime = newPerQuestionTimes.reduce((sum, q) => sum + q.timeSpent, 0) / newPerQuestionTimes.length;
  const lastTime = timeSpent;

  let newStatus: StudentStatus = 'normal';
  let newStuckOnQuestion: number | null = null;
  if (lastTime > newAvgTime * 2 && lastTime > AVG_TIME_PER_QUESTION * 2) {
    newStatus = 'stuck';
    newStuckOnQuestion = newCurrentQuestion;
  }
  if (lastTime > newAvgTime * 3) {
    newStatus = 'timeout';
    newStuckOnQuestion = newCurrentQuestion;
  }

  return {
    ...student,
    currentQuestion: newCurrentQuestion,
    accuracy: newAccuracy,
    status: newStatus,
    perQuestionTimes: newPerQuestionTimes,
    stuckOnQuestion: newStuckOnQuestion,
  };
}
