import { useState } from 'react'
import { Category, Difficulty, createRecipe, getDifficultyColor } from './collection'
import { Recipe } from './collection'

interface CreateRecipeProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (recipe: Recipe) => void
}

const CreateRecipe = ({ isOpen, onClose, onSubmit }: CreateRecipeProps) => {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('中式')
  const [difficulty, setDifficulty] = useState<Difficulty>('简单')
  const [duration, setDuration] = useState(30)
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !description.trim()) {
      alert('请填写菜名和描述')
      return
    }
    const newRecipe = createRecipe(name.trim(), category, difficulty, duration, description.trim())
    onSubmit(newRecipe)
    setName('')
    setCategory('中式')
    setDifficulty('简单')
    setDuration(30)
    setDescription('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="form-overlay" style={styles.overlay} onClick={onClose}>
      <div
        className="form-panel"
        style={styles.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>创建新菜谱</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>菜名</label>
            <input
              type="text"
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入菜名"
              maxLength={20}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>分类</label>
            <select
              style={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              <option value="中式">中式</option>
              <option value="西式">西式</option>
              <option value="日式">日式</option>
              <option value="甜点">甜点</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>难度</label>
            <div style={styles.radioGroup}>
              {(['简单', '中等', '困难'] as Difficulty[]).map((d) => (
                <label
                  key={d}
                  style={{
                    ...styles.radioLabel,
                    borderColor: difficulty === d ? getDifficultyColor(d) : '#E0E0E0',
                    backgroundColor: difficulty === d ? getDifficultyColor(d) + '20' : '#FAFAFA',
                  }}
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={d}
                    checked={difficulty === d}
                    onChange={() => setDifficulty(d)}
                    style={styles.radioInput}
                  />
                  <span
                    style={{
                      color: difficulty === d ? getDifficultyColor(d) : '#666',
                      fontWeight: difficulty === d ? 600 : 400,
                    }}
                  >
                    {d}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              预计时长: <span style={styles.durationValue}>{duration}分钟</span>
            </label>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.sliderMarks}>
              <span>5分钟</span>
              <span>120分钟</span>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>描述</label>
            <textarea
              style={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请描述这道菜的特点和做法..."
              rows={4}
              maxLength={200}
            />
            <div style={styles.charCount}>{description.length}/200</div>
          </div>

          <div style={styles.actions}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              取消
            </button>
            <button type="submit" style={styles.submitButton}>
              创建菜谱
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .form-overlay {
          animation: fadeIn 0.25s ease;
        }
        .form-panel {
          animation: slideIn 0.25s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  panel: {
    width: '100%',
    maxWidth: '500px',
    height: '100%',
    backgroundColor: '#FFF8E7',
    padding: '24px',
    overflowY: 'auto',
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#333',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
    padding: '8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#555',
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    backgroundColor: '#FFF',
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    backgroundColor: '#FFF',
    cursor: 'pointer',
  },
  radioGroup: {
    display: 'flex',
    gap: '12px',
  },
  radioLabel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    border: '2px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  radioInput: {
    display: 'none',
  },
  durationValue: {
    color: '#FFC107',
    fontWeight: 700,
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    background: '#E0E0E0',
    outline: 'none',
    accentColor: '#FFC107',
    cursor: 'pointer',
  },
  sliderMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#999',
  },
  textarea: {
    padding: '12px 16px',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    backgroundColor: '#FFF',
    resize: 'none',
    fontFamily: 'inherit',
  },
  charCount: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'right',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px 24px',
    borderRadius: '8px',
    border: '2px solid #E0E0E0',
    backgroundColor: '#FFF',
    color: '#666',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitButton: {
    flex: 1,
    padding: '14px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#FFC107',
    color: '#FFF',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
}

export default CreateRecipe
