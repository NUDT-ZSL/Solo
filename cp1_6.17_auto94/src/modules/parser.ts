import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'

export type Language = 'javascript' | 'typescript' | 'python' | 'html' | 'css'

export interface ParserResult {
  html: string
  lineCount: number
}

const languageMap: Record<Language, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  html: 'markup',
  css: 'css',
}

export function parseCode(code: string, language: Language): ParserResult {
  const prismLang = languageMap[language]
  const grammar = Prism.languages[prismLang]
  
  if (!grammar) {
    return {
      html: escapeHtml(code),
      lineCount: code.split('\n').length,
    }
  }

  const highlighted = Prism.highlight(code, grammar, prismLang)
  const lines = highlighted.split('\n')
  
  const html = lines
    .map((line, index) => {
      return `<div class="code-line"><span class="line-number">${index + 1}</span><span class="line-content">${line || ' '}</span></div>`
    })
    .join('')

  return {
    html,
    lineCount: lines.length,
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
