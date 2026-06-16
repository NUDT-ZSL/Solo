import React, { useEffect, useState, useCallback } from 'react'
import { Snowflake, Download, ChevronDown, ChevronUp } from 'lucide-react'
import IdeaInput from './components/IdeaInput'
import IdeaCard from './components/IdeaCard'
import ClusterGraph from './components/ClusterGraph'
import {
  getIdeas,
  postIdea,
  clusterIdeas,
  updateIdeaNote,
  updateIdeaContent,
} from './api'
import type { Idea, ClusterResult } from './api'

const App: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [newIdeaIds, setNewIdeaIds] = useState<Set<string>>(new Set())
  const [showCluster, setShowCluster] = useState(false)
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const refreshIdeas = useCallback(async () => {
    try {
      const data = await getIdeas()
      setIdeas(data)
    } catch (e) {
      console.error('Failed to load ideas', e)
    }
  }, [])

  useEffect(() => {
    refreshIdeas()
  }, [refreshIdeas])

  const handleSubmit = useCallback(
    async (content: string) => {
      try {
        const idea = await postIdea(content)
        setNewIdeaIds((prev) => new Set(prev).add(idea.id))
        await refreshIdeas()
        setTimeout(() => {
          setNewIdeaIds((prev) => {
            const next = new Set(prev)
            next.delete(idea.id)
            return next
          })
        }, 500)
      } catch (e) {
        console.error('Failed to submit', e)
      }
    },
    [refreshIdeas]
  )

  const handleCluster = useCallback(async () => {
    if (showCluster) {
      setShowCluster(false)
      setClusterResult(null)
      return
    }
    setLoading(true)
    try {
      const result = await clusterIdeas()
      setClusterResult(result)
      setShowCluster(true)
    } catch (e) {
      console.error('Cluster failed', e)
    } finally {
      setLoading(false)
    }
  }, [showCluster])

  const handleExport = useCallback(() => {
    if (ideas.length === 0) return

    let draft = '# 灵感灯塔 - 项目草稿\n\n'
    draft += `导出时间：${new Date().toLocaleString('zh-CN')}\n\n`

    if (clusterResult && clusterResult.clusters.length > 0) {
      clusterResult.clusters.forEach((cluster) => {
        draft += `## ${cluster.label}\n\n`
        cluster.ideaIds.forEach((id) => {
          const idea = ideas.find((i) => i.id === id)
          if (idea) {
            draft += `- ${idea.content}\n`
            if (idea.note) draft += `  > 备注：${idea.note}\n`
          }
        })
        draft += '\n'
      })
    } else {
      draft += '## 所有灵感\n\n'
      ideas.forEach((idea) => {
        draft += `- ${idea.content}\n`
        if (idea.note) draft += `  > 备注：${idea.note}\n`
      })
    }

    const blob = new Blob([draft], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `灵感灯塔_草稿_${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [ideas, clusterResult])

  const handleUpdateNote = useCallback(
    async (id: string, note: string) => {
      await updateIdeaNote(id, note)
      await refreshIdeas()
    },
    [refreshIdeas]
  )

  const handleUpdateContent = useCallback(
    async (id: string, content: string) => {
      await updateIdeaContent(id, content)
      await refreshIdeas()
    },
    [refreshIdeas]
  )

  const columns = isMobile ? 1 : 3
  const columnIdeas: Idea[][] = Array.from({ length: columns }, () => [])
  ideas.forEach((idea, i) => {
    columnIdeas[i % columns].push(idea)
  })

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {isMobile && (
        <div style={styles.mobileToggle} onClick={() => setPanelOpen(!panelOpen)}>
          <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>
            💡 灵感捕捉
          </span>
          {panelOpen ? <ChevronUp size={18} color="#6c63ff" /> : <ChevronDown size={18} color="#6c63ff" />}
        </div>
      )}

      {isMobile && panelOpen && (
        <div style={styles.mobilePanel}>
          <IdeaInput onSubmit={handleSubmit} />
        </div>
      )}

      <div style={styles.layout}>
        {!isMobile && (
          <div style={styles.leftPanel}>
            <IdeaInput onSubmit={handleSubmit} />
          </div>
        )}

        <div style={styles.mainArea}>
          {showCluster && clusterResult && (
            <ClusterGraph
              ideas={ideas}
              clusterResult={clusterResult}
              onClose={() => {
                setShowCluster(false)
                setClusterResult(null)
              }}
            />
          )}

          {ideas.length === 0 ? (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>✨</span>
              <span style={styles.emptyText}>
                还没有灵感，快来记录你的第一个想法吧
              </span>
            </div>
          ) : (
            <div style={styles.masonry}>
              {columnIdeas.map((col, ci) => (
                <div key={ci} style={styles.masonryCol}>
                  {col.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      onUpdateNote={handleUpdateNote}
                      onUpdateContent={handleUpdateContent}
                      isNew={newIdeaIds.has(idea.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.floatingBtns}>
        <button
          onClick={handleCluster}
          style={{
            ...styles.floatBtn,
            background: showCluster ? '#4a4a5e' : '#6c63ff',
          }}
          title="聚类分析"
          disabled={loading || ideas.length === 0}
        >
          <Snowflake size={20} color="#fff" />
        </button>
        <button
          onClick={handleExport}
          style={{
            ...styles.floatBtn,
            opacity: ideas.length === 0 ? 0.4 : 1,
            cursor: ideas.length === 0 ? 'not-allowed' : 'pointer',
          }}
          title="导出草稿"
          disabled={ideas.length === 0}
        >
          <Download size={20} color="#fff" />
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#121212',
    color: '#e0e0e0',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
    position: 'relative',
  },
  mobileToggle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    background: '#1e1e2e',
    cursor: 'pointer',
  },
  mobilePanel: {
    padding: '0 16px 16px',
    background: '#1e1e2e',
  },
  layout: {
    display: 'flex',
    gap: 24,
    padding: 24,
    minHeight: 'calc(100vh - 48px)',
  },
  leftPanel: {
    flexShrink: 0,
    position: 'sticky',
    top: 24,
    alignSelf: 'flex-start',
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 80,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    color: '#6a6a8e',
    fontSize: 15,
  },
  masonry: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
  },
  masonryCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  floatingBtns: {
    position: 'fixed',
    bottom: 40,
    right: 40,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    zIndex: 100,
  },
  floatBtn: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
  },
}

export default App
