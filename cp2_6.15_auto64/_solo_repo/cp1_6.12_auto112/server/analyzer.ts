export interface FileInfo {
  path: string
  language: string
  lines: number
  commentLines: number
}

export interface LanguageStats {
  language: string
  lines: number
  files: number
  color: string
}

export interface AnalyzeResult {
  repoUrl: string
  totalLines: number
  totalFiles: number
  commentLines: number
  commentRatio: number
  files: FileInfo[]
  languages: LanguageStats[]
  analyzedAt: string
}

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#F7DF1E',
  Python: '#3572A5',
  TypeScript: '#3178C6'
}

interface FileTemplate {
  path: string
  language: string
  minLines: number
  maxLines: number
  commentRatio: number
}

const fileTemplates: FileTemplate[] = [
  { path: 'src/index.js', language: 'JavaScript', minLines: 50, maxLines: 150, commentRatio: 0.15 },
  { path: 'src/app.js', language: 'JavaScript', minLines: 100, maxLines: 300, commentRatio: 0.12 },
  { path: 'src/utils/helpers.js', language: 'JavaScript', minLines: 80, maxLines: 200, commentRatio: 0.2 },
  { path: 'src/components/Button.js', language: 'JavaScript', minLines: 60, maxLines: 180, commentRatio: 0.1 },
  { path: 'src/components/Modal.js', language: 'JavaScript', minLines: 120, maxLines: 250, commentRatio: 0.08 },
  { path: 'src/services/api.js', language: 'JavaScript', minLines: 90, maxLines: 220, commentRatio: 0.18 },
  { path: 'src/hooks/useData.js', language: 'JavaScript', minLines: 70, maxLines: 160, commentRatio: 0.15 },
  { path: 'src/pages/Home.js', language: 'JavaScript', minLines: 150, maxLines: 350, commentRatio: 0.1 },
  { path: 'src/pages/Dashboard.js', language: 'JavaScript', minLines: 200, maxLines: 400, commentRatio: 0.08 },
  { path: 'src/router/index.js', language: 'JavaScript', minLines: 40, maxLines: 120, commentRatio: 0.2 },
  { path: 'src/models/user.py', language: 'Python', minLines: 80, maxLines: 200, commentRatio: 0.25 },
  { path: 'src/models/product.py', language: 'Python', minLines: 100, maxLines: 250, commentRatio: 0.22 },
  { path: 'src/controllers/auth.py', language: 'Python', minLines: 120, maxLines: 280, commentRatio: 0.2 },
  { path: 'src/controllers/user.py', language: 'Python', minLines: 150, maxLines: 320, commentRatio: 0.18 },
  { path: 'src/utils/validators.py', language: 'Python', minLines: 90, maxLines: 200, commentRatio: 0.3 },
  { path: 'src/services/database.py', language: 'Python', minLines: 180, maxLines: 350, commentRatio: 0.25 },
  { path: 'src/services/email.py', language: 'Python', minLines: 70, maxLines: 180, commentRatio: 0.2 },
  { path: 'src/middleware/auth.py', language: 'Python', minLines: 60, maxLines: 150, commentRatio: 0.28 },
  { path: 'src/routes/api.py', language: 'Python', minLines: 110, maxLines: 260, commentRatio: 0.15 },
  { path: 'src/config/settings.py', language: 'Python', minLines: 50, maxLines: 130, commentRatio: 0.35 },
  { path: 'src/types/index.ts', language: 'TypeScript', minLines: 60, maxLines: 150, commentRatio: 0.2 },
  { path: 'src/types/user.ts', language: 'TypeScript', minLines: 40, maxLines: 100, commentRatio: 0.18 },
  { path: 'src/utils/format.ts', language: 'TypeScript', minLines: 80, maxLines: 180, commentRatio: 0.22 },
  { path: 'src/utils/validation.ts', language: 'TypeScript', minLines: 100, maxLines: 220, commentRatio: 0.25 },
  { path: 'src/services/http.ts', language: 'TypeScript', minLines: 120, maxLines: 280, commentRatio: 0.15 },
  { path: 'src/store/index.ts', language: 'TypeScript', minLines: 90, maxLines: 200, commentRatio: 0.12 },
  { path: 'src/store/userSlice.ts', language: 'TypeScript', minLines: 110, maxLines: 240, commentRatio: 0.1 },
  { path: 'src/components/Header.tsx', language: 'TypeScript', minLines: 80, maxLines: 180, commentRatio: 0.1 },
  { path: 'src/components/Chart.tsx', language: 'TypeScript', minLines: 150, maxLines: 300, commentRatio: 0.08 },
  { path: 'src/App.tsx', language: 'TypeScript', minLines: 100, maxLines: 220, commentRatio: 0.15 }
]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function analyzeRepo(repoUrl: string): AnalyzeResult {
  const seed = hashString(repoUrl)
  const random = seededRandom(seed)

  const files: FileInfo[] = fileTemplates.map((template) => {
    const lines = Math.floor(
      template.minLines + random() * (template.maxLines - template.minLines)
    )
    const commentLines = Math.floor(lines * template.commentRatio)
    return {
      path: template.path,
      language: template.language,
      lines,
      commentLines
    }
  })

  const totalLines = files.reduce((sum, f) => sum + f.lines, 0)
  const totalFiles = files.length
  const commentLines = files.reduce((sum, f) => sum + f.commentLines, 0)
  const commentRatio = totalLines > 0 ? commentLines / totalLines : 0

  const languageMap = new Map<string, { lines: number; files: number }>()
  for (const file of files) {
    const existing = languageMap.get(file.language) || { lines: 0, files: 0 }
    languageMap.set(file.language, {
      lines: existing.lines + file.lines,
      files: existing.files + 1
    })
  }

  const languages: LanguageStats[] = Array.from(languageMap.entries()).map(
    ([language, stats]) => ({
      language,
      lines: stats.lines,
      files: stats.files,
      color: LANGUAGE_COLORS[language] || '#888888'
    })
  )

  languages.sort((a, b) => b.lines - a.lines)

  return {
    repoUrl,
    totalLines,
    totalFiles,
    commentLines,
    commentRatio,
    files,
    languages,
    analyzedAt: new Date().toISOString()
  }
}
