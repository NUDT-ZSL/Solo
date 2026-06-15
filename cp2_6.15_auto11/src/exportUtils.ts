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
  }

  private options: ExportOptions | null = null

  get isRecording(): boolean {
    return this.state.isRecording
  }

  async startExport(
    canvas: HTMLCanvasElement,
    options: ExportOptions
  ): Promise<void> {
    if (this.state.isRecording) return

    this.options = options
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

    const canvasStream = canvas.captureStream(60)
    this.state.canvasStream = canvasStream

    let combinedStream = canvasStream
    try {
      const audioCtx = (audioProcessor as unknown as { audioContext?: AudioContext }).audioContext
      if (audioCtx) {
        const dest = audioCtx.createMediaStreamDestination()
        this.state.audioStream = dest.stream
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ])
      }
    } catch {
      // no audio available
    }
    this.state.combinedStream = combinedStream

    const mimeType = this.getSupportedMimeType()

    try {
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
        this.handleRecordingComplete(options.format)
      }

      mediaRecorder.start(100)
      this.state.isRecording = true
      this.state.startTime = performance.now()

      audioProcessor.seek(0)
      await audioProcessor.play()

      this.startProgressLoop(targetDuration, options)
    } catch (e) {
      console.error('Failed to start recording:', e)
      if (options.format === 'gif' || !(e instanceof Error && e.message.includes('MediaRecorder'))) {
        await this.startGifExport(canvas, targetDuration, options)
      }
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ]
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    return 'video/webm'
  }

  private startProgressLoop(targetDuration: number, options: ExportOptions): void {
    const loop = () => {
      if (!this.state.isRecording) return

      const elapsed = (performance.now() - this.state.startTime) / 1000
      const progress = Math.min(elapsed / targetDuration, 1)

      options.onProgress?.(progress)

      if (elapsed >= targetDuration) {
        this.stopExport()
        return
      }

      this.state.animationFrame = requestAnimationFrame(loop)
    }

    this.state.animationFrame = requestAnimationFrame(loop)
  }

  private handleRecordingComplete(format: ExportFormat): void {
    const blob = new Blob(this.state.recordedChunks, {
      type: format === 'video' ? 'video/webm' : 'image/gif',
    })

    this.cleanup()

    if (format === 'video') {
      this.downloadFile(blob, 'particle-animation.webm')
      this.options?.onComplete?.(blob)
    } else {
      this.convertWebmToGif(blob).then((gifBlob) => {
        this.downloadFile(gifBlob, 'particle-animation.gif')
        this.options?.onComplete?.(gifBlob)
      }).catch(() => {
        this.downloadFile(blob, 'particle-animation.webm')
        this.options?.onComplete?.(blob)
      })
    }
  }

  private async convertWebmToGif(_webmBlob: Blob): Promise<Blob> {
    const width = 640
    const height = 480
    const fps = 15
    const frameDelay = 1000 / fps
    const totalFrames = Math.floor(this.state.targetDuration * fps)
    const playbackStartTime = audioProcessor.getCurrentTime()

    const frames: string[] = []

    const offscreen = document.createElement('canvas')
    offscreen.width = width
    offscreen.height = height
    const ctx = offscreen.getContext('2d')!

    const originalCanvas = document.querySelector('canvas') as HTMLCanvasElement | null
    if (!originalCanvas) {
      throw new Error('No canvas found')
    }

    audioProcessor.pause()

    for (let i = 0; i < totalFrames; i++) {
      const time = playbackStartTime + (i / fps)
      audioProcessor.seek(time)
      audioProcessor.getSpectrumAtTime(time)
      await new Promise(r => setTimeout(r, 16))
      ctx.drawImage(originalCanvas, 0, 0, width, height)
      frames.push(offscreen.toDataURL('image/png'))
      this.options?.onProgress?.(i / totalFrames * 0.9)
    }

    audioProcessor.play(playbackStartTime)

    return this.createGifFromFrames(frames, width, height, frameDelay)
  }

  private createGifFromFrames(
    frames: string[],
    width: number,
    height: number,
    _delay: number
  ): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!

      const quantize = (data: Uint8ClampedArray): Uint8ClampedArray => {
        const palette: number[][] = []
        const indices = new Uint8ClampedArray(data.length / 4)

        for (let i = 0; i < data.length; i += 4) {
          let bestIndex = 0
          let bestDist = Infinity

          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          if (palette.length < 256) {
            palette.push([r, g, b])
            indices[i / 4] = palette.length - 1
            continue
          }

          for (let p = 0; p < palette.length; p++) {
            const dr = r - palette[p][0]
            const dg = g - palette[p][1]
            const db = b - palette[p][2]
            const dist = dr * dr + dg * dg + db * db
            if (dist < bestDist) {
              bestDist = dist
              bestIndex = p
            }
          }
          indices[i / 4] = bestIndex
        }

        return indices
      }

      const buildGif = async () => {
        const chunks: number[] = []

        const writeWord = (val: number) => {
          chunks.push(val & 0xff)
          chunks.push((val >> 8) & 0xff)
        }

        const writeBytes = (bytes: number[] | Uint8Array) => {
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

        for (let i = 0; i < 256; i++) {
          const hue = i / 256
          const h = hue * 6
          const x = 1 - Math.abs(h % 2 - 1)
          let r, g, b
          if (h < 1) { r = 1; g = x; b = 0 }
          else if (h < 2) { r = x; g = 1; b = 0 }
          else if (h < 3) { r = 0; g = 1; b = x }
          else if (h < 4) { r = 0; g = x; b = 1 }
          else if (h < 5) { r = x; g = 0; b = 1 }
          else { r = 1; g = 0; b = x }
          chunks.push(Math.floor(r * 255))
          chunks.push(Math.floor(g * 255))
          chunks.push(Math.floor(b * 255))
        }

        for (let fIdx = 0; fIdx < frames.length; fIdx++) {
          const img = new Image()
          img.src = frames[fIdx]
          await new Promise<void>((res) => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0, width, height)
              res()
            }
          })

          const imgData = ctx.getImageData(0, 0, width, height)
          const quantized = quantize(imgData.data)

          chunks.push(0x21, 0xff, 0x0b)
          writeBytes([78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48])
          chunks.push(0x03, 0x01, 0x00, 0x00, 0x00)

          chunks.push(0x2c)
          writeWord(0)
          writeWord(0)
          writeWord(width)
          writeWord(height)
          chunks.push(0)
          chunks.push(8)

          const minLzw = 2
          chunks.push(minLzw)

          const codes = this.lzwEncode(quantized, minLzw)
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

          this.options?.onProgress?.(0.9 + (fIdx / frames.length) * 0.1)
        }

        chunks.push(0x3b)

        resolve(new Blob([new Uint8Array(chunks)], { type: 'image/gif' }))
      }

      buildGif()
    })
  }

  private lzwEncode(data: Uint8ClampedArray, minCodeSize: number): number[] {
    const result: number[] = []
    let codeSize = minCodeSize + 1
    let clearCode = 1 << minCodeSize
    let endCode = clearCode + 1
    let nextCode = endCode + 1
    const dict = new Map<string, number>()

    const resetDict = () => {
      dict.clear()
      for (let i = 0; i < (1 << minCodeSize); i++) {
        dict.set(String(i), i)
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

    let w = String(data[0])

    for (let i = 1; i < data.length; i++) {
      const c = String(data[i])
      const wc = w + ',' + c

      if (dict.has(wc)) {
        w = wc
      } else {
        writeCode(dict.get(w)!)
        if (nextCode < 4096) {
          dict.set(wc, nextCode++)
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

    writeCode(dict.get(w)!)
    writeCode(endCode)

    if (bitCount > 0) {
      result.push(bitBuffer & 0xff)
    }

    return result
  }

  async startGifExport(
    canvas: HTMLCanvasElement,
    targetDuration: number,
    options: ExportOptions
  ): Promise<void> {
    const width = 640
    const height = 480
    const fps = 10
    const totalFrames = Math.floor(targetDuration * fps)

    const frames: string[] = []
    const playbackStartTime = audioProcessor.getCurrentTime()

    audioProcessor.pause()

    for (let i = 0; i < totalFrames; i++) {
      const time = playbackStartTime + (i / fps)
      audioProcessor.seek(time)
      audioProcessor.getSpectrumAtTime(time)
      await new Promise(r => setTimeout(r, 50))

      const offscreen = document.createElement('canvas')
      offscreen.width = width
      offscreen.height = height
      const ctx = offscreen.getContext('2d')!
      ctx.drawImage(canvas, 0, 0, width, height)
      frames.push(offscreen.toDataURL('image/jpeg', 0.8))

      options.onProgress?.(i / totalFrames * 0.8)
    }

    audioProcessor.play(playbackStartTime)

    const blob = await this.createGifFromFrames(frames, width, height, 1000 / fps)
    this.downloadFile(blob, 'particle-animation.gif')
    options.onComplete?.(blob)
    this.cleanup()
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
