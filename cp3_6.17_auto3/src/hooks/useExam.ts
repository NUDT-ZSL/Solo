import { useState, useEffect, useCallback, useRef } from 'react';
import { Question, Subject, ExamResult } from '../types';

interface UseExamReturn {
  questions: Question[];
  currentIndex: number;
  answers: (number | null)[];
  timeLeft: number;
  isLoading: boolean;
  isSubmitted: boolean;
  result: ExamResult | null;
  subject: Subject | null;
  goToQuestion: (index: number) => void;
  selectAnswer: (answerIndex: number) => void;
  submitExam: () => Promise<void>;
  formatTime: (seconds: number) => string;
}

const useExam = (subjectId: string): UseExamReturn => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [subjectsRes, questionsRes] = await Promise.all([
          fetch('/api/subjects'),
          fetch(`/api/questions?subjectId=${subjectId}`),
        ]);
        
        const subjects = await subjectsRes.json();
        const questionsData = await questionsRes.json();
        
        const currentSubject = subjects.find((s: Subject) => s.id === subjectId);
        setSubject(currentSubject || null);
        setQuestions(questionsData);
        setAnswers(new Array(questionsData.length).fill(null));
        setTimeLeft((currentSubject?.duration || 60) * 60);
        startTimeRef.current = Date.now();
      } catch (error) {
        console.error('获取数据失败', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [subjectId]);

  useEffect(() => {
    if (isLoading || isSubmitted || timeLeft <= 0) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          void submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLoading, isSubmitted]);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  }, [questions.length]);

  const selectAnswer = useCallback((answerIndex: number) => {
    setAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[currentIndex] = answerIndex;
      return newAnswers;
    });
  }, [currentIndex]);

  const submitExam = useCallback(async () => {
    if (isSubmitted) return;
    
    setIsSubmitted(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const finalAnswers = answers.map((a) => (a === null ? -1 : a));

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: finalAnswers,
          subjectId,
          duration,
        }),
      });

      const data = await response.json();
      setResult({ ...data, duration });
    } catch (error) {
      console.error('提交失败', error);
    }
  }, [answers, subjectId, isSubmitted]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    questions,
    currentIndex,
    answers,
    timeLeft,
    isLoading,
    isSubmitted,
    result,
    subject,
    goToQuestion,
    selectAnswer,
    submitExam,
    formatTime,
  };
};

export default useExam;
