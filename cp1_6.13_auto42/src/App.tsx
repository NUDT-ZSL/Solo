import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { Task, GroupId, Comment } from './types';
import { MOCK_TASKS, MEMBERS, GROUP_MAP } from './data/mockData';
import KanbanBoard from './components/KanbanBoard';
import Modal from './components/Modal';
import useDebounce from './hooks/useDebounce';
import './App.css';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface AppContextValue {
  tasks: Task[];
  members: typeof MEMBERS;
  groupMap: typeof GROUP_MAP;
  searchKeyword: string;
  filterGroup: GroupId | 'all';
  setSearchKeyword: (keyword: string) => void;
  setFilterGroup: (group: GroupId | 'all') => void;
  moveCard: (taskId: string, targetGroup: GroupId, targetIndex: number) => void;
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'commentCount' | 'comments'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addComment: (taskId: string, content: string, userId: string) => void;
  getMemberById: (id: string) => typeof MEMBERS[number] | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedSearchKeyword = useDebounce(searchKeyword, 300);
  const [filterGroup, setFilterGroup] = useState<GroupId | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultGroup, setDefaultGroup] = useState<GroupId>('review');
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [activeMobileColumn, setActiveMobileColumn] = useState(0);

  const moveCard = useCallback((taskId: string, targetGroup: GroupId, targetIndex: number) => {
    setTasks(prevTasks => {
      const task = prevTasks.find(t => t.id === taskId);
      if (!task) return prevTasks;

      const otherTasks = prevTasks.filter(t => t.id !== taskId);
      const updatedTask = { ...task, group: targetGroup };

      const groupTasks = otherTasks
        .filter(t => t.group === targetGroup)
        .sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf());

      groupTasks.splice(targetIndex, 0, updatedTask);

      const result = otherTasks
        .filter(t => t.group !== targetGroup)
        .concat(groupTasks);

      return result;
    });
  }, []);

  const createTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'commentCount' | 'comments'>) => {
    const newTask: Task = {
      ...taskData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      commentCount: 0,
      comments: []
    };
    setTasks(prev => [newTask, ...prev]);
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));
    if (detailTask?.id === taskId) {
      setDetailTask(prev => (prev ? { ...prev, ...updates } : null));
    }
  }, [detailTask]);

  const addComment = useCallback((taskId: string, content: string, userId: string) => {
    const member = MEMBERS.find(m => m.id === userId);
    if (!member) return;

    const comment: Comment = {
      id: uuidv4(),
      userId,
      userName: member.name,
      content,
      createdAt: new Date().toISOString()
    };

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, comments: [comment, ...t.comments], commentCount: t.commentCount + 1 }
          : t
      )
    );

    setDetailTask(prev =>
      prev?.id === taskId
        ? { ...prev, comments: [comment, ...prev.comments], commentCount: prev.commentCount + 1 }
        : prev
    );
  }, []);

  const getMemberById = useCallback((id: string) => MEMBERS.find(m => m.id === id), []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = debouncedSearchKeyword
        ? task.title.toLowerCase().includes(debouncedSearchKeyword.toLowerCase())
        : true;
      const matchesGroup = filterGroup === 'all' ? true : task.group === filterGroup;
      return matchesSearch && matchesGroup;
    });
  }, [tasks, debouncedSearchKeyword, filterGroup]);

  const handleOpenCreateModal = (group: GroupId) => {
    setEditingTask(null);
    setDefaultGroup(group);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setDefaultGroup(task.group);
    setDetailTask(null);
    setIsModalOpen(true);
  };

  const handleCardClick = (task: Task) => {
    setDetailTask(task);
  };

  const handleSubmitComment = () => {
    if (!newComment.trim() || !detailTask) return;
    addComment(detailTask.id, newComment.trim(), MEMBERS[0].id);
    setNewComment('');
  };

  const contextValue: AppContextValue = {
    tasks: filteredTasks,
    members: MEMBERS,
    groupMap: GROUP_MAP,
    searchKeyword,
    filterGroup,
    setSearchKeyword,
    setFilterGroup,
    moveCard,
    createTask,
    updateTask,
    addComment,
    getMemberById
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">TaskMosaic</h1>
            <div className="header-tools">
              <div className="search-box">
                <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="搜索需求标题..."
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                />
              </div>
              <div className="filter-select-wrapper">
                <select
                  className="filter-select"
                  value={filterGroup}
                  onChange={e => setFilterGroup(e.target.value as GroupId | 'all')}
                >
                  <option value="all">全部</option>
                  {Object.entries(GROUP_MAP).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        <main className="app-main">
          <KanbanBoard
            onCardClick={handleCardClick}
            onCreateClick={handleOpenCreateModal}
            activeMobileColumn={activeMobileColumn}
            setActiveMobileColumn={setActiveMobileColumn}
          />
        </main>

        {isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            task={editingTask}
            defaultGroup={defaultGroup}
          />
        )}

        {detailTask && (
          <div className="detail-modal-overlay" onClick={() => setDetailTask(null)}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
              <div className="detail-modal-header">
                <h2 className="detail-modal-title">{detailTask.title}</h2>
                <button className="detail-modal-close" onClick={() => setDetailTask(null)}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <div className="detail-modal-body">
                <div className="detail-info">
                  <div className="detail-info-item">
                    <span className="detail-label">负责人</span>
                    <span className="detail-value">
                      {(() => {
                        const m = getMemberById(detailTask.assignee);
                        return (
                          <>
                            {m ? (
                              <span className="detail-assignee" style={{ background: m.color }}>
                                {m.name[0]}
                              </span>
                            ) : null}
                            {m?.name || '未分配'}
                          </>
                        );
                      })()}
                    </span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">分组</span>
                    <span className="detail-value">{GROUP_MAP[detailTask.group]}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">标签</span>
                    <div className="detail-tags">
                      {detailTask.tags.map((tag, i) => (
                        <span key={i} className="detail-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-label">创建时间</span>
                    <span className="detail-value">{dayjs(detailTask.createdAt).format('YYYY-MM-DD HH:mm')}</span>
                  </div>
                  {detailTask.description && (
                    <div className="detail-info-item">
                      <span className="detail-label">描述</span>
                      <p className="detail-description">{detailTask.description}</p>
                    </div>
                  )}
                </div>

                <div className="detail-comments">
                  <h3 className="comments-title">评论 ({detailTask.commentCount})</h3>
                  <div className="comments-list">
                    {detailTask.comments.length === 0 ? (
                      <p className="comments-empty">暂无评论</p>
                    ) : (
                      detailTask.comments
                        .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
                        .map(comment => {
                          const member = MEMBERS.find(m => m.id === comment.userId);
                          const avatarColor = member?.color || '#64748b';
                          return (
                            <div key={comment.id} className="comment-item">
                              <div
                                className="comment-avatar"
                                style={{ background: avatarColor }}
                              >
                                {comment.userName[0]}
                              </div>
                              <div className="comment-content">
                                <div className="comment-header">
                                  <span className="comment-user">{comment.userName}</span>
                                  <span className="comment-time">
                                    {dayjs(comment.createdAt).fromNow()}
                                  </span>
                                </div>
                                <p className="comment-text">{comment.content}</p>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  <div className="comment-input-box">
                    <textarea
                      className="comment-input"
                      placeholder="写下你的评论..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleSubmitComment();
                        }
                      }}
                    />
                    <button className="comment-submit-btn" onClick={handleSubmitComment}>
                      发送
                    </button>
                  </div>
                </div>
              </div>

              <div className="detail-modal-footer">
                <button className="detail-edit-btn" onClick={() => handleOpenEditModal(detailTask)}>
                  编辑需求
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

export default App;
