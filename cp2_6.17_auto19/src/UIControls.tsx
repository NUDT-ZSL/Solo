import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Plant, Genes, EnvironmentThreat, LineageNode, MutationDeltas } from './types';

const GENE_LABELS: { key: keyof Genes; label: string; from: string; to: string }[] = [
  { key: 'rootStrength', label: '根强度', from: '#a16207', to: '#ca8a04' },
  { key: 'stemToughness', label: '茎韧性', from: '#065f46', to: '#059669' },
  { key: 'leafArea', label: '叶面积', from: '#1e40af', to: '#3b82f6' },
  { key: 'flowerColor', label: '花色值', from: '#9f1239', to: '#f472b6' },
];

const GENE_DESCRIPTIONS: Record<keyof Genes, string> = {
  rootStrength: '影响主茎粗细（2-8px），值越高茎越粗壮，对抗干旱威胁效果更强',
  stemToughness: '影响分支密度（2-8条），值越高分支越多，对抗虫灾和强风效果更强',
  leafArea: '影响叶子大小（10-30px），颜色从绿到蓝渐变，对抗霜冻威胁效果更强',
  flowerColor: '决定花朵彩度，花瓣半径8-16px随值增大，影响植物外观美观度',
};

function supportsHover(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia?.('(hover: hover)').matches ?? true;
}

function GeneBar({
  label,
  value,
  from,
  to,
  desc,
}: {
  label: string;
  value: number;
  from: string;
  to: string;
  desc?: string;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const canHover = useMemo(() => supportsHover(), []);

  useEffect(() => {
    if (!desc || canHover) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setTipOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [desc, canHover]);

  const clampedValue = Math.max(0, Math.min(255, value));
  const pct = ((clampedValue / 255) * 100).toFixed(1);
  const display = Math.round((clampedValue / 255) * 100);

  const toggleTip = (e: React.MouseEvent | React.TouchEvent) => {
    if (!desc) return;
    if (!canHover) {
      e.preventDefault();
      e.stopPropagation();
      setTipOpen((v) => !v);
    }
  };

  return (
    <div className="gene-row">
      <div className="gene-row-header">
        <span className="name">
          {desc ? (
            <span
              ref={wrapRef}
              className={`tooltip-wrap ${canHover ? '' : 'no-hover'} ${tipOpen ? 'tip-open' : ''}`}
              onClick={toggleTip}
              onTouchStart={toggleTip}
            >
              {label}
              <span className="tip-icon">i</span>
              <span className={`tooltip ${canHover ? '' : 'tip-clickable'}`}>
                <div className="tooltip-title">{label}</div>
                <div>{desc}</div>
              </span>
            </span>
          ) : (
              label
            )}
        </span>
        <span className="value">
          {display}/100
          <span className="sub">({clampedValue})</span>
        </span>
      </div>
      <div className="gene-track">
        <div
          className="gene-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${from}, ${to})`,
          }}
        />
      </div>
    </div>
  );
}

function GeneEditor({ genes, descriptions }: { genes: Genes; descriptions?: Partial<Record<keyof Genes, string>> }) {
  return (
    <div className="section">
      <div className="section-title">基因编辑器</div>
      {GENE_LABELS.map((g) => (
        <GeneBar
          key={g.key}
          label={g.label}
          value={genes[g.key]}
          from={g.from}
          to={g.to}
          desc={descriptions?.[g.key] ?? GENE_DESCRIPTIONS[g.key]}
        />
      ))}
    </div>
  );
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
function clamp255(v: number): number {
  return Math.max(0, Math.min(255, v));
}

function RadarChart({
  parent1,
  parent2,
  child,
}: {
  parent1: Genes | null;
  parent2: Genes | null;
  child: Genes | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 90;
  const axes = GENE_LABELS.length;

  const datasets: { name: string; color: string; genes: Genes | null }[] = [
    { name: '父本', color: '#3b82f6', genes: parent1 },
    { name: '母本', color: '#ef4444', genes: parent2 },
    { name: '子代', color: '#22c55e', genes: child },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const angleForAxis = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / axes;

    const pointForValue = (value: number, axisIdx: number) => {
      const clamped = clamp255(value);
      const norm = clamp01(clamped / 255);
      const r = radius * norm;
      const a = angleForAxis(axisIdx);
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    };

    const drawPolygon = (points: { x: number; y: number }[], fill: string, stroke: string, alpha: number) => {
      if (points.length < 3) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    };

    // grid
    [0.25, 0.5, 0.75, 1].forEach((scale, idx) => {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < axes; i++) {
        const a = angleForAxis(i);
        const r = radius * scale;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      if (idx === 3) {
        ctx.setLineDash([]);
      } else {
        ctx.setLineDash([2, 3]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });

    // axes lines
    for (let i = 0; i < axes; i++) {
      const a = angleForAxis(i);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // data polygons
    for (const ds of datasets) {
      if (!ds.genes) continue;
      const pts = GENE_LABELS.map((g, i) => pointForValue(ds.genes![g.key], i));
      drawPolygon(pts, ds.color, ds.color, 0.15);
    }

    // data points
    for (const ds of datasets) {
      if (!ds.genes) continue;
      for (let i = 0; i < GENE_LABELS.length; i++) {
        const pt = pointForValue(ds.genes[GENE_LABELS[i].key], i);
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = ds.color;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }

    // axis labels
    for (let i = 0; i < GENE_LABELS.length; i++) {
      const g = GENE_LABELS[i];
      const a = angleForAxis(i);
      const lr = radius + 20;
      const lx = cx + Math.cos(a) * lr;
      const ly = cy + Math.sin(a) * lr;

      const rawVal = child?.[g.key] ?? parent1?.[g.key] ?? 0;
      const normVal = Math.round((clamp255(rawVal) / 255) * 100);

      ctx.save();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 11px -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.label, lx, ly);

      ctx.fillStyle = '#64748b';
      ctx.font = '9px "SF Mono", Consolas, monospace';
      ctx.fillText(String(normVal), lx, ly + 12);
      ctx.restore();
    }
  }, [parent1, parent2, child]);

  const hasData = parent1 || parent2 || child;

  return (
    <div className="radar-wrap">
      <div className="radar-title">
        <span>📊 基因雷达对比图</span>
        <span style={{ color: '#64748b', fontSize: 10 }}>归一化 0-100</span>
      </div>
      {!hasData ? (
        <div className="radar-empty">选择 2 株亲本执行杂交后显示对比</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <canvas
              ref={canvasRef}
              className="radar-svg"
              style={{ display: 'block' }}
            />
          </div>

          <div className="radar-legend">
            {datasets.filter((d) => d.genes).map((d) => (
              <div key={d.name} className="radar-legend-item">
                <span
                  className="radar-legend-dot"
                  style={{ background: d.color }}
                />
                <span>{d.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SpeedSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="section">
      <div className="slider-header">
        <div className="section-title" style={{ marginBottom: 0 }}>生长速度</div>
        <span className="slider-value">{value.toFixed(1)}x</span>
      </div>
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <div className="slider-labels">
        <span>0.5x</span>
        <span>1.0x</span>
        <span>2.0x</span>
      </div>
    </div>
  );
}

const THREAT_INFO: Record<string, { name: string; icon: string; color: string; desc: string }> = {
  DROUGHT: { name: '干旱', icon: '🌵', color: '#f59e0b', desc: '根强度<40时双倍伤害' },
  PEST: { name: '虫灾', icon: '🐛', color: '#84cc16', desc: '茎韧性<40时双倍伤害' },
  WIND: { name: '强风', icon: '🌪️', color: '#60a5fa', desc: '茎韧性<40时双倍伤害' },
  FROST: { name: '霜冻', icon: '❄️', color: '#e0f2fe', desc: '叶面积<40时双倍伤害' },
};

function ThreatStatus({ threat, currentTime }: { threat: EnvironmentThreat | null; currentTime: number }) {
  let remaining = 0;
  if (threat) {
    remaining = Math.max(0, threat.duration - (currentTime - threat.startTime));
  }
  const info = threat ? THREAT_INFO[threat.type] : null;

  return (
    <div className="section">
      <div className="section-title">环境威胁</div>
      {info ? (
        <div className="threat-active">
          <div className="threat-icon-row">
            <span className="threat-icon">{info.icon}</span>
            <div>
              <div className="threat-name" style={{ color: info.color }}>{info.name}</div>
              <div className="threat-desc">{info.desc}</div>
            </div>
          </div>
          <div className="threat-time-row">
            <span className="label">剩余时间</span>
            <span className="val">{(remaining / 1000).toFixed(1)}s</span>
          </div>
          <div className="threat-progress">
            <div
              className="threat-progress-fill"
              style={{ width: `${(remaining / threat!.duration) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="no-threat">
          <span>☀️</span>
          <span>当前无威胁，植物正常生长</span>
        </div>
      )}
    </div>
  );
}

function MutationBadge({
  label,
  delta,
  baseValue,
}: {
  label: string;
  delta: number;
  baseValue: number;
}) {
  const pct = baseValue === 0 ? 0 : (delta / baseValue) * 100;
  const isPositive = pct >= 0;
  const cls = isPositive ? 'pos' : 'neg';
  const ccls = isPositive ? 'pos-c' : 'neg-c';
  const sign = isPositive ? '+' : '';
  return (
    <div className={`mutation-item ${cls}`}>
      <span className="name">{label}</span>
      <span className={`delta ${ccls}`}>
        {sign}{pct.toFixed(1)}%
      </span>
    </div>
  );
}

function HybridPanel({
  selected,
  onHybrid,
  plants,
  lastChildGenes,
}: {
  selected: Plant[];
  onHybrid: () => void;
  plants: Plant[];
  lastChildGenes: Genes | null;
}) {
  const canHybrid = selected.length === 2;
  const p1 = selected[0];
  const p2 = selected[1];

  return (
    <div className="section">
      <div className="section-title">杂交面板</div>

      <div className="parent-grid">
        {[0, 1].map((i) => {
          const p = selected[i];
          return (
            <div
              key={i}
              className={`parent-slot ${p ? 'filled' : ''}`}
            >
              {p ? (
                <>
                  <span className="gen">G{p.generation}</span>
                  <span className="pid">#{p.id.slice(-4)}</span>
                  <span className="php">HP:{p.health.toFixed(0)}</span>
                </>
              ) : (
                <>
                  <span className="emoji">🌱</span>
                  <span>点击选择亲本{i + 1}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {canHybrid && p1 && p2 && (
        <div className="mutation-preview">
          <div className="mutation-preview-title">预计子代变异（基于父母均值+高斯变异）：</div>
          {GENE_LABELS.map((g) => {
            const avg = (p1.genes[g.key] + p2.genes[g.key]) / 2;
            const estDelta = (Math.random() - 0.5) * 0.2 * avg;
            return (
              <MutationBadge
                key={g.key}
                label={g.label}
                delta={estDelta}
                baseValue={avg}
              />
            );
          })}
        </div>
      )}

      <button
        disabled={!canHybrid}
        onClick={onHybrid}
        className="btn-hybrid"
      >
        {canHybrid ? '🧬 执行杂交' : `已选择 ${selected.length}/2`}
      </button>

      <div className="plant-count">当前植物总数：{plants.length}</div>

      <RadarChart
        parent1={p1?.genes ?? null}
        parent2={p2?.genes ?? null}
        child={lastChildGenes}
      />
    </div>
  );
}

function LineageTree({
  nodes,
  expanded,
  onToggle,
  plantsMap,
}: {
  nodes: LineageNode[];
  expanded: boolean;
  onToggle: () => void;
  plantsMap: Map<string, Plant>;
}) {
  const renderNode = (node: LineageNode, depth: number): React.ReactNode => {
    const p = plantsMap.get(node.plantId);
    return (
      <div key={node.plantId} className="lineage-node" style={{ marginLeft: depth * 16 }}>
        <div className="node-inner">
          <div className="node-bar" />
          <div className="node-card">
            <div className="node-header">
              <span className="gen">G{node.generation}</span>
              <span className="id">#{node.plantId.slice(-4)}</span>
            </div>
            {node.hybridCycle !== null && (
              <div className="node-cycle">杂交于第 {node.hybridCycle} 周期</div>
            )}
            {node.mutationDeltas && (
              <div className="node-muts">
                {GENE_LABELS.map((g) => {
                  const d = node.mutationDeltas![g.key];
                  const base = node.genes[g.key];
                  const pct = base === 0 ? 0 : (d / base) * 100;
                  if (Math.abs(pct) < 0.5) return null;
                  const pos = pct >= 0;
                  return (
                    <span
                      key={g.key}
                      style={{ color: pos ? '#22c55e' : '#ef4444' }}
                    >
                      {g.label.slice(0, 1)}{pos ? '+' : ''}{pct.toFixed(0)}%
                    </span>
                  );
                })}
              </div>
            )}
            <div className="node-genes">
              <span>R{node.genes.rootStrength}</span>
              <span>S{node.genes.stemToughness}</span>
              <span>L{node.genes.leafArea}</span>
              <span>F{node.genes.flowerColor}</span>
            </div>
            {p && (
              <div className="node-hp">
                <span className="label">HP:</span>
                <div className="node-hp-track">
                  <div
                    className="node-hp-fill"
                    style={{ width: `${p.health}%` }}
                  />
                </div>
                <span className="val">{p.health.toFixed(0)}</span>
              </div>
            )}
          </div>
        </div>
        {node.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="section">
      <button className="lineage-toggle" onClick={onToggle}>
        <span>🌳 基因谱系树</span>
        <span className={`lineage-arrow ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>
      <div className={`lineage-body ${expanded ? 'expanded' : ''}`}>
        {nodes.length > 0 ? (
          nodes.map((n) => renderNode(n, 0))
        ) : (
          <div className="empty-hint">暂无谱系数据</div>
        )}
      </div>
    </div>
  );
}

function SelectedPlantInfo({ plant }: { plant: Plant | null }) {
  const hpClass = plant
    ? plant.health > 70
      ? 'ok'
      : plant.health > 30
        ? 'warn'
        : 'danger'
    : '';
  return (
    <div className="section">
      <div className="section-title">植物信息</div>
      {plant ? (
        <>
          <div className="info-row">
            <span className="label">代数</span>
            <span className="val gold">G{plant.generation}</span>
          </div>
          <div className="info-row">
            <span className="label">ID</span>
            <span className="val mono">#{plant.id.slice(-8)}</span>
          </div>
          <div className="info-row">
            <span className="label">生长进度</span>
            <span className="val mono">{(plant.growthProgress * 100).toFixed(0)}%</span>
          </div>
          <div className="info-track">
            <div
              className="info-track-fill"
              style={{
                width: `${plant.growthProgress * 100}%`,
                background: 'linear-gradient(to right, #065f46, #22c55e)',
              }}
            />
          </div>
          <div className="info-row">
            <span className="label">健康度</span>
            <span className={`val ${hpClass}`}>{plant.health.toFixed(0)}%</span>
          </div>
          <div className="info-track">
            <div
              className="info-track-fill"
              style={{
                width: `${plant.health}%`,
                background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)',
              }}
            />
          </div>
        </>
      ) : (
        <div className="empty-hint">点击场景中的植物查看详情</div>
      )}
    </div>
  );
}

export default function UIControls({
  speedMultiplier,
  onSpeedChange,
  threat,
  currentTime,
  selectedPlants,
  plants,
  onHybrid,
  viewedPlant,
  lineageTree,
  lineageExpanded,
  onLineageToggle,
  latestMutation,
  lastChildGenes,
}: {
  speedMultiplier: number;
  onSpeedChange: (v: number) => void;
  threat: EnvironmentThreat | null;
  currentTime: number;
  selectedPlants: Plant[];
  plants: Plant[];
  onHybrid: () => void;
  viewedPlant: Plant | null;
  lineageTree: LineageNode[];
  lineageExpanded: boolean;
  onLineageToggle: () => void;
  latestMutation: MutationDeltas | null;
  lastChildGenes: Genes | null;
}) {
  const plantsMap = new Map(plants.map((p) => [p.id, p]));
  void React;
  void latestMutation;

  const editorGenes =
    viewedPlant?.genes ??
    selectedPlants[0]?.genes ??
    plants[plants.length - 1]?.genes ??
    { rootStrength: 80, stemToughness: 80, leafArea: 80, flowerColor: 128 };

  return (
    <div className="control-panel custom-scrollbar">
      <div className="section" style={{ border: 'none', background: 'transparent', padding: '16px 16px 4px 16px', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid #334155' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #065f46, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🌱
          </div>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>植物进化模拟器</div>
            <div style={{ color: '#64748b', fontSize: 12 }}>对抗环境威胁，培育终极植物</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 16px 16px 16px' }}>
        <SpeedSlider value={speedMultiplier} onChange={onSpeedChange} />
        <ThreatStatus threat={threat} currentTime={currentTime} />
        <SelectedPlantInfo plant={viewedPlant} />
        <GeneEditor genes={editorGenes} />
        <HybridPanel selected={selectedPlants} onHybrid={onHybrid} plants={plants} lastChildGenes={lastChildGenes} />
        <LineageTree
          nodes={lineageTree}
          expanded={lineageExpanded}
          onToggle={onLineageToggle}
          plantsMap={plantsMap}
        />
      </div>
    </div>
  );
}
