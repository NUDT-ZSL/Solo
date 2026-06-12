import { useState, useCallback, useRef, useEffect } from 'react';
import { Save, Trash2, Download, Plus } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Scheme, LayoutBlock } from './types';
import './SchemeManager.css';

interface SchemeManagerProps {
  schemes: Scheme[];
  canvasRef: React.RefObject<HTMLDivElement | null>;
  blocks: LayoutBlock[];
  onSave: (name: string, thumbnail: string) => void;
  onLoad: (scheme: Scheme) => void;
  onDelete: (id: string) => void;
}

function SchemeManager({ schemes, canvasRef, blocks, onSave, onLoad, onDelete }: SchemeManagerProps) {
  const [showNameInput, setShowNameInput] = useState(false);
  const [schemeName, setSchemeName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNameInput && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showNameInput]);

  const generateThumbnail = useCallback(async (): Promise<string> => {
    if (!canvasRef.current) return '';
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#f3f4f6',
        scale: 0.2,
        useCORS: true,
        logging: false,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('生成缩略图失败:', error);
      return generateFallbackThumbnail();
    }
  }, [canvasRef]);

  const generateFallbackThumbnail = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, 128, 96);

    const scaleX = 128 / 1200;
    const scaleY = 96 / 800;

    blocks.forEach((block) => {
      ctx.fillStyle = block.fillColor;
      ctx.strokeStyle = block.borderColor;
      ctx.lineWidth = 1;
      const x = block.position.x * scaleX;
      const y = block.position.y * scaleY;
      const w = block.size.width * scaleX;
      const h = block.size.height * scaleY;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    });

    return canvas.toDataURL('image/png');
  };

  const handleSaveClick = useCallback(() => {
    if (blocks.length === 0) return;
    setShowNameInput(true);
    const date = new Date();
    const defaultName = `方案 ${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    setSchemeName(defaultName);
  }, [blocks.length]);

  const handleConfirmSave = useCallback(async () => {
    if (!schemeName.trim() || blocks.length === 0) return;

    setIsSaving(true);
    try {
      const thumbnail = await generateThumbnail();
      onSave(schemeName.trim(), thumbnail);
      setShowNameInput(false);
      setSchemeName('');
    } finally {
      setIsSaving(false);
    }
  }, [schemeName, blocks.length, generateThumbnail, onSave]);

  const handleCancelSave = useCallback(() => {
    setShowNameInput(false);
    setSchemeName('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleConfirmSave();
      if (e.key === 'Escape') handleCancelSave();
    },
    [handleConfirmSave, handleCancelSave]
  );

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="scheme-manager">
      <div className="scheme-header">
        <h3 className="scheme-title">我的方案</h3>
        <button
          className="save-btn"
          onClick={handleSaveClick}
          disabled={blocks.length === 0 || isSaving}
          title="保存当前布局"
        >
          {isSaving ? (
            <span className="save-loading" />
          ) : (
            <Save size={16} />
          )}
          <span>保存布局</span>
        </button>
      </div>

      {showNameInput && (
        <div className="name-input-wrapper">
          <input
            ref={nameInputRef}
            type="text"
            value={schemeName}
            onChange={(e) => setSchemeName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="scheme-name-input"
            placeholder="请输入方案名称"
          />
          <div className="name-input-actions">
            <button className="name-btn confirm" onClick={handleConfirmSave}>
              确认
            </button>
            <button className="name-btn cancel" onClick={handleCancelSave}>
              取消
            </button>
          </div>
        </div>
      )}

      <div className="scheme-list">
        {schemes.length === 0 ? (
          <div className="scheme-empty">
            <Plus size={24} color="#9ca3af" />
            <p>暂无保存的方案</p>
            <span>点击上方按钮保存第一个布局</span>
          </div>
        ) : (
          schemes.map((scheme) => (
            <div key={scheme.id} className="scheme-item">
              <div
                className="scheme-thumbnail"
                onClick={() => onLoad(scheme)}
                title={`加载 ${scheme.name}`}
              >
                <img src={scheme.thumbnail} alt={scheme.name} />
              </div>
              <div className="scheme-info">
                <span className="scheme-name" title={scheme.name}>
                  {scheme.name}
                </span>
                <span className="scheme-meta">
                  {formatDate(scheme.createdAt)} · {scheme.blocks.length} 个组件
                </span>
              </div>
              <button
                className="scheme-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(scheme.id);
                }}
                title="删除方案"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SchemeManager;
