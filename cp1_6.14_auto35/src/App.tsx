import { useState, useEffect } from 'react';
import Board from './components/Board';
import BurndownChart from './components/BurndownChart';
import CardDetail from './components/CardDetail';
import {
  login,
  register,
  fetchProjects,
  createProject,
  joinProject,
} from './api';
import type { User, Project, Card } from './types';

type View = 'auth' | 'projectSelect' | 'board';

function App() {
  const [view, setView] = useState<View>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [formNickname, setFormNickname] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formMsg, setFormMsg] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [joinProjectId, setJoinProjectId] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('kanban_user');
    if (saved) {
      try {
        const u = JSON.parse(saved) as User;
        setUser(u);
        setView('projectSelect');
        loadProjects(u.id);
      } catch {}
    }
  }, []);

  const loadProjects = async (uid: string) => {
    const res = await fetchProjects(uid);
    if (res.code === 0) setProjects(res.data);
  };

  const handleAuth = async () => {
    setFormMsg('');
    if (!formNickname || !formPassword) {
      setFormMsg('请填写昵称和密码');
      return;
    }
    const res =
      authMode === 'login'
        ? await login(formNickname, formPassword)
        : await register(formNickname, formPassword);
    if (res.code === 0 && res.data) {
      setUser(res.data);
      localStorage.setItem('kanban_user', JSON.stringify(res.data));
      setView('projectSelect');
      loadProjects(res.data.id);
    } else {
      setFormMsg(res.message);
    }
  };

  const handleCreateProject = async () => {
    if (!user || !newProjectName.trim()) return;
    const res = await createProject(newProjectName.trim(), user.id);
    if (res.code === 0 && res.data) {
      setNewProjectName('');
      loadProjects(user.id);
    }
  };

  const handleJoinProject = async () => {
    if (!user || !joinProjectId.trim()) return;
    const res = await joinProject(joinProjectId.trim(), user.id);
    if (res.code === 0) {
      setJoinProjectId('');
      loadProjects(user.id);
    } else {
      alert(res.message);
    }
  };

  const enterProject = (p: Project) => {
    setCurrentProject(p);
    setView('board');
  };

  const logout = () => {
    localStorage.removeItem('kanban_user');
    setUser(null);
    setCurrentProject(null);
    setProjects([]);
    setView('auth');
  };

  const backToProjects = () => {
    setCurrentProject(null);
    setView('projectSelect');
    loadProjects(user!.id);
  };

  if (view === 'auth') {
    return (
      <div style={styles.authWrap}>
        <div style={styles.authCard} data-auth-card>
          <h1 style={styles.authTitle}>协作看板</h1>
          <div style={styles.authTabs}>
            <span
              style={{
                ...styles.authTab,
                ...(authMode === 'login' ? styles.authTabActive : {}),
              }}
              onClick={() => setAuthMode('login')}
            >
              登录
            </span>
            <span
              style={{
                ...styles.authTab,
                ...(authMode === 'register' ? styles.authTabActive : {}),
              }}
              onClick={() => setAuthMode('register')}
            >
              注册
            </span>
          </div>
          <input
            style={styles.authInput}
            placeholder="昵称"
            value={formNickname}
            onChange={(e) => setFormNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          />
          <input
            style={styles.authInput}
            placeholder="密码"
            type="password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          />
          {formMsg && <div style={styles.formMsg}>{formMsg}</div>}
          <button style={styles.authBtn} onClick={handleAuth}>
            {authMode === 'login' ? '登录' : '注册'}
          </button>
          <div style={styles.authHint}>
            提示：可使用示例账号 Alice / 123456 登录
          </div>
        </div>
      </div>
    );
  }

  if (view === 'projectSelect') {
    return (
      <div style={styles.projectWrap}>
        <div style={styles.projectHeader} data-navbar>
          <div style={styles.projectUser}>
            <div style={styles.userAvatar} data-user-avatar>{user?.avatar}</div>
            <span style={{ fontSize: 16 }}>{user?.nickname}</span>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>
            退出
          </button>
        </div>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
          <h2 style={{ fontSize: 28, marginBottom: 24 }}>我的项目</h2>
          <div style={styles.projectActions}>
            <div style={styles.projectActionGroup}>
              <input
                style={styles.paInput}
                placeholder="新项目名称"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
              <button style={styles.paBtn} onClick={handleCreateProject}>
                创建项目
              </button>
            </div>
            <div style={styles.projectActionGroup}>
              <input
                style={styles.paInput}
                placeholder="项目ID"
                value={joinProjectId}
                onChange={(e) => setJoinProjectId(e.target.value)}
              />
              <button style={styles.paBtnGhost} onClick={handleJoinProject}>
                加入项目
              </button>
            </div>
          </div>
          <div style={styles.projectGrid} data-project-grid>
            {projects.length === 0 ? (
              <div style={styles.emptyProjects}>暂无项目，请创建或加入一个</div>
            ) : (
              projects.map((p) => (
                <div
                  key={p.id}
                  style={styles.projectItem}
                  onClick={() => enterProject(p)}
                >
                  <div style={styles.projectItemName}>{p.name}</div>
                  <div style={styles.projectItemId}>ID: {p.id}</div>
                  <div style={styles.projectItemDate}>
                    创建于 {new Date(p.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.navbar} data-navbar>
        <div style={styles.navLeft}>
          <button style={styles.backBtn} onClick={backToProjects}>
            &larr;
          </button>
          <div style={styles.projectName} data-project-name>{currentProject?.name}</div>
        </div>
        <div style={styles.navRight}>
          <button style={styles.chartBtn} data-chart-btn onClick={() => setShowChart(true)}>
            生成燃尽图
          </button>
          <div style={styles.userAvatar} data-user-avatar>{user?.avatar}</div>
        </div>
      </div>

      <Board
        projectId={currentProject!.id}
        currentUser={user!}
        onSelectCard={(c) => setSelectedCard(c)}
      />

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          currentUser={user!}
          onClose={() => setSelectedCard(null)}
          onCardUpdated={(updated) => setSelectedCard(updated)}
        />
      )}

      {showChart && currentProject && (
        <BurndownChart
          projectId={currentProject.id}
          onClose={() => setShowChart(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    height: 60,
    background: '#1e1e2e',
    borderBottom: '1px solid #31314a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    flexShrink: 0,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: '#31314a',
    color: '#fff',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: {
    fontSize: 20,
    fontWeight: 600,
    color: '#fff',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  chartBtn: {
    height: 36,
    padding: '0 20px',
    borderRadius: 18,
    background: '#3b82f6',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.2s',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#8b5cf6',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
  },
  authWrap: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e1e2e, #2a2a3e)',
  },
  authCard: {
    width: 400,
    background: '#2a2a3e',
    borderRadius: 16,
    padding: 40,
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 28,
    textAlign: 'center',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  authTabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
    background: '#1e1e2e',
    padding: 4,
    borderRadius: 10,
  },
  authTab: {
    flex: 1,
    textAlign: 'center',
    padding: '10px 0',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    color: '#9ca3af',
    transition: 'all 0.2s',
  },
  authTabActive: {
    background: '#31314a',
    color: '#fff',
    fontWeight: 500,
  },
  authInput: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    background: '#1e1e2e',
    color: '#fff',
    padding: '0 16px',
    fontSize: 14,
    marginBottom: 12,
    border: '1px solid transparent',
    transition: 'border-color 0.2s',
  },
  authBtn: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    marginTop: 8,
  },
  formMsg: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  authHint: {
    marginTop: 16,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  projectWrap: {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
  },
  projectHeader: {
    height: 60,
    borderBottom: '1px solid #31314a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
  },
  projectUser: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoutBtn: {
    height: 36,
    padding: '0 16px',
    borderRadius: 8,
    background: '#31314a',
    color: '#fff',
    fontSize: 13,
  },
  projectActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  projectActionGroup: {
    display: 'flex',
    gap: 8,
  },
  paInput: {
    width: 240,
    height: 40,
    borderRadius: 8,
    background: '#2a2a3e',
    color: '#fff',
    padding: '0 14px',
    fontSize: 14,
    border: '1px solid #31314a',
  },
  paBtn: {
    height: 40,
    padding: '0 18px',
    borderRadius: 8,
    background: '#3b82f6',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
  },
  paBtnGhost: {
    height: 40,
    padding: '0 18px',
    borderRadius: 8,
    background: '#31314a',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
  },
  emptyProjects: {
    padding: '60px 0',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
  projectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },
  projectItem: {
    background: '#2a2a3e',
    borderRadius: 12,
    padding: 20,
    cursor: 'pointer',
    transition: 'transform 0.2s, background 0.2s',
    border: '1px solid transparent',
  },
  projectItemName: {
    fontSize: 17,
    fontWeight: 600,
    marginBottom: 8,
    color: '#fff',
  },
  projectItemId: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  projectItemDate: {
    fontSize: 12,
    color: '#6b7280',
  },
};

export default App;
