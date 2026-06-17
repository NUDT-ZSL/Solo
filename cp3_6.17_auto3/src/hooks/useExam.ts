import { useState, useEffect, useCallback, useRef } from 'react';
import { Question, ExamState, ExamRecord } from '../types';

const EXAM_DURATION = 60 * 60;

export function useExam() {
  const [state, setState] = useState<ExamState>({
    status: 'idle',
    questions: [],
    currentIndex: 0,
    answers: {},
    timeRemaining: EXAM_DURATION,
    totalTime: EXAM_DURATION,
    examResult: null,
    error: null,
  });

  const timerRef = useRef<number | null>(null);

  const startExam = useCallback(async (subjectId: string) => {
    setState(s => ({ ...s, status: 'loading', error: null }));
    try {
      const res = await fetch(`/api/questions?subject=${subjectId}`);
      const data = await res.json();
      const questions: Question[] = data.questions || [];
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setState(s => {
          if (s.timeRemaining <= 1) {
            return { ...s, timeRemaining: 0 };
          }
          return { ...s, timeRemaining: s.timeRemaining - 1 };
        });
      }, 1000);
      
      setState(s => ({
        ...s,
        status: 'in_progress',
        questions,
        currentIndex: 0,
        answers: {},
        timeRemaining: EXAM_DURATION,
      }));
    } catch (err) {
      setState(s => ({ ...s, status: 'error', error: '加载题目失败' }));
    }
  }, []);

  const selectAnswer = useCallback((questionId: string, answerIndex: number) => {
    setState(s => ({
      ...s,
      answers: { ...s.answers, [questionId]: answerIndex },
    }));
  }, []);

  const goToQuestion = useCallback((index: number) => {
    setState(s => ({
      ...s,
      currentIndex: Math.max(0, Math.min(index, s.questions.length - 1)),
    }));
  }, []);

  const submitExam = useCallback(async (subjectId: string): Promise<ExamRecord | null> => {
    setState(s => ({ ...s, status: 'submitting' }));
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      const timeTaken = EXAM_DURATION - state.timeRemaining;
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          answers: state.answers,
          timeTaken,
        }),
      });
      const data = await res.json();
      const recordRes = await fetch(`/api/exam/${data.examId}`);
      const record: ExamRecord = await recordRes.json();
      setState(s => ({ ...s, status: 'completed', examResult: record }));
      return record;
    } catch (err) {
      setState(s => ({ ...s, status: 'error', error: '提交失败' }));
      return null;
    }
  }, [state.answers, state.timeRemaining]);

  const resetExam = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState({
      status: 'idle',
      questions: [],
      currentIndex: 0,
      answers: {},
      timeRemaining: EXAM_DURATION,
      totalTime: EXAM_DURATION,
      examResult: null,
      error: null,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    state,
    startExam,
    selectAnswer,
    goToQuestion,
    submitExam,
    resetExam,
    EXAM_DURATION,
  };
}
