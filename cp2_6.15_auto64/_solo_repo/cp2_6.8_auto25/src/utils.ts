import { TRANSPARENT } from './palette'

export type FrameData = string[][]

export const FRAME_SIZE = 32

export function createEmptyFrame(): FrameData {
  const frame: FrameData = []
  for (let y = 0; y < FRAME_SIZE; y++) {
    const row: string[] = []
    for (let x = 0; x < FRAME_SIZE; x++) {
      row.push(TRANSPARENT)
    }
    frame.push(row)
  }
  return frame
}

export function cloneFrame(frame: FrameData): FrameData {
  return frame.map(row => [...row])
}

export function createStandingFrame(): FrameData {
  const frame = createEmptyFrame()
  const skin = '#ffccaa'
  const hair = '#5f574f'
  const shirt = '#29adff'
  const pants = '#1d2b53'
  const shoes = '#000000'
  const eye = '#000000'

  for (let x = 12; x <= 19; x++) {
    for (let y = 6; y <= 13; y++) {
      frame[y][x] = skin
    }
  }
  for (let x = 12; x <= 19; x++) {
    frame[6][x] = hair
    frame[7][x] = hair
  }
  for (let y = 6; y <= 9; y++) {
    frame[y][12] = hair
    frame[y][19] = hair
  }
  frame[10][14] = eye
  frame[10][17] = eye
  frame[12][15] = skin
  frame[12][16] = skin

  for (let x = 11; x <= 20; x++) {
    for (let y = 14; y <= 22; y++) {
      frame[y][x] = shirt
    }
  }
  for (let y = 14; y <= 20; y++) {
    frame[y][10] = skin
    frame[y][21] = skin
  }

  for (let x = 12; x <= 15; x++) {
    for (let y = 23; y <= 28; y++) {
      frame[y][x] = pants
    }
  }
  for (let x = 16; x <= 19; x++) {
    for (let y = 23; y <= 28; y++) {
      frame[y][x] = pants
    }
  }

  for (let x = 11; x <= 15; x++) {
    frame[29][x] = shoes
    frame[30][x] = shoes
  }
  for (let x = 16; x <= 20; x++) {
    frame[29][x] = shoes
    frame[30][x] = shoes
  }

  return frame
}

function createWalkFrameBase(): FrameData {
  return createStandingFrame()
}

export function createWalkFrames(): FrameData[] {
  const frame1 = createWalkFrameBase()
  const frame2 = createWalkFrameBase()
  const frame3 = createWalkFrameBase()
  const frame4 = createWalkFrameBase()

  const pants = '#1d2b53'
  const shoes = '#000000'
  const skin = '#ffccaa'
  const erase = TRANSPARENT

  for (let x = 11; x <= 15; x++) {
    frame1[29][x] = erase
    frame1[30][x] = erase
    frame1[28][x] = erase
  }
  for (let x = 10; x <= 14; x++) {
    frame1[29][x] = pants
    frame1[30][x] = shoes
  }

  for (let x = 16; x <= 20; x++) {
    frame1[29][x] = erase
    frame1[30][x] = erase
  }
  for (let x = 17; x <= 21; x++) {
    frame1[28][x] = pants
    frame1[29][x] = shoes
  }
  for (let y = 23; y <= 27; y++) {
    frame1[y][10] = skin
  }

  for (let x = 11; x <= 15; x++) {
    frame3[29][x] = erase
    frame3[30][x] = erase
  }
  for (let x = 13; x <= 17; x++) {
    frame3[28][x] = pants
    frame3[29][x] = shoes
  }
  for (let x = 16; x <= 20; x++) {
    frame3[29][x] = erase
    frame3[30][x] = erase
    frame3[28][x] = erase
  }
  for (let x = 18; x <= 22; x++) {
    frame3[29][x] = pants
    frame3[30][x] = shoes
  }
  for (let y = 23; y <= 27; y++) {
    frame3[y][22] = skin
  }

  for (let y = 14; y <= 19; y++) {
    frame2[y][9] = skin
    frame2[y][22] = erase
  }
  for (let y = 14; y <= 19; y++) {
    frame4[y][9] = erase
    frame4[y][22] = skin
  }

  return [frame1, frame2, frame3, frame4]
}

export function renderFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  frame: FrameData,
  scale: number = 1,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  for (let y = 0; y < FRAME_SIZE; y++) {
    for (let x = 0; x < FRAME_SIZE; x++) {
      const color = frame[y][x]
      if (color !== TRANSPARENT) {
        ctx.fillStyle = color
        ctx.fillRect(
          offsetX + x * scale,
          offsetY + y * scale,
          scale,
          scale
        )
      }
    }
  }
}

export function exportSpriteSheet(frames: FrameData[]): string {
  const gap = 1
  const totalWidth = frames.length * FRAME_SIZE + (frames.length - 1) * gap
  const canvas = document.createElement('canvas')
  canvas.width = totalWidth
  canvas.height = FRAME_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.clearRect(0, 0, totalWidth, FRAME_SIZE)

  frames.forEach((frame, index) => {
    const offsetX = index * (FRAME_SIZE + gap)
    renderFrameToCanvas(ctx, frame, 1, offsetX, 0)
  })

  return canvas.toDataURL('image/png')
}

export function downloadSpriteSheet(frames: FrameData[], filename: string = 'spritesheet.png'): void {
  const dataUrl = exportSpriteSheet(frames)
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function generateCSSCode(frames: FrameData[], frameDuration: number): string {
  const gap = 1
  const frameCount = frames.length
  const totalWidth = frameCount * FRAME_SIZE + (frameCount - 1) * gap
  const stepWidth = FRAME_SIZE + gap
  const totalDuration = frameCount * frameDuration

  let keyframes = ''
  frames.forEach((_, index) => {
    const percent = (index / frameCount) * 100
    const xOffset = -index * stepWidth
    keyframes += `  ${percent.toFixed(2)}% { background-position: ${xOffset}px 0; }\n`
  })
  keyframes += `  100% { background-position: 0 0; }`

  return `.sprite-animation {
  width: ${FRAME_SIZE}px;
  height: ${FRAME_SIZE}px;
  background-image: url('spritesheet.png');
  background-repeat: no-repeat;
  animation: sprite-play ${totalDuration}ms steps(${frameCount}) infinite;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

@keyframes sprite-play {
${keyframes}
}`
}
