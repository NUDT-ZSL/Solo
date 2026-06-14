import React, { useState, useCallback, useRef } from 'react';
import Toolbar from './editor/Toolbar';
import Sidebar from './editor/Sidebar';
import EditorCanvas from './editor/EditorCanvas';
import EditorState from './editor/EditorState';

export type ToolMode = 'select' | 'platform' | 'spike' | 'goal';

const App: React.FC = () => {
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const editorStateRef = useRef<EditorState>(new EditorState());
  const [, forceUpdate] = useState(0);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setShowWin(false);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setShowWin(false);
  }, []);

  const handleWin = useCallback(() => {
    setShowWin(true);
  }, []);

  const handleExport = useCallback(() => {
    const data = editorStateRef.current.exportJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'level.level';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0d1117',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minWidth: '1280px',
    }}>
      <Toolbar
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onStop={handleStop}
        onExport={handleExport}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!isPlaying && (
          <Sidebar
            toolMode={toolMode}
            onToolChange={setToolMode}
          />
        )}
        <EditorCanvas
          editorState={editorStateRef.current}
          toolMode={toolMode}
          isPlaying={isPlaying}
          onWin={handleWin}
          onForceUpdate={() => forceUpdate(n => n + 1)}
        />
      </div>
      {showWin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#2ecc71',
            color: '#ffffff',
            padding: '32px 64px',
            borderRadius: '12px',
            fontSize: '28px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}>
            通关！
            <div style={{ fontSize: '14px', marginTop: '12px', fontWeight: 'normal', opacity: 0.8 }}>
              按 Esc 退出预览
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
