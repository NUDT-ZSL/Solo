import { useEffect, useRef, useMemo } from 'react'
import type { FunctionNode } from './store'

interface EditorProps {
  sourceLines: string[]
  selectedNode: FunctionNode | null
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for',
  'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this',
  'class', 'extends', 'import', 'export', 'default', 'from', 'async',
  'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof',
  'in', 'of', 'true', 'false', 'null', 'undefined', 'void', 'delete',
  'yield', 'static', 'super', 'constructor',
])

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightLine(line: string): string {
  const tokens: string[] = []
  let i = 0
  const src = line

  while (i < src.length) {
    if (src[i] === '/' && src[i + 1] === '/') {
      tokens.push(`<span class="tok-comment">${escapeHtml(src.slice(i))}</span>`)
      break
    }

    if (src[i] === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      const commentEnd = end === -1 ? src.length : end + 2
      tokens.push(`<span class="tok-comment">${escapeHtml(src.slice(i, commentEnd))}</span>`)
      i = commentEnd
      continue
    }

    if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
      const quote = src[i]
      let j = i + 1
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\') j++
        j++
      }
      j = Math.min(j + 1, src.length)
      tokens.push(`<span class="tok-string">${escapeHtml(src.slice(i, j))}</span>`)
      i = j
      continue
    }

    if (/[a-zA-Z_$]/.test(src[i])) {
      let j = i
      while (j < src.length && /[a-zA-Z0-9_$]/.test(src[j])) j++
      const word = src.slice(i, j)
      if (KEYWORDS.has(word)) {
        tokens.push(`<span class="tok-keyword">${word}</span>`)
      } else if (j < src.length && src[j] === '(') {
        tokens.push(`<span class="tok-function">${escapeHtml(word)}</span>`)
      } else {
        tokens.push(escapeHtml(word))
      }
      i = j
      continue
    }

    if (/[0-9]/.test(src[i])) {
      let j = i
      while (j < src.length && /[0-9.xXa-fA-F_]/.test(src[j])) j++
      tokens.push(`<span class="tok-number">${escapeHtml(src.slice(i, j))}</span>`)
      i = j
      continue
    }

    tokens.push(escapeHtml(src[i]))
    i++
  }

  return tokens.join('')
}

export function Editor({ sourceLines, selectedNode }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const highlightRange = useMemo(() => {
    if (!selectedNode) return null
    return { start: selectedNode.startLine, end: selectedNode.endLine }
  }, [selectedNode])

  useEffect(() => {
    if (!highlightRange || !containerRef.current) return
    const lineEl = lineRefs.current.get(highlightRange.start)
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightRange])

  if (sourceLines.length === 0) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-icon">{'</>'}</div>
        <div className="editor-empty-text">上传 .js 或 .ts 文件查看源码</div>
      </div>
    )
  }

  return (
    <div className="editor-wrapper" ref={containerRef}>
      <div className="editor-content">
        {sourceLines.map((line, idx) => {
          const lineNum = idx + 1
          const isHighlighted =
            highlightRange !== null &&
            lineNum >= highlightRange.start &&
            lineNum <= highlightRange.end

          return (
            <div
              key={lineNum}
              ref={(el) => {
                if (el) lineRefs.current.set(lineNum, el)
              }}
              className={`editor-line${isHighlighted ? ' editor-line-highlighted' : ''}`}
            >
              <span className="editor-linenum">{lineNum}</span>
              <span
                className="editor-code"
                dangerouslySetInnerHTML={{ __html: highlightLine(line) }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
