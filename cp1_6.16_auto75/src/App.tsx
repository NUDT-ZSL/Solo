import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Editor from './editor/Editor';
import RoleGraph from './graph/RoleGraph';
import { buildGraph, type GraphData, type GraphNode } from './graph/GraphBuilder';
import {
  fetchAllChapters,
  fetchChapter,
  fetchVersions,
  login,
  register,
  rollbackVersion,
  updatePermission,
  kickCollaborator,
  type Chapter,
  type ChapterVersion,
  type User,
  type LockInfo,
} from './api/LockService';

interface ParagraphBlock {
  id: string;
  content: string;
  lockedBy: string | null;
  lockedByName: string | null;
  conflict: any;
}

interface CursorInfo {
  userId: string;
  userName: string;
  paragraphIndex: number;
  color: string;
}

const CURSOR_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'];

const SAMPLE_CHARACTERS = ['林远', '苏晴', '赵云', '韩雪', '陈风', '李月'];

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string>('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [paragraphs, setParagraphs] = useState<ParagraphBlock[]>([]);
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [cursors, setCursors] = useState<CursorInfo[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [graphCollapsed, setGraphCollapsed] = useState(false);
  const [characterNames, setCharacterNames] = useState<string[]>(SAMPLE_CHARACTERS);
  const [charInput, setCharInput] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [previewVersion, setPreviewVersion] = useState<ChapterVersion | null>(null);
  const [confirmRollbackId, setConfirmRollbackId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 768) {
      setGraphCollapsed(true);
    }
  }, [windowWidth]);

  useEffect(() => {
    const newSocket = io('/', { path: '/socket.io' });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('user-online', (users: User[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('cursor-update', (data: CursorInfo[]) => {
      setCursors(data);
    });

    newSocket.on('chapter-updated', (data: any) => {
      if (data.chapterId === currentChapterId) {
        loadChapter(data.chapterId);
      }
    });

    newSocket.on('version-added', (data: any) => {
      if (data.chapterId === currentChapterId) {
        loadVersions(data.chapterId);
      }
    });

    return () => {
      newSocket.close();
    };
  }, [currentChapterId]);

  useEffect(() => {
    if (currentUser) {
      loadChapters();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentChapterId) {
      loadChapter(currentChapterId);
      loadVersions(currentChapterId);
    }
  }, [currentChapterId]);

  useEffect(() => {
    refreshGraph();
  }, [chapters, characterNames]);

  const loadChapters = async () => {
    const data = await fetchAllChapters();
    setChapters(data);
    if (data.length > 0 && !currentChapterId) {
      setCurrentChapterId(data[0].id);
    }
  };

  const loadChapter = async (id: string) => {
    const chapter = await fetchChapter(id);
    if (chapter) {
      setChapterTitle(chapter.title);
      const blocks: ParagraphBlock[] = chapter.paragraphs.map((p, i) => ({
        id: `p-${i}`,
        content: p,
        lockedBy: null,
        lockedByName: null,
        conflict: null,
      }));
      setParagraphs(blocks);
    }
  };

  const loadVersions = async (id: string) => {
    const vers = await fetchVersions(id);
    setVersions(vers.slice(-10));
  };

  const refreshGraph = useCallback(() => {
    if (chapters.length === 0) {
      setGraphData({ nodes: [], edges: [] });
      return;
    }

    const graphInput = chapters.map((ch) => ({
      id: ch.id,
      content: ch.paragraphs.join('\n'),
      paragraphs: ch.paragraphs,
    }));

    const data = buildGraph(graphInput, characterNames);
    setGraphData(data);
  }, [chapters, characterNames]);

  const handleLogin = async () => {
    if (!loginName.trim() || !loginPass.trim()) return;
    const result = isRegister
      ? await register(loginName, loginPass)
      : await login(loginName, loginPass);

    if (result.success && result.user) {
      setCurrentUser(result.user);
      if (socket) {
        socket.emit('user-join', result.user);
      }
    }
  };

  const handleParagraphsChange = (newParagraphs: ParagraphBlock[]) => {
    setParagraphs(newParagraphs);
  };

  const handleNodeDoubleClick = (node: GraphNode) => {
    setCurrentChapterId(node.firstChapterId);
  };

  const handleRollback = async (versionId: string) => {
    if (!currentUser) return;
    const result = await rollbackVersion(currentChapterId, versionId, currentUser.id);
    if (result.success) {
      await loadChapter(currentChapterId);
      await loadVersions(currentChapterId);
      setShowHistory(false);
      setPreviewVersion(null);
      setConfirmRollbackId(null);
    }
  };

  const openRollbackConfirm = (version: ChapterVersion) => {
    setPreviewVersion(version);
    setConfirmRollbackId(version.id);
  };

  const handleAddCharacter = () => {
    if (charInput.trim() && !characterNames.includes(charInput.trim())) {
      setCharacterNames([...characterNames, charInput.trim()]);
      setCharInput('');
    }
  };

  const handleRemoveCharacter = (name: string) => {
    setCharacterNames(characterNames.filter((n) => n !== name));
  };

  const handleKickUser = async (userId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    await kickCollaborator(currentChapterId, userId, currentUser.id);
    await loadChapter(currentChapterId);
  };

  const handlePermissionChange = async (userId: string, permission: 'read' | 'edit') => {
    if (!currentUser || currentUser.role !== 'admin') return;
    await updatePermission(currentChapterId, userId, permission, currentUser.id);
    await loadChapter(currentChapterId);
  };

  const handleAddParagraph = () => {
    const newBlock: ParagraphBlock = {
      id: `p-${Date.now()}`,
      content: '',
      lockedBy: null,
      lockedByName: null,
      conflict: null,
    };
    setParagraphs([...paragraphs, newBlock]);
  };

  const addNewChapter = async () => {
    const res = await fetch('/api/chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新章节', userId: currentUser?.id, userName: currentUser?.name }),
    });
    if (res.ok) {
      await loadChapters();
    }
  };

  if (!currentUser) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            width: '360px',
          }}
        >
          <h2
            style={{
              textAlign: 'center',
              marginBottom: '24px',
              color: '#2C3E50',
              fontSize: '24px',
            }}
          >
            剧情共创
          </h2>
          <div style={{ marginBottom: '16px' }}>
            <input
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="用户名"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '8px',
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <input
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              placeholder="密码"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '10px',
              background: '#3498DB',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isRegister ? '注册' : '登录'}
          </button>
          <p
            style={{
              textAlign: 'center',
              marginTop: '16px',
              fontSize: '13px',
              color: '#888',
            }}
          >
            <span
              style={{ color: '#3498DB', cursor: 'pointer' }}
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  const isMobile = windowWidth < 768;

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: isMobile ? 'column' : 'row' }}>
      {isMobile && graphCollapsed && (
        <div
          onClick={() => setGraphCollapsed(false)}
          style={{
            position: 'fixed',
            right: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#2C3E50',
            color: '#fff',
            padding: '12px 6px',
            borderRadius: '6px 0 0 6px',
            cursor: 'pointer',
            zIndex: 1000,
            writingMode: 'vertical-rl',
            fontSize: '12px',
          }}
        >
          图谱面板
        </div>
      )}

      <div
        style={{
          width: isMobile ? '100%' : '60%',
          height: isMobile ? (graphCollapsed ? '100%' : '50%') : '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            background: '#fff',
            borderBottom: '1px solid #E0E0E0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <select
            value={currentChapterId}
            onChange={(e) => setCurrentChapterId(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              outline: 'none',
            }}
          >
            {chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.title}
              </option>
            ))}
          </select>
          <input
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            placeholder="章节标题"
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#1A1A1A',
              border: 'none',
              outline: 'none',
              flex: 1,
              minWidth: '120px',
            }}
          />
          <button
            onClick={addNewChapter}
            style={{
              padding: '6px 14px',
              background: '#27AE60',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            + 新章节
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '6px 14px',
              background: showHistory ? '#E67E22' : '#8E44AD',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {showHistory ? '关闭历史' : '版本历史'}
          </button>
          <button
            onClick={handleAddParagraph}
            style={{
              padding: '6px 14px',
              background: '#3498DB',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            + 添加段落
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#888',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#2ECC71',
                display: 'inline-block',
              }}
            />
            {currentUser.name}
            <span style={{ color: '#aaa' }}>在线 {onlineUsers.length}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <Editor
            chapterId={currentChapterId}
            paragraphs={paragraphs}
            userId={currentUser.id}
            userName={currentUser.name}
            onParagraphsChange={handleParagraphsChange}
            socket={socket}
            cursors={cursors}
            onJumpToChapter={(id) => setCurrentChapterId(id)}
          />

          {showHistory && (
            <div
              style={{
                position: 'absolute',
                right: '0',
                top: '0',
                width: '320px',
                height: '100%',
                background: '#fff',
                borderLeft: '1px solid #E0E0E0',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-2px 0 8px rgba(0,0,0,0.05)',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #E0E0E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <h3 style={{ color: '#2C3E50', fontSize: '15px', margin: 0 }}>
                  版本历史 · 最近 {versions.length} 个版本
                </h3>
                <button
                  onClick={() => {
                    setShowHistory(false);
                    setPreviewVersion(null);
                    setConfirmRollbackId(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '16px',
                    cursor: 'pointer',
                    color: '#888',
                    padding: '4px 8px',
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 16px 28px' }}>
                {versions.length === 0 && (
                  <p style={{ color: '#999', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                    暂无版本记录
                  </p>
                )}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-10px',
                      top: '8px',
                      bottom: '8px',
                      width: '2px',
                      background: 'linear-gradient(180deg, #3498DB 0%, #2ECC71 100%)',
                    }}
                  />
                  {[...versions].reverse().map((v, i) => {
                    const isCurrent = i === 0;
                    const isSelected = previewVersion?.id === v.id;
                    return (
                      <div
                        key={v.id || i}
                        style={{
                          position: 'relative',
                          marginBottom: '16px',
                          padding: '10px 12px',
                          background: isSelected
                            ? '#EBF5FB'
                            : isCurrent
                            ? '#F0FFF0'
                            : '#F8F9FA',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          border: isSelected
                            ? '1px solid #3498DB'
                            : '1px solid transparent',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => setPreviewVersion(v)}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: '-22px',
                            top: '14px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: isCurrent ? '#2ECC71' : '#3498DB',
                            border: '2px solid #fff',
                            boxShadow: '0 0 0 2px #3498DB',
                          }}
                        />
                        <div
                          style={{
                            fontWeight: 600,
                            color: isCurrent ? '#27AE60' : '#2C3E50',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {v.authorName}
                          {isCurrent && (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#2ECC71',
                                color: '#fff',
                                padding: '1px 6px',
                                borderRadius: '8px',
                                fontWeight: 400,
                              }}
                            >
                              当前
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                          {new Date(v.timestamp).toLocaleString('zh-CN')}
                        </div>
                        <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewVersion(v);
                            }}
                            style={{
                              padding: '3px 8px',
                              background: '#3498DB',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            预览
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRollbackConfirm(v);
                              }}
                              style={{
                                padding: '3px 8px',
                                background: '#E67E22',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '11px',
                              }}
                            >
                              回滚
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {previewVersion && (
                <div
                  style={{
                    borderTop: '1px solid #E0E0E0',
                    padding: '12px',
                    maxHeight: '40%',
                    overflow: 'auto',
                    background: '#FAFAFA',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#2C3E50' }}>
                      版本预览 - {previewVersion.authorName}
                    </div>
                    <button
                      onClick={() => setPreviewVersion(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '14px',
                        cursor: 'pointer',
                        color: '#888',
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>
                    {new Date(previewVersion.timestamp).toLocaleString('zh-CN')} ·{' '}
                    {previewVersion.paragraphs.length} 个段落
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#333',
                      lineHeight: '1.6',
                      background: '#fff',
                      padding: '10px',
                      borderRadius: '4px',
                      whiteSpace: 'pre-wrap',
                      border: '1px solid #EEE',
                      maxHeight: '200px',
                      overflow: 'auto',
                    }}
                  >
                    {previewVersion.paragraphs
                      .map((p, i) => `【${i + 1}】${p || '(空)'}`)
                      .join('\n\n')}
                  </div>
                  {confirmRollbackId === previewVersion.id && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px',
                        background: '#FEF5E7',
                        border: '1px solid #F39C12',
                        borderRadius: '4px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#E67E22',
                          fontWeight: 600,
                          marginBottom: '8px',
                        }}
                      >
                        ⚠ 确定要回滚到此版本吗？当前内容将被覆盖。
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleRollback(previewVersion.id)}
                          style={{
                            padding: '4px 12px',
                            background: '#E74C3C',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          确认回滚
                        </button>
                        <button
                          onClick={() => setConfirmRollbackId(null)}
                          style={{
                            padding: '4px 12px',
                            background: '#95A5A6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          width: isMobile ? '100%' : '40%',
          height: isMobile ? (graphCollapsed ? '0' : '50%') : '100%',
          background: '#2C3E50',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'height 0.3s ease',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setShowCollab(!showCollab)}
            style={{
              padding: '4px 10px',
              background: showCollab ? '#E67E22' : 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {showCollab ? '显示图谱' : '协作者'}
          </button>
          <div style={{ flex: 1 }} />
          {isMobile && (
            <button
              onClick={() => setGraphCollapsed(true)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              收起
            </button>
          )}
        </div>

        {!showCollab ? (
          <div style={{ flex: 1, position: 'relative' }}>
            <RoleGraph
              graphData={graphData}
              onRefresh={refreshGraph}
              onNodeDoubleClick={handleNodeDoubleClick}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '32px',
                left: '8px',
                right: '8px',
                background: 'rgba(44,62,80,0.9)',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                gap: '4px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginRight: '4px' }}>
                角色:
              </span>
              {characterNames.map((name) => (
                <span
                  key={name}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleRemoveCharacter(name)}
                >
                  {name} ×
                </span>
              ))}
              <input
                value={charInput}
                onChange={(e) => setCharInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCharacter()}
                placeholder="+角色"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '11px',
                  outline: 'none',
                  width: '60px',
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', color: '#fff' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>在线协作者</h3>
            {onlineUsers.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>暂无其他在线用户</p>
            )}
            {onlineUsers
              .filter((u) => u.id !== currentUser.id)
              .map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    marginBottom: '6px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: CURSOR_COLORS[Math.abs(u.id.charCodeAt(0)) % CURSOR_COLORS.length],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {u.name[0]}
                    </div>
                    <span>{u.name}</span>
                  </div>
                  {currentUser.role === 'admin' && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() =>
                          handlePermissionChange(
                            u.id,
                            u.role === 'editor' ? 'read' : 'edit'
                          )
                        }
                        style={{
                          padding: '2px 8px',
                          background: 'rgba(255,255,255,0.15)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        {u.role === 'editor' ? '设为只读' : '设为编辑'}
                      </button>
                      <button
                        onClick={() => handleKickUser(u.id)}
                        style={{
                          padding: '2px 8px',
                          background: '#E74C3C',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        踢出
                      </button>
                    </div>
                  )}
                </div>
              ))}

            <h3 style={{ fontSize: '15px', margin: '20px 0 12px' }}>章节协作者</h3>
            {chapters
              .find((ch) => ch.id === currentChapterId)
              ?.collaborators.map((c) => (
                <div
                  key={c.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    marginBottom: '4px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  <span>{c.userName}</span>
                  <span
                    style={{
                      color: c.permission === 'edit' ? '#2ECC71' : '#F39C12',
                      fontSize: '11px',
                    }}
                  >
                    {c.permission === 'edit' ? '可编辑' : '只读'}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
