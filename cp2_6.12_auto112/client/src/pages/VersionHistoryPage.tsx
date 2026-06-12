import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useVersions } from '@/hooks/useVersions';
import { Version, Comment } from '@/types';
import { computeDiff, htmlToText, renderDiffToHtml, DiffPart } from '@/utils/diff';

const PRESET_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
  '#16a085', '#c0392b', '#8e44ad', '#2980b9'
];

function hashStringToIndex(str: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % max;
  }
  return Math.abs(hash) % max;
}

export default function VersionHistoryPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [userName] = useState(() => localStorage.getItem('userName') || '匿名用户');
  const [userColor] = useState(() => {
    const idx = hashStringToIndex(userName, PRESET_COLORS.length);
    return PRESET_COLORS[idx];
  });

  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [diffHtml, setDiffHtml] = useState('');
  const [diffParts, setDiffParts] = useState<DiffPart[]>([]);
  const [oldVersionContent, setOldVersionContent] = useState<string>('');
  const [newVersionContent, setNewVersionContent] = useState<string>('');

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
    setIsLoadingContent(true);
    try {
      const data = await getVersionContent(roomId, version.version_number);
      const selectedContent = data.content || '';
      setNewVersionContent(selectedContent);

      let oldContent = '';
      let oldLabel = '当前内容';

      if (compareModeRef.current === 'current') {
        try {
          const response = await fetch(`http://localhost:3001/api/rooms/${roomId}/content`);
          const contentData = await response.json();
          oldContent = contentData.content || '';
        } catch {
          oldContent = '';
        }
      } else if (compareVersion) {
        const compareData = await getVersionContent(roomId, compareVersion.version_number);
        oldContent = compareData.content || '';
        oldLabel = `v${compareVersion.version_number}`;
      }

      setOldVersionContent(oldContent);

      const oldText = htmlToText(oldContent);
      const newText = htmlToText(selectedContent);
      const parts = computeDiff(oldText, newText);
      setDiffParts(parts);
      setDiffHtml(renderDiffToHtml(parts));

      const cs = await getComments(roomId, version.version_number);
      setComments(cs);
    } catch (error) {
      console.error('加载版本内容失败:', error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSelectCompareVersion = async (version: Version) => {
    if (!roomId || !selectedVersion) return;
    setCompareVersion(version);
    compareModeRef.current = 'select';
    setIsLoadingContent(true);
    try {
      const selectedData = await getVersionContent(roomId, selectedVersion.version_number);
      const compareData = await getVersionContent(roomId, version.version_number);
      const selectedContent = selectedData.content || '';
      const compareContent = compareData.content || '';

      setOldVersionContent(compareContent);
      setNewVersionContent(selectedContent);

      const oldText = htmlToText(compareContent);
      const newText = htmlToText(selectedContent);
      const parts = computeDiff(oldText, newText);
      setDiffParts(parts);
      setDiffHtml(renderDiffToHtml(parts));
    } catch (error) {
      console.error('加载对比版本失败:', error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleCompareWithCurrent = async () => {
    if (!roomId || !selectedVersion) return;
    setCompareVersion(null);
    compareModeRef.current = 'current';
    setIsLoadingContent(true);
    try {
      const selectedData = await getVersionContent(roomId, selectedVersion.version_number);
      const response = await fetch(`http://localhost:3001/api/rooms/${roomId}/content`);
      const contentData = await response.json();
      const currentContent = contentData.content || '';
      const selectedContent = selectedData.content || '';

      setOldVersionContent(currentContent);
      setNewVersionContent(selectedContent);

      const oldText = htmlToText(currentContent);
      const newText = htmlToText(selectedContent);
      const parts = computeDiff(oldText, newText);
      setDiffParts(parts);
      setDiffHtml(renderDiffToHtml(parts));
    } catch (error) {
      console.error('加载当前内容失败:', error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleAddComment = async () => {
    if (!roomId || !selectedVersion || !newComment.trim()) return;
    try {
      const comment = await addComment(
        roomId,
        selectedVersion.version_number,
        userName,
        userColor,
        newComment.trim()
      );
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('添加评论失败:', error);
      alert('添加评论失败');
    }
  };

  const addedCount = diffParts.filter(p => p.added).length;
  const removedCount = diffParts.filter(p => p.removed).length;

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
          <h3 style={styles.listTitle}>版本列表 ({versions.length})</h3>
          {isLoading ? (
            <div style={styles.loading}>
              <span className="spinner" style={styles.loadingSpinner} />
              加载中...
            </div>
          ) : versions.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <div>暂无版本记录</div>
              <div style={styles.emptyHint}>请先在编辑器中保存版本</div>
            </div>
          ) : (
            <div style={styles.listContainer}>
              {versions.map(v => (
                <div
                  key={v.version_number}
                  onClick={() => handleSelectVersion(v)}
                  style={{
                    ...styles.versionCard,
                    borderColor:
                      selectedVersion?.version_number === v.version_number
                        ? '#4a90d9'
                        : 'transparent',
                    boxShadow:
                      selectedVersion?.version_number === v.version_number
                        ? '0 0 18px rgba(74, 144, 217, 0.45)'
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
                    <span>👤 {v.saved_by}</span>
                  </div>
                  <div style={styles.versionDate}>
                    🕐 {format(new Date(v.saved_at), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                  {selectedVersion &&
                    selectedVersion.version_number !== v.version_number && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleSelectCompareVersion(v);
                        }}
                        style={styles.selectCompareBtn}
                      >
                        🔀 与 v{selectedVersion.version_number} 对比
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
                <div style={styles.diffActions}>
                  <div style={styles.diffStats}>
                    {addedCount > 0 && (
                      <span style={styles.addStat}>+{addedCount} 新增</span>
                    )}
                    {removedCount > 0 && (
                      <span style={styles.removeStat}>-{removedCount} 删除</span>
                    )}
                  </div>
                  {compareVersion && (
                    <button
                      onClick={handleCompareWithCurrent}
                      style={styles.clearCompareBtn}
                    >
                      🔙 与当前版本对比
                    </button>
                  )}
                </div>
              </div>

              {isLoadingContent ? (
                <div style={styles.loadingContent}>
                  <span className="spinner" style={styles.contentSpinner} />
                  <span>加载版本内容中...</span>
                </div>
              ) : (
                <>
                  <div style={styles.diffContainer}>
                    <div style={styles.sideBySide}>
                      <div style={styles.diffHalf}>
                        <div style={styles.diffPanelHeader}>
                          <span style={styles.diffPanelLabelOld}>
                            {compareVersion
                              ? `v${compareVersion.version_number}`
                              : '当前内容'}
                          </span>
                          <span style={styles.panelSize}>
                            {htmlToText(oldVersionContent).length} 字
                          </span>
                        </div>
                        <div
                          style={{
                            ...styles.diffContent,
                            background: oldVersionContent ? '#ffffff' : '#f7f7f7'
                          }}
                        >
                          {oldVersionContent ? (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: diffHtml
                                  .split('diff-add')
                                  .join('diff-add opacity-0 hidden-style')
                              }}
                              style={{
                                lineHeight: 1.8,
                                fontSize: '14px',
                                color: '#333',
                                wordBreak: 'break-word'
                              }}
                            />
                          ) : (
                            <span style={{ color: '#999', fontStyle: 'italic' }}>
                              （空内容）
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={styles.diffHalf}>
                        <div style={styles.diffPanelHeader}>
                          <span style={styles.diffPanelLabelNew}>
                            v{selectedVersion.version_number}
                          </span>
                          <span style={styles.panelSize}>
                            {htmlToText(newVersionContent).length} 字
                          </span>
                        </div>
                        <div
                          style={{
                            ...styles.diffContent,
                            background: newVersionContent ? '#ffffff' : '#f7f7f7'
                          }}
                        >
                          {newVersionContent ? (
                            <div
                              dangerouslySetInnerHTML={{ __html: diffHtml }}
                              style={{
                                lineHeight: 1.8,
                                fontSize: '14px',
                                color: '#333',
                                wordBreak: 'break-word'
                              }}
                            />
                          ) : (
                            <span style={{ color: '#999', fontStyle: 'italic' }}>
                              （空内容）
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={styles.legend}>
                      <div style={styles.legendItem}>
                        <span style={styles.legendAdd} />
                        <span>新增内容（绿色背景）</span>
                      </div>
                      <div style={styles.legendItem}>
                        <span style={styles.legendRemove} />
                        <span>删除内容（红色背景+删除线）</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.commentSection}>
                    <h3 style={styles.commentTitle}>
                      💬 评论 ({comments.length}/50)
                    </h3>
                    <div style={styles.commentInput}>
                      <div
                        style={{ ...styles.commentAvatar, background: userColor }}
                      >
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="对 v{selectedVersion.version_number} 版本添加评论反馈... (Ctrl+Enter 发送)"
                        style={styles.commentTextarea}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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
                        <div style={styles.noComments}>
                          <div style={styles.noCommentsIcon}>💭</div>
                          <div>该版本暂无评论，欢迎添加第一条反馈</div>
                        </div>
                      ) : (
                        comments.map(c => (
                          <div key={c.id} style={styles.commentItem}>
                            <div
                              style={{
                                ...styles.commentAvatar,
                                background: c.authorColor
                              }}
                            >
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
              )}
            </>
          ) : (
            <div style={styles.noVersionSelected}>
              <div style={styles.noVersionIcon}>👈</div>
              <div>请从左侧选择一个版本查看详情</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          [data-version-history-main] {
            flex-direction: column !important;
            height: auto !important;
          }
          [data-version-list] {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid #3d3d5e !important;
            max-height: 340px !important;
          }
          [data-diff-section] {
            padding: 16px !important;
          }
          [data-diff-sidebyside] {
            flex-direction: column !important;
          }
          [data-diff-half] {
            width: 100% !important;
          }
        }
        .hidden-style {
          display: none !important;
        }
      `}</style>
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
    color: '#ffffff',
    margin: 0
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
    overflowY: 'auto',
    flexShrink: 0
  },
  listTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '16px'
  },
  loading: {
    color: '#8888aa',
    textAlign: 'center',
    padding: '40px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontSize: '14px'
  },
  loadingSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    display: 'inline-block'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  versionCard: {
    background: '#1a1a2e',
    borderRadius: '10px',
    padding: '16px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.3s ease'
  },
  versionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  versionNumber: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '0.5px'
  },
  compareBadge: {
    fontSize: '11px',
    padding: '3px 10px',
    borderRadius: '4px',
    background: '#667eea',
    color: '#ffffff',
    fontWeight: 500
  },
  versionMeta: {
    fontSize: '13px',
    color: '#aaaa cc',
    marginBottom: '6px',
    lineHeight: 1.4
  },
  versionDate: {
    fontSize: '12px',
    color: '#666688',
    fontFamily: 'monospace'
  },
  selectCompareBtn: {
    marginTop: '12px',
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #4a90d9',
    background: 'rgba(74, 144, 217, 0.1)',
    color: '#4a90d9',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    fontWeight: 500
  },
  diffSection: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },
  diffHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  diffTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  subTitle: {
    fontSize: '13px',
    fontWeight: 400,
    color: '#8888aa'
  },
  diffActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  diffStats: {
    display: 'flex',
    gap: '10px',
    fontSize: '13px'
  },
  addStat: {
    padding: '4px 10px',
    background: 'rgba(46, 204, 113, 0.15)',
    color: '#2ecc71',
    borderRadius: '6px',
    fontWeight: 500
  },
  removeStat: {
    padding: '4px 10px',
    background: 'rgba(231, 76, 60, 0.15)',
    color: '#e74c3c',
    borderRadius: '6px',
    fontWeight: 500
  },
  clearCompareBtn: {
    padding: '7px 14px',
    borderRadius: '6px',
    border: '1px solid #3d3d5e',
    background: 'rgba(61, 61, 94, 0.5)',
    color: '#ccccdd',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  loadingContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: '#8888aa',
    minHeight: '400px'
  },
  contentSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.15)',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    display: 'inline-block'
  },
  diffContainer: {
    flex: 1,
    marginBottom: '24px'
  },
  sideBySide: {
    display: 'flex',
    gap: '16px',
    width: '100%'
  },
  diffHalf: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  diffPanelHeader: {
    padding: '12px 16px',
    background: 'linear-gradient(180deg, #33334a 0%, #2d2d3e 100%)',
    borderRadius: '10px 10px 0 0',
    border: '1px solid #3d3d5e',
    borderBottom: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  diffPanelLabelOld: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e74c3c'
  },
  diffPanelLabelNew: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#2ecc71'
  },
  panelSize: {
    fontSize: '11px',
    color: '#8888aa',
    fontFamily: 'monospace'
  },
  diffContent: {
    padding: '20px',
    color: '#333333',
    lineHeight: 1.8,
    overflowY: 'auto',
    maxHeight: '420px',
    border: '1px solid #ddd',
    borderRadius: '0 0 10px 10px',
    flex: 1
  },
  legend: {
    display: 'flex',
    gap: '20px',
    padding: '12px 16px',
    background: 'rgba(45, 45, 62, 0.6)',
    borderRadius: '8px',
    marginTop: '12px',
    fontSize: '12px',
    color: '#ccccdd',
    flexWrap: 'wrap'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  legendAdd: {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
    background: 'rgba(46, 204, 113, 0.3)',
    border: '1px solid rgba(46, 204, 113, 0.6)'
  },
  legendRemove: {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
    background: 'rgba(231, 76, 60, 0.3)',
    border: '1px solid rgba(231, 76, 60, 0.6)'
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
    minHeight: '64px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #3d3d5e',
    background: '#1a1a2e',
    color: '#ffffff',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5
  },
  commentSubmitBtn: {
    padding: '0 22px',
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
    maxHeight: '320px',
    overflowY: 'auto',
    padding: '4px'
  },
  commentItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    background: 'rgba(26, 26, 46, 0.5)',
    borderRadius: '8px',
    border: '1px solid rgba(61, 61, 94, 0.5)'
  },
  commentBody: {
    flex: 1,
    minWidth: 0
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '6px',
    flexWrap: 'wrap'
  },
  commentAuthor: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff'
  },
  commentDate: {
    fontSize: '11px',
    color: '#666688',
    fontFamily: 'monospace'
  },
  commentContent: {
    fontSize: '14px',
    color: '#ccccdd',
    lineHeight: 1.6,
    wordBreak: 'break-word'
  },
  emptyState: {
    color: '#666688',
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '14px',
    lineHeight: 2
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px'
  },
  emptyHint: {
    fontSize: '12px',
    color: '#555577',
    marginTop: '4px'
  },
  noComments: {
    color: '#666688',
    textAlign: 'center',
    padding: '28px 0',
    fontSize: '13px',
    lineHeight: 2
  },
  noCommentsIcon: {
    fontSize: '32px',
    marginBottom: '8px'
  },
  noVersionSelected: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666688',
    fontSize: '16px',
    gap: '12px'
  },
  noVersionIcon: {
    fontSize: '56px',
    opacity: 0.6
  }
};
