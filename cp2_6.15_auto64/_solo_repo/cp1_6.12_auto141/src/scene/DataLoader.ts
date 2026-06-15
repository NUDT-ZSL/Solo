import * as THREE from 'three'

export interface POIData {
  id: number
  name: string
  category: string
  lng: number
  lat: number
  heat: number
  x: number
  y: number
  color: THREE.Color
}

const CATEGORIES = ['餐饮美食', '购物商场', '休闲娱乐', '交通枢纽', '教育机构', '医疗健康', '商务办公', '旅游景点']
const NAMES_PREFIX = ['星光', '悦享', '城市', '繁华', '锦绣', '和谐', '富贵', '金色', '绿洲', '幸福', '万家', '鸿运', '盛世', '中天', '东方']
const NAMES_SUFFIX = ['广场', '中心', '大厦', '商圈', '花园', '天地', '坊', '街', '里', '城', '苑', '阁', '府', '楼']

class DataLoaderSingleton {
  private static instance: DataLoaderSingleton
  private data: POIData[] = []
  private cityCenter = { lng: 116.3975, lat: 39.9087 }
  private bounds = { lngRange: 0.12, latRange: 0.1 }
  private planeSize = 100

  private constructor() {}

  public static getInstance(): DataLoaderSingleton {
    if (!DataLoaderSingleton.instance) {
      DataLoaderSingleton.instance = new DataLoaderSingleton()
    }
    return DataLoaderSingleton.instance
  }

  private generateName(): string {
    const prefix = NAMES_PREFIX[Math.floor(Math.random() * NAMES_PREFIX.length)]
    const suffix = NAMES_SUFFIX[Math.floor(Math.random() * NAMES_SUFFIX.length)]
    const num = Math.floor(Math.random() * 999) + 1
    return `${prefix}${suffix}${num}号`
  }

  private heatToColor(heat: number): THREE.Color {
    if (heat < 30) {
      return new THREE.Color('#3b82f6')
    } else if (heat <= 70) {
      return new THREE.Color('#fbbf24')
    } else {
      return new THREE.Color('#ef4444')
    }
  }

  private lngLatToXY(lng: number, lat: number): { x: number; y: number } {
    const jitter = 0.02
    const nx =
      ((lng - this.cityCenter.lng) / this.bounds.lngRange + 0.5) * this.planeSize -
      this.planeSize / 2 +
      (Math.random() - 0.5) * this.planeSize * jitter
    const ny =
      ((lat - this.cityCenter.lat) / this.bounds.latRange + 0.5) * this.planeSize -
      this.planeSize / 2 +
      (Math.random() - 0.5) * this.planeSize * jitter
    return { x: nx, y: ny }
  }

  public async fetchData(count: number = 3000): Promise<POIData[]> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    this.data = []
    for (let i = 0; i < count; i++) {
      const lng = this.cityCenter.lng + (Math.random() - 0.5) * this.bounds.lngRange
      const lat = this.cityCenter.lat + (Math.random() - 0.5) * this.bounds.latRange
      const centerDist = Math.sqrt(
        Math.pow((lng - this.cityCenter.lng) / this.bounds.lngRange, 2) +
          Math.pow((lat - this.cityCenter.lat) / this.bounds.latRange, 2)
      )
      let heat = Math.floor(Math.random() * 100) + 1
      if (centerDist < 0.3) {
        heat = Math.min(100, heat + 40)
      } else if (centerDist < 0.5) {
        heat = Math.min(100, heat + 20)
      }
      const { x, y } = this.lngLatToXY(lng, lat)
      this.data.push({
        id: i,
        name: this.generateName(),
        category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
        lng,
        lat,
        heat,
        x,
        y,
        color: this.heatToColor(heat)
      })
    }
    return this.data
  }

  public getData(): POIData[] {
    return this.data
  }

  public getPlaneSize(): number {
    return this.planeSize
  }
}

export const DataLoader = DataLoaderSingleton.getInstance()
