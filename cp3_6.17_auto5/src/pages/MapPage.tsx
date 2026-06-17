import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, ChevronRight, BookOpen, Target, TrendingUp } from 'lucide-react';
import { Header } from '../components/Header';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import { PointDetailModal } from '../components/PointDetailModal';
import { AddPointModal } from '../components/AddPointModal';
import { useRecommendPath } from '../hooks/useRecommendPath';
import { useAppStore } from '../store';
import { KnowledgePoint, KnowledgeRelation, Difficulty } from '../types';

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  '初级': '#81c784',
  '中级': '#ffb74d',
  '高级': '#e57373',
};

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    currentCourse,
    knowledgePoints,
    relations,
    assessments,
    reviewRecords,
    selectedPoint,
    recommendPath,
    filterTag,
    setKnowledgePoints,
    setRelations,
    setAssessments,
    setReviewRecords,
    setSelectedPoint,
    setRecommendPath,
    setFilterTag,
    addKnowledgePoint,
    updateKnowledgePoint,
    addRelation,
    removeFromPath,
    addReviewRecord,
  } = useAppStore();

  const { path, isLoading, generatePath, setPath } = useRecommendPath();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!currentUser || !currentCourse) {
      navigate('/user');
      return;
    }
    loadData();
  }, [currentUser, currentCourse, navigate]);

  const loadData = async () => {
    if (!currentCourse) return;
    
    try {
      const [pointsRes, relationsRes, assessmentsRes, reviewsRes] = await Promise.all([
        fetch(`/api/courses/${currentCourse.id}/points`),
        fetch(`/api/courses/${currentCourse.id}/relations`),
        fetch(`/api/users/${currentUser?.id}/assessments`),
        fetch(`/api/users/${currentUser?.id}/reviews`),
      ]);
      
      const points = await pointsRes.json();
      const rels = await relationsRes.json();
      const asses = await assessmentsRes.json();
      const reviews = await reviewsRes.json();
      
      setKnowledgePoints(points);
      setRelations(rels);
      setAssessments(asses);
      setReviewRecords(reviews);
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };

  const allTags = Array.from(
    new Set(knowledgePoints.flatMap((p) => p.tags))
  ).filter(Boolean);

  const isTeacher = currentUser?.role === 'teacher';
  const coursePoints = knowledgePoints.filter((p) => p.courseId === currentCourse?.id);
  const courseRelations = relations.filter((r) => r.courseId === currentCourse?.id);

  const handlePointClick = useCallback((point: KnowledgePoint) => {
    setSelectedPoint(point);
  }, [setSelectedPoint]);

  const handlePointMove = useCallback(
    async (pointId: string, x: number, y: number) => {
      const point = knowledgePoints.find((p) => p.id === pointId);
      if (point) {
        const updated = { ...point, x, y };
        updateKnowledgePoint(updated);
        try {
          await fetch(`/api/points/${pointId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x, y }),
          });
        } catch (e) {
          console.error('Failed to update point position', e);
        }
      }
    },
    [knowledgePoints, updateKnowledgePoint]
  );

  const handleRelationCreate = useCallback(
    async (sourceId: string, targetId: string) => {
      const exists = relations.some(
        (r) => r.sourceId === sourceId && r.targetId === targetId
      );
      if (exists || !currentCourse) return;

      try {
        const response = await fetch('/api/relations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: currentCourse.id,
            sourceId,
            targetId,
            curvature: 0.5,
          }),
        });
        const newRelation = await response.json();
        addRelation(newRelation);
      } catch (e) {
        console.error('Failed to create relation', e);
      }
    },
    [relations, currentCourse, addRelation]
  );

  const handleRelationUpdate = useCallback(
    async (relationId: string, curvature: number) => {
      try {
        await fetch(`/api/relations/${relationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ curvature }),
        });
        setRelations(
          relations.map((r) =>
            r.id === relationId ? { ...r, curvature } : r
          )
        );
      } catch (e) {
        console.error('Failed to update relation', e);
      }
    },
    [relations, setRelations]
  );

  const handleGeneratePath = async () => {
    if (!currentUser || !currentCourse) return;
    setIsGenerating(true);
    try {
      await generatePath(
        currentUser.id,
        currentCourse.id,
        knowledgePoints,
        relations,
        assessments,
        reviewRecords,
        5
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!currentUser || !selectedPoint) return;
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          pointId: selectedPoint.id,
        }),
      });
      const record = await response.json();
      addReviewRecord(record);
      removeFromPath(selectedPoint.id);
      setPath(path.filter((id) => id !== selectedPoint.id));
      setRecommendPath(path.filter((id) => id !== selectedPoint.id));
      setSelectedPoint(null);
    } catch (e) {
      console.error('Failed to mark reviewed', e);
    }
  };

  const handleAddPoint = async (data: {
    title: string;
    description: string;
    difficulty: Difficulty;
    tags: string[];
  }) => {
    if (!currentCourse) return;
    try {
      const response = await fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          courseId: currentCourse.id,
          x: 300 + Math.random() * 200,
          y: 200 + Math.random() * 200,
        }),
      });
      const newPoint = await response.json();
      addKnowledgePoint(newPoint);
      setShowAddModal(false);
    } catch (e) {
      console.error('Failed to add point', e);
    }
  };

  const handleNavigateToNext = () => {
    const currentIndex = path.findIndex((id) => id === selectedPoint?.id);
    if (currentIndex >= 0 && currentIndex < path.length - 1) {
      const nextPoint = knowledgePoints.find((p) => p.id === path[currentIndex + 1]);
      if (nextPoint) {
        setSelectedPoint(nextPoint);
      }
    }
  };

  const getAssessmentScore = (pointId: string): number | null => {
    const assessment = assessments.find(
      (a) => a.pointId === pointId && a.userId === currentUser?.id
    );
    return assessment?.score ?? null;
  };

  const isReviewed = (pointId: string): boolean => {
    return reviewRecords.some(
      (r) => r.pointId === pointId && r.userId === currentUser?.id
    );
  };

  const currentPath = recommendPath.length > 0 ? recommendPath : path;
  const weakPoints = assessments.filter(
    (a) => a.score < 60 && a.userId === currentUser?.id && a.courseId === currentCourse?.id
  );

  return (
    <div className="min-h-screen bg-white">
      <Header
        course={currentCourse}
        currentUser={currentUser}
        allTags={allTags}
        filterTag={filterTag}
        onFilterChange={setFilterTag}
        onUserClick={() => navigate('/user')}
      />

      <div className="pt-14 min-h-screen flex flex-col lg:flex-row">
        <div className="flex-1 lg:w-[70%] bg-white p-4 lg:p-6">
          <div className="h-[60vh] lg:h-[calc(100vh-56px-48px)] rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <KnowledgeGraph
              points={coursePoints}
              relations={courseRelations}
              recommendPath={currentPath}
              filterTag={filterTag}
              isTeacher={isTeacher}
              onPointClick={handlePointClick}
              onPointMove={handlePointMove}
              onRelationCreate={handleRelationCreate}
              onRelationUpdate={handleRelationUpdate}
            />
          </div>
        </div>

        <div
          className="lg:w-[30%] p-4 lg:p-6 lg:border-l"
          style={{ backgroundColor: '#f5f5f5', borderColor: '#e0e0e0' }}
        >
          <div className="space-y-4">
            {currentCourse && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(26, 35, 126, 0.1)' }}
                  >
                    <BookOpen size={20} style={{ color: '#1a237e' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: '#212121' }}>
                      {currentCourse.title}
                    </h3>
                    <p className="text-xs" style={{ color: '#757575' }}>
                      {coursePoints.length} 个知识点
                    </p>
                  </div>
                </div>
                <p className="text-sm" style={{ color: '#424242' }}>
                  {currentCourse.description}
                </p>
              </div>
            )}

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Target size={18} style={{ color: '#00bcd4' }} />
                <h3 className="font-semibold" style={{ color: '#212121' }}>
                  学习统计
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: '#1a237e' }}>
                    {coursePoints.length}
                  </p>
                  <p className="text-xs" style={{ color: '#757575' }}>
                    总知识点
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: '#e57373' }}>
                    {weakPoints.length}
                  </p>
                  <p className="text-xs" style={{ color: '#757575' }}>
                    薄弱点
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: '#81c784' }}>
                    {reviewRecords.filter((r) => r.userId === currentUser?.id).length}
                  </p>
                  <p className="text-xs" style={{ color: '#757575' }}>
                    已复习
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} style={{ color: '#00bcd4' }} />
                <h3 className="font-semibold" style={{ color: '#212121' }}>
                  复习路径
                </h3>
              </div>

              {currentPath.length > 0 ? (
                <div className="space-y-2">
                  {currentPath.map((pointId, index) => {
                    const point = knowledgePoints.find((p) => p.id === pointId);
                    if (!point) return null;
                    const isCurrent = selectedPoint?.id === pointId;
                    const isPointReviewed = isReviewed(pointId);

                    return (
                      <button
                        key={pointId}
                        onClick={() => setSelectedPoint(point)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-gray-50`}
                        style={{
                          backgroundColor: isCurrent ? 'rgba(26, 35, 126, 0.05)' : 'transparent',
                          boxShadow: isCurrent ? '0 0 0 2px #1a237e' : 'none',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: DIFFICULTY_COLORS[point.difficulty] }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium" style={{ color: '#212121' }}>
                            {point.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: DIFFICULTY_COLORS[point.difficulty] }}
                            >
                              {point.difficulty}
                            </span>
                            {isPointReviewed && (
                              <span className="text-xs text-green-600">已复习</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: '#bdbdbd' }} />
                      </button>
                    );
                  })}

                  {selectedPoint && path.findIndex((id) => id === selectedPoint.id) < path.length - 1 && (
                    <button
                      onClick={handleNavigateToNext}
                      className="w-full py-2 rounded-lg text-sm font-medium text-white mt-2 transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: '#00bcd4' }}
                    >
                      下一节 →
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm mb-4" style={{ color: '#757575' }}>
                    点击按钮生成个性化复习路径
                  </p>
                </div>
              )}

              <button
                onClick={handleGeneratePath}
                disabled={isLoading || isGenerating}
                className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-4"
                style={{ backgroundColor: '#1a237e' }}
              >
                <Sparkles size={18} />
                {isLoading || isGenerating ? '生成中...' : '生成复习路径'}
              </button>
            </div>

            {isTeacher && (
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: '#00bcd4' }}
              >
                <Plus size={18} />
                添加知识点
              </button>
            )}

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3" style={{ color: '#212121' }}>
                图例说明
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: '#81c784' }}
                  />
                  <span style={{ color: '#424242' }}>初级难度</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: '#ffb74d' }}
                  />
                  <span style={{ color: '#424242' }}>中级难度</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: '#e57373' }}
                  />
                  <span style={{ color: '#424242' }}>高级难度</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-0.5"
                    style={{ backgroundColor: '#1976d2' }}
                  />
                  <span style={{ color: '#424242' }}>知识点关系</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-0.5 border-t-2 border-dashed"
                    style={{ borderColor: '#f44336' }}
                  />
                  <span style={{ color: '#424242' }}>复习路径</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedPoint && (
        <PointDetailModal
          point={selectedPoint}
          isInPath={currentPath.includes(selectedPoint.id)}
          isReviewed={isReviewed(selectedPoint.id)}
          assessmentScore={getAssessmentScore(selectedPoint.id)}
          onClose={() => setSelectedPoint(null)}
          onMarkReviewed={handleMarkReviewed}
        />
      )}

      {showAddModal && (
        <AddPointModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPoint}
        />
      )}
    </div>
  );
};
