import React, { useCallback, useRef } from 'react';
import { useGoStore } from './store';
import { Upload, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, GitBranch, Hash } from 'lucide-react';

const WinRateCurve: React.FC = React.memo(() => {
  const moves = useGoStore(s => s.moves);
  const currentMoveIndex = useGoStore(s => s.currentMoveIndex);
  const goToMove = useGoStore(s => s.goToMove);

  const width = 280;
  const height = 100;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const data = moves.map((m, i) => ({
    index: i,
    winRate: m.winRate,
    isKeyMoment: m.isKeyMoment,
  }));

  const xScale = (i: number) => {
    if (data.length <= 1) return padding.left + plotW / 2;
    return padding.left + (i / (data.length - 1)) * plotW;
  };
  const yScale = (wr: number) => padding.top + (1 - wr) * plotH;

  const linePath = data.length > 0
    ? data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.index).toFixed(1)},${yScale(d.winRate).toFixed(1)}`).join(' ')
    : '';

  const areaPath = data.length > 0
    ? `${linePath} L${xScale(data[data.length - 1].index).toFixed(1)},${yScale(0).toFixed(1)} L${xScale(0).toFixed(1)},${yScale(0).toFixed(1)} Z`
    : '';

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = (x - padding.left) / plotW;
    const idx = Math.round(ratio * (data.length - 1));
    if (idx >= 0 && idx < data.length) {
      goToMove(idx);
    }
  }, [data.length, goToMove]);

  return (
    <svg
      width={width}
      height={height}
      className="w-full"
      viewBox={`0 0 ${width} ${height}`}
      onClick={handleSvgClick}
      style={{ cursor: 'pointer' }}
    >
      <rect x={padding.left} y={padding.top} width={plotW} height={plotH} fill="rgba(245,230,200,0.3)" rx="2" />

      {[0, 0.25, 0.5, 0.75, 1].map(v => (
        <line
          key={v}
          x1={padding.left}
          y1={yScale(v)}
          x2={padding.left + plotW}
          y2={yScale(v)}
          stroke="rgba(60,50,40,0.15)"
          strokeDasharray="2,2"
        />
      ))}

      <text x={padding.left - 4} y={yScale(1) + 4} textAnchor="end" fontSize="8" fill="rgba(60,50,40,0.6)">100</text>
      <text x={padding.left - 4} y={yScale(0.5) + 3} textAnchor="end" fontSize="8" fill="rgba(60,50,40,0.6)">50</text>
      <text x={padding.left - 4} y={yScale(0) + 3} textAnchor="end" fontSize="8" fill="rgba(60,50,40,0.6)">0</text>

      {data.length > 0 && (
        <path d={areaPath} fill="rgba(30,30,30,0.08)" />
      )}

      {data.length > 1 && (
        <path d={linePath} fill="none" stroke="rgba(30,30,30,0.6)" strokeWidth="1.5" />
      )}

      {data.filter(d => d.isKeyMoment).map(d => (
        <circle
          key={d.index}
          cx={xScale(d.index)}
          cy={yScale(d.winRate)}
          r="3"
          fill="#C84032"
          stroke="rgba(200,64,50,0.4)"
          strokeWidth="1"
        />
      ))}

      {currentMoveIndex >= 0 && currentMoveIndex < data.length && (
        <>
          <line
            x1={xScale(currentMoveIndex)}
            y1={padding.top}
            x2={xScale(currentMoveIndex)}
            y2={padding.top + plotH}
            stroke="rgba(200,64,50,0.5)"
            strokeWidth="1"
            strokeDasharray="3,2"
          />
          <circle
            cx={xScale(currentMoveIndex)}
            cy={yScale(data[currentMoveIndex].winRate)}
            r="4"
            fill="#C84032"
            stroke="#fff"
            strokeWidth="1.5"
          />
        </>
      )}

      <text x={padding.left + plotW / 2} y={height - 2} textAnchor="middle" fontSize="8" fill="rgba(60,50,40,0.5)">黑方胜率 (%)</text>
    </svg>
  );
});

WinRateCurve.displayName = 'WinRateCurve';

const AnalysisPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadSgf = useGoStore(s => s.loadSgf);
  const goForward = useGoStore(s => s.goForward);
  const goBackward = useGoStore(s => s.goBackward);
  const goToStart = useGoStore(s => s.goToStart);
  const goToEnd = useGoStore(s => s.goToEnd);
  const switchBranch = useGoStore(s => s.switchBranch);
  const setManualMode = useGoStore(s => s.setManualMode);
  const toggleMoveNumbers = useGoStore(s => s.toggleMoveNumbers);
  const moves = useGoStore(s => s.moves);
  const currentMoveIndex = useGoStore(s => s.currentMoveIndex);
  const branches = useGoStore(s => s.branches);
  const currentBranchIndex = useGoStore(s => s.currentBranchIndex);
  const showMoveNumbers = useGoStore(s => s.showMoveNumbers);
  const isManualMode = useGoStore(s => s.isManualMode);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        loadSgf(content);
        setManualMode(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [loadSgf, setManualMode]);

  const handleLoadDemo = useCallback(() => {
    const demoSgf = `(;GM[1]FF[4]CA[UTF-8]SZ[19]
;B[pd];W[dp];B[pp];W[dd];B[qf];W[nc];B[pf];W[qc];B[rd];W[qi]
;B[pi];W[pj];B[oi];W[qh];B[ph];W[nq];B[lq];W[lp];B[mp];W[mo]
;B[np];W[op];B[oq];W[nr];B[or];W[pq];B[pr];W[qq];B[qr];W[rp]
;B[sr];W[sp];B[sq];W[rm];B[rn];W[qm];B[qn];W[pm];B[po];W[on]
;B[pl];W[ol];B[pk];W[ok];B[nj];W[nk];B[mj];W[mk];B[li];W[lj]
;B[kj];W[ki];B[kk];W[ji];B[jk];W[ii];B[ij];W[hi];B[hk];W[gi]
;B[il];W[gh];W[ch];B[cf];W[ef];B[ce];W[df];B[de];W[ed];B[cd]
;W[dc];B[cc];W[db];B[cb];W[eb];B[be];W[dg];B[fc];W[fb];B[ec]
;W[gb];B[fd];W[gd];B[fe];W[ge];B[ff];W[gf];B[fg];W[hh];B[hg]
;W[ig];B[hf];W[if];B[ie];W[id];B[he];W[hd];B[je];W[jd];B[ke]
;W[kd];B[lf];W[le];B[mf];W[me];B[nf];W[ne];B[of];W[oe];B[pe]
;W[od];B[oc];W[nd];B[ob];W[nb];B[oa];W[na];B[pa];W[qa];B[pb]
;W[ra];B[rb];W[sa];B[qb];W[rc];B[sc];W[sb];B[sd];W[sb];B[qd]
;W[pc];B[mb];W[mc];B[lb];W[kb];B[la];W[ka];B[lc];W[ld];B[kc]
;W[jc];B[jb];W[ib];B[kb];W[ka];B[ja];W[ia];B[kb];W[ha];B[lb]
;W[ma];B[na];W[md];B[nc];W[nd];B[oe];W[ne];B[nf];W[nb])`;
    loadSgf(demoSgf);
    setManualMode(false);
  }, [loadSgf, setManualMode]);

  return (
    <div className="analysis-panel">
      <h2 className="panel-title">墨迹棋谱</h2>

      <div className="panel-section">
        <h3 className="section-label">棋谱</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".sgf"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          className="panel-btn primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} />
          上传 SGF
        </button>
        <button
          className="panel-btn"
          onClick={handleLoadDemo}
        >
          示例棋局
        </button>
        <button
          className={`panel-btn ${isManualMode ? 'active' : ''}`}
          onClick={() => setManualMode(true)}
        >
          手动复盘
        </button>
      </div>

      <div className="panel-section">
        <h3 className="section-label">步数</h3>
        <div className="move-info">
          {currentMoveIndex >= 0 ? `第 ${currentMoveIndex + 1} 手` : '开局'} / 共 {moves.length} 手
        </div>
        <div className="controls-row">
          <button className="ctrl-btn" onClick={goToStart} title="回到开局">
            <ChevronsLeft size={18} />
          </button>
          <button className="ctrl-btn" onClick={goBackward} title="后退一手">
            <ChevronLeft size={18} />
          </button>
          <button className="ctrl-btn" onClick={goForward} title="前进一手">
            <ChevronRight size={18} />
          </button>
          <button className="ctrl-btn" onClick={goToEnd} title="到最后一手">
            <ChevronsRight size={18} />
          </button>
        </div>
      </div>

      {branches.length > 0 && (
        <div className="panel-section">
          <h3 className="section-label">
            <GitBranch size={14} />
            分支变化
          </h3>
          <div className="branch-list">
            {branches.map((branch, i) => (
              <button
                key={i}
                className={`branch-btn ${i === currentBranchIndex ? 'active' : ''}`}
                onClick={() => switchBranch(i)}
              >
                {branch.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel-section">
        <h3 className="section-label">
          <Hash size={14} />
          手数显示
        </h3>
        <button
          className={`panel-btn ${showMoveNumbers ? 'active' : ''}`}
          onClick={toggleMoveNumbers}
        >
          {showMoveNumbers ? '隐藏手数' : '显示手数'}
        </button>
      </div>

      <div className="panel-section">
        <h3 className="section-label">胜率曲线</h3>
        <WinRateCurve />
      </div>
    </div>
  );
};

export default AnalysisPanel;
