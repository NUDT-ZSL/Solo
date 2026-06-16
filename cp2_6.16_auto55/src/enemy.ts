import * as THREE from 'three'
import { generateId, randomRange, randomPositionInSphere } from './utils'

export interface ExplosionParticle {
  id: string
  position: THREE.Vector3
  velocity: THREE.Vector3
  size: number
  color: string
  life: number
  maxLife: number
}

export interface Enemy {
  id: string
  position: THREE.Vector3
  hp: number
  maxHp: number
  spawnTime: number
  isExploding: boolean
  explosionParticles: ExplosionParticle[]
  radius: number
}

export function spawnEnemy(initialTime: number = 0): Enemy {
  const position = randomPositionInSphere(200)
  return {
    id: generateId(),
    position,
    hp: 100,
    maxHp: 100,
    spawnTime: initialTime,
    isExploding: false,
    explosionParticles: [],
    radius: 8,
  }
}

export function updateEnemy(
  enemy: Enemy,
  delta: number,
  currentTime: number
): { shouldRespawn: boolean } {
  if (enemy.isExploding) {
    const aliveParticles: ExplosionParticle[] = []

    for (const particle of enemy.explosionParticles) {
      particle.life -= delta
      if (particle.life > 0) {
        particle.position.add(particle.velocity.clone().multiplyScalar(delta))
        particle.velocity.multiplyScalar(0.98)
        aliveParticles.push(particle)
      }
    }

    enemy.explosionParticles = aliveParticles

    if (aliveParticles.length === 0) {
      return { shouldRespawn: true }
    }
  }

  const RESPAWN_INTERVAL = 30
  if (!enemy.isExploding && currentTime - enemy.spawnTime > RESPAWN_INTERVAL) {
    return { shouldRespawn: true }
  }

  return { shouldRespawn: false }
}

export function damageEnemy(enemy: Enemy, damage: number): boolean {
  if (enemy.isExploding) return false

  enemy.hp -= damage
  if (enemy.hp <= 0) {
    enemy.hp = 0
    enemy.isExploding = true
    enemy.explosionParticles = createExplosion(enemy.position)
    return true
  }
  return false
}

export function createExplosion(position: THREE.Vector3): ExplosionParticle[] {
  const particles: ExplosionParticle[] = []
  const count = 20

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const speed = randomRange(10, 30)

    const velocity = new THREE.Vector3(
      speed * Math.sin(phi) * Math.cos(theta),
      speed * Math.sin(phi) * Math.sin(theta),
      speed * Math.cos(phi)
    )

    const colorProgress = Math.random()
    const color = interpolateExplosionColor(colorProgress)

    particles.push({
      id: generateId(),
      position: position.clone(),
      velocity,
      size: randomRange(0.5, 1.5),
      color,
      life: 1,
      maxLife: 1,
    })
  }

  return particles
}

function interpolateExplosionColor(t: number): string {
  const startColor = { r: 1, g: 0.4, b: 0 }
  const endColor = { r: 1, g: 0, b: 0 }

  const r = Math.round((startColor.r + (endColor.r - startColor.r) * t) * 255)
  const g = Math.round((startColor.g + (endColor.g - startColor.g) * t) * 255)
  const b = Math.round((startColor.b + (endColor.b - startColor.b) * t) * 255)

  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export function getEnemyHPBar(enemy: Enemy): { hp: number; maxHp: number; percentage: number } {
  return {
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    percentage: enemy.hp / enemy.maxHp,
  }
}
