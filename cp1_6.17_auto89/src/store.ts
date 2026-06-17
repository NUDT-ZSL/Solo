import { create } from 'zustand'

export type ProductType = 'bracelet' | 'necklace' | 'pendant'
export type MaterialType = 'leather' | 'metal' | 'cord'
export type AccessoryType = 'bead' | 'charm' | 'hook'

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

interface ConfigState {
  selectedType: ProductType
  material: MaterialType
  color: string
  accessories: AccessoryType[]
  updateConfig: <K extends keyof Omit<ConfigState, 'updateConfig'>>(
    key: K,
    value: ConfigState[K]
  ) => void
  toggleAccessory: (accessory: AccessoryType) => void
  getConfigJSON: () => string
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  selectedType: 'bracelet',
  material: 'leather',
  color: COLOR_SWATCHES[0].value,
  accessories: [],

  updateConfig: (key, value) => set({ [key]: value }),

  toggleAccessory: (accessory) => {
    const { accessories } = get()
    if (accessories.includes(accessory)) {
      set({ accessories: accessories.filter(a => a !== accessory) })
    } else {
      set({ accessories: [...accessories, accessory] })
    }
  },

  getConfigJSON: () => {
    const { selectedType, material, color, accessories } = get()
    return JSON.stringify({
      productType: selectedType,
      material,
      color,
      accessories,
      exportedAt: new Date().toISOString(),
    }, null, 2)
  },
}))
