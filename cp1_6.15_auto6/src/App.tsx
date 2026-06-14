import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import UploadPanel from './components/UploadPanel';
import DiffViewer from './components/DiffViewer';
import CommentPanel from './components/CommentPanel';
import { computeDiff } from './utils/diffEngine';
import { DiffLine, Comment, CommentTagColor, DocumentContent, FilterStatus, FilterVersion } from './types';

const App = () => {
  const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterVersion, setFilterVersion] = useState<FilterVersion>('all');
  const [highlightLineId, setHighlightLineId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFilesUploaded = useCallback(async (oldContent: string, newContent: string, oldFileName: string, newFileName: string) => {
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const startTime = performance.now();
    const lines = computeDiff(oldContent, newContent);
    const endTime = performance.now();
    
    console.log(`Diff computed in ${(endTime - startTime).toFixed(2)}ms for ${oldContent.length + newContent.length} chars`);
    
    setDiffLines(lines);
    setDocumentContent({ oldDoc: oldContent, newDoc: newContent, oldFileName, newFileName });
    setComments([]);
    setIsLoading(false);
  }, []);

  const handleAddComment = useCallback((diffLineId: string, position: { x: number; y: number }, version: 'old' | 'new' | 'both') => {
    const content = prompt('请输入批注内容：');
    if (!content || !content.trim()) return;

    const color = prompt('请选择标签颜色 (red/blue/green)：', 'blue') as CommentTagColor;
    const validColors: CommentTagColor[] = ['red', 'blue', 'green'];
    const tagColor = validColors.includes(color) ? color : 'blue';

    const author = prompt('请输入您的用户名：', '匿名用户') || '匿名用户';

    const newComment: Comment = {
      id: uuidv4(),
      diffLineId,
      content: content.trim(),
      author,
      timestamp: Date.now(),
      tagColor,
      resolved: false,
      position,
      replies: [],
      expanded: true,
      version
    };

    setComments(prev => [...prev, newComment]);
  }, []);

  const handleUpdateCommentPosition = useCallback((commentId: string, position: { x: number; y: number }) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, position } : c
    ));
  }, []);

  const handleToggleExpand = useCallback((commentId: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, expanded: !c.expanded } : c
    ));
  }, []);

  const handleResolveComment = useCallback((commentId: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    ));
  }, []);

  const handleDeleteComment = useCallback((commentId: string) => {
    if (confirm('确定要删除这条批注吗？')) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  }, []);

  const handleAddReply = useCallback((commentId: string, content: string, author: string) => {
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;
      return {
        ...c,
        replies: [...c.replies, {
          id: uuidv4(),
          content,
          author,
          timestamp: Date.now()
        }]
      };
    }));
  }, []);

  const handleJumpToComment = useCallback((comment: Comment) => {
    setHighlightLineId(comment.diffLineId);
    setTimeout(() => setHighlightLineId(null), 1500);
    
    setComments(prev => prev.map(c => 
      c.id === comment.id ? { ...c, expanded: true } : c
    ));
  }, []);

  const filteredComments = useMemo(() => {
    return comments.filter(c => {
      const statusMatch = filterStatus === 'all' 
        ? true 
        : filterStatus === 'resolved' 
          ? c.resolved 
          : !c.resolved;
      
      const versionMatch = filterVersion === 'all' 
        ? true 
        : filterVersion === 'old' 
          ? c.version === 'old' || c.version === 'both'
          : c.version === 'new' || c.version === 'both';
      
      return statusMatch && versionMatch;
    }).sort((a, b) => {
      if (a.resolved !== b.resolved) {
        return a.resolved ? 1 : -1;
      }
      return b.timestamp - a.timestamp;
    });
  }, [comments, filterStatus, filterVersion]);

  const handleExportHTML = useCallback(() => {
    if (!documentContent || diffLines.length === 0) {
      alert('请先上传文档并进行对比');
      return;
    }

    const escapeHtml = (str: string) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    const getBgColor = (type: string) => {
      switch (type) {
        case 'added': return '#d4edda';
        case 'removed': return '#f8d7da';
        case 'modified': return '#fff3cd';
        default: return 'transparent';
      }
    };

    const getIcon = (type: string) => {
      switch (type) {
        case 'added': return '+';
        case 'removed': return '-';
        case 'modified': return '~';
        default: return ' ';
      }
    };

    const lineCommentsMap = new Map<string, Comment[]>();
    comments.forEach(c => {
      const existing = lineCommentsMap.get(c.diffLineId) || [];
      lineCommentsMap.set(c.diffLineId, [...existing, c]);
    });

    let diffHtml = '';
    diffLines.forEach(line => {
      const bgColor = getBgColor(line.type);
      const icon = getIcon(line.type);
      const lineComments = lineCommentsMap.get(line.id) || [];
      
      let oldContent = line.oldContent;
      let newContent = line.newContent;
      
      if (line.charDiffs && line.type === 'modified') {
        oldContent = '';
        newContent = '';
        line.charDiffs.forEach(cd => {
          if (cd.type === 'added') {
            newContent += `<span style="background: #a6e9a6;">${escapeHtml(cd.value)}</span>`;
          } else if (cd.type === 'removed') {
            oldContent += `<span style="background: #f5b3b3; text-decoration: line-through;">${escapeHtml(cd.value)}</span>`;
          } else {
            oldContent += escapeHtml(cd.value);
            newContent += escapeHtml(cd.value);
          }
        });
      } else {
        oldContent = escapeHtml(oldContent);
        newContent = escapeHtml(newContent);
      }

      const commentsHtml = lineComments.length > 0 ? `
        <div style="position: absolute; right: 10px; top: 2px;">
          <span style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer;">${lineComments.length}</span>
        </div>
      ` : '';

      diffHtml += `
        <tr style="background: ${bgColor}; position: relative;">
          <td style="padding: 2px 8px; text-align: right; color: #999; width: 50px; border-right: 1px solid #ddd;">${line.oldLineNumber || ''}</td>
          <td style="padding: 2px 8px; width: 20px; color: #999;">${icon}</td>
          <td style="padding: 2px 8px; white-space: pre-wrap; font-family: monospace; border-right: 1px solid #ddd;">${oldContent || '&nbsp;'}</td>
          <td style="padding: 2px 8px; text-align: right; color: #999; width: 50px; border-right: 1px solid #ddd;">${line.newLineNumber || ''}</td>
          <td style="padding: 2px 8px; white-space: pre-wrap; font-family: monospace;">${newContent || '&nbsp;'}</td>
          ${commentsHtml}
        </tr>
      `;

      lineComments.forEach(c => {
        const tagBorder = c.tagColor === 'red' ? '#ef4444' : c.tagColor === 'green' ? '#22c55e' : '#3b82f6';
        diffHtml += `
          <tr>
            <td colspan="5" style="padding: 8px 40px;">
              <div style="border-left: 3px solid ${tagBorder}; padding: 8px 12px; background: #f9fafb; margin: 4px 0; border-radius: 4px; ${c.resolved ? 'opacity: 0.5;' : ''}">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <strong>${escapeHtml(c.author)}</strong>
                  <span style="color: #666; font-size: 12px;">${new Date(c.timestamp).toLocaleString()}</span>
                </div>
                <p style="margin: 4px 0;">${escapeHtml(c.content)}</p>
                ${c.resolved ? '<span style="color: #22c55e; font-size: 12px;">✓ 已解决</span>' : ''}
                ${c.replies.length > 0 ? `
                  <div style="margin-top: 8px; padding-left: 16px; border-left: 2px solid #e5e7eb;">
                    ${c.replies.map(r => `
                      <div style="margin: 4px 0; padding: 4px 0;">
                        <div style="display: flex; justify-content: space-between;">
                          <strong>${escapeHtml(r.author)}</strong>
                          <span style="color: #666; font-size: 11px;">${new Date(r.timestamp).toLocaleString()}</span>
                        </div>
                        <p style="margin: 2px 0; font-size: 13px;">${escapeHtml(r.content)}</p>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      });
    });

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文档对比结果 - ${escapeHtml(documentContent.oldFileName)} vs ${escapeHtml(documentContent.newFileName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    h1 { text-align: center; color: #1a1a1a; margin-bottom: 20px; }
    .file-info { text-align: center; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    tr:hover { background: rgba(59, 130, 246, 0.05); }
    .legend { display: flex; gap: 16px; justify-content: center; margin: 16px 0; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-color { width: 16px; height: 16px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>📄 文档版本对比结果</h1>
  <div class="file-info">
    <strong>版本A（旧）:</strong> ${escapeHtml(documentContent.oldFileName)} | 
    <strong>版本B（新）:</strong> ${escapeHtml(documentContent.newFileName)}
  </div>
  <div class="legend">
    <div class="legend-item"><span class="legend-color" style="background: #d4edda;"></span> 新增</div>
    <div class="legend-item"><span class="legend-color" style="background: #f8d7da;"></span> 删除</div>
    <div class="legend-item"><span class="legend-color" style="background: #fff3cd;"></span> 修改</div>
    <div class="legend-item"><span class="legend-color" style="background: #3b82f6; border-radius: 50%;"></span> 批注标记</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 50px;">行号</th>
        <th style="width: 20px;"></th>
        <th style="width: 45%;">版本A（旧）</th>
        <th style="width: 50px;">行号</th>
        <th style="width: 45%;">版本B（新）</th>
      </tr>
    </thead>
    <tbody>
      ${diffHtml}
    </tbody>
  </table>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `对比结果_${documentContent.oldFileName}_vs_${documentContent.newFileName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [documentContent, diffLines, comments]);

  const handleReset = useCallback(() => {
    setDocumentContent(null);
    setDiffLines([]);
    setComments([]);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        padding: '12px 24px', 
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>📄 文档版本对比与批注系统</h1>
          {documentContent && (
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {documentContent.oldFileName} ↔ {documentContent.newFileName}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {documentContent && (
            <>
              <button
                onClick={handleExportHTML}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.3s ease-out'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
              >
                📥 导出HTML
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.3s ease-out'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
              >
                🔄 重新上传
              </button>
            </>
          )}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {!documentContent ? (
          <div style={{ flex: 1, animation: 'fadeIn 0.3s ease-out' }}>
            <UploadPanel onFilesUploaded={handleFilesUploaded} isLoading={isLoading} />
          </div>
        ) : (
          <>
            <div className="diff-viewer-container" style={{ 
              flex: '0 0 70%', 
              minWidth: 0,
              overflow: 'auto',
              position: 'relative',
              background: 'white'
            }}>
              <DiffViewer
                diffLines={diffLines}
                comments={comments}
                highlightLineId={highlightLineId}
                onAddComment={handleAddComment}
                onUpdateCommentPosition={handleUpdateCommentPosition}
                onToggleExpand={handleToggleExpand}
                onResolveComment={handleResolveComment}
                onDeleteComment={handleDeleteComment}
                onAddReply={handleAddReply}
              />
            </div>

            <div 
              className={`comment-panel-container ${mobileDrawerOpen ? 'drawer-open' : 'drawer-closed'}`}
              style={{ 
              flex: '0 0 30%', 
              minWidth: '300px',
              borderLeft: '1px solid #e5e7eb',
              background: '#f9fafb',
              animation: 'slideIn 0.3s ease-out'
            }}>
              <CommentPanel
                comments={filteredComments}
                filterStatus={filterStatus}
                filterVersion={filterVersion}
                onFilterStatusChange={setFilterStatus}
                onFilterVersionChange={setFilterVersion}
                onJumpToComment={handleJumpToComment}
                onResolveComment={handleResolveComment}
                onDeleteComment={handleDeleteComment}
              />
              
              <button
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                className="drawer-toggle-btn"
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '20px 20px 0 0',
                  padding: '6px 20px',
                  cursor: 'pointer',
                  boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
                }}
              >
                {mobileDrawerOpen ? '▼ 收起批注' : '▲ 展开批注'} ({comments.length})
              </button>
            </div>
          </>
        )}
      </main>

      <style>{`
        @media (max-width: 1200px) {
          main > div:first-child {
            flex: 1 1 100% !important;
          }
          .diff-viewer-container {
            flex: 1 1 100% !important;
          }
          .comment-panel-container {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            border-left: none !important;
            border-top: 1px solid #e5e7eb !important;
            z-index: 50 !important;
            transition: height 0.3s ease-out !important;
          }
          .comment-panel-container.drawer-open {
            height: 70vh !important;
          }
          .comment-panel-container.drawer-closed {
            height: 60px !important;
          }
          .drawer-toggle-btn {
            display: block !important;
          }
        }
        @media (max-width: 768px) {
          header {
            padding: 8px 12px !important;
          }
          header h1 {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
