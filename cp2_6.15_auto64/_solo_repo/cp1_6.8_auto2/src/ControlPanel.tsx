import React, { useCallback, useRef, useEffect, useState } from 'react';
import { FrameEditor, FrameData } from './FrameEditor';
import { AnimationPlayer, TransitionMode } from './AnimationPlayer';
import { ExportManager } from './ExportManager';

const PRESET_COLORS = [
  '#ffffff',
  '#ff004d',
  '#ffa300',
  '#ffec27',
  '#00e436',
  '#29adff',
  '#83769c',
  '#ff77a8',
  '#ffccaa',
  '#1a1a2e',
];

interface ControlPanelProps {
  editor: FrameEditor;
  player: AnimationPlayer;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  editor,
  player,
}) => {
  const [editorState, setEditorState] = useState(editor.getState());
  const [playerState, setPlayerState] = useState(player.getState());
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const thumbnailRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    const unsubEditor = editor.subscribe(() => {
      setEditorState(editor.getState());
    });
    const unsubPlayer = player.subscribe(() => {
      setPlayerState(player.getState());
    });
    return () => {
      unsubEditor();
      unsubPlayer();
    };
  }, [editor, player]);

  useEffect(() => {
    const frames = editor.getFrames();
    frames.forEach((frame, i) => {
      const canvas = thumbnailRefs.current.get(i);
      if (canvas) {
        editor.renderThumbnail(frame, canvas);
      }
    });
  }, [editorState.frames, editor]);

  const handleColorSelect = useCallback(
    (color: string) => {
      editor.setBrushColor(color);
    },
    [editor]
  );

  const handleBrushSize = useCallback(
    (size: number) => {
      editor.setBrushSize(size);
    },
    [editor]
  );

  const handleEraserToggle = useCallback(() => {
    editor.setEraser(!editor.getIsEraser());
  }, [editor]);

  const handleAddFrame = useCallback(() => {
    editor.addFrame(editor.getCurrentFrameIndex());
  }, [editor]);

  const handleCloneFrame = useCallback(() => {
    editor.cloneFrame();
  }, [editor]);

  const handleDeleteFrame = useCallback(() => {
    editor.deleteFrame();
  }, [editor]);

  const handleClearFrame = useCallback(() => {
    editor.clearCurrentFrame();
  }, [editor]);

  const handleUndo = useCallback(() => {
    editor.undo();
  }, [editor]);

  const handleRedo = useCallback(() => {
    editor.redo();
  }, [editor]);

  const handlePlayPause = useCallback(() => {
    player.togglePlay();
  }, [player]);

  const handleStop = useCallback(() => {
    player.stop();
  }, [player]);

  const handleFpsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      player.setFps(Number(e.target.value));
    },
    [player]
  );

  const handleLoopToggle = useCallback(() => {
    player.setLoop(!player.getLoop());
  }, [player]);

  const handleTransitionChange = useCallback(
    (mode: TransitionMode) => {
      player.setTransitionMode(mode);
    },
    [player]
  );

  const handleExport = useCallback(async () => {
    setExportProgress(0);
    try {
      const blob = await ExportManager.exportToGif({
        frames: editor.getFrames(),
        fps: player.getFps(),
        scale: 10,
        loop: player.getLoop(),
        onProgress: (p) => setExportProgress(p),
      });
      ExportManager.downloadBlob(blob, 'firefly-theater.gif');
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExportProgress(null);
  }, [editor, player]);

  const handleFrameSelect = useCallback(
    (index: number) => {
      editor.setCurrentFrame(index);
      player.setCurrentFrame(index);
    },
    [editor, player]
  );

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      setDragOverIndex(index);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      editor.moveFrame(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, editor]);

  const isPlaying = playerState.isPlaying;
  const currentFrame = editorState.currentFrameIndex;
  const brushColor = editorState.brushColor;
  const brushSize = editorState.brushSize;
  const isEraser = editorState.isEraser;
  const fps = playerState.fps;
  const loop = playerState.loop;
  const transitionMode = playerState.transitionMode;
  const frames = editorState.frames;

  return (
    <div className="control-panel">
      <div className="panel-section">
        <h3 className="panel-title">画笔</h3>
        <div className="color-grid">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`color-swatch ${brushColor === color && !isEraser ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
              title={color}
            />
          ))}
        </div>
        <div className="brush-size-row">
          {[1, 2, 3].map((size) => (
            <button
              key={size}
              className={`brush-size-btn ${brushSize === size ? 'active' : ''}`}
              onClick={() => handleBrushSize(size)}
              title={`${size}x${size}`}
            >
              <span
                className="brush-size-dot"
                style={{ width: size * 6 + 4, height: size * 6 + 4 }}
              />
            </button>
          ))}
          <button
            className={`tool-btn ${isEraser ? 'active' : ''}`}
            onClick={handleEraserToggle}
            title="橡皮擦"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">编辑</h3>
        <div className="tool-row">
          <button className="tool-btn" onClick={handleUndo} title="撤销">
            ↶
          </button>
          <button className="tool-btn" onClick={handleRedo} title="重做">
            ↷
          </button>
          <button className="tool-btn" onClick={handleClearFrame} title="清空">
            ◻
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">帧列表</h3>
        <div className="frame-actions">
          <button className="tool-btn" onClick={handleAddFrame} title="添加帧">
            +
          </button>
          <button className="tool-btn" onClick={handleCloneFrame} title="克隆帧">
            ⧉
          </button>
          <button className="tool-btn" onClick={handleDeleteFrame} title="删除帧">
            ✕
          </button>
        </div>
        <div className="frame-list">
          {frames.map((_, i) => (
            <div
              key={i}
              className={`frame-thumb ${i === currentFrame ? 'active' : ''} ${
                dragOverIndex === i ? 'drag-over' : ''
              }`}
              onClick={() => handleFrameSelect(i)}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
            >
              <canvas
                ref={(el) => {
                  if (el) thumbnailRefs.current.set(i, el);
                }}
                className="frame-canvas"
              />
              <span className="frame-label">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">播放</h3>
        <div className="play-controls">
          <button
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlayPause}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="play-btn" onClick={handleStop}>
            ⏹
          </button>
          <button
            className={`tool-btn ${loop ? 'active' : ''}`}
            onClick={handleLoopToggle}
            title={loop ? '循环开启' : '循环关闭'}
          >
            ⟳
          </button>
        </div>
        <div className="fps-control">
          <label className="fps-label">
            速度: <span className="fps-value">{fps} FPS</span>
          </label>
          <input
            type="range"
            min="1"
            max="30"
            value={fps}
            onChange={handleFpsChange}
            className="fps-slider"
          />
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">过渡模式</h3>
        <div className="transition-modes">
          {(['normal', 'fade', 'flash'] as TransitionMode[]).map((mode) => (
            <button
              key={mode}
              className={`transition-btn ${transitionMode === mode ? 'active' : ''}`}
              onClick={() => handleTransitionChange(mode)}
            >
              {mode === 'normal' ? '正常' : mode === 'fade' ? '淡入淡出' : '闪烁'}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <button
          className="export-btn"
          onClick={handleExport}
          disabled={exportProgress !== null}
        >
          {exportProgress !== null
            ? `导出中 ${Math.round(exportProgress * 100)}%`
            : '导出 GIF'}
        </button>
      </div>
    </div>
  );
};
