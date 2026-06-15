import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { StudentData } from './types';
import StudentCard from './components/StudentCard';
import StatsBar from './components/StatsBar';
import DetailModal from './components/DetailModal';
import AddStudentForm from './components/AddStudentForm';

const STORAGE_KEY_SORT = 'exam-monitor-card-order';

function sortStudentsByIdOrder(students: StudentData[], idOrder: string[]): StudentData[] {
  const idMap = new Map(students.map(s => [s.id, s]));
  const sorted: StudentData[] = [];
  const seenIds = new Set<string>();

  for (const id of idOrder) {
    const student = idMap.get(id);
    if (student) {
      sorted.push(student);
      seenIds.add(id);
    }
  }

  for (const student of students) {
    if (!seenIds.has(student.id)) {
      sorted.push(student);
    }
  }

  return sorted;
}

const App: React.FC = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editModeStudentId, setEditModeStudentId] = useState<string | null>(null);
  const [sortedIds, setSortedIds] = useState<string[]>([]);

  const pendingUpdateRef = useRef<StudentData[] | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SORT);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          setSortedIds(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const persistSortOrder = useCallback((ids: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_SORT, JSON.stringify(ids));
    } catch {
      // ignore
    }
  }, []);

  const batchUpdateStudents = useCallback((newStudents: StudentData[]) => {
    pendingUpdateRef.current = newStudents;

    if (rafIdRef.current !== null) {
      return;
    }

    rafIdRef.current = requestAnimationFrame((timestamp) => {
      rafIdRef.current = null;

      const start = performance.now();
      const data = pendingUpdateRef.current;
      pendingUpdateRef.current = null;

      if (!data) return;

      if (timestamp - lastUpdateTimeRef.current < 900) {
        return;
      }
      lastUpdateTimeRef.current = timestamp;

      const sorted = sortStudentsByIdOrder(data, sortedIds);
      setStudents(sorted);

      const duration = performance.now() - start;
      if (duration > 5) {
        console.warn(`DOM update took ${duration.toFixed(2)}ms, should be under 5ms`);
      }
    });
  }, [sortedIds]);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/exam/status', {
          signal: abortController.signal,
        });
        if (!res.ok) return;
        const json = await res.json() as { students: StudentData[]; timestamp: number };
        batchUpdateStudents(json.students);
      } catch {
        // ignore abort
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);

    return () => {
      clearInterval(interval);
      abortController.abort();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [batchUpdateStudents]);

  const displayStudents = useMemo(() => {
    return sortStudentsByIdOrder(students, sortedIds);
  }, [students, sortedIds]);

  const stats = useMemo(() => {
    const totalStudents = displayStudents.length;
    if (totalStudents === 0) {
      return {
        totalStudents: 0,
        avgQuestion: 0,
        totalAccuracy: 0,
        stuckCount: 0,
        timeoutCount: 0,
        accuracyDistribution: new Array(10).fill(0),
      };
    }

    let totalQ = 0;
    let totalAcc = 0;
    let stuck = 0;
    let timeout = 0;
    const distribution = new Array(10).fill(0);

    for (const s of displayStudents) {
      totalQ += s.currentQuestion;
      totalAcc += s.accuracy;
      if (s.status === 'stuck') stuck++;
      if (s.status === 'timeout') timeout++;
      const bucket = Math.min(9, Math.floor(s.accuracy / 10));
      distribution[bucket]++;
    }

    return {
      totalStudents,
      avgQuestion: Math.round(totalQ / totalStudents),
      totalAccuracy: Math.round(totalAcc / totalStudents),
      stuckCount: stuck,
      timeoutCount: timeout,
      accuracyDistribution: distribution,
    };
  }, [displayStudents]);

  const handleCardLongPress = useCallback((id: string) => {
    setEditModeStudentId(id);
  }, []);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setEditModeStudentId(null);
      return;
    }

    const currentIds = displayStudents.map(s => s.id);
    const dragIdx = currentIds.indexOf(draggedId);
    const dropIdx = currentIds.indexOf(targetId);

    if (dragIdx === -1 || dropIdx === -1) {
      setDraggedId(null);
      setEditModeStudentId(null);
      return;
    }

    const newIds = [...currentIds];
    const [removed] = newIds.splice(dragIdx, 1);
    newIds.splice(dropIdx, 0, removed);

    setSortedIds(newIds);
    persistSortOrder(newIds);
    setDraggedId(null);
    setEditModeStudentId(null);
  }, [draggedId, displayStudents, persistSortOrder]);

  const handleCardClick = useCallback((student: StudentData) => {
    if (editModeStudentId) {
      setEditModeStudentId(null);
      return;
    }
    setSelectedStudent(student);
  }, [editModeStudentId]);

  const handleAddStudent = useCallback(async (name?: string) => {
    try {
      const res = await fetch('/api/exam/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const json = await res.json() as { student: StudentData };
        setStudents(prev => [...prev, json.student]);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleRemoveStudent = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/exam/students/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== id));
        setSortedIds(prev => {
          const next = prev.filter(sid => sid !== id);
          persistSortOrder(next);
          return next;
        });
      }
    } catch {
      // ignore
    }
  }, [persistSortOrder]);

  const handleForceStuck = useCallback(async (id: string) => {
    try {
      await fetch(`/api/exam/status?force_stuck=${encodeURIComponent(id)}`);
    } catch {
      // ignore
    }
  }, []);

  const handleForceUnstuck = useCallback(async (id: string) => {
    try {
      await fetch(`/api/exam/status?force_unstuck=${encodeURIComponent(id)}`);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const studentIds = useMemo(() => displayStudents.map(s => s.id), [displayStudents]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1E1E2E',
      color: '#E0E0E0',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <StatsBar
        totalStudents={stats.totalStudents}
        avgQuestion={stats.avgQuestion}
        totalAccuracy={stats.totalAccuracy}
        stuckCount={stats.stuckCount}
        timeoutCount={stats.timeoutCount}
        accuracyDistribution={stats.accuracyDistribution}
      />

      <div
        style={{
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '16px',
          justifyItems: 'center',
          alignItems: 'start',
        }}
      >
        {displayStudents.map(student => (
          <StudentCard
            key={student.id}
            id={student.id}
            name={student.name}
            currentQuestion={student.currentQuestion}
            totalQuestions={student.totalQuestions}
            accuracy={student.accuracy}
            status={student.status}
            onClick={() => handleCardClick(student)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isEditing={editModeStudentId === student.id || draggedId !== null}
            onLongPress={handleCardLongPress}
          />
        ))}
      </div>

      <DetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      <AddStudentForm
        onAdd={handleAddStudent}
        onRemove={handleRemoveStudent}
        onForceStuck={handleForceStuck}
        onForceUnstuck={handleForceUnstuck}
        studentIds={studentIds}
      />

      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
      `}</style>
    </div>
  );
};

export default App;
