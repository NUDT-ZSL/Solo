import { useState, useEffect } from 'react';
import GoalPage from './pages/GoalPage.js';
import { goalApi } from './api.js';
import { Goal } from './types.js';
import { getCurrentUserId, getCurrentUserName, setCurrentUserName } from './types.js';

export default function App() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [userName, setUserName] = useState(getCurrentUserName());
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    goalApi.list().then((gs) => {
      setGoals(gs);
      setLoading(false);
      const last = localStorage.getItem('gw_last_goal');
      if (last && gs.some((g) => g._id === last)) {
        setSelectedGoalId(last);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedGoalId) localStorage.setItem('gw_last_goal', selectedGoalId);
  }, [selectedGoalId]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const userId = getCurrentUserId();
    const g = await goalApi.create({
      title: newTitle.trim(),
      description: newDesc.trim(),
      createdBy: userId,
      userName: userName || '我',
    });
    setGoals([g, ...goals]);
    setSelectedGoalId(g._id);
    setShowCreate(false);
    setNewTitle('');
    setNewDesc('');
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    try {
      const g = await goalApi.byInvite(inviteCode.trim().toUpperCase());
      await goalApi.join(g._id, { userId: getCurrentUserId(), name: userName || '我' });
      setGoals((gs) => (gs.some((x) => x._id === g._id) ? gs : [g, ...gs]));
      setSelectedGoalId(g._id);
      setShowInvite(false);
      setInviteCode('');
    } catch (e: any) {
      alert('邀请码无效');
    }
  };

  const handleSaveName = () => {
    const n = tempName.trim() || '我';
    setUserName(n);
    setCurrentUserName(n);
    setEditingName(false);
  };

  if (selectedGoalId) {
    return (
      <GoalPage
        goalId={selectedGoalId}
        userId={getCurrentUserId()}
        userName={userName}
        onBack={() => setSelectedGoalId(null)}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '48px 24px', color: '#fff' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>
              🌊 GoalWave
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }}>
              一起冲刺，点亮属于团队的目标进度树
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    width: 120,
                  }}
                />
                <button
                  onClick={handleSaveName}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#10b981',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  保存
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setTempName(userName);
                  setEditingName(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  fontSize: 14,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#6366f1,#ec4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {userName[0]}
                </div>
                <span>{userName}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '14px 28px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
              transition: 'transform 200ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
          >
            + 创建新目标
          </button>
          <button
            onClick={() => setShowInvite(true)}
            style={{
              padding: '14px 28px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 200ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          >
            🔑 输入邀请码加入
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>加载中...</p>
        ) : goals.length === 0 ? (
          <div
            style={{
              padding: 64,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              textAlign: 'center',
              border: '1px dashed rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 20 }}>🌱</div>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>还没有目标</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>
              创建一个新目标，或者通过邀请码加入团队的冲刺
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {goals.map((g) => (
              <div
                key={g._id}
                onClick={() => setSelectedGoalId(g._id)}
                style={{
                  padding: 24,
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                  transition: 'all 250ms cubic-bezier(0.4,0,0.2,1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>{g.title}</h3>
                {g.description && (
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                    {g.description}
                  </p>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 'auto',
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span>{new Date(g.createdAt).toLocaleDateString('zh-CN')}</span>
                  <span style={{ fontFamily: 'monospace', letterSpacing: 2 }}>#{g.inviteCode}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showCreate || showInvite) && (
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
          onClick={() => {
            setShowCreate(false);
            setShowInvite(false);
          }}
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
            }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
              {showCreate ? '创建新目标' : '通过邀请码加入'}
            </h2>
            {showCreate ? (
              <>
                <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                  目标名称 *
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：期末备考冲刺"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    marginBottom: 16,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                  描述（可选）
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="简述这个目标的意义..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    marginBottom: 24,
                    fontSize: 14,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowCreate(false)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newTitle.trim()}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 10,
                      border: 'none',
                      background: newTitle.trim()
                        ? 'linear-gradient(135deg,#10b981,#059669)'
                        : '#d1d5db',
                      color: '#fff',
                      cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    创建目标
                  </button>
                </div>
              </>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                  邀请码
                </label>
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="例如：A3K9XM"
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    marginBottom: 24,
                    fontSize: 20,
                    fontFamily: 'monospace',
                    letterSpacing: 8,
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowInvite(false)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleJoin}
                    disabled={inviteCode.trim().length < 6}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 10,
                      border: 'none',
                      background:
                        inviteCode.trim().length === 6
                          ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                          : '#d1d5db',
                      color: '#fff',
                      cursor: inviteCode.trim().length === 6 ? 'pointer' : 'not-allowed',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    加入
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
