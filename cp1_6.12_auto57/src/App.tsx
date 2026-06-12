import { useState, useCallback, useRef, useEffect } from 'react'
import axios from 'axios'
import EditorPanel from '@/components/EditorPanel.tsx'
import MindmapCanvas from '@/components/MindmapCanvas.tsx'
import { treeToMarkdown, parseMarkdown } from '@/utils/parser.ts'
import type { TreeNode } from '@/types/index.ts'

const DEFAULT_MARKDOWN = `# Markdown 思维导图

## 🚀 快速开始

### 编辑笔记

- 在左侧编辑器输入 Markdown
- 支持标题、列表、代码块
- 实时生成思维导图

### 操作导图

- 滚轮缩放画布
- 拖拽空白区域平移
- 拖拽节点调整关系
- 双击节点展开折叠

## 📝 语法说明

### 标题层级

- 一级标题 = 中心节点
- 二级标题 = 主分支
- 三级标题 = 子分支
- 四级及以下 = 更深分支

### 列表项

- 作为叶节点显示
- 支持缩进嵌套

## 🎨 功能特性

### 导出格式

- 导出 SVG 矢量图
- 导出 PNG 高清图
- 透明背景

### 数据同步

- 双向实时同步
- 最小化文本修改
- 自动保存服务

## 💡 使用技巧

### 快捷键

- 双击展开/折叠
- Ctrl+S 保存笔记
- 滚轮缩放 0.3x~3x

### 最佳实践

- 使用清晰的标题层级
- 列表项简洁明了
- 合理使用折叠功能
`

export default function App() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN)
  const [tree, setTree] = useState<TreeNode[]>([])
  const [splitRatio, setSplitRatio] = useState(0.4)
  const [isDragging, setIsDragging] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [noteId, setNoteId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMarkdownChange = useCallback((content: string) => {
    setMarkdown(content)
  }, [])

  const handleTreeChange = useCallback((newTree: TreeNode[]) => {
    setTree(newTree)
  }, [])

  const handleMarkdownSync = useCallback((newMarkdown: string) => {
    setMarkdown(newMarkdown)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const ratio = Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width))
      setSplitRatio(ratio)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const saveNote = useCallback(async () => {
    try {
      setSaveStatus('saving')
      const response = await axios.post('/api/notes', {
        content: markdown,
        tree
      })
      if (response.data.success) {
        setNoteId(response.data.id)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (error) {
      console.error('Save failed:', error)
      setSaveStatus('idle')
    }
  }, [markdown, tree])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveNote()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveNote])

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#F8F9FA',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E0E0E0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🧠</span>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#333' }}>
            Markdown 思维导图
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {noteId && (
            <span style={{ fontSize: '12px', color: '#999' }}>
              ID: {noteId.slice(0, 8)}...
            </span>
          )}
          <button
            onClick={saveNote}
            disabled={saveStatus === 'saving'}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: saveStatus === 'saved' ? '#4CAF50' : '#2196F3',
              color: '#FFFFFF',
              cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 200ms',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {saveStatus === 'saving' && <span>⏳</span>}
            {saveStatus === 'saved' && <span>✓</span>}
            {saveStatus === 'idle' && <span>💾</span>}
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : '保存笔记'}
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        position: 'relative'
      }}>
        <div style={{
          width: `${splitRatio * 100}%`,
          minWidth: 0,
          height: '100%',
          transition: isDragging ? 'none' : 'background 300ms ease'
        }}>
          <EditorPanel
            content={markdown}
            onChange={handleMarkdownChange}
            onTreeChange={handleTreeChange}
          />
        </div>

        <div
          onMouseDown={handleMouseDown}
          style={{
            width: '6px',
            cursor: 'col-resize',
            background: isDragging ? '#2196F3' : '#E0E0E0',
            transition: 'background 200ms',
            position: 'relative',
            zIndex: 10,
            flexShrink: 0
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{
              width: '2px',
              height: '20px',
              background: isDragging ? '#FFFFFF' : '#BDBDBD',
              borderRadius: '1px'
            }} />
          </div>
        </div>

        <div style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          transition: isDragging ? 'none' : 'background 300ms ease'
        }}>
          <MindmapCanvas
            tree={tree}
            onTreeChange={handleTreeChange}
            onMarkdownSync={handleMarkdownSync}
          />
        </div>
      </div>
    </div>
  )
}
