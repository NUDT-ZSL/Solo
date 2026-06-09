import { useState } from 'react'
import { WorkspaceIngredient, Difficulty, DIFFICULTY_STARS, DIFFICULTY_LABELS, Ingredient, CATEGORIES } from '../types'

interface WorkspaceProps {
  ingredients: WorkspaceIngredient[]
  setIngredients: (ingredients: WorkspaceIngredient[]) => void
  metadata: {
    name: string
    difficulty: Difficulty
    duration: number
    description: string
  }
  setMetadata: (metadata: {
    name: string
    difficulty: Difficulty
    duration: number
    description: string
  }) => void
  onSave: () => void
  savedId: string | null
  onCopyLink: () => void
  readonly?: boolean
  errors?: Record<string, boolean>
  isSaving?: boolean
}

export default function Workspace({
  ingredients,
  setIngredients,
  metadata,
  setMetadata,
  onSave,
  savedId,
  onCopyLink,
  readonly = false,
  errors = {},
  isSaving = false
}: WorkspaceProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    if (readonly) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (readonly) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    if (readonly) return
    e.preventDefault()
    setIsDragOver(false)

    try {
      const data = e.dataTransfer.getData('application/json')
      if (!data) return
      const ingredient: Ingredient = JSON.parse(data)

      const existingIndex = ingredients.findIndex(i => i.id === ingredient.id)
      if (existingIndex >= 0) {
        const updated = [...ingredients]
        updated[existingIndex] = {
          ...updated[existingIndex],
          amount: updated[existingIndex].amount + 100
        }
        setIngredients(updated)
      } else {
        const newIngredient: WorkspaceIngredient = {
          ...ingredient,
          amount: 100
        }
        setIngredients([...ingredients, newIngredient])
      }
    } catch (err) {
      console.error('解析拖拽数据失败:', err)
    }
  }

  const handleAmountChange = (index: number, value: string) => {
    if (readonly) return
    const amount = parseFloat(value) || 0
    const updated = [...ingredients]
    updated[index] = { ...updated[index], amount: Math.max(0, amount) }
    setIngredients(updated)
  }

  const handleRemove = (index: number) => {
    if (readonly) return
    const updated = ingredients.filter((_, i) => i !== index)
    setIngredients(updated)
  }

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.key === category)
    return cat ? cat.label : category
  }

  const getEntryCalories = (ing: WorkspaceIngredient) => {
    return Math.round(ing.calories * (ing.amount / 100))
  }

  const difficultyOptions: Difficulty[] = ['easy', 'medium', 'hard']

  const shareLink = savedId ? `${window.location.origin}/recipe/${savedId}` : ''

  return (
    <div className="workspace">
      <div
        className={`workspace-panel ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="workspace-title">
          <h2>🍽️ 工作台 <span style={{ fontSize: 13, fontWeight: 400, color: '#6D4C41' }}>（{ingredients.length} 种食材）</span></h2>
          {readonly && <span className="readonly-badge">只读模式</span>}
        </div>

        {ingredients.length === 0 ? (
          <div className="drop-hint">
            <div className="drop-hint-icon">🧑‍🍳</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              {readonly ? '暂无食材' : '从左侧拖拽食材到这里开始创作'}
            </div>
            {!readonly && <div style={{ fontSize: 12 }}>支持多次添加同一食材，会自动累加用量</div>}
          </div>
        ) : (
          <div className="ingredient-list">
            {ingredients.map((ing, index) => (
              <div key={`${ing.id}-${index}`} className="ingredient-entry">
                <div className="ingredient-entry-icon">{ing.icon}</div>
                <div className="ingredient-entry-info">
                  <h4>{ing.name}</h4>
                  <span>{getCategoryLabel(ing.category)} · {ing.calories} kcal/100g</span>
                </div>
                <div className="amount-input">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={ing.amount}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                    disabled={readonly}
                  />
                  <label>g</label>
                </div>
                <div className="entry-calories">{getEntryCalories(ing)} kcal</div>
                <button
                  className="entry-remove"
                  onClick={() => handleRemove(index)}
                  disabled={readonly}
                  title="移除食材"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="metadata-panel">
        <h2>📋 菜谱信息</h2>

        <div className="form-group">
          <label>菜谱名称 <span style={{ color: '#E53935' }}>*</span></label>
          <input
            type="text"
            placeholder="给你的美食起个名字（最多30字）"
            value={metadata.name}
            onChange={(e) => setMetadata({ ...metadata, name: e.target.value.slice(0, 30) })}
            disabled={readonly}
            className={errors.name ? 'error' : ''}
          />
          <div className="char-counter">{metadata.name.length}/30</div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>难度等级</label>
            <div className="difficulty-selector">
              {difficultyOptions.map(diff => (
                <button
                  key={diff}
                  type="button"
                  className={`difficulty-btn ${metadata.difficulty === diff ? 'active' : ''}`}
                  onClick={() => !readonly && setMetadata({ ...metadata, difficulty: diff })}
                  disabled={readonly}
                >
                  <div className="difficulty-stars">
                    {'⭐'.repeat(DIFFICULTY_STARS[diff])}
                  </div>
                  <div className="difficulty-label">{DIFFICULTY_LABELS[diff]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>烹饪时长：{metadata.duration} 分钟</label>
            <div className="slider-container">
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={metadata.duration}
                onChange={(e) => setMetadata({ ...metadata, duration: parseInt(e.target.value) })}
                disabled={readonly}
              />
              <div className="slider-value">{metadata.duration}分</div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>描述文字</label>
          <textarea
            placeholder="描述一下这道菜的特色、做法要点...（最多200字）"
            value={metadata.description}
            onChange={(e) => setMetadata({ ...metadata, description: e.target.value.slice(0, 200) })}
            disabled={readonly}
            rows={3}
          />
          <div className="char-counter">{metadata.description.length}/200</div>
        </div>

        {!readonly && (
          <>
            <button
              className="save-btn"
              onClick={onSave}
              disabled={isSaving || ingredients.length === 0}
            >
              {isSaving ? (
                <>
                  <span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, marginBottom: 0 }}></span>
                  保存中...
                </>
              ) : (
                <>💾 保存并生成分享链接</>
              )}
            </button>

            {savedId && (
              <div className="share-panel">
                <h3>🔗 菜谱已保存！分享给朋友：</h3>
                <div className="share-link-container">
                  <div className="share-link">{shareLink}</div>
                  <button className="copy-btn" onClick={onCopyLink}>
                    复制
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
