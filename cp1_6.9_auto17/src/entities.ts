// 潮汐碑文·遗迹解谜 - 实体定义模块
// 数据流向: game.ts 调用创建实体并传递事件 -> 触发后反馈链接状态

export type GlyphType = 'wave' | 'lightning' | 'spiral' | 'star'

export type TidalPhase = 'flood' | 'ebb'

export interface TidalLevel {
  progress: number
  phase: TidalPhase
  elapsedMs: number
}

export interface Glyph {
  type: GlyphType
  baseColor: string
}

export interface GlyphStone {
  row: number
  col: number
  currentFace: number
  faces: Glyph[]
  isFlipping: boolean
  flipProgress: number
  flipDirection: 1 | -1
  locked: boolean
  breathPhase: number
}

export interface EnergyLink {
  row1: number
  col1: number
  row2: number
  col2: number
  pulsePhase: number
  glyphType: GlyphType
}

export type ParticleType = 'flip' | 'aura' | 'portal' | 'water'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  radius: number
  color: string
  type: ParticleType
  angle?: number
}

export interface PortalAura {
  active: boolean
  startTime: number
  particles: Particle[]
}

export const FLOOD_DURATION = 30000
export const EBB_DURATION = 10000
export const OPERABLE_THRESHOLD = 0.5
export const FLIP_DURATION = 800
export const STONE_SIZE_W = 120
export const STONE_SIZE_H = 160
export const GRID_GAP = 20
export const GRID_COLS = 3
export const GRID_ROWS = 3
export const WIN_LINK_COUNT = 6
export const MAX_PARTICLES = 100

export const GLYPH_TYPES: GlyphType[] = ['wave', 'lightning', 'spiral', 'star']

function randInt(max: number): number {
  return Math.floor(Math.random() * max)
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r},${g},${b})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

export function getGlyphColorByTide(tidalProgress: number, baseType: GlyphType): string {
  const lowTideColors: Record<GlyphType, string> = {
    wave: '#4DD0E1',
    lightning: '#7C4DFF',
    spiral: '#40C4FF',
    star: '#B388FF',
  }
  const highTideColors: Record<GlyphType, string> = {
    wave: '#FF8A65',
    lightning: '#FF5252',
    spiral: '#FFB74D',
    star: '#FF7043',
  }
  return lerpColor(lowTideColors[baseType], highTideColors[baseType], tidalProgress)
}

export function createTidalLevel(): TidalLevel {
  return {
    progress: 0,
    phase: 'flood',
    elapsedMs: 0,
  }
}

export function updateTidalLevel(tidal: TidalLevel, deltaMs: number): void {
  tidal.elapsedMs += deltaMs
  const duration = tidal.phase === 'flood' ? FLOOD_DURATION : EBB_DURATION
  const rawProgress = tidal.elapsedMs / duration
  if (rawProgress >= 1) {
    tidal.phase = tidal.phase === 'flood' ? 'ebb' : 'flood'
    tidal.elapsedMs = 0
    tidal.progress = tidal.phase === 'flood' ? 0 : 1
  } else {
    tidal.progress = tidal.phase === 'flood' ? rawProgress : 1 - rawProgress
  }
}

function randomGlyph(): Glyph {
  const type = GLYPH_TYPES[randInt(GLYPH_TYPES.length)]
  return { type, baseColor: type }
}

export function createGlyphStone(row: number, col: number): GlyphStone {
  const faces: Glyph[] = []
  for (let i = 0; i < 4; i++) faces.push(randomGlyph())
  return {
    row,
    col,
    currentFace: randInt(4),
    faces,
    isFlipping: false,
    flipProgress: 0,
    flipDirection: 1,
    locked: false,
    breathPhase: Math.random() * Math.PI * 2,
  }
}

export function createStonesGrid(): GlyphStone[][] {
  const grid: GlyphStone[][] = []
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: GlyphStone[] = []
    for (let c = 0; c < GRID_COLS; c++) row.push(createGlyphStone(r, c))
    grid.push(row)
  }
  return grid
}

export function isStoneOperable(stone: GlyphStone, tidalProgress: number): boolean {
  return tidalProgress < OPERABLE_THRESHOLD && !stone.isFlipping
}

export function flipStone(stone: GlyphStone): boolean {
  if (stone.isFlipping) return false
  stone.isFlipping = true
  stone.flipProgress = 0
  stone.flipDirection = Math.random() > 0.5 ? 1 : -1
  return true
}

export function updateStoneFlip(stone: GlyphStone, deltaMs: number): boolean {
  if (!stone.isFlipping) return false
  stone.flipProgress += deltaMs / FLIP_DURATION
  if (stone.flipProgress >= 1) {
    stone.flipProgress = 0
    stone.isFlipping = false
    stone.currentFace = (stone.currentFace + 2) % 4
    return true
  }
  return false
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function updateStonesLock(stones: GlyphStone[][], tidalProgress: number): void {
  const locked = tidalProgress >= OPERABLE_THRESHOLD
  for (const row of stones) {
    for (const s of row) s.locked = locked
  }
}

export interface HitBox {
  x: number
  y: number
  w: number
  h: number
}

export function getStoneHitBox(
  stone: GlyphStone,
  originX: number,
  originY: number,
): HitBox {
  return {
    x: originX + stone.col * (STONE_SIZE_W + GRID_GAP),
    y: originY + stone.row * (STONE_SIZE_H + GRID_GAP),
    w: STONE_SIZE_W,
    h: STONE_SIZE_H,
  }
}

export function pointInRect(px: number, py: number, box: HitBox): boolean {
  return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h
}

export function pickStoneAt(
  px: number,
  py: number,
  stones: GlyphStone[][],
  originX: number,
  originY: number,
): GlyphStone | null {
  for (let r = GRID_ROWS - 1; r >= 0; r--) {
    for (let c = GRID_COLS - 1; c >= 0; c--) {
      if (pointInRect(px, py, getStoneHitBox(stones[r][c], originX, originY))) {
        return stones[r][c]
      }
    }
  }
  return null
}

function glyphsMatch(a: Glyph, b: Glyph): boolean {
  return a.type === b.type
}

function linkExists(
  links: EnergyLink[],
  r1: number, c1: number, r2: number, c2: number,
): boolean {
  return links.some(l =>
    (l.row1 === r1 && l.col1 === c1 && l.row2 === r2 && l.col2 === c2) ||
    (l.row1 === r2 && l.col1 === c2 && l.row2 === r1 && l.col2 === c1),
  )
}

export function recomputeEnergyLinks(stones: GlyphStone[][]): EnergyLink[] {
  const links: EnergyLink[] = []
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const s1 = stones[r][c]
      const g1 = s1.faces[s1.currentFace]
      if (c + 1 < GRID_COLS) {
        const s2 = stones[r][c + 1]
        const g2 = s2.faces[s2.currentFace]
        if (glyphsMatch(g1, g2) && !linkExists(links, r, c, r, c + 1)) {
          links.push({ row1: r, col1: c, row2: r, col2: c + 1, pulsePhase: Math.random() * Math.PI * 2, glyphType: g1.type })
        }
      }
      if (r + 1 < GRID_ROWS) {
        const s2 = stones[r + 1][c]
        const g2 = s2.faces[s2.currentFace]
        if (glyphsMatch(g1, g2) && !linkExists(links, r, c, r + 1, c)) {
          links.push({ row1: r, col1: c, row2: r + 1, col2: c, pulsePhase: Math.random() * Math.PI * 2, glyphType: g1.type })
        }
      }
    }
  }
  return links
}

export function createFlipParticles(cx: number, cy: number): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8
    const speed = 30 + Math.random() * 30
    out.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 500, maxLife: 500,
      radius: 2 + Math.random() * 2,
      color: '#4FC3F7',
      type: 'flip',
    })
  }
  return out
}

export function updateParticles(particles: Particle[], deltaMs: number, limit: number = MAX_PARTICLES): void {
  const dt = deltaMs / 1000
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= deltaMs
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 0.96
    p.vy *= 0.96
    if (p.life <= 0) particles.splice(i, 1)
  }
  if (particles.length > limit) particles.splice(0, particles.length - limit)
}

export function createPortalAuraParticles(cx: number, cy: number, t: number): Particle[] {
  const progress = Math.min(t / 3000, 1)
  const out: Particle[] = []
  const count = 20
  const currentRadius = 50 + (200 - 50) * progress
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (t / 1000) * 2
    out.push({
      x: cx + Math.cos(angle) * currentRadius,
      y: cy + Math.sin(angle) * currentRadius,
      vx: 0, vy: 0,
      life: 100, maxLife: 100,
      radius: 3 + Math.random() * 3,
      color: '#CE93D8',
      type: 'portal',
      angle,
    })
  }
  return out
}
