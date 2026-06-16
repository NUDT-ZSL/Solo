import React, { useState, useEffect, useCallback } from 'react';
import type { Paper, Reviewer, ReviewScore, ScoreItem, ConflictFlag } from './business/ReviewMatch';
import { getDimensionLabel } from './business/ReviewMatch';
import type { ReviewerHistoryItem } from './api';
import { getReviewerHistory } from './api';

interface Props {
  reviewer: Reviewer;
  papers: Paper[];
  scores: ReviewScore[];
  conflicts: ConflictFlag[];
  onSubmitScore: (data: { paperId: string; reviewerId: string; scores: ScoreItem; comment: string }) => void;
}

const DIMENSIONS: { key: keyof ScoreItem; label: string; weight: string }[] = [
  { key: 'innovation', label: '创新性', weight: '30%' },
  { key: 'technicalDepth', label: '技术深度', weight: '25%' },
  { key: 'experimentalCompleteness', label: '实验完整性', weight: '25%' },
  { key: 'writingQuality', label: '写作质量', weight: '20%' },
];

function GradientSlider({
  value,
  onChange,
  hasConflict,
}: {
  value: number;
  onChange: (v: number) => void;
  hasConflict?: boolean;
}) {
  const [showBubble, setShowBubble] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (dragging) {
      setShowBubble(true);
      const timer = setTimeout(() => {
        if (!dragging) setShowBubble(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [dragging, value]);

  const percentage = (value / 10) * 100;

  return (
    <div style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          flex: 1,
          height: hasConflict ? 10 : 8,
          borderRadius: 4,
          background: 'linear-gradient(to right, #E74C3C, #F1C40F, #2ECC71)',
          position: 'relative',
          border: hasConflict ? '2px solid #E74C3C' : 'none',
          boxSizing: 'border-box',
        }}
      />
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={value}
        onChange={(e) => {
          onChange(parseFloat(e.target.value));
          setDragging(true);
        }}
        onMouseUp={() => setDragging(false)}
        onTouchEnd={() => setDragging(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          margin: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `calc(${percentage}% - 10px)`,
          top: hasConflict ? -1 : -2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: hasConflict ? '#E74C3C' : '#2C3E50',
          border: '3px solid #fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
          transition: 'left 0.05s ease',
        }}
      />
      {showBubble && (
        <div
          style={{
            position: 'absolute',
            left: `calc(${percentage}% - 16px)`,
            top: -30,
            background: '#2C3E50',
            color: '#fff',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {value.toFixed(1)}
        </div>
      )}
    </div>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '未知时间';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

export default function ReviewerPanel({ reviewer, papers, scores, conflicts, onSubmitScore }: Props) {
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  const [paperScores, setPaperScores] = useState<Record<string, ScoreItem>>({});
  const [paperComments, setPaperComments] = useState<Record<string, string>>({});
  const [submittingPaper, setSubmittingPaper] = useState<string | null>(null);
  const [submittedPapers, setSubmittedPapers] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ReviewerHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  useEffect(() => {
    const initialScores: Record<string, ScoreItem> = {};
    const initialComments: Record<string, string> = {};
    const submitted = new Set<string>();
    for (const paper of papers) {
      const existing = scores.find((s) => s.paperId === paper.id && s.reviewerId === reviewer.id && s.submitted);
      if (existing) {
        initialScores[paper.id] = { ...existing.scores };
        initialComments[paper.id] = existing.comment;
        submitted.add(paper.id);
      } else {
        initialScores[paper.id] = { innovation: 5, technicalDepth: 5, experimentalCompleteness: 5, writingQuality: 5 };
        initialComments[paper.id] = '';
      }
    }
    setPaperScores(initialScores);
    setPaperComments(initialComments);
    setSubmittedPapers(submitted);
  }, [papers, scores, reviewer.id]);

  const loadHistory = useCallback(async () => {
    if (!showHistory) return;
    setHistoryLoading(true);
    try {
      const data = await getReviewerHistory(reviewer.id);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [showHistory, reviewer.id]);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  const updateScore = useCallback((paperId: string, dimension: keyof ScoreItem, value: number) => {
    setPaperScores((prev) => ({
      ...prev,
      [paperId]: { ...prev[paperId], [dimension]: value },
    }));
  }, []);

  const handleSubmit = useCallback(async (paperId: string) => {
    setSubmittingPaper(paperId);
    const s = paperScores[paperId];
    const c = paperComments[paperId] || '';
    if (!s) return;
    try {
      await onSubmitScore({
        paperId,
        reviewerId: reviewer.id,
        scores: s,
        comment: c,
      });
      setSubmittedPapers((prev) => new Set(prev).add(paperId));
      if (showHistory) loadHistory();
    } finally {
      setTimeout(() => {
        setSubmittingPaper(null);
      }, 500);
    }
  }, [paperScores, paperComments, reviewer.id, onSubmitScore, showHistory, loadHistory]);

  if (papers.length === 0 && history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#7F8C8D' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
        <div style={{ fontSize: 16 }}>暂无分配的论文</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .bubble-fade-in { animation: fadeIn 0.2s ease; }
      `}</style>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 20 }}>
            我的审稿任务
            <span style={{ fontSize: 14, color: '#7F8C8D', fontWeight: 400, marginLeft: 8 }}>
              （{papers.length} 篇待审论文）
            </span>
          </h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '8px 16px',
              background: showHistory ? '#2980B9' : '#fff',
              color: showHistory ? '#fff' : '#2980B9',
              border: '1px solid #2980B9',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {showHistory ? '收起历史' : '📜 查看评分历史'}
          </button>
        </div>

        {showHistory && (
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              历史评分记录
              <span style={{ fontSize: 12, color: '#7F8C8D', fontWeight: 400, marginLeft: 8 }}>
                （共 {history.length} 条）
              </span>
            </div>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#7F8C8D' }}>加载中...</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#95A5A6', fontSize: 13 }}>暂无历史记录</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {history.map((h) => {
                  const isExpanded = expandedHistory === h.id;
                  return (
                    <div key={h.id} style={{ border: '1px solid #ECF0F1', borderRadius: 6, overflow: 'hidden' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: '#F8F9FA',
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedHistory(isExpanded ? null : h.id)}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.paperTitle}
                          </div>
                          <div style={{ fontSize: 11, color: '#95A5A6', marginTop: 2 }}>
                            提交时间: {formatDate(h.submittedAt)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#2980B9', minWidth: 40, textAlign: 'right' }}>
                            {(
                              h.scores.innovation * 0.3 +
                              h.scores.technicalDepth * 0.25 +
                              h.scores.experimentalCompleteness * 0.25 +
                              h.scores.writingQuality * 0.2
                            ).toFixed(1)}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedHistory(isExpanded ? null : h.id); }}
                            style={{
                              padding: '4px 10px',
                              background: '#EBF5FB',
                              color: '#2980B9',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 11,
                            }}
                          >
                            {isExpanded ? '收起' : '查看详情'}
                          </button>
                          <span style={{ fontSize: 12, color: '#95A5A6' }}>{isExpanded ? '▼' : '▶'}</span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '12px 16px', borderTop: '1px solid #ECF0F1' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
                            {DIMENSIONS.map((d) => {
                              const hc = conflicts.find((c) => c.paperId === h.paperId && c.dimension === d.key);
                              return (
                                <div
                                  key={d.key}
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: 4,
                                    background: hc && !hc.resolved ? '#FDEDEC' : '#F8F9FA',
                                    fontSize: 12,
                                  }}
                                >
                                  <div style={{ color: '#7F8C8D' }}>{d.label}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: hc && !hc.resolved ? '#E74C3C' : '#2C3E50' }}>
                                      {h.scores[d.key]}
                                    </span>
                                    {hc && !hc.resolved && (
                                      <span style={{ fontSize: 10, color: '#E74C3C', fontWeight: 600 }}>待仲裁</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ fontSize: 12 }}>
                            <div style={{ color: '#7F8C8D', marginBottom: 4 }}>评语:</div>
                            <div style={{ background: '#F8F9FA', padding: '8px 10px', borderRadius: 4, color: '#555', lineHeight: 1.5 }}>
                              {h.comment || '（无评语）'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          {papers.map((paper) => {
            const isExpanded = expandedPaper === paper.id;
            const s = paperScores[paper.id];
            const comment = paperComments[paper.id] || '';
            const isSubmitted = submittedPapers.has(paper.id);
            const isSubmitting = submittingPaper === paper.id;
            const paperConflicts = conflicts.filter((c) => c.paperId === paper.id && !c.resolved);

            return (
              <div key={paper.id} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onClick={() => setExpandedPaper(isExpanded ? null : paper.id)}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{paper.title}</div>
                    <div style={{ fontSize: 12, color: '#7F8C8D', marginTop: 2 }}>
                      作者: {paper.authors.join(', ')} | 关键词: {paper.keywords.join(', ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isSubmitted && (
                      <span style={{ background: '#E8F8F5', color: '#27AE60', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        已评分
                      </span>
                    )}
                    {paperConflicts.length > 0 && (
                      <span style={{ background: '#FDEDEC', color: '#E74C3C', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        ⚠ {paperConflicts.length} 项冲突
                      </span>
                    )}
                    <span style={{ fontSize: 14, color: '#95A5A6' }}>{isExpanded ? '▼' : '▶'}</span>
                  </div>
                </div>

                {isExpanded && s && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F0F0F0' }}>
                    <div style={{ padding: '12px 0', fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                      <strong>摘要:</strong> {paper.abstract}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                      {paper.keywords.map((kw) => (
                        <span key={kw} style={{ background: '#FEF9E7', color: '#F39C12', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                          {kw}
                        </span>
                      ))}
                    </div>

                    <div style={{ borderTop: '1px solid #F0F0F0', paddingTop: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>评分</div>
                      {DIMENSIONS.map((dim) => {
                        const hasConflict = paperConflicts.some((c) => c.dimension === dim.key);
                        return (
                          <div
                            key={dim.key}
                            style={{
                              marginBottom: 16,
                              padding: hasConflict ? '8px 10px' : 0,
                              background: hasConflict ? '#FDEDEC' : 'transparent',
                              borderRadius: 6,
                              transition: 'background 0.3s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>
                                {dim.label}
                                <span style={{ fontSize: 11, color: '#95A5A6', marginLeft: 4 }}>({dim.weight})</span>
                                {hasConflict && (
                                  <span style={{ fontSize: 11, color: '#E74C3C', fontWeight: 700, marginLeft: 8 }}>
                                    ⚠ 待仲裁
                                  </span>
                                )}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 600, color: hasConflict ? '#E74C3C' : '#2C3E50', minWidth: 32, textAlign: 'right' }}>
                                {s[dim.key].toFixed(1)}
                              </span>
                            </div>
                            <GradientSlider
                              value={s[dim.key]}
                              onChange={(v) => updateScore(paper.id, dim.key, v)}
                              hasConflict={hasConflict}
                            />
                          </div>
                        );
                      })}

                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                          评语
                          <span style={{ fontSize: 11, color: '#95A5A6', marginLeft: 4 }}>
                            （{comment.length}/200）
                          </span>
                        </div>
                        <textarea
                          value={comment}
                          onChange={(e) => {
                            const val = e.target.value.slice(0, 200);
                            setPaperComments((prev) => ({ ...prev, [paper.id]: val }));
                          }}
                          maxLength={200}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #BDC3C7',
                            borderRadius: 6,
                            fontSize: 13,
                            minHeight: 80,
                            resize: 'vertical',
                          }}
                          placeholder="输入对该论文的评语（最多200字）..."
                        />
                      </div>

                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleSubmit(paper.id)}
                          disabled={isSubmitting || isSubmitted}
                          style={{
                            padding: '10px 24px',
                            background: isSubmitted ? '#27AE60' : isSubmitting ? '#95A5A6' : '#2980B9',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: isSubmitting || isSubmitted ? 'default' : 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            minWidth: 120,
                            justifyContent: 'center',
                            transition: 'background 0.3s ease',
                          }}
                        >
                          {isSubmitting ? (
                            <>
                              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                              提交中...
                            </>
                          ) : isSubmitted ? (
                            <>
                              <span style={{ fontSize: 16 }}>✓</span>
                              已提交
                            </>
                          ) : (
                            '提交评分'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
