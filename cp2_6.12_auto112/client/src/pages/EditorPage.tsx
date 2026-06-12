import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useSocket } from '@/hooks/useSocket';
import { useVersions } from '@/hooks/useVersions';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ size: ['small', false, 'large', 'huge'] }],
    [{ color: [] }],
    ['clean']
  ]
};

const formats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'size', 'color'
];

export default function EditorPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [userName] = useState(() => localStorage.getItem('userName') || '匿名用户');
  const [content, setContent] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const quillRef = useRef<ReactQuill>(null);
  const isRemoteEditRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isConnected,
    userColor,
    users,
    notifications,
    sendEdit,
    sendCursorPosition,
    onEdit,
    getLatestContent
  } = useSocket(roomId || null, userName);

  const { saveVersion } = useVersions();

  useEffect(() => {
    onEdit((newContent: string) => {
      isRemoteEditRef.current = true;
      setContent(newContent);
      setTimeout(() => {
        isRemoteEditRef.current = false;
      }, 100);
    });
  }, [onEdit]);

  useEffect(() => {
    if (getLatestContent() && !content) {
      setContent(getLatestContent());
    }
  }, [getLatestContent, content]);

  const handleChange = (value: string) => {
    setContent(value);
    if (!isRemoteEditRef.current) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        sendEdit(value);
      }, 50);
    }
  };

  const handleSelectionChange = (_range: unknown, _oldRange: unknown, source: string) => {
    if (source === 'user' && quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      if (range) {
        sendCursorPosition({ index: range.index, length: range.length });
      }
    }
  };

  const handleSaveVersion = async () => {
    if (!roomId || !content.trim()) return;
    setIsSaving(true);
    try {
      const result = await saveVersion(roomId, content, userName);
      setSavedVersion(result.versionNumber);
      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('保存版本失败:', error);
      alert('保存版本失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToHistory = () => {
    navigate(`/room/${roomId}/versions`);
  };

  const otherUsers = users.filter(u => u.name !== userName);

  return (
    <div className="page-transition" style={styles.container}>
      {notifications.map(n => (
        <div
          key={n.id}
          style={{
            ...styles.notification,
            background: n.type === 'warning' ? '#e74c3c' : '#2ecc71'
          }}
        >
          {n.message}
        </div>
      ))}

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.statusDot, background: isConnected ? '#2ecc71' : '#e74c3c' }} />
          <span style={styles.statusText}>{isConnected ? '已连接' : '连接中...'}</span>
          {userColor && (
            <div style={{ ...styles.userColorBadge, background: userColor }} />
          )}
          <span style={styles.roomId}>房间号: {roomId}</span>
        </div>
        <div style={styles.toolbar}>
          <button style={styles.toolbarButton} onClick={handleSaveVersion} disabled={isSaving}>
            {isSaving ? (
              <span style={styles.buttonContent}>
                <span className="spinner" style={styles.spinner} />
                <span>保存中</span>
              </span>
            ) : (
              <span style={styles.buttonContent}>
                <span>💾</span>
                <span className="toolbar-text">保存版本</span>
              </span>
            )}
          </button>
          {showSaveSuccess && savedVersion && (
            <div style={styles.saveSuccess}>
              ✅ 已保存 v{savedVersion}
            </div>
          )}
          <button style={styles.toolbarButton} onClick={handleGoToHistory}>
            <span style={styles.buttonContent}>
              <span>📜</span>
              <span className="toolbar-text">版本历史</span>
            </span>
          </button>
          <button style={styles.toolbarButton} onClick={() => setShowCommentModal(true)}>
            <span style={styles.buttonContent}>
              <span>💬</span>
              <span className="toolbar-text">添加评论</span>
            </span>
          </button>
        </div>
      </div>

      <div data-editor-main style={styles.mainContent}>
        <div style={styles.editorSection}>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={handleChange}
            onChangeSelection={handleSelectionChange}
            modules={modules}
            formats={formats}
            placeholder="开始编辑您的简历..."
          />
        </div>

        <div data-collab-panel style={styles.collabPanel}>
          <h3 style={styles.panelTitle}>在线协作者</h3>
          <div style={styles.userList}>
            {users.map(u => (
              <div key={u.id} style={styles.userItem}>
                <div style={styles.avatarContainer}>
                  <div style={{ ...styles.avatarRing, borderColor: u.color }}>
                    <div style={{ ...styles.avatar, background: u.color }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
                <span style={styles.userName}>{u.name}</span>
                {u.id === users.find(x => x.name === userName)?.id && (
                  <span style={styles.youBadge}>（你）</span>
                )}
              </div>
            ))}
          </div>

          {otherUsers.length > 0 && (
            <>
              <h3 style={{ ...styles.panelTitle, marginTop: '24px' }}>用户光标</h3>
              <div style={styles.cursorInfo}>
                {otherUsers.map(u => u.cursorPosition && (
                  <div key={u.id} style={styles.cursorInfoItem}>
                    <div style={{ ...styles.cursorIndicator, background: u.color }} />
                    <span>{u.name} 正在编辑</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showCommentModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCommentModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>快速提示</h3>
            <p style={styles.modalText}>前往版本历史页面可以查看版本差异并添加评论。</p>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              style={styles.textarea}
              placeholder="如需评论，请先保存当前版本，然后到版本历史页面对该版本添加评论..."
              readOnly
            />
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setShowCommentModal(false)}>关闭</button>
              <button style={styles.confirmButton} onClick={() => { setShowCommentModal(false); handleGoToHistory(); }}>
                前往版本历史
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .toolbar-text {
          display: inline;
        }
        @media (max-width: 768px) {
          .toolbar-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    padding: '0',
    position: 'relative'
  },
  notification: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    borderRadius: '8px',
    color: '#ffffff',
    fontWeight: 500,
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: '#2d2d3e',
    borderBottom: '1px solid #3d3d5e',
    flexWrap: 'wrap',
    gap: '12px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  statusText: {
    color: '#ccccdd',
    fontSize: '14px'
  },
  userColorBadge: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    marginLeft: '8px'
  },
  roomId: {
    color: '#8888aa',
    fontSize: '13px',
    marginLeft: '8px'
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative'
  },
  toolbarButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit'
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    display: 'inline-block'
  },
  saveSuccess: {
    position: 'absolute',
    top: '100%',
    left: '0',
    marginTop: '8px',
    padding: '8px 16px',
    background: 'rgba(46, 204, 113, 0.9)',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    zIndex: 10
  },
  mainContent: {
    display: 'flex',
    height: 'calc(100vh - 65px)',
    gap: '0'
  },
  editorSection: {
    flex: 1,
    padding: '24px',
    minWidth: 0,
    overflow: 'auto'
  },
  collabPanel: {
    width: '280px',
    background: '#2d2d3e',
    padding: '20px',
    borderLeft: '1px solid #3d3d5e',
    overflowY: 'auto'
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#8888aa',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatarContainer: {
    position: 'relative'
  },
  avatarRing: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: '3px solid',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '14px'
  },
  userName: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500
  },
  youBadge: {
    color: '#667eea',
    fontSize: '12px'
  },
  cursorInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  cursorInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#1a1a2e',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#ccccdd'
  },
  cursorIndicator: {
    width: '16px',
    height: '20px',
    borderRadius: '2px',
    opacity: 0.5
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px'
  },
  modal: {
    background: '#2d2d3e',
    borderRadius: '12px',
    padding: '28px',
    width: '100%',
    maxWidth: '480px'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#ffffff'
  },
  modalText: {
    color: '#ccccdd',
    fontSize: '14px',
    marginBottom: '16px',
    lineHeight: 1.6
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #3d3d5e',
    background: '#1a1a2e',
    color: '#8888aa',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    marginBottom: '20px'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #3d3d5e',
    background: 'transparent',
    color: '#ccccdd',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  confirmButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit'
  }
};
