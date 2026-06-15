import React from 'react'
import { FurnitureItem, ItemCategory, ThemeConfig } from '../utils/constants'

interface ToolbarProps {
  sofas: FurnitureItem[]
  chandeliers: FurnitureItem[]
  paintings: FurnitureItem[]
  selectedItemId: string | null
  placedItemIds: Record<ItemCategory, string | null>
  theme: ThemeConfig
  onItemClick: (item: FurnitureItem) => void
}

const Toolbar: React.FC<ToolbarProps> = ({
  sofas,
  chandeliers,
  paintings,
  selectedItemId,
  placedItemIds,
  theme,
  onItemClick,
}) => {
  const renderItemThumbnail = (item: FurnitureItem) => {
    const color = theme.itemColorMap[item.id] || item.color
    const secondaryColor = item.secondaryColor || color

    if (item.category === 'sofa') {
      return (
        <svg viewBox="0 0 100 60" width="100%" height="100%">
          <rect x="10" y="25" width="80" height="25" rx="6" fill={color} />
          <rect x="10" y="15" width="20" height="30" rx="6" fill={color} />
          <rect x="70" y="15" width="20" height="30" rx="6" fill={color} />
          <rect x="18" y="30" width="64" height="18" rx="4" fill={secondaryColor} opacity="0.6" />
          <rect x="14" y="48" width="6" height="8" rx="2" fill={secondaryColor} />
          <rect x="80" y="48" width="6" height="8" rx="2" fill={secondaryColor} />
        </svg>
      )
    }

    if (item.category === 'chandelier') {
      return (
        <svg viewBox="0 0 100 80" width="100%" height="100%">
          <line x1="50" y1="5" x2="50" y2="20" stroke={color} strokeWidth="2" />
          <ellipse cx="50" cy="20" rx="8" ry="4" fill={color} />
          <path d="M 20 30 Q 50 20 80 30" stroke={color} strokeWidth="3" fill="none" />
          <circle cx="25" cy="35" r="6" fill="#FFF8E7" />
          <circle cx="50" cy="32" r="8" fill="#FFF8E7" />
          <circle cx="75" cy="35" r="6" fill="#FFF8E7" />
          <circle cx="25" cy="35" r="3" fill={color} />
          <circle cx="50" cy="32" r="4" fill={color} />
          <circle cx="75" cy="35" r="3" fill={color} />
        </svg>
      )
    }

    if (item.category === 'painting') {
      return (
        <svg viewBox="0 0 80 100" width="100%" height="100%">
          <rect x="2" y="2" width="76" height="96" rx="2" fill={secondaryColor} />
          <rect x="8" y="8" width="64" height="84" fill={color} />
          {item.id === 'painting-abstract' && (
            <>
              <circle cx="30" cy="40" r="15" fill="#E8C872" opacity="0.8" />
              <circle cx="50" cy="60" r="12" fill="#7BA3A8" opacity="0.8" />
              <path d="M 20 75 Q 40 55 60 75" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" />
            </>
          )}
          {item.id === 'painting-landscape' && (
            <>
              <rect x="8" y="50" width="64" height="42" fill="#8FBC8F" />
              <circle cx="55" cy="30" r="10" fill="#F0E68C" />
              <path d="M 8 60 L 25 45 L 40 55 L 55 40 L 72 52 L 72 92 L 8 92 Z" fill="#556B2F" />
            </>
          )}
          {item.id === 'painting-floral' && (
            <>
              <circle cx="40" cy="45" r="18" fill="#FFB6C1" opacity="0.7" />
              <circle cx="30" cy="35" r="10" fill="#FFB6C1" opacity="0.9" />
              <circle cx="50" cy="35" r="10" fill="#FFB6C1" opacity="0.9" />
              <circle cx="30" cy="55" r="10" fill="#FFB6C1" opacity="0.9" />
              <circle cx="50" cy="55" r="10" fill="#FFB6C1" opacity="0.9" />
              <circle cx="40" cy="45" r="6" fill="#FFD700" />
              <rect x="38" y="55" width="4" height="30" fill="#228B22" />
            </>
          )}
          {item.id === 'painting-geometric' && (
            <>
              <polygon points="40,15 65,45 15,45" fill="#D4A574" />
              <rect x="15" y="55" width="25" height="30" fill="#8B7355" />
              <rect x="45" y="55" width="25" height="30" fill="#C4A882" />
              <circle cx="57" cy="70" r="8" fill="#6B5344" />
            </>
          )}
        </svg>
      )
    }

    return null
  }

  const renderSection = (title: string, items: FurnitureItem[]) => (
    <div style={{ marginBottom: 20 }}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      <div style={itemGridStyle}>
        {items.map((item) => {
          const isSelected = selectedItemId === item.id
          const isPlaced = placedItemIds[item.category] === item.id
          const color = theme.itemColorMap[item.id] || item.color

          return (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              style={{
                ...cardStyle,
                borderColor: isSelected || isPlaced ? theme.accentColor : '#e0ddd8',
                boxShadow: isSelected || isPlaced
                  ? `0 4px 14px ${theme.shadowColor}, 0 0 0 2px ${theme.accentColor}40`
                  : `0 2px 8px ${theme.shadowColor}`,
                transform: isSelected ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              <div style={thumbnailContainerStyle}>
                {renderItemThumbnail(item)}
              </div>
              <span style={itemNameStyle}>{item.name}</span>
              <div
                style={{
                  ...colorDotStyle,
                  backgroundColor: color,
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{
      ...toolbarStyle,
      backgroundColor: '#FAF8F5',
      borderRight: `1px solid ${theme.wallColorDark}`,
    }}>
      <div style={{
        ...headerStyle,
        borderBottom: `1px solid ${theme.wallColorDark}`,
      }}>
        <h2 style={titleStyle}>软装物品</h2>
        <p style={subtitleStyle}>点击物品放置到房间</p>
      </div>
      <div style={contentStyle}>
        {renderSection('沙发', sofas)}
        {renderSection('吊灯', chandeliers)}
        {renderSection('装饰画', paintings)}
      </div>
    </div>
  )
}

const toolbarStyle: React.CSSProperties = {
  width: 200,
  minWidth: 200,
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  padding: '20px 16px 16px',
}

const titleStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: 20,
  fontWeight: 600,
  color: '#2D2926',
  margin: 0,
  marginBottom: 4,
}

const subtitleStyle: React.CSSProperties = {
  fontFamily: "'Noto Sans SC', sans-serif",
  fontSize: 12,
  color: '#8B8680',
  margin: 0,
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 16px 20px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "'Noto Sans SC', sans-serif",
  fontSize: 13,
  fontWeight: 500,
  color: '#5A5550',
  margin: '12px 0 10px',
}

const itemGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 10,
}

const cardStyle: React.CSSProperties = {
  borderRadius: 10,
  backgroundColor: '#fff',
  padding: 10,
  cursor: 'pointer',
  border: '2px solid transparent',
  transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  position: 'relative',
}

const thumbnailContainerStyle: React.CSSProperties = {
  width: '100%',
  height: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 6,
}

const itemNameStyle: React.CSSProperties = {
  fontFamily: "'Noto Sans SC', sans-serif",
  fontSize: 11,
  color: '#2D2926',
  textAlign: 'center',
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const colorDotStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 12,
  height: 12,
  borderRadius: '50%',
  border: '2px solid #fff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
}

export default Toolbar
