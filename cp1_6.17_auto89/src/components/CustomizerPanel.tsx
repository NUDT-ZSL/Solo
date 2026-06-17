import { useRef, useState } from 'react'
import JSZip from 'jszip'
import {
  useConfigStore,
  ProductType,
  MaterialType,
  AccessoryType,
  COLOR_SWATCHES,
  MATERIAL_CONFIG,
  PRODUCT_TYPE_NAMES,
  ACCESSORY_NAMES,
  ExportedConfig,
  AccessoryAnimationState,
} from '@/store'

const productTypes: ProductType[] = ['bracelet', 'necklace', 'pendant']
const materialTypes: MaterialType[] = ['leather', 'metal', 'cord']
const accessoryTypes: AccessoryType[] = ['bead', 'charm', 'hook']

function CustomizerPanel() {
  const selectedType = useConfigStore((s) => s.selectedType)
  const material = useConfigStore((s) => s.material)
  const color = useConfigStore((s) => s.color)
  const accessories = useConfigStore((s) => s.accessories)
  const accessoryStates = useConfigStore((s) => s.accessoryStates)
  const configLoaded = useConfigStore((s) => s.configLoaded)
  const loadError = useConfigStore((s) => s.loadError)
  const updateConfig = useConfigStore((s) => s.updateConfig)
  const toggleAccessory = useConfigStore((s) => s.toggleAccessory)
  const loadConfig = useConfigStore((s) => s.loadConfig)

  const [localMessage, setLocalMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showMessage = (msg: string, duration = 2000) => {
    setLocalMessage(msg)
    setTimeout(() => setLocalMessage(null), duration)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      let config: ExportedConfig | null = null

      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file)
        const jsonFile = Object.values(zip.files).find(
          (f) => f.name.endsWith('.json') && !f.dir
        )
        if (jsonFile) {
          const jsonContent = await jsonFile.async('string')
          config = JSON.parse(jsonContent) as ExportedConfig
        } else {
          showMessage('ZIP包中未找到配置JSON文件', 3000)
          return
        }
      } else if (file.name.endsWith('.json')) {
        const text = await file.text()
        config = JSON.parse(text) as ExportedConfig
      } else {
        showMessage('仅支持 .json 或 .zip 格式', 3000)
        return
      }

      const result = await loadConfig(config)
      if (!result.success && result.errors) {
        showMessage(`配置校验失败: ${result.errors[0]}`, 4000)
      }
    } catch (err) {
      console.error('Failed to load config:', err)
      showMessage('配置文件加载失败', 3000)
    }

    e.target.value = ''
  }

  const handleToggleAccessory = async (acc: AccessoryType) => {
    const state: AccessoryAnimationState = accessoryStates[acc]
    if (state !== 'idle') {
      showMessage(`"${ACCESSORY_NAMES[acc]}"正在动画中，请稍候`)
      return
    }

    const result = await toggleAccessory(acc)
    if (!result.success && result.reason) {
      showMessage(result.reason, 2500)
    }
  }

  return (
    <div className="customizer-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="panel-title">手工定制工坊</h1>
        <button
          className="action-btn"
          onClick={handleUploadClick}
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 11.5a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11a.5.5 0 0 0 .5.5zM.5 14a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 0-1H1a.5.5 0 0 0-.5.5z" />
          </svg>
          导入
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.zip"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {(localMessage || configLoaded || loadError) && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 8,
            background: loadError ? '#FFE0E0' : configLoaded ? '#E0F0E0' : '#FFF4E0',
            color: loadError ? '#B04040' : configLoaded ? '#3D703D' : '#805020',
            fontWeight: 500,
          }}
        >
          {localMessage ||
            (loadError ? `加载失败: ${loadError}` : '配置已加载，可继续修改')}
        </div>
      )}

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
                style={{
                  backgroundColor: MATERIAL_CONFIG[mat].baseColor,
                  boxShadow:
                    mat === 'metal'
                      ? 'inset 0 0 8px rgba(255,255,255,0.6), 0 0 4px rgba(0,0,0,0.2)'
                      : mat === 'leather'
                      ? 'inset 0 0 4px rgba(0,0,0,0.15)'
                      : 'inset 0 0 6px rgba(139,94,60,0.25)',
                }}
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
          {accessoryTypes.map((acc) => {
            const isSelected = accessories.includes(acc)
            const state = accessoryStates[acc]
            const isAnimating = state !== 'idle'

            return (
              <button
                key={acc}
                className={`accessory-item ${isSelected ? 'active' : ''}`}
                onClick={() => handleToggleAccessory(acc)}
                disabled={isAnimating}
                style={{
                  opacity: isAnimating ? 0.6 : 1,
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  transform: state === 'adding' ? 'scale(1.05)' : undefined,
                }}
              >
                <span className="accessory-icon">
                  <AccessoryIcon type={acc} />
                </span>
                <span className="accessory-label">
                  {ACCESSORY_NAMES[acc]}
                  {state === 'adding' && (
                    <span style={{ color: '#5B8A5B', marginLeft: 2 }}>+</span>
                  )}
                  {state === 'removing' && (
                    <span style={{ color: '#E8877E', marginLeft: 2 }}>−</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: '#8D6E63',
            lineHeight: 1.5,
          }}
        >
          点击配件可添加/移除，动画进行中请稍候
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
          <circle cx="22" cy="12" r="4" fill="#4A90D9" stroke="#8B5E3C" strokeWidth="1" />
          <circle cx="8" cy="22" r="4" fill="#5B8A5B" stroke="#8B5E3C" strokeWidth="1" />
        </svg>
      )
    case 'charm':
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path
            d="M15 4 C15 4 22 10 22 16 C22 20 18.5 25 15 27 C11.5 25 8 20 8 16 C8 10 15 4 15 4Z"
            fill="#E8877E"
            stroke="#8B5E3C"
            strokeWidth="1.5"
          />
          <circle cx="15" cy="16" r="3" fill="rgba(255,255,255,0.4)" />
          <rect x="13" y="2" width="4" height="4" rx="1" fill="#C0C0C0" stroke="#8B5E3C" strokeWidth="1" />
        </svg>
      )
    case 'hook':
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <rect x="12" y="4" width="6" height="8" rx="1" fill="#C0C0C0" stroke="#8B5E3C" strokeWidth="1.5" />
          <path
            d="M15 12 C15 12 8 12 8 19 C8 24 12 26 15 26 C18 26 22 24 22 19 L19 19 C19 22 17 23 15 23 C13 23 11 22 11 19 C11 16 15 15 15 15 L15 12Z"
            fill="#C0C0C0"
            stroke="#8B5E3C"
            strokeWidth="1.5"
          />
        </svg>
      )
  }
}

export default CustomizerPanel
