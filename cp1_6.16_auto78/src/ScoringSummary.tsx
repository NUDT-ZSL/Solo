import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Paper, Reviewer, ConflictFlag, SummaryItem, ScoreItem } from './business/ReviewMatch';
import { getDimensionLabel, SCORE_WEIGHTS } from './business/ReviewMatch';

interface Props {
  summary: SummaryItem[];
  conflicts: ConflictFlag[];
  papers: Paper[];
  reviewers: Reviewer[];
  onResolveConflict: (paperId: string, dimension: string, arbitratedScore: number) => void;
  onExport: () => void;
}

const DIMENSIONS: (keyof ScoreItem)[] = ['innovation', 'technicalDepth', 'experimentalCompleteness', 'writingQuality'];
const RADAR_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12'];
const RADAR_SIZE = 160;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 60;

function drawRadarChart(canvas: HTMLCanvasElement, breakdown: ScoreItem, conflicts: ConflictFlag[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = RADAR_SIZE * dpr;
  canvas.height = RADAR_SIZE * dpr;
  canvas.style.width = RADAR_SIZE + 'px';
  canvas.style.height = RADAR_SIZE + 'px';
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

  const n = DIMENSIONS.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  for (let level = 1; level <= 5; level++) {
    const r = (level / 5) * RADAR_RADIUS;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = startAngle + i * angleStep;
      const x = RADAR_CENTER + r * Math.cos(angle);
      const y = RADAR_CENTER + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const x = RADAR_CENTER + RADAR_RADIUS * Math.cos(angle);
    const y = RADAR_CENTER + RADAR_RADIUS * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(RADAR_CENTER, RADAR_CENTER);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#D5D8DC';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    const labelR = RADAR_RADIUS + 14;
    const lx = RADAR_CENTER + labelR * Math.cos(angle);
    const ly = RADAR_CENTER + labelR * Math.sin(angle);
    ctx.fillStyle = '#7F8C8D';
    ctx.font = '9px Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const dim = DIMENSIONS[i];
    const label = getDimensionLabel(dim);
    const hasConflict = conflicts.some((c) => c.dimension === dim && !c.resolved);
    ctx.fillText(label, lx, ly);
    if (hasConflict) {
      ctx.fillStyle = '#E74C3C';
      ctx.fillText('⚠', lx + label.length * 4 + 4, ly);
    }
  }

  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const dim = DIMENSIONS[idx];
    const val = breakdown[dim];
    const r = (val / 10) * RADAR_RADIUS;
    const angle = startAngle + idx * angleStep;
    const x = RADAR_CENTER + r * Math.cos(angle);
    const y = RADAR_CENTER + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
  ctx.fill();
  ctx.strokeStyle = '#3498DB';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for (let i = 0; i < n; i++) {
    const dim = DIMENSIONS[i];
    const val = breakdown[dim];
    const r = (val / 10) * RADAR_RADIUS;
    const angle = startAngle + i * angleStep;
    const x = RADAR_CENTER + r * Math.cos(angle);
    const y = RADAR_CENTER + r * Math.sin(angle);
    const hasConflict = conflicts.some((c) => c.dimension === dim && !c.resolved);
    ctx.beginPath();
    ctx.arc(x, y, hasConflict ? 4 : 3, 0, 2 * Math.PI);
    ctx.fillStyle = hasConflict ? '#E74C3C' : '#3498DB';
    ctx.fill();
  }
}

function RadarChart({ breakdown, conflicts }: { breakdown: ScoreItem; conflicts: ConflictFlag[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawRadarChart(canvasRef.current, breakdown, conflicts);
    }
  }, [breakdown, conflicts]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}

export default function ScoringSummary({ summary, conflicts, papers, reviewers, onResolveConflict, onExport }: Props) {
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  const [arbitratingConflict, setArbitratingConflict] = useState<{ paperId: string; dimension: string } | null>(null);
  const [arbitrateScore, setArbitrateScore] = useState(5);

  const handleArbitrate = useCallback(() => {
    if (arbitratingConflict) {
      onResolveConflict(arbitratingConflict.paperId, arbitratingConflict.dimension, arbitrateScore);
      setArbitratingConflict(null);
    }
  }, [arbitratingConflict, arbitrateScore, onResolveConflict]);

  const scoredPapers = summary.filter((s) => s.reviewerCount > 0);
  const unscoredPapers = summary.filter((s) => s.reviewerCount === 0);
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 20 }}>
          评分汇总与排名
          <span style={{ fontSize: 14, color: '#7F8C8D', fontWeight: 400, marginLeft: 8 }}>
            ({scoredPapers.length} 篇已评分)
          </span>
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unresolvedConflicts.length > 0 && (
            <span style={{ background: '#FDEDEC', color: '#E74C3C', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
              ⚠ {unresolvedConflicts.length} 项待仲裁
            </span>
          )}
          <button
            onClick={onExport}
            style={{ padding: '8px 16px', background: '#2980B9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            📥 导出 JSON
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, color: '#7F8C8D', marginBottom: 8 }}>评分权重配置</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {DIMENSIONS.map((dim, i) => (
            <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: RADAR_COLORS[i] }} />
              <span style={{ fontSize: 13 }}>{getDimensionLabel(dim)}: {(SCORE_WEIGHTS[dim] * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {scoredPapers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#7F8C8D', fontSize: 16, background: '#fff', borderRadius: 8 }}>
          暂无已评分的论文
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {scoredPapers.map((item, index) => {
            const paper = papers.find((p) => p.id === item.paperId);
            const paperConflicts = conflicts.filter((c) => c.paperId === item.paperId && !c.resolved);
            const isExpanded = expandedPaper === item.paperId;

            return (
              <div key={item.paperId} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div
                  style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                  onClick={() => setExpandedPaper(isExpanded ? null : item.paperId)}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: index < 3 ? ['#F1C40F', '#BDC3C7', '#E67E22'][index] : '#ECF0F1',
                    color: index < 3 ? '#fff' : '#7F8C8D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}>
                    {index + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#7F8C8D' }}>
                      {paper?.authors.join(', ')} | {item.reviewerCount} 位审稿人
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#2980B9' }}>{item.totalScore.toFixed(1)}</div>
                      <div style={{ fontSize: 10, color: '#95A5A6' }}>加权总分</div>
                    </div>
                    {paperConflicts.length > 0 && (
                      <span style={{ background: '#FDEDEC', color: '#E74C3C', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                        ⚠ {paperConflicts.length} 冲突
                      </span>
                    )}
                    <span style={{ fontSize: 14, color: '#95A5A6' }}>{isExpanded ? '▼' : '▶'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F0F0F0' }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
                      <RadarChart breakdown={item.scoreBreakdown} conflicts={paperConflicts} />
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>各项得分</div>
                        {DIMENSIONS.map((dim, i) => {
                          const val = item.scoreBreakdown[dim];
                          const hasConflict = paperConflicts.some((c) => c.dimension === dim);
                          return (
                            <div
                              key={dim}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 8,
                                padding: hasConflict ? '6px 8px' : '6px 8px',
                                background: hasConflict ? '#FDEDEC' : 'transparent',
                                borderRadius: 4,
                              }}
                            >
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: RADAR_COLORS[i], flexShrink: 0 }} />
                              <span style={{ fontSize: 13, flex: 1 }}>{getDimensionLabel(dim)}</span>
                              <div style={{ width: 80, height: 6, background: '#ECF0F1', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${(val / 10) * 100}%`, height: '100%', background: RADAR_COLORS[i], borderRadius: 3, transition: 'width 0.3s ease' }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{val.toFixed(1)}</span>
                              {hasConflict && (
                                <span
                                  style={{ fontSize: 11, color: '#E74C3C', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setArbitratingConflict({ paperId: item.paperId, dimension: dim });
                                    setArbitrateScore(val);
                                  }}
                                >
                                  待仲裁
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {paper && (
                      <div style={{ marginTop: 16, padding: 12, background: '#F8F9FA', borderRadius: 6 }}>
                        <div style={{ fontSize: 12, color: '#7F8C8D', marginBottom: 4 }}>摘要</div>
                        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{paper.abstract}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {unscoredPapers.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12, color: '#95A5A6' }}>未评分论文 ({unscoredPapers.length})</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {unscoredPapers.map((item) => (
              <div key={item.paperId} style={{ background: '#fff', borderRadius: 6, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', fontSize: 13, color: '#7F8C8D' }}>
                {item.title} — 等待评分
              </div>
            ))}
          </div>
        </div>
      )}

      {arbitratingConflict && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setArbitratingConflict(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              minWidth: 360,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>仲裁评分</h3>
            <div style={{ fontSize: 13, color: '#7F8C8D', marginBottom: 12 }}>
              论文: {papers.find((p) => p.id === arbitratingConflict.paperId)?.title}<br />
              评分项: {getDimensionLabel(arbitratingConflict.dimension)}
            </div>
            {(() => {
              const conflict = conflicts.find(
                (c) => c.paperId === arbitratingConflict.paperId && c.dimension === arbitratingConflict.dimension && !c.resolved
              );
              if (conflict) {
                return (
                  <div style={{ marginBottom: 16, padding: 8, background: '#FDEDEC', borderRadius: 4, fontSize: 12 }}>
                    <div style={{ color: '#E74C3C', fontWeight: 600, marginBottom: 4 }}>评分差异: {Math.max(...conflict.scoreValues) - Math.min(...conflict.scoreValues)} 分</div>
                    {conflict.reviewerIds.map((rid, i) => {
                      const reviewer = reviewers.find((r) => r.id === rid);
                      return (
                        <div key={rid} style={{ color: '#555' }}>
                          {reviewer?.name}: {conflict.scoreValues[i]} 分
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })()}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>设定仲裁分数 (0-10)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={arbitrateScore}
                  onChange={(e) => setArbitrateScore(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 18, fontWeight: 600, minWidth: 36, textAlign: 'center' }}>{arbitrateScore.toFixed(1)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setArbitratingConflict(null)}
                style={{ padding: '8px 16px', background: '#ECF0F1', color: '#2C3E50', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >
                取消
              </button>
              <button
                onClick={handleArbitrate}
                style={{ padding: '8px 16px', background: '#E74C3C', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                确认仲裁
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
