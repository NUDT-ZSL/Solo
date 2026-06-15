import { useState, useEffect, useMemo, useCallback } from 'react';
import GoalTree from '../components/GoalTree.js';
import TaskCard from '../components/TaskCard.js';
import { goalApi, taskApi } from '../api.js';
import { Goal, Task, Member, buildTaskTree } from '../types.js';

interface Props {
  goalId: string;
  userId: string;
  userName: string;
  onBack: () => void;
}

export default function GoalPage({ goalId, userId, userName, onBack }: Props) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [g, t, m] = await Promise.all([
        goalApi.get(goalId),
        taskApi.listByGoal(goalId),
        goalApi.members(goalId),
      ]);
      setGoal(g);
      setTasks(t);
      setMembers(m);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTaskUpdated = useCallback((updated: Task) => {
    setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
  }, []);

  const handleHover = useCallback((taskId: string | null) => {
    setHighlightTaskId(taskId);
  }, []);

  const tree = useMemo(() => buildTaskTree(tasks), [tasks]);
  const rootTasks = useMemo(() => tasks.filter((t) => !t.parentId), [tasks]);

  const handleCopyInvite = async () => {
    if (goal) {
      try {
        await navigator.clipboard.writeText(goal.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const overallProgress = totalCount === 0 ? 0 : completedCount / totalCount;

  return (
    <div style={{ minHeight: '100vh', color: '#fff' }}>
      <div
        style={{
          padding: '20px 24px',
          backdropFilter: 'blur(12px)',
          background: 'rgba(15,23,42,0.4)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <button
            onClick={onBack}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 200ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            ← 返回
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {goal?.title}
            </h1>
            {goal?.description && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                {goal.description}
              </p>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>
                {Math.round(overallProgress * 100)}%
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
                {completedCount}/{totalCount}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowInvite(true)}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
              transition: 'transform 200ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
          >
            👥 邀请成员
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              borderRadius: 20,
              background: 'rgba(15,23,42,0.5)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              height: 420,
            }}
          >
            <div style={{ height: '100%' }}>
              <GoalTree
                tree={tree}
                members={members}
                highlightTaskId={highlightTaskId}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 20px',
              borderRadius: 16,
              background: 'rgba(15,23,42,0.5)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflowX: 'auto',
            }}
          >
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
              团队成员 ({members.length})
            </span>
            <div style={{ display: 'flex', gap: -8 }}>
              {members.map((m, i) => (
                <div
                  key={m._id}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '2px solid #fff',
                    background:
                      '#' +
                      m.name
                        .split('')
                        .reduce((acc, c) => acc + c.charCodeAt(0).toString(16), '')
                        .padEnd(6, 'f')
                        .slice(0, 6),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                    marginLeft: i === 0 ? 0 : -8,
                    position: 'relative',
                    zIndex: members.length - i,
                  }}
                  title={m.name}
                >
                  {m.name[0]}
                </div>
              ))}
            </div>
          </div>
        </div>

        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 16,
            color: 'rgba(255,255,255,0.9)',
            paddingLeft: 4,
          }}
        >
          📋 任务列表
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
            gap: 14,
          }}
        >
          {rootTasks.map((t) => (
            <TaskCard
              key={t._id}
              task={t}
              allTasks={tasks}
              userId={userId}
              onTaskUpdated={handleTaskUpdated}
              onHover={handleHover}
            />
          ))}
        </div>
      </div>

      {showInvite && goal && (
        <div
          className="fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowInvite(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 440,
              padding: 32,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              color: '#1f2937',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              邀请团队成员
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
              分享以下邀请码，让成员加入你的目标冲刺
            </p>
            <div
              style={{
                padding: '18px 24px',
                borderRadius: 14,
                background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)',
                border: '1px solid #c7d2fe',
                marginBottom: 20,
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
              onClick={handleCopyInvite}
            >
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: 12,
                  color: '#4338ca',
                }}
              >
                {goal.inviteCode}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#6366f1',
                  marginTop: 6,
                  fontWeight: 500,
                }}
              >
                {copied ? '✓ 已复制到剪贴板' : '点击复制邀请码'}
              </div>
            </div>
            <button
              onClick={() => setShowInvite(false)}
              style={{
                padding: '10px 28px',
                borderRadius: 10,
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
