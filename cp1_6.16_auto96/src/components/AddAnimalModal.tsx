import { useState } from 'react'
import type { Animal, Personality, HealthStatus, Gender } from '../logic/AdoptionLogic'
import '../styles/AddAnimalModal.css'

interface AddAnimalModalProps {
  onClose: () => void
  onAdded: (animal: Animal) => void
}

const personalityOptions: Personality[] = ['友好', '胆小', '活泼']
const healthOptions: HealthStatus[] = ['已驱虫', '已疫苗', '已绝育']

function AddAnimalModal({ onClose, onAdded }: AddAnimalModalProps) {
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('公')
  const [personality, setPersonality] = useState<Personality[]>([])
  const [health, setHealth] = useState<HealthStatus[]>([])
  const [photo, setPhoto] = useState<string>('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('照片大小不能超过2MB')
      return
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('照片格式仅限jpg/png')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setPhoto(event.target?.result as string)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const togglePersonality = (p: Personality) => {
    setPersonality((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    )
  }

  const toggleHealth = (h: HealthStatus) => {
    setHealth((prev) =>
      prev.includes(h) ? prev.filter((item) => item !== h) : [...prev, h]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('请输入动物名称')
      return
    }
    if (!breed.trim()) {
      setError('请输入品种')
      return
    }
    if (!age || parseInt(age) <= 0) {
      setError('请输入有效年龄')
      return
    }
    if (personality.length === 0) {
      setError('请至少选择一个性格标签')
      return
    }
    if (health.length === 0) {
      setError('请至少选择一个健康状况')
      return
    }
    if (!photo) {
      setError('请上传动物照片')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/animals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          breed: breed.trim(),
          age: parseInt(age),
          gender,
          personality,
          health,
          photo,
          description: description.trim(),
        }),
      })

      if (response.ok) {
        const newAnimal = await response.json()
        onAdded(newAnimal)
      } else {
        const data = await response.json()
        setError(data.error || '添加失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-animal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>添加新动物</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入动物名称"
              />
            </div>
            <div className="form-group">
              <label>品种 *</label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="请输入品种"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>年龄（岁）*</label>
              <input
                type="number"
                min="1"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="请输入年龄"
              />
            </div>
            <div className="form-group">
              <label>性别 *</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="gender"
                    value="公"
                    checked={gender === '公'}
                    onChange={() => setGender('公')}
                  />
                  公
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="gender"
                    value="母"
                    checked={gender === '母'}
                    onChange={() => setGender('母')}
                  />
                  母
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>性格标签 *</label>
            <div className="checkbox-group">
              {personalityOptions.map((p) => (
                <label
                  key={p}
                  className={`checkbox-tag ${personality.includes(p) ? 'active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={personality.includes(p)}
                    onChange={() => togglePersonality(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>健康状况 *</label>
            <div className="checkbox-group">
              {healthOptions.map((h) => (
                <label
                  key={h}
                  className={`checkbox-tag ${health.includes(h) ? 'active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={health.includes(h)}
                    onChange={() => toggleHealth(h)}
                  />
                  {h}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>照片 * (2MB以内，jpg/png格式)</label>
            <div className="photo-upload">
              {photo ? (
                <div className="photo-preview">
                  <img src={photo} alt="预览" />
                  <button
                    type="button"
                    className="reupload-btn"
                    onClick={() => setPhoto('')}
                  >
                    重新上传
                  </button>
                </div>
              ) : (
                <label className="upload-area">
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoUpload}
                    hidden
                  />
                  <div className="upload-icon">📷</div>
                  <div>点击上传照片</div>
                </label>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入动物描述（选填）"
              rows={3}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? '提交中...' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddAnimalModal
