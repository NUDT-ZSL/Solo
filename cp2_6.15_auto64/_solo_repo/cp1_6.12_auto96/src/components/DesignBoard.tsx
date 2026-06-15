import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Annotation, apiService } from '../api/apiService';

interface DesignBoardProps {
  versionId: string;
  imageUrl: string;
  annotations: Annotation[];
  onAnnotationsChange: () => void;
}

const DesignBoard: React.FC<DesignBoardProps> = ({
  versionId,
  imageUrl,
  annotations,
  onAnnotationsChange
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [pendingClick, setPendingClick] = useState<{ x: number; y: number } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Annotation | null>(null);
  const [authorName] = useState('评审员');

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    if ((e.target as HTMLElement).closest('.annotation-marker') || (e.target as HTMLElement).closest('.annotation-input-popup')) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (annotations.length >= 50) return;

    setPendingClick({ x, y });
    setInputValue('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [annotations.length]);

  const handleInputKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pendingClick && inputValue.trim()) {
      try {
        await apiService.createAnnotation(versionId, {
          x: pendingClick.x,
          y: pendingClick.y,
          content: inputValue.trim(),
          author: authorName
        });
        setPendingClick(null);
        setInputValue('');
        onAnnotationsChange();
      } catch (err) {
        console.error('Failed to create annotation:', err);
      }
    } else if (e.key === 'Escape') {
      setPendingClick(null);
      setInputValue('');
    }
  }, [pendingClick, inputValue, versionId, authorName, onAnnotationsChange]);

  const handleDragStart = useCallback((start: any) => {
    setDraggingId(start.draggableId);
  }, []);

  const handleDragEnd = useCallback(async (result: any) => {
    setDraggingId(null);
    if (!result.destination || !canvasRef.current) return;

    const annotation = annotations.find(a => a.id === result.draggableId);
    if (!annotation) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const dropX = ((result.destination?.droppableProps?.x || 0) / rect.width) * 100;

    const newIndex = result.destination.index;
    const offsetX = (newIndex * 0.5) % 10;
    const offsetY = (newIndex * 0.3) % 10;
    const newX = Math.max(0, Math.min(100, annotation.x + offsetX - 0.5));
    const newY = Math.max(0, Math.min(100, annotation.y + offsetY - 0.5));

    try {
      await apiService.updateAnnotation(annotation.id, { x: newX, y: newY });
      onAnnotationsChange();
    } catch (err) {
      console.error('Failed to update annotation position:', err);
    }
  }, [annotations, onAnnotationsChange]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await apiService.deleteAnnotation(deleteTarget.id);
      setDeleteTarget(null);
      onAnnotationsChange();
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  }, [deleteTarget, onAnnotationsChange]);

  const handleMarkerMouseDown = useCallback((e: React.MouseEvent, annotation: Annotation) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    setDraggingId(annotation.id);

    const handleMouseMove = async (me: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = ((me.clientX - rect.left) / rect.width) * 100;
      const newY = ((me.clientY - rect.top) / rect.height) * 100;
    };

    const handleMouseUp = async (me: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100));
      const newY = Math.max(0, Math.min(100, ((me.clientY - rect.top) / rect.height) * 100));
      setDraggingId(null);

      if (Math.abs(me.clientX - startX) > 3 || Math.abs(me.clientY - startY) > 3) {
        try {
          await apiService.updateAnnotation(annotation.id, { x: newX, y: newY });
          onAnnotationsChange();
        } catch (err) {
          console.error('Failed to update annotation position:', err);
        }
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onAnnotationsChange]);

  const sortedAnnotations = [...annotations].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  useEffect(() => {
    if (imageUrl) {
      setImageLoaded(false);
    }
  }, [imageUrl]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div
        ref={canvasRef}
        onClick={handleClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '80vh',
          background: '#000',
          overflow: 'hidden',
          cursor: pendingClick ? 'default' : 'crosshair'
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="设计稿"
            className={imageLoaded ? 'fade-in' : ''}
            onLoad={() => setImageLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 600ms ease-out'
            }}
            draggable={false}
          />
        )}

        {sortedAnnotations.map((ann, index) => (
          <div
            key={ann.id}
            className={[
              'annotation-marker',
              ann.content ? 'annotation-marker-confirmed' : 'annotation-marker-default',
              draggingId === ann.id ? 'annotation-marker-dragging' : 'annotation-marker-drag-release'
            ].join(' ')}
            style={{
              left: `${ann.x}%`,
              top: `${ann.y}%`,
              transform: draggingId === ann.id ? 'scale(1.3)' : 'scale(1)',
              transition: draggingId === ann.id ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: draggingId === ann.id ? '0 4px 12px rgba(0,0,0,0.4)' : 'none'
            }}
            onMouseDown={(e) => handleMarkerMouseDown(e, ann)}
          >
            {index + 1}
            {ann.content && (
              <div className="annotation-label" style={{ left: 28, top: -4 }}>
                {ann.content}
                <span className="annotation-label-author">{ann.author}</span>
              </div>
            )}
          </div>
        ))}

        {pendingClick && (
          <div
            className="annotation-input-popup"
            style={{
              left: `${pendingClick.x}%`,
              top: `${pendingClick.y}%`,
              transform: 'translate(12px, -50%)'
            }}
          >
            <div
              className="annotation-marker annotation-marker-default"
              style={{ position: 'absolute', left: -30, top: '50%', marginTop: -12 }}
            >
              {sortedAnnotations.length + 1}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="输入批注内容，回车确认"
              maxLength={200}
            />
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          background: 'linear-gradient(180deg, #16213e 0%, #1a2744 100%)',
          overflowY: 'auto',
          padding: '12px 16px',
          minHeight: 0
        }}
      >
        <div style={{ fontSize: 13, color: '#a0a0a0', marginBottom: 8, fontWeight: 600 }}>
          批注列表 ({annotations.length})
        </div>
        {annotations.length === 0 ? (
          <div style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: 16 }}>
            暂无批注，点击画布添加
          </div>
        ) : (
          annotations.map((ann, idx) => {
            const sortedIdx = sortedAnnotations.findIndex(a => a.id === ann.id) + 1;
            return (
              <div
                key={ann.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  marginBottom: 6,
                  background: 'rgba(15, 52, 96, 0.5)',
                  borderRadius: 6,
                  border: '1px solid rgba(42, 42, 74, 0.5)'
                }}
              >
                <div
                  className="annotation-marker annotation-marker-confirmed"
                  style={{ position: 'relative', flexShrink: 0, width: 22, height: 22, fontSize: 10 }}
                >
                  {sortedIdx}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#e0e0e0', wordBreak: 'break-word' }}>
                    {ann.content}
                  </div>
                  <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                    {ann.author} · {new Date(ann.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(ann)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e94560',
                    fontSize: 16,
                    cursor: 'pointer',
                    padding: '0 4px',
                    lineHeight: 1,
                    opacity: 0.6,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; }}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      {deleteTarget && (
        <div className="confirm-dialog-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-title">确认删除批注</div>
            <div className="confirm-dialog-message">
              确定要删除批注「{deleteTarget.content}」吗？此操作不可撤销。
            </div>
            <div className="confirm-dialog-actions">
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>
                取消
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignBoard;
