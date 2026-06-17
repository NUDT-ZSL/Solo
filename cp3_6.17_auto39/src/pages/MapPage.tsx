import React, { useState, useEffect, useMemo, useCallback } from 'react';
import KnowledgeGraph from '../components/KnowledgeGraph';
import PointDetailModal from '../components/PointDetailModal';
import { useRecommendPath } from '../hooks/useRecommendPath';
import { KnowledgePoint, Relation, Course, User } from '../types';
import { pointApi, relationApi, assessmentApi } from '../services/api';

interface MapPageProps {
  course: Course | null;
  currentUser: User | null;
}

const MapPage: React.FC<MapPageProps> = ({ course, currentUser }) => {
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<KnowledgePoint | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [reviewedPointIds, setReviewedPointIds] = useState<string[]>([]);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [showAddPoint, setShowAddPoint] = useState(false);
  const [newPoint, setNewPoint] = useState({
    title: '',
    description: '',
    difficulty: 'beginner' as const,
    tags: ''
  });

  const { path, loading, computePath, removeFromPath } = useRecommendPath(
    points,
    relations,
    scores
  );

  const isTeacher = currentUser?.role === 'teacher';

  useEffect(() => {
    if (course) {
      loadCourseData();
      if (currentUser) {
        loadScores();
      }
    }
  }, [course?.id, currentUser?.id]);

  const loadCourseData = async () => {
    if (!course) return;
    const [pointsData, relationsData] = await Promise.all([
      pointApi.getByCourse(course.id),
      relationApi.getByCourse(course.id)
    ]);
    setPoints(pointsData);
    setRelations(relationsData);
  };

  const loadScores = async () => {
    if (!course || !currentUser) return;
    const assessment = await assessmentApi.get(currentUser.id, course.id);
    if (assessment) {
      const scoreMap = new Map<string, number>();
      assessment.scores.forEach(s => scoreMap.set(s.pointId, s.score));
      setScores(scoreMap);
    }
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    points.forEach(p => p.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet);
  }, [points]);

  const handlePointMove = useCallback(async (pointId: string, x: number, y: number) => {
    setPoints(prev => prev.map(p => p.id === pointId ? { ...p, x, y } : p));
  }, []);

  const handlePointMoveEnd = useCallback(async (pointId: string) => {
    const point = points.find(p => p.id === pointId);
    if (point && isTeacher) {
      await pointApi.update(pointId, { x: point.x, y: point.y });
    }
  }, [points, isTeacher]);

  const handleRelationCreate = useCallback(async (sourceId: string, targetId: string) => {
    if (!course || !isTeacher) return;
    try {
      const source = points.find(p => p.id === sourceId);
      const target = points.find(p => p.id === targetId);
      if (!source || !target) return;
      
      const newRel = await relationApi.create(course.id, {
        sourceId,
        targetId,
        controlX: (source.x + target.x) / 2,
        controlY: (source.y + target.y) / 2 - 50
      });
      setRelations(prev => [...prev, newRel]);
    } catch (e) {
      console.error('Failed to create relation');
    }
  }, [course, isTeacher, points]);

  const handleRelationUpdate = useCallback(async (relationId: string, controlX: number, controlY: number) => {
    if (!isTeacher) return;
    setRelations(prev => prev.map(r => r.id === relationId ? { ...r, controlX, controlY } : r));
  }, [isTeacher]);

  const handleAddPoint = async () => {
    if (!course || !newPoint.title) return;
    
    const tags = newPoint.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t)
      .slice(0, 5);

    const created = await pointApi.create(course.id, {
      ...newPoint,
      tags,
      x: 200 + Math.random() * 400,
      y: 150 + Math.random() * 300
    });
    
    setPoints(prev => [...prev, created]);
    setNewPoint({ title: '', description: '', difficulty: 'beginner', tags: '' });
    setShowAddPoint(false);
  };

  const handleGeneratePath = () => {
    computePath(5);
  };

  const handleMarkReviewed = (pointId: string) => {
    setReviewedPointIds(prev => [...prev, pointId]);
    removeFromPath(pointId);
    setSelectedPoint(prev => prev && prev.id === pointId ? { ...prev } : prev);
  };

  const currentPathIndex = useMemo(() => {
    if (path.length === 0 || !selectedPoint) return -1;
    return path.indexOf(selectedPoint.id);
  }, [path, selectedPoint]);

  const goToNext = () => {
    if (currentPathIndex >= 0 && currentPathIndex < path.length - 1) {
      const nextPoint = points.find(p => p.id === path[currentPathIndex + 1]);
      if (nextPoint) setSelectedPoint(nextPoint);
    }
  };

  const goToPrev = () => {
    if (currentPathIndex > 0) {
      const prevPoint = points.find(p => p.id === path[currentPathIndex - 1]);
      if (prevPoint) setSelectedPoint(prevPoint);
    }
  };

  if (!course) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: '#9e9e9e' }}>请选择一个课程</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div
        style={{
          width: '70%',
          height: '100%',
          backgroundColor: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {isTeacher && (
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowAddPoint(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1a237e',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              + 添加知识点
            </button>
            <span style={{
              alignSelf: 'center',
              fontSize: 12,
              color: '#757575'
            }}>
              提示：按住 Shift + 拖拽节点可创建关系
            </span>
          </div>
        )}

        <KnowledgeGraph
          points={points}
          relations={relations}
          selectedPointId={selectedPoint?.id || null}
          onPointClick={setSelectedPoint}
          onPointMove={handlePointMove}
          onRelationCreate={handleRelationCreate}
          onRelationUpdate={handleRelationUpdate}
          filterTag={filterTag}
          highlightPath={path}
          isTeacherMode={isTeacher}
          reviewedPointIds={reviewedPointIds}
        />
      </div>

      <div
        style={{
          width: '30%',
          backgroundColor: '#f5f5f5',
          borderRadius: 8,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto'
        }}
      >
        <div>
          <h3 style={{ fontSize: 16, color: '#1a237e', marginBottom: 8 }}>课程信息</h3>
          <p style={{ fontSize: 13, color: '#616161', lineHeight: 1.5 }}>{course.description}</p>
        </div>

        {!isTeacher && (
          <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 15, color: '#1a237e', marginBottom: 12 }}>复习路径</h3>
            <button
              onClick={handleGeneratePath}
              disabled={loading}
              style={{
                width: '100%',
                padding: 10,
                backgroundColor: '#00bcd4',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '生成中...' : '生成复习路径'}
            </button>

            {path.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, color: '#757575', marginBottom: 10 }}>
                  推荐 {path.length} 个知识点复习：
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {path.map((pointId, idx) => {
                    const point = points.find(p => p.id === pointId);
                    const score = scores.get(pointId);
                    const isReviewed = reviewedPointIds.includes(pointId);
                    
                    return (
                      <div
                        key={pointId}
                        onClick={() => point && setSelectedPoint(point)}
                        style={{
                          padding: 10,
                          backgroundColor: isReviewed ? '#e8f5e9' : '#fafafa',
                          borderRadius: 6,
                          cursor: 'pointer',
                          border: currentPathIndex === idx ? '2px solid #00bcd4' : '1px solid #e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: isReviewed ? '#4caf50' : '#ffc107',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            flexShrink: 0
                          }}
                        >
                          {isReviewed ? '✓' : idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, color: '#212121', margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {point?.title || '未知'}
                          </p>
                          {score !== undefined && (
                            <p style={{ fontSize: 11, color: score < 60 ? '#f44336' : '#9e9e9e', margin: 0 }}>
                              得分: {score}分
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {currentPathIndex >= 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button
                      onClick={goToPrev}
                      disabled={currentPathIndex === 0}
                      style={{
                        flex: 1,
                        padding: 8,
                        backgroundColor: currentPathIndex === 0 ? '#e0e0e0' : '#e3f2fd',
                        color: currentPathIndex === 0 ? '#9e9e9e' : '#1976d2',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 13,
                        cursor: currentPathIndex === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ← 上一个
                    </button>
                    <button
                      onClick={goToNext}
                      disabled={currentPathIndex >= path.length - 1}
                      style={{
                        flex: 1,
                        padding: 8,
                        backgroundColor: currentPathIndex >= path.length - 1 ? '#e0e0e0' : '#1a237e',
                        color: currentPathIndex >= path.length - 1 ? '#9e9e9e' : '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 13,
                        cursor: currentPathIndex >= path.length - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      下一个 →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 15, color: '#1a237e', marginBottom: 12 }}>知识点统计</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#757575' }}>总知识点</span>
              <span style={{ color: '#212121', fontWeight: 500 }}>{points.length} 个</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#757575' }}>关系连线</span>
              <span style={{ color: '#212121', fontWeight: 500 }}>{relations.length} 条</span>
            </div>
            {!isTeacher && reviewedPointIds.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#757575' }}>已复习</span>
                <span style={{ color: '#4caf50', fontWeight: 500 }}>{reviewedPointIds.length} 个</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 15, color: '#1a237e', marginBottom: 12 }}>难度分布</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['beginner', 'intermediate', 'advanced'] as const).map(level => {
              const count = points.filter(p => p.difficulty === level).length;
              const labels = { beginner: '初级', intermediate: '中级', advanced: '高级' };
              const colors = { beginner: '#81c784', intermediate: '#ffb74d', advanced: '#e57373' };
              return (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: colors[level]
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#616161', flex: 1 }}>{labels[level]}</span>
                  <span style={{ fontSize: 13, color: '#212121', fontWeight: 500 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {allTags.length > 0 && (
          <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 15, color: '#1a237e', marginBottom: 12 }}>标签</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allTags.map(tag => (
                <span
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: filterTag === tag ? '#1a237e' : '#e3f2fd',
                    color: filterTag === tag ? '#fff' : '#1976d2',
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <PointDetailModal
        point={selectedPoint}
        onClose={() => setSelectedPoint(null)}
        onMarkReviewed={() => selectedPoint && handleMarkReviewed(selectedPoint.id)}
        isReviewed={selectedPoint ? reviewedPointIds.includes(selectedPoint.id) : false}
        showReviewButton={!isTeacher}
      />

      {showAddPoint && isTeacher && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowAddPoint(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 400,
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
            }}
          >
            <h2 style={{ fontSize: 18, color: '#1a237e', marginBottom: 20 }}>添加知识点</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#616161', marginBottom: 6 }}>标题</label>
              <input
                type="text"
                value={newPoint.title}
                onChange={e => setNewPoint({ ...newPoint, title: e.target.value })}
                placeholder="输入知识点标题"
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #e0e0e0',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#616161', marginBottom: 6 }}>详细描述</label>
              <textarea
                value={newPoint.description}
                onChange={e => setNewPoint({ ...newPoint, description: e.target.value })}
                placeholder="输入知识点详细描述"
                rows={4}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #e0e0e0',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#616161', marginBottom: 6 }}>难度等级</label>
              <select
                value={newPoint.difficulty}
                onChange={e => setNewPoint({ ...newPoint, difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #e0e0e0',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none'
                }}
              >
                <option value="beginner">初级</option>
                <option value="intermediate">中级</option>
                <option value="advanced">高级</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#616161', marginBottom: 6 }}>标签（最多5个，用逗号分隔）</label>
              <input
                type="text"
                value={newPoint.tags}
                onChange={e => setNewPoint({ ...newPoint, tags: e.target.value })}
                placeholder="例如：基础, 必学, 重点"
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #e0e0e0',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowAddPoint(false)}
                style={{
                  flex: 1,
                  padding: 10,
                  backgroundColor: '#f5f5f5',
                  color: '#616161',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={handleAddPoint}
                style={{
                  flex: 1,
                  padding: 10,
                  backgroundColor: '#1a237e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
