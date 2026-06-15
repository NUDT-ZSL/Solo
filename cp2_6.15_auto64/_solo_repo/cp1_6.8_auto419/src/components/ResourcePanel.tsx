import { useGameStore, ORE_NAMES, FUEL_NAMES, ALLOY_NAMES, ORE_COLORS, FUEL_COLORS, ALLOY_COLORS, type OreType, type FuelType, type AlloyType } from '@/store/gameStore'

export default function ResourcePanel() {
  const resources = useGameStore((s) => s.resources)
  const gatherOre = useGameStore((s) => s.gatherOre)
  const gatherFuel = useGameStore((s) => s.gatherFuel)
  const sellAlloy = useGameStore((s) => s.sellAlloy)
  const setBuildingForge = useGameStore((s) => s.setBuildingForge)
  const buildingForge = useGameStore((s) => s.buildingForge)
  const forges = useGameStore((s) => s.forges)

  const oreTypes: OreType[] = ['copper', 'iron', 'crystal', 'mithril']
  const fuelTypes: FuelType[] = ['coal', 'lavaCoal', 'spiritFlame']
  const alloyTypes: AlloyType[] = ['bronze', 'steel', 'crystalAlloy', 'arcaneMetal']

  return (
    <div className="resource-panel">
      <div className="panel-section">
        <div className="panel-title">💰 资源</div>
        <div className="coin-display">
          <span className="coin-icon">🪙</span>
          <span className="coin-amount">{resources.coins}</span>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">⛏️ 矿石</div>
        {oreTypes.map((ore) => (
          <div key={ore} className="resource-row">
            <span className="resource-dot" style={{ background: ORE_COLORS[ore] }} />
            <span className="resource-name">{ORE_NAMES[ore]}</span>
            <span className="resource-amount">{resources.ores[ore]}</span>
            <button
              className="gather-btn"
              onClick={() => gatherOre(ore)}
            >
              采集
            </button>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <div className="panel-title">🔥 燃料</div>
        {fuelTypes.map((fuel) => (
          <div key={fuel} className="resource-row">
            <span className="resource-dot" style={{ background: FUEL_COLORS[fuel] }} />
            <span className="resource-name">{FUEL_NAMES[fuel]}</span>
            <span className="resource-amount">{resources.fuels[fuel]}</span>
            <button
              className="gather-btn"
              onClick={() => gatherFuel(fuel)}
            >
              采集
            </button>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <div className="panel-title">⚗️ 合金</div>
        {alloyTypes.map((alloy) => (
          <div key={alloy} className="resource-row">
            <span className="resource-dot" style={{ background: ALLOY_COLORS[alloy] }} />
            <span className="resource-name">{ALLOY_NAMES[alloy]}</span>
            <span className="resource-amount">{resources.alloys[alloy]}</span>
            {resources.alloys[alloy] > 0 && (
              <button className="sell-btn" onClick={() => sellAlloy(alloy)}>
                出售
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="panel-section">
        <button
          className={`build-btn ${buildingForge ? 'active' : ''}`}
          onClick={() => setBuildingForge(!buildingForge)}
        >
          {buildingForge ? '取消建造' : `建造熔炉 (30🪙)`}
        </button>
        <div className="forge-count">已有熔炉: {forges.length}</div>
      </div>
    </div>
  )
}
