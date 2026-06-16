import { useState, useRef, useEffect, useCallback } from 'react';
import type { Icon } from './types';
import './IconEditor.css';

interface IconEditorProps {
  icon: Icon;
  onSave: (icon: Icon) => void;
  onClose: () => void;
}

function IconEditor({ icon, onSave, onClose }: IconEditorProps) {
  const [paths, setPaths] = useState<string[]>(icon.paths);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  const code = paths.join('\n');
  const [codeText, setCodeText] = useState(code);

  useEffect(() => {
    setPaths(icon.paths);
    setCodeText(icon.paths.join('\n'));
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [icon]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCodeText(newCode);
    const newPaths = newCode.split('\n').filter(p => p.trim());
    setPaths(newPaths);
  };

  const handleApply = () => {
    const newPaths = codeText.split('\n').filter(p => p.trim());
    onSave({
      ...icon,
      paths: newPaths,
    });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const highlightedCode = codeText.split('\n').map((line, index) => {
    const isPath = line.trim().startsWith('M') || line.trim().startsWith('m');
    return (
      <span key={index} className={isPath ? 'path-line' : ''}>
        {line}
      </span>
    );
  });

  return (
    <div className="editor-overlay" onClick={handleOverlayClick}>
      <div className="editor-modal">
        <div className="editor-header">
          <h3>编辑图标</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="editor-body">
          <div
            className="preview-section"
            ref={previewRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div className="preview-info">
              缩放: {(scale * 100).toFixed(0)}%
            </div>
            <div
              className="preview-content"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              }}
            >
              <svg
                viewBox={icon.viewBox}
                fill="none"
                stroke="#e94560"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="120"
                height="120"
              >
                {paths.map((path, i) => (
                  <path key={i} d={path} />
                ))}
              </svg>
            </div>
          </div>
          <div className="code-section">
            <label className="code-label">SVG 路径代码</label>
            <textarea
              className="code-editor"
              value={codeText}
              onChange={handleCodeChange}
              spellCheck={false}
            />
            <div className="code-hint">每行一个 path，支持 M、L、Q、C、A 等命令</div>
          </div>
        </div>
        <div className="editor-footer">
          <button className="cancel-btn" onClick={onClose}>
            取消
          </button>
          <button className="apply-btn" onClick={handleApply}>
            应用
          </button>
        </div>
      </div>
    </div>
  );
}

export default IconEditor;
