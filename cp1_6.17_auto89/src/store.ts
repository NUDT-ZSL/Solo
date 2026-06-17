import { create } from 'zustand'

export type ProductType = 'bracelet' | 'necklace' | 'pendant'
export type MaterialType = 'leather' | 'metal' | 'cord'
export type AccessoryType = 'bead' | 'charm' | 'hook'
export type AccessoryAnimationState = 'idle' | 'adding' | 'removing'

export interface ColorSwatch {
  name: string
  value: string
}

export const COLOR_SWATCHES: ColorSwatch[] = [
  { name: '原木色', value: '#D4A574' },
  { name: '银色', value: '#C0C0C0' },
  { name: '天蓝', value: '#4A90D9' },
  { name: '珊瑚红', value: '#E8877E' },
  { name: '森林绿', value: '#5B8A5B' },
  { name: '薰衣草', value: '#B19CD9' },
  { name: '玫瑰金', value: '#E8B4B8' },
  { name: '橄榄绿', value: '#808000' },
  { name: '紫罗兰', value: '#9370DB' },
  { name: '深蓝', value: '#2C3E50' },
  { name: '橙黄', value: '#F5A623' },
  { name: '酒红', value: '#8B0000' },
]

export const MATERIAL_CONFIG: Record<MaterialType, {
  name: string
  baseColor: string
  roughness: number
  metalness: number
  bumpScale: number
}> = {
  leather: {
    name: '皮革',
    baseColor: '#D4A574',
    roughness: 0.8,
    metalness: 0.1,
    bumpScale: 0.05,
  },
  metal: {
    name: '金属丝',
    baseColor: '#C0C0C0',
    roughness: 0.2,
    metalness: 0.9,
    bumpScale: 0.02,
  },
  cord: {
    name: '编织绳',
    baseColor: '#E8C396',
    roughness: 0.9,
    metalness: 0.0,
    bumpScale: 0.08,
  },
}

export const PRODUCT_TYPE_NAMES: Record<ProductType, string> = {
  bracelet: '手链',
  necklace: '项链',
  pendant: '挂饰',
}

export const ACCESSORY_NAMES: Record<AccessoryType, string> = {
  bead: '珠子',
  charm: '吊坠',
  hook: '挂钩',
}

const VALID_PRODUCT_TYPES: ProductType[] = ['bracelet', 'necklace', 'pendant']
const VALID_MATERIALS: MaterialType[] = ['leather', 'metal', 'cord']
const VALID_ACCESSORIES: AccessoryType[] = ['bead', 'charm', 'hook']
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

export interface ExportedConfig {
  productType: ProductType
  material: MaterialType
  color: string
  accessories: AccessoryType[]
  exportedAt?: string
}

export interface ConfigValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const ANIMATION_DURATION = 400

interface ConfigState {
  selectedType: ProductType
  material: MaterialType
  color: string
  accessories: AccessoryType[]
  accessoryStates: Record<AccessoryType, AccessoryAnimationState>
  configLoaded: boolean
  lastLoadedAt: string | null
  loadError: string | null

  updateConfig: <K extends keyof Omit<ConfigState,
    | 'updateConfig'
    | 'toggleAccessory'
    | 'getConfigJSON'
    | 'getExportedConfig'
    | 'loadConfig'
    | 'validateConfig'
    | 'accessoryStates'
    | 'setAccessoryState'
    | 'configLoaded'
    | 'lastLoadedAt'
    | 'loadError'
    | 'clearLoadStatus'
  >>(
    key: K,
    value: ConfigState[K]
  ) => void

  setAccessoryState: (accessory: AccessoryType, state: AccessoryAnimationState) => void

  toggleAccessory: (accessory: AccessoryType) => Promise<{ success: boolean; reason?: string }>

  validateConfig: (data: unknown) => ConfigValidationResult

  getConfigJSON: () => string
  getExportedConfig: () => ExportedConfig

  loadConfig: (data: unknown) => Promise<{ success: boolean; errors?: string[] }>

  clearLoadStatus: () => void
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  selectedType: 'bracelet',
  material: 'leather',
  color: COLOR_SWATCHES[0].value,
  accessories: [],
  accessoryStates: { bead: 'idle', charm: 'idle', hook: 'idle' },
  configLoaded: false,
  lastLoadedAt: null,
  loadError: null,

  updateConfig: (key, value) => set({ [key]: value } as any),

  setAccessoryState: (accessory, state) => {
    set((prev) => ({
      accessoryStates: { ...prev.accessoryStates, [accessory]: state },
    }))
  },

  toggleAccessory: async (accessory) => {
    const { accessories, accessoryStates } = get()
    const currentState = accessoryStates[accessory]
    const isPresent = accessories.includes(accessory)

    if (currentState !== 'idle') {
      return {
        success: false,
        reason: `配件"${ACCESSORY_NAMES[accessory]}"正在动画中，请稍候`,
      }
    }

    if (isPresent) {
      set((prev) => ({
        accessoryStates: { ...prev.accessoryStates, [accessory]: 'removing' },
      }))

      await new Promise((resolve) => setTimeout(resolve, ANIMATION_DURATION))

      set((prev) => ({
        accessories: prev.accessories.filter((a) => a !== accessory),
        accessoryStates: { ...prev.accessoryStates, [accessory]: 'idle' },
      }))

      return { success: true }
    } else {
      set((prev) => ({
        accessories: [...prev.accessories, accessory],
        accessoryStates: { ...prev.accessoryStates, [accessory]: 'adding' },
      }))

      await new Promise((resolve) => setTimeout(resolve, ANIMATION_DURATION))

      set((prev) => ({
        accessoryStates: { ...prev.accessoryStates, [accessory]: 'idle' },
      }))

      return { success: true }
    }
  },

  validateConfig: (data) => {
    const errors: string[] = []
    const warnings: string[] = []

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['配置数据不是有效的对象'], warnings: [] }
    }

    const d = data as Record<string, unknown>

    if (!('productType' in d)) {
      errors.push('缺少必填字段: productType')
    } else if (!VALID_PRODUCT_TYPES.includes(d.productType as ProductType)) {
      errors.push(`productType 值无效: ${d.productType}，有效值为: ${VALID_PRODUCT_TYPES.join(', ')}`)
    }

    if (!('material' in d)) {
      errors.push('缺少必填字段: material')
    } else if (!VALID_MATERIALS.includes(d.material as MaterialType)) {
      errors.push(`material 值无效: ${d.material}，有效值为: ${VALID_MATERIALS.join(', ')}`)
    }

    if (!('color' in d)) {
      errors.push('缺少必填字段: color')
    } else if (typeof d.color !== 'string' || !HEX_COLOR_REGEX.test(d.color)) {
      errors.push(`color 格式无效: ${d.color}，应为十六进制颜色值，如 #D4A574`)
    }

    if (!('accessories' in d)) {
      warnings.push('缺少 accessories 字段，将使用空数组')
    } else if (!Array.isArray(d.accessories)) {
      errors.push('accessories 应为数组')
    } else {
      const accArr = d.accessories as unknown[]
      accArr.forEach((acc, idx) => {
        if (!VALID_ACCESSORIES.includes(acc as AccessoryType)) {
          errors.push(`accessories[${idx}] 值无效: ${acc}，有效值为: ${VALID_ACCESSORIES.join(', ')}`)
        }
      })
    }

    if ('exportedAt' in d && typeof d.exportedAt !== 'string') {
      warnings.push('exportedAt 字段格式异常')
    }

    return { valid: errors.length === 0, errors, warnings }
  },

  getConfigJSON: () => {
    return JSON.stringify(get().getExportedConfig(), null, 2)
  },

  getExportedConfig: () => {
    const { selectedType, material, color, accessories } = get()
    return {
      productType: selectedType,
      material,
      color,
      accessories,
      exportedAt: new Date().toISOString(),
    }
  },

  loadConfig: async (data) => {
    const validation = get().validateConfig(data)

    if (!validation.valid) {
      set({
        configLoaded: false,
        loadError: validation.errors.join('; '),
      })
      return { success: false, errors: validation.errors }
    }

    const d = data as ExportedConfig

    const validAccessories = (d.accessories || []).filter((a) =>
      VALID_ACCESSORIES.includes(a)
    ) as AccessoryType[]

    const newAccessoryStates: Record<AccessoryType, AccessoryAnimationState> = {
      bead: 'idle',
      charm: 'idle',
      hook: 'idle',
    }

    set({
      selectedType: VALID_PRODUCT_TYPES.includes(d.productType) ? d.productType : 'bracelet',
      material: VALID_MATERIALS.includes(d.material) ? d.material : 'leather',
      color: HEX_COLOR_REGEX.test(d.color) ? d.color : COLOR_SWATCHES[0].value,
      accessories: validAccessories,
      accessoryStates: newAccessoryStates,
      configLoaded: true,
      lastLoadedAt: new Date().toISOString(),
      loadError: null,
    })

    return { success: true }
  },

  clearLoadStatus: () => {
    set({ configLoaded: false, loadError: null })
  },
}))
