import { useMemo } from 'react'
import type { Plant as PlantType } from './types'
import './Plant.css'

interface Props {
  plant: PlantType
}

export default function Plant({ plant }: Props) {
  const leaves = useMemo(() => {
    const arr = []
    for (let i = 0; i < plant.leafCount; i++) {
      arr.push(i)
    }
    return arr
  }, [plant.leafCount])

  const stemHeightPx = Math.max(0, plant.stemHeight * 8)
  const saturation = plant.stage === 'seed' ? 20
    : plant.stage === 'sprout' ? 50
    : plant.stage === 'growing' ? 70
    : 90

  const getStageColor = () => {
    switch (plant.stage) {
      case 'seed': return '#8B4513'
      case 'sprout': return '#90C690'
      case 'growing': return '#4A7C4A'
      case 'mature': return '#2E5A2E'
    }
  }

  return (
    <div className="plant-container">
      <div className="plant-stage">
        <div
          className="plant-wrapper"
          style={{
            filter: `saturate(${saturation}%)`,
            transition: 'filter 3s ease-in-out'
          }}
        >
          {plant.stage !== 'seed' && (
            <>
              <div
                className="stem"
                style={{
                  height: `${stemHeightPx}px`,
                  backgroundColor: getStageColor(),
                  transition: 'height 3s ease-in-out, background-color 3s ease-in-out'
                }}
              />
              <div className="leaves-container">
                {leaves.map((i) => {
                  const angle = (i / plant.leafCount) * 360
                  const yOffset = (i % 3) * 15
                  return (
                    <div
                      key={i}
                      className="leaf"
                      style={{
                        '--leaf-angle': `${angle}deg`,
                        '--leaf-delay': `${i * 0.1}s`,
                        transform: `rotate(${angle}deg) translateY(-${yOffset}px)`,
                        backgroundColor: getStageColor(),
                        transition: 'background-color 3s ease-in-out'
                      } as React.CSSProperties}
                    />
                  )
                })}
              </div>
              {plant.hasFlower && (
                <div
                  className="flower"
                  style={{ bottom: `${stemHeightPx + 10}px` }}
                />
              )}
            </>
          )}
          {plant.stage === 'seed' && <div className="seed-in-pot" />}
        </div>
        <div className="pot">
          <div className="pot-inner" />
        </div>
      </div>
      <div className="stage-info">
        <span className={`stage-badge stage-${plant.stage}`}>
          {getStageLabel(plant.stage)}
        </span>
        <div className="growth-stats">
          <span>茎高: {plant.stemHeight.toFixed(1)}cm</span>
          <span>叶片: {plant.leafCount}片</span>
        </div>
      </div>
    </div>
  )
}

function getStageLabel(stage: string): string {
  switch (stage) {
    case 'seed': return '🌰 种子'
    case 'sprout': return '🌱 幼苗'
    case 'growing': return '🌿 成长'
    case 'mature': return '🌳 成熟'
    default: return stage
  }
}
