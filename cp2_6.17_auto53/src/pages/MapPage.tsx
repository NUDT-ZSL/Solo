import { useState, useEffect, useRef, useCallback } from 'react';
import { KnowledgePoint, Relationship, Score } from '../types';
import { useRecommendPath } from '../hooks/useRecommendPath';

interface Props {
  courseId: string;
  userRole: 'teacher' | 'student';
  userId: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#4caf50',
  intermediate: '#ff9800',
  advanced: '#f44336'
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级'
};

export default function MapPage({ courseId, userRole, userId }: Props) {
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedKp, setSelectedKp] = useState<KnowledgePoint | null>(null);
  const [editingKp, setEditingKp] = useState<KnowledgePoint | null>(null);
  const [editForm, setEditForm] = useState({ title: '', detail: '', difficulty: 'beginner' as KnowledgePoint['difficulty'], tags: '', x: 0, y: 0 });
  const [addingRel, setAddingRel] = useState(false);
  const [relSource, setRelSource] = useState<string | null>(null);
  const [addKpMode, setAddKpMode] = useState(false);
  const [newKpForm, setNewKpForm] = useState({ title: '', detail: '', difficulty: 'beginner' as KnowledgePoint['difficulty'], tags: '', x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const { reviewPath, loading, generatePath, clearPath } = useRecommendPath();

  const loadData = useCallback(() => {
    if (!courseId) return;
    Promise.all([
      fetch(`/api/courses/${courseId}/knowledge-points`).then(res => res.json()),
      fetch(`/api/courses/${courseId}/relationships`).then(res => res.json()),
      fetch(`/api/users/${userId}/scores`).then(res => res.json())
    ]).then(([kps, rels, scs]) => {
      setKnowledgePoints(kps);
      setRelationships(rels);
      setScores(scs);
    }).catch(console.error);
  }, [courseId, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getScore = (kpId: string) => {
    const s = scores.find(sc => sc.knowledgePointId === kpId);
    return s ? s.score : null;
  };

  const getScoreColor = (kpId: string) => {
    const s = getScore(kpId);
    if (s === null) return '#9e9e9e';
    if (s >= 80) return '#4caf50';
    if (s >= 60) return '#ff9800';
    return '#f44336';
  };

  const isInReviewPath = (kpId: string) => reviewPath.includes(kpId);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !courseId) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    if (addKpMode) {
      setNewKpForm(prev => ({ ...prev, x, y }));
      return;
    }
    if (addingRel) return;
    setSelectedKp(null);
    setEditingKp(null);
  };

  const handleNodeClick = (e: React.MouseEvent, kp: KnowledgePoint) => {
    e.stopPropagation();
    if (addingRel) {
      if (!relSource) {
        setRelSource(kp.id);
      } else if (relSource !== kp.id) {
        fetch(`/api/courses/${courseId}/relationships`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: relSource, targetId: kp.id })
        }).then(() => {
          setAddingRel(false);
          setRelSource(null);
          loadData();
        }).catch(console.error);
      }
      return;
    }
    setSelectedKp(kp);
  };

  const handleDoubleClick = (e: React.MouseEvent, kp: KnowledgePoint) => {
    e.stopPropagation();
    if (userRole !== 'teacher') return;
    setEditingKp(kp);
    setEditForm({
      title: kp.title,
      detail: kp.detail,
      difficulty: kp.difficulty,
      tags: kp.tags.join(', '),
      x: kp.x,
      y: kp.y
    });
  };

  const handleEditSave = async () => {
    if (!editingKp) return;
    await fetch(`/api/knowledge-points/${editingKp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editForm.title,
        detail: editForm.detail,
        difficulty: editForm.difficulty,
        tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      })
    });
    setEditingKp(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/knowledge-points/${id}`, { method: 'DELETE' });
    setSelectedKp(null);
    loadData();
  };

  const handleScoreSubmit = async (kpId: string, score: number) => {
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, knowledgePointId: kpId, score })
    });
    loadData();
  };

  const handleAddKp = async () => {
    if (!newKpForm.title || !newKpForm.detail || !courseId) return;
    await fetch(`/api/courses/${courseId}/knowledge-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newKpForm.title,
        detail: newKpForm.detail,
        difficulty: newKpForm.difficulty,
        tags: newKpForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        x: newKpForm.x,
        y: newKpForm.y
      })
    });
    setAddKpMode(false);
    setNewKpForm({ title: '', detail: '', difficulty: 'beginner', tags: '', x: 0, y: 0 });
    loadData();
  };

  const handleDeleteRel = async (id: string) => {
    await fetch(`/api/relationships/${id}`, { method: 'DELETE' });
    loadData();
  };

  if (!courseId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 56px)', color: '#9e9e9e', fontSize: 16 }}>
        请先选择课程
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ background: '#fff' }}
          onClick={handleSvgClick}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#757575" />
            </marker>
            {reviewPath.length > 1 && (
              <marker id="arrowhead-path" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#1a237e" />
              </marker>
            )}
          </defs>
          {relationships.map(rel => {
            const source = knowledgePoints.find(k => k.id === rel.sourceId);
            const target = knowledgePoints.find(k => k.id === rel.targetId);
            if (!source || !target) return null;
            const isInPath = isInReviewPath(rel.sourceId) && isInReviewPath(rel.targetId);
            const pathIdx = isInPath ? reviewPath.indexOf(rel.sourceId) : -1;
            const isSequential = isInPath && pathIdx >= 0 && pathIdx + 1 < reviewPath.length && reviewPath[pathIdx + 1] === rel.targetId;
            const midX = rel.anchorX || (source.x + target.x) / 2;
            const midY = rel.anchorY || (source.y + target.y) / 2;
            return (
              <g key={rel.id}>
                <path
                  d={`M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
                  fill="none"
                  stroke={isSequential ? '#1a237e' : '#bdbdbd'}
                  strokeWidth={isSequential ? 2.5 : 1.5}
                  markerEnd={isSequential ? 'url(#arrowhead-path)' : 'url(#arrowhead)'}
                  style={{ cursor: userRole === 'teacher' ? 'pointer' : 'default' }}
                  onClick={e => {
                    e.stopPropagation();
                    if (userRole === 'teacher') handleDeleteRel(rel.id);
                  }}
                />
              </g>
            );
          })}
          {knowledgePoints.map(kp => {
            const isSelected = selectedKp?.id === kp.id;
            const inPath = isInReviewPath(kp.id);
            const pathIndex = inPath ? reviewPath.indexOf(kp.id) + 1 : null;
            return (
              <g key={kp.id} style={{ cursor: 'pointer' }} onClick={e => handleNodeClick(e, kp)} onDoubleClick={e => handleDoubleClick(e, kp)}>
                {inPath && (
                  <circle cx={kp.x} cy={kp.y} r={32} fill="none" stroke="#1a237e" strokeWidth={2} strokeDasharray="4 2" />
                )}
                <circle
                  cx={kp.x}
                  cy={kp.y}
                  r={24}
                  fill={isSelected ? '#e8eaf6' : '#fff'}
                  stroke={inPath ? '#1a237e' : DIFFICULTY_COLORS[kp.difficulty]}
                  strokeWidth={isSelected ? 3 : 2}
                />
                {pathIndex !== null && (
                  <text x={kp.x + 28} y={kp.y - 20} fill="#1a237e" fontSize={12} fontWeight={600}>{pathIndex}</text>
                )}
                <text x={kp.x} y={kp.y + 5} textAnchor="middle" fontSize={12} fontWeight={500} fill="#212121">
                  {kp.title.length > 4 ? kp.title.slice(0, 4) + '..' : kp.title}
                </text>
                <text x={kp.x} y={kp.y + 42} textAnchor="middle" fontSize={11} fill={getScoreColor(kp.id)}>
                  {getScore(kp.id) !== null ? `${getScore(kp.id)}分` : '未评分'}
                </text>
              </g>
            );
          })}
          {addKpMode && newKpForm.x > 0 && (
            <circle cx={newKpForm.x} cy={newKpForm.y} r={24} fill="#e3f2fd" stroke="#1a237e" strokeWidth={2} strokeDasharray="4 2" />
          )}
          {addingRel && relSource && (
            <circle
              cx={knowledgePoints.find(k => k.id === relSource)!.x}
              cy={knowledgePoints.find(k => k.id === relSource)!.y}
              r={30}
              fill="none"
              stroke="#ff9800"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          )}
        </svg>
        <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {userRole === 'teacher' && (
            <>
              <button
                onClick={() => { setAddKpMode(!addKpMode); setAddingRel(false); }}
                style={{
                  background: addKpMode ? '#1a237e' : '#fff',
                  color: addKpMode ? '#fff' : '#1a237e',
                  border: '1px solid #1a237e',
                  borderRadius: 4,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                {addKpMode ? '取消添加' : '添加节点'}
              </button>
              <button
                onClick={() => { setAddingRel(!addingRel); setAddKpMode(false); setRelSource(null); }}
                style={{
                  background: addingRel ? '#1a237e' : '#fff',
                  color: addingRel ? '#fff' : '#1a237e',
                  border: '1px solid #1a237e',
                  borderRadius: 4,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                {addingRel ? '取消连线' : '添加连线'}
              </button>
            </>
          )}
          <button
            onClick={() => generatePath(userId, courseId)}
            disabled={loading}
            style={{
              background: '#1a237e',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '6px 16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '生成中...' : '推荐复习路径'}
          </button>
          {reviewPath.length > 0 && (
            <button
              onClick={clearPath}
              style={{
                background: '#fff',
                color: '#f44336',
                border: '1px solid #f44336',
                borderRadius: 4,
                padding: '6px 16px',
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              清除路径
            </button>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 16, background: '#fff', padding: '8px 16px', borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: DIFFICULTY_COLORS.beginner, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#616161' }}>初级</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: DIFFICULTY_COLORS.intermediate, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#616161' }}>中级</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: DIFFICULTY_COLORS.advanced, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#616161' }}>高级</span>
          </div>
        </div>
      </div>
      <div style={{ width: 320, borderLeft: '1px solid #e0e0e0', background: '#fff', overflowY: 'auto', padding: 20 }}>
        {addKpMode && (
          <div style={{ marginBottom: 20, padding: 16, background: '#e3f2fd', borderRadius: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a237e', marginBottom: 12 }}>新建知识点</h3>
            <p style={{ fontSize: 13, color: '#616161', marginBottom: 12 }}>在画布上点击选择位置</p>
            <input
              placeholder="标题"
              value={newKpForm.title}
              onChange={e => setNewKpForm(prev => ({ ...prev, title: e.target.value }))}
              style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 4, padding: '6px 10px', fontSize: 13, marginBottom: 8 }}
            />
            <textarea
              placeholder="详细说明"
              value={newKpForm.detail}
              onChange={e => setNewKpForm(prev => ({ ...prev, detail: e.target.value }))}
              style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 4, padding: '6px 10px', fontSize: 13, marginBottom: 8, minHeight: 60, resize: 'vertical' }}
            />
            <select
              value={newKpForm.difficulty}
              onChange={e => setNewKpForm(prev => ({ ...prev, difficulty: e.target.value as KnowledgePoint['difficulty'] }))}
              style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 4, padding: '6px 10px', fontSize: 13, marginBottom: 8 }}
            >
              <option value="beginner">初级</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
            </select>
            <input
              placeholder="标签(逗号分隔)"
              value={newKpForm.tags}
              onChange={e => setNewKpForm(prev => ({ ...prev, tags: e.target.value }))}
              style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 4, padding: '6px 10px', fontSize: 13, marginBottom: 12 }}
            />
            <button
              onClick={handleAddKp}
              disabled={!newKpForm.title || !newKpForm.detail || newKpForm.x === 0}
              style={{
                width: '100%',
                background: newKpForm.title && newKpForm.detail && newKpForm.x > 0 ? '#1a237e' : '#bdbdbd',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '8px 0',
                cursor: newKpForm.title && newKpForm.detail && newKpForm.x > 0 ? 'pointer' : 'not-allowed',
                fontSize: 13
              }}
            >
              创建
            </button>
          </div>
        )}
        {editingKp && (
          <div style={{ marginBottom: 20, padding: 16, background: '#fff3e0', borderRadius: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a237e', marginBottom: 12 }}>编辑知识点</h3>
            <input
              value={editForm.title}
              onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 4, padding: '6px 10px', fontSize: 13, marginBottom: 8 }}
            />
            <textarea
              value={editForm.detail}
              onChange={e => setEditForm(prev => ({ ...prev, detail: e.target.value }))}
              style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 4, padding: '6px 10px', fontSize: 13, marginBottom: 8, minHeight: 60, resize: 'vertical' }}
            />
            <select
              value={editForm.difficulty}
              onChange={e => setEditForm(prev => ({ ...prev, difficulty: e.target.value as KnowledgePoint['difficulty'] }))}
              style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 4, padding: '6px 10px', fontSize: 13, marginBottom: 8 }}
            >
              <option value="beginner">初级</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
            </select>
            <input
              value={editForm.tags}
              onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="标签(逗号分隔)"
              style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 4, padding: '6px 10px', fontSize: 13, marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleEditSave}
                style={{ flex: 1, background: '#1a237e', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 0', cursor: 'pointer', fontSize: 13 }}
              >
                保存
              </button>
              <button
                onClick={() => setEditingKp(null)}
                style={{ flex: 1, background: '#fff', color: '#757575', border: '1px solid #e0e0e0', borderRadius: 4, padding: '8px 0', cursor: 'pointer', fontSize: 13 }}
              >
                取消
              </button>
            </div>
          </div>
        )}
        {selectedKp && !editingKp && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a237e', marginBottom: 12 }}>{selectedKp.title}</h3>
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 500,
                  background: `${DIFFICULTY_COLORS[selectedKp.difficulty]}20`,
                  color: DIFFICULTY_COLORS[selectedKp.difficulty]
                }}
              >
                {DIFFICULTY_LABELS[selectedKp.difficulty]}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#424242', lineHeight: 1.6, marginBottom: 16 }}>{selectedKp.detail}</p>
            {selectedKp.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {selectedKp.tags.map(tag => (
                  <span key={tag} style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#616161' }}>{tag}</span>
                ))}
              </div>
            )}
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
              <div style={{ fontSize: 13, color: '#757575', marginBottom: 4 }}>当前成绩</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: getScoreColor(selectedKp.id) }}>
                {getScore(selectedKp.id) !== null ? `${getScore(selectedKp.id)}分` : '未评分'}
              </div>
            </div>
            {userRole === 'student' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#757575', marginBottom: 6 }}>更新成绩</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={getScore(selectedKp.id) ?? ''}
                    id={`score-input-${selectedKp.id}`}
                    style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: 4, padding: '6px 10px', fontSize: 13 }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`score-input-${selectedKp.id}`) as HTMLInputElement;
                      const val = parseInt(input.value, 10);
                      if (!isNaN(val) && val >= 0 && val <= 100) {
                        handleScoreSubmit(selectedKp.id, val);
                      }
                    }}
                    style={{ background: '#1a237e', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                  >
                    提交
                  </button>
                </div>
              </div>
            )}
            {isInReviewPath(selectedKp.id) && (
              <div style={{ marginBottom: 16, padding: 10, background: '#e8eaf6', borderRadius: 6, fontSize: 13, color: '#1a237e' }}>
                复习路径第 {reviewPath.indexOf(selectedKp.id) + 1} 步
              </div>
            )}
            {userRole === 'teacher' && (
              <button
                onClick={() => handleDelete(selectedKp.id)}
                style={{ width: '100%', background: '#fff', color: '#f44336', border: '1px solid #f44336', borderRadius: 4, padding: '8px 0', cursor: 'pointer', fontSize: 13 }}
              >
                删除节点
              </button>
            )}
          </div>
        )}
        {!selectedKp && !editingKp && !addKpMode && (
          <div style={{ color: '#9e9e9e', textAlign: 'center', paddingTop: 40, fontSize: 14 }}>
            <p>点击节点查看详情</p>
            <p style={{ marginTop: 8, fontSize: 13 }}>
              {userRole === 'teacher' ? '双击节点可编辑，点击连线可删除' : '可提交成绩和生成复习路径'}
            </p>
          </div>
        )}
        {reviewPath.length > 0 && (
          <div style={{ marginTop: 20, padding: 12, background: '#e8eaf6', borderRadius: 8 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1a237e', marginBottom: 8 }}>推荐复习路径</h4>
            {reviewPath.map((kpId, idx) => {
              const kp = knowledgePoints.find(k => k.id === kpId);
              return kp ? (
                <div key={kpId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#1a237e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    {idx + 1}
                  </span>
                  <span style={{ color: '#212121' }}>{kp.title}</span>
                  {getScore(kp.id) !== null && (
                    <span style={{ marginLeft: 'auto', color: getScoreColor(kp.id), fontSize: 12 }}>{getScore(kp.id)}分</span>
                  )}
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
