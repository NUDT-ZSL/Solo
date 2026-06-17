export interface SlideLine {
  type: 'h1' | 'h2' | 'h3' | 'text' | 'list' | 'code' | 'empty'
  content: string
  level?: number
}

export interface Slide {
  lines: SlideLine[]
  separator: string
}

function parseLine(line: string): SlideLine {
  if (line.trim() === '') {
    return { type: 'empty', content: '' }
  }

  const h1 = line.match(/^#\s+(.+)$/)
  if (h1) return { type: 'h1', content: h1[1].trim() }

  const h2 = line.match(/^##\s+(.+)$/)
  if (h2) return { type: 'h2', content: h2[1].trim() }

  const h3 = line.match(/^###\s+(.+)$/)
  if (h3) return { type: 'h3', content: h3[1].trim() }

  const list = line.match(/^\s*[-*]\s+(.+)$/)
  if (list) return { type: 'list', content: list[1].trim() }

  const code = line.match(/^`([^`]+)`$/)
  if (code) return { type: 'code', content: code[1].trim() }

  return { type: 'text', content: line.trim() }
}

function renderInline(content: string): string {
  return content.replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

export function renderContent(content: string): string {
  return renderInline(content)
}

export function parseMarkdown(markdown: string): Slide[] {
  const normalized = markdown.replace(/\r\n/g, '\n')
  const rawSlides = normalized.split(/^\s*---\s*$/m)

  const slides: Slide[] = rawSlides.map((raw, index) => {
    const lines = raw.split('\n').map(parseLine)
    return {
      lines,
      separator: index < rawSlides.length - 1 ? '---' : ''
    }
  })

  return slides.length === 0 ? [{ lines: [{ type: 'empty', content: '' }], separator: '' }] : slides
}
