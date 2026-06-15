import { useState, useCallback } from 'react'
import type { AnalyzeResult, DateFilter } from '../types'

interface UseAnalysisReturn {
  repoUrl: string
  setRepoUrl: (url: string) => void
  loading: boolean
  progress: number
  result: AnalyzeResult | null
  error: string | null
  dateFilter: DateFilter
  setDateFilter: (filter: DateFilter) => void
  analyze: () => Promise<void>
  validateUrl: (url: string) => boolean
}

export function useAnalysis(): UseAnalysisReturn {
  const [repoUrl, setRepoUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days')

  const validateUrl = useCallback((url: string): boolean => {
    if (!url.trim()) return false
    try {
      const parsed = new URL(url)
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        (parsed.hostname.includes('github.com') || parsed.hostname.includes('gitee.com'))
      )
    } catch {
      return false
    }
  }, [])

  const simulateProgress = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      let current = 0
      const interval = setInterval(() => {
        current += 10
        setProgress(current)
        if (current >= 100) {
          clearInterval(interval)
          resolve()
        }
      }, 50)
    })
  }, [])

  const analyze = useCallback(async (): Promise<void> => {
    if (!validateUrl(repoUrl)) {
      setError('请输入有效的 GitHub 或 Gitee 仓库链接')
      return
    }

    setLoading(true)
    setError(null)
    setProgress(0)
    setResult(null)

    try {
      const progressPromise = simulateProgress()

      const response = await fetch('/api/repo/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ repoUrl })
      })

      if (!response.ok) {
        throw new Error('分析失败，请稍后重试')
      }

      const data: AnalyzeResult = await response.json()

      await progressPromise

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    } finally {
      setLoading(false)
    }
  }, [repoUrl, validateUrl, simulateProgress])

  return {
    repoUrl,
    setRepoUrl,
    loading,
    progress,
    result,
    error,
    dateFilter,
    setDateFilter,
    analyze,
    validateUrl
  }
}
