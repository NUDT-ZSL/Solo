import { useState, useEffect, useRef } from 'react';
import { Task, TreeNode, buildTaskTree } from '../types.js';
import { taskApi } from '../api.js';

interface Props {
  task: Task;
  allTasks: Task[];
  userId: string;
  onTaskUpdated: (task: Task) => void;
  onHover?: (taskId: string | null) => void;
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

function calcSubtaskStats(task: Task, allTasks: Task[]): { total: number; completed: number; ratio: number } {
  const map = new Map<string, Task>();
  allTasks.forEach((t) => map.set(t._id, t));
  const children = allTasks.filter((t) => t.parentId === task._id);
  if (children.length === 0) {
    return { total: 1, completed: task.status === 'completed' ? 1 : 0, ratio: task.status === 'completed' ? 1 : 0 };
  }
  const calc = (parentId: string): { total: number; completed: number } => {
    const kids = allTasks.filter((t) => t.parentId === parentId);
    if (kids.length === 0) {
      const t = map.get(parentId);
      return { total: 1, completed: t?.status === 'completed' ? 1 : 0 };
    }
    let total = 0;
    let completed = 0;
    kids.forEach((k) => {
      const r = calc(k._id);
      total += r.total;
      completed += r.completed;
    });
    return { total, completed };
  };
  const { total, completed } = calc(task._id);
  return { total, completed, ratio: total === 0 ? 0 : completed / total };
}

function CircleProgress({
  progress,
  size = 40,
  strokeWidth = 3,
  color = '#10b981',
  bgColor = '#e5e7eb',
  label,
  subLabel,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label: string;
  subLabel?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', lineHeight: 1 }}>
          {label}
        </div>
        {subLabel && <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 2 }}>{subLabel}</div>}
      </div>
    </div>
  );
}

export default function TaskCard({ task, allTasks, userId, onTaskUpdated, onHover }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [closing, setClosing] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localTask, setLocalTask] = useState(task);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stats = calcSubtaskStats(localTask, allTasks);

  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  useEffect(() => {
    const updateElapsed = () => {
      let base = localTask.timeSpent || 0;
      if (localTask.status === 'in-progress' && localTask.startedAt) {
        base += Date.now() - localTask.startedAt;
      }
      setElapsed(base);
    };
    updateElapsed();
    timerRef.current = window.setInterval(updateElapsed, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [localTask.status, localTask.startedAt, localTask.timeSpent]);

  const handleStatusChange = async (e: React.MouseEvent, status: Task['status']) => {
    e.stopPropagation();
    try {
      const updated = await taskApi.updateStatus(localTask._id, status);
      if (status === 'in-progress') {
        updated.startedAt = updated.startedAt || Date.now();
      }
      if (status === 'completed') {
        await taskApi.updateTime(localTask._id, elapsed - (localTask.timeSpent || 0));
        updated.timeSpent = elapsed;
      }
      setLocalTask(updated);
      onTaskUpdated(updated);
    } catch {}
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 500);
    try {
      const updated = await taskApi.toggleLike(localTask._id, userId);
      setLocalTask(updated);
      onTaskUpdated(updated);
    } catch {}
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await taskApi.upload(localTask._id, file, (p) => setUploadProgress(p));
      setLocalTask(result.task);
      onTaskUpdated(result.task);
    } catch (err) {
      alert('上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleUpload(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
    e.target.value = '';
  };

  const closeModal = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setShowModal(false);
    }, 400);
  };

  const isLiked = localTask.likes?.includes(userId) || false;
  const timeProgress = Math.min(1, elapsed / 3600000);
  const rightLabel = Math.round(stats.ratio * 100) + '%';

  const statusColors = {
    pending: 'bg-gray-100 text-gray-600',
    'in-progress': 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };
  const statusText = {
    pending: '待开始',
    'in-progress': '进行中',
    completed: '已完成',
  };

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className={heartAnim ? 'heart-animate' : ''}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 18px',
          borderRadius: 12,
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          cursor: 'pointer',
          transition: 'background-color 200ms ease, box-shadow 200ms ease, transform 200ms ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
        onMouseEnter={(e) => {
          onHover?.(localTask._id);
          e.currentTarget.style.background = '#ecfdf5';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.15)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          onHover?.(null);
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          e.currentTarget.style.transform = '';
        }}
      >
        <CircleProgress
          progress={timeProgress}
          color={elapsed > 0 ? '#6366f1' : '#9ca3af'}
          label={formatDuration(elapsed)}
          subLabel="耗时"
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <h4
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: localTask.status === 'completed' ? '#10b981' : '#1f2937',
                textDecoration: localTask.status === 'completed' ? 'line-through' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {localTask.title}
            </h4>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                flexShrink: 0,
                background:
                  localTask.status === 'completed'
                    ? '#d1fae5'
                    : localTask.status === 'in-progress'
                    ? '#fef3c7'
                    : '#f3f4f6',
                color:
                  localTask.status === 'completed'
                    ? '#047857'
                    : localTask.status === 'in-progress'
                    ? '#b45309'
                    : '#4b5563',
              }}
            >
              {statusText[localTask.status]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#6b7280' }}>
            {localTask.assigneeName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#6366f1,#ec4899)',
                    fontSize: 9,
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {localTask.assigneeName[0]}
                </span>
                {localTask.assigneeName}
              </span>
            )}
            {localTask.deadline && (
              <span>📅 {new Date(localTask.deadline).toLocaleDateString('zh-CN')}</span>
            )}
            {stats.total > 1 && <span>📊 {stats.completed}/{stats.total} 子任务</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CircleProgress
            progress={stats.ratio}
            color={localTask.status === 'completed' ? '#10b981' : '#6366f1'}
            label={rightLabel}
            subLabel="完成"
          />
          <button
            onClick={handleLike}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isLiked ? '#ef4444' : '#9ca3af',
              transition: 'color 200ms',
            }}
          >
            {isLiked ? '❤️' : '🤍'}
            <span style={{ fontSize: 11, marginLeft: 2, color: '#6b7280' }}>
              {localTask.likes?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            animation: 'fadeIn 200ms ease-out',
          }}
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 560,
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 28,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: closing ? 'modalSlideDown 400ms ease-in forwards' : 'modalSlideUp 300ms ease-out',
              position: 'relative',
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.05)',
                cursor: 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                transition: 'all 200ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
            >
              ✕
            </button>

            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 6,
                color: '#1f2937',
                paddingRight: 40,
              }}
            >
              {localTask.title}
            </h2>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background:
                    localTask.status === 'completed'
                      ? '#d1fae5'
                      : localTask.status === 'in-progress'
                      ? '#fef3c7'
                      : '#f3f4f6',
                  color:
                    localTask.status === 'completed'
                      ? '#047857'
                      : localTask.status === 'in-progress'
                      ? '#b45309'
                      : '#4b5563',
                }}
              >
                {statusText[localTask.status]}
              </span>
              {localTask.assigneeName && (
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: '#eef2ff',
                    color: '#4338ca',
                  }}
                >
                  👤 {localTask.assigneeName}
                </span>
              )}
              {localTask.deadline && (
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: '#fdf4ff',
                    color: '#a21caf',
                  }}
                >
                  📅 截止: {new Date(localTask.deadline).toLocaleDateString('zh-CN')}
                </span>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                任务描述
              </h3>
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7 }}>
                {localTask.description || '暂无描述'}
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                进度
              </h3>
              <div style={{ display: 'flex', gap: 16 }}>
                <div
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 12,
                    background: '#f9fafb',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }}>
                    {formatDuration(elapsed)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>累计耗时</div>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 12,
                    background: '#f9fafb',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                    {Math.round(stats.ratio * 100)}%
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    子任务完成 ({stats.completed}/{stats.total})
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                更改状态
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['pending', 'in-progress', 'completed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={(e) => handleStatusChange(e, s)}
                    disabled={localTask.status === s}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 10,
                      border: localTask.status === s ? '1px solid transparent' : '1px solid #e5e7eb',
                      background:
                        localTask.status === s
                          ? s === 'completed'
                            ? '#10b981'
                            : s === 'in-progress'
                            ? '#f59e0b'
                            : '#6b7280'
                          : '#fff',
                      color: localTask.status === s ? '#fff' : '#374151',
                      cursor: localTask.status === s ? 'default' : 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      transition: 'all 200ms',
                    }}
                  >
                    {statusText[s]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                附件
              </h3>
              {localTask.attachments && localTask.attachments.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  {localTask.attachments.map((url, i) => (
                    <div
                      key={i}
                      style={{
                        borderRadius: 8,
                        overflow: 'hidden',
                        aspectRatio: '1',
                        background: '#f3f4f6',
                      }}
                    >
                      <img
                        src={url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: dragOver ? '2px dashed #10b981' : '2px dashed #d1d5db',
                  borderRadius: 12,
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? '#ecfdf5' : '#fafafa',
                  transition: 'all 200ms',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
                <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 500 }}>
                  拖拽图片到此处，或点击上传
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  支持 JPG、PNG、GIF，最大 10MB
                </div>
                {uploading && (
                  <div style={{ marginTop: 12 }}>
                    <div
                      style={{
                        height: 4,
                        background: '#e5e7eb',
                        borderRadius: 2,
                        overflow: 'hidden',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${uploadProgress}%`,
                          background: 'linear-gradient(90deg,#10b981,#34d399)',
                          transition: 'width 150ms',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      上传中 {uploadProgress}%
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                paddingTop: 16,
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <button
                onClick={handleLike}
                className={heartAnim ? 'heart-animate' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid #fecaca',
                  background: isLiked ? '#fef2f2' : '#fff',
                  color: isLiked ? '#dc2626' : '#374151',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {isLiked ? '❤️' : '🤍'} 点赞 ({localTask.likes?.length || 0})
              </button>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#6366f1',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
