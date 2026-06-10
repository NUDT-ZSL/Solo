import React, { useRef, useEffect, useCallback } from 'react';
import type { Note } from './types';

interface NoteCanvasProps {
  note: Note;
  onContentChange: (content: string) => void;
  onSketchChange: (data: string) => void;
  onDragStart: (text: string) => void;
}

const NoteCanvas: React.FC<NoteCanvasProps> = ({ note, onContentChange, onSketchChange, onDragStart }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number; pressure: number } | null>(null);

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

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: (e.nativeEvent as MouseEvent & { pressure?: number }).pressure || 0.5,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasPos(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const current = getCanvasPos(e);
    const last = lastPointRef.current;

    const gradient = ctx.createLinearGradient(last.x, last.y, current.x, current.y);
    gradient.addColorStop(0, '#2C3E50');
    gradient.addColorStop(1, '#E74C3C');

    const lineWidth = 2 + current.pressure * 4;

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();

    lastPointRef.current = current;
  };

  const handleCanvasMouseUp = () => {
    if (isDrawingRef.current && canvasRef.current) {
      onSketchChange(canvasRef.current.toDataURL());
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleEditorDragStart = (e: React.DragEvent) => {
    const selection = window.getSelection()?.toString() || '';
    if (selection) {
      e.dataTransfer.setData('text/plain', selection);
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
    if (code !== null) {
      const html = `<pre style="background:#2C3E50;color:#ECF0F1;padding:12px;border-radius:6px;overflow-x:auto;"><code>${code.replace(/\n/g, '<br>')}</code></pre><p><br></p>`;
      execCommand('insertHTML', html);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.editorSection}>
        <div style={styles.toolbar}>
          <button style={styles.toolBtn} onClick={() => execCommand('bold')} title="加粗">
            <strong>B</strong>
          </button>
          <button style={styles.toolBtn} onClick={() => execCommand('italic')} title="斜体">
            <em>I</em>
          </button>
          <button style={styles.toolBtn} onClick={() => execCommand('underline')} title="下划线">
            <u>U</u>
          </button>
          <div style={styles.toolDivider} />
          <button style={styles.toolBtn} onClick={() => execCommand('insertUnorderedList')} title="无序列表">
            • 列表
          </button>
          <button style={styles.toolBtn} onClick={() => execCommand('insertOrderedList')} title="有序列表">
            1. 列表
          </button>
          <div style={styles.toolDivider} />
          <button style={styles.toolBtn} onClick={handleInsertImage} title="插入图片">
            🖼 图片
          </button>
          <button style={styles.toolBtn} onClick={handleInsertCode} title="代码块">
            {'</>'} 代码
          </button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onDragStart={handleEditorDragStart}
          style={styles.editor}
          suppressContentEditableWarning
        />
      </div>

      <div style={styles.sketchSection}>
        <div style={styles.sketchLabel}>
          <span>🎨 手绘板</span>
          <button
            style={styles.clearBtn}
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
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={styles.canvas}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '20px',
    gap: '20px',
    overflow: 'auto',
  },
  editorSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px',
    background: '#FFFFFF',
    borderRadius: '8px',
    border: '1px solid #BDC3C7',
  },
  toolBtn: {
    padding: '6px 12px',
    border: '1px solid #BDC3C7',
    borderRadius: '6px',
    background: '#FFFFFF',
    color: '#2C3E50',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.3s ease-out',
  },
  toolDivider: {
    width: '1px',
    height: '24px',
    background: '#BDC3C7',
    margin: '0 4px',
  },
  editor: {
    minHeight: '280px',
    padding: '20px',
    background: '#FFFFFF',
    borderRadius: '8px',
    border: '1px solid #BDC3C7',
    outline: 'none',
    fontSize: '14px',
    lineHeight: '1.7',
    color: '#2C3E50',
    overflowY: 'auto',
  },
  sketchSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sketchLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#2C3E50',
  },
  clearBtn: {
    padding: '4px 12px',
    border: '1px solid #BDC3C7',
    borderRadius: '4px',
    background: '#FFFFFF',
    color: '#7F8C8D',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.3s ease-out',
  },
  canvas: {
    width: '100%',
    maxWidth: '800px',
    height: '300px',
    background: '#F5DEB3',
    borderRadius: '8px',
    border: '1px solid #BDC3C7',
    cursor: 'crosshair',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
};

export default React.memo(NoteCanvas);
