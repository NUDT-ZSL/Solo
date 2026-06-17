import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useMoodBoardStore } from './store/useMoodBoardStore';
import { buildElementMap, getElementById } from './data/elements';
import { calculateScore } from './core/scoreEngine';
import { exportToPNG, exportToJSON } from './core/exportHandler';
import { ElementPanel } from './components/ElementPanel';
import { MoodBoard, type MoodBoardHandle } from './components/MoodBoard';
import { ScoreDisplay } from './components/ScoreDisplay';
import { SavedBoardsList } from './components/SavedBoardsList';
import './App.css';

type LeftPanelTab = 'elements' | 'saved';

function App() {
  const {
    elements,
    saveBoard,
    currentBoardName,
    currentBoardTags,
    setCurrentBoardName,
    setCurrentBoardTags,
    clearBoard,
  } = useMoodBoardStore();

  const moodBoardRef = useRef<MoodBoardHandle>(null);
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('elements');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [thumbnail, setThumbnail] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  const elementMap = useMemo(() => buildElementMap(), []);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const score = useMemo(() => {
    return calculateScore(elements, elementMap, 800, 600);
  }, [elements, elementMap]);

  const handleThumbnailReady = useCallback((thumb: string) => {
    setThumbnail(thumb);
  }, []);

  const getPrimaryColor = useCallback(() => {
    for (const el of elements) {
      const item = getElementById(el.elementId);
      if (item?.category === 'primaryColor') {
        return item.value;
      }
    }
    return '#FFFFFF';
  }, [elements]);

  const handleSave = () => {
    setSaveName(currentBoardName);
    setSaveTags(currentBoardTags.join(', '));
    setShowSaveModal(true);
  };

  const confirmSave = () => {
    const tags = saveTags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    setCurrentBoardTags(tags);
    setCurrentBoardName(saveName || '未命名');
    saveBoard(saveName || '未命名', tags, thumbnail);
    setShowSaveModal(false);
  };

  const handleExport = async () => {
    const canvas = moodBoardRef.current?.getCanvasElement();
    if (!canvas) {
      alert('导出失败：无法获取画布');
      return;
    }

    const boardName = currentBoardName || '审美积木';
    const primaryColor = getPrimaryColor();

    try {
      await exportToPNG(canvas, primaryColor, boardName);
    } catch (e) {
      console.error('导出PNG失败', e);
      alert('导出PNG失败');
    }

    exportToJSON({
      id: Date.now().toString(),
      name: boardName,
      tags: currentBoardTags,
      elements,
    });
  };

  const handleClear = () => {
    if (elements.length === 0 || confirm('确定要清空画布吗？')) {
      clearBoard();
    }
  };

  const handleLoadBoard = () => {
    // 加载后可以切换到元素库继续编辑
  };

  if (isMobile) {
    return (
      <div className="app-container mobile">
        <div className="mobile-top-bar">
          <div className="mobile-tabs">
            <button
              className={`mobile-tab ${leftPanelTab === 'elements' ? 'active' : ''}`}
              onClick={() => setLeftPanelTab('elements')}
            >
              🎨 元素库
            </button>
            <button
              className={`mobile-tab ${leftPanelTab === 'saved' ? 'active' : ''}`}
              onClick={() => setLeftPanelTab('saved')}
            >
              📋 已保存
            </button>
          </div>
          <div className="mobile-score-mini">
            <span className="mini-score-value" style={{
              color: score.total >= 60 ? '#43A047' : score.total >= 30 ? '#FF8F00' : '#E53935'
            }}>
              {score.total}分
            </span>
          </div>
        </div>

        {leftPanelTab === 'elements' && (
          <div className="mobile-element-panel">
            <ElementPanel />
          </div>
        )}

        {leftPanelTab === 'saved' && (
          <div className="mobile-saved-panel">
            <SavedBoardsList onLoadBoard={handleLoadBoard} />
          </div>
        )}

        <div className="mobile-main-area">
          <div className="mobile-board-header">
            <input
              type="text"
              className="mobile-title-input"
              placeholder="未命名情绪板"
              value={currentBoardName}
              onChange={(e) => setCurrentBoardName(e.target.value)}
            />
            <div className="mobile-actions">
              <button className="mobile-action-btn" onClick={handleClear} title="清空">
                🗑️
              </button>
              <button className="mobile-action-btn primary" onClick={handleSave} title="保存">
                💾
              </button>
              <button className="mobile-action-btn primary" onClick={handleExport} title="导出">
                📤
              </button>
            </div>
          </div>

          <div className="mobile-canvas-wrapper">
            <MoodBoard ref={moodBoardRef} onThumbnailReady={handleThumbnailReady} />
          </div>
        </div>

        {showSaveModal && (
          <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>保存情绪板</h3>
              <div className="form-group">
                <label>名称</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="给你的情绪板起个名字"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  placeholder="例如：简约, 科技感, 商务"
                />
              </div>
              <div className="modal-actions">
                <button
                  className="modal-btn secondary"
                  onClick={() => setShowSaveModal(false)}
                >
                  取消
                </button>
                <button className="modal-btn primary" onClick={confirmSave}>
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container desktop">
      <aside className="left-panel">
        <div className="panel-tabs">
          <button
            className={`panel-tab ${leftPanelTab === 'elements' ? 'active' : ''}`}
            onClick={() => setLeftPanelTab('elements')}
          >
            <span className="tab-icon">🎨</span>
            元素库
          </button>
          <button
            className={`panel-tab ${leftPanelTab === 'saved' ? 'active' : ''}`}
            onClick={() => setLeftPanelTab('saved')}
          >
            <span className="tab-icon">📋</span>
            已保存
          </button>
        </div>

        <div className="panel-content">
          {leftPanelTab === 'elements' ? (
            <ElementPanel />
          ) : (
            <SavedBoardsList onLoadBoard={handleLoadBoard} />
          )}
        </div>
      </aside>

      <main className="main-area">
        <div className="top-bar">
          <div className="board-title">
            <input
              type="text"
              className="title-input"
              placeholder="未命名情绪板"
              value={currentBoardName}
              onChange={(e) => setCurrentBoardName(e.target.value)}
            />
          </div>
          <div className="top-actions">
            <button className="action-btn secondary" onClick={handleClear}>
              <span className="btn-icon">🗑️</span>
              <span>清空</span>
            </button>
            <button className="action-btn primary" onClick={handleSave}>
              <span className="btn-icon">💾</span>
              <span>保存</span>
            </button>
            <button className="action-btn primary" onClick={handleExport}>
              <span className="btn-icon">📤</span>
              <span>导出</span>
            </button>
          </div>
        </div>

        <div className="canvas-wrapper">
          <div className="score-overlay">
            <ScoreDisplay score={score} />
          </div>
          <MoodBoard ref={moodBoardRef} onThumbnailReady={handleThumbnailReady} />
        </div>
      </main>

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>保存情绪板</h3>
            <div className="form-group">
              <label>名称</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="给你的情绪板起个名字"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>标签（用逗号分隔）</label>
              <input
                type="text"
                value={saveTags}
                onChange={(e) => setSaveTags(e.target.value)}
                placeholder="例如：简约, 科技感, 商务"
              />
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn secondary"
                onClick={() => setShowSaveModal(false)}
              >
                取消
              </button>
              <button className="modal-btn primary" onClick={confirmSave}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
