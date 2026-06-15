import { useState, useEffect, useCallback } from 'react';
import { useStore, Annotation, QueryPoint } from '../../store';

interface ApiAnnotation {
  id: number;
  x: number;
  y: number;
  z: number;
  text: string;
  lithology: string;
  created_at: string;
}

export default function AnnotationPanel() {
  const {
    queryPoint,
    annotations,
    addAnnotation,
    removeAnnotation,
    setAnnotations,
  } = useStore();

  const [newText, setNewText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetch('/api/annotations')
      .then((r) => r.json())
      .then((data: ApiAnnotation[]) => {
        setAnnotations(data);
      })
      .catch((err) => console.error('加载标注失败:', err));
  }, [setAnnotations]);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const newHeight = window.innerHeight - clientY;
      setDrawerHeight(Math.max(100, Math.min(window.innerHeight * 0.6, newHeight)));
    };

    const onUp = () => setIsDragging(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging]);

  const showStatus = useCallback((msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(''), 2000);
  }, []);

  const handleAddAnnotation = useCallback(async () => {
    if (!queryPoint || !newText.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: queryPoint.x,
          y: queryPoint.y,
          z: queryPoint.z,
          text: newText.trim(),
          lithology: queryPoint.lithology,
        }),
      });
      if (!res.ok) throw new Error('保存失败');
      const saved: ApiAnnotation = await res.json();
      addAnnotation(saved);
      setNewText('');
      showStatus('标注已保存');
    } catch (err) {
      console.error(err);
      showStatus('保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [queryPoint, newText, addAnnotation, showStatus]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/annotations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      removeAnnotation(id);
      showStatus('标注已删除');
    } catch (err) {
      console.error(err);
      showStatus('删除失败');
    }
  }, [removeAnnotation, showStatus]);

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: drawerHeight,
        background: '#ffffff',
        borderTop: '1px solid #e0e0e0',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        transition: 'none',
      }
    : {
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: 350,
        background: '#ffffff',
        borderLeft: '1px solid #e0e0e0',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      };

  return (
    <div style={panelStyle}>
      {isMobile && (
        <div
          style={{
            height: 6,
            background: '#e0e0e0',
            margin: '8px auto',
            width: 40,
            borderRadius: 3,
            cursor: 'row-resize',
            userSelect: 'none',
            touchAction: 'none',
          }}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
        />
      )}

      <div
        style={{
          padding: '16px 20px',
          borderBottom: '2px solid #e0e0e0',
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            fontSize: 20,
            color: '#37474f',
            fontWeight: 600,
            margin: 0,
          }}
        >
          地层信息
        </h2>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            background: '#f5f5f5',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 14, color: '#546e7a', fontWeight: 500, marginBottom: 12 }}>
            📍 位置信息
          </div>
          {queryPoint ? (
            <QueryPointDisplay point={queryPoint} />
          ) : (
            <div style={{ fontSize: 13, color: '#90a4ae', fontFamily: 'monospace' }}>
              点击地层截面任意位置查询
            </div>
          )}
        </div>

        <div
          style={{
            background: '#f5f5f5',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 14, color: '#546e7a', fontWeight: 500, marginBottom: 12 }}>
            ✏️ 添加标注
          </div>
          {queryPoint ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAnnotation()}
                placeholder="输入标注内容..."
                disabled={isLoading}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #90a4ae',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  background: '#ffffff',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#4db6ac')}
                onBlur={(e) => (e.target.style.borderColor = '#90a4ae')}
              />
              <button
                onClick={handleAddAnnotation}
                disabled={isLoading || !newText.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: newText.trim() ? '#4db6ac' : '#b0bec5',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: newText.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                {isLoading ? '保存中...' : '确认添加'}
              </button>
              {saveStatus && (
                <div style={{ fontSize: 12, color: '#4db6ac', textAlign: 'center' }}>
                  {saveStatus}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#90a4ae', fontFamily: 'monospace' }}>
              先选择一个位置再添加标注
            </div>
          )}
        </div>

        <div
          style={{
            background: '#f5f5f5',
            borderRadius: 12,
            padding: 16,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: '#546e7a',
              fontWeight: 500,
              marginBottom: 12,
              flexShrink: 0,
            }}
          >
            📋 标注列表 ({annotations.length})
          </div>
          <div
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flex: 1,
              minHeight: 0,
            }}
          >
            {annotations.length === 0 ? (
              <div style={{ fontSize: 13, color: '#90a4ae', fontFamily: 'monospace' }}>
                暂无标注
              </div>
            ) : (
              annotations.map((a) => (
                <AnnotationItem key={a.id} annotation={a} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueryPointDisplay({ point }: { point: QueryPoint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr',
          gap: '6px 12px',
          fontFamily: 'monospace',
          fontSize: 13,
        }}
      >
        <span style={{ color: '#78909c' }}>X:</span>
        <span style={{ color: '#263238', fontWeight: 500 }}>{point.x.toFixed(1)}</span>
        <span style={{ color: '#78909c' }}>Y:</span>
        <span style={{ color: '#263238', fontWeight: 500 }}>{point.y.toFixed(1)}</span>
        <span style={{ color: '#78909c' }}>Z:</span>
        <span style={{ color: '#263238', fontWeight: 500 }}>{point.z.toFixed(1)}</span>
      </div>
      <div
        style={{
          marginTop: 4,
          padding: '8px 10px',
          background: '#ffffff',
          borderRadius: 6,
          borderLeft: '3px solid #4db6ac',
        }}
      >
        <div style={{ fontSize: 12, color: '#78909c', marginBottom: 2 }}>岩性</div>
        <div style={{ fontSize: 15, color: '#263238', fontWeight: 600, fontFamily: 'monospace' }}>
          {point.lithology}
        </div>
        <div style={{ fontSize: 11, color: '#90a4ae', marginTop: 2 }}>
          置信度 {(point.confidence * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function AnnotationItem({
  annotation,
  onDelete,
}: {
  annotation: Annotation;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      style={{
        padding: 10,
        background: '#ffffff',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        border: '1px solid #e0e0e0',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: '#263238',
            fontWeight: 500,
            marginBottom: 4,
            wordBreak: 'break-word',
          }}
        >
          {annotation.text}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#78909c',
            fontFamily: 'monospace',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <span>{annotation.lithology}</span>
          <span style={{ color: '#b0bec5' }}>|</span>
          <span>
            ({annotation.x.toFixed(0)}, {annotation.y.toFixed(0)}, {annotation.z.toFixed(0)})
          </span>
        </div>
      </div>
      <button
        onClick={() => onDelete(annotation.id)}
        title="删除标注"
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: 'none',
          background: '#e57373',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
          transition: 'background 0.2s, transform 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#ef5350')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#e57373')}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        ×
      </button>
    </div>
  );
}
