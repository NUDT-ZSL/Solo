import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useStore } from './store';
import OutlinePanel from './OutlinePanel';
import EditorPanel from './EditorPanel';
import AnalysisPanel from './AnalysisPanel';
import type { Project } from './types';
import { getUserColorById } from './utils/colorUtils';

const Landing: React.FC = () => {
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();
  const setUser = useStore((s) => s.setUser);

  const handleEnter = () => {
    if (!userName.trim()) return;
    const userId = uuidv4();
    const color = getUserColorById(userId);
    setUser(userId, userName.trim(), color);
    navigate('/project/demo-project');
  };

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-logo">StoryWeave</div>
        <p className="landing-subtitle">创意写作协作 · 智能文学分析</p>
      </div>
      <div className="landing-card">
        <div className="landing-form">
          <div className="form-field">
            <label>输入你的名字以开始协作</label>
            <input
              className="landing-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
              placeholder="例如：林小雨"
              autoFocus
            />
          </div>
          <button
            className="btn btn-primary ripple landing-btn"
            onClick={handleEnter}
            disabled={!userName.trim()}
          >
            进入写作空间
          </button>
        </div>
      </div>
    </div>
  );
};

const ProjectPage: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const userId = useStore((s) => s.userId);
  const userName = useStore((s) => s.userName);
  const userColor = useStore((s) => s.userColor);
  const project = useStore((s) => s.project);
  const onlineUsers = useStore((s) => s.onlineUsers);
  const analysisPanelWidth = useStore((s) => s.analysisPanelWidth);
  const drawerOpen = useStore((s) => s.drawerOpen);
  const currentChapterId = useStore((s) => s.currentChapterId);
  const setProject = useStore((s) => s.setProject);
  const addOnlineUser = useStore((s) => s.addOnlineUser);
  const removeOnlineUser = useStore((s) => s.removeOnlineUser);
  const updateRemoteCursor = useStore((s) => s.updateRemoteCursor);
  const removeRemoteCursor = useStore((s) => s.removeRemoteCursor);
  const updateChapterContent = useStore((s) => s.updateChapterContent);
  const setAnalysisPanelWidth = useStore((s) => s.setAnalysisPanelWidth);
  const setDrawerOpen = useStore((s) => s.setDrawerOpen);

  const [resizerDragging, setResizerDragging] = useState(false);
  const [drawerDragging, setDrawerDragging] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(300);
  const mainLayoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId || !userName) {
      navigate('/');
      return;
    }

    const fetchProject = async () => {
      try {
        const res = await axios.get(`/api/projects/${projectId}`);
        setProject(res.data);
      } catch (e) {
        console.error('Failed to fetch project:', e);
      }
    };
    fetchProject();

    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-project', {
        projectId,
        userId,
        userName,
        color: userColor,
      });
    });

    socket.on('project-state', (state: Project) => {
      setProject(state);
    });

    socket.on('user-joined', (user: { id: string; name: string; color: string }) => {
      if (user.id !== userId) {
        const userColorById = getUserColorById(user.id);
        addOnlineUser({ ...user, color: userColorById });
      }
    });

    socket.on('user-left', (data: { userId: string }) => {
      removeOnlineUser(data.userId);
      removeRemoteCursor(data.userId);
    });

    socket.on('edit-broadcast', (data: { userId: string; chapterId: string; content: string }) => {
      if (data.userId !== userId) {
        updateChapterContent(data.chapterId, data.content);
      }
    });

    socket.on('cursor-broadcast', (data: { userId: string; cursor: any; chapterId?: string }) => {
      if (data.userId !== userId) {
        const onlineUser = onlineUsers.find((u) => u.id === data.userId);
        if (onlineUser) {
          updateRemoteCursor({
            userId: data.userId,
            userName: onlineUser.name,
            color: getUserColorById(data.userId),
            cursor: data.cursor,
            chapterId: data.chapterId || currentChapterId || '',
          });
        }
      }
    });

    return () => {
      socket.emit('leave-project', { projectId, userId });
      socket.disconnect();
    };
  }, [userId, userName, projectId, userColor, onlineUsers, currentChapterId]);

  useEffect(() => {
    if (userId && userName) {
      addOnlineUser({ id: userId, name: userName, color: userColor });
    }
  }, [userId, userName, userColor]);

  useEffect(() => {
    if (!resizerDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!mainLayoutRef.current) return;
      const rect = mainLayoutRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
      setAnalysisPanelWidth(Math.max(280, Math.min(560, newWidth)));
    };
    const handleMouseUp = () => setResizerDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizerDragging]);

  useEffect(() => {
    if (!drawerDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      setDrawerHeight(Math.max(150, Math.min(window.innerHeight * 0.7, newHeight)));
    };
    const handleMouseUp = () => setDrawerDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drawerDragging]);

  if (!project) {
    return (
      <div className="landing-page">
        <div style={{ color: 'var(--text-muted)' }}>加载项目中...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="top-nav">
        <div className="top-nav-title">
          <span className="logo-dot" />
          {project.title}
        </div>
        <div className="online-users">
          {onlineUsers.map((u) => (
            <div key={u.id} className="user-badge">
              <span className="avatar-dot" style={{ background: u.color }} />
              {u.name}
            </div>
          ))}
        </div>
      </nav>

      <div className="main-layout" ref={mainLayoutRef}>
        <OutlinePanel />

        <EditorPanel socket={socketRef.current} />

        <div
          className={`resizer ${resizerDragging ? 'dragging' : ''}`}
          onMouseDown={() => setResizerDragging(true)}
        />

        <aside className="analysis-panel" style={{ width: analysisPanelWidth }}>
          <div className="panel-header">
            <span>智能分析</span>
          </div>
          <AnalysisPanel />
        </aside>
      </div>

      <div
        className={`bottom-drawer ${drawerOpen ? 'open' : ''}`}
        style={drawerOpen ? { height: drawerHeight, maxHeight: '70vh' } : undefined}
      >
        <div
          className="drawer-handle"
          onMouseDown={() => {
            if (!drawerOpen) {
              setDrawerOpen(true);
            } else {
              setDrawerDragging(true);
            }
          }}
          onDoubleClick={() => setDrawerOpen(!drawerOpen)}
        />
        <div className="drawer-content">
          <AnalysisPanel />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/project/:id" element={<ProjectPage />} />
    </Routes>
  );
};

export default App;
