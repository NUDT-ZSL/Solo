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

export type DateFilter = '7days' | '30days' | '90days'

export type ExportStatus = 'idle' | 'success' | 'error'
