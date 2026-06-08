import { useGameStore, RECIPES, TECHNOLOGIES, ORE_NAMES, FUEL_NAMES, ALLOY_NAMES, ALLOY_COLORS, type OreType, type FuelType } from '@/store/gameStore'

export default function ConsolePanel() {
  const technologies = useGameStore((s) => s.technologies)
  const unlockTech = useGameStore((s) => s.unlockTech)
  const resources = useGameStore((s) => s.resources)
  const selectedForgeId = useGameStore((s) => s.selectedForgeId)
  const forges = useGameStore((s) => s.forges)
  const startSmelting = useGameStore((s) => s.startSmelting)
  const upgradeForge = useGameStore((s) => s.upgradeForge)
  const selectForge = useGameStore((s) => s.selectForge)

  const selectedForge = forges.find((f) => f.id === selectedForgeId)

  const canAffordRecipe = (recipe: typeof RECIPES[number]) => {
    for (const [ore, amt] of Object.entries(recipe.requiredOres)) {
      if ((resources.ores[ore as OreType] ?? 0) < (amt ?? 0)) return false
    }
    for (const [fuel, amt] of Object.entries(recipe.requiredFuel)) {
      if ((resources.fuels[fuel as FuelType] ?? 0) < (amt ?? 0)) return false
    }
    if (recipe.requiredTech && !technologies[recipe.requiredTech]) return false
    return true
  }

  const canAffordTech = (tech: typeof TECHNOLOGIES[number]) => {
    if (technologies[tech.id]) return false
    if (resources.coins < tech.cost.coins) return false
    if (tech.cost.alloys) {
      for (const [alloy, amt] of Object.entries(tech.cost.alloys)) {
        if ((resources.alloys[alloy as keyof typeof resources.alloys] ?? 0) < (amt ?? 0)) return false
      }
    }
    return true
  }

  return (
    <div className="console-panel">
      <div className="panel-section">
        <div className="panel-title">🔬 科技树</div>
        {[1, 2, 3].map((tier) => (
          <div key={tier} className="tech-tier">
            <div className="tier-label">第 {tier} 阶</div>
            {TECHNOLOGIES.filter((t) => t.tier === tier).map((tech) => (
              <div
                key={tech.id}
                className={`tech-card ${technologies[tech.id] ? 'unlocked' : ''}`}
              >
                <div className="tech-name">
                  {technologies[tech.id] ? '✅' : '🔒'} {tech.name}
                </div>
                <div className="tech-desc">{tech.description}</div>
                {!technologies[tech.id] && (
                  <div className="tech-cost">
                    费用: {tech.cost.coins}🪙
                    {tech.cost.alloys &&
                      Object.entries(tech.cost.alloys).map(([alloy, amt]) => (
                        <span key={alloy}>
                          {' '}
                          {amt}x
                          <span style={{ color: ALLOY_COLORS[alloy as keyof typeof ALLOY_COLORS] }}>
                            {ALLOY_NAMES[alloy as keyof typeof ALLOY_NAMES]}
                          </span>
                        </span>
                      ))}
                  </div>
                )}
                {!technologies[tech.id] && (
                  <button
                    className={`unlock-btn ${canAffordTech(tech) ? 'affordable' : ''}`}
                    onClick={() => unlockTech(tech.id)}
                    disabled={!canAffordTech(tech)}
                  >
                    解锁
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="panel-section">
        <div className="panel-title">📜 炼制配方</div>
        {selectedForge ? (
          <>
            <div className="selected-forge-info">
              熔炉 #{selectedForge.id.slice(-3)} (Lv.{selectedForge.level})
              {selectedForge.status === 'smelting' && (
                <span className="smelting-badge">炼制中 {Math.floor(selectedForge.smeltingProgress * 100)}%</span>
              )}
            </div>
            {selectedForge.status === 'idle' && (
              <div className="recipe-list">
                {RECIPES.map((recipe) => {
                  const available = canAffordRecipe(recipe)
                  const techLocked = recipe.requiredTech ? !technologies[recipe.requiredTech] : false
                  return (
                    <div key={recipe.id} className={`recipe-card ${techLocked ? 'locked' : ''}`}>
                      <div className="recipe-name">
                        {recipe.name}
                        {techLocked && ' 🔒'}
                      </div>
                      <div className="recipe-materials">
                        {Object.entries(recipe.requiredOres).map(([ore, amt]) => (
                          <span key={ore} className="mat-tag ore">
                            {amt}x {ORE_NAMES[ore as OreType]}
                          </span>
                        ))}
                        {Object.entries(recipe.requiredFuel).map(([fuel, amt]) => (
                          <span key={fuel} className="mat-tag fuel">
                            {amt}x {FUEL_NAMES[fuel as FuelType]}
                          </span>
                        ))}
                      </div>
                      <div className="recipe-output">
                        产出:
                        <span style={{ color: ALLOY_COLORS[recipe.output.type] }}>
                          {recipe.output.amount}x {ALLOY_NAMES[recipe.output.type]}
                        </span>
                      </div>
                      <div className="recipe-time">耗时: {(recipe.duration / 1000).toFixed(0)}秒</div>
                      <button
                        className={`smelt-btn ${available && !techLocked ? 'affordable' : ''}`}
                        onClick={() => startSmelting(selectedForge.id, recipe.id)}
                        disabled={!available || techLocked}
                      >
                        开始炼制
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            {selectedForge.status === 'smelting' && (
              <div className="smelting-info">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${selectedForge.smeltingProgress * 100}%` }}
                  />
                </div>
                <div className="smelting-text">
                  炼制进度: {Math.floor(selectedForge.smeltingProgress * 100)}%
                </div>
              </div>
            )}
            {selectedForge.status === 'idle' && (
              <button
                className="upgrade-btn"
                onClick={() => upgradeForge(selectedForge.id)}
              >
                升级熔炉 ({selectedForge.level * 50}🪙)
              </button>
            )}
            <button className="deselect-btn" onClick={() => selectForge(null)}>
              取消选择
            </button>
          </>
        ) : (
          <div className="no-forge-hint">点击场景中的熔炉以选择</div>
        )}
      </div>
    </div>
  )
}
