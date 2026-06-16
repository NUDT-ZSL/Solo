import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Animal } from '../logic/AdoptionLogic'
import ApplicationForm from './ApplicationForm'
import LazyImage from '../components/LazyImage'
import '../styles/AnimalDetail.css'

function AnimalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    const fetchAnimal = async () => {
      try {
        const response = await fetch(`/api/animals/${id}`)
        if (response.ok) {
          const data = await response.json()
          setAnimal(data)
        } else {
          navigate('/')
        }
      } catch (error) {
        console.error('Failed to fetch animal:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnimal()
  }, [id, navigate])

  if (loading) {
    return (
      <div className="animal-detail-page">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (!animal) {
    return null
  }

  const handleApplyClick = () => {
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
  }

  const handleFormSubmitSuccess = () => {
    setShowForm(false)
    setSubmitSuccess(true)
    setTimeout(() => setSubmitSuccess(false), 3000)
  }

  return (
    <div className="animal-detail-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回列表
      </button>

      <div className="detail-container">
        <div className="detail-image">
          <LazyImage src={animal.photo} alt={animal.name} />
        </div>

        <div className="detail-info">
          <h1 className="detail-name">{animal.name}</h1>
          <div className="detail-basic">
            <span className="detail-breed">{animal.breed}</span>
            <span className="detail-separator">·</span>
            <span className="detail-gender">{animal.gender}</span>
            <span className="detail-separator">·</span>
            <span className="detail-age">{animal.age}岁</span>
          </div>

          <div className="detail-section">
            <h3>性格特点</h3>
            <div className="detail-tags">
              {animal.personality.map((p, index) => (
                <span key={index} className="detail-tag personality">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h3>健康状况</h3>
            <div className="detail-tags">
              {animal.health.map((h, index) => (
                <span key={index} className="detail-tag health">
                  {h}
                </span>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h3>关于我</h3>
            <p className="detail-description">{animal.description}</p>
          </div>

          <button className="apply-btn" onClick={handleApplyClick}>
            申请领养
          </button>

          {submitSuccess && (
            <div className="success-tip">✓ 申请提交成功！管理员会尽快审核</div>
          )}
        </div>
      </div>

      {showForm && (
        <ApplicationForm
          animal={animal}
          onClose={handleFormClose}
          onSubmitSuccess={handleFormSubmitSuccess}
        />
      )}
    </div>
  )
}

export default AnimalDetail
