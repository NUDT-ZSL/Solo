import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Animal } from '../logic/AdoptionLogic'
import { useAuth } from '../context/AuthContext'
import AddAnimalModal from '../components/AddAnimalModal'
import LazyImage from '../components/LazyImage'
import '../styles/AnimalList.css'

function AnimalList() {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()

  const loadAnimals = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (loading) return
    setLoading(true)

    try {
      const response = await fetch(`/api/animals?page=${pageNum}&limit=20`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (reset) {
        setAnimals(data.data)
      } else {
        setAnimals((prev) => [...prev, ...data.data])
      }
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to load animals:', error)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useEffect(() => {
    loadAnimals(1, true)
  }, [])

  useEffect(() => {
    if (!hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !loading) {
          setPage((prev) => {
            const nextPage = prev + 1
            loadAnimals(nextPage)
            return nextPage
          })
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading])

  const handleCardClick = (animal: Animal) => {
    navigate(`/animal/${animal.id}`)
  }

  const handleAnimalAdded = (newAnimal: Animal) => {
    setAnimals((prev) => [newAnimal, ...prev])
    setShowAddModal(false)
  }

  const renderTags = (tags: string[], maxVisible: number = 2) => {
    const visibleTags = tags.slice(0, maxVisible)
    const hiddenCount = tags.length - maxVisible

    return (
      <div className="card-tags">
        {visibleTags.map((tag, index) => (
          <span key={index} className="tag">
            {tag}
          </span>
        ))}
        {hiddenCount > 0 && <span className="tag more">+{hiddenCount}</span>}
      </div>
    )
  }

  return (
    <div className="animal-list-page">
      <div className="page-header">
        <h1>待领养小动物</h1>
        <p className="subtitle">给它们一个温暖的家</p>
        {isLoggedIn && (
          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            + 添加动物
          </button>
        )}
      </div>

      <div className="masonry-grid">
        {animals.map((animal) => (
          <div
            key={animal.id}
            className="animal-card"
            onClick={() => handleCardClick(animal)}
          >
            <div className="card-image">
              <LazyImage src={animal.photo} alt={animal.name} />
            </div>
            <div className="card-info">
              <div className="card-name">{animal.name}</div>
              <div className="card-breed">{animal.breed}</div>
              <div className="card-tags-container">
                {renderTags(animal.personality, 2)}
                {renderTags(animal.health, 2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div ref={observerRef} className="loading-trigger">
        {loading && <div className="loading-spinner">加载中...</div>}
        {!hasMore && animals.length > 0 && (
          <div className="no-more">—— 没有更多了 ——</div>
        )}
      </div>

      {showAddModal && (
        <AddAnimalModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleAnimalAdded}
        />
      )}
    </div>
  )
}

export default AnimalList
