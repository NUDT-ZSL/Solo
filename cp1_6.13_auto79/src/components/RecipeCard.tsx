import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../../server/models/recipeStore'
import { categoryColors } from '../utils/recommendEngine'

interface RecipeCardProps {
  recipe: Recipe
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const navigate = useNavigate()
  const colors = categoryColors[recipe.category] || { bg: '#fef3c7', text: '#92400e' }

  const handleClick = () => {
    navigate(`/recipe/${recipe._id}`)
  }

  const fallbackCover = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22240%22 viewBox=%220 0 320 240%22%3E%3Crect fill=%22%23fef3c7%22 width=%22320%22 height=%22240%22/%3E%3Ctext fill=%22%23f59e0b%22 font-family=%22sans-serif%22 font-size=%2248%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22%3E🍳%3C/text%3E%3C/svg%3E'

  return (
    <div
      onClick={handleClick}
      style={{
        width: '320px',
        height: '420px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
        e.currentTarget.style.transform = 'translateY(-6px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{
        width: '100%',
        height: '240px',
        overflow: 'hidden',
        flexShrink: 0,
        background: '#fef3c7'
      }}>
        <img
          src={recipe.cover || fallbackCover}
          alt={recipe.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackCover
          }}
        />
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: colors.bg,
            color: colors.text,
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '8px',
            marginBottom: '10px'
          }}>
            {recipe.category}
          </span>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1f2937',
            margin: 0,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {recipe.title}
          </h3>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            marginTop: '6px',
            margin: '6px 0 0 0'
          }}>
            👨‍🍳 {recipe.authorName}
          </p>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '10px',
          borderTop: '1px solid #f3f4f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6b7280' }}>
            <span>❤️</span>
            <span style={{ fontWeight: 500 }}>{recipe.likes}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6b7280' }}>
            <span>⏱️</span>
            <span style={{ fontWeight: 500 }}>{recipe.cookTime}分钟</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecipeCard
