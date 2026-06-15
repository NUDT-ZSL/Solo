import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plant, plantTypeLabels, dataStore } from '../../logic/dataStore'
import './PlantCard.css'

interface PlantCardProps {
  plant: Plant
  onExchange?: (plantId: string) => void
  showExchangeButton?: boolean
}

export default function PlantCard({ plant, onExchange, showExchangeButton = true }: PlantCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isExchanged, setIsExchanged] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => setImageLoaded(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleExchange = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isExchanged) return
    
    const isOwner = plant.ownerId === dataStore.getCurrentUser().id
    if (isOwner) return

    setIsExchanged(true)
    if (onExchange) {
      onExchange(plant.id)
    }
  }

  const handleCardClick = () => {
    navigate(`/plant/${plant.id}`)
  }

  const isOwner = plant.ownerId === dataStore.getCurrentUser().id

  return (
    <div 
      className="plant-card" 
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animation: 'fadeIn 0.3s ease-in-out' }}
    >
      <div className="plant-card-image">
        {!imageLoaded && (
          <div className="plant-card-loading">
            <svg className="leaf-spinner" viewBox="0 0 24 24" fill="none">
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" fill="#6B8E23"/>
            </svg>
          </div>
        )}
        <div 
          className={`plant-card-placeholder ${imageLoaded ? 'fade-in' : ''}`}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        >
          <span className="plant-card-emoji">{getPlantEmoji(plant.type)}</span>
        </div>
      </div>

      <div className="plant-card-content">
        <div className="plant-card-header">
          <h3 className="plant-card-name">{plant.name}</h3>
          <span className="plant-card-type">{plantTypeLabels[plant.type]}</span>
        </div>
        
        <p className="plant-card-variety">品种：{plant.variety}</p>
        
        <div className="plant-card-tags">
          <span className="plant-card-age-tag">{plant.age}株龄</span>
          <span className="plant-card-region-tag">{plant.region}</span>
        </div>
        
        <p className="plant-card-description">{plant.description}</p>
        
        <div className="plant-card-footer">
          <span className="plant-card-owner">来自 {plant.ownerName}</span>
          {showExchangeButton && !isOwner && (
            <button
              className={`exchange-button ${isExchanged ? 'exchanged' : ''} ${isHovered ? 'hovered' : ''}`}
              onClick={handleExchange}
              style={{ transition: 'all 0.2s ease' }}
            >
              {isExchanged ? (
                <svg className="check-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
                </svg>
              ) : (
                '想要交换'
              )}
            </button>
          )}
          {isOwner && (
            <span className="owner-badge">我的发布</span>
          )}
        </div>
      </div>
    </div>
  )
}

function getPlantEmoji(type: string): string {
  const emojis: Record<string, string> = {
    succulent: '🌵',
    foliage: '🌿',
    flowering: '🌸',
    herb: '🌱',
    vegetable: '🥬'
  }
  return emojis[type] || '🌱'
}
