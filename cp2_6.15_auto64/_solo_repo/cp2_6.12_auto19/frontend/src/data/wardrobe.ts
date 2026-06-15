import { ClothingStyle, Category } from '@/types'

const categoryConfig: Record<Category, { baseY: number; baseScale: number }> = {
  top: { baseY: 1.5, baseScale: 1 },
  bottom: { baseY: 0.2, baseScale: 1 },
  shoes: { baseY: -1.3, baseScale: 1 },
  accessory: { baseY: 2.2, baseScale: 0.8 }
}

const tops: ClothingStyle[] = [
  { id: 'top-1', name: '经典T恤', category: 'top', colors: ['#e8e0d5', '#5c6b7a', '#c9a87c'], shape: 'tshirt', yPosition: categoryConfig.top.baseY, scale: categoryConfig.top.baseScale },
  { id: 'top-2', name: '商务衬衫', category: 'top', colors: ['#ffffff', '#a8b5c4', '#8b7355'], shape: 'shirt', yPosition: categoryConfig.top.baseY + 0.05, scale: categoryConfig.top.baseScale * 1.02 },
  { id: 'top-3', name: '温暖毛衣', category: 'top', colors: ['#d4a574', '#6b5b7a', '#5a7a6a'], shape: 'sweater', yPosition: categoryConfig.top.baseY, scale: categoryConfig.top.baseScale * 1.05 },
  { id: 'top-4', name: '休闲夹克', category: 'top', colors: ['#4a4a4a', '#8b6914', '#2d5a3d'], shape: 'jacket', yPosition: categoryConfig.top.baseY, scale: categoryConfig.top.baseScale * 1.08 },
  { id: 'top-5', name: '优雅大衣', category: 'top', colors: ['#c4a77d', '#3d4f5f', '#7a5c6a'], shape: 'coat', yPosition: categoryConfig.top.baseY - 0.2, scale: categoryConfig.top.baseScale * 1.15 }
]

const bottoms: ClothingStyle[] = [
  { id: 'bottom-1', name: '修身牛仔裤', category: 'bottom', colors: ['#3d5a7a', '#2d2d2d', '#8b7355'], shape: 'pants', yPosition: categoryConfig.bottom.baseY, scale: categoryConfig.bottom.baseScale },
  { id: 'bottom-2', name: 'A字短裙', category: 'bottom', colors: ['#d4a574', '#5c6b7a', '#7a5c6a'], shape: 'skirt', yPosition: categoryConfig.bottom.baseY + 0.3, scale: categoryConfig.bottom.baseScale },
  { id: 'bottom-3', name: '休闲短裤', category: 'bottom', colors: ['#8b6914', '#5a7a6a', '#c9a87c'], shape: 'shorts', yPosition: categoryConfig.bottom.baseY + 0.5, scale: categoryConfig.bottom.baseScale },
  { id: 'bottom-4', name: '阔腿裤', category: 'bottom', colors: ['#e8e0d5', '#4a4a4a', '#6b5b7a'], shape: 'pants', yPosition: categoryConfig.bottom.baseY, scale: categoryConfig.bottom.baseScale * 1.1 },
  { id: 'bottom-5', name: '运动裤', category: 'bottom', colors: ['#2d2d2d', '#5a7a6a', '#a8b5c4'], shape: 'pants', yPosition: categoryConfig.bottom.baseY, scale: categoryConfig.bottom.baseScale * 1.05 }
]

const shoes: ClothingStyle[] = [
  { id: 'shoes-1', name: '休闲运动鞋', category: 'shoes', colors: ['#ffffff', '#2d2d2d', '#d4a574'], shape: 'sneakers', yPosition: categoryConfig.shoes.baseY, scale: categoryConfig.shoes.baseScale },
  { id: 'shoes-2', name: '时尚靴子', category: 'shoes', colors: ['#4a3728', '#2d2d2d', '#8b6914'], shape: 'boots', yPosition: categoryConfig.shoes.baseY + 0.1, scale: categoryConfig.shoes.baseScale * 1.1 },
  { id: 'shoes-3', name: '优雅高跟鞋', category: 'shoes', colors: ['#1a1a1a', '#c9a87c', '#7a5c6a'], shape: 'heels', yPosition: categoryConfig.shoes.baseY + 0.05, scale: categoryConfig.shoes.baseScale },
  { id: 'shoes-4', name: '商务皮鞋', category: 'shoes', colors: ['#1a1a1a', '#4a3728', '#8b7355'], shape: 'loafers', yPosition: categoryConfig.shoes.baseY, scale: categoryConfig.shoes.baseScale },
  { id: 'shoes-5', name: '帆布鞋', category: 'shoes', colors: ['#ffffff', '#3d5a7a', '#5a7a6a'], shape: 'sneakers', yPosition: categoryConfig.shoes.baseY, scale: categoryConfig.shoes.baseScale * 0.95 }
]

const accessories: ClothingStyle[] = [
  { id: 'acc-1', name: '时尚帽子', category: 'accessory', colors: ['#4a4a4a', '#c9a87c', '#5c6b7a'], shape: 'hat', yPosition: categoryConfig.accessory.baseY + 0.3, scale: categoryConfig.accessory.baseScale },
  { id: 'acc-2', name: '轻奢手提包', category: 'accessory', colors: ['#8b6914', '#2d2d2d', '#7a5c6a'], shape: 'bag', yPosition: categoryConfig.accessory.baseY - 0.5, scale: categoryConfig.accessory.baseScale * 0.9 },
  { id: 'acc-3', name: '精美项链', category: 'accessory', colors: ['#d4af37', '#c0c0c0', '#e8e0d5'], shape: 'necklace', yPosition: categoryConfig.accessory.baseY - 0.8, scale: categoryConfig.accessory.baseScale * 0.7 },
  { id: 'acc-4', name: '时尚手链', category: 'accessory', colors: ['#d4af37', '#c0c0c0', '#7a5c6a'], shape: 'bracelet', yPosition: categoryConfig.accessory.baseY - 1, scale: categoryConfig.accessory.baseScale * 0.6 },
  { id: 'acc-5', name: '温暖围巾', category: 'accessory', colors: ['#c9a87c', '#5c6b7a', '#6b5b7a'], shape: 'scarf', yPosition: categoryConfig.accessory.baseY - 0.7, scale: categoryConfig.accessory.baseScale * 0.85 }
]

export const wardrobe: Record<Category, ClothingStyle[]> = {
  top: tops,
  bottom: bottoms,
  shoes: shoes,
  accessory: accessories
}

export const getStyleById = (id: string): ClothingStyle | undefined => {
  return Object.values(wardrobe).flat().find(style => style.id === id)
}

export const categoryNames: Record<Category, string> = {
  top: '上衣',
  bottom: '下装',
  shoes: '鞋子',
  accessory: '配饰'
}
