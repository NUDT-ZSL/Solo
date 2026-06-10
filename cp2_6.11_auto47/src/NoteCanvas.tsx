import React, { useRef, useEffect, useCallback } from 'react';
import type { Note } from './types';

interface NoteCanvasProps {
  note: Note;
  onContentChange: (content: string) => void;
  onSketchChange: (data: string) => void;
  onDragStart: (text: string) => void;
}

interface Point {
  x: number;
  y: number;
  time: number;
}

const NoteCanvas: React.FC<NoteCanvasProps> = ({ note, onContentChange, onSketchChange, onDragStart }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const lastLineWidthRef = useRef(4);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== note.content) {
      editorRef.current.innerHTML = note.content;
    }
  }, [note.id, note.content]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#F5DEB3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (note.sketchData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = note.sketchData;
    }
  }, [note.id, note.sketchData]);

  const execCommand = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  }, [onContentChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  }, [onContentChange]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      time: Date.now(),
    };
  };

  const calculateSpeed = (p1: Point, p2: Point): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const timeDiff = Math.max(p2.time - p1.time, 1);
    return distance / timeDiff;
  };

  const getLineWidth = (speed: number): number => {
    const minWidth = 2;
    const maxWidth = 6;
    const normalizedSpeed = Math.min(speed / 3, 1);
    return maxWidth - normalizedSpeed * (maxWidth - minWidth);
  };

  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const point = getCanvasPos(e);
    lastPointRef.current = point;
    lastLineWidthRef.current = 4;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#2C3E50';
      ctx.fill();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const current = getCanvasPos(e);
    const last = lastPointRef.current;

    const speed = calculateSpeed(last, current);
    const targetWidth = getLineWidth(speed);
    const lineWidth = lerp(lastLineWidthRef.current, targetWidth, 0.3);
    lastLineWidthRef.current = lineWidth;

    const midX = (last.x + current.x) / 2;
    const midY = (last.y + current.y) / 2;

    const gradient = ctx.createLinearGradient(last.x, last.y, current.x, current.y);
    gradient.addColorStop(0, '#2C3E50');
    gradient.addColorStop(1, '#E74C3C');

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(last.x, last.y);
    ctx.quadraticCurveTo(last.x, last.y, midX, midY);
    ctx.quadraticCurveTo(midX, midY, current.x, current.y);
    ctx.stroke();

    lastPointRef.current = current;
  };

  const handleCanvasMouseUp = useCallback(() => {
    if (isDrawingRef.current && canvasRef.current) {
      onSketchChange(canvasRef.current.toDataURL());
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, [onSketchChange]);

  const handleEditorDragStart = (e: React.DragEvent) => {
    const selection = window.getSelection()?.toString() || '';
    if (selection) {
      e.dataTransfer.setData('text/plain', selection);
      e.dataTransfer.effectAllowed = 'copy';
      onDragStart(selection);
    }
  };

  const handleInsertImage = () => {
    const url = prompt('请输入图片URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const handleInsertCode = () => {
    const code = prompt('请输入代码:');
    if (code !== null && code !== undefined) {
      const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = `<pre style="background:#2C3E50;color:#ECF0F1;padding:12px;border-radius:6px;overflow-x:auto;margin:12px 0;"><code style="font-family:monospace;font-size:13px;white-space:pre-wrap;">${escapedCode.replace(/\n/g, '<br>')}</code></pre><p><br></p>`;
      execCommand('insertHTML', html);
    }
  };

  return (
    <div className="note-canvas-container">
      <div className="note-canvas-editor">
        <div className="note-canvas-toolbar">
          <button className="note-canvas-tool-btn" onClick={() => execCommand('bold')} title="加粗">
            <strong>B</strong>
          </button>
          <button className="note-canvas-tool-btn" onClick={() => execCommand('italic')} title="斜体">
            <em>I</em>
          </button>
          <button className="note-canvas-tool-btn" onClick={() => execCommand('underline')} title="下划线">
            <u>U</u>
          </button>
          <div className="note-canvas-tool-divider" />
          <button className="note-canvas-tool-btn" onClick={() => execCommand('insertUnorderedList')} title="无序列表">
            • 列表
          </button>
          <button className="note-canvas-tool-btn" onClick={() => execCommand('insertOrderedList')} title="有序列表">
            1. 列表
          </button>
          <div className="note-canvas-tool-divider" />
          <button className="note-canvas-tool-btn" onClick={handleInsertImage} title="插入图片">
            🖼 图片
          </button>
          <button className="note-canvas-tool-btn" onClick={handleInsertCode} title="代码块">
            {'</>'} 代码
          </button>
        </div>
        <div
          ref={editorRef}
          className="note-canvas-editor-content"
          contentEditable
          onInput={handleInput}
          onDragStart={handleEditorDragStart}
          suppressContentEditableWarning
        />
      </div>

      <div className="note-canvas-sketch">
        <div className="note-canvas-sketch-label">
          <span>🎨 手绘板</span>
          <button
            className="note-canvas-clear-btn"
            onClick={() => {
              const canvas = canvasRef.current;
              const ctx = canvas?.getContext('2d');
              if (canvas && ctx) {
                ctx.fillStyle = '#F5DEB3';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                onSketchChange('');
              }
            }}
          >
            清除
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="note-canvas-sketch-canvas"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />
      </div>

      <style>{`
        .note-canvas-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 20px;
          gap: 20px;
          overflow: auto;
        }
        .note-canvas-editor {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .note-canvas-toolbar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px;
          background: #FFFFFF;
          border-radius: 8px;
          border: 1px solid #BDC3C7;
          flex-wrap: wrap;
        }
        .note-canvas-tool-btn {
          padding: 6px 12px;
          border: 1px solid #BDC3C7;
          border-radius: 6px;
          background: #FFFFFF;
          color: #2C3E50;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.3s ease-out;
        }
        .note-canvas-tool-btn:hover {
          background: #ECF0F1;
          border-color: #7F8C8D;
        }
        .note-canvas-tool-divider {
          width: 1px;
          height: 24px;
          background: #BDC3C7;
          margin: 0 4px;
        }
        .note-canvas-editor-content {
          min-height: 200px;
          max-height: 40vh;
          padding: 20px;
          background: #FFFFFF;
          border-radius: 8px;
          border: 1px solid #BDC3C7;
          outline: none;
          font-size: 14px;
          line-height: 1.7;
          color: #2C3E50;
          overflow-y: auto;
        }
        .note-canvas-editor-content:empty::before {
          content: attr(data-placeholder);
          color: #BDC3C7;
        }
        .note-canvas-editor-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }
        .note-canvas-editor-content ul,
        .note-canvas-editor-content ol {
          margin-left: 24px;
          padding: 8px 0;
        }
        .note-canvas-editor-content li {
          padding: 2px 0;
        }
        .note-canvas-sketch {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .note-canvas-sketch-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          color: #2C3E50;
        }
        .note-canvas-clear-btn {
          padding: 4px 12px;
          border: 1px solid #BDC3C7;
          border-radius: 4px;
          background: #FFFFFF;
          color: #7F8C8D;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease-out;
        }
        .note-canvas-clear-btn:hover {
          background: #ECF0F1;
          border-color: #7F8C8D;
        }
        .note-canvas-sketch-canvas {
          width: 100%;
          max-width: 800px;
          height: 300px;
          background: #F5DEB3;
          border-radius: 8px;
          border: 1px solid #BDC3C7;
          cursor: crosshair;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          touch-action: none;
        }
      `}</style>
    </div>
  );
};

export default React.memo(NoteCanvas);
