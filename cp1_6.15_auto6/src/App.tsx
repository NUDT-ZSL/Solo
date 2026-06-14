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
        case 'removed': return '−';
        case 'modified': return '~';
        default: return '·';
      }
    };

    const getIconColor = (type: string) => {
      switch (type) {
        case 'added': return '#16a34a';
        case 'removed': return '#dc2626';
        case 'modified': return '#d97706';
        default: return '#9ca3af';
      }
    };

    const lineCommentsMap = new Map<string, Comment[]>();
    comments.forEach(c => {
      const existing = lineCommentsMap.get(c.diffLineId) || [];
      lineCommentsMap.set(c.diffLineId, [...existing, c]);
    });

    let diffHtml = '';
    let allCommentsHtml = '';
    let commentIndex = 0;

    diffLines.forEach((line, lineIdx) => {
      const bgColor = getBgColor(line.type);
      const icon = getIcon(line.type);
      const iconColor = getIconColor(line.type);
      const lineComments = lineCommentsMap.get(line.id) || [];
      const lineCommentIds: number[] = [];

      let oldContent = line.oldContent;
      let newContent = line.newContent;

      if (line.charDiffs && line.type === 'modified') {
        oldContent = '';
        newContent = '';
        line.charDiffs.forEach(cd => {
          if (cd.type === 'added') {
            newContent += `<span class="char-added">${escapeHtml(cd.value)}</span>`;
          } else if (cd.type === 'removed') {
            oldContent += `<span class="char-removed">${escapeHtml(cd.value)}</span>`;
          } else {
            oldContent += escapeHtml(cd.value);
            newContent += escapeHtml(cd.value);
          }
        });
      } else {
        oldContent = escapeHtml(oldContent);
        newContent = escapeHtml(newContent);
      }

      lineComments.forEach(c => {
        commentIndex++;
        lineCommentIds.push(commentIndex);
        const tagBorder = c.tagColor === 'red' ? '#ef4444' : c.tagColor === 'green' ? '#22c55e' : '#3b82f6';
        const tagLabel = c.tagColor === 'red' ? '重要' : c.tagColor === 'green' ? '已确认' : '建议';

        allCommentsHtml += `
<div id="comment-${commentIndex}" class="comment-block" style="${c.resolved ? 'opacity: 0.55;' : ''}">
  <div class="comment-header" onclick="toggleComment(${commentIndex})">
    <div class="comment-title">
      <span class="tag-dot" style="background:${tagBorder}"></span>
      <strong class="comment-author">${escapeHtml(c.author)}</strong>
      <span class="tag-label" style="background:${tagBorder}22; color:${tagBorder}">${tagLabel}</span>
      ${c.resolved ? '<span class="resolved-badge">✓ 已解决</span>' : ''}
    </div>
    <div class="comment-meta">
      <span class="comment-time">${new Date(c.timestamp).toLocaleString('zh-CN')}</span>
      <span class="expand-icon" id="expand-icon-${commentIndex}">▼</span>
    </div>
  </div>
  <div id="comment-body-${commentIndex}" class="comment-body">
    <div class="comment-content">${escapeHtml(c.content)}</div>
    ${c.replies.length > 0 ? `
      <div class="replies-section">
        <div class="replies-title">💬 ${c.replies.length} 条回复</div>
        ${c.replies.map(r => `
          <div class="reply-item">
            <div class="reply-header">
              <strong>${escapeHtml(r.author)}</strong>
              <span class="reply-time">${new Date(r.timestamp).toLocaleString('zh-CN')}</span>
            </div>
            <div class="reply-content">${escapeHtml(r.content)}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>
</div>`;
      });

      const commentBadge = lineComments.length > 0 ? `
        <button class="comment-badge" onclick="event.stopPropagation(); scrollToComments(${lineCommentIds.join(',')})" title="点击查看 ${lineComments.length} 条批注">
          <span class="badge-icon">💬</span>
          <span class="badge-count">${lineComments.length}</span>
        </button>
      ` : '';

      diffHtml += `
<tr class="diff-row ${line.type}" style="background:${bgColor};" id="row-${lineIdx}">
  <td class="line-num old">${line.oldLineNumber || ''}</td>
  <td class="diff-icon" style="color:${iconColor}">${icon}</td>
  <td class="diff-cell old-content">
    <div class="cell-content">
      ${oldContent || '&nbsp;'}
    </div>
  </td>
  <td class="line-num new">${line.newLineNumber || ''}</td>
  <td class="diff-icon-placeholder"></td>
  <td class="diff-cell new-content">
    <div class="cell-content-wrapper">
      <div class="cell-content">
        ${newContent || '&nbsp;'}
      </div>
      ${commentBadge}
    </div>
  </td>
</tr>`;

      if (lineComments.length > 0) {
        diffHtml += `
<tr class="comments-inline-row">
  <td colspan="6" class="comments-inline-container">
    <div class="comments-inline" id="comments-inline-${lineIdx}">
      ${lineCommentIds.map(id => `
        <div class="comment-ref" onclick="scrollToComments(${id})">
          <span class="ref-dot" style="background:${lineComments[lineCommentIds.indexOf(id)]?.tagColor === 'red' ? '#ef4444' : lineComments[lineCommentIds.indexOf(id)]?.tagColor === 'green' ? '#22c55e' : '#3b82f6'}"></span>
          <span class="ref-author">${escapeHtml(lineComments[lineCommentIds.indexOf(id)]?.author || '')}</span>
          <span class="ref-preview">${escapeHtml(lineComments[lineCommentIds.indexOf(id)]?.content?.slice(0, 30) || '')}${lineComments[lineCommentIds.indexOf(id)]?.content && lineComments[lineCommentIds.indexOf(id)]!.content.length > 30 ? '...' : ''}</span>
        </div>
      `).join('')}
    </div>
  </td>
</tr>`;
      }
    });

    const totalComments = comments.length;
    const resolvedComments = comments.filter(c => c.resolved).length;
    const unresolvedComments = totalComments - resolvedComments;
    const progress = totalComments > 0 ? Math.round((resolvedComments / totalComments) * 100) : 0;

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>文档对比结果 - ${escapeHtml(documentContent.oldFileName)} ↔ ${escapeHtml(documentContent.newFileName)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f5f5f5;
  color: #1f2937;
  line-height: 1.6;
  min-height: 100vh;
}
.container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}
.page-header {
  text-align: center;
  margin-bottom: 24px;
}
.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}
.page-subtitle {
  color: #6b7280;
  font-size: 14px;
}
.stats-bar {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin: 20px 0;
  flex-wrap: wrap;
}
.stat-card {
  background: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  text-align: center;
  min-width: 100px;
}
.stat-number {
  font-size: 24px;
  font-weight: 700;
  display: block;
}
.stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
.stat-total .stat-number { color: #3b82f6; }
.stat-resolved .stat-number { color: #22c55e; }
.stat-unresolved .stat-number { color: #f59e0b; }
.legend {
  display: flex;
  gap: 20px;
  justify-content: center;
  background: white;
  padding: 12px 20px;
  border-radius: 8px;
  margin: 16px auto;
  max-width: 600px;
  flex-wrap: wrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4b5563;
}
.legend-color {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1);
}
.legend-color.added { background: #d4edda; }
.legend-color.removed { background: #f8d7da; }
.legend-color.modified { background: #fff3cd; }
.legend-color.comment { background: #3b82f6; border-radius: 50%; border: none; }
.progress-bar {
  background: white;
  padding: 12px 20px;
  border-radius: 8px;
  max-width: 600px;
  margin: 16px auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.progress-title {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
}
.progress-track {
  height: 10px;
  background: #e5e7eb;
  border-radius: 5px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #16a34a);
  border-radius: 5px;
  transition: width 0.5s ease;
  width: ${progress}%;
}
.main-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
.diff-container, .comments-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.section-header {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
}
.diff-header-row {
  display: flex;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}
.diff-header-cell {
  padding: 12px 16px;
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.diff-header-cell.old {
  flex: 0 0 50%;
  background: #fef2f2;
  color: #dc2626;
  border-right: 1px solid #e5e7eb;
}
.diff-header-cell.new {
  flex: 0 0 50%;
  background: #f0fdf4;
  color: #16a34a;
}
.version-tag {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.version-tag.old { background: #fecaca; color: #dc2626; }
.version-tag.new { background: #bbf7d0; color: #166534; }
.diff-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.diff-table colgroup col:nth-child(1) { width: 50px; }
.diff-table colgroup col:nth-child(2) { width: 30px; }
.diff-table colgroup col:nth-child(3) { width: calc(50% - 80px); }
.diff-table colgroup col:nth-child(4) { width: 50px; }
.diff-table colgroup col:nth-child(5) { width: 30px; }
.diff-table colgroup col:nth-child(6) { width: calc(50% - 80px); }
.diff-row:hover {
  filter: brightness(0.98);
}
.line-num {
  padding: 4px 8px;
  text-align: right;
  color: #9ca3af;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  border-right: 1px solid #f3f4f6;
  user-select: none;
  vertical-align: top;
}
.line-num.new {
  border-left: 2px solid #e5e7eb;
}
.diff-icon {
  padding: 4px 4px;
  text-align: center;
  font-weight: 700;
  font-size: 15px;
  user-select: none;
  vertical-align: top;
  background: rgba(255,255,255,0.35);
  border-right: 1px solid #e5e7eb;
}
.diff-icon-placeholder {
  border-right: 1px solid transparent;
}
.diff-cell {
  padding: 4px 10px;
  font-family: ui-monospace, SFMono-Regular, Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  vertical-align: top;
  white-space: pre-wrap;
  word-break: break-all;
}
.cell-content-wrapper {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.cell-content {
  flex: 1;
  min-width: 0;
}
.char-added {
  background: #a6e9a6;
  padding: 0 2px;
  border-radius: 2px;
}
.char-removed {
  background: #f5b3b3;
  text-decoration: line-through;
  padding: 0 2px;
  border-radius: 2px;
}
.comment-badge {
  flex-shrink: 0;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 3px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-top: 1px;
  box-shadow: 0 2px 6px rgba(59,130,246,0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.comment-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59,130,246,0.45);
}
.badge-icon { font-size: 12px; }
.comments-inline-row {
  background: #fafafa;
}
.comments-inline-container {
  padding: 6px 40px 10px;
}
.comments-inline {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.comment-ref {
  background: white;
  border: 1px solid #e5e7eb;
  border-left: 3px solid #3b82f6;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}
.comment-ref:hover {
  background: #eff6ff;
  border-color: #cbd5e1;
  transform: translateX(4px);
}
.ref-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ref-author {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  flex-shrink: 0;
}
.ref-preview {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.comments-list {
  padding: 16px 20px;
}
.comment-block {
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: opacity 0.3s ease;
}
.comment-block.highlighted {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
  animation: highlightPulse 1.2s ease;
}
@keyframes highlightPulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
  50% { box-shadow: 0 0 0 6px rgba(59,130,246,0.3); }
}
.comment-header {
  padding: 10px 14px;
  background: white;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  transition: background 0.15s ease;
}
.comment-header:hover {
  background: #f9fafb;
}
.comment-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.comment-author {
  font-size: 13px;
  color: #1f2937;
  flex-shrink: 0;
}
.tag-label {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}
.resolved-badge {
  background: #d1fae5;
  color: #065f46;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}
.comment-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.comment-time {
  font-size: 11px;
  color: #9ca3af;
}
.expand-icon {
  font-size: 10px;
  color: #9ca3af;
  transition: transform 0.2s ease;
}
.comment-block.collapsed .expand-icon {
  transform: rotate(-90deg);
}
.comment-body {
  padding: 14px;
  overflow: hidden;
  max-height: 2000px;
  transition: max-height 0.3s ease, padding 0.2s ease;
}
.comment-block.collapsed .comment-body {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.comment-content {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.replies-section {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}
.replies-title {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 10px;
}
.reply-item {
  background: white;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 2px solid #e5e7eb;
  margin-left: 8px;
}
.reply-item:last-child {
  margin-bottom: 0;
}
.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.reply-header strong {
  font-size: 12px;
  color: #374151;
}
.reply-time {
  font-size: 10px;
  color: #9ca3af;
}
.reply-content {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #9ca3af;
}
.empty-state-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-state-text {
  font-size: 14px;
  margin-bottom: 4px;
}
.empty-state-hint {
  font-size: 12px;
  opacity: 0.8;
}
.back-to-top {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59,130,246,0.4);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: all 0.2s ease;
}
.back-to-top.visible {
  display: flex;
}
.back-to-top:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59,130,246,0.5);
}
.footer {
  text-align: center;
  padding: 24px;
  color: #9ca3af;
  font-size: 12px;
}
@media (max-width: 1024px) {
  .container { padding: 16px; }
  .page-title { font-size: 22px; }
  .diff-table { table-layout: auto; }
}
@media (max-width: 768px) {
  .diff-header-row { flex-direction: column; }
  .diff-header-cell.old, .diff-header-cell.new { flex: 1; }
}
</style>
</head>
<body>
<div class="container">
  <header class="page-header">
    <h1 class="page-title">📄 文档版本对比报告</h1>
    <p class="page-subtitle">
      <strong>版本A：</strong>${escapeHtml(documentContent.oldFileName)} &nbsp;↔&nbsp;
      <strong>版本B：</strong>${escapeHtml(documentContent.newFileName)}
    </p>
  </header>

  ${totalComments > 0 ? `
  <div class="stats-bar">
    <div class="stat-card stat-total">
      <span class="stat-number">${totalComments}</span>
      <span class="stat-label">批注总数</span>
    </div>
    <div class="stat-card stat-resolved">
      <span class="stat-number">${resolvedComments}</span>
      <span class="stat-label">已解决</span>
    </div>
    <div class="stat-card stat-unresolved">
      <span class="stat-number">${unresolvedComments}</span>
      <span class="stat-label">待处理</span>
    </div>
  </div>

  <div class="progress-bar">
    <div class="progress-title">
      <span>解决进度</span>
      <span>${progress}%</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill"></div>
    </div>
  </div>
  ` : ''}

  <div class="legend">
    <div class="legend-item">
      <span class="legend-color added"></span>
      <span>新增行 (+)</span>
    </div>
    <div class="legend-item">
      <span class="legend-color removed"></span>
      <span>删除行 (−)</span>
    </div>
    <div class="legend-item">
      <span class="legend-color modified"></span>
      <span>修改行 (~)</span>
    </div>
    <div class="legend-item">
      <span class="legend-color comment"></span>
      <span>含批注</span>
    </div>
  </div>

  <div class="main-content">
    <section class="diff-container">
      <div class="section-header">
        <h2 class="section-title">📊 差异对比</h2>
        <span style="font-size:12px; color:#6b7280">共 ${diffLines.length} 行</span>
      </div>
      <div class="diff-header-row">
        <div class="diff-header-cell old">
          <span class="version-tag old">版本A</span>
          <span>旧版本</span>
        </div>
        <div class="diff-header-cell new">
          <span class="version-tag new">版本B</span>
          <span>新版本</span>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="diff-table">
          <colgroup>
            <col><col><col><col><col><col>
          </colgroup>
          <tbody>
            ${diffHtml}
          </tbody>
        </table>
      </div>
    </section>

    <section class="comments-container" id="all-comments-section">
      <div class="section-header">
        <h2 class="section-title">💬 全部批注</h2>
        <span style="font-size:12px; color:#6b7280">${totalComments} 条</span>
      </div>
      <div class="comments-list">
        ${totalComments > 0 ? allCommentsHtml : `
          <div class="empty-state">
            <div class="empty-state-icon">💭</div>
            <div class="empty-state-text">暂无批注</div>
            <div class="empty-state-hint">点击差异行可添加批注</div>
          </div>
        `}
      </div>
    </section>
  </div>

  <footer class="footer">
    由文档版本对比系统自动生成 · ${new Date().toLocaleString('zh-CN')}
  </footer>
</div>

<button id="backToTop" class="back-to-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="返回顶部">↑</button>

<script>
(function() {
  var expanded = {};

  window.toggleComment = function(id) {
    var block = document.getElementById('comment-' + id);
    var icon = document.getElementById('expand-icon-' + id);
    if (!block) return;

    if (expanded[id] === undefined) expanded[id] = true;

    if (expanded[id]) {
      block.classList.add('collapsed');
      expanded[id] = false;
    } else {
      block.classList.remove('collapsed');
      expanded[id] = true;
    }
  };

  window.scrollToComments = function() {
    var ids = Array.prototype.slice.call(arguments);
    var target = document.getElementById('comment-' + ids[0]);
    if (!target) {
      target = document.getElementById('all-comments-section');
    }
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ids.forEach(function(id) {
        var el = document.getElementById('comment-' + id);
        if (el) {
          el.classList.remove('collapsed');
          expanded[id] = true;
          el.classList.add('highlighted');
          setTimeout(function() {
            el.classList.remove('highlighted');
          }, 1500);
        }
      });
    }
  };

  window.addEventListener('scroll', function() {
    var btn = document.getElementById('backToTop');
    if (btn) {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }
  });
})();
</script>
</body>
</html>`;

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
