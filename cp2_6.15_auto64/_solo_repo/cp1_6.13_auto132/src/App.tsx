import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import PropsPanel from './components/PropsPanel';
import { debounce } from './utils/debounce';
import type { PropSchema, PropsMap } from './types';
import styles from './App.module.css';

const DEFAULT_CODE = `function MyButton(props) {
  const buttonStyle = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: props.borderRadius + 'px',
    backgroundColor: props.color,
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    opacity: props.disabled ? 0.5 : 1,
    transform: 'scale(' + (props.scale / 100) + ')',
    transition: 'all 0.2s ease',
    boxShadow: props.disabled ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.4)',
  };

  const handleMouseEnter = (e) => {
    if (!props.disabled) {
      e.target.style.transform = 'scale(' + ((props.scale + 5) / 100) + ')';
    }
  };

  const handleMouseLeave = (e) => {
    e.target.style.transform = 'scale(' + (props.scale / 100) + ')';
  };

  return (
    <button
      style={buttonStyle}
      disabled={props.disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => alert('按钮被点击了！')}
    >
      {props.text}
    </button>
  );
}

return MyButton;`;

const DEFAULT_SCHEMA: PropSchema[] = [
  {
    name: 'text',
    type: 'text',
    defaultValue: '点击我',
    label: '按钮文本',
  },
  {
    name: 'scale',
    type: 'slider',
    defaultValue: 100,
    min: 50,
    max: 150,
    step: 1,
    label: '缩放比例',
  },
  {
    name: 'borderRadius',
    type: 'slider',
    defaultValue: 8,
    min: 0,
    max: 24,
    step: 1,
    label: '圆角大小',
  },
  {
    name: 'color',
    type: 'color',
    defaultValue: '#6366f1',
    label: '按钮颜色',
  },
  {
    name: 'disabled',
    type: 'boolean',
    defaultValue: false,
    label: '禁用状态',
  },
];

const DEFAULT_PROPS: PropsMap = {
  text: '点击我',
  scale: 100,
  borderRadius: 8,
  color: '#6366f1',
  disabled: false,
};

const MOBILE_BREAKPOINT = 768;
const MIN_EDITOR_WIDTH = 200;
const MAX_EDITOR_WIDTH = 800;
const DEFAULT_EDITOR_WIDTH_PERCENT = 45;

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [props, setProps] = useState<PropsMap>(DEFAULT_PROPS);
  const [schema] = useState<PropSchema[]>(DEFAULT_SCHEMA);
  const [error, setError] = useState<string | null>(null);
  const [editorWidth, setEditorWidth] = useState<number>(DEFAULT_EDITOR_WIDTH_PERCENT);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(0);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        setMobileEditorOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const debouncedCodeChange = useMemo(
    () =>
      debounce((newCode: string) => {
        setCode(newCode);
      }, 300),
    []
  );

  const handleCodeChange = useCallback(
    (newCode: string) => {
      debouncedCodeChange(newCode);
    },
    [debouncedCodeChange]
  );

  const handlePropChange = useCallback((name: string, value: string | number | boolean) => {
    setProps((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleError = useCallback((newError: string | null) => {
    setError(newError);
  }, []);

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (isMobile) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dragStartXRef.current = clientX;
      dragStartWidthRef.current = editorWidth;
      setIsDragging(true);
    },
    [editorWidth, isMobile]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - dragStartXRef.current;
      const containerWidth = containerRef.current.offsetWidth;
      const deltaPercent = (deltaX / containerWidth) * 100;
      let newWidth = dragStartWidthRef.current + deltaPercent;

      const minWidthPercent = (MIN_EDITOR_WIDTH / containerWidth) * 100;
      const maxWidthPercent = (MAX_EDITOR_WIDTH / containerWidth) * 100;

      newWidth = Math.max(minWidthPercent, Math.min(maxWidthPercent, newWidth));
      setEditorWidth(newWidth);
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const toggleMobileEditor = useCallback(() => {
    setMobileEditorOpen((prev) => !prev);
  }, []);

  const toggleEditorCollapse = useCallback(() => {
    setEditorCollapsed((prev) => !prev);
  }, []);

  const previewWidth = isMobile ? 100 : 100 - editorWidth;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>ReactSandbox</h1>
        <p className={styles.subtitle}>在线React组件交互探索环境</p>
      </header>

      <div
        ref={containerRef}
        className={`${styles.mainContent} ${isDragging ? styles.dragging : ''}`}
        style={{ cursor: isDragging ? 'col-resize' : 'default' }}
      >
        {!isMobile && (
          <div
            className={styles.editorPanel}
            style={{ width: `${editorWidth}%` }}
          >
            <Editor
              code={code}
              onChange={handleCodeChange}
              error={error}
              onError={handleError}
              collapsed={editorCollapsed}
              onToggleCollapse={toggleEditorCollapse}
            />
          </div>
        )}

        {isMobile && mobileEditorOpen && (
          <div className={`${styles.mobileEditorOverlay} ${styles.mobileEditorOpen}`}>
            <div className={styles.mobileEditorHeader}>
              <span className={styles.mobileEditorTitle}>代码编辑器</span>
              <button
                className={styles.mobileCloseButton}
                onClick={toggleMobileEditor}
              >
                ✕
              </button>
            </div>
            <div className={styles.mobileEditorContent}>
              <Editor
                code={code}
                onChange={handleCodeChange}
                error={error}
                onError={handleError}
                collapsed={false}
                onToggleCollapse={() => {}}
              />
            </div>
          </div>
        )}

        {!isMobile && (
          <div
            className={`${styles.divider} ${isDragging ? styles.dividerActive : ''}`}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <div className={styles.dividerHandle} />
          </div>
        )}

        <div
          className={styles.previewPanel}
          style={{ width: `${previewWidth}%` }}
        >
          {isMobile && (
            <button
              className={styles.mobileEditorButton}
              onClick={toggleMobileEditor}
            >
              {mobileEditorOpen ? '隐藏编辑器' : '打开编辑器'}
            </button>
          )}
          <div className={styles.previewWrapper}>
            <Preview code={code} props={props} onError={handleError} />
          </div>
        </div>
      </div>

      <PropsPanel schema={schema} values={props} onChange={handlePropChange} />
    </div>
  );
}
