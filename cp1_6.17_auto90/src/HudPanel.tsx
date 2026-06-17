import { useState, useEffect } from 'react'
import { useGameStore } from './gameStore'
import { getUpgradeCost } from './planetData'

export default function HudPanel() {
  const { resources, upgrades, upgradePart, resourceFlash } = useGameStore()
  const [flashState, setFlashState] = useState({ iron: false, uranium: false, crystal: false })

  const maxBlocks = 20

  useEffect(() => {
    const checkFlash = () => {
      const now = performance.now()
      const flashDuration = 300
      const newFlashState = {
        iron: now - resourceFlash.iron < flashDuration,
        uranium: now - resourceFlash.uranium < flashDuration,
        crystal: now - resourceFlash.crystal < flashDuration,
      }
      if (
        newFlashState.iron !== flashState.iron ||
        newFlashState.uranium !== flashState.uranium ||
        newFlashState.crystal !== flashState.crystal
      ) {
        setFlashState(newFlashState)
      }
    }

    checkFlash()
    const interval = setInterval(checkFlash, 50)
    return () => clearInterval(interval)
  }, [resourceFlash, flashState])

  const renderResourceBar = (
    value: number,
    colorClass: string,
    textColorClass: string,
    label: string,
    isFlashing: boolean
  ) => {
    const blocks = []
    const filledBlocks = Math.min(Math.floor(value / 2), maxBlocks)

    for (let i = 0; i < maxBlocks; i++) {
      blocks.push(
        <div
          key={i}
          className={`resource-block ${colorClass} ${i < filledBlocks ? 'resource-block-filled' : 'resource-block-empty'}`}
        />
      )
    }

    return (
      <div className="resource-bar">
        <span className={`resource-label ${textColorClass}`}>{label}</span>
        <div className="resource-blocks">{blocks}</div>
        <span className={`resource-value ${isFlashing ? 'resource-flash' : ''}`}>
          {Math.floor(value)}
        </span>
      </div>
    )
  }

  const renderUpgradeItem = (
    type: 'engine' | 'cargo' | 'laser',
    name: string
  ) => {
    const cost = getUpgradeCost(type, upgrades[type].level)
    const canAfford =
      resources.iron >= cost.iron &&
      resources.uranium >= cost.uranium &&
      resources.crystal >= cost.crystal

    const handleUpgrade = () => {
      upgradePart(type)
    }

    const getStatsText = () => {
      if (type === 'engine') {
        const speedPercent = Math.round(upgrades.engine.speedBonus * 100)
        return `速度 +${speedPercent}% (当前等级 ${upgrades.engine.level})`
      } else if (type === 'cargo') {
        return `容量 ${upgrades.cargo.capacity} 单位 (当前等级 ${upgrades.cargo.level})`
      } else {
        const efficiencyPercent = Math.round(upgrades.laser.efficiencyBonus * 100)
        return `效率 +${efficiencyPercent}% (当前等级 ${upgrades.laser.level})`
      }
    }

    return (
      <div className="upgrade-item">
        <div className="upgrade-info">
          <span className="upgrade-name">{name}</span>
          <span className="upgrade-level">Lv {upgrades[type].level}</span>
        </div>
        <div className="upgrade-stats">
          {getStatsText()}
        </div>
        <div className="upgrade-cost">
          <span className="cost-item">
            <span className="cost-dot iron-color" />
            {cost.iron}
          </span>
          <span className="cost-item">
            <span className="cost-dot uranium-color" />
            {cost.uranium}
          </span>
          <span className="cost-item">
            <span className="cost-dot crystal-color" />
            {cost.crystal}
          </span>
        </div>
        <button
          className="upgrade-button"
          onClick={handleUpgrade}
          disabled={!canAfford}
        >
          升级
        </button>
      </div>
    )
  }

  return (
    <div className="hud-panel">
      <div className="panel-section">
        <h2 className="panel-title">资源仓库</h2>
        {renderResourceBar(resources.iron, 'iron-color', 'iron-text', '铁', flashState.iron)}
        {renderResourceBar(resources.uranium, 'uranium-color', 'uranium-text', '铀', flashState.uranium)}
        {renderResourceBar(resources.crystal, 'crystal-color', 'crystal-text', '水晶', flashState.crystal)}
      </div>

      <div className="panel-section">
        <h2 className="panel-title">飞船部件</h2>
        {renderUpgradeItem('engine', '引擎')}
        {renderUpgradeItem('cargo', '货仓')}
        {renderUpgradeItem('laser', '采矿激光')}
      </div>

      <div className="instructions">
        <p>操作说明：</p>
        <p>1. 点击中心的白色飞船选中</p>
        <p>2. 点击可达行星（白色虚线框）前往采矿</p>
        <p>3. 采集完成后飞船自动返航</p>
        <p>4. 使用资源升级飞船部件</p>
        <p>5. 升级引擎可探索更远的行星</p>
      </div>
    </div>
  )
}
