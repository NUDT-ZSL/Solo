import React, { useState, useMemo, useCallback } from 'react'
import StrokeCanvas from './components/StrokeCanvas'
import { getStrokeData, getAllSupportedCharacters } from './utils/strokeData'

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('大')

  const supportedChars = useMemo(() => getAllSupportedCharacters(), [])

  const charactersData = useMemo(() => {
    return getStrokeData(inputValue)
  }, [inputValue])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    const regex = /[\u4e00-\u9fa5]/g
    const matches = value.match(regex) || []
    value = matches.slice(0, 4).join('')
    setInputValue(value)
  }, [])

  const handleCharClick = useCallback((char: string) => {
    setInputValue((prev) => {
      if (prev.length >= 4) return prev
      if (prev.includes(char)) return prev
      return prev + char
    })
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#faf3e0'
    }}>
      <header style={{
        height: 'clamp(56px, 8vh, 64px)',
        background: '#ffffff',
        borderBottom: '2px solid #e0d8c8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 clamp(12px, 3vw, 24px)',
        gap: 'clamp(10px, 2vw, 20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexWrap: 'wrap'
      }}>
        <div style={{
          fontSize: 'clamp(18px, 2.5vw, 22px)',
          fontWeight: 700,
          color: '#5d4037',
          letterSpacing: '1px',
          whiteSpace: 'nowrap'
        }}>
          汉字笔顺演示
        </div>

        <div style={{
          position: 'relative',
          flex: 1,
          maxWidth: 400,
          minWidth: 180
        }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="输入简体汉字（最多4字）"
            maxLength={4}
            style={{
              width: '100%',
              height: 'clamp(38px, 5vh, 44px)',
              padding: '0 clamp(10px, 1.5vw, 14px)',
              fontSize: 'clamp(14px, 1.8vw, 16px)',
              borderRadius: 8,
              border: '1px solid #d4c5a9',
              outline: 'none',
              background: '#fdfbf5',
              color: '#424242',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#8d6e63'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(141, 110, 99, 0.12)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d4c5a9'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          {inputValue && (
            <button
              onClick={() => setInputValue('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: 'none',
                background: '#c7b8a3',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: 12,
                lineHeight: '22px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#a1887f'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#c7b8a3'}
              title="清空"
            >
              ×
            </button>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 'clamp(12px, 1.5vw, 13px)',
          color: '#8d6e63',
          whiteSpace: 'nowrap'
        }}>
          <span>已识别: {charactersData.length}/{inputValue.length}</span>
        </div>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'clamp(16px, 3vw, 32px)',
        gap: 20
      }}>
        <div style={{
          width: '100%',
          maxWidth: 720,
          padding: 'clamp(12px, 2vw, 16px)',
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e0d8c8'
        }}>
          <div style={{
            fontSize: 13,
            color: '#8d6e63',
            fontWeight: 600,
            marginBottom: 10
          }}>
            点击快速添加常用字：
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8
          }}>
            {supportedChars.map((char) => {
              const isUsed = inputValue.includes(char)
              const isFull = inputValue.length >= 4
              return (
                <button
                  key={char}
                  onClick={() => handleCharClick(char)}
                  disabled={isUsed || isFull}
                  style={{
                    width: 'clamp(38px, 5vw, 44px)',
                    height: 'clamp(38px, 5vw, 44px)',
                    fontSize: 'clamp(16px, 2.2vw, 20px)',
                    fontWeight: 600,
                    borderRadius: 8,
                    border: isUsed ? '1px solid #a5d6a7' : '1px solid #d4c5a9',
                    background: isUsed ? '#e8f5e9' : '#fdfbf5',
                    color: isUsed ? '#388e3c' : '#5d4037',
                    cursor: (isUsed || isFull) ? 'not-allowed' : 'pointer',
                    opacity: (isUsed || isFull) ? 0.55 : 1,
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    if (!isUsed && !isFull) {
                      e.currentTarget.style.background = '#faf3e0'
                      e.currentTarget.style.borderColor = '#8d6e63'
                      e.currentTarget.style.transform = 'scale(1.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isUsed ? '#e8f5e9' : '#fdfbf5'
                    e.currentTarget.style.borderColor = isUsed ? '#a5d6a7' : '#d4c5a9'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                  title={isUsed ? '已添加' : `添加 ${char}`}
                >
                  {char}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{
          width: '96%',
          maxWidth: 640,
          display: 'flex',
          justifyContent: 'center'
        }}>
          {charactersData.length > 0 ? (
            <StrokeCanvas charactersData={charactersData} inputValue={inputValue} />
          ) : (
            <div style={{
              width: '100%',
              maxWidth: 640,
              aspectRatio: '640 / 480',
              background: '#ffffff',
              boxShadow: 'inset 0 0 0 8px #e0d8c8',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: '#bcaaa4',
              userSelect: 'none'
            }}>
              <div style={{ fontSize: 48 }}>✏️</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>请输入简体汉字开始演示</div>
              <div style={{ fontSize: 13 }}>支持的汉字：{supportedChars.join('、')}</div>
            </div>
          )}
        </div>

        <div style={{
          width: '100%',
          maxWidth: 640,
          padding: '12px 16px',
          fontSize: 12,
          color: '#8d6e63',
          lineHeight: 1.8,
          background: 'rgba(255, 255, 255, 0.5)',
          borderRadius: 8,
          border: '1px dashed #e0d8c8'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#6d4c41' }}>📖 使用说明：</div>
          <div>① 在顶部输入框输入汉字，或点击下方常用字按钮添加（最多4字）</div>
          <div>② 点击「播放」按钮开始笔顺动画，深蓝圆点显示笔顺编号</div>
          <div>③ 动画中黑色为正在书写，灰色为已完成笔画</div>
          <div>④ 可切换慢/中/快三档速度，暂停后悬停笔画查看笔顺和方向提示</div>
        </div>
      </main>

      <footer style={{
        padding: '16px clamp(12px, 3vw, 24px)',
        textAlign: 'center',
        fontSize: 12,
        color: '#a1887f',
        borderTop: '1px solid #e0d8c8',
        background: 'rgba(255, 255, 255, 0.4)'
      }}>
        汉字笔顺演示工具 · 支持 {supportedChars.length} 个常用汉字
      </footer>
    </div>
  )
}

export default App
