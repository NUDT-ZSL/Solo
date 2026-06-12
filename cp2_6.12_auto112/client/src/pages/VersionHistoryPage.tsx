import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useVersions } from '@/hooks/useVersions';
import { Version, Comment } from '@/types';
import { computeDiff, htmlToText, renderDiffToHtml } from '@/utils/diff';

export default function VersionHistoryPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [userName] = useState(() => localStorage.getItem('userName') || '匿名用户');
  const [userColor] = useState(() => {
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    return colors[Math.floor(Math.random() * colors.length)];
  });
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [currentContent, setCurrentContent] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [diffHtml, setDiffHtml] = useState('');
  const compareModeRef = useRef<'current' | 'select'>('current');

  const { getVersions, getVersionContent, addComment, getComments } = useVersions();

  useEffect(() => {
    loadVersions();
  }, [roomId]);

  const loadVersions = async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const vs = await getVersions(roomId);
      setVersions(vs);
      if (vs.length > 0) {
        await handleSelectVersion(vs[0]);
      }
    } catch (error) {
      console.error('加载版本列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVersion = async (version: Version) => {
    if (!roomId) return;
    setSelectedVersion(version);
    try {
      const data = await getVersionContent(roomId, version.version_number);
      setSelectedContent(data.content || '');

      if (compareModeRef.current === 'current') {
        try {
          const response = await fetch(`http://localhost:3001/api/rooms/${roomId}/content`);
          const contentData = await response.json();
          setCurrentContent(contentData.content || '');
          computeAndRenderDiff(contentData.content || '', data.content || '');
        } catch {
          setCurrentContent('');
          computeAndRenderDiff('', data.content || '');
        }
      } else if (compareVersion) {
        const compareData = await getVersionContent(roomId, compareVersion.version_number);
        computeAndRenderDiff(compareData.content || '', data.content || '');
      }

      const cs = await getComments(roomId, version.version_number);
      setComments(cs);
    } catch (error) {
      console.error('加载版本内容失败:', error);
    }
  };

  const handleSelectCompareVersion = async (version: Version) => {
    if (!roomId || !selectedVersion) return;
    setCompareVersion(version);
    compareModeRef.current = 'select';
    try {
      const selectedData = await getVersionContent(roomId, selectedVersion.version_number);
      const compareData = await getVersionContent(roomId, version.version_number);
      computeAndRenderDiff(compareData.content || '', selectedData.content || '');
    } catch (error) {
      console.error('加载对比版本失败:', error);
    }
  };

  const handleCompareWithCurrent = async () => {
    if (!roomId || !selectedVersion) return;
    setCompareVersion(null);
    compareModeRef.current = 'current';
    try {
      const selectedData = await getVersionContent(roomId, selectedVersion.version_number);
      const response = await fetch(`http://localhost:3001/api/rooms/${roomId}/content`);
      const contentData = await response.json();
      setCurrentContent(contentData.content || '');
      computeAndRenderDiff(contentData.content || '', selectedData.content || '');
    } catch (error) {
      console.error('加载当前内容失败:', error);
    }
  };

  const computeAndRenderDiff = (oldContent: string, newContent: string) => {
    const oldText = htmlToText(oldContent);
    const newText = htmlToText(newContent);
    const diff = computeDiff(oldText, newText);
    setDiffHtml(renderDiffToHtml(diff));
  };

  const handleAddComment = async () => {
    if (!roomId || !selectedVersion || !newComment.trim()) return;
    try {
      const comment = await addComment(roomId, selectedVersion.version_number, userName, userColor, newComment.trim());
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('添加评论失败:', error);
    }
  };

  return (
    <div className="page-transition" style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate(`/editor/${roomId}`)}>
          ← 返回编辑器
        </button>
        <h1 style={styles.title}>版本历史</h1>
        <div style={styles.headerInfo}>
          <span style={styles.roomLabel}>房间号:</span>
          <span style={styles.roomId}>{roomId}</span>
        </div>
      </div>

      <div data-version-history-main style={styles.mainContent}>
        <div data-version-list style={styles.versionList}>
          <h3 style={styles.listTitle}>版本列表</h3>
          {isLoading ? (
            <div style={styles.loading}>加载中...</div>
          ) : versions.length === 0 ? (
            <div style={styles.emptyState}>暂无版本记录</div>
          ) : (
            <div style={styles.listContainer}>
              {versions.map(v => (
                <div
                  key={v.version_number}
                  onClick={() => handleSelectVersion(v)}
                  style={{
                    ...styles.versionCard,
                    borderColor: selectedVersion?.version_number === v.version_number ? '#4a90d9' : 'transparent',
                    boxShadow: selectedVersion?.version_number === v.version_number
                      ? '0 0 15px rgba(74, 144, 217, 0.4)'
                      : 'none'
                  }}
                >
                  <div style={styles.versionHeader}>
                    <span style={styles.versionNumber}>v{v.version_number}</span>
                    {compareVersion?.version_number === v.version_number && (
                      <span style={styles.compareBadge}>对比</span>
                    )}
                  </div>
                  <div style={styles.versionMeta}>
                    <span>保存者: {v.saved_by}</span>
                  </div>
                  <div style={styles.versionDate}>
                    {format(new Date(v.saved_at), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                  {selectedVersion && selectedVersion.version_number !== v.version_number && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelectCompareVersion(v); }}
                      style={styles.selectCompareBtn}
                    >
                      选择对比
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div data-diff-section style={styles.diffSection}>
          {selectedVersion ? (
            <>
              <div style={styles.diffHeader}>
                <h3 style={styles.diffTitle}>
                  版本差异对比
                  <span style={styles.subTitle}>
                    {compareVersion
                      ? `（v${compareVersion.version_number} → v${selectedVersion.version_number}）`
                      : `（当前内容 → v${selectedVersion.version_number}）`}
                  </span>
                </h3>
                {compareVersion && (
                  <button onClick={handleCompareWithCurrent} style={styles.clearCompareBtn}>
                    与当前版本对比
                  </button>
                )}
              </div>

              <div style={styles.diffContainer}>
                <div style={styles.diffPanel}>
                  <div style={styles.diffPanelHeader}>
                    <span style={styles.diffPanelLabel}>
                      {compareVersion ? `v${compareVersion.version_number}` : '当前内容'}
                    </span>
                  </div>
                  <div
                    style={styles.diffContent}
                    dangerouslySetInnerHTML={{ __html: diffHtml }}
                  />
                </div>
              </div>

              <div style={styles.commentSection}>
                <h3 style={styles.commentTitle}>评论 ({comments.length})</h3>
                <div style={styles.commentInput}>
                  <div style={{ ...styles.commentAvatar, background: userColor }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="添加评论..."
                    style={styles.commentTextarea}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleAddComment();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    style={{
                      ...styles.commentSubmitBtn,
                      opacity: newComment.trim() ? 1 : 0.5,
                      cursor: newComment.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    发送
                  </button>
                </div>
                <div style={styles.commentList}>
                  {comments.length === 0 ? (
                    <div style={styles.noComments}>暂无评论</div>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} style={styles.commentItem}>
                        <div style={{ ...styles.commentAvatar, background: c.authorColor }}>
                          {c.author.charAt(0).toUpperCase()}
                        </div>
                        <div style={styles.commentBody}>
                          <div style={styles.commentHeader}>
                            <span style={styles.commentAuthor}>{c.author}</span>
                            <span style={styles.commentDate}>
                              {format(new Date(c.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                            </span>
                          </div>
                          <div style={styles.commentContent}>{c.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={styles.noVersionSelected}>
              请从左侧选择一个版本查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    background: '#2d2d3e',
    borderBottom: '1px solid #3d3d5e',
    flexWrap: 'wrap',
    gap: '12px'
  },
  backButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #3d3d5e',
    background: 'transparent',
    color: '#ccccdd',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#ffffff'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  roomLabel: {
    color: '#8888aa',
    fontSize: '13px'
  },
  roomId: {
    color: '#ffffff',
    fontSize: '14px',
    fontFamily: 'monospace',
    background: '#1a1a2e',
    padding: '4px 10px',
    borderRadius: '4px'
  },
  mainContent: {
    display: 'flex',
    height: 'calc(100vh - 65px)'
  },
  versionList: {
    width: '320px',
    background: '#2d2d3e',
    padding: '20px',
    borderRight: '1px solid #3d3d5e',
    overflowY: 'auto'
  },
  listTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '16px'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  versionCard: {
    background: '#1a1a2e',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.3s ease'
  },
  versionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  versionNumber: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff'
  },
  compareBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    background: '#667eea',
    color: '#ffffff'
  },
  versionMeta: {
    fontSize: '13px',
    color: '#8888aa',
    marginBottom: '4px'
  },
  versionDate: {
    fontSize: '12px',
    color: '#666688'
  },
  selectCompareBtn: {
    marginTop: '10px',
    width: '100%',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #4a90d9',
    background: 'transparent',
    color: '#4a90d9',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease'
  },
  diffSection: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column'
  },
  diffHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  diffTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0
  },
  subTitle: {
    fontSize: '14px',
    fontWeight: 400,
    color: '#8888aa',
    marginLeft: '8px'
  },
  clearCompareBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #3d3d5e',
    background: 'transparent',
    color: '#ccccdd',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  diffContainer: {
    flex: 1,
    minHeight: '300px',
    marginBottom: '24px'
  },
  diffPanel: {
    background: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    height: '100%',
    minHeight: '300px'
  },
  diffPanelHeader: {
    padding: '10px 16px',
    background: '#f5f5f5',
    borderBottom: '1px solid #ddd'
  },
  diffPanelLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333333'
  },
  diffContent: {
    padding: '20px',
    color: '#333333',
    fontSize: '14px',
    lineHeight: 1.8,
    overflowY: 'auto',
    maxHeight: '400px'
  },
  commentSection: {
    borderTop: '1px solid #3d3d5e',
    paddingTop: '20px'
  },
  commentTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '16px'
  },
  commentInput: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px'
  },
  commentAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0
  },
  commentTextarea: {
    flex: 1,
    minHeight: '60px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #3d3d5e',
    background: '#1a1a2e',
    color: '#ffffff',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit'
  },
  commentSubmitBtn: {
    padding: '0 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
    alignSelf: 'flex-end',
    height: '40px'
  },
  commentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  commentItem: {
    display: 'flex',
    gap: '12px'
  },
  commentBody: {
    flex: 1
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px'
  },
  commentAuthor: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff'
  },
  commentDate: {
    fontSize: '12px',
    color: '#666688'
  },
  commentContent: {
    fontSize: '14px',
    color: '#ccccdd',
    lineHeight: 1.6
  },
  loading: {
    color: '#8888aa',
    textAlign: 'center',
    padding: '40px 0'
  },
  emptyState: {
    color: '#666688',
    textAlign: 'center',
    padding: '40px 0',
    fontSize: '14px'
  },
  noComments: {
    color: '#666688',
    textAlign: 'center',
    padding: '20px 0',
    fontSize: '14px'
  },
  noVersionSelected: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666688',
    fontSize: '16px'
  }
};
