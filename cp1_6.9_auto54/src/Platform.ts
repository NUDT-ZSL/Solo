export interface PlatformCell {
  id: string
  col: number
  row: number
  baseX: number
  baseY: number
  x: number
  y: number
  radius: number
  baseColor: string
  currentColor: string
  targetColor: string
  colorTransition: number
  colorChanging: boolean
  colorChangeTime: number
  visible: boolean
  disappearTime: number
  reappearTime: number
  isUnstable: boolean
  destroyed: boolean
}

const COLS = 6
const ROWS = 5
const HEX_RADIUS = 15
const HEX_SPACING_X = 20 + HEX_RADIUS * 2
const HEX_SPACING_Y = 20 + HEX_RADIUS * Math.sqrt(3)
const SCROLL_SPEED = 0.5
const COLOR_CHANGE_INTERVAL = 2.0
const COLOR_CHANGE_DURATION = 1.5
const COLOR_TRANSITION_TIME = 0.3
const DISAPPEAR_INTERVAL = 3.0
const DISAPPEAR_DURATION = 0.8
const BASE_COLOR = '#4A90E2'
const UNSTABLE_COLOR = '#FF0040'

function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)
  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function randomCyanMagentaColor(): string {
  const hue = Math.random() * 60 + 180
  const r = Math.round(Math.max(0, Math.min(255, 255 * Math.abs(Math.sin(hue * Math.PI / 180 + Math.PI / 2)))))
  const g = Math.round(Math.max(0, Math.min(255, 128 + 127 * Math.sin(hue * Math.PI / 180))))
  const b = Math.round(Math.max(0, Math.min(255, 255 * Math.abs(Math.sin(hue * Math.PI / 180)))))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export class PlatformSystem {
  cells: PlatformCell[] = []
  private canvasWidth: number
  private canvasHeight: number
  private scrollY: number = 0
  private colorChangeTimer: number = 0
  private disappearTimer: number = 0
  private gridWidth: number = 0
  public destroyedCells: Map<string, number> = new Map()

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.gridWidth = COLS * HEX_SPACING_X - HEX_SPACING_X + HEX_RADIUS * 2
    this.generateGrid()
  }

  private generateGrid() {
    this.cells = []
    const startX = (this.canvasWidth - this.gridWidth) / 2 + HEX_RADIUS
    const startY = 30

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const offsetX = row % 2 === 0 ? 0 : HEX_SPACING_X / 2
        const baseX = startX + col * HEX_SPACING_X + offsetX
        const baseY = startY + row * HEX_SPACING_Y
        const isUnstable = Math.random() < 0.12

        this.cells.push({
          id: `${col}-${row}`,
          col,
          row,
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          radius: HEX_RADIUS,
          baseColor: isUnstable ? UNSTABLE_COLOR : BASE_COLOR,
          currentColor: isUnstable ? UNSTABLE_COLOR : BASE_COLOR,
          targetColor: isUnstable ? UNSTABLE_COLOR : BASE_COLOR,
          colorTransition: 1,
          colorChanging: false,
          colorChangeTime: 0,
          visible: true,
          disappearTime: 0,
          reappearTime: 0,
          isUnstable,
          destroyed: false
        })
      }
    }
  }

  reset() {
    this.scrollY = 0
    this.colorChangeTimer = 0
    this.disappearTimer = 0
    this.destroyedCells.clear()
    this.generateGrid()
  }

  resize(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.gridWidth = COLS * HEX_SPACING_X - HEX_SPACING_X + HEX_RADIUS * 2
  }

  getScrollSpeed(): number {
    return SCROLL_SPEED
  }

  getHexTopY(cell: PlatformCell): number {
    return cell.y - cell.radius * Math.sqrt(3) / 2
  }

  getHexBottomY(cell: PlatformCell): number {
    return cell.y + cell.radius * Math.sqrt(3) / 2
  }

  checkCollision(px: number, py: number, pw: number, ph: number): {
    landedY: number | null
    hitCell: PlatformCell | null
    hitUnstable: boolean
  } {
    let landedY: number | null = null
    let hitCell: PlatformCell | null = null
    let hitUnstable = false

    const catLeft = px - pw / 2
    const catRight = px + pw / 2
    const catBottom = py + ph / 2

    for (const cell of this.cells) {
      if (!cell.visible || cell.destroyed) continue

      const leftBound = cell.x - cell.radius * 0.85
      const rightBound = cell.x + cell.radius * 0.85
      const topBound = this.getHexTopY(cell)
      const bottomBound = this.getHexBottomY(cell)

      if (catRight > leftBound && catLeft < rightBound) {
        if (catBottom >= topBound - 3 && catBottom <= bottomBound) {
          if (landedY === null || topBound < landedY) {
            landedY = topBound
            hitCell = cell
            hitUnstable = cell.isUnstable
          }
        }
      }
    }

    return { landedY, hitCell, hitUnstable }
  }

  destroyCell(cell: PlatformCell) {
    cell.destroyed = true
    this.destroyedCells.set(cell.id, 0.5)
  }

  update(dt: number): { scrolledAmount: number; colorChangedCells: PlatformCell[]; landedSplash: { cell: PlatformCell; frame: number } | null } {
    this.scrollY += SCROLL_SPEED * dt * 60
    const scrolledAmount = SCROLL_SPEED * dt * 60

    let colorChangedCells: PlatformCell[] = []
    let landedSplash: { cell: PlatformCell; frame: number } | null = null

    this.colorChangeTimer += dt
    if (this.colorChangeTimer >= COLOR_CHANGE_INTERVAL) {
      this.colorChangeTimer = 0
      const count = Math.floor(Math.random() * 3) + 3
      const availableCells = this.cells.filter(c => !c.isUnstable && !c.colorChanging && c.visible)
      const shuffled = availableCells.sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, Math.min(count, shuffled.length))

      for (const cell of selected) {
        cell.colorChanging = true
        cell.colorChangeTime = COLOR_CHANGE_DURATION
        cell.targetColor = randomCyanMagentaColor()
        cell.colorTransition = 0
        colorChangedCells.push(cell)
      }
    }

    this.disappearTimer += dt
    if (this.disappearTimer >= DISAPPEAR_INTERVAL) {
      this.disappearTimer = 0
      const count = 2
      const availableCells = this.cells.filter(c => c.visible && c.disappearTime <= 0 && !c.destroyed)
      const shuffled = availableCells.sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, Math.min(count, shuffled.length))

      for (const cell of selected) {
        cell.visible = false
        cell.disappearTime = DISAPPEAR_DURATION
      }
    }

    for (const cell of this.cells) {
      cell.y += scrolledAmount

      if (cell.colorChanging) {
        cell.colorChangeTime -= dt

        if (cell.colorChangeTime > COLOR_CHANGE_DURATION - COLOR_TRANSITION_TIME) {
          const t = 1 - (cell.colorChangeTime - (COLOR_CHANGE_DURATION - COLOR_TRANSITION_TIME)) / COLOR_TRANSITION_TIME
          cell.colorTransition = Math.min(1, t)
          cell.currentColor = lerpColor(cell.baseColor, cell.targetColor, cell.colorTransition)
        } else if (cell.colorChangeTime < COLOR_TRANSITION_TIME) {
          const t = cell.colorChangeTime / COLOR_TRANSITION_TIME
          cell.colorTransition = t
          cell.currentColor = lerpColor(cell.baseColor, cell.targetColor, t)
        } else {
          cell.colorTransition = 1
          cell.currentColor = cell.targetColor
        }

        if (cell.colorChangeTime <= 0) {
          cell.colorChanging = false
          cell.currentColor = cell.baseColor
          cell.colorTransition = 1
        }
      }

      if (!cell.visible && cell.disappearTime > 0) {
        cell.disappearTime -= dt
        if (cell.disappearTime <= 0) {
          cell.visible = true
        }
      }

      if (cell.destroyed) {
        const t = this.destroyedCells.get(cell.id)
        if (t !== undefined) {
          const nt = t - dt
          if (nt <= 0) {
            this.destroyedCells.delete(cell.id)
            cell.destroyed = false
            cell.visible = true
          } else {
            this.destroyedCells.set(cell.id, nt)
          }
        }
      }

      if (cell.y > this.canvasHeight + HEX_RADIUS * 2) {
        cell.row -= ROWS
        cell.y -= ROWS * HEX_SPACING_Y
        cell.destroyed = false
        cell.visible = true
        cell.isUnstable = Math.random() < 0.12
        cell.baseColor = cell.isUnstable ? UNSTABLE_COLOR : BASE_COLOR
        cell.currentColor = cell.baseColor
        cell.targetColor = cell.baseColor
        cell.colorChanging = false
      }
    }

    return { scrolledAmount, colorChangedCells, landedSplash }
  }
}
