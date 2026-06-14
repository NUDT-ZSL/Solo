import React, { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EditorCore } from './EditorCore';
import { CollabSync, UserJoinEvent, UserLeaveEvent } from './CollabSync';
import { CursorOverlay } from './CursorOverlay';
import { MarkdownPreview } from './MarkdownPreview';

interface Notification {
  id: string;
  message: string;
  timestamp: number;
}

interface ToolbarButton {
  icon: string;
  title: string;
  action: () => void;
}

const App: React.FC = () => {
  const [docTitle, setDocTitle] = useState('未命名文档');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(docTitle);
  const [version, setVersion] = useState('v1.0.0');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const cursorOverlayRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const editorCoreRef = useRef<EditorCore | null>(null);
  const collabSyncRef = useRef<CollabSync | null>(null);
  const cursorOverlayRefInstance = useRef<CursorOverlay | null>(null);
  const markdownPreviewRef = useRef<MarkdownPreview | null>(null);

  const userIdRef = useRef<string>(uuidv4());
  const userNameRef = useRef<string>('用户' + Math.floor(Math.random() * 10000));
  const docIdRef = useRef<string>('demo-doc-123');
  const wsServerUrl = 'ws://localhost:8080';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const addNotification = useCallback((message: string) => {
    const id = uuidv4();
    setNotifications(prev => [...prev, { id, message, timestamp: Date.now() }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 2300);
  }, []);

  useEffect(() => {
    if (!editorContainerRef.current || !cursorOverlayRef.current || !previewContainerRef.current) {
      return;
    }

    const initialContent = `# 欢迎使用 MarkCollab

这是一个实时协作的 Markdown 编辑器。多个用户可以同时编辑这份文档！

## 功能特性

- **实时协作编辑** - 多人同时编辑，即时同步
- **光标同步** - 看到其他人的光标位置
- **Markdown 预览** - 实时预览渲染效果
- **工具栏** - 快速插入 Markdown 语法

## 支持的 Markdown 语法

### 文本格式

**粗体文本** 和 *斜体文本* 以及 ~~删除线~~

### 列表

1. 有序列表项 1
2. 有序列表项 2
3. 有序列表项 3

- 无序列表项
- 无序列表项
- 无序列表项

### 引用

> 这是一段引用文本。
> 可以包含多行。

### 代码

行内代码：\`const x = 42;\`

代码块：
\`\`\`javascript
function hello() {
  console.log('Hello, MarkCollab!');
}
\`\`\`

### 表格

| 功能 | 描述 | 状态 |
|------|------|------|
| 实时协作 | 多人同时编辑 | ✅ |
| 光标同步 | 显示其他用户光标 | ✅ |
| 预览 | 实时渲染 | ✅ |

### 链接和图片

[访问 GitHub](https://github.com)

![示例图片](https://picsum.photos/600/300)

---

开始编辑这份文档，体验实时协作的魅力！
`;

    const editorCore = new EditorCore(userIdRef.current, userNameRef.current);
    editorCore.init(editorContainerRef.current, initialContent);
    editorCoreRef.current = editorCore;

    const collabSync = new CollabSync(editorCore, docIdRef.current, wsServerUrl);
    collabSync.connect();
    collabSyncRef.current = collabSync;

    const unsubConnection = collabSync.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    const unsubVersion = collabSync.onVersionUpdate((newVersion) => {
      setVersion(newVersion);
    });

    const unsubUserPresence = collabSync.onUserPresence((event: UserJoinEvent | UserLeaveEvent) => {
      if (event.type === 'user-join') {
        addNotification(`${event.userName} 加入了文档`);
      } else {
        addNotification(`${event.userName} 离开了文档`);
      }
    });

    const cursorOverlay = new CursorOverlay(editorCore, cursorOverlayRef.current);
    cursorOverlay.init();
    cursorOverlayRefInstance.current = cursorOverlay;

    const markdownPreview = new MarkdownPreview(editorCore, previewContainerRef.current);
    markdownPreview.init();
    markdownPreviewRef.current = markdownPreview;

    return () => {
      unsubConnection();
      unsubVersion();
      unsubUserPresence();
      cursorOverlay.destroy();
      markdownPreview.destroy();
      collabSync.disconnect();
      editorCore.destroy();
    };
  }, [addNotification]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleDoubleClick = () => {
    setTitleInput(docTitle);
    setIsEditingTitle(true);
  };

  const handleTitleBlur = () => {
    if (titleInput.trim()) {
      setDocTitle(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  const toolbarButtons: ToolbarButton[] = [
    {
      icon: 'B',
      title: '加粗 (Ctrl+B)',
      action: () => editorCoreRef.current?.insertAtCursor('**', true)
    },
    {
      icon: 'I',
      title: '斜体 (Ctrl+I)',
      action: () => editorCoreRef.current?.insertAtCursor('*', true)
    },
    {
      icon: 'H1',
      title: '标题 1',
      action: () => editorCoreRef.current?.insertAtCursor('# ')
    },
    {
      icon: 'H2',
      title: '标题 2',
      action: () => editorCoreRef.current?.insertAtCursor('## ')
    },
    {
      icon: 'H3',
      title: '标题 3',
      action: () => editorCoreRef.current?.insertAtCursor('### ')
    },
    {
      icon: '•',
      title: '列表',
      action: () => editorCoreRef.current?.insertAtCursor('- ')
    },
    {
      icon: '"',
      title: '引用',
      action: () => editorCoreRef.current?.insertAtCursor('> ')
    },
    {
      icon: '</>',
      title: '代码块',
      action: () => editorCoreRef.current?.insertAtCursor('\n```\n\n```\n')
    }
  ];

  const appStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#1e1e2e',
    overflow: 'hidden'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    backgroundColor: '#1a1a28',
    borderBottom: '1px solid #3a3a4e',
    flexShrink: 0
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#d4d4d4',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: '4px',
    transition: 'text-decoration 0.2s'
  };

  const titleInputStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#d4d4d4',
    backgroundColor: '#2a2a3e',
    border: '1px solid #3a3a4e',
    outline: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    minWidth: '200px'
  };

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#2a2a3e',
    borderRadius: '8px',
    margin: '0 20px',
    flexShrink: 0
  };

  const toolbarButtonStyle: React.CSSProperties = {
    minWidth: '36px',
    height: '32px',
    padding: '0 10px',
    backgroundColor: 'transparent',
    color: '#d4d4d4',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s'
  };

  const mainContainerStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    ...(isMobile ? { flexDirection: 'column' } : {})
  };

  const editorWrapperStyle: React.CSSProperties = {
    position: 'relative',
    ...(isMobile 
      ? { height: '60%', minHeight: '300px', width: '100%' }
      : { width: '60%', minWidth: '500px', height: '100%' }
    )
  };

  const editorContainerStyle: React.CSSProperties = {
    height: '100%',
    width: '100%'
  };

  const previewContainerStyle: React.CSSProperties = {
    ...(isMobile 
      ? { height: '40%', width: '100%' }
      : { width: '40%', height: '100%' }
    ),
    backgroundColor: '#f5f5f5',
    borderLeft: isMobile ? 'none' : '1px solid #3a3a4e',
    borderTop: isMobile ? '1px solid #3a3a4e' : 'none'
  };

  const dividerStyle: React.CSSProperties = {
    height: '1px',
    backgroundColor: '#3a3a4e',
    margin: '10px 20px',
    flexShrink: 0
  };

  const versionStyle: React.CSSProperties = {
    position: 'absolute',
    left: '20px',
    bottom: '10px',
    fontSize: '12px',
    color: '#888',
    zIndex: 5
  };

  const connectionStatusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: isConnected ? '#4ade80' : '#f87171'
  };

  const statusDotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: isConnected ? '#4ade80' : '#f87171'
  };

  const notificationsContainerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    pointerEvents: 'none'
  };

  const notificationStyle: React.CSSProperties = {
    padding: '12px 20px',
    backgroundColor: 'rgba(42, 42, 62, 0.95)',
    color: '#d4d4d4',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    fontSize: '14px',
    animation: 'fadeInOut 2.3s ease-out forwards',
    border: '1px solid #3a3a4e'
  };

  return (
    <div style={appStyle}>
      <style>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          13% {
            opacity: 1;
            transform: translateY(0);
          }
          87% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-10px);
          }
        }

        .toolbar-btn:hover {
          background-color: #3a3a4e !important;
        }

        .doc-title:hover {
          text-decoration: underline;
          text-decoration-color: #666;
        }

        .cm-editor {
          height: 100% !important;
        }

        .cm-scroller {
          overflow: auto !important;
        }
      `}</style>

      <div style={notificationsContainerStyle}>
        {notifications.map(notification => (
          <div key={notification.id} style={notificationStyle}>
            {notification.message}
          </div>
        ))}
      </div>

      <div style={headerStyle}>
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            style={titleInputStyle}
          />
        ) : (
          <h1
            className="doc-title"
            onDoubleClick={handleTitleDoubleClick}
            style={titleStyle}
            title="双击编辑标题"
          >
            {docTitle}
          </h1>
        )}
        <div style={connectionStatusStyle}>
          <span style={statusDotStyle}></span>
          <span>{isConnected ? '已连接' : '连接中...'}</span>
        </div>
      </div>

      <div style={toolbarStyle}>
        {toolbarButtons.map((btn, index) => (
          <button
            key={index}
            className="toolbar-btn"
            onClick={btn.action}
            title={btn.title}
            style={toolbarButtonStyle}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      <div style={dividerStyle}></div>

      <div style={mainContainerStyle}>
        <div style={editorWrapperStyle}>
          <div ref={cursorOverlayRef} style={{ position: 'absolute', inset: 0, zIndex: 10 }}></div>
          <div ref={editorContainerRef} style={editorContainerStyle}></div>
          <div style={versionStyle}>{version}</div>
        </div>
        <div ref={previewContainerRef} style={previewContainerStyle}></div>
      </div>
    </div>
  );
};

export default App;
