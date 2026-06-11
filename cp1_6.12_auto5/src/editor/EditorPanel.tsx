import React, { useCallback, useEffect, useState } from 'react';
import {
  Palette,
  Plus,
  Pencil,
  Trash2,
  Save,
  Share2,
  History as HistoryIcon,
  MessageSquareText,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';
import type { ColorKey, ThemeColors } from '@/store/types';
import { COLOR_KEYS } from '@/store/types';
import { ColorPickerCell } from './ColorPickerCell';
import { HistoryPanel } from './HistoryPanel';
import { debounce } from '@/utils/debounce';

interface Props {
  open: boolean;
  onClose: () => void;
  updateTheme: (colors: ThemeColors) => void;
}

const SWATCH_ORDER: ColorKey[] = ['primary', 'secondary', 'background', 'text', 'accent'];

export const EditorPanel: React.FC<Props> = React.memo(function EditorPanel({
  open,
  onClose,
  updateTheme,
}) {
  const themes = useThemeStore((s) => s.themes);
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const history = useThemeStore((s) => s.history);
  const activeTheme = useThemeStore((s) => s.getActiveTheme());

  const createTheme = useThemeStore((s) => s.createTheme);
  const renameTheme = useThemeStore((s) => s.renameTheme);
  const deleteTheme = useThemeStore((s) => s.deleteTheme);
  const setActiveTheme = useThemeStore((s) => s.setActiveTheme);
  const updateColor = useThemeStore((s) => s.updateColor);
  const updateComments = useThemeStore((s) => s.updateComments);
  const saveSnapshot = useThemeStore((s) => s.saveSnapshot);
  const restoreSnapshot = useThemeStore((s) => s.restoreSnapshot);
  const generateShareLink = useThemeStore((s) => s.generateShareLink);
  const setToast = useThemeStore((s) => s.setToast);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // 颜色变化时通知父组件（防抖更新预览，<50ms）
  const debouncedUpdate = useMemoizedFn(
    debounce((colors: ThemeColors) => {
      updateTheme(colors);
    }, 30)
  );

  useEffect(() => {
    if (activeTheme) {
      // 使用 requestAnimationFrame 确保在一帧内（<16ms）完成 CSS 变量更新
      requestAnimationFrame(() => {
        debouncedUpdate(activeTheme.colors);
      });
    }
  }, [activeTheme?.colors, activeTheme?.id, debouncedUpdate, updateTheme]);

  const handleColorChange = useCallback(
    (key: ColorKey, hex: string) => {
      updateColor(key, hex);
    },
    [updateColor]
  );

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const commitRename = () => {
    if (editingId && editingName.trim()) {
      renameTheme(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleShare = async () => {
    const link = generateShareLink();
    try {
      await navigator.clipboard.writeText(link);
      setToast('✓ 分享链接已复制到剪贴板');
    } catch {
      window.prompt('请手动复制分享链接：', link);
    }
  };

  if (!activeTheme) {
    return (
      <aside className={`editor-panel ${open ? 'editor-panel--open' : ''}`}>
        <div className="editor-panel__body">
          <div className="empty-hint">正在加载主题…</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`editor-panel ${open ? 'editor-panel--open' : ''}`}>
      <div className="editor-panel__header">
        <h1 className="editor-panel__title">
          <Palette className="editor-panel__title-icon" />
          ColorCollab
        </h1>
        <button
          type="button"
          className="editor-panel__close"
          onClick={onClose}
          aria-label="关闭面板"
        >
          <X size={18} />
        </button>
      </div>

      <div className="editor-panel__body">
        {/* 主题列表 */}
        <section className="section">
          <span className="section__label">配色主题</span>
          <div className="theme-list">
            {themes.map((t) => {
              const active = t.id === activeThemeId;
              return (
                <div
                  key={t.id}
                  className={`theme-list__item ${
                    active ? 'theme-list__item--active' : ''
                  }`}
                  onClick={() => !editingId && setActiveTheme(t.id)}
                >
                  <div className="theme-list__swatches">
                    {SWATCH_ORDER.map((k) => (
                      <div
                        key={k}
                        className="theme-list__swatch"
                        style={{ backgroundColor: t.colors[k] }}
                      />
                    ))}
                  </div>
                  {editingId === t.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
                    />
                  ) : (
                    <span className="theme-list__name" title={t.name}>
                      {t.name}
                    </span>
                  )}
                  <div className="theme-list__actions">
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      title="重命名"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(t.id, t.name);
                      }}
                    >
                      <Pencil />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      title="删除主题"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (themes.length === 1) {
                          setToast('至少保留一个主题');
                          return;
                        }
                        deleteTheme(t.id);
                      }}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="secondary-btn" onClick={createTheme}>
            <Plus size={15} />
            创建新主题
          </button>
        </section>

        {/* 色块编辑 */}
        <section className="section">
          <span className="section__label">
            颜色编辑 · {activeTheme.name}
          </span>
          {COLOR_KEYS.map((key) => (
            <ColorPickerCell
              key={key}
              colorKey={key}
              value={activeTheme.colors[key]}
              background={activeTheme.colors.background}
              onColorChange={handleColorChange}
            />
          ))}
        </section>

        {/* 注释 */}
        <section className="section">
          <span className="section__label">
            <MessageSquareText
              size={12}
              style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }}
            />
            主题注释
          </span>
          <textarea
            className="comments-input"
            placeholder="记录设计说明、使用场景或团队协作备注…分享后他人也可见"
            value={activeTheme.comments}
            onChange={(e) => updateComments(e.target.value)}
            rows={4}
          />
        </section>

        {/* 版本历史 */}
        <section className="section">
          <span className="section__label">
            <HistoryIcon
              size={12}
              style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }}
            />
            版本快照 · 最多 {history.length}/10
          </span>
          <button
            type="button"
            className="primary-btn"
            onClick={() => saveSnapshot()}
          >
            <Save size={15} />
            保存当前版本
          </button>
          <HistoryPanel history={history} onRestore={restoreSnapshot} />
        </section>

        {/* 共享 */}
        <section className="section">
          <button type="button" className="secondary-btn" onClick={handleShare}>
            <Share2 size={15} />
            生成分享链接
          </button>
        </section>
      </div>
    </aside>
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useMemoizedFn<T extends (...args: any[]) => unknown>(fn: T): T {
  const ref = React.useRef(fn);
  ref.current = fn;
  return React.useCallback(
    (...args: Parameters<T>) => ref.current(...args) as ReturnType<T>,
    []
  ) as T;
}

export default EditorPanel;
