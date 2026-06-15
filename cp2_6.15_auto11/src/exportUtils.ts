import { saveAs } from 'file-saver'
import { audioProcessor } from './audioProcessor'

export type ExportFormat = 'video' | 'gif'
export type ExportDuration = 10 | 30 | 60 | 'full'

export interface ExportOptions {
  format: ExportFormat
  duration: ExportDuration
  onProgress?: (progress: number) => void
  onComplete?: (blob: Blob) => void
  onStart?: () => void
  onFrame?: (canvas: HTMLCanvasElement, time: number) => void
}

interface RecordingState {
  isRecording: boolean
  mediaRecorder: MediaRecorder | null
  recordedChunks: Blob[]
  startTime: number
  targetDuration: number
  animationFrame: number | null
  canvasStream: MediaStream | null
  audioStream: MediaStream | null
  combinedStream: MediaStream | null
  currentTime: number
}

class ExportManager {
  private state: RecordingState = {
    isRecording: false,
    mediaRecorder: null,
    recordedChunks: [],
    startTime: 0,
    targetDuration: 0,
    animationFrame: null,
    canvasStream: null,
    audioStream: null,
    combinedStream: null,
    currentTime: 0,
  }

  private _options: ExportOptions | null = null // preserved for future extensions

  get isRecording(): boolean {
    return this.state.isRecording
  }

  get currentTime(): number {
    return this.state.currentTime
  }

  async startExport(
    canvas: HTMLCanvasElement,
    options: ExportOptions
  ): Promise<void> {
    if (this.state.isRecording) return

    this._options = options
    options.onStart?.()

    const totalDuration = audioProcessor.getDuration()
    let targetDuration: number
    if (options.duration === 'full') {
      targetDuration = totalDuration
    } else {
      targetDuration = Math.min(options.duration, totalDuration)
    }

    this.state.targetDuration = targetDuration
    this.state.recordedChunks = []
    this.state.currentTime = 0

    if (options.format === 'video') {
      await this.startVideoExport(canvas, targetDuration, options)
    } else {
      await this.startGifExport(canvas, targetDuration, options)
    }
  }

  private async startVideoExport(
    canvas: HTMLCanvasElement,
    targetDuration: number,
    options: ExportOptions
  ): Promise<void> {
    try {
      const canvasStream = canvas.captureStream(60)
      this.state.canvasStream = canvasStream

      let combinedStream = canvasStream
      const audioCtx = audioProcessor.getAudioContext()
      const processorStream = audioProcessor.getMediaStream()

      if (audioCtx && processorStream && processorStream.getAudioTracks().length > 0) {
        this.state.audioStream = processorStream
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...processorStream.getAudioTracks(),
        ])
      } else if (audioCtx) {
        try {
          const dest = audioCtx.createMediaStreamDestination()
          this.state.audioStream = dest.stream
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ])
        } catch {
          // silent fail
        }
      }
      this.state.combinedStream = combinedStream

      const mimeType = this.getSupportedMimeType()

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 8000000,
      })

      this.state.mediaRecorder = mediaRecorder
      this.state.recordedChunks = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.state.recordedChunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(this.state.recordedChunks, { type: 'video/webm' })
        this.cleanup()
        this.downloadFile(blob, 'particle-animation.webm')
        options.onComplete?.(blob)
      }

      mediaRecorder.start(100)
      this.state.isRecording = true
      this.state.startTime = performance.now()

      audioProcessor.seek(0)
      await audioProcessor.play()

      this.startVideoProgressLoop(canvas, targetDuration, options)
    } catch (e) {
      console.error('Failed to start video recording:', e)
      await this.startGifExport(canvas, targetDuration, options)
    }
  }

  private startVideoProgressLoop(
    canvas: HTMLCanvasElement,
    targetDuration: number,
    options: ExportOptions
  ): void {
    const loop = () => {
      if (!this.state.isRecording) return

      const elapsed = (performance.now() - this.state.startTime) / 1000
      const progress = Math.min(elapsed / targetDuration, 1)
      this.state.currentTime = elapsed

      options.onFrame?.(canvas, elapsed)
      options.onProgress?.(progress)

      if (elapsed >= targetDuration) {
        this.stopExport()
        return
      }

      this.state.animationFrame = requestAnimationFrame(loop)
    }

    this.state.animationFrame = requestAnimationFrame(loop)
  }

  private async startGifExport(
    canvas: HTMLCanvasElement,
    targetDuration: number,
    options: ExportOptions
  ): Promise<void> {
    this.state.isRecording = true

    const originalWidth = canvas.width
    const originalHeight = canvas.height
    const width = 640
    const height = Math.floor((originalHeight / originalWidth) * width)
    const fps = 12
    const totalFrames = Math.floor(targetDuration * fps)
    const frameDelay = Math.round(100 / fps)

    const playbackStartTime = audioProcessor.getCurrentTime()
    audioProcessor.pause()

    const frames: ImageData[] = []
    const offscreen = document.createElement('canvas')
    offscreen.width = width
    offscreen.height = height
    const ctx = offscreen.getContext('2d')!

    for (let i = 0; i < totalFrames; i++) {
      const time = (i / fps)
      audioProcessor.seek(time)
      audioProcessor.getSpectrumAtTime(time)

      await new Promise(r => setTimeout(r, 16))

      ctx.drawImage(canvas, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)
      frames.push(imageData)

      this.state.currentTime = time
      options.onFrame?.(canvas, time)
      options.onProgress?.(i / totalFrames * 0.8)
    }

    audioProcessor.seek(playbackStartTime)

    options.onProgress?.(0.85)
    const gifBlob = await this.encodeGif(frames, width, height, frameDelay, (p) => {
      options.onProgress?.(0.85 + p * 0.15)
    })

    this.cleanup()
    this.downloadFile(gifBlob, 'particle-animation.gif')
    options.onComplete?.(gifBlob)
    this.state.isRecording = false
  }

  private encodeGif(
    frames: ImageData[],
    width: number,
    height: number,
    delay: number,
    onProgress: (progress: number) => void
  ): Promise<Blob> {
    return new Promise((resolve) => {
      const palette = this.buildPalette(frames)
      const quantizedFrames = frames.map((f, i) => {
        onProgress(i / frames.length * 0.5)
        return this.quantizeImage(f.data, width, height, palette)
      })

      const gifData = this.buildGifData(quantizedFrames, width, height, delay, palette, (p) => {
        onProgress(0.5 + p * 0.5)
      })

      resolve(new Blob([gifData as unknown as ArrayBuffer], { type: 'image/gif' }))
    })
  }

  private buildPalette(frames: ImageData[]): number[][] {
    const colorCount = new Map<number, number>()

    for (const frame of frames) {
      const data = frame.data
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i] >> 3 << 3
        const g = data[i + 1] >> 3 << 3
        const b = data[i + 2] >> 3 << 3
        const key = (r << 16) | (g << 8) | b
        colorCount.set(key, (colorCount.get(key) || 0) + 1)
      }
    }

    const sorted = Array.from(colorCount.entries()).sort((a, b) => b[1] - a[1])
    const palette: number[][] = []

    for (let i = 0; i < 256 && i < sorted.length; i++) {
      const key = sorted[i][0]
      palette.push([(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff])
    }

    while (palette.length < 256) {
      palette.push([0, 0, 0])
    }

    return palette
  }

  private quantizeImage(
    data: Uint8ClampedArray,
    _width: number,
    _height: number,
    palette: number[][]
  ): Uint8Array {
    const result = new Uint8Array(data.length / 4)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      let bestIdx = 0
      let bestDist = Infinity

      for (let p = 0; p < palette.length; p++) {
        const dr = r - palette[p][0]
        const dg = g - palette[p][1]
        const db = b - palette[p][2]
        const dist = dr * dr + dg * dg + db * db
        if (dist < bestDist) {
          bestDist = dist
          bestIdx = p
        }
      }
      result[i / 4] = bestIdx
    }
    return result
  }

  private buildGifData(
    frames: Uint8Array[],
    width: number,
    height: number,
    delay: number,
    palette: number[][],
    _onProgress: (progress: number) => void
  ): Uint8Array {
    const chunks: number[] = []
    const delayCs = Math.round(delay / 10)

    const writeWord = (val: number) => {
      chunks.push(val & 0xff)
      chunks.push((val >> 8) & 0xff)
    }

    const writeBytes = (bytes: Uint8Array | number[]) => {
      for (let i = 0; i < bytes.length; i++) {
        chunks.push(bytes[i] & 0xff)
      }
    }

    writeBytes([71, 73, 70, 56, 57, 97])
    writeWord(width)
    writeWord(height)
    chunks.push(0xf7)
    chunks.push(0)
    chunks.push(0)

    for (const color of palette) {
      chunks.push(color[0])
      chunks.push(color[1])
      chunks.push(color[2])
    }

    chunks.push(0x21, 0xff, 0x0b)
    writeBytes([78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48])
    chunks.push(0x03, 0x01, 0x00, 0x00, 0x00)

    for (let fIdx = 0; fIdx < frames.length; fIdx++) {
      chunks.push(0x21, 0xf9, 0x04)
      chunks.push(0x00)
      writeWord(delayCs)
      chunks.push(0x00)
      chunks.push(0x00)

      chunks.push(0x2c)
      writeWord(0)
      writeWord(0)
      writeWord(width)
      writeWord(height)
      chunks.push(0)
      chunks.push(8)

      const minLzw = 2
      chunks.push(minLzw)

      const codes = this.lzwEncode(frames[fIdx], minLzw)
      let pos = 0
      while (pos < codes.length) {
        const blockLen = Math.min(255, codes.length - pos)
        chunks.push(blockLen)
        for (let i = 0; i < blockLen; i++) {
          chunks.push(codes[pos + i])
        }
        pos += blockLen
      }
      chunks.push(0)
    }

    chunks.push(0x3b)

    return new Uint8Array(chunks)
  }

  private lzwEncode(data: Uint8Array, minCodeSize: number): number[] {
    const result: number[] = []
    let codeSize = minCodeSize + 1
    const clearCode = 1 << minCodeSize
    const endCode = clearCode + 1
    let nextCode = endCode + 1
    const dict = new Map<number, number>()

    const getKey = (w: number, c: number): number => {
      return (w << 8) | c
    }

    const resetDict = () => {
      dict.clear()
      for (let i = 0; i < (1 << minCodeSize); i++) {
        dict.set(getKey(-1, i), i)
      }
      nextCode = endCode + 1
      codeSize = minCodeSize + 1
    }

    resetDict()

    let bitBuffer = 0
    let bitCount = 0

    const writeCode = (code: number) => {
      bitBuffer |= (code << bitCount)
      bitCount += codeSize

      while (bitCount >= 8) {
        result.push(bitBuffer & 0xff)
        bitBuffer >>= 8
        bitCount -= 8
      }
    }

    writeCode(clearCode)

    let w = data[0]

    for (let i = 1; i < data.length; i++) {
      const c = data[i]
      const key = getKey(w, c)

      if (dict.has(key)) {
        w = dict.get(key)!
      } else {
        writeCode(w)
        if (nextCode < 4096) {
          dict.set(key, nextCode++)
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++
          }
        } else {
          writeCode(clearCode)
          resetDict()
        }
        w = c
      }
    }

    writeCode(w)
    writeCode(endCode)

    if (bitCount > 0) {
      result.push(bitBuffer & 0xff)
    }

    return result
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ]
    if (typeof MediaRecorder !== 'undefined') {
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type
        }
      }
    }
    return 'video/webm'
  }

  stopExport(): void {
    if (this.state.animationFrame) {
      cancelAnimationFrame(this.state.animationFrame)
      this.state.animationFrame = null
    }

    audioProcessor.pause()

    if (this.state.mediaRecorder && this.state.mediaRecorder.state !== 'inactive') {
      try {
        this.state.mediaRecorder.stop()
      } catch {
        this.cleanup()
      }
    } else {
      this.cleanup()
    }
  }

  private cleanup(): void {
    this.state.isRecording = false

    if (this.state.animationFrame) {
      cancelAnimationFrame(this.state.animationFrame)
      this.state.animationFrame = null
    }

    if (this.state.combinedStream) {
      this.state.combinedStream.getTracks().forEach(t => t.stop())
    }

    this.state.mediaRecorder = null
    this.state.canvasStream = null
    this.state.audioStream = null
    this.state.combinedStream = null
  }

  private downloadFile(blob: Blob, filename: string): void {
    try {
      saveAs(blob, filename)
    } catch {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }
}

export const exportManager = new ExportManager()
