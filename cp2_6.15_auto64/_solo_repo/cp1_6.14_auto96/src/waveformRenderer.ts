import {
  eventBus,
  EVENT_AUDIO_DECODING_COMPLETE,
  EVENT_AUDIO_PLAYBACK_START,
  EVENT_AUDIO_PLAYBACK_STOP,
  EVENT_AUDIO_LOOP_POSITION,
  EVENT_WAVEFORM_ZOOM_RESET,
  EVENT_WAVEFORM_VIEW_CHANGE,
  EVENT_WAVEFORM_RENDER_COMPLETE,
  EVENT_SELECTION_START,
  EVENT_SELECTION_UPDATE,
  EVENT_SELECTION_END,
  EVENT_SELECTION_CLEAR,
} from './eventBus'

export interface WaveformView {
  scrollX: number
  zoom: number
  verticalZoom: number
}

export interface WaveformColors {
  background: string
  waveform: string
  waveformFill: string
  waveformHighlightFill: string
  waveformHighlightLine: string
  selectionBackground: string
  selectionBorder: string
  playhead: string
}

const DEFAULT_COLORS: WaveformColors = {
  background: '#0d0d15',
  waveform: '#4fc3f7',
  waveformFill: 'rgba(79, 195, 247, 0.125)',
  waveformHighlightFill: 'rgba(0, 230, 118, 0.31)',
  waveformHighlightLine: '#00e676',
  selectionBackground: 'rgba(255, 112, 67, 0.188)',
  selectionBorder: '#ff7043',
  playhead: '#00e676',
}

export class WaveformRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private audioBuffer: AudioBuffer | null = null
  private view: WaveformView = {
    scrollX: 0,
    zoom: 1,
    verticalZoom: 1,
  }
  private selection: { startTime: number; endTime: number } | null = null
  private isPlaying: boolean = false
  private playheadTime: number = 0
  private colors: WaveformColors = DEFAULT_COLORS
  private pixelRatio: number = window.devicePixelRatio || 1
  private cachedPeaks: Float32Array | null = null
  private cachedDuration: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文')
    }
    this.ctx = ctx
    this.bindEvents()
    this.setupCanvas()
  }

  private bindEvents(): void {
    eventBus.on(EVENT_AUDIO_DECODING_COMPLETE, ({ buffer }) => {
      this.setAudioBuffer(buffer)
    })

    eventBus.on(EVENT_SELECTION_START, ({ startTime, endTime }) => {
      this.setSelection(startTime, endTime)
    })
    eventBus.on(EVENT_SELECTION_UPDATE, ({ startTime, endTime }) => {
      this.setSelection(startTime, endTime)
    })
    eventBus.on(EVENT_SELECTION_END, ({ startTime, endTime }) => {
      this.setSelection(startTime, endTime)
    })
    eventBus.on(EVENT_SELECTION_CLEAR, () => {
      this.clearSelection()
    })

    eventBus.on(EVENT_AUDIO_PLAYBACK_START, () => {
      this.setPlaying(true)
    })
    eventBus.on(EVENT_AUDIO_PLAYBACK_STOP, () => {
      this.setPlaying(false)
    })
    eventBus.on(EVENT_AUDIO_LOOP_POSITION, ({ currentTime }) => {
      this.setPlayheadTime(currentTime)
    })

    eventBus.on(EVENT_WAVEFORM_ZOOM_RESET, () => {
      this.resetView()
    })
  }

  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.pixelRatio
    this.canvas.height = rect.height * this.pixelRatio
    this.ctx.scale(this.pixelRatio, this.pixelRatio)
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.pixelRatio
    this.canvas.height = rect.height * this.pixelRatio
    this.ctx.scale(this.pixelRatio, this.pixelRatio)
    this.render()
  }

  public setAudioBuffer(buffer: AudioBuffer): void {
    this.audioBuffer = buffer
    this.cachedPeaks = null
    this.cachedDuration = buffer.duration
    this.computePeaks()
    this.view.scrollX = 0
    this.view.zoom = 1
    this.view.verticalZoom = 1
    this.render()
    eventBus.emit(EVENT_WAVEFORM_VIEW_CHANGE, { ...this.view })
  }

  private computePeaks(): void {
    if (!this.audioBuffer) return

    const startTime = performance.now()
    const channelData = this.audioBuffer.getChannelData(0)
    const length = channelData.length

    const targetPeaks = Math.min(2000, this.canvas.width / this.pixelRatio)
    const samplesPerPeak = Math.floor(length / targetPeaks)

    const peaks = new Float32Array(Math.floor(length / samplesPerPeak))

    for (let i = 0; i < peaks.length; i++) {
      const start = i * samplesPerPeak
      const end = Math.min(start + samplesPerPeak, length)
      let max = 0

      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j])
        if (val > max) max = val
      }

      peaks[i] = max
    }

    this.cachedPeaks = peaks
    const renderTime = performance.now() - startTime
    eventBus.emit(EVENT_WAVEFORM_RENDER_COMPLETE, { renderTime })
  }

  public setView(view: Partial<WaveformView>): void {
    Object.assign(this.view, view)
    this.clampView()
    eventBus.emit(EVENT_WAVEFORM_VIEW_CHANGE, { ...this.view })
    this.render()
  }

  public resetView(): void {
    this.view.scrollX = 0
    this.view.zoom = 1
    this.view.verticalZoom = 1
    eventBus.emit(EVENT_WAVEFORM_VIEW_CHANGE, { ...this.view })
    this.render()
  }

  private clampView(): void {
    if (!this.audioBuffer) return

    const visibleDuration = this.audioBuffer.duration / this.view.zoom
    const maxScrollX = Math.max(0, this.audioBuffer.duration - visibleDuration)

    if (this.view.scrollX < 0) this.view.scrollX = 0
    if (this.view.scrollX > maxScrollX) this.view.scrollX = maxScrollX

    if (this.view.zoom < 1) this.view.zoom = 1
    if (this.view.zoom > 50) this.view.zoom = 50

    if (this.view.verticalZoom < 1) this.view.verticalZoom = 1
    if (this.view.verticalZoom > 10) this.view.verticalZoom = 10
  }

  public setSelection(startTime: number, endTime: number): void {
    if (startTime > endTime) {
      [startTime, endTime] = [endTime, startTime]
    }
    this.selection = { startTime, endTime }
    this.render()
  }

  public clearSelection(): void {
    this.selection = null
    this.render()
  }

  public setPlaying(playing: boolean): void {
    this.isPlaying = playing
    this.render()
  }

  public setPlayheadTime(time: number): void {
    this.playheadTime = time
    this.render()
  }

  public getView(): WaveformView {
    return { ...this.view }
  }

  public getSelection(): { startTime: number; endTime: number } | null {
    return this.selection
  }

  public timeToX(time: number): number {
    if (!this.audioBuffer) return 0
    const rect = this.canvas.getBoundingClientRect()
    const visibleDuration = this.audioBuffer.duration / this.view.zoom
    const x = ((time - this.view.scrollX) / visibleDuration) * rect.width
    return x
  }

  public xToTime(x: number): number {
    if (!this.audioBuffer) return 0
    const rect = this.canvas.getBoundingClientRect()
    const visibleDuration = this.audioBuffer.duration / this.view.zoom
    const time = this.view.scrollX + (x / rect.width) * visibleDuration
    return Math.max(0, Math.min(this.audioBuffer.duration, time))
  }

  public render(): void {
    const rect = this.canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    this.ctx.clearRect(0, 0, width, height)

    this.ctx.fillStyle = this.colors.background
    this.ctx.fillRect(0, 0, width, height)

    if (!this.audioBuffer || !this.cachedPeaks || this.cachedPeaks.length === 0) {
      return
    }

    const visibleDuration = this.audioBuffer.duration / this.view.zoom
    const startSample = Math.floor(
      (this.view.scrollX / this.audioBuffer.duration) * this.cachedPeaks.length
    )
    const endSample = Math.floor(
      ((this.view.scrollX + visibleDuration) / this.audioBuffer.duration) * this.cachedPeaks.length
    )

    const centerY = height / 2
    const halfHeight = (height / 2 - 4) * this.view.verticalZoom

    const samplesVisible = endSample - startSample
    const pixelsPerSample = width / samplesVisible

    this.ctx.fillStyle = this.colors.waveformFill
    this.ctx.beginPath()
    this.ctx.moveTo(0, centerY)

    for (let i = 0; i < samplesVisible; i++) {
      const peakIndex = startSample + i
      if (peakIndex < 0 || peakIndex >= this.cachedPeaks.length) continue

      const peak = this.cachedPeaks[peakIndex]
      const x = i * pixelsPerSample
      const y = peak * halfHeight

      this.ctx.lineTo(x, centerY - y)
    }

    for (let i = samplesVisible - 1; i >= 0; i--) {
      const peakIndex = startSample + i
      if (peakIndex < 0 || peakIndex >= this.cachedPeaks.length) continue

      const peak = this.cachedPeaks[peakIndex]
      const x = i * pixelsPerSample
      const y = peak * halfHeight

      this.ctx.lineTo(x, centerY + y)
    }

    this.ctx.closePath()
    this.ctx.fill()

    if (this.selection && this.isPlaying) {
      const selStartX = this.timeToX(this.selection.startTime)
      const selEndX = this.timeToX(this.selection.endTime)
      const selWidth = selEndX - selStartX

      if (selWidth > 0) {
        this.ctx.save()
        this.ctx.beginPath()
        this.ctx.rect(selStartX, 0, selWidth, height)
        this.ctx.clip()

        this.ctx.fillStyle = this.colors.waveformHighlightFill
        this.ctx.beginPath()
        this.ctx.moveTo(0, centerY)

        for (let i = 0; i < samplesVisible; i++) {
          const peakIndex = startSample + i
          if (peakIndex < 0 || peakIndex >= this.cachedPeaks.length) continue

          const peak = this.cachedPeaks[peakIndex]
          const x = i * pixelsPerSample
          const y = peak * halfHeight

          this.ctx.lineTo(x, centerY - y)
        }

        for (let i = samplesVisible - 1; i >= 0; i--) {
          const peakIndex = startSample + i
          if (peakIndex < 0 || peakIndex >= this.cachedPeaks.length) continue

          const peak = this.cachedPeaks[peakIndex]
          const x = i * pixelsPerSample
          const y = peak * halfHeight

          this.ctx.lineTo(x, centerY + y)
        }

        this.ctx.closePath()
        this.ctx.fill()
        this.ctx.restore()
      }
    }

    this.ctx.strokeStyle = this.colors.waveform
    this.ctx.lineWidth = 1.5
    this.ctx.beginPath()

    for (let i = 0; i < samplesVisible; i++) {
      const peakIndex = startSample + i
      if (peakIndex < 0 || peakIndex >= this.cachedPeaks.length) continue

      const peak = this.cachedPeaks[peakIndex]
      const x = i * pixelsPerSample
      const y = peak * halfHeight

      this.ctx.moveTo(x, centerY - y)
      this.ctx.lineTo(x, centerY + y)
    }

    this.ctx.stroke()

    if (this.selection && this.isPlaying) {
      const selStartX = this.timeToX(this.selection.startTime)
      const selEndX = this.timeToX(this.selection.endTime)
      const selWidth = selEndX - selStartX

      if (selWidth > 0) {
        this.ctx.save()
        this.ctx.beginPath()
        this.ctx.rect(selStartX, 0, selWidth, height)
        this.ctx.clip()

        this.ctx.strokeStyle = this.colors.waveformHighlightLine
        this.ctx.lineWidth = 1.5
        this.ctx.beginPath()

        for (let i = 0; i < samplesVisible; i++) {
          const peakIndex = startSample + i
          if (peakIndex < 0 || peakIndex >= this.cachedPeaks.length) continue

          const peak = this.cachedPeaks[peakIndex]
          const x = i * pixelsPerSample
          const y = peak * halfHeight

          this.ctx.moveTo(x, centerY - y)
          this.ctx.lineTo(x, centerY + y)
        }

        this.ctx.stroke()
        this.ctx.restore()
      }
    }

    if (this.selection) {
      const selStartX = this.timeToX(this.selection.startTime)
      const selEndX = this.timeToX(this.selection.endTime)

      this.ctx.fillStyle = this.colors.selectionBackground
      this.ctx.fillRect(selStartX, 0, selEndX - selStartX, height)

      this.ctx.strokeStyle = this.colors.selectionBorder
      this.ctx.lineWidth = 1
      this.ctx.strokeRect(selStartX + 0.5, 0.5, selEndX - selStartX - 1, height - 1)
    }

    if (this.isPlaying && this.selection) {
      const playheadX = this.timeToX(this.playheadTime)
      this.ctx.strokeStyle = this.colors.playhead
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(playheadX, 0)
      this.ctx.lineTo(playheadX, height)
      this.ctx.stroke()
    }
  }

  public getScrollbarThumbWidth(): number {
    if (!this.audioBuffer) return 100
    const rect = this.canvas.getBoundingClientRect()
    const thumbWidth = rect.width / this.view.zoom
    return Math.max(20, thumbWidth)
  }

  public getMaxScrollX(): number {
    if (!this.audioBuffer) return 0
    const visibleDuration = this.audioBuffer.duration / this.view.zoom
    return Math.max(0, this.audioBuffer.duration - visibleDuration)
  }

  public destroy(): void {
    // cleanup if needed
  }
}

export default WaveformRenderer
