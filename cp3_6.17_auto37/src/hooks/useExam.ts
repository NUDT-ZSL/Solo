import { useState, useEffect, useCallback, useRef } from 'react';
import { Question, ExamResult, ExamState } from '../types';

const EXAM_DURATION = 60 * 60;

export function useExam() {
  const [state, setState] = useState<ExamState>({
    questions: [],
    currentIndex: 0,
    answers: new Map(),
    timeRemaining: EXAM_DURATION,
    isStarted: false,
    isFinished: false,
    result: null,
  });

  const timerRef = useRef<number | null>(null);

  const startExam = useCallback((questions: Question[]) => {
    setState({
      questions,
      currentIndex: 0,
      answers: new Map(),
      timeRemaining: EXAM_DURATION,
      isStarted: true,
      isFinished: false,
      result: null,
    });
  }, []);

  const selectAnswer = useCallback((questionId: string, answerIndex: number) => {
    setState(prev => ({
      ...prev,
      answers: new Map(prev.answers).set(questionId, answerIndex),
    }));
  }, []);

  const goToQuestion = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentIndex: index,
    }));
  }, []);

  const nextQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, prev.questions.length - 1),
    }));
  }, []);

  const prevQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0),
    }));
  }, []);

  const finishExam = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const timeUsed = EXAM_DURATION - state.timeRemaining;

    try {
      const response = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: state.questions,
          answers: Array.from(state.answers.entries()),
          timeUsed,
        }),
      });

      const result: ExamResult = await response.json();

      setState(prev => ({
        ...prev,
        isFinished: true,
        result,
      }));
    } catch (error) {
      console.error('提交考试失败:', error);
    }
  }, [state.questions, state.answers, state.timeRemaining]);

  const resetExam = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState({
      questions: [],
      currentIndex: 0,
      answers: new Map(),
      timeRemaining: EXAM_DURATION,
      isStarted: false,
      isFinished: false,
      result: null,
    });
  }, []);

  useEffect(() => {
    if (state.isStarted && !state.isFinished && state.timeRemaining > 0) {
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          if (prev.timeRemaining <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return { ...prev, timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isStarted, state.isFinished]);

  useEffect(() => {
    if (state.isStarted && !state.isFinished && state.timeRemaining === 0) {
      finishExam();
    }
  }, [state.timeRemaining, state.isStarted, state.isFinished, finishExam]);

  return {
    state,
    startExam,
    selectAnswer,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    finishExam,
    resetExam,
  };
}
