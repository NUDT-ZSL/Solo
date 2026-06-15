import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import BoardView from './components/BoardView';
import GanttView from './components/GanttView';
import StatsDashboard from './components/StatsDashboard';
import { useWebSocket } from './hooks/useWebSocket';
import {
  Card,
  List as ListType,
  Member,
  Project,
  ViewMode,
  ToastNotification,
  Priority,
  Comment,
} from './types';

const CURRENT_USER_EMAIL = 'demo@example.com';
const CURRENT_USER_NAME = '演示用户';

type PendingActionType = 'addCard' | 'moveCard';

interface PendingAction {
  id: string;
  type: PendingActionType;
  timestamp: number;
  payload: Record<string, unknown>;
  executed?: boolean;
}

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [lists, setLists] = useState<ListType[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const pendingActionsRef = useRef<PendingAction[]>([]);
  const syncingRef = useRef<boolean>(false);

  const addToast = useCallback((message: string, type: ToastNotification['type'] = 'info') => {
    const id = uuidv4();
    const toast: ToastNotification = { id, message, type, visible: true };
    setToasts((prev) => [...prev, toast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleCardCreated = useCallback(
    (data: unknown) => {
      const typedData = data as { card: Card; creatorEmail: string; timestamp: string };
      if (typedData.creatorEmail === CURRENT_USER_EMAIL) return;

      setCards((prev) => {
        if (prev.some((c) => c.id === typedData.card.id)) return prev;
        return [...prev, typedData.card];
      });

      addToast(`新任务「${typedData.card.title}」已创建`, 'info');
    },
    [addToast]
  );

  const handleCardUpdated = useCallback(
    (data: unknown) => {
      const typedData = data as { card: Card; changerEmail: string; timestamp: string };
      if (typedData.changerEmail === CURRENT_USER_EMAIL) return;

      setCards((prev) =>
        prev.map((c) => (c.id === typedData.card.id ? typedData.card : c))
      );

      addToast(`任务「${typedData.card.title}」已更新`, 'info');
    },
    [addToast]
  );

  const handleCardDeleted = useCallback(
    (data: unknown) => {
      const typedData = data as { cardId: string; deleterEmail: string; timestamp: string };
      if (typedData.deleterEmail === CURRENT_USER_EMAIL) return;

      const deletedCard = cards.find((c) => c.id === typedData.cardId);
      setCards((prev) => prev.filter((c) => c.id !== typedData.cardId));

      if (deletedCard) {
        addToast(`任务「${deletedCard.title}」已删除`, 'warning');
      }
    },
    [addToast, cards]
  );

  const handleCommentAdded = useCallback(
    (data: unknown) => {
      const typedData = data as { comment: Comment; cardTitle: string; timestamp: string };
      if (typedData.comment.author === CURRENT_USER_EMAIL) return;

      addToast(
        `「${typedData.cardTitle}」有新评论：${typedData.comment.content.slice(0, 20)}...`,
        'info'
      );
    },
    [addToast]
  );

  const handleMemberJoined = useCallback(
    (data: unknown) => {
      const typedData = data as { member: Member; timestamp: string };
      setMembers((prev) => {
        if (prev.some((m) => m.id === typedData.member.id)) return prev;
        return [...prev, typedData.member];
      });

      if (typedData.member.email !== CURRENT_USER_EMAIL) {
        addToast(`${typedData.member.name} 加入了项目`, 'success');
      }
    },
    [addToast]
  );

  const { isConnected } = useWebSocket({
    userId: CURRENT_USER_EMAIL,
    projectId: selectedProjectId || undefined,
    onCardCreated: handleCardCreated,
    onCardUpdated: handleCardUpdated,
    onCardDeleted: handleCardDeleted,
    onCommentAdded: handleCommentAdded,
    onMemberJoined: handleMemberJoined,
  });

  const flushPendingActions = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const pending = [...pendingActionsRef.current];
    pendingActionsRef.current = [];

    if (pending.length === 0) {
      syncingRef.current = false;
      return;
    }

    addToast(`正在同步 ${pending.length} 条离线操作...`, 'info');

    const deduped: PendingAction[] = [];
    const seen = new Map<string, PendingAction>();

    pending.forEach((action) => {
      if (action.type === 'moveCard') {
        const key = `move_${action.payload.cardId as string}`;
        seen.set(key, action);
      } else {
        deduped.push(action);
      }
    });
    seen.forEach((v) => deduped.push(v));

    deduped.sort((a, b) => a.timestamp - b.timestamp);

    let successCount = 0;
    let failCount = 0;

    for (const action of deduped) {
      try {
        if (action.type === 'addCard') {
          const { listId, title, description, priority, dueDate, assignee, tempCardId } = action.payload as {
            listId: string; title: string; description: string; priority: Priority;
            dueDate: string | null; assignee: string | null; tempCardId: string;
          };

          const res = await fetch(`/api/lists/${listId}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, priority, dueDate, assignee, userEmail: CURRENT_USER_EMAIL }),
          });

          if (res.ok) {
            const serverCard = await res.json();
            setCards((prev) => prev.map((c) => (c.id === tempCardId ? serverCard : c)));
            successCount++;
          } else {
            failCount++;
            setCards((prev) => prev.filter((c) => c.id !== tempCardId));
          }
        } else if (action.type === 'moveCard') {
          const { cardId, newListId, newOrder } = action.payload as {
            cardId: string; newListId: string; newOrder: number;
          };

          const res = await fetch(`/api/cards/${cardId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newListId, newOrder, userEmail: CURRENT_USER_EMAIL }),
          });

          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        }
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) addToast(`成功同步 ${successCount} 条操作`, 'success');
    if (failCount > 0) addToast(`${failCount} 条操作同步失败`, 'warning');

    syncingRef.current = false;
  }, [addToast]);

  const loadAllData = useCallback(async () => {
    try {
      const [projectsRes, listsRes, cardsRes] = await Promise.all([
        fetch('/api/projects'),
        selectedProjectId ? fetch(`/api/projects/${selectedProjectId}/lists`) : Promise.resolve(null),
        selectedProjectId ? fetch(`/api/projects/${selectedProjectId}/cards`) : Promise.resolve(null),
      ]);

      if (projectsRes.ok) {
        const projectData = await projectsRes.json();
        setProjects(projectData);
        if (!selectedProjectId && projectData.length > 0) {
          setSelectedProjectId(projectData[0].id);
        }
      }

      if (listsRes && listsRes.ok) {
        const listData = await listsRes.json();
        setLists(listData);
      }

      if (cardsRes && cardsRes.ok) {
        const cardData = await cardsRes.json();
        setCards(cardData);
      }

      if (selectedProjectId) {
        const membersRes = await fetch(`/api/projects/${selectedProjectId}/members`);
        if (membersRes.ok) {
          const memberData = await membersRes.json();
          setMembers(memberData);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      addToast('网络已恢复', 'success');
      try {
        await loadAllData();
      } catch {
        console.warn('Initial load failed, proceeding with sync');
      }
      await flushPendingActions();
      await loadAllData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast('网络已断开，您的操作将在恢复后同步', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast, loadAllData, flushPendingActions]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const handleAddCard = useCallback(
    (
      listId: string,
      title: string,
      description: string,
      priority: Priority,
      dueDate: string | null,
      assignee: string | null
    ) => {
      const tempCard: Card = {
        id: uuidv4(),
        listId,
        title,
        description,
        priority,
        dueDate,
        assignee,
        order: cards.filter((c) => c.listId === listId).length,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };

      setCards((prev) => [...prev, tempCard]);

      if (!isOnline) {
        const action: PendingAction = {
          id: uuidv4(),
          type: 'addCard',
          timestamp: Date.now(),
          payload: { listId, title, description, priority, dueDate, assignee, tempCardId: tempCard.id },
        };
        pendingActionsRef.current.push(action);
        return;
      }

      fetch(`/api/lists/${listId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priority,
          dueDate,
          assignee,
          userEmail: CURRENT_USER_EMAIL,
        }),
      })
        .then((res) => res.json())
        .then((serverCard) => {
          setCards((prev) => prev.map((c) => (c.id === tempCard.id ? serverCard : c)));
        })
        .catch(() => {
          addToast('创建卡片失败，请检查网络', 'error');
          setCards((prev) => prev.filter((c) => c.id !== tempCard.id));
        });
    },
    [cards, isOnline, addToast]
  );

  const handleMoveCard = useCallback(
    (cardId: string, newListId: string, newOrder: number) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;

      const oldListId = card.listId;
      const oldOrder = card.order;

      setCards((prev) => {
        const updated = prev.map((c) => {
          if (c.id === cardId) {
            return { ...c, listId: newListId, order: newOrder };
          }
          return c;
        });

        const targetCards = updated
          .filter((c) => c.listId === newListId && c.id !== cardId)
          .sort((a, b) => a.order - b.order)
          .map((c, index) => ({
            ...c,
            order: index >= newOrder ? index + 1 : index,
          }));

        const sourceCards = updated
          .filter((c) => c.listId === oldListId && c.id !== cardId)
          .sort((a, b) => a.order - b.order)
          .map((c, index) => ({ ...c, order: index }));

        const otherCards = updated.filter(
          (c) => c.listId !== newListId && c.listId !== oldListId
        );

        return [
          ...otherCards,
          ...targetCards,
          ...sourceCards,
          { ...card, listId: newListId, order: newOrder },
        ];
      });

      if (!isOnline) {
        const action: PendingAction = {
          id: uuidv4(),
          type: 'moveCard',
          timestamp: Date.now(),
          payload: { cardId, newListId, newOrder },
        };
        pendingActionsRef.current.push(action);
        return;
      }

      fetch(`/api/cards/${cardId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newListId,
          newOrder,
          userEmail: CURRENT_USER_EMAIL,
        }),
      }).catch(() => {
        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, listId: oldListId, order: oldOrder } : c))
        );
        addToast('移动卡片失败，请检查网络', 'error');
      });
    },
    [cards, isOnline, addToast]
  );

  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) {
      addToast('请输入项目名称', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc.trim(),
          ownerEmail: CURRENT_USER_EMAIL,
        }),
      });

      if (res.ok) {
        const project = await res.json();
        setProjects((prev) => [...prev, project]);
        setSelectedProjectId(project.id);
        setShowNewProjectModal(false);
        setNewProjectName('');
        setNewProjectDesc('');
        addToast('项目创建成功', 'success');
      }
    } catch (error) {
      addToast('创建项目失败', 'error');
    }
  }, [newProjectName, newProjectDesc, addToast]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !selectedProjectId) {
      addToast('请输入有效的邮箱地址', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        addToast(`邀请已发送，邀请链接：${data.inviteLink}`, 'success');
        setShowInviteModal(false);
        setInviteEmail('');
      }
    } catch (error) {
      addToast('发送邀请失败', 'error');
    }
  }, [inviteEmail, selectedProjectId, addToast]);

  const projectLists = lists.filter((l) => l.projectId === selectedProjectId);
  const projectCards = cards.filter((c) =>
    projectLists.some((l) => l.id === c.listId)
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">📋</span>
            <span className="logo-text">LightFlow</span>
          </div>
          <div className="project-selector">
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="project-select"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="new-project-btn" onClick={() => setShowNewProjectModal(true)}>
              + 新建项目
            </button>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${viewMode === 'board' ? 'active' : ''}`}
            onClick={() => setViewMode('board')}
          >
            📊 看板
          </button>
          <button
            className={`nav-tab ${viewMode === 'gantt' ? 'active' : ''}`}
            onClick={() => setViewMode('gantt')}
          >
            📅 甘特图
          </button>
          <button
            className={`nav-tab ${viewMode === 'stats' ? 'active' : ''}`}
            onClick={() => setViewMode('stats')}
          >
            📈 统计
          </button>
        </nav>

        <div className="header-right">
          {!isOnline && (
            <div className="offline-indicator" title="网络已断开">
              📴 离线
            </div>
          )}
          {isOnline && isConnected && (
            <div className="online-indicator" title="已连接">
              🟢 在线
            </div>
          )}
          <button
            className="invite-btn"
            onClick={() => setShowInviteModal(true)}
            disabled={!selectedProjectId}
          >
            + 邀请成员
          </button>
          <div className="user-avatar" title={CURRENT_USER_NAME}>
            {CURRENT_USER_NAME.charAt(0)}
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="offline-banner fade-in">
          <span className="offline-banner-icon">📴</span>
          <span className="offline-banner-text">
            当前处于离线状态，您的操作将在网络恢复后自动同步
          </span>
          <span className="offline-banner-spinner" />
        </div>
      )}

      <main className="app-main">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>加载中...</p>
          </div>
        ) : (
          <>
            {viewMode === 'board' && selectedProjectId && (
              <BoardView
                lists={projectLists}
                cards={projectCards}
                members={members}
                currentUserEmail={CURRENT_USER_EMAIL}
                onAddCard={handleAddCard}
                onMoveCard={handleMoveCard}
              />
            )}

            {viewMode === 'gantt' && (
              <GanttView
                projects={projects}
                cards={cards}
                lists={lists}
                members={members}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
              />
            )}

            {viewMode === 'stats' && (
              <StatsDashboard
                project={selectedProject}
                cards={cards}
                lists={lists}
                members={members}
              />
            )}
          </>
        )}
      </main>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            onAnimationEnd={(e) => {
              if (e.animationName === 'toastFadeOut') {
                removeToast(toast.id);
              }
            }}
          >
            <span className="toast-icon">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'warning' && '⚠'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>

      {showNewProjectModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowNewProjectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">新建项目</h2>
            <div className="modal-body">
              <div className="form-group">
                <label>项目名称</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="输入项目名称"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>项目描述</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="输入项目描述（可选）"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewProjectModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateProject}>
                创建项目
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">邀请成员</h2>
            <div className="modal-body">
              <p className="modal-desc">
                输入成员邮箱，系统将生成邀请链接。
              </p>
              <div className="form-group">
                <label>邮箱地址</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="example@email.com"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleInvite}>
                发送邀请
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="small-screen-warning">
        <h2>📱 请使用更大屏幕</h2>
        <p>LightFlow 目前仅支持 1024px 以上的屏幕设备</p>
        <p>请在平板或电脑上访问以获得最佳体验</p>
      </div>

      <style>{`
        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 64px;
          background: var(--primary-color);
          color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 20px;
          font-weight: 700;
        }

        .logo-icon {
          font-size: 24px;
        }

        .logo-text {
          background: linear-gradient(135deg, #fff 0%, var(--accent-color) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .project-selector {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .project-select {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: var(--transition);
          min-width: 180px;
        }

        .project-select:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .project-select option {
          background: var(--primary-color);
          color: white;
        }

        .new-project-btn {
          padding: 8px 16px;
          border-radius: 6px;
          background: var(--accent-color);
          color: white;
          font-size: 13px;
          font-weight: 500;
        }

        .new-project-btn:hover {
          background: var(--accent-light);
        }

        .nav-tabs {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.1);
          padding: 4px;
          border-radius: 8px;
        }

        .nav-tab {
          padding: 8px 20px;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 500;
          transition: var(--transition);
        }

        .nav-tab:hover {
          color: white;
        }

        .nav-tab.active {
          background: white;
          color: var(--primary-color);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .online-indicator,
        .offline-indicator {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 500;
        }

        .online-indicator {
          background: rgba(39, 174, 96, 0.2);
          color: #2ecc71;
        }

        .offline-indicator {
          background: rgba(231, 76, 60, 0.2);
          color: #e74c3c;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .invite-btn {
          padding: 8px 16px;
          border-radius: 6px;
          background: var(--accent-color);
          color: white;
          font-size: 13px;
          font-weight: 500;
        }

        .invite-btn:hover {
          background: var(--accent-light);
        }

        .invite-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--accent-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }

        .app-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .loading-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: var(--text-secondary);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--bg-secondary);
          border-top-color: var(--accent-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .offline-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 10px 24px;
          background: linear-gradient(90deg, #fef3e7 0%, #fde8d1 100%);
          border-bottom: 2px solid #f39c12;
          color: #d35400;
          font-size: 14px;
          font-weight: 500;
        }

        .offline-banner-icon {
          font-size: 18px;
        }

        .offline-banner-text {
          flex: 0 1 auto;
        }

        .offline-banner-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(243, 156, 18, 0.3);
          border-top-color: #f39c12;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .toast-container {
          position: fixed;
          top: 80px;
          right: 24px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 14px;
          min-width: 280px;
          animation: toastSlideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both,
                     toastFadeOut 0.35s cubic-bezier(0.4, 0, 0.2, 1) 1.65s both;
          border-left: 4px solid var(--accent-color);
        }

        .toast-success {
          border-left-color: #27ae60;
        }

        .toast-error {
          border-left-color: #e74c3c;
        }

        .toast-warning {
          border-left-color: #f39c12;
        }

        .toast-info {
          border-left-color: #3498db;
        }

        @keyframes toastSlideIn {
          0% {
            opacity: 0;
            transform: translateX(120%) scale(0.95);
          }
          60% {
            transform: translateX(-8px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes toastFadeOut {
          0% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          40% {
            opacity: 0.6;
            transform: translateX(20px) scale(0.98);
          }
          100% {
            opacity: 0;
            transform: translateX(120%) scale(0.9);
          }
        }

        .toast-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
        }

        .toast-success .toast-icon {
          background: #27ae60;
        }

        .toast-error .toast-icon {
          background: #e74c3c;
        }

        .toast-warning .toast-icon {
          background: #f39c12;
        }

        .toast-info .toast-icon {
          background: #3498db;
        }

        .toast-message {
          flex: 1;
          color: var(--primary-color);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: var(--radius);
          width: 90%;
          max-width: 480px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--primary-color);
          padding: 24px 24px 0;
        }

        .modal-body {
          padding: 20px 24px;
        }

        .modal-desc {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 14px;
          transition: var(--transition);
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 0 24px 24px;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
          border: none;
        }

        .btn-primary {
          background: var(--accent-color);
          color: white;
        }

        .btn-primary:hover {
          background: var(--accent-light);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .btn-secondary:hover {
          background: var(--border-color);
        }
      `}</style>
    </div>
  );
};

export default App;
