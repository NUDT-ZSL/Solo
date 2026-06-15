import { useState, useRef, useEffect, useCallback } from 'react';
import type { Article } from '../types';
import { formatTime, getStatusLabel } from '../utils';

interface ArticleEditorProps {
  article: Article;
  onSave: (title: string, body: string) => void;
  onPublish: () => void;
  onShowHistory: () => void;
  onShowVersions: () => void;
}

interface MarkdownAction {
  label: string;
  title: string;
  prefix: string;
  suffix?: string;
  placeholder?: string;
}

const markdownActions: MarkdownAction[] = [
  { label: 'B', title: '加粗', prefix: '**', suffix: '**', placeholder: '加粗文字' },
  { label: 'I', title: '斜体', prefix: '*', suffix: '*', placeholder: '斜体文字' },
  { label: 'S', title: '删除线', prefix: '~~', suffix: '~~', placeholder: '删除文字' },
  { label: 'H', title: '标题', prefix: '## ', suffix: '', placeholder: '标题文本' },
  { label: '•', title: '无序列表', prefix: '- ', suffix: '', placeholder: '列表项' },
  { label: '1.', title: '有序列表', prefix: '1. ', suffix: '', placeholder: '列表项' },
  { label: '❝', title: '引用', prefix: '> ', suffix: '', placeholder: '引用文字' },
  { label: '<>', title: '代码块', prefix: '```\n', suffix: '\n```', placeholder: '代码内容' },
];

const linkAction: MarkdownAction = {
  label: '🔗', title: '插入链接', prefix: '[', suffix: '](https://)', placeholder: '链接文字'
};

const imageAction: MarkdownAction = {
  label: '🖼', title: '插入图片', prefix: '![', suffix: '](https://)', placeholder: '图片描述'
};

const hrAction = { label: '—', title: '分割线', prefix: '\n---\n', suffix: '', placeholder: '' };

function ArticleEditor({ article, onSave, onPublish, onShowHistory, onShowVersions }: ArticleEditorProps) {
  const [title, setTitle] = useState(article.title);
  const [body, setBody] = useState(article.body);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [savedTip, setSavedTip] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setTitle(article.title);
    setBody(article.body);
  }, [article.id]);

  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      handleSave();
    }, 1500);
  }, []);

  useEffect(() => {
    triggerSave();
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [title, body, triggerSave]);

  const handleSave = async () => {
    if (title === article.title && body === article.body) return;
    setIsSaving(true);
    try {
      await onSave(title, body);
      setSavedTip(true);
      setTimeout(() => setSavedTip(false), 1500);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    await handleSave();
    setIsPublishing(true);
    try {
      await onPublish();
    } finally {
      setIsPublishing(false);
    }
  };

  const insertMarkdown = (action: MarkdownAction) => {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end) || action.placeholder || '';
    const newText = body.substring(0, start) + action.prefix + selectedText + (action.suffix || '') + body.substring(end);
    
    setBody(newText);
    
    setTimeout(() => {
      const newCursorPos = start + action.prefix.length + selectedText.length;
      textarea.focus();
      textarea.setSelectionRange(
        start + action.prefix.length,
        newCursorPos
      );
    }, 0);
  };

  const getLatestStatus = () => {
    if (!article.publishHistory || article.publishHistory.length === 0) return null;
    return article.publishHistory[article.publishHistory.length - 1];
  };

  const latestStatus = getLatestStatus();

  return (
    <>
      <div className="editor-toolbar">
        <button
          className="toolbar-btn"
          title={markdownActions[0].title}
          onClick={() => insertMarkdown(markdownActions[0])}
        >
          <strong>{markdownActions[0].label}</strong>
        </button>
        <button
          className="toolbar-btn"
          title={markdownActions[1].title}
          onClick={() => insertMarkdown(markdownActions[1])}
        >
          <em>{markdownActions[1].label}</em>
        </button>
        <button
          className="toolbar-btn"
          title={markdownActions[2].title}
          onClick={() => insertMarkdown(markdownActions[2])}
        >
          <s>{markdownActions[2].label}</s>
        </button>
        
        <div className="toolbar-divider" />
        
        <button
          className="toolbar-btn"
          title={markdownActions[3].title}
          onClick={() => insertMarkdown(markdownActions[3])}
        >
          {markdownActions[3].label}
        </button>
        <button
          className="toolbar-btn"
          title={markdownActions[4].title}
          onClick={() => insertMarkdown(markdownActions[4])}
        >
          {markdownActions[4].label}
        </button>
        <button
          className="toolbar-btn"
          title={markdownActions[5].title}
          onClick={() => insertMarkdown(markdownActions[5])}
        >
          {markdownActions[5].label}
        </button>
        <button
          className="toolbar-btn"
          title={markdownActions[6].title}
          onClick={() => insertMarkdown(markdownActions[6])}
        >
          {markdownActions[6].label}
        </button>
        <button
          className="toolbar-btn"
          title={markdownActions[7].title}
          onClick={() => insertMarkdown(markdownActions[7])}
        >
          {markdownActions[7].label}
        </button>
        
        <div className="toolbar-divider" />
        
        <button
          className="toolbar-btn"
          title={linkAction.title}
          onClick={() => insertMarkdown(linkAction)}
        >
          {linkAction.label}
        </button>
        <button
          className="toolbar-btn"
          title={imageAction.title}
          onClick={() => insertMarkdown(imageAction)}
        >
          {imageAction.label}
        </button>
        <button
          className="toolbar-btn"
          title={hrAction.title}
          onClick={() => insertMarkdown(hrAction)}
        >
          {hrAction.label}
        </button>
        
        <div style={{ flex: 1 }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          {savedTip && (
            <span style={{ fontSize: 12, color: '#198754' }}>✓ 已保存</span>
          )}
          {isSaving && (
            <span style={{ fontSize: 12, color: '#6c757d' }}>保存中...</span>
          )}
          <button
            className="toolbar-btn"
            title="查看版本历史"
            onClick={onShowVersions}
            style={{ width: 'auto', padding: '0 12px', fontSize: 13 }}
          >
            📜 版本 ({article.versions?.length || 1})
          </button>
          {article.publishHistory && article.publishHistory.length > 0 && (
            <button
              className="toolbar-btn"
              title="查看分发历史"
              onClick={onShowHistory}
              style={{ width: 'auto', padding: '0 12px', fontSize: 13 }}
            >
              🚀 分发 ({article.publishHistory.length})
            </button>
          )}
        </div>
      </div>

      <div className="editor-content">
        <input
          className="editor-title-input"
          type="text"
          placeholder="输入文章标题..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid #f1f3f5'
        }}>
          <span style={{ fontSize: 12, color: '#6c757d' }}>
            创建：{formatTime(article.createdAt)}
          </span>
          <span style={{ fontSize: 12, color: '#6c757d' }}>
            编辑：{formatTime(article.updatedAt)}
          </span>
          {article.isDraft && (
            <span className="status-tag draft">{getStatusLabel('draft')}</span>
          )}
          {latestStatus && (
            <span className={`status-tag ${latestStatus.status}`}>
              {getStatusLabel(latestStatus.status)}
            </span>
          )}
        </div>
        
        <textarea
          ref={bodyRef}
          className="editor-body-input"
          placeholder="开始写作吧...支持Markdown语法"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="editor-bottom">
        <button 
          className="btn-save"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存草稿'}
        </button>
        <button 
          className="btn-publish"
          onClick={handlePublish}
          disabled={isPublishing || !title.trim()}
        >
          {isPublishing ? '分发中...' : '🚀 一键分发到所有平台'}
        </button>
      </div>
    </>
  );
}

export default ArticleEditor;
