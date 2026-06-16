import React, { useState, useMemo } from 'react';
import type { Paper, Reviewer, ReviewScore, ConflictFlag } from './business/ReviewMatch';
import { computeSimilarity, getDimensionLabel } from './business/ReviewMatch';

interface Props {
  papers: Paper[];
  reviewers: Reviewer[];
  scores: ReviewScore[];
  conflicts: ConflictFlag[];
  onAssign: (paperId: string, reviewerIds: string[]) => void;
  onAutoAssign: () => void;
  subView: string;
  onSubViewChange: (view: string) => void;
}

export default function SubmissionList({
  papers,
  reviewers,
  scores,
  conflicts,
  onAssign,
  onAutoAssign,
  subView,
  onSubViewChange,
}: Props) {
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'reviewers' | 'scores'>('title');
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  const [assigningPaper, setAssigningPaper] = useState<string | null>(null);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);

  const filteredPapers = useMemo(() => {
    let result = [...papers];
    if (filterKeyword.trim()) {
      const kw = filterKeyword.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(kw) ||
          p.keywords.some((k) => k.toLowerCase().includes(kw)) ||
          p.authors.some((a) => a.toLowerCase().includes(kw))
      );
    }
    result.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'reviewers') return a.reviewerIds.length - b.reviewerIds.length;
      const sa = scores.filter((s) => s.paperId === a.id && s.submitted).length;
      const sb = scores.filter((s) => s.paperId === b.id && s.submitted).length;
      return sb - sa;
    });
    return result;
  }, [papers, filterKeyword, sortBy, scores]);

  const startAssign = (paper: Paper) => {
    setAssigningPaper(paper.id);
    setSelectedReviewers(paper.reviewerIds);
  };

  const confirmAssign = () => {
    if (assigningPaper) {
      onAssign(assigningPaper, selectedReviewers);
      setAssigningPaper(null);
      setSelectedReviewers([]);
    }
  };

  const toggleReviewer = (rid: string) => {
    setSelectedReviewers((prev) =>
      prev.includes(rid) ? prev.filter((id) => id !== rid) : [...prev, rid]
    );
  };

  if (subView === 'reviewers') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20 }}>审稿人管理</h2>
          <button
            onClick={() => onSubViewChange('create-reviewer')}
            style={{ padding: '8px 16px', background: '#27AE60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            + 新建审稿人
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {reviewers.map((r) => {
            const assignedPapers = papers.filter((p) => p.reviewerIds.includes(r.id));
            const completedScores = scores.filter((s) => s.reviewerId === r.id && s.submitted).length;
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{r.name}</div>
                <div style={{ fontSize: 13, color: '#7F8C8D', marginBottom: 8 }}>{r.email}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {r.expertise.map((e) => (
                    <span key={e} style={{ background: '#EBF5FB', color: '#2980B9', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                      {e}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#95A5A6' }}>
                  分配论文: {assignedPapers.length} | 已完成评分: {completedScores}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 20 }}>论文列表</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onAutoAssign}
            style={{ padding: '8px 16px', background: '#8E44AD', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            🤖 自动分配审稿人
          </button>
          <button
            onClick={() => onSubViewChange('create-paper')}
            style={{ padding: '8px 16px', background: '#27AE60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            + 新建论文
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ padding: '8px 12px', border: '1px solid #BDC3C7', borderRadius: 6, fontSize: 13, minWidth: 200 }}
          placeholder="搜索关键词/标题/作者..."
          value={filterKeyword}
          onChange={(e) => setFilterKeyword(e.target.value)}
        />
        <select
          style={{ padding: '8px 12px', border: '1px solid #BDC3C7', borderRadius: 6, fontSize: 13 }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'title' | 'reviewers' | 'scores')}
        >
          <option value="title">按标题排序</option>
          <option value="reviewers">按审稿人数排序</option>
          <option value="scores">按评分数排序</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredPapers.map((paper) => {
              const paperScores = scores.filter((s) => s.paperId === paper.id && s.submitted);
              const paperConflicts = conflicts.filter((c) => c.paperId === paper.id && !c.resolved);
              const isExpanded = expandedPaper === paper.id;
              const isAssigning = assigningPaper === paper.id;

              return (
                <div
                  key={paper.id}
                  className="paper-card"
                  style={{
                    background: '#fff',
                    borderRadius: 8,
                    padding: 20,
                    boxShadow: '2px 2px 2px #E0E0E0',
                    cursor: 'pointer',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    border: selectedPaper?.id === paper.id ? '2px solid #2980B9' : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '2px 6px 6px #B0B0B0';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '2px 2px 2px #E0E0E0';
                  }}
                  onClick={() => setSelectedPaper(paper)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}
                        onClick={(e) => { e.stopPropagation(); setExpandedPaper(isExpanded ? null : paper.id); }}
                      >
                        <span style={{ fontSize: 12, color: '#95A5A6' }}>{isExpanded ? '▼' : '▶'}</span>
                        {paper.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#7F8C8D', marginBottom: 8 }}>
                        作者: {paper.authors.join(', ')}
                      </div>
                      {isExpanded && (
                        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 8 }}>
                          <strong>摘要:</strong> {paper.abstract}
                          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {paper.keywords.map((kw) => (
                              <span key={kw} style={{ background: '#FEF9E7', color: '#F39C12', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: '#7F8C8D' }}>
                        审稿人: {paper.reviewerIds.length}
                      </span>
                      <span style={{ fontSize: 12, color: paperScores.length > 0 ? '#27AE60' : '#95A5A6' }}>
                        评分: {paperScores.length}
                      </span>
                      {paperConflicts.length > 0 && (
                        <span style={{ fontSize: 11, color: '#E74C3C', fontWeight: 600 }}>
                          ⚠ 冲突 {paperConflicts.length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => startAssign(paper)}
                      style={{
                        padding: '6px 12px',
                        background: '#2980B9',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      分配审稿人
                    </button>
                    {paper.reviewerIds.length > 0 && (
                      <div style={{ fontSize: 11, color: '#7F8C8D', display: 'flex', alignItems: 'center', gap: 4 }}>
                        已分配: {paper.reviewerIds.map((rid) => reviewers.find((r) => r.id === rid)?.name || rid).join(', ')}
                      </div>
                    )}
                  </div>

                  {isAssigning && (
                    <div
                      style={{ marginTop: 16, padding: 16, background: '#F8F9FA', borderRadius: 6, border: '1px solid #E0E0E0' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>选择审稿人（至少2人）</div>
                      {reviewers.map((r) => {
                        const sim = computeSimilarity(paper.keywords, r.expertise);
                        const isSelected = selectedReviewers.includes(r.id);
                        return (
                          <label
                            key={r.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 8px',
                              marginBottom: 4,
                              background: isSelected ? '#EBF5FB' : '#fff',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleReviewer(r.id)}
                            />
                            <span>{r.name}</span>
                            <span style={{ fontSize: 11, color: '#95A5A6' }}>({r.expertise.join(', ')})</span>
                            <span style={{ fontSize: 11, color: sim > 0.5 ? '#27AE60' : '#E74C3C', marginLeft: 'auto' }}>
                              匹配度: {(sim * 100).toFixed(0)}%
                            </span>
                          </label>
                        );
                      })}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          onClick={confirmAssign}
                          disabled={selectedReviewers.length < 2}
                          style={{
                            padding: '8px 16px',
                            background: selectedReviewers.length >= 2 ? '#27AE60' : '#BDC3C7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: selectedReviewers.length >= 2 ? 'pointer' : 'not-allowed',
                            fontSize: 13,
                          }}
                        >
                          确认分配
                        </button>
                        <button
                          onClick={() => { setAssigningPaper(null); setSelectedReviewers([]); }}
                          style={{ padding: '8px 16px', background: '#ECF0F1', color: '#2C3E50', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selectedPaper && (
          <div style={{ width: 360, flexShrink: 0 }}>
            <PaperDetail
              paper={selectedPaper}
              reviewers={reviewers}
              scores={scores}
              conflicts={conflicts}
              onAssign={onAssign}
              onClose={() => setSelectedPaper(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PaperDetail({
  paper,
  reviewers,
  scores,
  conflicts,
  onAssign,
  onClose,
}: {
  paper: Paper;
  reviewers: Reviewer[];
  scores: ReviewScore[];
  conflicts: ConflictFlag[];
  onAssign: (paperId: string, reviewerIds: string[]) => void;
  onClose: () => void;
}) {
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>(paper.reviewerIds);
  const paperScores = scores.filter((s) => s.paperId === paper.id && s.submitted);
  const paperConflicts = conflicts.filter((c) => c.paperId === paper.id && !c.resolved);

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', position: 'sticky', top: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16 }}>论文详情</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#95A5A6' }}>✕</button>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{paper.title}</div>
      <div style={{ fontSize: 12, color: '#7F8C8D', marginBottom: 8 }}>作者: {paper.authors.join(', ')}</div>
      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>{paper.abstract}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
        {paper.keywords.map((kw) => (
          <span key={kw} style={{ background: '#FEF9E7', color: '#F39C12', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
            {kw}
          </span>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #ECF0F1', paddingTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>分配审稿人</div>
        {reviewers.map((r) => {
          const sim = computeSimilarity(paper.keywords, r.expertise);
          const isSelected = selectedReviewers.includes(r.id);
          return (
            <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', marginBottom: 2, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={isSelected} onChange={() => setSelectedReviewers((prev) => prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id])} />
              <span>{r.name}</span>
              <span style={{ marginLeft: 'auto', color: sim > 0.5 ? '#27AE60' : '#95A5A6', fontSize: 11 }}>{(sim * 100).toFixed(0)}%</span>
            </label>
          );
        })}
        <button
          onClick={() => onAssign(paper.id, selectedReviewers)}
          disabled={selectedReviewers.length < 2}
          style={{
            width: '100%',
            padding: '8px',
            marginTop: 8,
            background: selectedReviewers.length >= 2 ? '#27AE60' : '#BDC3C7',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: selectedReviewers.length >= 2 ? 'pointer' : 'not-allowed',
            fontSize: 13,
          }}
        >
          确认分配（至少2人）
        </button>
      </div>

      {paperScores.length > 0 && (
        <div style={{ borderTop: '1px solid #ECF0F1', paddingTop: 12, marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>已提交评分</div>
          {paperScores.map((ps) => {
            const reviewer = reviewers.find((r) => r.id === ps.reviewerId);
            return (
              <div key={ps.id} style={{ padding: '6px 0', fontSize: 12, borderBottom: '1px solid #F0F0F0' }}>
                <div style={{ fontWeight: 600 }}>{reviewer?.name}</div>
                <div style={{ color: '#7F8C8D', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                  <span>创新性: {ps.scores.innovation}</span>
                  <span>技术: {ps.scores.technicalDepth}</span>
                  <span>实验: {ps.scores.experimentalCompleteness}</span>
                  <span>写作: {ps.scores.writingQuality}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {paperConflicts.length > 0 && (
        <div style={{ borderTop: '1px solid #ECF0F1', paddingTop: 12, marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#E74C3C', marginBottom: 8 }}>⚠ 评分冲突</div>
          {paperConflicts.map((c, i) => (
            <div key={i} style={{ padding: '4px 8px', marginBottom: 4, background: '#FDEDEC', borderRadius: 4, fontSize: 12 }}>
              {getDimensionLabel(c.dimension)}: 差异 {Math.max(...c.scoreValues) - Math.min(...c.scoreValues)} 分 — 待仲裁
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
