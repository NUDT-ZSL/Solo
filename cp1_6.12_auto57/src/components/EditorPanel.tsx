import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { parseMarkdown } from '@/utils/parser.ts'
import type { TreeNode } from '@/types/index.ts'

interface EditorPanelProps {
  content: string
  onChange: (content: string) => void
  onTreeChange: (tree: TreeNode[]) => void
}

const highlightMarkdown = (text: string): React.ReactNode[] => {
  const lines = text.split('\n')
  return lines.map((line, index) => {
    let result: React.ReactNode = line

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const content = headingMatch[2]
      result = (
        <>
          <span style={{ color: '#E91E63', fontWeight: 'bold' }}>{headingMatch[1]}</span>
          <span style={{ color: level === 1 ? '#1565C0' : level === 2 ? '#2E7D32' : '#558B2F', fontWeight: level <= 2 ? 'bold' : 'normal' }}> {content}</span>
        </>
      )
      return <div key={index}>{result}</div>
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/)
    if (listMatch) {
      const indent = listMatch[1]
      const marker = listMatch[2]
      const content = listMatch[3]
      result = (
        <>
          <span style={{ color: '#BDBDBD' }}>{indent}</span>
          <span style={{ color: '#FF9800', fontWeight: 'bold' }}>{marker}</span>
          <span style={{ color: '#424242' }}> {content}</span>
        </>
      )
      return <div key={index}>{result}</div>
    }

    if (line.startsWith('```')) {
      return <div key={index}><span style={{ color: '#9C27B0', fontWeight: 'bold' }}>{line}</span></div>
    }

    const inlineCodeMatch = line.match(/`([^`]+)`/)
    if (inlineCodeMatch) {
      const parts = line.split(/`([^`]+)`/)
      result = parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} style={{
            background: '#F5F5F5',
            padding: '1px 4px',
            borderRadius: '3px',
            color: '#D32F2F',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '0.9em'
          }}>{part}</code>
        ) : (
          <span key={i} style={{ color: '#424242' }}>{part}</span>
        )
      )
      return <div key={index}>{result}</div>
    }

    const boldMatch = line.match(/\*\*([^*]+)\*\*/)
    if (boldMatch) {
      const parts = line.split(/\*\*([^*]+)\*\*/)
      result = parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} style={{ color: '#212121' }}>{part}</strong>
        ) : (
          <span key={i} style={{ color: '#424242' }}>{part}</span>
        )
      )
      return <div key={index}>{result}</div>
    }

    return <div key={index} style={{ color: '#424242' }}>{line || ' '}</div>
  })
}

export default function EditorPanel({ content, onChange, onTreeChange }: EditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<number | null>(null)
  const [splitView, setSplitView] = useState(true)

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

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  useEffect(() => {
    const tree = parseMarkdown(content)
    onTreeChange(tree)
  }, [])

  const highlightedContent = useMemo(() => highlightMarkdown(content), [content])

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
        <div style={{ display: 'flex', gap: '4px', background: '#EEEEEE', padding: '2px', borderRadius: '6px' }}>
          <button
            onClick={() => setSplitView(false)}
            style={{
              padding: '4px 10px',
              border: 'none',
              borderRadius: '4px',
              background: !splitView ? '#FFFFFF' : 'transparent',
              color: '#333',
              cursor: 'pointer',
              fontSize: '12px',
              boxShadow: !splitView ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 200ms'
            }}
          >
            纯编辑
          </button>
          <button
            onClick={() => setSplitView(true)}
            style={{
              padding: '4px 10px',
              border: 'none',
              borderRadius: '4px',
              background: splitView ? '#FFFFFF' : 'transparent',
              color: '#333',
              cursor: 'pointer',
              fontSize: '12px',
              boxShadow: splitView ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 200ms'
            }}
          >
            分栏预览
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          flex: splitView ? 1 : '100%',
          position: 'relative',
          minWidth: 0,
          overflow: 'hidden',
          borderRight: splitView ? '1px solid #E0E0E0' : 'none'
        }}>
          <div
            ref={highlightRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: '16px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre',
              overflow: 'auto',
              pointerEvents: 'none',
              boxSizing: 'border-box',
              background: '#FFFEF7'
            }}
            aria-hidden="true"
          >
            {highlightedContent}
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onScroll={handleScroll}
            placeholder="在这里输入Markdown笔记..."
            spellCheck={false}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              padding: '16px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'transparent',
              caretColor: '#2196F3',
              background: 'transparent',
              boxSizing: 'border-box',
              zIndex: 1,
              overflow: 'auto'
            }}
          />
        </div>

        {splitView && (
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflow: 'auto',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#333',
              minWidth: 0,
              background: '#FAFAFA'
            }}
          >
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1565C0', borderBottom: '2px solid #E0E0E0', paddingBottom: '8px', marginTop: 0 }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#2E7D32', borderBottom: '1px solid #E0E0E0', paddingBottom: '6px', marginTop: '16px' }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#558B2F', marginTop: '12px' }}>{children}</h3>,
                h4: ({ children }) => <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginTop: '10px' }}>{children}</h4>,
                code: ({ children }) => <code style={{ background: '#FFF3E0', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', color: '#E65100', fontFamily: 'Consolas, Monaco, monospace' }}>{children}</code>,
                pre: ({ children }) => <pre style={{ background: '#263238', color: '#ECEFF1', padding: '12px', borderRadius: '8px', overflow: 'auto', fontSize: '13px', fontFamily: 'Consolas, Monaco, monospace' }}>{children}</pre>,
                ul: ({ children }) => <ul style={{ paddingLeft: '24px', margin: '8px 0' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ paddingLeft: '24px', margin: '8px 0' }}>{children}</ol>,
                li: ({ children }) => <li style={{ margin: '4px 0' }}>{children}</li>,
                p: ({ children }) => <p style={{ margin: '8px 0' }}>{children}</p>,
                blockquote: ({ children }) => <blockquote style={{ borderLeft: '4px solid #2196F3', paddingLeft: '12px', color: '#666', margin: '8px 0' }}>{children}</blockquote>,
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
