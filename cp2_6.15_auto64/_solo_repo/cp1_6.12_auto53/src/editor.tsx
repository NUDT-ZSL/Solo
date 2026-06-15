import { useEffect, useRef, useMemo } from 'react'
import type { FunctionNode } from './store'

interface EditorProps {
  sourceLines: string[]
  selectedNode: FunctionNode | null
}

type TokenType =
  | 'keyword'
  | 'identifier'
  | 'string'
  | 'comment'
  | 'number'
  | 'operator'
  | 'punctuation'
  | 'regex'
  | 'function'
  | 'text'

interface Token {
  type: TokenType
  value: string
}

const KEYWORDS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'new',
  'this',
  'class',
  'extends',
  'import',
  'export',
  'default',
  'from',
  'async',
  'await',
  'try',
  'catch',
  'finally',
  'throw',
  'typeof',
  'instanceof',
  'in',
  'of',
  'true',
  'false',
  'null',
  'undefined',
  'void',
  'delete',
  'yield',
  'static',
  'super',
  'constructor',
  'as',
  'type',
  'interface',
  'implements',
  'private',
  'protected',
  'public',
  'readonly',
])

type LexerState =
  | 'normal'
  | 'single-string'
  | 'double-string'
  | 'template-string'
  | 'single-line-comment'
  | 'multi-line-comment'
  | 'regex-literal'

function tokenizeLine(
  line: string,
  startState: LexerState
): { tokens: Token[]; endState: LexerState } {
  const tokens: Token[] = []
  let i = 0
  let state: LexerState = startState
  const src = line
  const len = src.length

  function pushToken(type: TokenType, value: string) {
    if (value.length > 0) tokens.push({ type, value })
  }

  function consumeEscape(stateChar: string): number {
    let j = i + 1
    while (j < len) {
      if (src[j] === '\\') {
        j++
      } else if (src[j] === stateChar) {
        return j - i + 1
      }
      j++
    }
    return len - i
  }

  while (i < len) {
    if (state === 'single-line-comment') {
      pushToken('comment', src.slice(i))
      i = len
      state = 'normal'
      continue
    }

    if (state === 'multi-line-comment') {
      const endIdx = src.indexOf('*/', i)
      if (endIdx !== -1) {
        pushToken('comment', src.slice(i, endIdx + 2))
        i = endIdx + 2
        state = 'normal'
      } else {
        pushToken('comment', src.slice(i))
        i = len
      }
      continue
    }

    if (state === 'single-string') {
      const consumed = consumeEscape("'")
      pushToken('string', src.slice(i, i + consumed))
      i += consumed
      state = 'normal'
      continue
    }

    if (state === 'double-string') {
      const consumed = consumeEscape('"')
      pushToken('string', src.slice(i, i + consumed))
      i += consumed
      state = 'normal'
      continue
    }

    if (state === 'template-string') {
      let j = i
      while (j < len) {
        if (src[j] === '`') {
          j++
          pushToken('string', src.slice(i, j))
          i = j
          state = 'normal'
          break
        } else if (src[j] === '\\') {
          j += 2
        } else {
          j++
        }
      }
      if (state === 'template-string') {
        pushToken('string', src.slice(i))
        i = len
      }
      continue
    }

    if (state === 'regex-literal') {
      const consumed = consumeEscape('/')
      pushToken('regex', src.slice(i, i + consumed))
      i += consumed
      let flags = ''
      while (i < len && /[a-zA-Z]/.test(src[i])) {
        flags += src[i]
        i++
      }
      if (flags.length > 0) pushToken('regex', flags)
      state = 'normal'
      continue
    }

    if (src[i] === '/' && src[i + 1] === '/') {
      pushToken('comment', src.slice(i))
      i = len
      continue
    }

    if (src[i] === '/' && src[i + 1] === '*') {
      const endIdx = src.indexOf('*/', i + 2)
      if (endIdx !== -1) {
        pushToken('comment', src.slice(i, endIdx + 2))
        i = endIdx + 2
        state = 'normal'
      } else {
        pushToken('comment', src.slice(i))
        i = len
        state = 'multi-line-comment'
      }
      continue
    }

    if (src[i] === "'") {
      const consumed = consumeEscape("'")
      pushToken('string', src.slice(i, i + consumed))
      i += consumed
      continue
    }

    if (src[i] === '"') {
      const consumed = consumeEscape('"')
      pushToken('string', src.slice(i, i + consumed))
      i += consumed
      continue
    }

    if (src[i] === '`') {
      let j = i + 1
      while (j < len) {
        if (src[j] === '`') {
          j++
          pushToken('string', src.slice(i, j))
          i = j
          break
        } else if (src[j] === '\\') {
          j += 2
        } else {
          j++
        }
      }
      if (j >= len) {
        pushToken('string', src.slice(i))
        i = len
        state = 'template-string'
      }
      continue
    }

    const lastTok = tokens.length > 0 ? tokens[tokens.length - 1] : null
    if (src[i] === '/') {
      const lastNonWs = lastTok
      const canStartRegex =
        !lastNonWs ||
        (lastNonWs.type === 'operator' ||
          lastNonWs.type === 'punctuation' ||
          lastNonWs.type === 'keyword' ||
          lastNonWs.value === ';' ||
          lastNonWs.value === '{' ||
          lastNonWs.value === '(' ||
          lastNonWs.value === ',' ||
          lastNonWs.value === '=')

      if (canStartRegex) {
        const consumed = consumeEscape('/')
        pushToken('regex', src.slice(i, i + consumed))
        i += consumed
        let flags = ''
        while (i < len && /[a-zA-Z]/.test(src[i])) {
          flags += src[i]
          i++
        }
        if (flags.length > 0) pushToken('regex', flags)
        continue
      } else {
        pushToken('operator', '/')
        i++
        continue
      }
    }

    if (/[a-zA-Z_$]/.test(src[i])) {
      let j = i
      while (j < len && /[a-zA-Z0-9_$]/.test(src[j])) j++
      const word = src.slice(i, j)
      if (KEYWORDS.has(word)) {
        pushToken('keyword', word)
      } else if (j < len && src[j] === '(') {
        pushToken('function', word)
      } else {
        pushToken('identifier', word)
      }
      i = j
      continue
    }

    if (/[0-9]/.test(src[i])) {
      let j = i
      while (
        j < len &&
        (/[0-9.xXa-fA-F_]/.test(src[j]) || /[eEpP][+\-]/.test(src.slice(j, j + 2)))
      ) {
        if (/[eEpP][+\-]/.test(src.slice(j, j + 2))) j += 2
        else j++
      }
      pushToken('number', src.slice(i, j))
      i = j
      continue
    }

    if (/[+\-*/%=<>!&|^~?:]/.test(src[i])) {
      let op = src[i]
      if (/[<>=!+\-*/%&|^]/.test(src[i]) && src[i + 1] === '=') {
        op += '='
        i++
      } else if (
        (src[i] === '+' && src[i + 1] === '+') ||
        (src[i] === '-' && src[i + 1] === '-') ||
        (src[i] === '&' && src[i + 1] === '&') ||
        (src[i] === '|' && src[i + 1] === '|') ||
        (src[i] === '<' && src[i + 1] === '<') ||
        (src[i] === '>' && src[i + 1] === '>') ||
        (src[i] === '*' && src[i + 1] === '*')
      ) {
        op += src[i + 1]
        i++
      }
      pushToken('operator', op)
      i++
      continue
    }

    if (/[(){}[\],;.]/.test(src[i])) {
      pushToken('punctuation', src[i])
      i++
      continue
    }

    pushToken('text', src[i])
    i++
  }

  return { tokens, endState: state }
}

function renderTokens(tokens: Token[]): string {
  const cssClass: Record<TokenType, string> = {
    keyword: 'tok-keyword',
    identifier: 'tok-identifier',
    string: 'tok-string',
    comment: 'tok-comment',
    number: 'tok-number',
    operator: 'tok-operator',
    punctuation: 'tok-punctuation',
    regex: 'tok-regex',
    function: 'tok-function',
    text: 'tok-text',
  }

  return tokens
    .map((t) =>
      t.type === 'text'
        ? escapeHtml(t.value)
        : `<span class="${cssClass[t.type]}">${escapeHtml(t.value)}</span>`
    )
    .join('')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function Editor({ sourceLines, selectedNode }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const highlightRange = useMemo(() => {
    if (!selectedNode) return null
    return { start: selectedNode.startLine, end: selectedNode.endLine }
  }, [selectedNode])

  const renderedLines = useMemo(() => {
    const results: string[] = []
    let state: LexerState = 'normal'
    for (const line of sourceLines) {
      const { tokens, endState } = tokenizeLine(line, state)
      state = endState
      results.push(renderTokens(tokens))
    }
    return results
  }, [sourceLines])

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
              className={`editor-line${
                isHighlighted ? ' editor-line-highlighted' : ''
              }`}
            >
              <span className="editor-linenum">{lineNum}</span>
              <span
                className="editor-code"
                dangerouslySetInnerHTML={{ __html: renderedLines[idx] }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
