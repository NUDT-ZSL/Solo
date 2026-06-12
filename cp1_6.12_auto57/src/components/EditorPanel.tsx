import { useEffect, useRef, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { parseMarkdown } from '@/utils/parser.ts'
import type { TreeNode } from '@/types/index.ts'

interface EditorPanelProps {
  content: string
  onChange: (content: string) => void
  onTreeChange: (tree: TreeNode[]) => void
}

export default function EditorPanel({ content, onChange, onTreeChange }: EditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showPreview, setShowPreview] = useState(false)
  const debounceRef = useRef<number | null>(null)

  const handleChange = useCallback((value: string) => {
    onChange(value)

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(() => {
      const tree = parseMarkdown(value)
      onTreeChange(tree)
    }, 50)
  }, [onChange, onTreeChange])

  useEffect(() => {
    const tree = parseMarkdown(content)
    onTreeChange(tree)
  }, [])

  return (
    <div className="editor-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#FFFFFF',
      borderRight: '1px solid #E0E0E0',
      transition: 'background 300ms ease'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #E0E0E0',
        background: '#FAFAFA'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#333' }}>
          📝 Markdown 编辑器
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              padding: '6px 12px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              background: showPreview ? '#2196F3' : '#FFFFFF',
              color: showPreview ? '#FFFFFF' : '#333',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 200ms'
            }}
          >
            {showPreview ? '编辑' : '预览'}
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {!showPreview ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="在这里输入Markdown笔记...&#10;&#10;# 一级标题（中心节点）&#10;## 二级标题（主分支）&#10;### 三级标题（子分支）&#10;- 列表项（叶节点）"
            spellCheck={false}
            style={{
              width: '100%',
              height: '100%',
              padding: '16px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#333',
              background: '#FFFFFF',
              boxSizing: 'border-box'
            }}
          />
        ) : (
          <div
            style={{
              padding: '16px',
              overflow: 'auto',
              height: '100%',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#333'
            }}
          >
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 style={{ fontSize: '24px', borderBottom: '2px solid #E0E0E0', paddingBottom: '8px' }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ fontSize: '20px', borderBottom: '1px solid #E0E0E0', paddingBottom: '4px' }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ fontSize: '16px' }}>{children}</h3>,
                code: ({ children }) => <code style={{ background: '#F5F5F5', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>{children}</code>,
                pre: ({ children }) => <pre style={{ background: '#2D2D2D', color: '#E0E0E0', padding: '12px', borderRadius: '8px', overflow: 'auto' }}>{children}</pre>,
                ul: ({ children }) => <ul style={{ paddingLeft: '20px' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ paddingLeft: '20px' }}>{children}</ol>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
