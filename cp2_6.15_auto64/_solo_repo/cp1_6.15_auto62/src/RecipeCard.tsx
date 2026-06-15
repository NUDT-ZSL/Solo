import { useState } from 'react'
import { Recipe, getDifficultyColor } from './collection'

interface RecipeCardProps {
  recipe: Recipe
  onToggleFavorite: (id: string) => void
  isNew?: boolean
}

const RecipeCard = ({ recipe, onToggleFavorite, isNew = false }: RecipeCardProps) => {
  const [showModal, setShowModal] = useState(false)

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite(recipe.id)
  }

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (navigator.share) {
      navigator.share({
        title: recipe.name,
        text: recipe.description,
      })
    } else {
      navigator.clipboard.writeText(`${recipe.name}\n${recipe.description}`)
      alert('菜谱信息已复制到剪贴板')
    }
  }

  const difficultyColor = getDifficultyColor(recipe.difficulty)

  return (
    <>
      <div
        className={`recipe-card ${isNew ? 'card-enter' : ''}`}
        style={styles.card}
        onClick={() => setShowModal(true)}
      >
        {recipe.isFavorite && (
          <div className="star-icon" style={styles.starIcon}>
            ⭐
          </div>
        )}

        <div style={styles.imageContainer}>
          <span style={styles.emoji}>{recipe.image}</span>
        </div>

        <div style={styles.content}>
          <h3 style={styles.title}>{recipe.name}</h3>

          <div style={styles.tags}>
            <span
              className="difficulty-tag"
              style={{
                ...styles.difficultyTag,
                backgroundColor: difficultyColor,
              }}
            >
              {recipe.difficulty}
            </span>
            <span style={styles.durationTag}>⏱️ {recipe.duration}分钟</span>
          </div>
        </div>

        <div style={styles.buttonContainer}>
          <button
            style={{
              ...styles.favoriteButton,
              color: recipe.isFavorite ? '#FF4081' : '#CCC',
            }}
            onClick={handleFavoriteClick}
          >
            {recipe.isFavorite ? '❤️' : '🤍'}
          </button>
          <button style={styles.shareButton} onClick={handleShareClick}>
            📤
          </button>
        </div>
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalEmoji}>{recipe.image}</span>
              <h2 style={styles.modalTitle}>{recipe.name}</h2>
              <button style={styles.closeButton} onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <div style={styles.modalTags}>
              <span
                style={{
                  ...styles.difficultyTag,
                  backgroundColor: difficultyColor,
                }}
              >
                {recipe.difficulty}
              </span>
              <span style={styles.durationTag}>⏱️ {recipe.duration}分钟</span>
              <span style={styles.categoryTag}>{recipe.category}</span>
            </div>

            <p style={styles.modalDescription}>{recipe.description}</p>

            <div style={styles.modalFooter}>
              <button
                style={{
                  ...styles.modalFavoriteButton,
                  backgroundColor: recipe.isFavorite ? '#FF4081' : '#CCC',
                }}
                onClick={handleFavoriteClick}
              >
                {recipe.isFavorite ? '❤️ 已收藏' : '🤍 收藏'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .recipe-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.2s ease;
          will-change: transform, box-shadow;
        }
        .recipe-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.15);
        }
        .star-icon {
          animation: starScale 0.3s ease;
        }
        @keyframes starScale {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .card-enter {
          animation: cardEnter 0.3s ease;
        }
        @keyframes cardEnter {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    border: '2px solid #FFC107',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  starIcon: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    fontSize: '24px',
    zIndex: 10,
  },
  imageContainer: {
    width: '100%',
    height: '140px',
    backgroundColor: '#FFF8E7',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: '72px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#333333',
    margin: 0,
  },
  tags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  difficultyTag: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 500,
  },
  durationTag: {
    padding: '4px 12px',
    borderRadius: '20px',
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    fontSize: '12px',
    fontWeight: 500,
  },
  categoryTag: {
    padding: '4px 12px',
    borderRadius: '20px',
    backgroundColor: '#FFF3E0',
    color: '#E65100',
    fontSize: '12px',
    fontWeight: 500,
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  favoriteButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    transition: 'color 0.2s ease, transform 0.2s ease',
  },
  shareButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
    position: 'relative',
  },
  modalEmoji: {
    fontSize: '56px',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#333333',
    flex: 1,
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
  modalTags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  modalDescription: {
    fontSize: '15px',
    lineHeight: 1.7,
    color: '#666666',
    marginBottom: '24px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  modalFavoriteButton: {
    padding: '12px 24px',
    borderRadius: '24px',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
  },
}

export default RecipeCard
