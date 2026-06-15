import { useState, useCallback, useRef } from 'react';

interface UploadPanelProps {
  onFilesUploaded: (oldContent: string, newContent: string, oldFileName: string, newFileName: string) => void;
  isLoading: boolean;
}

const UploadPanel = ({ onFilesUploaded, isLoading }: UploadPanelProps) => {
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  const [dragActiveOld, setDragActiveOld] = useState(false);
  const [dragActiveNew, setDragActiveNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useTextInput, setUseTextInput] = useState(false);
  
  const oldInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const validateFileType = (file: File): boolean => {
    const validTypes = ['text/markdown', 'text/plain', 'text/x-markdown', 'application/octet-stream'];
    const validExtensions = ['.md', '.txt', '.markdown'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return validTypes.includes(file.type) || validExtensions.includes(ext) || file.type === '';
  };

  const handleDrag = useCallback((e: React.DragEvent, isOld: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      if (isOld) setDragActiveOld(true);
      else setDragActiveNew(true);
    } else if (e.type === 'dragleave') {
      if (isOld) setDragActiveOld(false);
      else setDragActiveNew(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, isOld: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveOld(false);
    setDragActiveNew(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!validateFileType(file)) {
      setError('请上传 Markdown (.md, .markdown) 或纯文本 (.txt) 文件');
      return;
    }

    try {
      const content = await readFileContent(file);
      if (isOld) {
        setOldFile(file);
        setOldText(content);
      } else {
        setNewFile(file);
        setNewText(content);
      }
    } catch {
      setError('读取文件失败，请重试');
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, isOld: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!validateFileType(file)) {
      setError('请上传 Markdown (.md, .markdown) 或纯文本 (.txt) 文件');
      return;
    }

    try {
      const content = await readFileContent(file);
      if (isOld) {
        setOldFile(file);
        setOldText(content);
      } else {
        setNewFile(file);
        setNewText(content);
      }
    } catch {
      setError('读取文件失败，请重试');
    }
  }, []);

  const handleCompare = () => {
    if ((!oldText.trim() || !newText.trim())) {
      setError('请输入或上传两个版本的文档内容');
      return;
    }

    const oldFileName = oldFile?.name || '版本A.md';
    const newFileName = newFile?.name || '版本B.md';

    onFilesUploaded(oldText, newText, oldFileName, newFileName);
  };

  const handleLoadDemo = () => {
    const demoOld = `# 项目说明文档

## 功能介绍

这是一个示例文档，用于演示文档对比功能。

### 主要功能：
1. 文档上传与版本对比
2. 差异高亮显示
3. 批注与讨论功能

## 技术栈

- React 18
- TypeScript
- Vite 构建工具

## 使用方法：
1. 上传旧版本文档
2. 上传新版本文档
3. 查看对比结果
`;

    const demoNew = `# 项目说明文档 v2.0

## 功能介绍

这是一个示例文档，用于演示文档对比功能的新版本。

### 主要功能：
1. 文档上传与版本对比
2. 差异高亮显示
3. 批注与讨论功能
4. 导出对比结果导出

## 技术栈

- React 18.2
- TypeScript 5.0
- Vite 4.0
- diff 库进行差异计算

## 使用方法：
1. 上传旧版本文档
2. 上传新版本文档
3. 查看对比结果
4. 添加批注和讨论
5. 导出HTML报告

## 新增功能

- 支持拖拽上传文件
- 支持字符级差异高亮
- 批注支持回复功能
`;

    setOldText(demoOld);
    setNewText(demoNew);
    setOldFile(null);
    setNewFile(null);
    setError(null);
  };

  return (
    <div style={{ 
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 24px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px', color: '#1a1a1a' }}>
          📄 文档版本对比与批注系统
        </h2>
        <p style={{ fontSize: '16px', color: '#6b7280' }}>
          上传两个版本的 Markdown 或纯文本文档，自动对比差异并添加批注
        </p>
      </div>

      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '32px'
      }}>
        <button
          onClick={() => setUseTextInput(!useTextInput)}
          style={{
            padding: '8px 16px',
            background: useTextInput ? '#3b82f6' : '#f3f4f6',
            color: useTextInput ? 'white' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s ease-out'
          }}
        >
          {useTextInput ? '📁 使用文件上传' : '✏️ 使用文本输入' }
        </button>
        <button
          onClick={handleLoadDemo}
          style={{
            padding: '8px 16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s ease-out'
          }}
        >
          🎯 加载演示数据
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          borderRadius: '6px',
          marginBottom: '24px',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          ⚠️ {error}
        </div>
      )}

      <div className="upload-grid" style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <span style={{ 
              padding: '4px 12px',
              background: '#fecaca',
              color: '#dc2626',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600
            }}>版本A（旧）</span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#374151' }}>
              {oldFile?.name || (oldText ? '已输入内容' : '请上传或输入旧版本文档')}
            </span>
          </div>

          {useTextInput ? (
            <textarea
              value={oldText}
              onChange={(e) => setOldText(e.target.value)}
              placeholder="在此输入或粘贴旧版本文档内容..."
              style={{
                width: '100%',
                height: '400px',
                padding: '16px',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                fontFamily: 'monospace',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.3s ease-out'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
            />
          ) : (
            <div
              onDragEnter={(e) => handleDrag(e, true)}
              onDragOver={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, true)}
              onDrop={(e) => handleDrop(e, true)}
              onClick={() => oldInputRef.current?.click()}
              style={{
                border: dragActiveOld
                  ? '2px dashed #3b82f6'
                  : '2px dashed #d1d5db',
                borderRadius: '12px',
                padding: '60px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragActiveOld ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                transition: 'all 0.3s ease-out',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                拖拽文件到此处或点击上传
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>
                支持 .md, .markdown, .txt 格式
              </p>
              <input
                ref={oldInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e, true)}
              />
            </div>
          )}
        </div>

        <div style={{ animation: 'fadeIn 0.3s ease-out 0.1s both' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <span style={{ 
              padding: '4px 12px',
              background: '#bbf7d0',
              color: '#166534',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600
            }}>版本B（新）</span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#374151' }}>
              {newFile?.name || (newText ? '已输入内容' : '请上传或输入新版本文档')}
            </span>
          </div>

          {useTextInput ? (
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="在此输入或粘贴新版本文档内容..."
              style={{
                width: '100%',
                height: '400px',
                padding: '16px',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                fontFamily: 'monospace',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.3s ease-out'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
            />
          ) : (
            <div
              onDragEnter={(e) => handleDrag(e, false)}
              onDragOver={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDrop={(e) => handleDrop(e, false)}
              onClick={() => newInputRef.current?.click()}
              style={{
                border: dragActiveNew
                  ? '2px dashed #3b82f6'
                  : '2px dashed #d1d5db',
                borderRadius: '12px',
                padding: '60px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragActiveNew ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                transition: 'all 0.3s ease-out',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                拖拽文件到此处或点击上传
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>
                支持 .md, .markdown, .txt 格式
              </p>
              <input
                ref={newInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e, false)}
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleCompare}
          disabled={isLoading}
          style={{
            padding: '14px 48px',
            background: isLoading ? '#93c5fd' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 600,
            transition: 'all 0.3s ease-out',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.background = '#2563eb';
          }}
          onMouseLeave={(e) => {
            if (!isLoading) e.currentTarget.style.background = '#3b82f6';
          }}
        >
          {isLoading ? '⏳ 正在对比...' : '🔍 开始对比'}
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .upload-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default UploadPanel;
