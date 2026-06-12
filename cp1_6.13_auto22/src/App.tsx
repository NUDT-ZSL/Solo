import React, { useState, useEffect, useCallback } from 'react';
import EditorCanvas from './EditorCanvas';
import PreviewRunner from './PreviewRunner';
import Panel from './components/Panel';
import LevelList from './components/LevelList';
import { saveLevel, loadLevel } from './api';
import type { LevelElement, ElementType } from './types';

const App: React.FC = () => {
  const [elements, setElements] = useState<LevelElement[]>([]);
  const [levelName, setLevelName] = useState('未命名关卡');
  const [currentLevelId, setCurrentLevelId] = useState<string | undefined>();
  const [isPreviewRunning, setIsPreviewRunning] = useState(false);
  const [levelListRefresh, setLevelListRefresh] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<ElementType | null>(null);

  const isNarrow = windowWidth < 1400;
  const canvasScale = isNarrow ? 0.6 : 1;
  const previewWidth = isNarrow ? 300 : 400;
  const panelWidth = isNarrow ? 180 : 240;
  const listWidth = isNarrow ? 180 : 240;

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNewLevel = useCallback(() => {
    if (elements.length > 0 && !confirm('确定要新建关卡吗？当前未保存的更改将丢失。')) {
      return;
    }
    setElements([]);
    setLevelName('未命名关卡');
    setCurrentLevelId(undefined);
    setIsPreviewRunning(false);
    setSaveMessage(null);
  }, [elements]);

  const handleSaveLevel = useCallback(async () => {
    if (!levelName.trim()) {
      setSaveMessage('请输入关卡名称');
      setTimeout(() => setSaveMessage(null), 2000);
      return;
    }
    try {
      const result = await saveLevel(levelName.trim(), elements, currentLevelId);
      setCurrentLevelId(result._id);
      setLevelListRefresh(prev => prev + 1);
      setSaveMessage('保存成功！');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : '保存失败');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [levelName, elements, currentLevelId]);

  const handleLoadLevel = useCallback(async (id: string) => {
    try {
      const data = await loadLevel(id);
      setElements(data.elements);
      setLevelName(data.name);
      setCurrentLevelId(id);
      setIsPreviewRunning(false);
      setSaveMessage(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '加载失败');
    }
  }, []);

  const handleDragStart = useCallback((type: ElementType) => {
    setDraggingType(type);
    setIsPreviewRunning(false);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingType(null);
  }, []);

  const handleTogglePreview = useCallback(() => {
    setIsPreviewRunning(prev => !prev);
  }, []);

  const handleStopPreview = useCallback(() => {
    setIsPreviewRunning(false);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a1e',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 56,
          background: '#16161a',
          borderBottom: '1px solid #2e2e32',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginRight: 20,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#3b82f6">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
          </svg>
          <h1
            style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            2D 横版关卡编辑器
          </h1>
        </div>

        <button
          onClick={handleNewLevel}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          新建关卡
        </button>

        <button
          onClick={handleSaveLevel}
          style={{
            padding: '8px 16px',
            background: '#22c55e',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          保存关卡
        </button>

        <button
          onClick={handleTogglePreview}
          style={{
            padding: '8px 16px',
            background: isPreviewRunning ? '#ef4444' : '#8b5cf6',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.1s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isPreviewRunning ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              停止预览
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="8,5 19,12 8,19" />
              </svg>
              开始预览
            </>
          )}
        </button>

        <div style={{ flex: 1 }} />

        {saveMessage && (
          <span
            style={{
              color: saveMessage.includes('成功') ? '#22c55e' : '#ef4444',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {saveMessage}
          </span>
        )}

        <input
          type="text"
          value={levelName}
          onChange={(e) => setLevelName(e.target.value)}
          placeholder="关卡名称"
          style={{
            width: 200,
            padding: '8px 12px',
            background: '#1a1a1e',
            color: '#ffffff',
            border: '2px solid #3b82f6',
            borderRadius: 8,
            fontSize: 13,
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#60a5fa';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
          }}
        />

        <span
          style={{
            color: '#6b7280',
            fontSize: 12,
          }}
        >
          元素: {elements.length}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: panelWidth,
            flexShrink: 0,
            borderRight: '1px solid #2e2e32',
            transition: 'width 0.3s ease',
          }}
        >
          <Panel onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflow: 'auto',
            background: '#16161a',
          }}
        >
          <EditorCanvas
            elements={elements}
            onElementsChange={setElements}
            scale={canvasScale}
            draggingType={draggingType}
            onDragEnd={handleDragEnd}
          />
        </div>

        <div
          style={{
            width: listWidth,
            flexShrink: 0,
            transition: 'width 0.3s ease',
          }}
        >
          <LevelList
            onLoadLevel={handleLoadLevel}
            currentLevelId={currentLevelId}
            refreshTrigger={levelListRefresh}
          />
        </div>

        <PreviewRunner
          elements={elements}
          isRunning={isPreviewRunning}
          onStop={handleStopPreview}
          width={previewWidth}
        />
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #1a1a1e;
        }
        ::-webkit-scrollbar-thumb {
          background: #3a3a3e;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #4a4a4e;
        }
      `}</style>
    </div>
  );
};

export default App;
