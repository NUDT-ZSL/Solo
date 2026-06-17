import { useState, useEffect, useRef, useCallback } from 'react';
import type { Question, ExamResult } from '@/types';

const TOTAL_TIME = 3600;

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function useExam() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subjectIdRef = useRef<string>('');

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startExam = useCallback(async (subjectId: string) => {
    clearTimer();
    subjectIdRef.current = subjectId;
    const response = await fetch(`/api/questions/${subjectId}`);
    const data = await response.json();
    setQuestions(data.questions || data || []);
    setCurrentIndex(0);
    setAnswers(new Map());
    setTimeLeft(TOTAL_TIME);
    setIsStarted(true);
    setIsSubmitting(false);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const selectAnswer = useCallback((questionId: string, answer: number) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, answer);
      return next;
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < questions.length - 1) {
        return prev + 1;
      }
      return prev;
    });
  }, [questions.length]);

  const prevQuestion = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const submitExam = useCallback(async (): Promise<ExamResult | null> => {
    if (isSubmitting || !isStarted) return null;
    setIsSubmitting(true);
    clearTimer();

    try {
      const timeUsed = TOTAL_TIME - timeLeft;
      const answersArray = Array.from(answers.entries()).map(([questionId, selectedAnswer]) => ({
        questionId,
        selectedAnswer,
      }));

      const response = await fetch('/api/submit-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId: subjectIdRef.current,
          answers: answersArray,
          timeUsed,
        }),
      });

      const result: ExamResult = await response.json();
      setIsStarted(false);
      return result;
    } catch (error) {
      console.error('Submit exam failed:', error);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, isStarted, timeLeft, answers, clearTimer]);

  useEffect(() => {
    if (timeLeft === 0 && isStarted && !isSubmitting) {
      submitExam();
    }
  }, [timeLeft, isStarted, isSubmitting, submitExam]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const currentQuestion = questions[currentIndex] ?? null;
  const allAnswered = questions.length > 0 && answers.size >= questions.length;

  return {
    questions,
    currentIndex,
    answers,
    timeLeft,
    isSubmitting,
    isStarted,
    currentQuestion,
    allAnswered,
    startExam,
    selectAnswer,
    nextQuestion,
    prevQuestion,
    submitExam,
  };
}
