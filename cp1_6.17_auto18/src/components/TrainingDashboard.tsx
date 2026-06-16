import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import type {
  Exercise,
  ExerciseInTemplate,
  SuperSet,
  TrainingTemplate,
  SetRecord,
  TrainingSession,
  MuscleGroup,
} from '../types';
import { exerciseLibrary } from '../data/exercises';
import { getMuscleDistributionPieConfig } from '../lib/chart/chartHelper';
import { generatePlan } from '../lib/algorithm/planGenerator';

const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: '胸部',
  back: '背部',
  shoulders: '肩部',
  biceps: '二头肌',
  triceps: '三头肌',
  legs: '腿部',
  core: '核心',
  glutes: '臀部',
};

interface FlatExerciseItem {
  type: 'exercise' | 'superset';
  exercise?: ExerciseInTemplate;
  superSet?: SuperSet;
}

function flattenTemplateItems(exercises: (ExerciseInTemplate | SuperSet)[]): FlatExerciseItem[] {
  const items: FlatExerciseItem[] = [];
  for (const ex of exercises) {
    if ('isSuperSet' in ex && ex.isSuperSet) {
      items.push({ type: 'superset', superSet: ex as SuperSet });
    } else {
      items.push({ type: 'exercise', exercise: ex as ExerciseInTemplate });
    }
  }
  return items;
}

interface SetInput {
  weight: string;
  reps: string;
}

function CheckAnimation() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 500);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className="check-animation">✓</div>;
}

function SummaryCard({ session }: { session: TrainingSession }) {
  const pieRef = useRef<HTMLDivElement>(null);
  const pieInstance = useRef<echarts.ECharts | null>(null);
  const [animatedVolume, setAnimatedVolume] = useState(0);
  const [volumeKey, setVolumeKey] = useState(0);

  useEffect(() => {
    setVolumeKey((k) => k + 1);
    let start = 0;
    const end = session.totalVolume;
    const duration = 600;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedVolume(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [session.totalVolume]);

  const muscleVolumeData = useMemoByMuscle(session);

  useEffect(() => {
    if (!pieRef.current) return;
    if (!pieInstance.current) {
      pieInstance.current = echarts.init(pieRef.current);
    }
    if (muscleVolumeData.length > 0) {
      pieInstance.current.setOption(getMuscleDistributionPieConfig(muscleVolumeData));
    }
    const handleResize = () => pieInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [muscleVolumeData]);

  useEffect(() => {
    return () => {
      pieInstance.current?.dispose();
      pieInstance.current = null;
    };
  }, []);

  return (
    <div className="summary-card card" style={{ padding: 24, marginTop: 16 }}>
      <h3 style={{ marginBottom: 16, color: '#0D1B2A', fontSize: 18 }}>训练总结</h3>
      <div className="summary-stats">
        <div className="summary-stat-item">
          <div className="summary-stat-label">总训练量</div>
          <div className="volume-number" key={volumeKey} style={{ fontSize: 32, fontWeight: 700, color: '#FF6F00' }}>
            {animatedVolume.toLocaleString()} kg
          </div>
        </div>
        <div className="summary-stat-item">
          <div className="summary-stat-label">消耗热量</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#0D1B2A' }}>
            {session.estimatedCalories} kcal
          </div>
        </div>
      </div>
      <div className="summary-pie-wrapper">
        <h4 style={{ marginBottom: 8, color: '#555', fontSize: 14 }}>肌群刺激分布</h4>
        <div ref={pieRef} style={{ width: '100%', height: 240 }} />
      </div>
    </div>
  );
}

function useMemoByMuscle(session: TrainingSession): { muscle: string; volume: number }[] {
  const exerciseMuscleMap = new Map<string, MuscleGroup>();
  exerciseLibrary.forEach((ex) => exerciseMuscleMap.set(ex.id, ex.targetMuscle));

  const volumeMap = new Map<string, number>();
  session.records.forEach((r) => {
    const muscle = exerciseMuscleMap.get(r.exerciseId);
    if (muscle) {
      const vol = r.weight * r.reps;
      volumeMap.set(muscle, (volumeMap.get(muscle) || 0) + vol);
    }
  });

  return Array.from(volumeMap.entries())
    .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume);
}

interface ExerciseRowProps {
  exercise: ExerciseInTemplate;
  currentSetIndex: number;
  isTraining: boolean;
  setInput: SetInput;
  onSetInputChange: (field: 'weight' | 'reps', value: string) => void;
  onCompleteSet: () => void;
  isSupersetMember?: boolean;
  supersetRestSeconds?: number;
}

function ExerciseRow({
  exercise,
  currentSetIndex,
  isTraining,
  setInput,
  onSetInputChange,
  onCompleteSet,
  isSupersetMember,
  supersetRestSeconds,
}: ExerciseRowProps) {
  const completedSets = currentSetIndex;
  const totalSets = exercise.sets;
  const isCurrent = isTraining && completedSets < totalSets;
  const isDone = completedSets >= totalSets;

  return (
    <div
      className={`exercise-row ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''} ${isSupersetMember ? 'superset-member' : ''}`}
    >
      <div className="exercise-row-header">
        <div className="exercise-row-name">
          {exercise.name}
          {isSupersetMember && <span className="superset-badge">超级组</span>}
        </div>
        <div className="exercise-row-meta">
          {exercise.targetMuscle && (
            <span className="muscle-tag">{muscleGroupLabels[exercise.targetMuscle]}</span>
          )}
          <span>{totalSets}组 × {exercise.reps}次</span>
          {exercise.restSeconds > 0 && <span>休息{exercise.restSeconds}s</span>}
          {isSupersetMember && supersetRestSeconds === 0 && (
            <span className="no-rest-tag">无间歇</span>
          )}
        </div>
      </div>

      <div className="exercise-row-sets">
        {Array.from({ length: totalSets }).map((_, i) => (
          <div
            key={i}
            className={`set-dot ${i < completedSets ? 'completed' : ''} ${i === completedSets && isTraining ? 'active' : ''}`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {isCurrent && (
        <div className="set-input-row">
          <input
            type="number"
            placeholder="重量(kg)"
            value={setInput.weight}
            onChange={(e) => onSetInputChange('weight', e.target.value)}
            className="set-input"
          />
          <input
            type="number"
            placeholder="次数"
            value={setInput.reps}
            onChange={(e) => onSetInputChange('reps', e.target.value)}
            className="set-input"
          />
          <button className="btn-primary" onClick={onCompleteSet}>
            完成一组
          </button>
        </div>
      )}
    </div>
  );
}

type ViewMode = 'library' | 'templates' | 'training' | 'history';

export default function TrainingDashboard() {
  const [view, setView] = useState<ViewMode>('library');
  const [searchTerm, setSearchTerm] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all');
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>(exerciseLibrary);

  const [templates, setTemplates] = useState<TrainingTemplate[]>([]);
  const [currentTemplateName, setCurrentTemplateName] = useState('');
  const [currentTemplateExercises, setCurrentTemplateExercises] = useState<(ExerciseInTemplate | SuperSet)[]>([]);
  const [draggedExercise, setDraggedExercise] = useState<Exercise | null>(null);
  const [showSuperSetDialog, setShowSuperSetDialog] = useState(false);
  const [superSetIndices, setSuperSetIndices] = useState<number[]>([]);

  const [trainingTemplate, setTrainingTemplate] = useState<TrainingTemplate | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [setInput, setSetInput] = useState<SetInput>({ weight: '', reps: '' });
  const [trainingRecords, setTrainingRecords] = useState<SetRecord[]>([]);
  const [trainingStartTime, setTrainingStartTime] = useState('');
  const [showCheck, setShowCheck] = useState(false);
  const [completedSession, setCompletedSession] = useState<TrainingSession | null>(null);

  const [history, setHistory] = useState<TrainingSession[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'filter_result') {
        setFilteredExercises(e.data.results);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    let results = exerciseLibrary;
    if (muscleFilter !== 'all') {
      results = results.filter((ex) => ex.targetMuscle === muscleFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (ex) =>
          ex.name.toLowerCase().includes(term) ||
          ex.targetMuscle.toLowerCase().includes(term) ||
          ex.description.toLowerCase().includes(term),
      );
    }
    setFilteredExercises(results);
  }, [searchTerm, muscleFilter]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history?days=30');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {}
  };

  const handleDragStart = useCallback((_e: React.DragEvent, exercise: Exercise) => {
    setDraggedExercise(exercise);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggedExercise) return;
      const newEx: ExerciseInTemplate = {
        ...draggedExercise,
        sets: 3,
        reps: 10,
        restSeconds: 60,
      };
      setCurrentTemplateExercises((prev) => [...prev, newEx]);
      setDraggedExercise(null);
    },
    [draggedExercise],
  );

  const handleRemoveExercise = (index: number) => {
    setCurrentTemplateExercises((prev) => prev.filter((_, i) => i !== index));
    setSuperSetIndices((prev) => {
      const next = prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i));
      return next;
    });
  };

  const handleUpdateExercise = (index: number, field: string, value: number) => {
    setCurrentTemplateExercises((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if ('isSuperSet' in item && item.isSuperSet) return item;
        const ex = item as ExerciseInTemplate;
        return { ...ex, [field]: value };
      }),
    );
  };

  const handleCreateSuperSet = () => {
    if (superSetIndices.length !== 2) return;
    const sorted = [...superSetIndices].sort((a, b) => a - b);
    const newExercises = [...currentTemplateExercises];
    const ex1 = newExercises[sorted[0]] as ExerciseInTemplate;
    const ex2 = newExercises[sorted[1]] as ExerciseInTemplate;

    const superSet: SuperSet = {
      id: `ss-${Date.now()}`,
      exercises: [
        { ...ex1, restSeconds: 0 },
        { ...ex2, restSeconds: 0 },
      ],
      isSuperSet: true,
    };

    const updated = newExercises.filter((_, i) => !sorted.includes(i));
    updated.splice(sorted[0], 0, superSet);
    setCurrentTemplateExercises(updated);
    setSuperSetIndices([]);
    setShowSuperSetDialog(false);
  };

  const toggleSuperSetSelection = (index: number) => {
    setSuperSetIndices((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= 2) return [prev[1], index];
      return [...prev, index];
    });
  };

  const saveTemplate = () => {
    if (!currentTemplateName.trim() || currentTemplateExercises.length === 0) return;
    const template: TrainingTemplate = {
      id: `tpl-${Date.now()}`,
      name: currentTemplateName,
      exercises: currentTemplateExercises,
      createdAt: new Date().toISOString(),
    };
    setTemplates((prev) => [...prev, template]);
    setCurrentTemplateName('');
    setCurrentTemplateExercises([]);
  };

  const startTraining = (template: TrainingTemplate) => {
    setTrainingTemplate(template);
    setCurrentExerciseIndex(0);
    setCurrentSetIndex(0);
    setSetInput({ weight: '', reps: '' });
    setTrainingRecords([]);
    setTrainingStartTime(new Date().toISOString());
    setCompletedSession(null);
    setView('training');
  };

  const completeSet = () => {
    if (!trainingTemplate) return;
    const items = flattenTemplateItems(trainingTemplate.exercises);
    const currentItem = items[currentExerciseIndex];
    if (!currentItem) return;

    let exercise: ExerciseInTemplate;
    let restSeconds = 60;
    let isLastSetOfSupersetMember = false;

    if (currentItem.type === 'superset' && currentItem.superSet) {
      const ss = currentItem.superSet;
      const innerIdx = currentSetIndex < ss.exercises[0].sets ? 0 : 1;
      exercise = ss.exercises[innerIdx];
      restSeconds = 0;

      const setInExercise = innerIdx === 0 ? currentSetIndex : currentSetIndex - ss.exercises[0].sets;
      const isLastSetOfThisExercise = setInExercise + 1 >= exercise.sets;
      const isLastExerciseInSuperSet = innerIdx === ss.exercises.length - 1;
      isLastSetOfSupersetMember = isLastSetOfThisExercise && isLastExerciseInSuperSet;
    } else {
      exercise = currentItem.exercise!;
      restSeconds = exercise.restSeconds;
    }

    const record: SetRecord = {
      exerciseId: exercise.id,
      setIndex: currentSetIndex,
      weight: parseFloat(setInput.weight) || 0,
      reps: parseInt(setInput.reps) || 0,
      duration: 0,
      completedAt: new Date().toISOString(),
    };

    setTrainingRecords((prev) => [...prev, record]);
    setShowCheck(true);
    setTimeout(() => setShowCheck(false), 500);

    const nextSetIndex = currentSetIndex + 1;
    const totalSetsForItem = getTotalSetsForItem(currentItem);

    if (nextSetIndex < totalSetsForItem) {
      setCurrentSetIndex(nextSetIndex);
    } else {
      const nextItemIndex = currentExerciseIndex + 1;
      if (nextItemIndex < items.length) {
        setCurrentExerciseIndex(nextItemIndex);
        setCurrentSetIndex(0);
      } else {
        finishTraining([...trainingRecords, record]);
      }
    }
    setSetInput({ weight: '', reps: '' });
  };

  const handleSetInputChange = (field: 'weight' | 'reps', value: string) => {
    setSetInput((prev) => ({ ...prev, [field]: value }));
  };

  function getTotalSetsForItem(item: FlatExerciseItem): number {
    if (item.type === 'superset' && item.superSet) {
      return item.superSet.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    }
    return (item.exercise as ExerciseInTemplate).sets;
  }

  const finishTraining = (records: SetRecord[]) => {
    if (!trainingTemplate) return;

    let totalVolume = 0;
    const exerciseMuscleMap = new Map<string, MuscleGroup>();
    exerciseLibrary.forEach((ex) => exerciseMuscleMap.set(ex.id, ex.targetMuscle));

    records.forEach((r) => {
      totalVolume += r.weight * r.reps;
    });

    const estimatedCalories = Math.round(totalVolume * 0.05);

    const session: TrainingSession = {
      id: `sess-${Date.now()}`,
      templateId: trainingTemplate.id,
      templateName: trainingTemplate.name,
      records,
      totalVolume,
      estimatedCalories,
      startedAt: trainingStartTime,
      completedAt: new Date().toISOString(),
    };

    setCompletedSession(session);

    fetch('/api/training/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    })
      .then(() => fetchHistory())
      .catch(() => {});
  };

  const toggleCardExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const muscleGroups: (MuscleGroup | 'all')[] = [
    'all',
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'legs',
    'core',
    'glutes',
  ];

  if (view === 'training' && trainingTemplate) {
    const items = flattenTemplateItems(trainingTemplate.exercises);
    const currentItem = items[currentExerciseIndex];
    const totalVolume = trainingRecords.reduce((sum, r) => sum + r.weight * r.reps, 0);
    const progress =
      items.length > 0
        ? Math.round(
            ((currentExerciseIndex + (currentSetIndex / (currentItem ? getTotalSetsForItem(currentItem) : 1))) /
              items.length) *
              100,
          )
        : 0;

    return (
      <div className="training-active-view">
        {showCheck && <CheckAnimation />}

        <div className="training-header">
          <h2 style={{ fontSize: 20, color: '#0D1B2A' }}>{trainingTemplate.name}</h2>
          <div className="training-progress-bar">
            <div className="training-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="training-volume-display">
            <span className="training-volume-label">总训练量</span>
            <span className="volume-number" style={{ fontSize: 28, fontWeight: 700, color: '#FF6F00' }}>
              {totalVolume.toLocaleString()} kg
            </span>
          </div>
        </div>

        {currentItem && (
          <div className="training-current-section">
            {currentItem.type === 'superset' && currentItem.superSet ? (
              <div className="superset-training-block">
                <div className="superset-label">🔥 超级组（无间歇）</div>
                {currentItem.superSet.exercises.map((ex, idx) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    currentSetIndex={
                      idx === 0
                        ? Math.min(currentSetIndex, ex.sets)
                        : Math.max(currentSetIndex - currentItem.superSet!.exercises[0].sets, 0)
                    }
                    isTraining={true}
                    setInput={setInput}
                    onSetInputChange={handleSetInputChange}
                    onCompleteSet={completeSet}
                    isSupersetMember={true}
                    supersetRestSeconds={0}
                  />
                ))}
              </div>
            ) : (
              <ExerciseRow
                exercise={currentItem.exercise!}
                currentSetIndex={currentSetIndex}
                isTraining={true}
                setInput={setInput}
                onSetInputChange={handleSetInputChange}
                onCompleteSet={completeSet}
              />
            )}
          </div>
        )}

        <div className="training-exercise-nav">
          {items.map((item, i) => {
            const name =
              item.type === 'superset' && item.superSet
                ? `超级组: ${item.superSet.exercises.map((e) => e.name.split('/')[0].trim()).join(' + ')}`
                : item.exercise!.name;
            return (
              <button
                key={i}
                className={`exercise-nav-btn ${i === currentExerciseIndex ? 'active' : ''} ${i < currentExerciseIndex ? 'done' : ''}`}
                onClick={() => {
                  if (i <= currentExerciseIndex) {
                    setCurrentExerciseIndex(i);
                    setCurrentSetIndex(0);
                  }
                }}
              >
                <span className="exercise-nav-num">{i + 1}</span>
                <span className="exercise-nav-name">{name}</span>
              </button>
            );
          })}
        </div>

        {completedSession && <SummaryCard session={completedSession} />}

        {completedSession && (
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button className="btn-primary" onClick={() => setView('history')}>
              查看历史记录
            </button>
            <button className="btn-secondary" onClick={() => setView('library')}>
              返回动作库
            </button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="history-view">
        <h2 style={{ marginBottom: 20, fontSize: 22, color: '#0D1B2A' }}>训练记录</h2>
        {history.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            暂无训练记录，开始你的第一次训练吧！
          </div>
        ) : (
          <div className="timeline-container">
            {history.map((session) => {
              const isExpanded = expandedCards.has(session.id);
              const dateStr = new Date(session.completedAt).toLocaleDateString('zh-CN', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              });

              return (
                <div key={session.id} className="card timeline-card" style={{ padding: 20, marginBottom: 16 }}>
                  <div
                    className="timeline-card-header"
                    onClick={() => toggleCardExpand(session.id)}
                  >
                    <div className="timeline-card-summary">
                      <div className="timeline-card-title">{session.templateName}</div>
                      <div className="timeline-card-date">{dateStr}</div>
                    </div>
                    <div className="timeline-card-metrics">
                      <span className="timeline-card-volume">
                        {session.totalVolume.toLocaleString()} kg
                      </span>
                      <span className="timeline-card-cal">{session.estimatedCalories} kcal</span>
                    </div>
                    <button className="expand-btn" onClick={(e) => { e.stopPropagation(); toggleCardExpand(session.id); }}>
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="timeline-card-detail">
                      <div className="detail-records">
                        <h4 style={{ marginBottom: 8, color: '#555' }}>动作详情</h4>
                        <div className="records-table-wrapper">
                          <table className="records-table">
                            <thead>
                              <tr>
                                <th>动作</th>
                                <th>重量</th>
                                <th>次数</th>
                                <th>完成时间</th>
                              </tr>
                            </thead>
                            <tbody>
                              {session.records.map((r, ri) => {
                                const ex = exerciseLibrary.find((e) => e.id === r.exerciseId);
                                return (
                                  <tr key={ri}>
                                    <td>{ex?.name || r.exerciseId}</td>
                                    <td>{r.weight} kg</td>
                                    <td>{r.reps}</td>
                                    <td>{new Date(r.completedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <SummaryCard session={session} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button className="btn-secondary" onClick={() => setView('library')}>
            返回
          </button>
        </div>
      </div>
    );
  }

  if (view === 'templates') {
    return (
      <div>
        <h2 style={{ marginBottom: 20, fontSize: 22, color: '#0D1B2A' }}>训练模板</h2>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12, color: '#333' }}>创建新模板</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="模板名称（如：胸肌日）"
              value={currentTemplateName}
              onChange={(e) => setCurrentTemplateName(e.target.value)}
              className="text-input"
            />
            <button className="btn-primary" onClick={saveTemplate} disabled={!currentTemplateName.trim() || currentTemplateExercises.length === 0}>
              保存模板
            </button>
          </div>

          {currentTemplateExercises.length > 0 && (
            <div className="template-exercises-list">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ color: '#555' }}>已添加的动作</h4>
                <button
                  className="btn-secondary"
                  onClick={() => setShowSuperSetDialog(!showSuperSetDialog)}
                  style={{ fontSize: 12, padding: '4px 12px' }}
                >
                  {showSuperSetDialog ? '取消组合' : '创建超级组'}
                </button>
              </div>

              {showSuperSetDialog && (
                <div className="superset-dialog card" style={{ padding: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                    选择2个动作组成超级组（间隔时间自动设为0秒）
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {currentTemplateExercises.map((item, i) => {
                      const name =
                        'isSuperSet' in item && item.isSuperSet
                          ? `超级组`
                          : (item as ExerciseInTemplate).name;
                      return (
                        <button
                          key={i}
                          className={`btn-secondary superset-pick-btn ${superSetIndices.includes(i) ? 'selected' : ''}`}
                          onClick={() => toggleSuperSetSelection(i)}
                          style={{
                            fontSize: 12,
                            padding: '4px 10px',
                            borderColor: superSetIndices.includes(i) ? '#FF6F00' : undefined,
                            background: superSetIndices.includes(i) ? 'rgba(255,111,0,0.1)' : undefined,
                          }}
                        >
                          {name.split('/')[0].trim()}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="btn-primary"
                    onClick={handleCreateSuperSet}
                    disabled={superSetIndices.length !== 2}
                    style={{ marginTop: 8, fontSize: 12, padding: '4px 12px' }}
                  >
                    确认组合
                  </button>
                </div>
              )}

              {currentTemplateExercises.map((item, i) => {
                if ('isSuperSet' in item && item.isSuperSet) {
                  const ss = item as SuperSet;
                  return (
                    <div key={i} className="superset-block">
                      <div className="superset-header">
                        🔥 超级组（间隔0秒）
                        <button className="remove-btn" onClick={() => handleRemoveExercise(i)}>✕</button>
                      </div>
                      {ss.exercises.map((ex, j) => (
                        <div key={j} className="template-exercise-item superset-member-item">
                          <span className="template-ex-name">{ex.name}</span>
                          <div className="template-ex-controls">
                            <label>{ex.sets}组</label>
                            <label>{ex.reps}次</label>
                            <span className="no-rest-tag">0s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
                const ex = item as ExerciseInTemplate;
                return (
                  <div key={i} className="template-exercise-item">
                    <span className="template-ex-name">{ex.name}</span>
                    <div className="template-ex-controls">
                      <label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={ex.sets}
                          onChange={(e) => handleUpdateExercise(i, 'sets', parseInt(e.target.value) || 1)}
                          className="num-input"
                        />
                        组
                      </label>
                      <label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={ex.reps}
                          onChange={(e) => handleUpdateExercise(i, 'reps', parseInt(e.target.value) || 1)}
                          className="num-input"
                        />
                        次
                      </label>
                      <label>
                        <input
                          type="number"
                          min={0}
                          max={300}
                          value={ex.restSeconds}
                          onChange={(e) => handleUpdateExercise(i, 'restSeconds', parseInt(e.target.value) || 0)}
                          className="num-input"
                        />
                        s
                      </label>
                    </div>
                    <button className="remove-btn" onClick={() => handleRemoveExercise(i)}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          <div
            className="drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <span style={{ color: '#aaa' }}>从动作库拖拽动作到此处添加</span>
          </div>
        </div>

        {templates.map((tpl) => (
          <div key={tpl.id} className="card" style={{ padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#0D1B2A' }}>{tpl.name}</h3>
                <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                  {tpl.exercises.length} 个动作 · 创建于 {new Date(tpl.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <button className="btn-primary" onClick={() => startTraining(tpl)}>
                开始训练
              </button>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 16 }}>
          <button className="btn-secondary" onClick={() => setView('library')}>
            返回动作库
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 22, color: '#0D1B2A' }}>动作库</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="搜索动作..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-input"
          style={{ flex: 1, minWidth: 200 }}
        />
        <button className="btn-primary" onClick={() => setView('templates')}>
          管理模板
        </button>
        <button className="btn-secondary" onClick={() => setView('history')}>
          训练记录
        </button>
      </div>

      <div className="muscle-filter-bar">
        {muscleGroups.map((mg) => (
          <button
            key={mg}
            className={`muscle-filter-btn ${muscleFilter === mg ? 'active' : ''}`}
            onClick={() => setMuscleFilter(mg)}
          >
            {mg === 'all' ? '全部' : muscleGroupLabels[mg]}
          </button>
        ))}
      </div>

      <div className="exercise-grid">
        {filteredExercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            draggable={true}
            onDragStart={handleDragStart}
          />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  draggable = false,
  onDragStart,
}: {
  exercise: Exercise;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, exercise: Exercise) => void;
  selected?: boolean;
  size?: 'normal' | 'small';
}) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) onDragStart(e, exercise);
  };

  return (
    <div
      ref={cardRef}
      className="exercise-card"
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {isVisible ? (
        <img className="exercise-gif" src={exercise.gifUrl} alt={exercise.name} />
      ) : (
        <div className="exercise-gif exercise-gif-placeholder" />
      )}
      <div className="exercise-info">
        <div className="exercise-name">{exercise.name}</div>
        <div className="exercise-muscle">{muscleGroupLabels[exercise.targetMuscle]}</div>
        <div className={`exercise-category ${exercise.category}`}>{exercise.category}</div>
      </div>
    </div>
  );
}
