import { useEffect } from 'react'
import Scene from './Scene'
import TimeSlider from './TimeSlider'
import TemperaturePanel from './TemperaturePanel'
import { useCityStore, BlockType } from './store'

type ToolType = Exclude<BlockType, null>

const tools: { type: ToolType; label: string; icon: string }[] = [
  { type: 'building', label: '建筑', icon: '🏢' },
  { type: 'green', label: '绿地', icon: '🌳' },
  { type: 'water', label: '水体', icon: '💧' },
]

const presets: { name: string; label: string }[] = [
  { name: 'cbd', label: '🏙️ 密集CBD' },
  { name: 'park', label: '🌲 公园环绕' },
  { name: 'waterfront', label: '🌊 滨水新区' },
]

export default function App() {
  const { selectedType, setSelectedType, applyPreset, activePreset, calculateTemperatures } = useCityStore()

  useEffect(() => {
    calculateTemperatures()
  }, [])

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: '#f5f1e8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <Scene />

      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333',
          textShadow: '0 2px 4px rgba(255,255,255,0.8)'
        }}>
          🏙️ 城市热岛效应模拟器
        </h1>
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '13px',
          color: '#666'
        }}>
          点击网格放置地块，观察温度随时间的变化
        </p>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        zIndex: 100
      }}>
        <TemperaturePanel />
      </div>

      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '300px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        zIndex: 100
      }}>
        <TimeSlider />

        <div style={{
          background: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E0E0E0'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '12px'
          }}>
            地块类型
          </div>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            {tools.map(tool => (
              <button
                key={tool.type}
                onClick={() => setSelectedType(tool.type)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  border: `2px solid ${selectedType === tool.type ? '#FF6600' : '#E0E0E0'}`,
                  borderRadius: '8px',
                  background: selectedType === tool.type ? '#FFF5EE' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <span style={{ fontSize: '24px' }}>{tool.icon}</span>
                <span style={{ fontSize: '12px', color: '#333', fontWeight: 500 }}>{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E0E0E0'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '12px'
          }}>
            预设布局
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {presets.map(preset => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.name)}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${activePreset === preset.name ? '#FF6600' : '#E0E0E0'}`,
                  borderRadius: '8px',
                  background: activePreset === preset.name ? '#FFF5EE' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#333',
                  fontWeight: 500,
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          background: '#f8f9fa',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px dashed #ccc',
          fontSize: '11px',
          color: '#888',
          lineHeight: 1.6
        }}>
          <strong>操作提示：</strong><br />
          • 选择地块类型后点击网格放置<br />
          • 再次点击已放置的地块可删除<br />
          • 拖动时间滑块查看温度变化<br />
          • 鼠标拖拽可旋转3D视角
        </div>
      </div>
    </div>
  )
}
