import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SkillNode } from './nodeData';

interface NodePanelProps {
  node: SkillNode;
  onClose: () => void;
  onSubmit: (nodeId: string, passed: boolean) => void;
}

export const NodePanel: React.FC<NodePanelProps> = ({ node, onClose, onSubmit }) => {
  const [code, setCode] = useState(node.template);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setCode(node.template);
    setStatus('idle');
    setStatusMsg('');
  }, [node.id, node.template]);

  const updatePreview = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    let html = '';
    if (node.language === 'html') {
      html = code;
    } else if (node.language === 'css') {
      html = `<!DOCTYPE html><html><head><style>${code}</style></head><body><div class="container"><h1>标题示例</h1><p>段落示例文本</p></div><div class="grid"><div class="item">1</div><div class="item">2</div><div class="item">3</div></div></body></html>`;
    } else {
      html = `<!DOCTYPE html><html><head><style>body{font-family:sans-serif;padding:20px;background:#1a1a2e;color:#e0e0e0;}</style></head><body><pre id="output"></pre><script>try{const _origLog=console.log;const _logs=[];console.log=function(){_logs.push(Array.from(arguments).map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' '));_origLog.apply(console,arguments);};${code};document.getElementById('output').textContent=_logs.join('\\n')||'(无输出)';}catch(e){document.getElementById('output').textContent='Error: '+e.message;}</script></body></html>`;
    }
    doc.open();
    doc.write(html);
    doc.close();
  }, [code, node.language]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const handleSubmit = () => {
    const passed = node.validate(code);
    if (passed) {
      setStatus('success');
      setStatusMsg('校验通过！节点已解锁');
      onSubmit(node.id, true);
    } else {
      setStatus('error');
      setStatusMsg('校验未通过，请检查代码');
      onSubmit(node.id, false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  const langLabel = node.language === 'html' ? 'HTML' : node.language === 'css' ? 'CSS' : 'JavaScript';

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span className="panel-title">{node.title}</span>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
        <div className="panel-body">
          <div className="editor-section">
            <div className="editor-label">{langLabel} 编辑器</div>
            <textarea
              className="code-editor"
              value={code}
              onChange={(e) => { setCode(e.target.value); setStatus('idle'); }}
              onKeyDown={handleKeyDown}
              spellCheck={false}
            />
          </div>
          <div className="preview-section">
            <div className="preview-label">实时预览</div>
            <iframe ref={iframeRef} className="preview-frame" title="preview" sandbox="allow-scripts" />
          </div>
        </div>
        <div className="panel-footer">
          <span className={`panel-status ${status}`}>{statusMsg || node.description}</span>
          <button className="btn-submit" onClick={handleSubmit}>提交答案</button>
        </div>
      </div>
    </div>
  );
};
