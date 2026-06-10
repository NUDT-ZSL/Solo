import * as THREE from 'three'
import { ParticleSystem } from './particleSystem'

export type EmotionType = 'joy' | 'sadness' | 'calm'

export interface EmotionConfig {
  type: EmotionType
  intensity: number
  keywords: string[]
}

export interface ShapeFunction {
  (index: number, total: number, time?: number): THREE.Vector3
}

export interface ColorMap {
  (index: number, total: number): THREE.Color
}

const emotionKeywords: Record<EmotionType, string[]> = {
  joy: ['快乐', '开心', '喜悦', '兴奋', '欢乐', '愉快', '甜蜜', '温暖', '阳光', '笑', 'happy', 'joy', 'sunshine', 'warm', 'sweet'],
  sadness: ['忧伤', '悲伤', '难过', '失落', '孤独', '寂寞', '泪', '雨', '忧郁', '迷茫', 'sad', 'lonely', 'rain', 'blue', 'melancholy'],
  calm: ['宁静', '平静', '安详', '温柔', '舒缓', '清新', '自然', '风', '水', '云', 'calm', 'peaceful', 'gentle', 'soft', 'wind', 'cloud']
}

export class GardenGenerator {
  private particleSystem: ParticleSystem
  private currentEmotion: EmotionType = 'calm'
  private currentIntensity: number = 0.5
  private particleCount: number = 5000

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem
  }

  public parseEmotion(text: string): EmotionConfig {
    const lowerText = text.toLowerCase()
    const scores: Record<EmotionType, number> = {
      joy: 0,
      sadness: 0,
      calm: 0
    }

    for (const emotion of Object.keys(emotionKeywords) as EmotionType[]) {
      for (const keyword of emotionKeywords[emotion]) {
        if (lowerText.includes(keyword.toLowerCase())) {
          scores[emotion]++
        }
      }
    }

    const totalScore = scores.joy + scores.sadness + scores.calm
    if (totalScore === 0) {
      return {
        type: 'calm',
        intensity: 0.5,
        keywords: []
      }
    }

    let maxEmotion: EmotionType = 'calm'
    let maxScore = 0

    for (const emotion of Object.keys(scores) as EmotionType[]) {
      if (scores[emotion] > maxScore) {
        maxScore = scores[emotion]
        maxEmotion = emotion
      }
    }

    const intensity = Math.min(1, maxScore / totalScore + 0.3)

    const matchedKeywords = emotionKeywords[maxEmotion].filter(kw => 
      lowerText.includes(kw.toLowerCase())
    )

    return {
      type: maxEmotion,
      intensity,
      keywords: matchedKeywords
    }
  }

  public generate(text: string): void {
    const emotionConfig = this.parseEmotion(text)
    this.currentEmotion = emotionConfig.type
    this.currentIntensity = emotionConfig.intensity

    this.particleSystem.setEmotion(this.currentEmotion)
    this.particleSystem.setSpeedMultiplier(0.5 + emotionConfig.intensity * 1.5)

    this.particleSystem.reset()
    this.createParticles()
    this.particleSystem.startBloom()
  }

  public generateDefault(): void {
    this.currentEmotion = 'calm'
    this.currentIntensity = 0.5
    this.particleSystem.setEmotion('calm')
    this.particleSystem.setSpeedMultiplier(1)
    this.particleSystem.reset()
    this.createParticles()
    this.particleSystem.startBloom()
  }

  private createParticles(): void {
    const shapeFn = this.getShapeFunction(this.currentEmotion)
    const colorMap = this.getColorMap(this.currentEmotion)
    const speedBase = this.getSpeedBase(this.currentEmotion)

    for (let i = 0; i < this.particleCount; i++) {
      const position = shapeFn(i, this.particleCount)
      const color = colorMap(i, this.particleCount)
      
      const life = 10 + Math.random() * 5
      const size = 0.5 + Math.random() * 2.5
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * speedBase.x,
        speedBase.y + Math.random() * speedBase.y * 0.5,
        (Math.random() - 0.5) * speedBase.z
      )

      this.particleSystem.spawnParticle(position, velocity, color, size, life)
    }
  }

  private getShapeFunction(emotion: EmotionType): ShapeFunction {
    switch (emotion) {
      case 'joy':
        return this.spiralShape.bind(this)
      case 'sadness':
        return this.fallingShape.bind(this)
      case 'calm':
      default:
        return this.waveShape.bind(this)
    }
  }

  private spiralShape(index: number, total: number): THREE.Vector3 {
    const t = index / total
    const spiralTurns = 5
    const angle = t * Math.PI * 2 * spiralTurns
    const radius = t * 15
    
    const x = Math.cos(angle) * radius
    const y = t * 20 - 5
    const z = Math.sin(angle) * radius

    const jitter = 1.5
    return new THREE.Vector3(
      x + (Math.random() - 0.5) * jitter,
      y + (Math.random() - 0.5) * jitter * 2,
      z + (Math.random() - 0.5) * jitter
    )
  }

  private fallingShape(index: number, total: number): THREE.Vector3 {
    const spread = 20
    const height = 25

    const x = (Math.random() - 0.5) * spread
    const y = Math.random() * height
    const z = (Math.random() - 0.5) * spread * 0.6

    const drift = Math.sin(y * 0.3 + index * 0.1) * 2

    return new THREE.Vector3(x + drift, y, z)
  }

  private waveShape(index: number, total: number): THREE.Vector3 {
    const gridSize = Math.ceil(Math.sqrt(total))
    const row = Math.floor(index / gridSize)
    const col = index % gridSize

    const spread = 20
    const x = (col / gridSize - 0.5) * spread * 2
    const z = (row / gridSize - 0.5) * spread * 2

    const waveHeight = 3
    const y = Math.sin(x * 0.3) * Math.cos(z * 0.3) * waveHeight

    const jitter = 0.8
    return new THREE.Vector3(
      x + (Math.random() - 0.5) * jitter,
      y + (Math.random() - 0.5) * jitter,
      z + (Math.random() - 0.5) * jitter
    )
  }

  private getColorMap(emotion: EmotionType): ColorMap {
    switch (emotion) {
      case 'joy':
        return this.joyColors.bind(this)
      case 'sadness':
        return this.sadnessColors.bind(this)
      case 'calm':
      default:
        return this.calmColors.bind(this)
    }
  }

  private joyColors(index: number, total: number): THREE.Color {
    const t = index / total
    const hue = 30 + t * 20
    const saturation = 0.8 + Math.random() * 0.2
    const lightness = 0.5 + Math.random() * 0.3

    const color = new THREE.Color()
    color.setHSL(hue / 360, saturation, lightness)
    return color
  }

  private sadnessColors(index: number, total: number): THREE.Color {
    const t = index / total
    const hue = 200 + t * 60
    const saturation = 0.6 + Math.random() * 0.3
    const lightness = 0.3 + Math.random() * 0.3

    const color = new THREE.Color()
    color.setHSL(hue / 360, saturation, lightness)
    return color
  }

  private calmColors(index: number, total: number): THREE.Color {
    const t = index / total
    const hue = 150 + t * 50
    const saturation = 0.5 + Math.random() * 0.3
    const lightness = 0.5 + Math.random() * 0.25

    const color = new THREE.Color()
    color.setHSL(hue / 360, saturation, lightness)
    return color
  }

  private getSpeedBase(emotion: EmotionType): { x: number; y: number; z: number } {
    switch (emotion) {
      case 'joy':
        return { x: 0.3, y: 0.5, z: 0.3 }
      case 'sadness':
        return { x: 0.1, y: -1.5, z: 0.1 }
      case 'calm':
      default:
        return { x: 0.15, y: 0.1, z: 0.15 }
    }
  }

  public getCurrentEmotion(): EmotionType {
    return this.currentEmotion
  }

  public getCurrentIntensity(): number {
    return this.currentIntensity
  }
}
