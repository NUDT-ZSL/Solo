import { useState, useEffect } from 'react';
import { marked } from 'marked';

interface ArticleEditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave: (title: string, content: string) => Promise<void> | void;
  onCancel: () => void;
}

marked.setOptions({
  breaks: true,
  gfm: true
});

export default function ArticleEditor({
  initialTitle = '',
  initialContent = '',
  onSave,
  onCancel
}: ArticleEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [titleError, setTitleError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
  }, [initialTitle, initialContent]);

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError('标题不能为空');
      return;
    }
    if (title.length > 100) {
      setTitleError('标题不能超过100字符');
      return;
    }
    setTitleError('');
    setSaving(true);
    try {
      await onSave(title.trim(), content);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editor-layout">
      <div className="form-group">
        <label htmlFor="title">词条标题（必填，不超过100字符）</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError) setTitleError('');
          }}
          placeholder="请输入词条标题"
          maxLength={100}
        />
        {titleError && (
          <div style={{ color: '#c62828', fontSize: '13px', marginTop: '5px' }}>
            {titleError}
          </div>
        )}
        <div style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>
          {title.length}/100
        </div>
      </div>

      <div className="editor-panels">
        <div className="editor-panel">
          <h3>✏️ Markdown 编辑</h3>
          <textarea
            className="editor-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'支持Markdown格式：\n# 一级标题\n## 二级标题\n**加粗文本**\n- 列表项1\n- 列表项2'}
          />
        </div>
        <div className="editor-panel">
          <h3>👁️ 实时预览</h3>
          <div
            className="editor-preview"
            dangerouslySetInnerHTML={{ __html: marked.parse(content || '*暂无内容*') as string }}
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '保存中...' : '保存词条'}
        </button>
        <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          取消
        </button>
      </div>
    </div>
  );
}
