import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from './store';
import type { Batch, CurvePoint, Markers, TastingRecord, FlavorLabel } from './types';

const CANVAS_W = 800;
const CANVAS_H = 400;
const MAX_TIME = 15;
const MIN_TEMP = 100;
const MAX_TEMP = 240;
const PAD_L = 50;
const PAD_B = 30;
const PAD_T = 10;
const PAD_R = 10;
const PLOT_W = CANVAS_W - PAD_L - PAD_R;
const PLOT_H = CANVAS_H - PAD_T - PAD_B;

const KEYWORD_PRESETS = [
  '花香', '柑橘', '焦糖', '巧克力', '坚果', '莓果', '热带水果',
  '茶香', '蜂蜜', '香料', '草本', '酒香', '黑糖', '奶油', '烟熏',
];

const SLIDER_COLORS: Record<string, string> = {
  dryAroma: '#8BC34A',
  wetAroma: '#4CAF50',
  acidity: '#FFEB3B',
  body: '#FF9800',
  aftertaste: '#F44336',
};

const SLIDER_LABELS: Record<string, string> = {
  dryAroma: '干香',
  wetAroma: '湿香',
  acidity: '酸质',
  body: '醇厚度',
  aftertaste: '余韵',
};

function tempToY(temp: number): number {
  return PAD_T + PLOT_H * (1 - (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP));
}

function timeToX(time: number): number {
  return PAD_L + PLOT_W * (time / MAX_TIME);
}

function xToTime(x: number): number {
  return Math.max(0, Math.min(MAX_TIME, ((x - PAD_L) / PLOT_W) * MAX_TIME));
}

function generateCurve(markers: Markers): CurvePoint[] {
  const pts: CurvePoint[] = [];
  const tp = markers.turningPoint;
  const fc = markers.firstCrack;
  const sc = markers.secondCrack;

  const steps = 300;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * MAX_TIME;
    let temp: number;

    if (t <= tp) {
      temp = 150 - 40 * (t / Math.max(tp, 0.1));
      temp = Math.max(temp, MIN_TEMP);
    } else if (t <= fc) {
      const frac = (t - tp) / Math.max(fc - tp, 0.1);
      temp = 150 + 60 * Math.pow(frac, 0.7);
    } else if (t <= sc) {
      const frac = (t - fc) / Math.max(sc - fc, 0.1);
      temp = 210 + 20 * Math.pow(frac, 0.5);
    } else {
      const frac = (t - sc) / Math.max(MAX_TIME - sc, 0.1);
      temp = 230 + 8 * frac;
    }

    pts.push({ time: parseFloat(t.toFixed(2)), temp: parseFloat(Math.min(temp, MAX_TEMP).toFixed(1)) });
  }
  return pts;
}

interface RoastPageProps {
  batch: Batch;
}

export function RoastPage({ batch }: RoastPageProps) {
  const { addRoast, addTasting, addLabel, toggleCollect, state } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const [markers, setMarkers] = useState<Markers>({
    turningPoint: 1.5,
    firstCrack: 8,
    secondCrack: 12,
  });

  const [dragging, setDragging] = useState<'turningPoint' | 'firstCrack' | 'secondCrack' | null>(null);
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>(() => generateCurve(markers));
  const [currentTime, setCurrentTime] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(150);
  const [roastSaved, setRoastSaved] = useState(false);
  const [savedRoastId, setSavedRoastId] = useState<string | null>(null);

  const [tasting, setTasting] = useState({
    dryAroma: 5,
    wetAroma: 5,
    acidity: 5,
    body: 5,
    aftertaste: 5,
    flavorNotes: '',
  });

  const [totalScore, setTotalScore] = useState(25);
  const [showScoreAnim, setShowScoreAnim] = useState(false);
  const [tastingSubmitted, setTastingSubmitted] = useState(false);
  const [savedTastingId, setSavedTastingId] = useState<string | null>(null);

  const [coffeeName, setCoffeeName] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [generatedLabel, setGeneratedLabel] = useState<FlavorLabel | null>(null);

  useEffect(() => {
    const pts = generateCurve(markers);
    setCurvePoints(pts);
  }, [markers]);

  useEffect(() => {
    const total = tasting.dryAroma + tasting.wetAroma + tasting.acidity + tasting.body + tasting.aftertaste;
    setTotalScore(total);
    setShowScoreAnim(true);
    const timer = setTimeout(() => setShowScoreAnim(false), 400);
    return () => clearTimeout(timer);
  }, [tasting.dryAroma, tasting.wetAroma, tasting.acidity, tasting.body, tasting.aftertaste]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = 'rgba(44,62,80,0.3)';
    ctx.lineWidth = 1;
    for (let x = PAD_L; x <= CANVAS_W - PAD_R; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, PAD_T);
      ctx.lineTo(x, CANVAS_H - PAD_B);
      ctx.stroke();
    }
    for (let y = PAD_T; y <= CANVAS_H - PAD_B; y += 10) {
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(CANVAS_W - PAD_R, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#7f8c8d';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let t = 0; t <= MAX_TIME; t += 3) {
      const x = timeToX(t);
      ctx.fillText(`${t}m`, x, CANVAS_H - PAD_B + 16);
    }
    ctx.textAlign = 'right';
    for (let temp = MIN_TEMP; temp <= MAX_TEMP; temp += 20) {
      const y = tempToY(temp);
      ctx.fillText(`${temp}°`, PAD_L - 6, y + 4);
    }

    if (curvePoints.length < 2) return;

    const tp = markers.turningPoint;
    const fc = markers.firstCrack;
    const sc = markers.secondCrack;

    const segments = [
      { end: tp, color: '#2196F3' },
      { end: fc, color: '#FF9800' },
      { end: sc, color: '#F44336' },
      { end: MAX_TIME, color: '#F44336' },
    ];

    let startIdx = 0;
    for (const seg of segments) {
      const endIdx = curvePoints.findIndex(p => p.time >= seg.end);
      const segEnd = endIdx === -1 ? curvePoints.length : endIdx + 1;

      ctx.beginPath();
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      for (let i = startIdx; i < segEnd && i < curvePoints.length; i++) {
        const p = curvePoints[i];
        const x = timeToX(p.time);
        const y = tempToY(p.temp);
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      startIdx = Math.max(startIdx, segEnd - 1);
    }

    const markerData = [
      { time: tp, label: '回温点', color: '#2196F3' },
      { time: fc, label: '一爆', color: '#FF9800' },
      { time: sc, label: '二爆', color: '#F44336' },
    ];

    for (const m of markerData) {
      const x = timeToX(m.time);
      const pt = curvePoints.reduce((prev, curr) =>
        Math.abs(curr.time - m.time) < Math.abs(prev.time - m.time) ? curr : prev
      );
      const y = tempToY(pt.temp);

      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = m.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, x, y - 14);
    }

    if (currentTime > 0) {
      const x = timeToX(currentTime);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, PAD_T);
      ctx.lineTo(x, CANVAS_H - PAD_B);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [curvePoints, markers, currentTime]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame++;
      if (frame % 2 === 0) {
        setCurrentTime(prev => {
          const next = prev + 0.05;
          if (next > MAX_TIME) return 0;
          return next;
        });
      }
      const pt = curvePoints.reduce((prev, curr) =>
        Math.abs(curr.time - currentTime) < Math.abs(prev.time - currentTime) ? curr : prev
      );
      setCurrentTemp(pt.temp);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [curvePoints, currentTime]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;

    const markerPositions = [
      { key: 'turningPoint' as const, time: markers.turningPoint },
      { key: 'firstCrack' as const, time: markers.firstCrack },
      { key: 'secondCrack' as const, time: markers.secondCrack },
    ];

    for (const mp of markerPositions) {
      const px = timeToX(mp.time);
      if (Math.abs(mx - px) < 20) {
        setDragging(mp.key);
        return;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const newTime = parseFloat(xToTime(mx).toFixed(2));

    setMarkers(prev => {
      const updated = { ...prev, [dragging]: newTime };
      if (updated.turningPoint >= updated.firstCrack) updated.turningPoint = updated.firstCrack - 0.5;
      if (updated.firstCrack >= updated.secondCrack) updated.firstCrack = updated.secondCrack - 0.5;
      if (updated.turningPoint < 0.2) updated.turningPoint = 0.2;
      return updated;
    });
  };

  const handleCanvasMouseUp = () => {
    setDragging(null);
  };

  const rate = (() => {
    const idx = curvePoints.findIndex(p => p.time >= currentTime);
    if (idx < 1) return 0;
    const prev = curvePoints[idx - 1];
    const curr = curvePoints[idx];
    const dt = curr.time - prev.time;
    return dt > 0 ? parseFloat(((curr.temp - prev.temp) / dt * 1).toFixed(1)) : 0;
  })();

  const handleSaveRoast = async () => {
    const roast = {
      batchId: batch.id,
      points: curvePoints,
      markers,
      savedAt: new Date().toISOString(),
    };
    await addRoast(roast);
    setRoastSaved(true);
  };

  const handleSliderChange = (key: string, value: number) => {
    setTasting(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmitTasting = async () => {
    const record = {
      roastId: savedRoastId || batch.id,
      dryAroma: tasting.dryAroma,
      wetAroma: tasting.wetAroma,
      acidity: tasting.acidity,
      body: tasting.body,
      aftertaste: tasting.aftertaste,
      flavorNotes: tasting.flavorNotes,
    };
    const result = await addTasting(record as Omit<TastingRecord, 'id' | 'createdAt'>);
    setSavedTastingId(result.payload?.id || 'temp-id');
    setTastingSubmitted(true);
  };

  const handleToggleKeyword = (kw: string) => {
    setSelectedKeywords(prev => {
      if (prev.includes(kw)) return prev.filter(k => k !== kw);
      if (prev.length >= 3) return prev;
      return [...prev, kw];
    });
  };

  const handleGenerateLabel = async () => {
    const label: Omit<FlavorLabel, 'id' | 'createdAt'> = {
      roastId: savedRoastId || batch.id,
      tastingId: savedTastingId || '',
      coffeeName: coffeeName || batch.origin,
      keywords: selectedKeywords,
      overallScore: totalScore / 5,
      isCollected: false,
    };
    await addLabel(label);
    const created = state.labels[state.labels.length - 1];
    setGeneratedLabel(created || { ...label, id: 'local', createdAt: new Date().toISOString() });
  };

  const handleCollect = () => {
    if (generatedLabel) {
      toggleCollect(generatedLabel.id);
    }
  };

  const [toastVisible, setToastVisible] = useState(false);
  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`https://roasttracker.app/label/${generatedLabel?.id || 'demo'}`);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 300);
  };

  const starScore = Math.round(generatedLabel ? generatedLabel.overallScore : totalScore / 5);

  return (
    <div className="roast-page">
      <h2 className="roast-title">烘焙记录 — {batch.origin} / {batch.farm}</h2>

      <div className="roast-curve-section">
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="roast-canvas"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
          <p className="canvas-hint">拖拽标记点调整曲线</p>
        </div>
        <div className="roast-controls">
          <div className="control-item">
            <span className="control-label">当前时间</span>
            <span className="control-value">{currentTime.toFixed(1)} min</span>
          </div>
          <div className="control-item">
            <span className="control-label">当前温度</span>
            <span className="control-value">{currentTemp.toFixed(1)} °C</span>
          </div>
          <div className="control-item">
            <span className="control-label">升温速率</span>
            <span className="control-value">{rate} °C/min</span>
          </div>
          <div className="marker-info">
            <p>回温点：{markers.turningPoint.toFixed(1)} min</p>
            <p>一爆：{markers.firstCrack.toFixed(1)} min</p>
            <p>二爆：{markers.secondCrack.toFixed(1)} min</p>
          </div>
          <button className="btn-primary" onClick={handleSaveRoast} disabled={roastSaved}>
            {roastSaved ? '✓ 曲线已保存' : '保存曲线'}
          </button>
        </div>
      </div>

      <div className="cupping-section">
        <h3>杯测记录</h3>
        <div className="cupping-sliders">
          {Object.entries(SLIDER_LABELS).map(([key, label]) => (
            <div key={key} className="slider-row">
              <span className="slider-label">{label}</span>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={tasting[key as keyof typeof tasting] as number}
                onChange={e => handleSliderChange(key, parseFloat(e.target.value))}
                className="cupping-slider"
                style={{
                  background: `linear-gradient(to right, #9E9E9E, ${SLIDER_COLORS[key]})`,
                } as React.CSSProperties}
              />
              <span className="slider-value">{(tasting[key as keyof typeof tasting] as number).toFixed(1)}</span>
            </div>
          ))}
          <div className={`total-score ${showScoreAnim ? 'score-animate' : ''}`}>
            总分：{totalScore.toFixed(1)} / 50
          </div>
        </div>
        <textarea
          className="flavor-textarea"
          placeholder="描述风味特征（如：花香明显，带有柑橘酸质，焦糖甜感...）"
          value={tasting.flavorNotes}
          onChange={e => setTasting(prev => ({ ...prev, flavorNotes: e.target.value }))}
        />
        <button className="btn-primary" onClick={handleSubmitTasting} disabled={tastingSubmitted}>
          {tastingSubmitted ? '✓ 杯测已提交' : '提交杯测'}
        </button>
      </div>

      {tastingSubmitted && (
        <div className="label-section">
          <h3>风味标签生成</h3>
          <div className="label-form">
            <input
              className="label-name-input"
              placeholder="为这批咖啡命名"
              value={coffeeName}
              onChange={e => setCoffeeName(e.target.value)}
            />
            <div className="keyword-picker">
              {KEYWORD_PRESETS.map(kw => (
                <button
                  key={kw}
                  className={`keyword-btn ${selectedKeywords.includes(kw) ? 'keyword-selected' : ''}`}
                  onClick={() => handleToggleKeyword(kw)}
                  disabled={!selectedKeywords.includes(kw) && selectedKeywords.length >= 3}
                >
                  {kw}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={handleGenerateLabel} disabled={selectedKeywords.length === 0}>
              生成风味标签
            </button>
          </div>

          {generatedLabel && (
            <div className="flavor-badge-container">
              <div className="flavor-badge" style={{
                background: generatedLabel.acidity > 7
                  ? 'linear-gradient(135deg, #FFEB3B, #FF9800)'
                  : generatedLabel.body > 7
                  ? 'linear-gradient(135deg, #FF9800, #F44336)'
                  : 'linear-gradient(135deg, #8BC34A, #4CAF50)',
              }}>
                <div className="badge-glow" />
                <span className="badge-name">{generatedLabel.coffeeName}</span>
                <div className="badge-keywords">
                  {generatedLabel.keywords.map(kw => (
                    <span key={kw} className="badge-keyword">{kw}</span>
                  ))}
                </div>
                <div className="badge-stars">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span key={i} className={i < starScore ? 'star-filled' : 'star-empty'}>★</span>
                  ))}
                </div>
              </div>
              <div className="badge-actions">
                <button className="btn-secondary" onClick={handleCollect}>
                  {generatedLabel.isCollected ? '❤ 已收藏' : '🤍 收藏'}
                </button>
                <button className="btn-secondary" onClick={handleCopyLink}>复制分享链接</button>
              </div>
              {toastVisible && <div className="toast">链接已复制</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
