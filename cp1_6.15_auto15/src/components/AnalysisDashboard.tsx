import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { QuestionItem, AnswerRecord } from './QuizPanel';

export type QuizResult = {
  total: number;
  correctCount: number;
  accuracy: number;
  answers: AnswerRecord[];
  wrongQuestions: QuestionItem[];
  byKnowledge: Array<{ tag: string; total: number; correct: number; rate: number }>;
  byDifficulty: Record<number, { total: number; correct: number; rate: number }>;
  weakTags: string[];
  simulatedAvg: { overall: number; byKnowledge: Array<{ tag: string; rate: number }> };
};

export type AnalysisData = QuizResult;

interface Props {
  result: QuizResult;
  onTagPractice: (tag: string) => void;
  onWrongPractice: (ids: string[]) => void;
  onBack: () => void;
}

const DIFF_LABELS: Record<number, string> = { 1: '初级', 2: '中级', 3: '高级' };
const TOTAL_FAKE_AVG = 0.7;

function rateLevel(rate: number): 'weak' | 'medium' | 'strong' {
  if (rate < 0.6) return 'weak';
  if (rate < 0.8) return 'medium';
  return 'strong';
}

function renderRadar(
  data: Array<{ tag: string; user: number; avg: number }>,
  size = 340,
) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.36;
  const n = data.length;
  if (n < 3) return null;

  const angle = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / n;
  const point = (v: number, i: number) => {
    const r = Math.max(0, Math.min(1, v)) * R;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const;
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const labelR = R + 22;

  const gridPolys = gridLevels.map(lv =>
    data.map((_, i) => point(lv, i).join(',')).join(' ')
  );
  const axisLines = data.map((_, i) => {
    const [x, y] = point(1, i);
    return `${cx},${cy} ${x},${y}`;
  });
  const userPath = data.map((d, i) => point(d.user, i).join(',')).join(' ');
  const avgPath = data.map((d, i) => point(d.avg, i).join(',')).join(' ');
  const dots = data.flatMap((d, i) => {
    const [ux, uy] = point(d.user, i);
    const [ax, ay] = point(d.avg, i);
    const [lx, ly] = point(1.18, i);
    return (
      <g key={i}>
        <circle cx={ux} cy={uy} r={4.5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
        <circle cx={ax} cy={ay} r={3.5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
        <text
          x={lx}
          y={ly}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fill="#475569"
          fontWeight={500}
        >
          {d.tag.length > 5 ? d.tag.slice(0, 4) + '…' : d.tag}
        </text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar-chart" role="img" aria-label="知识点掌握雷达图">
      {gridPolys.map((pts, i) => (
        <polygon key={`g${i}`} points={pts} fill="none" stroke="#e2e8f0" strokeWidth={1} />
      ))}
      {gridLevels.map((lv, i) => (
        <text key={`gl${i}`} x={cx + 3} y={cy - lv * R - 3} fontSize={9} fill="#94a3b8">
          {Math.round(lv * 100)}%
        </text>
      ))}
      {axisLines.map((ln, i) => (
        <line key={`a${i}`} x1={ln.split(' ')[0].split(',')[0]} y1={ln.split(' ')[0].split(',')[1]} x2={ln.split(' ')[1].split(',')[0]} y2={ln.split(' ')[1].split(',')[1]} stroke="#e2e8f0" strokeWidth={1} />
      ))}
      <polygon className="radar-area-avg" points={avgPath} />
      <polygon className="radar-area-user" points={userPath} />
      {dots}
    </svg>
  );
}

interface VirtualListProps {
  items: QuestionItem[];
  answers: AnswerRecord[];
  renderItem: (q: QuestionItem, ans: AnswerRecord | undefined, idx: number) => JSX.Element;
}

function VirtualList({ items, answers, renderItem }: VirtualListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const ITEM_HEIGHT = 96;
  const BUFFER = 4;

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  }, []);

  const viewportHeight = 500;
  const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
  const endIdx = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + BUFFER);
  const visibleItems = items.slice(startIdx, endIdx);
  const offsetY = startIdx * ITEM_HEIGHT;

  if (items.length <= 15) {
    return (
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {items.map((q, i) => renderItem(q, answers.find(a => a.questionId === q.id), i))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="virtual-list"
      onScroll={onScroll}
      style={{ maxHeight: viewportHeight }}
    >
      <div style={{ height: items.length * ITEM_HEIGHT, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((q, offset) => {
            const idx = startIdx + offset;
            return (
              <div key={q.id} style={{ height: ITEM_HEIGHT, boxSizing: 'border-box' }}>
                {renderItem(q, answers.find(a => a.questionId === q.id), idx)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AnalysisDashboard({ result, onTagPractice, onWrongPractice, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'summary' | 'radar' | 'wrong'>('summary');
  const [wrongExpanded, setWrongExpanded] = useState<Set<string>>(new Set());
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setRendered(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const radarData = useMemo(() => {
    return result.byKnowledge.map(k => {
      const avgEntry = result.simulatedAvg.byKnowledge.find(b => b.tag === k.tag);
      return {
        tag: k.tag,
        user: k.rate,
        avg: avgEntry?.rate ?? TOTAL_FAKE_AVG,
      };
    });
  }, [result.byKnowledge, result.simulatedAvg.byKnowledge]);

  const accuracyPct = Math.round(result.accuracy * 100);
  const accuracyLevel = rateLevel(result.accuracy);
  const accuracyLabel = accuracyLevel === 'strong' ? '优秀' : accuracyLevel === 'medium' ? '良好' : '需要加强';

  const toggleWrong = (id: string) => {
    setWrongExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allWrongIds = useMemo(() => result.wrongQuestions.map(q => q.id), [result.wrongQuestions]);

  return (
    <div style={{ contain: 'layout style' }}>
      <div className={`card chart-card ${rendered ? '' : ''}`} style={{ animationDelay: '0s' }}>
        <h2 className="card-title">🎯 练习总结</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <div className={`stat-value ${accuracyLevel === 'weak' ? 'low' : 'high'}`}>{accuracyPct}%</div>
            <div className="stat-label">正确率 · {accuracyLabel}</div>
          </div>
          <div className="stat-item">
            <div className="stat-value high">{result.correctCount}<span style={{ fontSize: 14, color: '#94a3b8' }}>/{result.total}</span></div>
            <div className="stat-label">答对题数</div>
          </div>
          <div className="stat-item">
            <div className={`stat-value ${result.wrongQuestions.length > 0 ? 'low' : 'high'}`}>{result.wrongQuestions.length}</div>
            <div className="stat-label">错题数</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{result.byKnowledge.length}</div>
            <div className="stat-label">涉及知识点</div>
          </div>
        </div>
        <div className="btn-group" style={{ marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={onBack}>← 返回首页</button>
          <button className="btn btn-primary" onClick={() => onBack()}>🔄 再来一轮</button>
          {allWrongIds.length > 0 && (
            <button className="btn btn-danger" onClick={() => onWrongPractice(allWrongIds)}>
              📝 错题重练 ({allWrongIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>📊 知识点正确率</button>
          <button className={`tab-btn ${activeTab === 'radar' ? 'active' : ''}`} onClick={() => setActiveTab('radar')}>🕸️ 能力雷达图</button>
          <button className={`tab-btn ${activeTab === 'wrong' ? 'active' : ''}`} onClick={() => setActiveTab('wrong')}>❌ 错题本 ({result.wrongQuestions.length})</button>
        </div>

        {activeTab === 'summary' && (
          <div className="bar-chart">
            {result.byKnowledge.map((k, i) => {
              const lv = rateLevel(k.rate);
              const pct = Math.round(k.rate * 100);
              const isClickable = lv === 'weak';
              return (
                <div key={k.tag} className="bar-row" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div
                    className={`bar-label ${lv} ${isClickable ? 'clickable' : ''}`}
                    onClick={() => isClickable && onTagPractice(k.tag)}
                    title={isClickable ? `点击进入"${k.tag}"专项练习` : k.tag}
                  >
                    {isClickable && '🔴 '}{k.tag}
                  </div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${lv}`}
                      style={{
                        width: `${pct}%`,
                        animationDelay: `${i * 0.06 + 0.1}s`,
                      }}
                    >
                      {pct >= 25 && <span>{pct}%</span>}
                    </div>
                  </div>
                  <div className={`bar-value`}>{k.correct}/{k.total}</div>
                </div>
              );
            })}

            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#475569' }}>📈 按难度分布</h3>
              <div className="bar-chart">
                {[1, 2, 3].map(d => {
                  const info = result.byDifficulty[d];
                  if (!info || info.total === 0) return null;
                  const lv = rateLevel(info.rate);
                  const pct = Math.round(info.rate * 100);
                  return (
                    <div key={d} className="bar-row">
                      <div className="bar-label">{DIFF_LABELS[d]}</div>
                      <div className="bar-track">
                        <div className={`bar-fill ${lv}`} style={{ width: `${pct}%` }}>
                          {pct >= 25 && <span>{pct}%</span>}
                        </div>
                      </div>
                      <div className="bar-value">{info.correct}/{info.total}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {result.weakTags.length > 0 && (
              <div style={{ marginTop: 20, padding: 14, background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
                <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>
                  ⚠️ 薄弱知识点 ({result.weakTags.length})
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {result.weakTags.map(tag => (
                    <button
                      key={tag}
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => onTagPractice(tag)}
                    >
                      🎯 {tag} → 专项练习
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="chart-card">
            <div style={{ textAlign: 'center', marginBottom: 12, color: '#475569', fontSize: 13 }}>
              个人能力分布（蓝色实线）vs 模拟平均水平（橙色虚线）
            </div>
            {renderRadar(radarData, 360)}
            <div className="legend">
              <div className="legend-item">
                <span className="legend-color" style={{ background: 'rgba(59,130,246,0.5)', border: '2px solid #3b82f6' }} />
                你 ({Math.round(result.accuracy * 100)}%)
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ background: 'rgba(245,158,11,0.3)', border: '2px dashed #f59e0b' }} />
                模拟平均 ({Math.round(result.simulatedAvg.overall * 100)}%)
              </div>
            </div>
            <div style={{ marginTop: 18, padding: 14, background: '#eff6ff', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>💡 分析建议</div>
              <ul style={{ fontSize: 13, color: '#334155', paddingLeft: 18, lineHeight: 1.8 }}>
                {radarData
                  .filter(d => d.user < 0.6)
                  .slice(0, 3)
                  .map(d => (
                    <li key={d.tag}>
                      「<strong>{d.tag}</strong>」低于 60%，建议进行专项练习
                    </li>
                  ))}
                {radarData.filter(d => d.user < 0.6).length === 0 && (
                  <li>整体表现不错！建议坚持练习，保持手感～</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'wrong' && (
          <div>
            {result.wrongQuestions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <div style={{ fontWeight: 700, color: '#059669' }}>全对啦！</div>
                <div>本次练习没有错题，继续保持吧！</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ color: '#475569', fontSize: 13 }}>
                    共 <strong style={{ color: '#dc2626' }}>{result.wrongQuestions.length}</strong> 道错题
                  </span>
                  <button className="btn btn-danger" onClick={() => onWrongPractice(allWrongIds)}>
                    🔄 全部重练
                  </button>
                </div>

                <VirtualList
                  items={result.wrongQuestions}
                  answers={result.answers}
                  renderItem={(q, ans, idx) => {
                    const expanded = wrongExpanded.has(q.id);
                    const correctAns = ans?.correctAnswer ?? 0;
                    const userAns = ans?.userAnswer ?? -1;
                    return (
                      <div key={q.id} className="accordion-item">
                        <div className="accordion-header" onClick={() => toggleWrong(q.id)}>
                          <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#94a3b8', marginRight: 8 }}>#{idx + 1}</span>
                            {q.question}
                          </div>
                          <span className={`accordion-chevron ${expanded ? 'open' : ''}`}>▼</span>
                        </div>
                        <div className={`accordion-content ${expanded ? 'open' : ''}`}>
                          <div className="wrong-item">
                            <div className="wrong-question">{q.question}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                              {q.knowledgeTag} · 难度：{DIFF_LABELS[q.difficulty]}
                            </div>
                            <div className="wrong-options">
                              {q.options.map((opt, i) => {
                                let cls = 'wrong-opt';
                                if (i === correctAns) cls += ' is-answer';
                                if (i === userAns) cls += ' is-user';
                                return (
                                  <div key={i} className={cls}>
                                    <strong>{String.fromCharCode(65 + i)}.</strong> {opt}
                                    {i === correctAns && ' ✓'}
                                    {i === userAns && userAns !== correctAns && ' ✗（你的答案）'}
                                  </div>
                                );
                              })}
                            </div>
                            {ans?.explanation && (
                              <div style={{ fontSize: 13, color: '#475569', padding: 10, background: '#f8fafc', borderRadius: 6 }}>
                                💡 {ans.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
