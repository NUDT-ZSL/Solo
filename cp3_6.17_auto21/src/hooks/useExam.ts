import { useState, useEffect, useCallback, useRef } from 'react';

export interface Question {
  id: string;
  subject: string;
  text: string;
  options: string[];
  knowledgePoint: string;
}

export interface WrongAnswer {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number;
  knowledgePoint: string;
  analysis: string;
}

export interface ExamResult {
  id: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongAnswers: WrongAnswer[];
}

interface UseExamReturn {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, number>;
  timeLeft: number;
  isFinished: boolean;
  result: ExamResult | null;
  loading: boolean;
  error: string | null;
  selectAnswer: (questionId: string, optionIndex: number) => void;
  goToNext: () => void;
  goToPrev: () => void;
  goToToIndex: (index: number) => void;
  submitExam: () => Promise<void>;
  currentQuestion: Question | null;
}

const TOTAL_TIME = 60 * 60;

export default function useExam(subject: string, examineeId: string): UseExamReturn {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/questions?subject=${encodeURIComponent(subject)}`)
      .then(res => {
        if (!res.ok) throw new Error('获取题目失败');
        return res.json();
      })
      .then((data: Question[]) => {
        if (!cancelled) {
          setQuestions(data);
          setCurrentIndex(0);
          setAnswers({});
          setTimeLeft(TOTAL_TIME);
          setIsFinished(false);
          setResult(null);
          startTimeRef.current = Date.now();
          submittedRef.current = false;
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [subject]);

  useEffect(() => {
    if (isFinished || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinished, questions.length]);

  useEffect(() => {
    if (timeLeft === 0 && !isFinished && !submittedRef.current && questions.length > 0) {
      doSubmit();
    }
  }, [timeLeft, isFinished, questions.length]);

  const selectAnswer = useCallback((questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, questions.length - 1));
  }, [questions.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const goToToIndex = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, questions.length - 1)));
  }, [questions.length]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationStr = `${mins}分${secs < 10 ? '0' : ''}${secs}秒`;

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examineeId,
          subject,
          answers,
          duration: durationStr,
        }),
      });
      const data: ExamResult = await res.json();
      setResult(data);
      setIsFinished(true);
    } catch {
      setError('提交失败，请重试');
      submittedRef.current = false;
    }
  }, [answers, examineeId, subject]);

  const submitExam = useCallback(async () => {
    await doSubmit();
  }, [doSubmit]);

  const currentQuestion = questions[currentIndex] || null;

  return {
    questions,
    currentIndex,
    answers,
    timeLeft,
    isFinished,
    result,
    loading,
    error,
    selectAnswer,
    goToNext,
    goToPrev,
    goToToIndex,
    submitExam,
    currentQuestion,
  };
}
