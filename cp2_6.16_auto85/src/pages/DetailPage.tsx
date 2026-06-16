import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StepEditor from '../components/StepEditor'
import {
  Recipe,
  Version,
  getRecipe,
  updateRecipe,
  getVersions,
  restoreVersion
} from '../services/api'

const cuisineLabels: Record<string, string> = {
  chinese: '中式',
  western: '西式',
  japanese: '日式',
  fusion: '融合'
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [versionsLoading, setVersionsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCookTime, setEditCookTime] = useState('')

  const loadRecipe = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await getRecipe(id)
      setRecipe(data)
      setEditName(data.name)
      setEditDescription(data.description)
      setEditCookTime(data.cookTime.toString())
    } catch (err) {
      console.error('加载配方失败:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadVersions = useCallback(async () => {
    if (!id) return
    try {
      setVersionsLoading(true)
      const data = await getVersions(id)
      setVersions(data)
    } catch (err) {
      console.error('加载版本历史失败:', err)
    } finally {
      setVersionsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadRecipe()
    loadVersions()
  }, [loadRecipe, loadVersions])

  const handleStepsChange = async (steps: Recipe['steps']) => {
    if (!recipe) return
    try {
      setSaving(true)
      const updated = await updateRecipe(recipe.id, { steps })
      setRecipe(updated)
      await loadVersions()
    } catch (err) {
      console.error('保存步骤失败:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBasicInfo = async () => {
    if (!recipe) return
    if (!editName.trim()) {
      alert('菜名不能为空')
      return
    }
    const cookTimeNum = parseInt(editCookTime)
    if (!cookTimeNum || cookTimeNum <= 0) {
      alert('请输入有效的预估耗时')
      return
    }
    try {
      setSaving(true)
      const updated = await updateRecipe(recipe.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        cookTime: cookTimeNum
      })
      setRecipe(updated)
      setEditMode(false)
      await loadVersions()
    } catch (err) {
      console.error('保存失败:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!id || !confirm('确定要恢复到此版本吗？当前修改将被保存为新版本。')) return
    try {
      setSaving(true)
      const result = await restoreVersion(id, versionId)
      setRecipe(result.recipe)
      setEditName(result.recipe.name)
      setEditDescription(result.recipe.description)
      setEditCookTime(result.recipe.cookTime.toString())
      await loadVersions()
    } catch (err) {
      console.error('恢复版本失败:', err)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  if (loading) {
    return (
      <div className="detail-page">
        <nav className="navbar">
          <div className="navbar-content">
            <h1 className="navbar-title">🍳 厨房日志</h1>
          </div>
        </nav>
        <main className="main-content">
          <div className="loading">加载中...</div>
        </main>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="detail-page">
        <nav className="navbar">
          <div className="navbar-content">
            <h1 className="navbar-title">🍳 厨房日志</h1>
          </div>
        </nav>
        <main className="main-content">
          <div className="empty-state">
            <p>配方不存在</p>
            <button className="btn-create" onClick={() => navigate('/')}>
              返回首页
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <nav className="navbar">
        <div className="navbar-content">
          <button className="back-btn" onClick={() => navigate('/')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 className="navbar-title">{recipe.name}</h1>
          <div className="navbar-right">
            {saving && <span className="saving-indicator">保存中...</span>}
            <button
              className="version-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="版本历史"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>版本</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="detail-layout">
        <main className="detail-main">
          <div className="recipe-header">
            {editMode ? (
              <div className="recipe-edit-form">
                <input
                  type="text"
                  className="form-input recipe-name-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="菜名"
                />
                <div className="edit-actions">
                  <button className="btn-secondary" onClick={() => setEditMode(false)}>
                    取消
                  </button>
                  <button className="btn-create" onClick={handleSaveBasicInfo}>
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="recipe-title-row">
                  <h2 className="recipe-name">{recipe.name}</h2>
                  <button
                    className="btn-edit"
                    onClick={() => setEditMode(true)}
                    aria-label="编辑"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
                <p className="recipe-description">{recipe.description}</p>
                <div className="recipe-meta">
                  <span className="meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    {recipe.cookTime} 分钟
                  </span>
                  <span className="meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                    </svg>
                    {cuisineLabels[recipe.cuisine] || '其他'}
                  </span>
                  <span className="meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2.25l2.09 4.24 4.68.68-3.39 3.3.8 4.67L12 13.01l-4.18 2.13.8-4.67-3.39-3.3 4.68-.68L12 2.25z"></path>
                    </svg>
                    {recipe.ingredients.length} 种食材
                  </span>
                </div>
              </>
            )}
          </div>

          {editMode ? (
            <div className="recipe-edit-section">
              <div className="form-group">
                <label>简要描述</label>
                <textarea
                  className="form-textarea"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  placeholder="描述这道菜的特点..."
                />
              </div>
              <div className="form-group">
                <label>预估耗时（分钟）</label>
                <input
                  type="number"
                  className="form-input"
                  value={editCookTime}
                  onChange={(e) => setEditCookTime(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="recipe-ingredients-section">
              <h3 className="section-subtitle">食材清单</h3>
              <div className="ingredients-grid">
                {recipe.ingredients.map((ing) => (
                  <div key={ing.id} className="ingredient-item">
                    <span className="ingredient-name">{ing.name}</span>
                    <span className="ingredient-amount">
                      {ing.quantity} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <StepEditor steps={recipe.steps} onChange={handleStepsChange} />
        </main>

        <aside className={`version-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>版本历史</h3>
            <button
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="关闭"
            >
              ×
            </button>
          </div>
          <div className="sidebar-content">
            {versionsLoading ? (
              <div className="loading-small">加载中...</div>
            ) : versions.length === 0 ? (
              <div className="empty-versions">暂无历史版本</div>
            ) : (
              <div className="version-timeline">
                {versions.map((version, index) => {
                  const versionNumber = versions.length - index
                  return (
                    <div key={version.id} className="version-item">
                      <div className="version-dot"></div>
                      <div className="version-line"></div>
                      <div className="version-content">
                        <div className="version-header">
                          <span className="version-number">版本 {versionNumber}</span>
                          <span className="version-date">
                            {formatDate(version.timestamp)}
                          </span>
                        </div>
                        <p className="version-summary">{version.summary}</p>
                        {version.restoredFrom && (
                          <span className="version-restored">恢复自版本</span>
                        )}
                        <button
                          className="btn-restore"
                          onClick={() => handleRestoreVersion(version.id)}
                        >
                          恢复此版本
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}
      </div>
    </div>
  )
}
