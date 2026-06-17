import { useState, useEffect, useCallback } from 'react';
import KnowledgeGraph from '../components/KnowledgeGraph';
import KnowledgeDetailModal from '../components/KnowledgeDetailModal';
import useRecommendPath from '../hooks/useRecommendPath';
import type { KnowledgePoint, Relation, UserScore } from '../types';
import './MapPage.css';

interface MapPageProps {
  courseId: string;
  userId: string;
  userRole: 'teacher' | 'student';
}

function MapPage({ courseId, userId, userRole }: MapPageProps) {
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [scores, setScores] = useState<UserScore[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<KnowledgePoint | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [allTags, setAllTags] = useState<string[]>([]);

  const {
    path: reviewPath,
    weakPoints,
    loading: pathLoading,
    fetchAndCalculate,
    clearPath,
    removeFromPath
  } = useRecommendPath();

  useEffect(() => {
    if (!courseId) return;

    Promise.all([
      fetch(`/api/courses/${courseId}/knowledge-points`).then(res => res.json()),
      fetch(`/api/courses/${courseId}/relations`).then(res => res.json()),
      fetch(`/api/users/${userId}/scores`).then(res => res.json()).catch(() => [])
    ]).then(([pointsData, relationsData, scoresData]) => {
      setPoints(pointsData);
      setRelations(relationsData);
      setScores(scoresData);

      const tags = new Set<string>();
      pointsData.forEach((p: KnowledgePoint) => {
        p.tags.forEach(t => tags.add(t));
      });
      setAllTags(Array.from(tags));
    }).catch(err => {
      console.error('Failed to load data:', err);
    });
  }, [courseId, userId]);

  const handlePointMove = useCallback((pointId: string, x: number, y: number) => {
    setPoints(prev => prev.map(p =>
      p.id === pointId ? { ...p, x, y } : p
    ));

    fetch(`/api/knowledge-points/${pointId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y })
    }).catch(err => console.error('Failed to update point position:', err));
  }, []);

  const handleRelationCreate = useCallback((sourceId: string, targetId: string) => {
    fetch(`/api/courses/${courseId}/relations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId })
    })
      .then(res => {
        if (!res.ok) throw new Error('Relation already exists');
        return res.json();
      })
      .then(newRelation => {
        setRelations(prev => [...prev, newRelation]);
      })
      .catch(err => {
        console.error('Failed to create relation:', err);
      });
  }, [courseId]);

  const handleRelationUpdate = useCallback((relationId: string, curvature: number) => {
    setRelations(prev => prev.map(r =>
      r.id === relationId ? { ...r, curvature } : r
    ));

    fetch(`/api/relations/${relationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curvature })
    }).catch(err => console.error('Failed to update relation:', err));
  }, []);

  const handlePointClick = useCallback((point: KnowledgePoint) => {
    setSelectedPoint(point);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedPoint(null);
  }, []);

  const handleGeneratePath = useCallback(() => {
    fetchAndCalculate(courseId, userId);
  }, [fetchAndCalculate, courseId, userId]);

  const handleMarkReviewed = useCallback((pointId: string) => {
    fetch(`/api/users/${userId}/scores/${pointId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewed: true })
    }).then(() => {
      setScores(prev => prev.map(s =>
        s.knowledgePointId === pointId ? { ...s, reviewed: true } : s
      ));

      const currentIndex = reviewPath.indexOf(pointId);
      removeFromPath(pointId);

      setTimeout(() => {
        const newPath = reviewPath.filter(id => id !== pointId);
        if (newPath.length > 0) {
          const nextIndex = Math.min(currentIndex, newPath.length - 1);
          const nextPointId = newPath[nextIndex];
          const nextPoint = points.find(p => p.id === nextPointId);
          if (nextPoint) {
            setSelectedPoint(nextPoint);
          } else {
            setSelectedPoint(null);
          }
        } else {
          setSelectedPoint(null);
        }
      }, 50);
    }).catch(err => console.error('Failed to mark reviewed:', err));
  }, [userId, removeFromPath, reviewPath, points]);

  const handleNextReview = useCallback(() => {
    if (reviewPath.length > 0) {
      const nextPoint = points.find(p => p.id === reviewPath[0]);
      if (nextPoint) {
        setSelectedPoint(nextPoint);
      }
    }
  }, [reviewPath, points]);

  const reviewedIds = scores.filter(s => s.reviewed).map(s => s.knowledgePointId);

  const getScoreForPoint = (pointId: string): number | null => {
    const score = scores.find(s => s.knowledgePointId === pointId);
    return score ? score.score : null;
  };

  return (
    <div className="map-page">
      <div className="map-toolbar">
        <div className="toolbar-left">
          <label className="filter-label">
            标签过滤：
            <select
              className="filter-select"
              value={filterTag || ''}
              onChange={(e) => setFilterTag(e.target.value || null)}
            >
              <option value="">全部标签</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="toolbar-right">
          {userRole === 'teacher' && (
            <button
              className={`mode-btn ${mode === 'edit' ? 'active' : ''}`}
              onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
            >
              {mode === 'edit' ? '退出编辑' : '编辑图谱'}
            </button>
          )}
        </div>
      </div>

      <div className="map-content">
        <div className="graph-section">
          <KnowledgeGraph
            points={points}
            relations={relations}
            highlightPath={reviewPath}
            filterTag={filterTag}
            mode={mode}
            onPointClick={handlePointClick}
            onPointMove={handlePointMove}
            onRelationCreate={handleRelationCreate}
            onRelationUpdate={handleRelationUpdate}
            reviewedIds={reviewedIds}
          />
        </div>

        <div className="panel-section">
          <div className="info-panel">
            <h3 className="panel-title">学习进度</h3>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-number">{points.length}</span>
                <span className="stat-label">总知识点</span>
              </div>
              <div className="stat-card weak">
                <span className="stat-number">{weakPoints.length}</span>
                <span className="stat-label">薄弱点</span>
              </div>
              <div className="stat-card reviewed">
                <span className="stat-number">{reviewedIds.length}</span>
                <span className="stat-label">已复习</span>
              </div>
            </div>

            <div className="path-section">
              <h4 className="section-title">推荐复习路径</h4>

              {reviewPath.length === 0 ? (
                <div className="empty-path">
                  <p className="empty-text">
                    {pathLoading ? '生成中...' : '点击下方按钮生成个性化复习路径'}
                  </p>
                  <button
                    className="generate-btn"
                    onClick={handleGeneratePath}
                    disabled={pathLoading}
                  >
                    {pathLoading ? '生成中...' : '生成复习路径'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="path-list">
                    {reviewPath.map((pointId, index) => {
                      const point = points.find(p => p.id === pointId);
                      const score = getScoreForPoint(pointId);
                      const isReviewed = reviewedIds.includes(pointId);
                      return (
                        <div
                          key={pointId}
                          className={`path-item ${isReviewed ? 'reviewed' : ''}`}
                          onClick={() => point && setSelectedPoint(point)}
                        >
                          <span className="path-index">{index + 1}</span>
                          <span className="path-title">{point?.title || '未知'}</span>
                          {score !== null && (
                            <span className={`path-score ${score < 60 ? 'low' : ''}`}>
                              {score}分
                            </span>
                          )}
                          {isReviewed && <span className="reviewed-check">✓</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="path-actions">
                    <button
                      className="next-btn"
                      onClick={handleNextReview}
                      disabled={reviewPath.length === 0}
                    >
                      开始复习 →
                    </button>
                    <button
                      className="clear-btn"
                      onClick={clearPath}
                    >
                      清除路径
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="legend-section">
              <h4 className="section-title">图例说明</h4>
              <div className="legend-list">
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#81c784' }}></span>
                  <span className="legend-text">初级难度</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#ffb74d' }}></span>
                  <span className="legend-text">中级难度</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#e57373' }}></span>
                  <span className="legend-text">高级难度</span>
                </div>
                <div className="legend-item">
                  <span className="legend-line" style={{ backgroundColor: '#f44336', borderStyle: 'dashed' }}></span>
                  <span className="legend-text">复习路径</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <KnowledgeDetailModal
        point={selectedPoint}
        onClose={handleCloseModal}
        onMarkReviewed={() => selectedPoint && handleMarkReviewed(selectedPoint.id)}
        showReviewButton={userRole === 'student' && reviewPath.includes(selectedPoint?.id || '')}
        isReviewed={selectedPoint ? reviewedIds.includes(selectedPoint.id) : false}
      />
    </div>
  );
}

export default MapPage;
