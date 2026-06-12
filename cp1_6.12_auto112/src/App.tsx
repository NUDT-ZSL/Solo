import { useState, useCallback } from 'react'
import { useAnalysis } from './hooks/useAnalysis'
import Dashboard from './components/Dashboard'
import type { ExportStatus } from './types'
import './App.css'

function App() {
  const {
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
  } = useAnalysis()

  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')

  const handleExport = useCallback(() => {
    if (!result) return

    const today = new Date().toISOString().split('T')[0]
    const filename = `code_stats_${today}.json`

    const exportData = {
      ...result,
      dateFilter,
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setExportStatus('success')
    setTimeout(() => {
      setExportStatus('idle')
    }, 3000)
  }, [result, dateFilter])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && validateUrl(repoUrl)) {
      analyze()
    }
  }

  const urlValid = validateUrl(repoUrl)

  return (
    <div className="app-container">
      {exportStatus === 'success' && (
        <div className="toast toast-success">
          <svg
            className="toast-icon"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          导出成功
        </div>
      )}

      <header className="app-header">
        <h1 className="app-title">代码统计仪表盘</h1>
        <p className="app-subtitle">快速分析 GitHub / Gitee 仓库代码统计数据</p>
      </header>

      <div className="input-section">
        <div className="input-row">
          <input
            type="text"
            className={`url-input ${error ? 'input-error' : ''}`}
            placeholder="粘贴 GitHub 或 Gitee 仓库 HTTPS 链接..."
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="analyze-btn"
            onClick={analyze}
            disabled={loading || !urlValid}
          >
            {loading ? (
              <>
                <span className="spinner" />
                分析中...
              </>
            ) : (
              '开始分析'
            )}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
      </div>

      {loading && (
        <div className="progress-section">
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {result && (
        <div className="dashboard-section">
          <div className="dashboard-header">
            <div className="filter-section">
              <label className="filter-label">时间范围：</label>
              <select
                className="date-select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
              >
                <option value="7days">最近 7 天</option>
                <option value="30days">最近 30 天</option>
                <option value="90days">最近 90 天</option>
              </select>
            </div>
            <button
              className="export-btn"
              onClick={handleExport}
              title="导出 JSON 报告"
            >
              <svg
                className="export-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              导出报告
            </button>
          </div>

          <Dashboard result={result} dateFilter={dateFilter} />
        </div>
      )}

      {!result && !loading && (
        <div className="empty-state">
          <svg
            className="empty-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 13h6M9 17h4"
            />
          </svg>
          <p className="empty-text">输入仓库链接开始分析代码统计数据</p>
        </div>
      )}
    </div>
  )
}

export default App
