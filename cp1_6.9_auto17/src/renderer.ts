// 潮汐碑文·遗迹解谜 - Canvas渲染模块
// 数据流向: 接收 game.ts 传入的 entities 数据 -> 绘制到 Canvas 2D context

import {
  GlyphStone, EnergyLink, TidalLevel, Particle, GlyphType,
  STONE_SIZE_W, STONE_SIZE_H, GRID_GAP, GRID_COLS, GRID_ROWS,
  easeInOutCubic, getGlyphColorByTide, getStoneHitBox,
} from './entities'

export interface RenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  timeMs: number
}

export function clearBackground(rc: RenderContext): void {
  const { ctx, width, height } = rc
  const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height))
  grad.addColorStop(0, '#0D1B2A')
  grad.addColorStop(1, '#050a14')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)
}

export function drawSeabed(rc: RenderContext): void {
  const { ctx, width, height } = rc
  const groundY = height * 0.75
  ctx.fillStyle = '#1B2838'
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  for (let x = 0; x <= width; x += 20) {
    const y = groundY + Math.sin(x * 0.02 + rc.timeMs * 0.0003) * 4
    ctx.lineTo(x, y)
  }
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()
}

export function drawGrid(rc: RenderContext, originX: number, originY: number): void {
  const { ctx } = rc
  const totalW = GRID_COLS * STONE_SIZE_W + (GRID_COLS - 1) * GRID_GAP
  const totalH = GRID_ROWS * STONE_SIZE_H + (GRID_ROWS - 1) * GRID_GAP
  ctx.save()
  ctx.strokeStyle = 'rgba(77, 182, 172, 0.2)'
  ctx.lineWidth = 1
  for (let c = 0; c <= GRID_COLS; c++) {
    const x = originX + c * (STONE_SIZE_W + GRID_GAP) - GRID_GAP / 2
    ctx.beginPath()
    ctx.moveTo(x, originY - GRID_GAP / 2)
    ctx.lineTo(x, originY + totalH + GRID_GAP / 2)
    ctx.stroke()
  }
  for (let r = 0; r <= GRID_ROWS; r++) {
    const y = originY + r * (STONE_SIZE_H + GRID_GAP) - GRID_GAP / 2
    ctx.beginPath()
    ctx.moveTo(originX - GRID_GAP / 2, y)
    ctx.lineTo(originX + totalW + GRID_GAP / 2, y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawGlyph(ctx: CanvasRenderingContext2D, type: GlyphType, cx: number, cy: number, size: number, color: string): void {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 3
  ctx.shadowColor = color
  ctx.shadowBlur = 15
  switch (type) {
    case 'wave': {
      ctx.beginPath()
      for (let i = 0; i <= 60; i++) {
        const t = i / 60
        const x = cx - size / 2 + t * size
        const y = cy + Math.sin(t * Math.PI * 3) * size * 0.18
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.beginPath()
      for (let i = 0; i <= 60; i++) {
        const t = i / 60
        const x = cx - size / 2 + t * size
        const y = cy + 8 + Math.sin(t * Math.PI * 3 + 1) * size * 0.18
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
      break
    }
    case 'lightning': {
      ctx.beginPath()
      ctx.moveTo(cx - size * 0.1, cy - size * 0.4)
      ctx.lineTo(cx - size * 0.12, cy - size * 0.05)
      ctx.lineTo(cx + size * 0.15, cy - size * 0.05)
      ctx.lineTo(cx + size * 0.1, cy + size * 0.4)
      ctx.lineTo(cx + size * 0.12, cy + size * 0.05)
      ctx.lineTo(cx - size * 0.15, cy + size * 0.05)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'spiral': {
      ctx.beginPath()
      for (let a = 0; a <= Math.PI * 4; a += 0.1) {
        const r = (a / (Math.PI * 4)) * size * 0.35
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
      break
    }
    case 'star': {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? size * 0.4 : size * 0.18
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      break
    }
  }
  ctx.restore()
}

export function drawStones(
  rc: RenderContext, stones: GlyphStone[][], originX: number, originY: number, tidal: TidalLevel,
): void {
  const { ctx, timeMs } = rc
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const stone = stones[r][c]
      const box = getStoneHitBox(stone, originX, originY)
      const cx = box.x + box.w / 2
      const cy = box.y + box.h / 2
      const flipT = stone.isFlipping ? easeInOutCubic(stone.flipProgress) : 0
      const rotY = flipT * Math.PI * stone.flipDirection
      const cosY = Math.cos(rotY)
      const scaleX = Math.abs(cosY)
      const switchFace = stone.isFlipping && stone.flipProgress > 0.5
      const displayedFaceIdx = switchFace ? (stone.currentFace + 2) % 4 : stone.currentFace
      const glyph = stone.faces[displayedFaceIdx]
      const glyphColor = getGlyphColorByTide(tidal.progress, glyph.type)
      const dimFactor = stone.locked ? 0.4 : 1
      if (!stone.locked && !stone.isFlipping) {
        stone.breathPhase += 0.003
        const breathAlpha = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(stone.breathPhase))
        ctx.save()
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(box.w, box.h) * 0.8)
        grad.addColorStop(0, `rgba(79, 195, 247, ${breathAlpha})`)
        grad.addColorStop(1, 'rgba(79, 195, 247, 0)')
        ctx.fillStyle = grad
        ctx.fillRect(box.x - 20, box.y - 20, box.w + 40, box.h + 40)
        ctx.restore()
      }
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(scaleX, 1)
      ctx.translate(-cx, -cy)
      const depth = Math.sin(rotY) * 10
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetY = 6
      const baseColor = stone.locked ? '#1a2030' : '#2B3A4F'
      const borderColor = stone.locked ? '#0d1525' : '#3E536D'
      const r1 = 10
      ctx.fillStyle = baseColor
      roundRect(ctx, box.x + depth, box.y, box.w, box.h, r1)
      ctx.fill()
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 2
      roundRect(ctx, box.x + depth, box.y, box.w, box.h, r1)
      ctx.stroke()
      const innerPad = 8
      ctx.fillStyle = stone.locked ? '#121a2a' : '#1f2e42'
      roundRect(ctx, box.x + innerPad + depth, box.y + innerPad, box.w - innerPad * 2, box.h - innerPad * 2, 6)
      ctx.fill()
      ctx.globalAlpha = dimFactor
      drawGlyph(ctx, glyph.type, cx + depth, cy, 50 * dimFactor, glyphColor)
      ctx.globalAlpha = 1
      if (stone.locked) {
        const wavePhase = timeMs * 0.0015
        ctx.save()
        ctx.globalAlpha = 0.6
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)'
        ctx.lineWidth = 1.2
        for (let w = 0; w < 3; w++) {
          ctx.beginPath()
          const baseY = box.y + 20 + w * (box.h - 40) / 2
          for (let x = 0; x <= 30; x++) {
            const t = x / 30
            const px = box.x + t * box.w + depth
            const py = baseY + Math.sin(t * Math.PI * 4 + wavePhase + w) * 3
            if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
          }
          ctx.stroke()
        }
        ctx.restore()
      }
      ctx.restore()
      if (stone.locked) {
        ctx.save()
        ctx.fillStyle = 'rgba(30,50,80,0.4)'
        roundRect(ctx, box.x, box.y, box.w, box.h, r1)
        ctx.fill()
        ctx.restore()
      }
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function drawTidalWater(rc: RenderContext, tidal: TidalLevel): void {
  const { ctx, width, height, timeMs } = rc
  const alpha = 0.1 + tidal.progress * 0.6
  const waterY = height * (1 - tidal.progress * 0.85)
  const grad = ctx.createLinearGradient(0, waterY, 0, height)
  grad.addColorStop(0, `rgba(79, 195, 247, ${alpha * 0.6})`)
  grad.addColorStop(0.5, `rgba(26, 35, 126, ${alpha})`)
  grad.addColorStop(1, `rgba(13, 27, 42, ${alpha})`)
  ctx.save()
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(0, waterY)
  for (let x = 0; x <= width; x += 8) {
    const y = waterY + Math.sin(x * 0.02 + timeMs * 0.002) * 3 + Math.sin(x * 0.06 + timeMs * 0.003) * 1.5
    ctx.lineTo(x, y)
  }
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function drawEnergyLinks(
  rc: RenderContext, links: EnergyLink[], originX: number, originY: number, tidal: TidalLevel,
): void {
  const { ctx, timeMs } = rc
  for (const link of links) {
    const b1 = getStoneHitBox({ row: link.row1, col: link.col1 } as GlyphStone, originX, originY)
    const b2 = getStoneHitBox({ row: link.row2, col: link.col2 } as GlyphStone, originX, originY)
    const x1 = b1.x + b1.w / 2
    const y1 = b1.y + b1.h / 2
    const x2 = b2.x + b2.w / 2
    const y2 = b2.y + b2.h / 2
    const pulse = 0.5 + 0.5 * Math.sin(timeMs * 0.00314 + link.pulsePhase)
    const color = getGlyphColorByTide(tidal.progress, link.glyphType)
    ctx.save()
    ctx.strokeStyle = color
    ctx.shadowColor = '#FFD54F'
    ctx.shadowBlur = 10 + pulse * 15
    ctx.lineWidth = 4 + pulse * 2
    ctx.globalAlpha = 0.8 + pulse * 0.2
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const curl = Math.sin(timeMs * 0.004) * 4
    ctx.quadraticCurveTo(mx, my + curl, x2, y2)
    ctx.stroke()
    ctx.globalAlpha = 0.3 + pulse * 0.3
    ctx.lineWidth = 10
    ctx.strokeStyle = '#FFD54F'
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(mx, my + curl, x2, y2)
    ctx.stroke()
    for (let i = 0; i < 2; i++) {
      const t = (timeMs * 0.0003 + i * 0.5) % 1
      const glowR = 6 + pulse * 3
      const gx = x1 + (x2 - x1) * t
      const gy = y1 + (y2 - y1) * t
      ctx.beginPath()
      ctx.fillStyle = '#FFFFFF'
      ctx.shadowColor = '#FFD54F'
      ctx.shadowBlur = 18
      ctx.arc(gx, gy, glowR, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

export function drawParticles(rc: RenderContext, particles: Particle[]): void {
  const { ctx } = rc
  for (const p of particles) {
    const t = p.life / p.maxLife
    ctx.save()
    ctx.globalAlpha = Math.max(0, t)
    ctx.fillStyle = p.color
    ctx.shadowColor = p.color
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius * (0.5 + t * 0.5), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export function drawPortal(
  rc: RenderContext, cx: number, cy: number, open: boolean, animTime: number,
): { radialBlur: boolean } {
  const { ctx, timeMs } = rc
  const fadeIn = Math.min(animTime / 2000, 1)
  ctx.save()
  if (open) {
    const r = 75 * (0.8 + 0.2 * Math.sin(timeMs * 0.003))
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    grad.addColorStop(0, `rgba(206, 147, 216, ${0.95 * fadeIn})`)
    grad.addColorStop(0.5, `rgba(171, 71, 188, ${0.6 * fadeIn})`)
    grad.addColorStop(1, 'rgba(206, 147, 216, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * fadeIn})`
    ctx.lineWidth = 2
    ctx.shadowColor = '#CE93D8'
    ctx.shadowBlur = 25
    for (let ring = 0; ring < 3; ring++) {
      const rr = 30 + ring * 25 + Math.sin(timeMs * 0.002 + ring) * 5
      ctx.globalAlpha = (0.5 - ring * 0.15) * fadeIn
      ctx.beginPath()
      ctx.arc(cx, cy, rr, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    for (let i = 0; i < 12; i++) {
      const a = timeMs * 0.001 + (i * Math.PI * 2) / 12
      const rr = 60 + Math.sin(timeMs * 0.003 + i) * 8
      const px = cx + Math.cos(a) * rr
      const py = cy + Math.sin(a) * rr
      ctx.fillStyle = '#E1BEE7'
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
  return { radialBlur: animTime > 0 && animTime < 500 }
}
