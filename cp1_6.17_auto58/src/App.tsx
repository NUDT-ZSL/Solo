import { useState, useRef, useMemo, useCallback } from 'react';
import { useMoodBoardStore } from './store/useMoodBoardStore';
import { buildElementMap, getElementById } from './data/elements';
import { calculateScore } from './core/scoreEngine';
import { exportToPNG, exportToJSON } from './core/exportHandler';
import { ElementPanel } from './components/ElementPanel';
import { MoodBoard, type MoodBoardHandle } from './components/MoodBoard';
import { ScoreDisplay } from './components/ScoreDisplay';
import { SavedBoardsList } from './components/SavedBoardsList';
import './App.css';

type LeftPanelMode = 'elements' | 'saved';

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
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('elements');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [thumbnail, setThumbnail] = useState<string>('');

  const elementMap = useMemo(() => buildElementMap(), []);

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

  return (
    <div className="app-container">
      <div className="left-panel">
        <div className="panel-tabs">
          <button
            className={`panel-tab ${leftPanelMode === 'elements' ? 'active' : ''}`}
            onClick={() => setLeftPanelMode('elements')}
          >
            元素库
          </button>
          <button
            className={`panel-tab ${leftPanelMode === 'saved' ? 'active' : ''}`}
            onClick={() => setLeftPanelMode('saved')}
          >
            已保存
          </button>
        </div>
        <div className="panel-content">
          {leftPanelMode === 'elements' ? (
            <ElementPanel />
          ) : (
            <SavedBoardsList />
          )}
        </div>
      </div>

      <div className="main-area">
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

export default App;
