import React, { useState, useEffect, useCallback } from 'react';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import { KnowledgePointDetail } from '../components/KnowledgePointDetail';
import { Header } from '../components/Header';
import { useRecommendPath } from '../hooks/useRecommendPath';
import type { KnowledgePoint, Relation, Course, AssessmentScore, ReviewedNode } from '../types';

interface MapPageProps {
  isTeacher?: boolean;
  currentUserId?: string;
}

export const MapPage: React.FC<MapPageProps> = ({ isTeacher = false, currentUserId = 'user-2' }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [reviewedNodes, setReviewedNodes] = useState<ReviewedNode[]>([]);
  const [selectedKp, setSelectedKp] = useState<KnowledgePoint | null>(null);
  const [filterTag, setFilterTag] = useState('');
  const [recommendPath, setRecommendPath] = useState<string[]>([]);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [pathGenerated, setPathGenerated] = useState(false);
  const [showAddKpModal, setShowAddKpModal] = useState(false);
  const [newKp, setNewKp] = useState({
    title: '',
    description: '',
    difficulty: '初级' as '初级' | '中级' | '高级',
    tags: '',
  });

  const computedPath = useRecommendPath({
    knowledgePoints,
    relations,
    scores,
    reviewedNodes,
    maxNodes: 5,
  });

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then((data: Course[]) => {
        if (data.length > 0) setCourse(data[0]);
      });
  }, []);

  const loadData = useCallback(() => {
    if (!course) return;
    fetch(`/api/knowledge-points?courseId=${course.id}`)
      .then(res => res.json())
      .then(setKnowledgePoints);
    fetch(`/api/relations?courseId=${course.id}`)
      .then(res => res.json())
      .then(setRelations);
    fetch(`/api/assessment-scores?userId=${currentUserId}`)
      .then(res => res.json())
      .then(setScores);
    fetch(`/api/reviewed-nodes?userId=${currentUserId}`)
      .then(res => res.json())
      .then(setReviewedNodes);
  }, [course, currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allTags = Array.from(new Set(knowledgePoints.flatMap(kp => kp.tags)));

  const handleNodeMove = useCallback((id: string, x: number, y: number) => {
    setKnowledgePoints(prev => prev.map(kp => (kp.id === id ? { ...kp, x, y } : kp)));
    fetch(`/api/knowledge-points/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y }),
    });
  }, []);

  const handleRelationCreate = useCallback((sourceId: string, targetId: string) => {
    if (!course) return;
    const body = { courseId: course.id, sourceId, targetId, curve: 0 };
    fetch('/api/relations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(res => res.json())
      .then((newRel: Relation) => {
        setRelations(prev => [...prev, newRel]);
      });
  }, [course]);

  const handleRelationCurveChange = useCallback((relationId: string, curve: number) => {
    setRelations(prev => prev.map(r => (r.id === relationId ? { ...r, curve } : r)));
    fetch(`/api/relations/${relationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curve }),
    });
  }, []);

  const handleGeneratePath = () => {
    setRecommendPath(computedPath);
    setCurrentPathIndex(0);
    setPathGenerated(true);
  };

  const handleReviewCurrent = () => {
    if (recommendPath.length === 0 || currentPathIndex >= recommendPath.length) return;
    const kpId = recommendPath[currentPathIndex];
    fetch('/api/reviewed-nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, knowledgePointId: kpId }),
    }).then(() => {
      const newPath = recommendPath.filter(id => id !== kpId);
      setRecommendPath(newPath);
      setReviewedNodes(prev => [
        ...prev.filter(r => r.knowledgePointId !== kpId),
        { id: '', userId: currentUserId, knowledgePointId: kpId, reviewedAt: new Date().toISOString() },
      ]);
      if (currentPathIndex >= newPath.length) {
        setCurrentPathIndex(Math.max(0, newPath.length - 1));
      }
    });
  };

  const handleNextNode = () => {
    if (currentPathIndex < recommendPath.length - 1) {
      const nextIndex = currentPathIndex + 1;
      setCurrentPathIndex(nextIndex);
      const nextKp = knowledgePoints.find(kp => kp.id === recommendPath[nextIndex]);
      if (nextKp) setSelectedKp(nextKp);
    }
  };

  const handleAddKnowledgePoint = () => {
    if (!course || !newKp.title.trim()) return;
    const tags = newKp.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean).slice(0, 5);
    const body = {
      courseId: course.id,
      title: newKp.title,
      description: newKp.description,
      difficulty: newKp.difficulty,
      tags,
      x: 400 + Math.random() * 100,
      y: 300 + Math.random() * 100,
    };
    fetch('/api/knowledge-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(res => res.json())
      .then((kp: KnowledgePoint) => {
        setKnowledgePoints(prev => [...prev, kp]);
        setShowAddKpModal(false);
        setNewKp({ title: '', description: '', difficulty: '初级', tags: '' });
      });
  };

  const getScore = (kpId: string) => scores.find(s => s.knowledgePointId === kpId)?.score;

  const currentPathKp = knowledgePoints.find(kp => kp.id === recommendPath[currentPathIndex]);

  return (
    <div className="app-container">
      <Header
        courseTitle={course?.title}
        filterTag={filterTag}
        availableTags={allTags}
        onFilterChange={setFilterTag}
      />
      <main className="main-content">
        <div className="page-container">
          <div className="graph-area">
            <KnowledgeGraph
              knowledgePoints={knowledgePoints}
              relations={relations}
              highlightPath={recommendPath}
              currentPathIndex={currentPathIndex}
              filterTag={filterTag}
              isTeacher={isTeacher}
              onNodeClick={setSelectedKp}
              onNodeMove={handleNodeMove}
              onRelationCreate={handleRelationCreate}
              onRelationCurveChange={handleRelationCurveChange}
            />
          </div>
          <aside className="info-panel">
            {isTeacher && (
              <div className="panel-section">
                <h3 className="panel-title">教师操作</h3>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowAddKpModal(true)}>
                  + 添加知识点
                </button>
                <p style={{ marginTop: 12, fontSize: 12, color: '#757575', lineHeight: 1.6 }}>
                  提示：按住 Shift 键从源节点拖拽到目标节点可创建关系连线，拖动连线中点可调整曲率
                </p>
              </div>
            )}
            {!isTeacher && (
              <>
                <div className="panel-section">
                  <h3 className="panel-title">复习路径</h3>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={handleGeneratePath}
                  >
                    {pathGenerated ? '重新生成复习路径' : '生成复习路径'}
                  </button>
                </div>
                {pathGenerated && recommendPath.length > 0 && (
                  <div className="panel-section">
                    <h3 className="panel-title">推荐复习顺序</h3>
                    <ul className="path-list">
                      {recommendPath.map((kpId, idx) => {
                        const kp = knowledgePoints.find(k => k.id === kpId);
                        return (
                          <li
                            key={kpId}
                            className={`path-item ${idx === currentPathIndex ? 'current' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setCurrentPathIndex(idx);
                              if (kp) setSelectedKp(kp);
                            }}
                          >
                            <span className="path-item-index">{idx + 1}</span>
                            <span className="path-item-title">{kp?.title ?? '未知知识点'}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {pathGenerated && recommendPath.length === 0 && (
                  <div className="panel-section">
                    <div className="empty-state">
                      <div className="empty-state-icon">🎉</div>
                      <p>太棒了！所有知识点都已掌握</p>
                    </div>
                  </div>
                )}
                {currentPathKp && (
                  <button
                    className="next-nav-btn"
                    onClick={() => setSelectedKp(currentPathKp)}
                  >
                    复习：{currentPathKp.title} →
                  </button>
                )}
                {pathGenerated && recommendPath.length > 1 && currentPathIndex < recommendPath.length - 1 && (
                  <button className="btn btn-secondary" onClick={handleNextNode}>
                    下一节 →
                  </button>
                )}
              </>
            )}
            <div className="panel-section">
              <h3 className="panel-title">知识点统计</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>总知识点数</span>
                  <span style={{ fontWeight: 600, color: '#1a237e' }}>{knowledgePoints.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>关系连线数</span>
                  <span style={{ fontWeight: 600, color: '#00bcd4' }}>{relations.length}</span>
                </div>
                {!isTeacher && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>薄弱点数量</span>
                    <span style={{ fontWeight: 600, color: '#e57373' }}>
                      {knowledgePoints.filter(kp => (getScore(kp.id) ?? 0) < 60).length}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="panel-section">
              <h3 className="panel-title">难度图例</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#81c784', display: 'inline-block' }} />
                  <span>初级</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#ffb74d', display: 'inline-block' }} />
                  <span>中级</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#e57373', display: 'inline-block' }} />
                  <span>高级</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      {selectedKp && (
        <KnowledgePointDetail
          knowledgePoint={selectedKp}
          onClose={() => setSelectedKp(null)}
          showReviewButton={!isTeacher && recommendPath.includes(selectedKp.id)}
          onReview={handleReviewCurrent}
          score={getScore(selectedKp.id)}
        />
      )}
      {showAddKpModal && (
        <div className="modal-overlay" onClick={() => setShowAddKpModal(false)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            <h2 className="detail-title">添加知识点</h2>
            <div className="form-group">
              <label className="form-label">标题</label>
              <input
                className="form-input"
                value={newKp.title}
                onChange={e => setNewKp(prev => ({ ...prev, title: e.target.value }))}
                placeholder="请输入知识点标题"
              />
            </div>
            <div className="form-group">
              <label className="form-label">详细描述</label>
              <textarea
                className="form-textarea"
                value={newKp.description}
                onChange={e => setNewKp(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入知识点详细描述"
              />
            </div>
            <div className="form-group">
              <label className="form-label">难度等级</label>
              <select
                className="form-select"
                value={newKp.difficulty}
                onChange={e => setNewKp(prev => ({ ...prev, difficulty: e.target.value as '初级' | '中级' | '高级' }))}
              >
                <option value="初级">初级</option>
                <option value="中级">中级</option>
                <option value="高级">高级</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">标签（最多5个，用逗号分隔）</label>
              <input
                className="form-input"
                value={newKp.tags}
                onChange={e => setNewKp(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="例如：React, 前端, 组件"
              />
            </div>
            <div className="detail-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddKpModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleAddKnowledgePoint}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
