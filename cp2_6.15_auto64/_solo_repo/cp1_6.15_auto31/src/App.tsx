import React, { useState, useCallback } from 'react'
import Toolbar from './components/Toolbar'
import CatalogueView from './components/CatalogueView'
import {
  FurnitureItem,
  ItemCategory,
  ThemeConfig,
  THEMES,
  DEFAULT_THEME_ID,
  SOFA_ITEMS,
  CHANDELIER_ITEMS,
  PAINTING_ITEMS,
} from './utils/constants'

const App: React.FC = () => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [currentThemeId, setCurrentThemeId] = useState<string>(DEFAULT_THEME_ID)
  const [placedItems, setPlacedItems] = useState<Record<ItemCategory, FurnitureItem | null>>({
    sofa: null,
    chandelier: null,
    painting: null,
  })

  const currentTheme = THEMES.find((t) => t.id === currentThemeId) || THEMES[0]

  const handleItemClick = useCallback(
    (item: FurnitureItem) => {
      setSelectedItemId(item.id)
      setPlacedItems((prev) => ({
        ...prev,
        [item.category]: item,
      }))
    },
    []
  )

  const handleItemPlaced = useCallback(
    (category: ItemCategory, item: FurnitureItem) => {
      setPlacedItems((prev) => ({
        ...prev,
        [category]: item,
      }))
      setSelectedItemId(item.id)
    },
    []
  )

  const handleItemRemoved = useCallback((category: ItemCategory) => {
    setPlacedItems((prev) => ({
      ...prev,
      [category]: null,
    }))
  }, [])

  const handleThemeChange = useCallback((themeId: string) => {
    setCurrentThemeId(themeId)
  }, [])

  const placedItemIds: Record<ItemCategory, string | null> = {
    sofa: placedItems.sofa?.id || null,
    chandelier: placedItems.chandelier?.id || null,
    painting: placedItems.painting?.id || null,
  }

  const generateList = useCallback(() => {
    const items: string[] = []
    if (placedItems.sofa) items.push(placedItems.sofa.name)
    if (placedItems.chandelier) items.push(placedItems.chandelier.name)
    if (placedItems.painting) items.push(placedItems.painting.name)

    if (items.length === 0) {
      alert('房间里还没有放置任何物品哦~')
      return
    }

    const listText = `搭配清单（${currentTheme.name}主题）\n\n${items
      .map((item, i) => `${i + 1}. ${item}`)
      .join('\n')}\n\n共 ${items.length} 件软装物品`
    alert(listText)
  }, [placedItems, currentTheme])

  return (
    <div style={appStyle}>
      <Toolbar
        sofas={SOFA_ITEMS}
        chandeliers={CHANDELIER_ITEMS}
        paintings={PAINTING_ITEMS}
        selectedItemId={selectedItemId}
        placedItemIds={placedItemIds}
        theme={currentTheme}
        onItemClick={handleItemClick}
      />

      <div style={mainAreaStyle}>
        <CatalogueView
          placedItems={placedItems}
          theme={currentTheme}
          onItemPlaced={handleItemPlaced}
          onItemRemoved={handleItemRemoved}
        />

        <div
          style={{
            ...themeBarStyle,
            transition: 'background-color 0.5s ease, border-color 0.5s ease',
            backgroundColor: currentTheme.ceilingColor,
            borderTop: `1px solid ${currentTheme.wallColorDark}`,
          }}
        >
          <span style={themeLabelStyle}>色彩主题</span>
          <div style={themeButtonsStyle}>
            {THEMES.map((theme) => {
              const isActive = theme.id === currentThemeId
              return (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  style={{
                    ...themeButtonStyle,
                    backgroundColor: theme.wallColor,
                    borderColor: isActive ? theme.accentColor : 'transparent',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: isActive
                      ? `0 4px 12px ${theme.shadowColor}, 0 0 0 3px ${theme.accentColor}30`
                      : `0 2px 6px ${theme.shadowColor}`,
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.5s ease, box-shadow 0.5s ease',
                  }}
                  title={theme.name}
                >
                  {isActive && (
                    <span
                      style={{
                        ...checkMarkStyle,
                        color: theme.accentColor,
                        transition: 'color 0.5s ease',
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div style={themeNamesStyle}>
            {THEMES.map((theme) => (
              <span
                key={theme.id}
                style={{
                  ...themeNameStyle,
                  color:
                    theme.id === currentThemeId
                      ? currentTheme.accentColor
                      : '#8B8680',
                  fontWeight: theme.id === currentThemeId ? 600 : 400,
                  transition: 'color 0.5s ease, font-weight 0.3s ease',
                }}
              >
                {theme.name}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={generateList}
          style={{
            ...generateButtonStyle,
            transition: 'all 0.5s ease',
            backgroundColor: currentTheme.accentColor,
            boxShadow: `0 4px 14px ${currentTheme.shadowColor}`,
          }}
        >
          生成搭配清单
        </button>
      </div>
    </div>
  )
}

const appStyle: React.CSSProperties = {
  display: 'flex',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  fontFamily: "'Noto Sans SC', sans-serif",
}

const mainAreaStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
}

const themeBarStyle: React.CSSProperties = {
  height: 90,
  display: 'flex',
  alignItems: 'center',
  padding: '0 30px',
  gap: 24,
}

const themeLabelStyle: React.CSSProperties = {
  fontFamily: "'Noto Sans SC', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  color: '#5A5550',
  marginRight: 4,
}

const themeButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  alignItems: 'center',
}

const themeButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '3px solid',
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const checkMarkStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 'bold',
}

const themeNamesStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  marginLeft: 'auto',
}

const themeNameStyle: React.CSSProperties = {
  fontFamily: "'Noto Sans SC', sans-serif",
  fontSize: 12,
  width: 56,
  textAlign: 'center',
}

const generateButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: 30,
  bottom: 110,
  padding: '12px 24px',
  borderRadius: 28,
  border: 'none',
  color: '#fff',
  fontFamily: "'Noto Sans SC', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  zIndex: 10,
}

export default App
