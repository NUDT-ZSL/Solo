import React from 'react'
import {
  Skill,
  getCategoryColor,
  getCategoryLabel,
  getLevelLabel,
  getTypeLabel,
  themeColors
} from '../utils/matching'

interface SkillCardProps {
  skill: Skill
  delay?: number
  onClick?: () => void
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, delay = 0, onClick }) => {
  const borderColor = getCategoryColor(skill.category)
  const categoryLabel = getCategoryLabel(skill.category)
  const levelLabel = getLevelLabel(skill.level)
  const typeLabel = getTypeLabel(skill.type)

  return (
    <div
      className="skill-card"
      style={{
        width: '280px',
        minWidth: '260px',
        flexBasis: '280px',
        height: '200px',
        backgroundColor: themeColors.surface,
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '16px 20px',
        position: 'relative',
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
        opacity: 0,
        animation: `fadeIn 0.5s ease forwards`,
        animationDelay: `${delay}ms`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
        }
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          borderTopLeftRadius: '12px',
          borderBottomLeftRadius: '12px',
          backgroundColor: borderColor
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: themeColors.textPrimary,
          margin: 0,
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {skill.name}
        </h3>
        <span style={{
          fontSize: '12px',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: skill.type === 'learn' ? themeColors.secondary : themeColors.successBg,
          color: skill.type === 'learn' ? themeColors.primary : themeColors.successText,
          fontWeight: 500,
          flexShrink: 0,
          marginLeft: '8px'
        }}>
          {typeLabel}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          fontSize: '12px',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: `${borderColor}15`,
          color: borderColor,
          fontWeight: 500
        }}>
          {categoryLabel}
        </span>
        <span style={{
          fontSize: '12px',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: '#f1f5f9',
          color: themeColors.textSecondary,
          fontWeight: 500
        }}>
          {levelLabel}
        </span>
      </div>

      <p style={{
        fontSize: '13px',
        color: themeColors.textSecondary,
        margin: 0,
        lineHeight: 1.5,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical'
      }}>
        {skill.description || '暂无描述'}
      </p>

      {skill.userName && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <img
            src={skill.userAvatar}
            alt={skill.userName}
            style={{ width: '24px', height: '24px', borderRadius: '50%' }}
          />
          <span style={{ fontSize: '12px', color: themeColors.textMuted }}>{skill.userName}</span>
        </div>
      )}
    </div>
  )
}

export default SkillCard
