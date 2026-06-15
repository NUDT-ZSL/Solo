import React, { useEffect, useRef, useState, useCallback } from 'react';
import FormulaInput from './FormulaInput';
import { GraphEngine, detectExpressionType, type Expression, type Parameters, type ViewState, type FrameData } from '../core/GraphEngine';
import { historyManager, type HistoryItem } from '../core/HistoryManager';

const DEFAULT_VIEW: ViewState = {
  mode: '2d',
  rotationX: 0,
  rotationY: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  xRange: [-10, 10],
  yRange: [-10, 10],
  zRange: [-5, 5],
};

const DEFAULT_EXPRESSIONS: Expression[] = [
  {
    id: 'init_1',
    formula: 'a*sin(b*x)',
    type: detectExpressionType('a*sin(b*x)'),
    color: '#e94560',
    visible: true,
  },
];

const DEFAULT_PARAMS: Parameters = { a: 1, b: 1 };

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GraphEngine | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  const [expressions, setExpressions] = useState<Expression[]>(DEFAULT_EXPRESSIONS);
  const [parameters, setParameters] = useState<Parameters>(DEFAULT_PARAMS);
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saved, setSaved] = useState<HistoryItem[]>([]);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [narrowLayout, setNarrowLayout] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      const narrow = window.innerWidth < 1400;
      setNarrowLayout(narrow);
      if (narrow) {
        setLeftPanelOpen(false);
        setRightPanelOpen(false);
      } else {
        setLeftPanelOpen(true);
        setRightPanelOpen(true);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const canvasAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !canvasAreaRef.current) return;
    const engine = new GraphEngine(
      canvasAreaRef.current,
      canvasRef.current,
      { expressions, parameters, viewState },
      (v) => setViewState({ ...v })
    );
    engineRef.current = engine;
    canvasRef.current.style.cursor = 'grab';
    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.updateParameters(parameters);
  }, [parameters]);

  const handleSubmit = useCallback(() => {
    if (!engineRef.current) return;
    let vs = { ...viewState };
    const has3D = expressions.some((e) =>
      e.formula && (e.type === '3d-surface' || e.type === '3d-contour')
    );
    if (has3D && vs.mode === '2d') {
      vs = { ...vs, mode: '3d', rotationX: 30, rotationY: 45 };
    }
    const frame: FrameData = { expressions, parameters, viewState: vs };
    engineRef.current.setFrameData(frame, true);
    setViewState(vs);

    setTimeout(() => {
      const thumb = captureThumbnail();
      const item = historyManager.addHistory({
        name: expressions.map((e) => e.formula).filter(Boolean).join(' ; ') || '空图形',
        tags: [],
        expressions: JSON.parse(JSON.stringify(expressions)),
        parameters: { ...parameters },
        viewState: { ...engineRef.current?.getViewState() || vs },
        thumbnail: thumb,
      });
      refreshHistory();
      void item;
    }, 500);
  }, [expressions, parameters, viewState]);

  const captureThumbnail = (): string => {
    return engineRef.current?.captureThumbnail() || '';
  };

  const refreshHistory = () => {
    setHistory(historyManager.getHistory());
    setSaved(historyManager.getSaved());
  };

  useEffect(() => {
    refreshHistory();
    return historyManager.subscribe(refreshHistory);
  }, []);

  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 2800);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const applyHistoryItem = (item: HistoryItem) => {
    setExpressions(JSON.parse(JSON.stringify(item.expressions)));
    setParameters({ ...item.parameters });
    setViewState({ ...item.viewState });
    if (engineRef.current) {
      engineRef.current.setFrameData(
        {
          expressions: item.expressions,
          parameters: item.parameters,
          viewState: item.viewState,
        },
        true
      );
    }
    setToastMsg(`已加载: ${item.name}`);
  };

  const handleModeSwitch = (mode: '2d' | '3d') => {
    setViewState((v) => ({ ...v, mode }));
    engineRef.current?.setMode(mode);
  };

  const handleSave = async () => {
    const thumb = captureThumbnail();
    const item: HistoryItem = {
      id: `save_${Date.now()}`,
      name: saveName || '未命名图形',
      tags: saveTags.split(/[,，\s]+/).filter(Boolean),
      expressions: JSON.parse(JSON.stringify(expressions)),
      parameters: { ...parameters },
      viewState: { ...engineRef.current?.getViewState() || viewState },
      thumbnail: thumb,
      createdAt: Date.now(),
    };
    const res = await historyManager.saveToServer(item, item.name, item.tags);
    setShowSaveDialog(false);
    setSaveName('');
    setSaveTags('');
    refreshHistory();
    const url = await historyManager.generateShareLink(res.graph);
    setShareUrl(url);
    setToastMsg('保存成功！');
  };

  const handleShare = async () => {
    const thumb = captureThumbnail();
    const item: HistoryItem = {
      id: `share_${Date.now()}`,
      name: `分享 ${new Date().toLocaleString()}`,
      tags: [],
      expressions: JSON.parse(JSON.stringify(expressions)),
      parameters: { ...parameters },
      viewState: { ...engineRef.current?.getViewState() || viewState },
      thumbnail: thumb,
      createdAt: Date.now(),
    };
    const saved = await historyManager.saveToServer(item, item.name, []);
    const url = await historyManager.generateShareLink(saved.graph);
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setToastMsg('分享链接已复制到剪贴板！');
    } catch {
      setToastMsg('链接已生成，请手动复制');
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMsg('已复制！');
    } catch {
      setToastMsg('复制失败，请手动选择');
    }
  };

  return (
    <div ref={layoutRef} style={styles.root}>
      <div style={styles.topBar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📐</span>
          <span style={styles.logoText}>Math Visualizer</span>
          <span style={styles.logoSub}>数学函数图形生成器</span>
        </div>
        <div style={styles.toolbar}>
          <div style={styles.modeGroup}>
            <button
              onClick={() => handleModeSwitch('2d')}
              style={{
                ...styles.modeBtn,
                background: viewState.mode === '2d' ? '#e94560' : '#ffffff10',
              }}
            >
              <span>📊</span> 2D
            </button>
            <button
              onClick={() => handleModeSwitch('3d')}
              style={{
                ...styles.modeBtn,
                background: viewState.mode === '3d' ? '#e94560' : '#ffffff10',
              }}
            >
              <span>🧊</span> 3D
            </button>
          </div>
          <button title="保存图形" onClick={() => setShowSaveDialog(true)} style={styles.toolBtn} className="tool-btn">
            <span style={styles.toolIcon}>💾</span>
          </button>
          <button title="生成分享链接" onClick={handleShare} style={styles.toolBtn} className="tool-btn">
            <span style={styles.toolIcon}>🔗</span>
          </button>
          {narrowLayout && (
            <>
              <button onClick={() => setLeftPanelOpen(!leftPanelOpen)} style={styles.toolBtn} className="tool-btn">
                ƒ
              </button>
              <button onClick={() => setRightPanelOpen(!rightPanelOpen)} style={styles.toolBtn} className="tool-btn">
                🕒
              </button>
            </>
          )}
        </div>
      </div>

      <div style={styles.mainContent}>
        {(leftPanelOpen || !narrowLayout) && (
          <div
            style={{
              ...styles.leftPanel,
              position: narrowLayout ? 'absolute' : 'relative',
              left: narrowLayout ? (leftPanelOpen ? 12 : -360) : 0,
              top: 12,
              bottom: 12,
              zIndex: 5,
              transition: 'left 0.3s cubic-bezier(.4,0,.2,1)',
            }}
          >
            <FormulaInput
              expressions={expressions}
              parameters={parameters}
              onExpressionsChange={setExpressions}
              onParametersChange={setParameters}
              onSubmit={handleSubmit}
            />
          </div>
        )}

        <div style={styles.canvasArea} ref={canvasAreaRef}>
          <canvas ref={canvasRef} style={styles.canvas} />
          <div style={styles.canvasOverlay}>
            <div style={styles.hintBox}>
              {viewState.mode === '2d' ? (
                <>🖱 拖拽平移 · 滚轮缩放 · Shift+拖拽移动</>
              ) : (
                <>🖱 拖拽旋转 · 滚轮缩放 · Shift+拖拽平移</>
              )}
            </div>
            <div style={styles.viewInfo}>
              {viewState.mode === '3d' && (
                <>
                  θx: {viewState.rotationX.toFixed(0)}° θy:{' '}
                  {(viewState.rotationY % 360).toFixed(0)}° · 缩放:{' '}
                  {viewState.zoom.toFixed(2)}x
                </>
              )}
              {viewState.mode === '2d' && (
                <>
                  X: [{viewState.xRange[0].toFixed(1)}, {viewState.xRange[1].toFixed(1)}] · Y: [
                  {viewState.yRange[0].toFixed(1)}, {viewState.yRange[1].toFixed(1)}]
                </>
              )}
            </div>
          </div>
        </div>

        {(rightPanelOpen || !narrowLayout) && (
          <div
            style={{
              ...styles.rightPanel,
              position: narrowLayout ? 'absolute' : 'relative',
              right: narrowLayout ? (rightPanelOpen ? 12 : -300) : 0,
              top: 12,
              bottom: 12,
              zIndex: 5,
              transition: 'right 0.3s cubic-bezier(.4,0,.2,1)',
            }}
          >
            <HistoryPanel
              history={history}
              saved={saved}
              onApply={applyHistoryItem}
              onDelete={(id) => {
                historyManager.deleteHistory(id);
                refreshHistory();
              }}
              onDeleteSaved={(id) => {
                historyManager.deleteSaved(id);
                refreshHistory();
              }}
            />
          </div>
        )}
      </div>

      {showSaveDialog && (
        <div style={styles.modalBackdrop} onClick={() => setShowSaveDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>💾 保存图形配置</h3>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>名称</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="为这个图形起个名字..."
                style={styles.formInput}
                autoFocus
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>标签 (用逗号分隔)</label>
              <input
                type="text"
                value={saveTags}
                onChange={(e) => setSaveTags(e.target.value)}
                placeholder="如: 三角函数, 参数a, 教学"
                style={styles.formInput}
              />
            </div>
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{ ...styles.modalBtn, background: '#ffffff10' }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                style={{ ...styles.modalBtn, background: 'linear-gradient(135deg, #e94560, #ff6b8a)' }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {shareUrl && (
        <div style={styles.modalBackdrop} onClick={() => setShareUrl(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>🔗 分享链接</h3>
            <p style={{ color: '#ffffff80', marginBottom: 16, fontSize: 13 }}>
              将以下链接分享给其他人，他们可以打开并查看完全相同的图形配置。
            </p>
            <div style={styles.shareUrlBox}>
              <code style={styles.shareUrlText}>{shareUrl}</code>
              <button onClick={copyShareUrl} style={styles.copyBtn}>
                📋
              </button>
            </div>
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShareUrl(null)}
                style={{ ...styles.modalBtn, background: 'linear-gradient(135deg, #48dbfb, #6ee7f9)', flex: 1 }}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div style={styles.toast}>
          <span style={{ marginRight: 8 }}>✓</span>
          {toastMsg}
        </div>
      )}
    </div>
  );
};

const HistoryPanel: React.FC<{
  history: HistoryItem[];
  saved: HistoryItem[];
  onApply: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onDeleteSaved: (id: string) => void;
}> = ({ history, saved, onApply, onDelete, onDeleteSaved }) => {
  const [tab, setTab] = useState<'history' | 'saved'>('history');
  const items = tab === 'history' ? history : saved;

  return (
    <div style={hstyles.container}>
      <div style={hstyles.header}>
        <span style={hstyles.headerIcon}>🕒</span>
        <span style={hstyles.headerText}>历史记录</span>
      </div>

      <div style={hstyles.tabs}>
        <button
          onClick={() => setTab('history')}
          style={{
            ...hstyles.tab,
            color: tab === 'history' ? '#e94560' : '#ffffff80',
            borderBottom: tab === 'history' ? '2px solid #e94560' : '2px solid transparent',
          }}
        >
          临时 ({history.length})
        </button>
        <button
          onClick={() => setTab('saved')}
          style={{
            ...hstyles.tab,
            color: tab === 'saved' ? '#48dbfb' : '#ffffff80',
            borderBottom: tab === 'saved' ? '2px solid #48dbfb' : '2px solid transparent',
          }}
        >
          已保存 ({saved.length})
        </button>
      </div>

      <div style={hstyles.list}>
        {items.length === 0 ? (
          <div style={hstyles.empty}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ color: '#ffffff60', fontSize: 13 }}>
              {tab === 'history' ? '暂无历史记录，绘制图形后会自动保存' : '还没有保存的图形'}
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} style={hstyles.item} className="hist-item">
              <div
                style={hstyles.itemInner}
                onClick={() => onApply(item)}
              >
                <div style={hstyles.thumbWrap}>
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" style={hstyles.thumb} />
                  ) : (
                    <div style={{ ...hstyles.thumb, background: '#ffffff08', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      📊
                    </div>
                  )}
                </div>
                <div style={hstyles.itemInfo}>
                  <div style={hstyles.itemName} title={item.name}>
                    {item.name}
                  </div>
                  <div style={hstyles.itemTime}>
                    {new Date(item.createdAt).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {item.tags && item.tags.length > 0 && (
                      <div style={hstyles.tagList}>
                        {item.tags.slice(0, 2).map((t) => (
                          <span key={t} style={hstyles.tag}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  tab === 'history' ? onDelete(item.id) : onDeleteSaved(item.id);
                }}
                style={hstyles.deleteBtn}
                className="del-btn"
                title="删除"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const hstyles: Record<string, React.CSSProperties> = {
  container: {
    width: 280,
    height: '100%',
    background: '#1a1a2e',
    borderRadius: 8,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    color: '#fff',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottom: '1px solid #ffffff10',
  },
  headerIcon: { fontSize: 18 },
  headerText: { fontSize: 15, fontWeight: 600 },
  tabs: { display: 'flex', gap: 4, marginBottom: 4 },
  tab: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    padding: '8px 4px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingRight: 2,
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    textAlign: 'center',
  },
  item: {
    background: '#ffffff08',
    borderRadius: 8,
    padding: 8,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
  },
  itemInner: {
    display: 'flex',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  thumbWrap: { flexShrink: 0 },
  thumb: {
    width: 100,
    height: 80,
    borderRadius: 4,
    border: '1px solid #3a3a4e',
    objectFit: 'cover',
    display: 'block',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  itemName: {
    fontSize: 12,
    color: '#fff',
    lineHeight: 1.4,
    maxHeight: 34,
    overflow: 'hidden',
    wordBreak: 'break-all',
    fontFamily: 'Consolas, monospace',
  },
  itemTime: {
    fontSize: 11,
    color: '#ffffff50',
    marginTop: 'auto',
  },
  tagList: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    background: '#48dbfb20',
    color: '#48dbfb',
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 4,
    border: 'none',
    background: '#00000060',
    color: '#ffffff80',
    fontSize: 11,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.15s',
  },
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    height: '100vh',
    background: '#0d0d1a',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  topBar: {
    height: 56,
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0d0d1aee',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #ffffff08',
    zIndex: 10,
    flexShrink: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: { fontSize: 22 },
  logoText: {
    fontSize: 17,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e94560, #48dbfb)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  logoSub: {
    fontSize: 12,
    color: '#ffffff50',
    marginLeft: 4,
    paddingLeft: 10,
    borderLeft: '1px solid #ffffff15',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  modeGroup: {
    display: 'flex',
    background: '#ffffff08',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  modeBtn: {
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.15s',
  },
  toolBtn: {
    width: 32,
    height: 32,
    background: '#ffffff10',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    fontWeight: 700,
    padding: 0,
  },
  toolIcon: { fontSize: 16 },
  mainContent: {
    flex: 1,
    display: 'flex',
    gap: 12,
    padding: 12,
    minHeight: 0,
    position: 'relative',
  },
  leftPanel: {
    width: 340,
    flexShrink: 0,
    position: 'relative',
  },
  canvasArea: {
    flex: 1,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 100%)',
    boxShadow: 'inset 0 0 60px #00000060',
    minWidth: 0,
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  canvasOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: '12px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    pointerEvents: 'none',
  },
  hintBox: {
    fontSize: 12,
    color: '#ffffff50',
    background: '#00000040',
    backdropFilter: 'blur(6px)',
    padding: '6px 12px',
    borderRadius: 6,
  },
  viewInfo: {
    fontSize: 12,
    fontFamily: 'Consolas, monospace',
    color: '#48dbfb',
    background: '#00000040',
    backdropFilter: 'blur(6px)',
    padding: '6px 12px',
    borderRadius: 6,
  },
  rightPanel: {
    width: 280,
    flexShrink: 0,
    position: 'relative',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: '#00000090',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.2s',
  },
  modal: {
    width: 440,
    maxWidth: '90%',
    background: '#1e1e2e',
    border: '1px solid #ffffff15',
    borderRadius: 14,
    padding: 24,
    boxShadow: '0 20px 60px #00000080',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 18,
    color: '#fff',
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    display: 'block',
    fontSize: 12,
    color: '#ffffff70',
    marginBottom: 6,
    fontWeight: 600,
  },
  formInput: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#0d0d1a',
    border: '1px solid #ffffff15',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  },
  modalButtons: {
    display: 'flex',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.15s',
  },
  shareUrlBox: {
    display: 'flex',
    background: '#0d0d1a',
    border: '1px solid #ffffff15',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  shareUrlText: {
    flex: 1,
    padding: '10px 12px',
    color: '#48dbfb',
    fontSize: 13,
    wordBreak: 'break-all',
    userSelect: 'all',
  },
  copyBtn: {
    width: 40,
    border: 'none',
    borderRadius: 6,
    background: '#ffffff10',
    cursor: 'pointer',
    fontSize: 16,
  },
  toast: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #1dd1a1, #10ac84)',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    boxShadow: '0 8px 24px #1dd1a140',
    zIndex: 200,
    animation: 'toastIn 0.3s cubic-bezier(.34,1.56,.64,1)',
  },
};

export default App;
