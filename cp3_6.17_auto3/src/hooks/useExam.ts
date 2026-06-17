import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Question, ExamRecord } from '../types';

export interface UseExamReturn {
  questions: Question[];
  loading: boolean;
  error: string | null;
  currentIndex: number;
  totalQuestions: number;
  answers: Map<string, number | null>;
  selectedAnswer: number | null;
  timeLeft: number;
  formattedTime: string;
  goToPrev: () => void;
  goToNext: () => void;
  selectAnswer: (index: number) => void;
  canSubmit: boolean;
  submitting: boolean;
  submitExam: () => void;
  examResult: ExamRecord | null;
}

const TOTAL_TIME = 60 * 60;

export function useExam(subjectId: string, subjectName: string): UseExamReturn {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number | null>>(new Map());
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitting, setSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<ExamRecord | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const totalQuestions = questions.length;
  const currentQ = questions[currentIndex];
  const selectedAnswer = currentQ ? answers.get(currentQ.id) ?? null : null;

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/questions/${subjectId}`);
      if (!res.ok) throw new Error('获取题目失败');
      const data: Question[] = await res.json();
      setQuestions(data);
      const initial = new Map<string, number | null>();
      data.forEach((q) => initial.set(q.id, null));
      setAnswers(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    if (subjectId) {
      fetchQuestions();
    }
  }, [subjectId, fetchQuestions]);

  useEffect(() => {
    if (loading || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          void submitExam(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, questions.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1));
  }, [totalQuestions]);

  const selectAnswer = useCallback(
    (optionIndex: number) => {
      if (!currentQ) return;
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentQ.id, optionIndex);
        return next;
      });
    },
    [currentQ]
  );

  const canSubmit =
    questions.length > 0 &&
    Array.from(answers.values()).every((a) => a !== null);

  const formatTime = (s: number): string => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const submitExam = useCallback(
    async (autoSubmit = false) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const timeUsed = Math.round(
          (Date.now() - startTimeRef.current) / 1000
        );
        const answerArray = questions.map((q) => ({
          questionId: q.id,
          answer: answers.get(q.id) ?? null,
        }));

        const res = await fetch('/api/exam/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: subjectId,
            subjectName,
            answers: answerArray,
            timeUsed: autoSubmit ? TOTAL_TIME : Math.min(timeUsed, TOTAL_TIME),
          }),
        });
        if (!res.ok) throw new Error('提交失败');
        const result: ExamRecord & { questions: Question[] } =
          await res.json();
        setExamResult(result);
        void new Promise<void>((r) => setTimeout(r, 200)).then(() =>
          navigate(`/result/${result.id}`, {
            state: { result, questions: result.questions },
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : '提交失败');
      } finally {
        setSubmitting(false);
      }
    },
    [answers, questions, subjectId, subjectName, submitting, navigate]
  );

  return {
    questions,
    loading,
    error,
    currentIndex,
    totalQuestions,
    answers,
    selectedAnswer,
    timeLeft,
    formattedTime: formatTime(timeLeft),
    goToPrev,
    goToNext,
    selectAnswer,
    canSubmit,
    submitting,
    submitExam: () => submitExam(false),
    examResult,
  };
}
