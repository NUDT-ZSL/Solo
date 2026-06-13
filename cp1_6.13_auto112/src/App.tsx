import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Heatmap, { Attitude, FeedbackArea } from './Heatmap';
import { v4 as uuidv4 } from 'uuid';

interface Feedback {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  attitude: Attitude;
  comment: string;
  createdAt: number;
}

interface Project {
  id: string;
  code: string;
  title: string;
  description: string;
  contentType: 'text' | 'image';
  content: string;
  feedbacks: Feedback[];
  createdAt: number;
}

type ViewType = 'create' | 'join' | 'feedback';

const STORAGE_KEY = 'feedback_projects';
const MAX_COMMENT_LEN = 500;
const MOBILE_BREAKPOINT = 768;

const ATTITUDE_META: Record<Attitude, { label: string; color: string }> = {
  agree: { label: '同意', color: '#22c55e' },
  disagree: { label: '反对', color: '#ef4444' },
  discuss: { label: '需要讨论', color: '#f97316' },
  confuse: { label: '疑惑', color: '#a855f7' }
};

function loadProjects(): Record<string, Project> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveProjects(projects: Record<string, Project>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getUniqueCode(existing: Record<string, Project>): string {
  let code = generateInviteCode();
  let attempts = 0;
  while (existing[code] && attempts < 100) {
    code = generateInviteCode();
    attempts++;
  }
  return code;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

const globalStyles = `
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    background: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
      "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    color: #1e293b;
    -webkit-font-smoothing: antialiased;
  }
  button {
    cursor: pointer;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 14px;
    background: #e2e8f0;
    color: #334155;
    border-radius: 8px;
    padding: 10px 18px;
    transition: background 0.2s ease, transform 0.1s ease;
  }
  button:hover { background: #cbd5e1; }
  button:active { transform: scale(0.95); }
  button.primary {
    background: #3b82f6;
    color: white;
  }
  button.primary:hover { background: #2563eb; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  input, textarea {
    font-family: inherit;
    font-size: 14px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 12px;
    background: white;
    color: #1e293b;
    outline: none;
    transition: border-color 0.2s ease;
    width: 100%;
  }
  input:focus, textarea:focus { border-color: #3b82f6; }
  textarea { resize: vertical; min-height: 80px; }
  .card {
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  }
`;

export default function App() {
  const [view, setView] = useState<ViewType>('create');
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [projects, setProjects] = useState<Record<string, Project>>({});

  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  const currentProject = currentCode ? projects[currentCode] || null : null;

  const updateProject = useCallback(
    (code: string, updater: (p: Project) => Project) => {
      setProjects((prev) => {
        const target = prev[code];
        if (!target) return prev;
        const next = { ...prev, [code]: updater(target) };
        saveProjects(next);
        return next;
      });
    },
    []
  );

  const handleCreateProject = (data: {
    title: string;
    description: string;
    contentType: 'text' | 'image';
    content: string;
  }) => {
    const code = getUniqueCode(projects);
    const project: Project = {
      id: uuidv4(),
      code,
      title: data.title,
      description: data.description,
      contentType: data.contentType,
      content: data.content,
      feedbacks: [],
      createdAt: Date.now()
    };
    const next = { ...projects, [code]: project };
    setProjects(next);
    saveProjects(next);
    setCurrentCode(code);
    setView('feedback');
  };

  const handleJoinProject = (code: string) => {
    const upper = code.toUpperCase();
    if (projects[upper]) {
      setCurrentCode(upper);
      setView('feedback');
      return true;
    }
    return false;
  };

  const handleAddFeedback = (code: string, fb: Omit<Feedback, 'id' | 'createdAt'>) => {
    updateProject(code, (p) => ({
      ...p,
      feedbacks: [...p.feedbacks, { ...fb, id: uuidv4(), createdAt: Date.now() }]
    }));
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          minHeight: '100%'
        }}
      >
        {view === 'create' && (
          <CreateProjectView
            onCreate={handleCreateProject}
            onGoJoin={() => setView('join')}
          />
        )}
        {view === 'join' && (
          <JoinProjectView
            onJoin={handleJoinProject}
            onGoCreate={() => setView('create')}
          />
        )}
        {view === 'feedback' && currentProject && (
          <FeedbackView
            project={currentProject}
            onAddFeedback={(fb) => handleAddFeedback(currentProject.code, fb)}
            onBack={() => {
              setCurrentCode(null);
              setView('create');
            }}
          />
        )}
      </div>
    </>
  );
}

function CreateProjectView({
  onCreate,
  onGoJoin
}: {
  onCreate: (d: {
    title: string;
    description: string;
    contentType: 'text' | 'image';
    content: string;
  }) => void;
  onGoJoin: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'text' | 'image'>('text');
  const [textContent, setTextContent] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    title.trim().length > 0 &&
    ((contentType === 'text' && textContent.trim().length > 0) ||
      (contentType === 'image' && imageDataUrl.length > 0));

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      contentType,
      content: contentType === 'text' ? textContent : imageDataUrl
    });
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择 PNG 或 JPG 图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  return (
    <div style={{ padding: '40px 0' }}>
      <div
        className="card"
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '36px'
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>
          创建反馈项目
        </h1>
        <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: '14px' }}>
          上传讨论载体，生成邀请码，收集团队反馈
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>项目标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：新版首页设计方案"
            />
          </div>
          <div>
            <label style={labelStyle}>项目描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要介绍讨论背景和期望..."
              rows={3}
            />
          </div>

          <div>
            <label style={labelStyle}>讨论载体</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                className={contentType === 'text' ? 'primary' : ''}
                onClick={() => setContentType('text')}
                style={{ flex: 1 }}
              >
                粘贴文本
              </button>
              <button
                type="button"
                className={contentType === 'image' ? 'primary' : ''}
                onClick={() => setContentType('image')}
                style={{ flex: 1 }}
              >
                上传图片
              </button>
            </div>

            {contentType === 'text' ? (
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="粘贴需要讨论的文本内容..."
                rows={10}
              />
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease',
                  background: '#f8fafc'
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = '#3b82f6')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = '#cbd5e1')
                }
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageFile(f);
                  }}
                />
                {imageDataUrl ? (
                  <div>
                    <img
                      src={imageDataUrl}
                      alt="preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        borderRadius: '8px'
                      }}
                    />
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '12px' }}>
                      点击或拖拽更换图片（支持 PNG/JPG，≤5MB）
                    </p>
                  </div>
                ) : (
                  <div style={{ color: '#64748b' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️</div>
                    <p style={{ margin: '0 0 4px', fontSize: '14px' }}>
                      点击或拖拽上传图片
                    </p>
                    <p style={{ margin: 0, fontSize: '12px' }}>
                      支持 PNG / JPG 格式，大小不超过 5MB
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            className="primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
            style={{ marginTop: '8px', padding: '12px' }}
          >
            创建项目并生成邀请码
          </button>

          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <button
              onClick={onGoJoin}
              style={{ background: 'transparent', padding: '6px 12px' }}
            >
              已有邀请码？点击加入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function JoinProjectView({
  onJoin,
  onGoCreate
}: {
  onJoin: (code: string) => boolean;
  onGoCreate: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!code.trim()) {
      setError('请输入邀请码');
      return;
    }
    const ok = onJoin(code.trim());
    if (!ok) {
      setError('邀请码无效，请检查后重试');
    }
  };

  return (
    <div style={{ padding: '40px 0' }}>
      <div
        className="card"
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          padding: '36px'
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>
          加入反馈项目
        </h1>
        <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: '14px' }}>
          输入6位邀请码，参与项目讨论
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>邀请码</label>
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="请输入6位邀请码"
              style={{
                fontSize: '24px',
                letterSpacing: '8px',
                textAlign: 'center',
                padding: '16px'
              }}
              maxLength={6}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
            {error && (
              <p style={{ color: '#ef4444', fontSize: '13px', margin: '8px 0 0' }}>
                {error}
              </p>
            )}
          </div>

          <button
            className="primary"
            onClick={handleSubmit}
            disabled={code.length !== 6}
            style={{ padding: '12px' }}
          >
            加入项目
          </button>

          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <button
              onClick={onGoCreate}
              style={{ background: 'transparent', padding: '6px 12px' }}
            >
              创建新项目
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 500,
  color: '#475569'
};

function FeedbackView({
  project,
  onAddFeedback,
  onBack
}: {
  project: Project;
  onAddFeedback: (fb: Omit<Feedback, 'id' | 'createdAt'>) => void;
  onBack: () => void;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [leftRatio, setLeftRatio] = useState(0.5);
  const [topRatio, setTopRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [overlayMode, setOverlayMode] = useState<'overlay' | 'separate'>('overlay');

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [innerSize, setInnerSize] = useState({ width: 0, height: 0 });

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<typeof selection>(null);
  const [comment, setComment] = useState('');
  const [selectedAttitude, setSelectedAttitude] = useState<Attitude>('agree');

  const [showReport, setShowReport] = useState(false);

  const hasEnoughFeedback = project.feedbacks.length >= 3;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const measure = () => {
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        setContentSize({ width: rect.width, height: rect.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    const timer = setTimeout(measure, 100);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(timer);
    };
  }, [project.content, project.contentType, isMobile, leftRatio, topRatio]);

  useEffect(() => {
    if (project.contentType === 'image') {
      const img = new Image();
      img.onload = () => {
        setInnerSize({ width: img.width, height: img.height });
      };
      img.src = project.content;
    }
  }, [project.content, project.contentType]);

  const feedbackAreas: FeedbackArea[] = useMemo(
    () =>
      project.feedbacks.map((f) => ({
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        attitude: f.attitude
      })),
    [project.feedbacks]
  );

  const getClientPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('clientX' in e) {
      return { x: e.clientX, y: e.clientY };
    }
    return { x: 0, y: 0 };
  };

  const getRelativePos = (clientX: number, clientY: number) => {
    if (!contentRef.current) return { x: 0, y: 0 };
    const rect = contentRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, clientY - rect.top))
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging) return;
    const pos = getClientPos(e);
    const rel = getRelativePos(pos.x, pos.y);
    setIsSelecting(true);
    setSelectStart(rel);
    setSelection({ x: rel.x, y: rel.y, width: 0, height: 0 });
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSelecting || !selectStart) return;
    const pos = getClientPos(e);
    const rel = getRelativePos(pos.x, pos.y);
    const x = Math.min(selectStart.x, rel.x);
    const y = Math.min(selectStart.y, rel.y);
    const width = Math.abs(rel.x - selectStart.x);
    const height = Math.abs(rel.y - selectStart.y);
    setSelection({ x, y, width, height });
  };

  const handlePointerUp = () => {
    if (!isSelecting || !selection) {
      setIsSelecting(false);
      return;
    }
    if (selection.width > 10 && selection.height > 10) {
      setPendingSelection(selection);
      setComment('');
      setSelectedAttitude('agree');
      setShowCommentModal(true);
    }
    setIsSelecting(false);
    setSelectStart(null);
    if (!showCommentModal) {
      setTimeout(() => setSelection(null), 150);
    }
  };

  const handleSubmitComment = () => {
    if (!pendingSelection) return;
    onAddFeedback({
      x: pendingSelection.x,
      y: pendingSelection.y,
      width: pendingSelection.width,
      height: pendingSelection.height,
      attitude: selectedAttitude,
      comment: comment.trim()
    });
    setShowCommentModal(false);
    setPendingSelection(null);
    setSelection(null);
    setComment('');
  };

  const handleCancelComment = () => {
    setShowCommentModal(false);
    setPendingSelection(null);
    setSelection(null);
  };

  const handleDividerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const pos = getClientPos(ev);
      const rect = containerRef.current.getBoundingClientRect();

      if (isMobile) {
        const totalH = rect.height;
        let ratio = (pos.y - rect.top) / totalH;
        ratio = Math.max(0.2, Math.min(0.8, ratio));
        setTopRatio(ratio);
      } else {
        const totalW = rect.width;
        let ratio = (pos.x - rect.left) / totalW;
        ratio = Math.max(0.2, Math.min(0.8, ratio));
        setLeftRatio(ratio);
      }
    };

    const handleUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);
  };

  const reportStats = useMemo(() => {
    const counts: Record<Attitude, number> = {
      agree: 0,
      disagree: 0,
      discuss: 0,
      confuse: 0
    };
    project.feedbacks.forEach((f) => {
      counts[f.attitude]++;
    });
    return counts;
  }, [project.feedbacks]);

  return (
    <div style={{ padding: '24px 0', minHeight: '100%' }}>
      <div className="card" style={{ padding: '20px 24px', marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={onBack} style={{ padding: '8px 14px' }}>
              ← 返回
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {project.title}
              </h2>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '13px',
                  color: '#64748b'
                }}
              >
                {project.description || '暂无描述'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '2px'
              }}
            >
              邀请码：{project.code}
            </div>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              {project.feedbacks.length} 条反馈
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            flexWrap: 'wrap'
          }}
        >
          <button
            className={showHeatmap ? 'primary' : ''}
            onClick={() => setShowHeatmap((v) => !v)}
          >
            {showHeatmap ? '隐藏热力图' : '显示热力图'}
          </button>
          <button
            className={overlayMode === 'overlay' ? 'primary' : ''}
            onClick={() => setOverlayMode('overlay')}
          >
            叠加模式
          </button>
          <button
            className={overlayMode === 'separate' ? 'primary' : ''}
            onClick={() => setOverlayMode('separate')}
          >
            独立显示
          </button>
          {hasEnoughFeedback && (
            <button
              className={showReport ? 'primary' : ''}
              onClick={() => setShowReport((v) => !v)}
              style={{ marginLeft: 'auto' }}
            >
              {showReport ? '收起聚合报告' : '查看聚合报告'}
            </button>
          )}
          {!hasEnoughFeedback && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '13px',
                color: '#94a3b8',
                alignSelf: 'center'
              }}
            >
              再积累 {3 - project.feedbacks.length} 条反馈即可生成聚合报告
            </span>
          )}
        </div>
      </div>

      {hasEnoughFeedback && showReport && (
        <div
          className="card"
          style={{ padding: '20px 24px', marginBottom: '16px' }}
        >
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
            聚合报告
          </h3>
          <div
            style={{
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ flex: '0 0 280px' }}>
              <PieChart stats={reportStats} />
            </div>
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>
                各态度分布
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(Object.keys(ATTITUDE_META) as Attitude[]).map((att) => {
                  const count = reportStats[att];
                  const total = project.feedbacks.length;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div
                      key={att}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: ATTITUDE_META[att].color,
                          flexShrink: 0
                        }}
                      />
                      <span style={{ fontSize: '13px', width: '80px' }}>
                        {ATTITUDE_META[att].label}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: '8px',
                          background: '#f1f5f9',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: pct + '%',
                            height: '100%',
                            background: ATTITUDE_META[att].color,
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '13px',
                          color: '#64748b',
                          width: '50px',
                          textAlign: 'right'
                        }}
                      >
                        {count}条
                      </span>
                    </div>
                  );
                })}
              </div>

              <h4 style={{ margin: '16px 0 10px', fontSize: '14px', fontWeight: 600 }}>
                最新评论摘要
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {project.feedbacks
                  .slice()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .slice(0, 5)
                  .map((f) => (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '8px 10px',
                        background: '#f8fafc',
                        borderRadius: '8px'
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: ATTITUDE_META[f.attitude].color,
                          marginTop: '6px',
                          flexShrink: 0
                        }}
                      />
                      <span style={{ fontSize: '13px', color: '#475569' }}>
                        {truncate(f.comment || '（无文字评论）', 50)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="card"
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
          position: 'relative',
          minHeight: isMobile ? '600px' : '500px',
          height: 'calc(100vh - 200px)'
        }}
      >
        <div
          style={{
            flex: isMobile
              ? `0 0 ${topRatio * 100}%`
              : `0 0 ${leftRatio * 100}%`,
            position: 'relative',
            minWidth: 0,
            minHeight: 0,
            overflow: 'auto',
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            background: '#fafbfc'
          }}
        >
          <div
            ref={contentRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{
              position: 'relative',
              maxWidth: '100%',
              cursor: 'crosshair',
              userSelect: 'none',
              touchAction: 'none'
            }}
          >
            {project.contentType === 'text' ? (
              <div
                style={{
                  background: 'white',
                  padding: '24px',
                  borderRadius: '8px',
                  lineHeight: 1.8,
                  fontSize: '15px',
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minWidth: '300px',
                  border: '1px solid #e2e8f0'
                }}
              >
                {project.content}
              </div>
            ) : (
              <img
                src={project.content}
                alt="讨论内容"
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
                draggable={false}
              />
            )}

            {showHeatmap &&
              overlayMode === 'overlay' &&
              contentSize.width > 0 &&
              contentSize.height > 0 && (
                <Heatmap
                  width={contentSize.width}
                  height={contentSize.height}
                  feedbacks={feedbackAreas}
                  showOverlay={true}
                />
              )}

            {selection && (
              <div
                style={{
                  position: 'absolute',
                  left: selection.x,
                  top: selection.y,
                  width: selection.width,
                  height: selection.height,
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '2px solid #3b82f6',
                  borderRadius: '2px',
                  pointerEvents: 'none'
                }}
              />
            )}

            {project.feedbacks.map((f) => (
              <div
                key={f.id}
                style={{
                  position: 'absolute',
                  left: f.x,
                  top: f.y,
                  width: f.width,
                  height: f.height,
                  border: `2px solid ${ATTITUDE_META[f.attitude].color}`,
                  background: `${ATTITUDE_META[f.attitude].color}10`,
                  borderRadius: '3px',
                  pointerEvents: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '-9px',
                    left: '-9px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: ATTITUDE_META[f.attitude].color,
                    border: '2px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          onMouseDown={handleDividerDown}
          onTouchStart={handleDividerDown}
          style={{
            flexShrink: 0,
            width: isMobile ? '100%' : '4px',
            height: isMobile ? '4px' : '100%',
            background: isDragging ? '#3b82f6' : '#cbd5e1',
            cursor: isMobile ? 'row-resize' : 'col-resize',
            transition: 'background 0.2s ease',
            position: 'relative',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            if (!isDragging) e.currentTarget.style.background = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            if (!isDragging) e.currentTarget.style.background = '#cbd5e1';
          }}
        />

        <div
          style={{
            flex: 1,
            position: 'relative',
            minWidth: 0,
            minHeight: 0,
            overflow: 'auto',
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            background: '#f8fafc'
          }}
        >
          {overlayMode === 'separate' && showHeatmap ? (
            <div
              style={{
                position: 'relative',
                width: '100%',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  position: 'relative',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  width: contentSize.width > 0 ? contentSize.width : '100%',
                  height: contentSize.height > 0 ? contentSize.height : '300px',
                  minHeight: '200px'
                }}
              >
                {contentSize.width > 0 && contentSize.height > 0 && (
                  <Heatmap
                    width={contentSize.width}
                    height={contentSize.height}
                    feedbacks={feedbackAreas}
                    showOverlay={true}
                  />
                )}
                {contentSize.width === 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#94a3b8',
                      fontSize: '14px'
                    }}
                  >
                    加载中...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#94a3b8'
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {showHeatmap
                  ? '切换到"独立显示"模式查看独立热力图'
                  : '点击"显示热力图"查看反馈分布'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showCommentModal && pendingSelection && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={handleCancelComment}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>
              提交反馈
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>选择态度</label>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                {(Object.keys(ATTITUDE_META) as Attitude[]).map((att) => (
                  <button
                    key={att}
                    type="button"
                    onClick={() => setSelectedAttitude(att)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      background:
                        selectedAttitude === att
                          ? `${ATTITUDE_META[att].color}18`
                          : '#e2e8f0',
                      color: selectedAttitude === att ? ATTITUDE_META[att].color : '#334155',
                      border:
                        selectedAttitude === att
                          ? `2px solid ${ATTITUDE_META[att].color}`
                          : '2px solid transparent',
                      fontWeight: selectedAttitude === att ? 600 : 500
                    }}
                  >
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: ATTITUDE_META[att].color
                      }}
                    />
                    {ATTITUDE_META[att].label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>
                评论内容
                <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: '8px' }}>
                  {comment.length}/{MAX_COMMENT_LEN}
                </span>
              </label>
              <textarea
                value={comment}
                onChange={(e) =>
                  setComment(e.target.value.slice(0, MAX_COMMENT_LEN))
                }
                placeholder="请输入你对该区域的看法..."
                rows={5}
                maxLength={MAX_COMMENT_LEN}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={handleCancelComment}>取消</button>
              <button className="primary" onClick={handleSubmitComment}>
                提交反馈
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PieChart({ stats }: { stats: Record<Attitude, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const total = useMemo(
    () => Object.values(stats).reduce((a, b) => a + b, 0),
    [stats]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 280;
    const height = 240;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const cardX = 0;
    const cardY = 0;
    const cardW = width;
    const cardH = height;
    const radius = 12;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + radius, cardY);
    ctx.lineTo(cardX + cardW - radius, cardY);
    ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
    ctx.lineTo(cardX + cardW, cardY + cardH - radius);
    ctx.quadraticCurveTo(
      cardX + cardW,
      cardY + cardH,
      cardX + cardW - radius,
      cardY + cardH
    );
    ctx.lineTo(cardX + radius, cardY + cardH);
    ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
    ctx.lineTo(cardX, cardY + radius);
    ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';

    const cx = width / 2;
    const cy = 85;
    const r = 60;

    if (total === 0) {
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', cx, cy + 5);
    } else {
      let startAngle = -Math.PI / 2;
      const attitudes: Attitude[] = ['agree', 'disagree', 'discuss', 'confuse'];

      for (const att of attitudes) {
        const count = stats[att];
        if (count === 0) continue;
        const sliceAngle = (count / total) * Math.PI * 2;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = ATTITUDE_META[att].color;
        ctx.fill();

        startAngle = endAngle;
      }

      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(total), cx, cy - 2);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText('条反馈', cx, cy + 16);
    }

    const attitudes: Attitude[] = ['agree', 'disagree', 'discuss', 'confuse'];
    const legendY = 175;
    const legendItemW = width / 4;
    attitudes.forEach((att, i) => {
      const x = legendItemW * i + legendItemW / 2;
      ctx.beginPath();
      ctx.arc(x - 30, legendY, 5, 0, Math.PI * 2);
      ctx.fillStyle = ATTITUDE_META[att].color;
      ctx.fill();

      ctx.fillStyle = '#475569';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ATTITUDE_META[att].label, x - 20, legendY + 4);

      const pct = total > 0 ? ((stats[att] / total) * 100).toFixed(0) : '0';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${pct}%`, x - 20, legendY + 20);
    });
  }, [stats, total]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', margin: '0 auto' }}
    />
  );
}
