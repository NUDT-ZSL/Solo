import React, { useState, useRef, useEffect } from 'react';
import Toolbar from './editor/Toolbar';
import Sidebar from './editor/Sidebar';
import EditorCanvas from './editor/EditorCanvas';
import EditorState from './editor/EditorState';

const App: React.FC = () => {
  const editorStateRef = useRef<EditorState>(new EditorState());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubscribe = editorStateRef.current.subscribe(() => {
      forceUpdate(n => n + 1);
    });
    return unsubscribe;
  }, []);

  const handlePlay = () => {
    editorStateRef.current.setPlaying(true);
  };

  const handleStop = () => {
    editorStateRef.current.setPlaying(false);
  };

  const handleExport = () => {
    const data = editorStateRef.current.exportLevel();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'level.level';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const state = editorStateRef.current;

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
        isPlaying={state.isPlaying}
        onPlay={handlePlay}
        onStop={handleStop}
        onExport={handleExport}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!state.isPlaying && (
          <Sidebar
            editorState={state}
          />
        )}
        <EditorCanvas
          editorState={state}
        />
      </div>
    </div>
  );
};

export default App;
