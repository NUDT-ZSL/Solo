import React, { useState, useEffect } from 'react';
import type { KnowledgePoint, Relation, Course, User } from '../types';
import KnowledgeGraph, { KnowledgeGraphHandle } from '../components/KnowledgeGraph';
import useRecommendPath from '../hooks/useRecommendPath';

interface MapPageProps {
  course: Course | null;
  currentUser: User | null;
}

const SAMPLE_USER_ID = 'user-1';
const SAMPLE_TEACHER_ID = 'teacher-1';

const MapPage: React.FC<MapPageProps> = ({ course, currentUser }) => {
  const graphRef = React.useRef<KnowledgeGraphHandle>(null);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKp, setSelectedKp] = useState<KnowledgePoint | null>(null);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [pathEnabled, setPathEnabled] = useState(false);
  const [pathIndex, setPathIndex] = useState(0);
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [formKp, setFormKp] = useState({
    title: '',
    description: '',
    difficulty: '中级' as '初级' | '中级' | '高级',
    tags: '',
  });
  const [toast, setToast] = useState<string | null>(null);

  const userId = currentUser?.id || SAMPLE_USER_ID;
  const isTeacher = currentUser?.role === 'teacher';
  const mode = isTeacher ? 'edit' : 'view';

  const courseId = course?.id || 'course-1';

  const path = useRecommendPath({
    knowledgePoints,
    relations,
    scores,
    reviewedIds,
    maxNodes: 5,
  });

  useEffect(() => {
    loadData();
  }, [courseId, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpsRes, relsRes, userRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/knowledge-points`).then((r) => r.json()),
        fetch(`/api/courses/${courseId}/relations`).then((r) => r.json()),
        fetch(`/api/users/${userId}`).then((r) => r.json()),
      ]);
      setKnowledgePoints(kpsRes || []);
      setRelations(relsRes || []);
      const allT: string[] = [];
      (kpsRes || []).forEach((kp: KnowledgePoint) => {
        kp.tags.forEach((t) => {
          if (!allT.includes(t)) allT.push(t);
        });
      });
      setAllTags(allT);
      const userAssess = (userRes?.assessments && userRes.assessments[courseId]) || {};
      setScores(userAssess);
      setReviewedIds((userRes?.reviewedNodes && userRes.reviewedNodes[courseId]) || []);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleNodeMove = async (id: string, x: number, y: number) => {
    try {
      await fetch(`/api/knowledge-points/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      });
      setKnowledgePoints((prev) =>
        prev.map((k) => (k.id === id ? { ...k, x, y } : k))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRelation = async (sourceId: string, targetId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}/relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId }),
      });
      if (res.status === 409) {
        showToast('关系已存在');
        return;
      }
      const newRel = await res.json();
      setRelations((prev) => [...prev, newRel]);
      showToast('关系创建成功');
    } catch (err) {
      console.error(err);
      showToast('创建关系失败');
    }
  };

  const handleUpdateRelationCurvature = async (relId: string, curvature: number) => {
    try {
      await fetch(`/api/relations/${relId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curvature }),
      });
      setRelations((prev) =>
        prev.map((r) => (r.id === relId ? { ...r, curvature } : r))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddKp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKp.title || !formKp.description) {
      showToast('请填写标题和详情');
      return;
    }
    const tagArr = formKp.tags.split(/[,，\s]+/).filter(Boolean).slice(0, 5);
    try {
      const x = 100 + Math.random() * 400;
      const y = 100 + Math.random() * 400;
      const res = await fetch(`/api/courses/${courseId}/knowledge-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formKp.title,
          description: formKp.description,
          difficulty: formKp.difficulty,
          tags: tagArr,
          x,
          y,
        }),
      });
      const newKp = await res.json();
      setKnowledgePoints((prev) => [...prev, newKp]);
      setFormKp({ title: '', description: '', difficulty: '中级', tags: '' });
      setShowTeacherForm(false);
      showToast('知识点添加成功');
    } catch (err) {
      console.error(err);
      showToast('添加失败');
    }
  };

  const handleMarkReviewed = async () => {
    if (!selectedKp) return;
    try {
      await fetch(`/api/users/${userId}/reviewed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, kpId: selectedKp.id }),
      });
      const next = [...reviewedIds, selectedKp.id];
      setReviewedIds(next);
      showToast('已完成复习');
      if (pathEnabled && path[pathIndex] === selectedKp.id) {
        if (pathIndex < path.length - 1) {
          setPathIndex((i) => i + 1);
        } else {
          showToast('复习路径已全部完成！');
        }
      }
      setSelectedKp(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGeneratePath = async () => {
    try {
      const res = await fetch('/api/recommend-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, courseId }),
      });
      const data = await res.json();
      if (data.path && data.path.length > 0) {
        setPathEnabled(true);
        setPathIndex(0);
        showToast('复习路径已生成');
      } else {
        showToast('暂无薄弱点，继续保持！');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleJumpToNext = () => {
    if (pathEnabled && pathIndex < path.length) {
      const nextKp = knowledgePoints.find((k) => k.id === path[pathIndex]);
      if (nextKp) setSelectedKp(nextKp);
    }
  };

  const filterTagsArr = filterTag === 'all' ? [] : [filterTag];
  const activeNodeId = pathEnabled && path.length > pathIndex ? path[pathIndex] : selectedKp?.id;

  const scoreColorClass = (s?: number) => {
    if (s === undefined) return 'score-mid';
    if (s < 60) return 'score-low';
    if (s < 80) return 'score-mid';
    return 'score-high';
  };

  return (
    <div className="page-container">
      <div className="graph-area">
        {loading ? (
          <div className="empty-tip">加载中...</div>
        ) : (
          <KnowledgeGraph
            ref={graphRef}
            knowledgePoints={knowledgePoints}
            relations={relations}
            mode={mode}
            filterTags={filterTagsArr}
            highlightPath={pathEnabled ? path : []}
            activeNodeId={activeNodeId}
            onNodeClick={setSelectedKp}
            onNodeMove={handleNodeMove}
            onCreateRelation={handleCreateRelation}
            onUpdateRelationCurvature={handleUpdateRelationCurvature}
          />
        )}
        {pathEnabled && path.length > 0 && pathIndex < path.length && (
          <div className="next-nav">
            <span className="next-nav-text">
              复习进度：{pathIndex + 1} / {path.length} ·
              当前：{knowledgePoints.find((k) => k.id === path[pathIndex])?.title || ''}
            </span>
            <button className="next-nav-btn" onClick={handleJumpToNext}>
              {reviewedIds.includes(path[pathIndex]) ? '查看下一个' : '开始复习'}
            </button>
          </div>
        )}
        {toast && (
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(26,35,126,0.92)',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: 20,
              fontSize: 13,
              zIndex: 200,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            {toast}
          </div>
        )}
      </div>

      <div className="info-panel">
        <div>
          <div className="panel-title">
            {isTeacher ? '教师控制台' : '学习中心'}
          </div>
          <div className="panel-section">
            <h4>{course?.title || 'JavaScript 前端开发基础'}</h4>
            <p style={{ fontSize: 12, color: '#757575', marginTop: 6, lineHeight: 1.5 }}>
              {course?.description || '从零开始学习 JavaScript 语言核心概念和前端开发基础技能'}
            </p>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="tag">共 {knowledgePoints.length} 个知识点</span>
              <span className="tag">{relations.length} 条关联</span>
            </div>
          </div>
        </div>

        {isTeacher && (
          <div className="panel-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ marginBottom: 0 }}>添加知识点</h4>
              <button
                className="btn-outline"
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => setShowTeacherForm(!showTeacherForm)}
              >
                {showTeacherForm ? '收起' : '+ 新建'}
              </button>
            </div>
            {showTeacherForm && (
              <form onSubmit={handleAddKp}>
                <div className="form-field">
                  <label>标题</label>
                  <input
                    type="text"
                    value={formKp.title}
                    onChange={(e) => setFormKp({ ...formKp, title: e.target.value })}
                    placeholder="知识点标题"
                  />
                </div>
                <div className="form-field">
                  <label>难度</label>
                  <select
                    value={formKp.difficulty}
                    onChange={(e) => setFormKp({ ...formKp, difficulty: e.target.value as any })}
                  >
                    <option value="初级">初级</option>
                    <option value="中级">中级</option>
                    <option value="高级">高级</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>详情描述</label>
                  <textarea
                    value={formKp.description}
                    onChange={(e) => setFormKp({ ...formKp, description: e.target.value })}
                    placeholder="详细内容..."
                  />
                </div>
                <div className="form-field">
                  <label>标签（逗号分隔，最多5个）</label>
                  <input
                    type="text"
                    value={formKp.tags}
                    onChange={(e) => setFormKp({ ...formKp, tags: e.target.value })}
                    placeholder="例如: 基础, 核心"
                  />
                </div>
                <div className="btn-group">
                  <button type="submit" className="btn">
                    添加
                  </button>
                  <p style={{ fontSize: 11, color: '#9e9e9e', alignSelf: 'center' }}>
                    提示：按住 Shift 拖拽节点可创建关系连线
                  </p>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="panel-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ marginBottom: 0 }}>复习路径</h4>
            <div className="btn-group">
              {pathEnabled && (
                <button
                  className="btn-outline"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => {
                    setPathEnabled(false);
                    setPathIndex(0);
                  }}
                >
                  清除
                </button>
              )}
              <button
                className="btn-secondary"
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={handleGeneratePath}
              >
                生成复习路径
              </button>
            </div>
          </div>
          {!pathEnabled || path.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9e9e9e', padding: '10px 0' }}>
              点击"生成复习路径"按钮，基于你的测评成绩和知识图谱的依赖关系，为你推荐最优复习顺序。
            </div>
          ) : (
            <ul className="path-list">
              {path.map((id, idx) => {
                const kp = knowledgePoints.find((k) => k.id === id);
                const isActive = idx === pathIndex;
                const isRev = reviewedIds.includes(id);
                return (
                  <li
                    key={id}
                    className={`path-item ${isActive ? 'active' : ''} ${isRev ? 'reviewed' : ''}`}
                    onClick={() => kp && setSelectedKp(kp)}
                  >
                    <div className="path-item-order">{idx + 1}</div>
                    <div className="path-item-info">
                      <div className="path-item-title">{kp?.title || id}</div>
                      <div className="path-item-sub">
                        <span className={`tag difficulty-${kp?.difficulty}`}>{kp?.difficulty}</span>
                        {scores[id] !== undefined && (
                          <span style={{ marginLeft: 6, fontSize: 11 }}>
                            得分: <strong style={{ color: scores[id] < 60 ? '#d32f2f' : '#388e3c' }}>{scores[id]}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                    {isRev && <span style={{ fontSize: 11, color: '#81c784' }}>✓</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!isTeacher && (
          <div className="panel-section">
            <h4>测评成绩概览</h4>
            <div className="kp-list">
              {knowledgePoints.map((kp) => {
                const s = scores[kp.id];
                return (
                  <div
                    key={kp.id}
                    className="kp-list-item"
                    onClick={() => setSelectedKp(kp)}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{kp.title}</div>
                      <div className="score-bar" style={{ width: 100 }}>
                        <div
                          className={`score-bar-fill ${scoreColorClass(s)}`}
                          style={{ width: `${s !== undefined ? s : 0}%` }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: s !== undefined && s < 60 ? '#d32f2f' : '#616161', fontWeight: 600 }}>
                      {s !== undefined ? `${s}分` : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedKp && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedKp(null)}>
          <div className="kp-modal">
            <button className="kp-modal-close" onClick={() => setSelectedKp(null)}>
              ×
            </button>
            <h2 className="kp-modal-title">{selectedKp.title}</h2>
            <div className="kp-modal-difficulty">
              <span className={`tag difficulty-${selectedKp.difficulty}`}>
                {selectedKp.difficulty}
              </span>
              {scores[selectedKp.id] !== undefined && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    color:
                      scores[selectedKp.id] < 60
                        ? '#d32f2f'
                        : scores[selectedKp.id] < 80
                        ? '#f57c00'
                        : '#388e3c',
                    fontWeight: 600,
                  }}
                >
                  测评得分：{scores[selectedKp.id]}分
                  {scores[selectedKp.id] < 60 && ' (薄弱点)'}
                </span>
              )}
            </div>
            <p className="kp-modal-desc">{selectedKp.description}</p>
            <div className="kp-modal-tags">
              <span style={{ fontSize: 12, color: '#757575', marginRight: 6 }}>标签：</span>
              {selectedKp.tags.length > 0 ? (
                selectedKp.tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: 12, color: '#bdbdbd' }}>无</span>
              )}
            </div>
            <div className="kp-modal-footer">
              {!isTeacher && (
                <button
                  className="btn"
                  style={{ background: reviewedIds.includes(selectedKp.id) ? '#81c784' : undefined }}
                  onClick={handleMarkReviewed}
                  disabled={reviewedIds.includes(selectedKp.id)}
                >
                  {reviewedIds.includes(selectedKp.id) ? '已完成复习' : '完成复习'}
                </button>
              )}
              <button className="btn-outline" onClick={() => setSelectedKp(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
