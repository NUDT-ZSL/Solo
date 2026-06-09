import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Editor from './Editor';
import StoryViewer from './StoryViewer';
import type { Story, SyncMessage, Dataset } from './types';

interface AppState {
  story: Story | null;
  datasets: Record<string, Dataset>;
  storiesList: { id: string; shortCode?: string; title: string; updatedAt?: string }[];
  isLoading: boolean;
  error: string | null;
  conflictHighlight: boolean;
  wsConnected: boolean;
}

const API_BASE = 'http://localhost:3001';
const WS_BASE = 'ws://localhost:3001';

const createEmptyStory = (): Story => ({
  id: uuidv4(),
  shortCode: Math.random().toString(36).substring(2, 8),
  title: '未命名故事',
  pages: [
    {
      id: uuidv4(),
      title: '第一页',
      description: '在这里输入描述...',
      chart: {
        type: 'bar',
        title: '示例图表',
        colorScheme: 'default',
        labels: ['A', 'B', 'C', 'D'],
        datasets: [
          {
            label: '数据集1',
            data: [12, 19, 3, 5],
            backgroundColor: '#89B4FA'
          }
        ]
      }
    }
  ],
  jumpConditions: []
});

const App: React.FC = () => {
  const clientIdRef = useRef<string>(uuidv4());
  const wsRef = useRef<WebSocket | null>(null);
  const lastSaveTimestampRef = useRef<number>(0);
  const conflictTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<AppState>({
    story: null,
    datasets: {},
    storiesList: [],
    isLoading: false,
    error: null,
    conflictHighlight: false,
    wsConnected: false
  });

  const [route, setRoute] = useState<{ path: string; params: Record<string, string> }>({
    path: '/',
    params: {}
  });

  const [editorConflictHighlight, setEditorConflictHighlight] = useState<Set<string>>(new Set());

  const parseRoute = useCallback((): { path: string; params: Record<string, string> } => {
    const hash = window.location.hash.replace(/^#/, '');
    const pathname = window.location.pathname;
    const rawPath = hash || pathname || '/';

    const segments = rawPath.split('/').filter(Boolean);

    if (segments.length >= 2 && segments[0] === 'edit') {
      return { path: '/edit/:storyId', params: { storyId: segments[1] } };
    }
    if (segments.length >= 2 && segments[0] === 'story') {
      return { path: '/story/:storyId', params: { storyId: segments[1] } };
    }
    return { path: '/', params: {} };
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(parseRoute());
    };

    setRoute(parseRoute());
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [parseRoute]);

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/datasets`);
        if (res.ok) {
          const data = await res.json();
          setState(prev => ({ ...prev, datasets: data }));
        }
      } catch (e) {
        console.error('Failed to load datasets:', e);
      }
    };

    const loadStoriesList = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/stories`);
        if (res.ok) {
          const data = await res.json();
          setState(prev => ({ ...prev, storiesList: data }));
        }
      } catch (e) {
        console.error('Failed to load stories list:', e);
      }
    };

    loadDatasets();
    loadStoriesList();
  }, []);

  useEffect(() => {
    if (route.params.storyId) {
      const loadStory = async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
          const res = await fetch(`${API_BASE}/api/stories/${route.params.storyId}`);
          if (res.ok) {
            const data = await res.json();
            setState(prev => ({ ...prev, story: data, isLoading: false }));
          } else {
            setState(prev => ({
              ...prev,
              error: '未找到该故事',
              isLoading: false,
              story: null
            }));
          }
        } catch (e) {
          setState(prev => ({
            ...prev,
            error: '加载故事失败',
            isLoading: false,
            story: null
          }));
        }
      };

      loadStory();
    }
  }, [route.params.storyId]);

  const connectWebSocket = useCallback((storyId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(`${WS_BASE}?storyId=${storyId}`);

      ws.onopen = () => {
        setState(prev => ({ ...prev, wsConnected: true }));
      };

      ws.onmessage = (event) => {
        try {
          const message: SyncMessage = JSON.parse(event.data);

          if (message.clientId === clientIdRef.current) {
            return;
          }

          if (message.timestamp <= lastSaveTimestampRef.current) {
            return;
          }

          if (message.type === 'storyUpdate') {
            setState(prev => {
              const hasLocalChanges = prev.story && prev.story.updatedAt &&
                new Date(prev.story.updatedAt).getTime() > message.timestamp;

              if (hasLocalChanges) {
                if (conflictTimeoutRef.current) {
                  clearTimeout(conflictTimeoutRef.current);
                }
                setState(s => ({ ...s, conflictHighlight: true }));
                conflictTimeoutRef.current = setTimeout(() => {
                  setState(s => ({ ...s, conflictHighlight: false }));
                }, 1000);
                return prev;
              }

              return {
                ...prev,
                story: message.payload,
                conflictHighlight: false
              };
            });
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, wsConnected: false }));
      };

      ws.onerror = () => {
        setState(prev => ({ ...prev, wsConnected: false }));
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to connect WebSocket:', e);
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(prev => ({ ...prev, wsConnected: false }));
  }, []);

  useEffect(() => {
    if (state.story?.id && route.path === '/edit/:storyId') {
      connectWebSocket(state.story.id);
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [state.story?.id, route.path, connectWebSocket, disconnectWebSocket]);

  const broadcastStoryUpdate = useCallback((story: Story) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: SyncMessage = {
        type: 'storyUpdate',
        payload: story,
        timestamp: Date.now(),
        clientId: clientIdRef.current
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const saveStory = useCallback(async (story: Story): Promise<Story | null> => {
    lastSaveTimestampRef.current = Date.now();

    try {
      let res;
      if (story.id) {
        res = await fetch(`${API_BASE}/api/stories/${story.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(story)
        });
      } else {
        res = await fetch(`${API_BASE}/api/stories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(story)
        });
      }

      if (res.ok) {
        const savedStory = await res.json();
        setState(prev => ({ ...prev, story: savedStory }));
        broadcastStoryUpdate(savedStory);

        const listRes = await fetch(`${API_BASE}/api/stories`);
        if (listRes.ok) {
          const listData = await listRes.json();
          setState(prev => ({ ...prev, storiesList: listData }));
        }

        return savedStory;
      }
      return null;
    } catch (e) {
      console.error('Save story failed:', e);
      return null;
    }
  }, [broadcastStoryUpdate]);

  const updateStory = useCallback((updater: (prev: Story) => Story) => {
    setState(prev => {
      if (!prev.story) return prev;
      const updated = updater(prev.story);
      return { ...prev, story: updated };
    });
  }, []);

  const createNewStory = useCallback(async () => {
    const newStory = createEmptyStory();
    try {
      const res = await fetch(`${API_BASE}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStory)
      });
      if (res.ok) {
        const savedStory = await res.json();
        setState(prev => ({ ...prev, story: savedStory }));

        const listRes = await fetch(`${API_BASE}/api/stories`);
        if (listRes.ok) {
          const listData = await listRes.json();
          setState(prev => ({ ...prev, storiesList: listData }));
        }

        navigate(`/edit/${savedStory.id}`);
      }
    } catch (e) {
      console.error('Create story failed:', e);
    }
  }, [navigate]);

  const loadStory = useCallback((storyId: string, mode: 'edit' | 'view' = 'edit') => {
    const prefix = mode === 'edit' ? '/edit' : '/story';
    navigate(`${prefix}/${storyId}`);
  }, [navigate]);

  const deleteStory = useCallback(async (storyId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/stories/${storyId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const listRes = await fetch(`${API_BASE}/api/stories`);
        if (listRes.ok) {
          const listData = await listRes.json();
          setState(prev => ({ ...prev, storiesList: listData }));
        }
        if (state.story?.id === storyId) {
          setState(prev => ({ ...prev, story: null }));
          navigate('/');
        }
      }
    } catch (e) {
      console.error('Delete story failed:', e);
    }
  }, [state.story?.id, navigate]);

  useEffect(() => {
    if (state.conflictHighlight && state.story) {
      const pageIds = new Set(state.story.pages.map(p => p.id));
      setEditorConflictHighlight(pageIds);
      const timer = setTimeout(() => {
        setEditorConflictHighlight(new Set());
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.conflictHighlight, state.story]);

  const handleSetStory = useCallback((story: Story) => {
    setState(prev => ({ ...prev, story }));
  }, []);

  const handleBroadcast = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const syncMessage: SyncMessage = {
        ...message,
        timestamp: message.timestamp || Date.now(),
        clientId: message.clientId || clientIdRef.current
      };
      wsRef.current.send(JSON.stringify(syncMessage));
    }
  }, []);

  const renderHome = () => (
    <div style={{
      minHeight: '100vh',
      background: '#1E1E2E',
      color: '#CDD6F4',
      padding: '40px 24px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: 960,
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 40
        }}>
          <div>
            <h1 style={{
              fontSize: 36,
              fontWeight: 700,
              margin: 0,
              background: 'linear-gradient(135deg, #89B4FA 0%, #74C7EC 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              数据故事平台
            </h1>
            <p style={{
              color: '#9CA3AF',
              marginTop: 8,
              fontSize: 16
            }}>
              创建交互式数据可视化故事
            </p>
          </div>
          <button
            onClick={createNewStory}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #89B4FA 0%, #74C7EC 100%)',
              color: '#1E1E2E',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(137, 180, 250, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(137, 180, 250, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(137, 180, 250, 0.3)';
            }}
          >
            + 创建新故事
          </button>
        </div>

        <div style={{
          background: '#313244',
          borderRadius: 16,
          padding: 24,
          marginBottom: 32
        }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            margin: '0 0 16px 0',
            color: '#CDD6F4'
          }}>
            示例数据集
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16
          }}>
            {Object.entries(state.datasets).map(([key, dataset]) => (
              <div
                key={key}
                style={{
                  background: '#1E1E2E',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid #45475A',
                  transition: 'border-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#89B4FA';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#45475A';
                }}
              >
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  margin: '0 0 8px 0',
                  color: '#CDD6F4'
                }}>
                  {dataset.name}
                </h3>
                <p style={{
                  fontSize: 13,
                  color: '#9CA3AF',
                  margin: '0 0 12px 0',
                  lineHeight: 1.5
                }}>
                  {dataset.description}
                </p>
                <div style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap'
                }}>
                  {Object.keys(dataset.columns).slice(0, 3).map(col => (
                    <span
                      key={col}
                      style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: '#45475A',
                        color: '#BAC2DE'
                      }}
                    >
                      {col}
                    </span>
                  ))}
                  {Object.keys(dataset.columns).length > 3 && (
                    <span style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: '#45475A',
                      color: '#9CA3AF'
                    }}>
                      +{Object.keys(dataset.columns).length - 3}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {Object.keys(state.datasets).length === 0 && (
              <p style={{ color: '#9CA3AF', fontSize: 14 }}>
                正在加载数据集...
              </p>
            )}
          </div>
        </div>

        <div style={{
          background: '#313244',
          borderRadius: 16,
          padding: 24
        }}>
          <h2 style={{
            fontSize: 20,
            fontWeight: 600,
            margin: '0 0 16px 0',
            color: '#CDD6F4'
          }}>
            我的故事
          </h2>
          {state.storiesList.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#9CA3AF'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
              <p style={{ margin: '0 0 8px 0', fontSize: 16 }}>
                还没有创建故事
              </p>
              <p style={{ margin: 0, fontSize: 14 }}>
                点击右上角"创建新故事"开始
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16
            }}>
              {state.storiesList.map(story => (
                <div
                  key={story.id}
                  style={{
                    background: '#1E1E2E',
                    borderRadius: 12,
                    padding: 20,
                    border: '1px solid #45475A',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#89B4FA';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#45475A';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 600,
                    margin: '0 0 8px 0',
                    color: '#CDD6F4'
                  }}>
                    {story.title}
                  </h3>
                  {story.shortCode && (
                    <p style={{
                      fontSize: 12,
                      color: '#6C7086',
                      margin: '0 0 12px 0',
                      fontFamily: 'monospace'
                    }}>
                      #{story.shortCode}
                    </p>
                  )}
                  <p style={{
                    fontSize: 12,
                    color: '#6C7086',
                    margin: '0 0 16px 0'
                  }}>
                    更新于: {story.updatedAt ? new Date(story.updatedAt).toLocaleString('zh-CN') : '-'}
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: 8
                  }}>
                    <button
                      onClick={() => loadStory(story.id, 'edit')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#45475A',
                        color: '#CDD6F4',
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#585B70';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#45475A';
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => loadStory(story.id, 'view')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#89B4FA',
                        color: '#1E1E2E',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#74C7EC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#89B4FA';
                      }}
                    >
                      预览
                    </button>
                    <button
                      onClick={() => deleteStory(story.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'transparent',
                        color: '#F38BA8',
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(243, 139, 168, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const borderAnimation = state.conflictHighlight ? {
    animation: 'conflictFlash 1s ease'
  } : {};

  if (state.isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1E1E2E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#CDD6F4'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #313244',
            borderTopColor: '#89B4FA',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>加载中...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1E1E2E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#CDD6F4',
        padding: 24
      }}>
        <div style={{
          background: '#313244',
          padding: 32,
          borderRadius: 16,
          textAlign: 'center',
          maxWidth: 400
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#F38BA8' }}>
            {state.error}
          </h2>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              borderRadius: 10,
              border: 'none',
              background: '#89B4FA',
              color: '#1E1E2E',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (route.path === '/story/:storyId' && state.story) {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <StoryViewer story={state.story} />
      </div>
    );
  }

  if (route.path === '/edit/:storyId' && state.story) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#1E1E2E',
        ...borderAnimation,
        outline: state.conflictHighlight ? '3px solid #F38BA8' : 'none',
        outlineOffset: '-3px'
      }}>
        <Editor
          story={state.story}
          setStory={handleSetStory}
          clientId={clientIdRef.current}
          onBroadcast={handleBroadcast}
          conflictHighlight={editorConflictHighlight}
        />
        <style>{`
          @keyframes conflict