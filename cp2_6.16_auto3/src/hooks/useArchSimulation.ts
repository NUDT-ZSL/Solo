import { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationEngine, ArchType, SimulationSnapshot } from '../game/SimulationEngine';

export interface ComparisonResult {
  archType: string;
  maxLoad: number;
  failureMode: string;
  crackedBlocks: number[];
  timeToFailure: number;
}

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
  isComparison: boolean;
  comparisonResults?: ComparisonResult[];
}

export interface ComparisonRecord {
  id: string;
  timestamp: number;
  archType1: string;
  archType2: string;
  span: number;
  compressiveStrength: number;
  elasticModulus: number;
  maxLoad: number;
  duration: number;
  result1: ComparisonResult;
  result2: ComparisonResult;
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
  engine2: SimulationEngine | null;
  archType: ArchType;
  archType2: ArchType;
  setArchType: (type: ArchType) => void;
  setArchType2: (type: ArchType) => void;
  span: number;
  setSpan: (span: number) => void;
  compressiveStrength: number;
  setCompressiveStrength: (strength: number) => void;
  elasticModulus: number;
  setElasticModulus: (modulus: number) => void;
  load: number;
  addLoad: (amount: number) => void;
  snapshot: SimulationSnapshot | null;
  snapshot2: SimulationSnapshot | null;
  testRecords: TestRecord[];
  comparisonRecords: ComparisonRecord[];
  saveRecord: () => Promise<TestRecord | null>;
  saveComparisonRecord: () => Promise<ComparisonRecord | null>;
  loadRecord: (record: TestRecord) => void;
  loadComparisonRecord: (record: ComparisonRecord) => void;
  reset: () => void;
  resetBoth: () => void;
  quizQuestions: QuizQuestion[];
  checkQuizAnswer: (questionId: number, userAnswer: boolean) => {
    correct: boolean;
    explanation: string;
  } | null;
  achievements: Achievement[];
  completeQuiz: (correctCount: number, total: number) => Promise<Achievement | null>;
  isCollapsed: boolean;
  isCollapsed2: boolean;
  collapseProgress: number;
  collapseProgress2: number;
  comparisonMode: boolean;
  setComparisonMode: (enabled: boolean) => void;
}

export function useArchSimulation(): UseArchSimulationReturn {
  const engineRef = useRef<SimulationEngine | null>(null);
  const engine2Ref = useRef<SimulationEngine | null>(null);

  const [comparisonMode, setComparisonModeState] = useState(false);
  const [archType, setArchTypeState] = useState<ArchType>('semicircular');
  const [archType2, setArchType2State] = useState<ArchType>('pointed');
  const [span, setSpanState] = useState(400);
  const [compressiveStrength, setCompressiveStrengthState] = useState(50);
  const [elasticModulus, setElasticModulusState] = useState(30);
  const [load, setLoad] = useState(0);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [snapshot2, setSnapshot2] = useState<SimulationSnapshot | null>(null);
  const [testRecords, setTestRecords] = useState<TestRecord[]>([]);
  const [comparisonRecords, setComparisonRecords] = useState<ComparisonRecord[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCollapsed2, setIsCollapsed2] = useState(false);
  const [collapseProgress, setCollapseProgress] = useState(0);
  const [collapseProgress2, setCollapseProgress2] = useState(0);

  const recordSavedRef = useRef(false);
  const comparisonRecordSavedRef = useRef(false);

  useEffect(() => {
    engineRef.current = new SimulationEngine();
    engine2Ref.current = new SimulationEngine();
    loadRecords();
    loadComparisonRecords();
    loadQuiz();
    loadAchievements();

    const updateInterval = setInterval(() => {
      if (engineRef.current) {
        const snap = engineRef.current.getSnapshot();
        setSnapshot(snap);
        setLoad(snap.load);
        setIsCollapsed(engineRef.current.isCollapsed());
        setCollapseProgress(engineRef.current.getCollapseProgress());

        if (snap.crackedBlockCount >= 3 && !recordSavedRef.current && snap.testDuration > 0.5 && !comparisonMode) {
          recordSavedRef.current = true;
          saveRecordInternal(snap);
        }
      }

      if (comparisonMode && engine2Ref.current) {
        const snap2 = engine2Ref.current.getSnapshot();
        setSnapshot2(snap2);
        setIsCollapsed2(engine2Ref.current.isCollapsed());
        setCollapseProgress2(engine2Ref.current.getCollapseProgress());

        if (snap2.crackedBlockCount >= 3 && !comparisonRecordSavedRef.current && snap2.testDuration > 0.5) {
          comparisonRecordSavedRef.current = true;
          saveComparisonRecordInternal();
        }
      }
    }, 50);

    return () => clearInterval(updateInterval);
  }, [comparisonMode]);

  const loadRecords = async () => {
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      setTestRecords(data);
    } catch (e) {
      console.error('Failed to load records:', e);
    }
  };

  const loadComparisonRecords = async () => {
    try {
      const res = await fetch('/api/comparison-records');
      const data = await res.json();
      setComparisonRecords(data);
    } catch (e) {
      console.error('Failed to load comparison records:', e);
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
          crackedBlocks: snap.crackedBlockIds,
          isComparison: false
        })
      });
      const newRecord = await res.json();
      setTestRecords(prev => [newRecord, ...prev].slice(0, 5));
    } catch (e) {
      console.error('Failed to save record:', e);
    }
  };

  const saveComparisonRecordInternal = async () => {
    if (!engineRef.current || !engine2Ref.current) return;
    const snap1 = engineRef.current.getSnapshot();
    const snap2 = engine2Ref.current.getSnapshot();

    try {
      const res = await fetch('/api/comparison-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archType1: snap1.archType,
          archType2: snap2.archType,
          span: snap1.span,
          compressiveStrength: snap1.compressiveStrength,
          elasticModulus: snap1.elasticModulus,
          maxLoad: Math.max(snap1.load, snap2.load),
          duration: Math.max(snap1.testDuration, snap2.testDuration),
          result1: {
            archType: snap1.archType,
            maxLoad: snap1.load,
            failureMode: snap1.failureMode,
            crackedBlocks: snap1.crackedBlockIds,
            timeToFailure: snap1.testDuration
          },
          result2: {
            archType: snap2.archType,
            maxLoad: snap2.load,
            failureMode: snap2.failureMode,
            crackedBlocks: snap2.crackedBlockIds,
            timeToFailure: snap2.testDuration
          }
        })
      });
      const newRecord = await res.json();
      setComparisonRecords(prev => [newRecord, ...prev].slice(0, 5));
    } catch (e) {
      console.error('Failed to save comparison record:', e);
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
          crackedBlocks: snap.crackedBlockIds,
          isComparison: false
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

  const saveComparisonRecord = useCallback(async (): Promise<ComparisonRecord | null> => {
    if (!engineRef.current || !engine2Ref.current) return null;
    const snap1 = engineRef.current.getSnapshot();
    const snap2 = engine2Ref.current.getSnapshot();

    try {
      const res = await fetch('/api/comparison-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archType1: snap1.archType,
          archType2: snap2.archType,
          span: snap1.span,
          compressiveStrength: snap1.compressiveStrength,
          elasticModulus: snap1.elasticModulus,
          maxLoad: Math.max(snap1.load, snap2.load),
          duration: Math.max(snap1.testDuration, snap2.testDuration),
          result1: {
            archType: snap1.archType,
            maxLoad: snap1.load,
            failureMode: snap1.failureMode,
            crackedBlocks: snap1.crackedBlockIds,
            timeToFailure: snap1.testDuration
          },
          result2: {
            archType: snap2.archType,
            maxLoad: snap2.load,
            failureMode: snap2.failureMode,
            crackedBlocks: snap2.crackedBlockIds,
            timeToFailure: snap2.testDuration
          }
        })
      });
      const newRecord = await res.json();
      setComparisonRecords(prev => [newRecord, ...prev].slice(0, 5));
      return newRecord;
    } catch (e) {
      console.error('Failed to save comparison record:', e);
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
    setComparisonModeState(false);

    engineRef.current.setArchType(record.archType as ArchType);
    engineRef.current.setSpan(record.span);
    engineRef.current.setCompressiveStrength(record.compressiveStrength);
    engineRef.current.setElasticModulus(record.elasticModulus);
    engineRef.current.reset();
  }, []);

  const loadComparisonRecord = useCallback((record: ComparisonRecord) => {
    if (!engineRef.current || !engine2Ref.current) return;
    setArchTypeState(record.archType1 as ArchType);
    setArchType2State(record.archType2 as ArchType);
    setSpanState(record.span);
    setCompressiveStrengthState(record.compressiveStrength);
    setElasticModulusState(record.elasticModulus);
    recordSavedRef.current = false;
    comparisonRecordSavedRef.current = false;
    setComparisonModeState(true);

    engineRef.current.setArchType(record.archType1 as ArchType);
    engineRef.current.setSpan(record.span);
    engineRef.current.setCompressiveStrength(record.compressiveStrength);
    engineRef.current.setElasticModulus(record.elasticModulus);
    engineRef.current.reset();

    engine2Ref.current.setArchType(record.archType2 as ArchType);
    engine2Ref.current.setSpan(record.span);
    engine2Ref.current.setCompressiveStrength(record.compressiveStrength);
    engine2Ref.current.setElasticModulus(record.elasticModulus);
    engine2Ref.current.reset();
  }, []);

  const setComparisonMode = useCallback((enabled: boolean) => {
    setComparisonModeState(enabled);
    recordSavedRef.current = false;
    comparisonRecordSavedRef.current = false;

    if (engineRef.current) {
      engineRef.current.reset();
    }
    if (engine2Ref.current && enabled) {
      engine2Ref.current.setSpan(span);
      engine2Ref.current.setCompressiveStrength(compressiveStrength);
      engine2Ref.current.setElasticModulus(elasticModulus);
      engine2Ref.current.reset();
    }
  }, [span, compressiveStrength, elasticModulus]);

  const setArchType = useCallback((type: ArchType) => {
    setArchTypeState(type);
    recordSavedRef.current = false;
    engineRef.current?.setArchType(type);
  }, []);

  const setArchType2 = useCallback((type: ArchType) => {
    setArchType2State(type);
    comparisonRecordSavedRef.current = false;
    engine2Ref.current?.setArchType(type);
  }, []);

  const setSpan = useCallback((newSpan: number) => {
    setSpanState(newSpan);
    recordSavedRef.current = false;
    comparisonRecordSavedRef.current = false;
    engineRef.current?.setSpan(newSpan);
    engine2Ref.current?.setSpan(newSpan);
  }, []);

  const setCompressiveStrength = useCallback((strength: number) => {
    setCompressiveStrengthState(strength);
    recordSavedRef.current = false;
    comparisonRecordSavedRef.current = false;
    engineRef.current?.setCompressiveStrength(strength);
    engine2Ref.current?.setCompressiveStrength(strength);
  }, []);

  const setElasticModulus = useCallback((modulus: number) => {
    setElasticModulusState(modulus);
    recordSavedRef.current = false;
    comparisonRecordSavedRef.current = false;
    engineRef.current?.setElasticModulus(modulus);
    engine2Ref.current?.setElasticModulus(modulus);
  }, []);

  const addLoad = useCallback((amount: number) => {
    engineRef.current?.addLoad(amount);
    if (comparisonMode) {
      engine2Ref.current?.addLoad(amount);
    }
  }, [comparisonMode]);

  const reset = useCallback(() => {
    recordSavedRef.current = false;
    engineRef.current?.reset();
  }, []);

  const resetBoth = useCallback(() => {
    recordSavedRef.current = false;
    comparisonRecordSavedRef.current = false;
    engineRef.current?.reset();
    engine2Ref.current?.reset();
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
    engine2: engine2Ref.current,
    archType,
    archType2,
    setArchType,
    setArchType2,
    span,
    setSpan,
    compressiveStrength,
    setCompressiveStrength,
    elasticModulus,
    setElasticModulus,
    load,
    addLoad,
    snapshot,
    snapshot2,
    testRecords,
    comparisonRecords,
    saveRecord,
    saveComparisonRecord,
    loadRecord,
    loadComparisonRecord,
    reset,
    resetBoth,
    quizQuestions,
    checkQuizAnswer,
    achievements,
    completeQuiz,
    isCollapsed,
    isCollapsed2,
    collapseProgress,
    collapseProgress2,
    comparisonMode,
    setComparisonMode
  };
}
