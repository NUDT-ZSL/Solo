import { useConfigStore, ProductType, MaterialType, AccessoryType, COLOR_SWATCHES, MATERIAL_CONFIG, PRODUCT_TYPE_NAMES, ACCESSORY_NAMES } from '@/store'

const productTypes: ProductType[] = ['bracelet', 'necklace', 'pendant']
const materialTypes: MaterialType[] = ['leather', 'metal', 'cord']
const accessoryTypes: AccessoryType[] = ['bead', 'charm', 'hook']

function CustomizerPanel() {
  const selectedType = useConfigStore((s) => s.selectedType)
  const material = useConfigStore((s) => s.material)
  const color = useConfigStore((s) => s.color)
  const accessories = useConfigStore((s) => s.accessories)
  const updateConfig = useConfigStore((s) => s.updateConfig)
  const toggleAccessory = useConfigStore((s) => s.toggleAccessory)

  return (
    <div className="customizer-panel">
      <h1 className="panel-title">手工定制工坊</h1>

      <div className="section">
        <h3 className="section-title">商品类型</h3>
        <div className="type-buttons">
          {productTypes.map((type) => (
            <button
              key={type}
              className={`type-btn ${selectedType === type ? 'active' : ''}`}
              onClick={() => updateConfig('selectedType', type)}
            >
              {PRODUCT_TYPE_NAMES[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="section-divider" />

      <div className="section">
        <h3 className="section-title">材质选择</h3>
        <div className="material-buttons">
          {materialTypes.map((mat) => (
            <button
              key={mat}
              className={`material-btn ${material === mat ? 'active' : ''}`}
              onClick={() => updateConfig('material', mat)}
            >
              <span
                className="material-preview"
                style={{ backgroundColor: MATERIAL_CONFIG[mat].baseColor }}
              />
              <span className="material-name">{MATERIAL_CONFIG[mat].name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section-divider" />

      <div className="section">
        <h3 className="section-title">颜色选择</h3>
        <div className="color-swatches">
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch.value}
              className={`color-swatch ${color === swatch.value ? 'active' : ''}`}
              style={{ backgroundColor: swatch.value }}
              onClick={() => updateConfig('color', swatch.value)}
              data-tooltip={swatch.name}
            />
          ))}
        </div>
      </div>

      <div className="section-divider" />

      <div className="section">
        <h3 className="section-title">配件装饰</h3>
        <div className="accessory-list">
          {accessoryTypes.map((acc) => (
            <button
              key={acc}
              className={`accessory-item ${accessories.includes(acc) ? 'active' : ''}`}
              onClick={() => toggleAccessory(acc)}
            >
              <span className="accessory-icon">
                <AccessoryIcon type={acc} />
              </span>
              <span className="accessory-label">{ACCESSORY_NAMES[acc]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function AccessoryIcon({ type }: { type: AccessoryType }) {
  switch (type) {
    case 'bead':
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <circle cx="15" cy="15" r="10" fill="#E8B4B8" stroke="#8B5E3C" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill="rgba(255,255,255,0.6)" />
        </svg>
      )
    case 'charm':
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M15 4 C15 4 22 10 22 16 C22 20 18.5 25 15 27 C11.5 25 8 20 8 16 C8 10 15 4 15 4Z" fill="#E8877E" stroke="#8B5E3C" strokeWidth="1.5" />
          <circle cx="15" cy="16" r="3" fill="rgba(255,255,255,0.4)" />
          <rect x="13" y="2" width="4" height="4" rx="1" fill="#C0C0C0" stroke="#8B5E3C" strokeWidth="1" />
        </svg>
      )
    case 'hook':
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <rect x="12" y="4" width="6" height="8" rx="1" fill="#C0C0C0" stroke="#8B5E3C" strokeWidth="1.5" />
          <path d="M15 12 C15 12 8 12 8 19 C8 24 12 26 15 26 C18 26 22 24 22 19 L19 19 C19 22 17 23 15 23 C13 23 11 22 11 19 C11 16 15 15 15 15 L15 12Z" fill="#C0C0C0" stroke="#8B5E3C" strokeWidth="1.5" />
        </svg>
      )
  }
}

export default CustomizerPanel
