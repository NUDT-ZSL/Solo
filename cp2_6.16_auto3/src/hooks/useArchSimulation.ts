import { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationEngine, ArchType, SimulationSnapshot } from '../game/SimulationEngine';

export interface TestRecord {
  id: string;
  timestamp: number;
  archType: string;
  span: number;
  compressiveStrength: number;
  elasticModulus: number;
  maxLoad: number;
  failureMode: string;
  duration: number;
  crackedBlocks: number[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  answer: boolean;
  explanation: string;
}

export interface Achievement {
  id: string;
  name: string;
  timestamp: number;
  description: string;
}

export interface UseArchSimulationReturn {
  engine: SimulationEngine | null;
  archType: ArchType;
  setArchType: (type: ArchType) => void;
  span: number;
  setSpan: (span: number) => void;
  compressiveStrength: number;
  setCompressiveStrength: (strength: number) => void;
  elasticModulus: number;
  setElasticModulus: (modulus: number) => void;
  load: number;
  addLoad: (amount: number) => void;
  snapshot: SimulationSnapshot | null;
  testRecords: TestRecord[];
  saveRecord: () => Promise<TestRecord | null>;
  loadRecord: (record: TestRecord) => void;
  reset: () => void;
  quizQuestions: QuizQuestion[];
  checkQuizAnswer: (questionId: number, userAnswer: boolean) => {
    correct: boolean;
    explanation: string;
  } | null;
  achievements: Achievement[];
  completeQuiz: (correctCount: number, total: number) => Promise<Achievement | null>;
  isCollapsed: boolean;
  collapseProgress: number;
}

export function useArchSimulation(): UseArchSimulationReturn {
  const engineRef = useRef<SimulationEngine | null>(null);

  const [archType, setArchTypeState] = useState<ArchType>('semicircular');
  const [span, setSpanState] = useState(400);
  const [compressiveStrength, setCompressiveStrengthState] = useState(50);
  const [elasticModulus, setElasticModulusState] = useState(30);
  const [load, setLoad] = useState(0);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [testRecords, setTestRecords] = useState<TestRecord[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapseProgress, setCollapseProgress] = useState(0);

  const recordSavedRef = useRef(false);

  useEffect(() => {
    engineRef.current = new SimulationEngine();
    loadRecords();
    loadQuiz();
    loadAchievements();

    const updateInterval = setInterval(() => {
      if (engineRef.current) {
        const snap = engineRef.current.getSnapshot();
        setSnapshot(snap);
        setLoad(snap.load);
        setIsCollapsed(engineRef.current.isCollapsed());
        setCollapseProgress(engineRef.current.getCollapseProgress());

        if (snap.crackedBlockCount >= 3 && !recordSavedRef.current && snap.testDuration > 0.5) {
          recordSavedRef.current = true;
          saveRecordInternal(snap);
        }
      }
    }, 50);

    return () => clearInterval(updateInterval);
  }, []);

  const loadRecords = async () => {
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      setTestRecords(data);
    } catch (e) {
      console.error('Failed to load records:', e);
    }
  };

  const loadQuiz = async () => {
    try {
      const res = await fetch('/api/quiz');
      const data = await res.json();
      setQuizQuestions(data);
    } catch (e) {
      console.error('Failed to load quiz:', e);
    }
  };

  const loadAchievements = async () => {
    try {
      const res = await fetch('/api/achievements');
      const data = await res.json();
      setAchievements(data);
    } catch (e) {
      console.error('Failed to load achievements:', e);
    }
  };

  const saveRecordInternal = async (snap: SimulationSnapshot) => {
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archType: snap.archType,
          span: snap.span,
          compressiveStrength: snap.compressiveStrength,
          elasticModulus: snap.elasticModulus,
          maxLoad: snap.load,
          failureMode: snap.failureMode,
          duration: snap.testDuration,
          crackedBlocks: snap.crackedBlockIds
        })
      });
      const newRecord = await res.json();
      setTestRecords(prev => [newRecord, ...prev].slice(0, 5));
    } catch (e) {
      console.error('Failed to save record:', e);
    }
  };

  const saveRecord = useCallback(async (): Promise<TestRecord | null> => {
    if (!engineRef.current) return null;
    const snap = engineRef.current.getSnapshot();
    if (snap.testDuration < 0.5) return null;

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archType: snap.archType,
          span: snap.span,
          compressiveStrength: snap.compressiveStrength,
          elasticModulus: snap.elasticModulus,
          maxLoad: snap.load,
          failureMode: snap.failureMode,
          duration: snap.testDuration,
          crackedBlocks: snap.crackedBlockIds
        })
      });
      const newRecord = await res.json();
      setTestRecords(prev => [newRecord, ...prev].slice(0, 5));
      return newRecord;
    } catch (e) {
      console.error('Failed to save record:', e);
      return null;
    }
  }, []);

  const loadRecord = useCallback((record: TestRecord) => {
    if (!engineRef.current) return;
    setArchTypeState(record.archType as ArchType);
    setSpanState(record.span);
    setCompressiveStrengthState(record.compressiveStrength);
    setElasticModulusState(record.elasticModulus);
    recordSavedRef.current = false;

    engineRef.current.setArchType(record.archType as ArchType);
    engineRef.current.setSpan(record.span);
    engineRef.current.setCompressiveStrength(record.compressiveStrength);
    engineRef.current.setElasticModulus(record.elasticModulus);
    engineRef.current.reset();
  }, []);

  const setArchType = useCallback((type: ArchType) => {
    setArchTypeState(type);
    recordSavedRef.current = false;
    engineRef.current?.setArchType(type);
  }, []);

  const setSpan = useCallback((newSpan: number) => {
    setSpanState(newSpan);
    recordSavedRef.current = false;
    engineRef.current?.setSpan(newSpan);
  }, []);

  const setCompressiveStrength = useCallback((strength: number) => {
    setCompressiveStrengthState(strength);
    recordSavedRef.current = false;
    engineRef.current?.setCompressiveStrength(strength);
  }, []);

  const setElasticModulus = useCallback((modulus: number) => {
    setElasticModulusState(modulus);
    recordSavedRef.current = false;
    engineRef.current?.setElasticModulus(modulus);
  }, []);

  const addLoad = useCallback((amount: number) => {
    engineRef.current?.addLoad(amount);
  }, []);

  const reset = useCallback(() => {
    recordSavedRef.current = false;
    engineRef.current?.reset();
  }, []);

  const checkQuizAnswer = useCallback((questionId: number, userAnswer: boolean) => {
    const question = quizQuestions.find(q => q.id === questionId);
    if (!question) return null;
    return {
      correct: question.answer === userAnswer,
      explanation: question.explanation
    };
  }, [quizQuestions]);

  const completeQuiz = useCallback(async (correctCount: number, total: number) => {
    if (correctCount < 2 || total < 5) return null;
    try {
      const res = await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '力学大师',
          description: `在${total}道力学判断题中答对${correctCount}题，展现了扎实的结构力学知识！`
        })
      });
      const achievement = await res.json();
      setAchievements(prev => [...prev, achievement]);
      return achievement;
    } catch (e) {
      console.error('Failed to save achievement:', e);
      return null;
    }
  }, []);

  return {
    engine: engineRef.current,
    archType,
    setArchType,
    span,
    setSpan,
    compressiveStrength,
    setCompressiveStrength,
    elasticModulus,
    setElasticModulus,
    load,
    addLoad,
    snapshot,
    testRecords,
    saveRecord,
    loadRecord,
    reset,
    quizQuestions,
    checkQuizAnswer,
    achievements,
    completeQuiz,
    isCollapsed,
    collapseProgress
  };
}
