import React, { useState } from 'react'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import SceneCard, { SceneType } from './components/SceneCard'
import CityTraffic from './scenes/CityTraffic'
import OceanEco from './scenes/OceanEco'
import SpaceExploration from './scenes/SpaceExploration'

const sceneLabels: Record<SceneType, { label: string; icon: string }> = {
  traffic: { label: '城市交通流', icon: '🚗' },
  ocean: { label: '海洋生态', icon: '🐠' },
  space: { label: '太空探索', icon: '🚀' },
}

const App: React.FC = () => {
  const [activeScene, setActiveScene] = useState<SceneType>('traffic')
  const [key, setKey] = useState(0)

  const handleSceneChange = (scene: SceneType) => {
    if (scene !== activeScene) {
      setActiveScene(scene)
      setKey(k => k + 1)
    }
  }

  const renderScene = () => {
    switch (activeScene) {
      case 'traffic':
        return <CityTraffic key={`traffic-${key}`} />
      case 'ocean':
        return <OceanEco key={`ocean-${key}`} />
      case 'space':
        return <SpaceExploration key={`space-${key}`} />
      default:
        return null
    }
  }

  return (
    <div className="app-container">
      <h1 className="app-title">数据可视化仪表盘</h1>

      <div className="cards-container">
        {(['traffic', 'ocean', 'space'] as SceneType[]).map((scene) => (
          <SceneCard
            key={scene}
            type={scene}
            label={sceneLabels[scene].label}
            icon={sceneLabels[scene].icon}
            active={activeScene === scene}
            onClick={() => handleSceneChange(scene)}
          />
        ))}
      </div>

      <div className="canvas-wrapper">
        <div className="canvas-container">
          <TransitionGroup component={null}>
            <CSSTransition
              key={activeScene + '-' + key}
              timeout={400}
              classNames="scene"
              mountOnEnter
              unmountOnExit
            >
              <div style={{ width: '100%', height: '100%' }}>{renderScene()}</div>
            </CSSTransition>
          </TransitionGroup>
        </div>
        <div className="scene-name">{sceneLabels[activeScene].label}</div>
      </div>
    </div>
  )
}

export default App
