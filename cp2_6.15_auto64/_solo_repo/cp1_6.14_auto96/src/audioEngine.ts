import 'audio-context-polyfill'
import { eventBus, AudioEvents, UIEvents, SelectionEvents } from './eventBus'

export class AudioDecodingError extends Error {
  public readonly fileName: string
  public readonly reason: string

  constructor(message: string, fileName: string, reason: string) {
    super(message)
    this.name = 'AudioDecodingError'
    this.fileName = fileName
    this.reason = reason
  }
}

export class AudioEngine {
  private audioContext: AudioContext | null = null
  private audioBuffer: AudioBuffer | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private currentFileName: string = ''
  private isPlaying: boolean = false
  private loopStart: number = 0
  private loopEnd: number = 0
  private startTime: number = 0
  private offset: number = 0
  private rafId: number | null = null

  constructor() {
    this.initAudioContext()
    this.bindEvents()
  }

  private initAudioContext(): void {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx) {
        throw new Error('当前浏览器不支持 Web Audio API')
      }
      this.audioContext = new Ctx()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '音频上下文初始化失败'
      eventBus.emit(UIEvents.ERROR_MESSAGE, { message: msg })
    }
  }

  private bindEvents(): void {
    eventBus.on(UIEvents.FILE_DROP, ({ file }) => this.loadFile(file))
    eventBus.on(UIEvents.FILE_SELECT, ({ file }) => this.loadFile(file))
    eventBus.on(AudioEvents.PLAYBACK_TOGGLE, ({ startTime, endTime }) => {
      this.togglePlayback(startTime, endTime)
    })
    eventBus.on(SelectionEvents.SELECTION_CLEAR, () => {
      this.stopPlayback()
    })
  }

  public async loadFile(file: File): Promise<void> {
    if (!this.audioContext) {
      this.initAudioContext()
      if (!this.audioContext) {
        return
      }
    }

    this.stopPlayback()
    this.currentFileName = file.name

    if (!file.name.toLowerCase().endsWith('.mp3') &&
        !file.name.toLowerCase().endsWith('.wav') &&
        !file.name.toLowerCase().endsWith('.ogg') &&
        !file.name.toLowerCase().endsWith('.m4a')) {
      const error = new AudioDecodingError(
        '不支持的文件格式',
        file.name,
        '仅支持 MP3、WAV、OGG、M4A 格式的音频文件'
      )
      this.emitDecodingError(error)
      return
    }

    if (file.size === 0) {
      const error = new AudioDecodingError(
        '文件为空',
        file.name,
        '文件大小为 0 字节，可能已损坏'
      )
      this.emitDecodingError(error)
      return
    }

    eventBus.emit(AudioEvents.FILE_LOADED, { file })
    eventBus.emit(AudioEvents.DECODING_START, undefined as any)

    try {
      const arrayBuffer = await this.readFile(file)
      this.audioBuffer = await this.decodeAudio(arrayBuffer)

      eventBus.emit(AudioEvents.DECODING_COMPLETE, {
        buffer: this.audioBuffer,
        fileName: this.currentFileName,
        sampleRate: this.audioBuffer.sampleRate,
        duration: this.audioBuffer.duration,
      })
    } catch (e) {
      let error: AudioDecodingError
      if (e instanceof AudioDecodingError) {
        error = e
      } else if (e instanceof Error) {
        error = new AudioDecodingError(
          '音频解码失败',
          file.name,
          this.classifyDecodeError(e.message)
        )
      } else {
        error = new AudioDecodingError(
          '音频解码失败',
          file.name,
          '未知错误'
        )
      }
      this.emitDecodingError(error)
    }
  }

  private readFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          eventBus.emit(AudioEvents.DECODING_PROGRESS, {
            progress: (e.loaded / e.total) * 0.5,
          })
        }
      }

      reader.onload = () => {
        resolve(reader.result as ArrayBuffer)
      }

      reader.onerror = () => {
        reject(new AudioDecodingError(
          '文件读取失败',
          file.name,
          reader.error?.message || '文件读取过程中发生错误'
        ))
      }

      reader.onabort = () => {
        reject(new AudioDecodingError(
          '文件读取被中断',
          file.name,
          '读取操作被用户或系统中断'
        ))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  private async decodeAudio(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new AudioDecodingError(
        '音频上下文不可用',
        this.currentFileName,
        'AudioContext 未初始化'
      )
    }

    try {
      if (this.audioContext.decodeAudioData.length === 1) {
        return await this.audioContext.decodeAudioData(arrayBuffer.slice(0))
      }

      return await new Promise((resolve, reject) => {
        this.audioContext!.decodeAudioData(
          arrayBuffer.slice(0),
          (buffer) => {
            eventBus.emit(AudioEvents.DECODING_PROGRESS, { progress: 1 })
            resolve(buffer)
          },
          (err) => {
            reject(err)
          }
        )
      })
    } catch (e) {
      if (e instanceof Error) {
        throw e
      }
      throw new Error('解码过程中发生未知错误')
    }
  }

  private classifyDecodeError(message: string): string {
    const lower = message.toLowerCase()
    if (lower.includes('decode') || lower.includes('编码') || lower.includes('格式')) {
      return '文件格式损坏或编码不兼容，请尝试使用标准 MP3 文件'
    }
    if (lower.includes('not supported') || lower.includes('不支持')) {
      return '浏览器不支持该音频格式的解码'
    }
    if (lower.includes('memory') || lower.includes('内存')) {
      return '文件过大，内存不足，请使用较小的音频文件'
    }
    if (lower.includes('network') || lower.includes('网络')) {
      return '网络错误，请检查文件是否完整'
    }
    return '文件可能已损坏或格式不正确，请尝试其他音频文件'
  }

  private emitDecodingError(error: AudioDecodingError): void {
    eventBus.emit(AudioEvents.DECODING_ERROR, {
      error: error.message,
      fileName: error.fileName,
    })
    eventBus.emit(UIEvents.ERROR_MESSAGE, {
      message: `${error.message}：${error.reason}`,
    })
  }

  public togglePlayback(startTime: number, endTime: number): void {
    if (this.isPlaying) {
      this.stopPlayback()
    } else {
      this.startPlayback(startTime, endTime)
    }
  }

  public startPlayback(startTime: number, endTime: number): void {
    if (!this.audioBuffer || !this.audioContext) return
    if (startTime >= endTime) return

    this.stopPlayback()

    this.loopStart = startTime
    this.loopEnd = endTime
    this.offset = startTime
    this.isPlaying = true

    this.playSegment()
    eventBus.emit(AudioEvents.PLAYBACK_START, undefined as any)
    this.startLoopMonitor()
  }

  private playSegment(): void {
    if (!this.audioBuffer || !this.audioContext || !this.isPlaying) return

    this.sourceNode = this.audioContext.createBufferSource()
    this.sourceNode.buffer = this.audioBuffer

    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.value = 1

    this.sourceNode.connect(this.gainNode)
    this.gainNode.connect(this.audioContext.destination)

    this.startTime = this.audioContext.currentTime
    const duration = this.loopEnd - this.offset

    this.sourceNode.start(0, this.offset, duration)

    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.offset = this.loopStart
        this.playSegment()
      }
    }
  }

  public stopPlayback(): void {
    this.isPlaying = false

    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null
        this.sourceNode.stop()
      } catch (e) {
        // ignore stop errors
      }
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    eventBus.emit(AudioEvents.PLAYBACK_STOP, undefined as any)
  }

  private startLoopMonitor(): void {
    if (!this.audioContext) return

    const update = () => {
      if (!this.isPlaying || !this.audioContext) return

      const elapsed = this.audioContext.currentTime - this.startTime
      let currentTime = this.offset + elapsed

      if (currentTime >= this.loopEnd) {
        const loopDuration = this.loopEnd - this.loopStart
        const overshoot = (currentTime - this.loopEnd) % loopDuration
        currentTime = this.loopStart + overshoot
      }

      eventBus.emit(AudioEvents.LOOP_POSITION, { currentTime })

      this.rafId = requestAnimationFrame(update)
    }

    this.rafId = requestAnimationFrame(update)
  }

  public getIsPlaying(): boolean {
    return this.isPlaying
  }

  public getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer
  }

  public getCurrentFileName(): string {
    return this.currentFileName
  }

  public destroy(): void {
    this.stopPlayback()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

export const audioEngine = new AudioEngine()
export default audioEngine
