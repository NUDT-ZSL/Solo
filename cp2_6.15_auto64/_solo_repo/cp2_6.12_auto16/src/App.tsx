import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import BriefModule from './components/BriefModule';
import PreviewPanel from './components/PreviewPanel';
import wsManager from './utils/websocket';
import { saveToLocalStorage, loadFromLocalStorage, debounce } from './utils/storage';
import { BriefModuleData, User } from './types';
import './styles/App.css';

const defaultModules: BriefModuleData[] = [
  {
    id: uuidv4(),
    title: '今日头条',
    content: '<h2>重大新闻标题</h2><p>这里是今日头条的内容摘要...</p><ul><li>要点一</li><li>要点二</li></ul>',
    type: 'headline',
  },
  {
    id: uuidv4(),
    title: '本地新闻',
    content: '<h3>城市发展新动态</h3><p>本地区域经济持续向好发展...</p>',
    type: 'local',
  },
  {
    id: uuidv4(),
    title: '国际新闻',
    content: '<h3>全球视野</h3><p>国际要闻摘要...</p><p>更多国际动态更新中...</p>',
    type: 'international',
  },
  {
    id: uuidv4(),
    title: '财经板块',
    content: '<h3>市场概览</h3><p>今日股市行情...</p><ol><li>指数上涨</li><li>板块轮动</li></ol>',
    type: 'finance',
  },
];

const mockUsers: User[] = [
  { id: 'user-a', name: '用户A', color: '#3b82f6', avatar: 'A' },
  { id: 'user-b', name: '用户B', color: '#f97316', avatar: 'B' },
];

const App: React.FC = () => {
  const [modules, setModules] = useState<BriefModuleData[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[0]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const activeEditorsRef = useRef<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    const saved = loadFromLocalStorage();
    if (saved && saved.length > 0) {
      setModules(saved);
    } else {
      setModules(defaultModules);
    }
  }, []);

  useEffect(() => {
    const connectWS = async () => {
      try {
        await wsManager.connect();
        setIsConnected(true);
        setOnlineUsers([currentUser]);

        wsManager.on('modules_updated', (data: { modules: BriefModuleData[] }) => {
          setModules(data.modules);
          setLastSyncTime(new Date());
        });

        wsManager.on('user_joined', (user: User) => {
          setOnlineUsers((prev) => {
            if (prev.find((u) => u.id === user.id)) return prev;
            return [...prev, user];
          });
        });

        wsManager.on('user_left', (userId: string) => {
          setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
        });

        wsManager.on('module_content_updated', (data: { moduleId: string; content: string }) => {
          setModules((prev) =>
            prev.map((m) => (m.id === data.moduleId ? { ...m, content: data.content } : m))
          );
          setLastSyncTime(new Date());
        });

        wsManager.on('module_title_updated', (data: { moduleId: string; title: string }) => {
          setModules((prev) =>
            prev.map((m) => (m.id === data.moduleId ? { ...m, title: data.title } : m))
          );
          setLastSyncTime(new Date());
        });

        wsManager.send('join', currentUser);
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setOnlineUsers([currentUser]);
      }
    };

    connectWS();

    return () => {
      wsManager.disconnect();
    };
  }, []);

  const debouncedAutoSave = useCallback(
    debounce((updatedModules: BriefModuleData[]) => {
      setSaveStatus('saving');
      saveToLocalStorage(updatedModules);
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 300);
    }, 3000),
    []
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const newModules = Array.from(modules);
      const [reorderedItem] = newModules.splice(result.source.index, 1);
      newModules.splice(result.destination.index, 0, reorderedItem);

      setModules(newModules);
      saveToLocalStorage(newModules);

      wsManager.send('reorder_modules', { modules: newModules });
      setLastSyncTime(new Date());
    },
    [modules]
  );

  const handleContentChange = useCallback(
    (moduleId: string, content: string) => {
      setModules((prev) => {
        const updated = prev.map((m) => (m.id === moduleId ? { ...m, content } : m));
        debouncedAutoSave(updated);
        return updated;
      });

      wsManager.send('update_module_content', { moduleId, content });
      setLastSyncTime(new Date());
    },
    [debouncedAutoSave]
  );

  const handleTitleChange = useCallback(
    (moduleId: string, title: string) => {
      setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, title } : m)));

      wsManager.send('update_module_title', { moduleId, title });
      setLastSyncTime(new Date());
    },
    []
  );

  const getEditingUsers = (moduleId: string): User[] => {
    const editors = activeEditorsRef.current.get(moduleId);
    if (!editors) return [currentUser];
    return onlineUsers.filter((u) => editors.has(u.id) || u.id === currentUser.id);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '未同步';
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📰 协同新闻简报编辑器</h1>
        <div className="subtitle">实时协作 · 自动保存 · 所见即所得</div>
      </header>

      <main className="app-main">
        <section className={`editor-section ${isPreviewOpen ? 'preview-open' : ''}`}>
          <button
            className="preview-toggle-btn"
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
          >
            {isPreviewOpen ? '✕ 关闭预览' : '👁 预览简报'}
          </button>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="modules">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="modules-list"
                >
                  {modules.map((module, index) => (
                    <BriefModule
                      key={module.id}
                      module={module}
                      index={index}
                      currentUser={currentUser}
                      editingUsers={getEditingUsers(module.id)}
                      onContentChange={handleContentChange}
                      onTitleChange={handleTitleChange}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </section>
      </main>

      <PreviewPanel
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        modules={modules}
      />

      <footer className="app-footer">
        <div className="footer-left">
          <div className="online-users">
            <span className="online-dot" />
            <span>在线 {onlineUsers.length} 人</span>
          </div>
          <div className="user-avatars">
            {onlineUsers.map((user) => (
              <div
                key={user.id}
                className="mini-avatar"
                style={{ background: `linear-gradient(135deg, ${user.color}88, ${user.color})` }}
                title={user.name}
              >
                {user.avatar}
              </div>
            ))}
          </div>
        </div>
        <div className="footer-right">
          <div className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' && '⏳ 保存中...'}
            {saveStatus === 'saved' && '✓ 已自动保存'}
            {saveStatus === 'idle' && '• 本地草稿已保存'}
          </div>
          <div>最后同步: {formatTime(lastSyncTime)}</div>
        </div>
      </footer>
    </div>
  );
};

export default App;
