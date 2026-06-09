import { useRef, useState, useCallback } from 'react'

export interface FrequencyBand {
  low: number[]
  mid: number[]
  high: number[]
}

export interface AudioCaptureResult {
  bands: FrequencyBand
  energyRates: FrequencyBand
  audioBase64: string
}

export interface LiveFrame {
  low: number
  mid: number
  high: number
}

const FFT_SIZE = 2048
const MAX_DURATION_MS = 10000
const FRAME_INTERVAL_MS = 43

const LOW_MIN = 20
const LOW_MAX = 200
const MID_MIN = 200
const MID_MAX = 2000
const HIGH_MIN = 2000
const HIGH_MAX = 8000

function freqToIndex(freq: number, sampleRate: number, fftSize: number): number {
  return Math.round((freq * fftSize) / sampleRate)
}

function bandEnergy(data: Uint8Array, sampleRate: number, fftSize: number, fmin: number, fmax: number): number {
  const imin = Math.max(0, freqToIndex(fmin, sampleRate, fftSize))
  const imax = Math.min(fftSize / 2 - 1, freqToIndex(fmax, sampleRate, fftSize))
  if (imax < imin) return 0
  let sum = 0
  for (let i = imin; i <= imax; i++) sum += data[i]
  const binCount = imax - imin + 1
  const avg = sum / binCount / 255
  return avg
}

function computeEnergyRate(series: number[]): number[] {
  const rates: number[] = []
  for (let i = 0; i < series.length; i++) {
    if (i === 0) {
      rates.push(series.length > 1 ? Math.abs(series[1] - series[0]) : 0)
    } else {
      rates.push(Math.abs(series[i] - series[i - 1]))
    }
  }
  return rates
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function useAudioCapture() {
  const [isRecording, setIsRecording] = useState(false)
  const [liveFrames, setLiveFrames] = useState<LiveFrame[]>([])
  const [progress, setProgress] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const frameIntervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const allFramesRef = useRef<LiveFrame[]>([])

  const cleanup = useCallback(() => {
    if (frameIntervalRef.current !== null) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect() } catch (_) {}
      sourceRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      cleanup()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioCtx

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.3
      analyserRef.current = analyser

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source

      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorderRef.current = recorder

      allFramesRef.current = []
      startTimeRef.current = Date.now()
      recorder.start()
      setIsRecording(true)
      setProgress(0)
      setLiveFrames([])

      frameIntervalRef.current = window.setInterval(() => {
        if (!analyserRef.current || !audioContextRef.current) return
        const bufferLength = FFT_SIZE
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)

        const sampleRate = audioContextRef.current.sampleRate
        const low = bandEnergy(dataArray, sampleRate, FFT_SIZE, LOW_MIN, LOW_MAX)
        const mid = bandEnergy(dataArray, sampleRate, FFT_SIZE, MID_MIN, MID_MAX)
        const high = bandEnergy(dataArray, sampleRate, FFT_SIZE, HIGH_MIN, HIGH_MAX)

        const frame = { low, mid, high }
        allFramesRef.current.push(frame)
        setLiveFrames(prev => {
          const next = [...prev, frame]
          return next.length > 80 ? next.slice(next.length - 80) : next
        })

        const elapsed = Date.now() - startTimeRef.current
        setProgress(Math.min(1, elapsed / MAX_DURATION_MS))
      }, FRAME_INTERVAL_MS)

      timeoutRef.current = window.setTimeout(() => {
        stopRecordingInternal()
      }, MAX_DURATION_MS)
    } catch (err) {
      console.error('启动录音失败:', err)
      cleanup()
      setIsRecording(false)
      alert('无法访问麦克风，请检查权限设置')
    }
  }, [cleanup])

  const stopRecordingInternal = useCallback((): Promise<AudioCaptureResult | null> => {
    return new Promise((resolve) => {
      if (frameIntervalRef.current !== null) {
        clearInterval(frameIntervalRef.current)
        frameIntervalRef.current = null
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      const recorder = mediaRecorderRef.current
      const finalize = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const base64 = await blobToBase64(blob)

          const frames = allFramesRef.current
          const lowArr = frames.map(f => f.low)
          const midArr = frames.map(f => f.mid)
          const highArr = frames.map(f => f.high)

          const bands: FrequencyBand = { low: lowArr, mid: midArr, high: highArr }
          const energyRates: FrequencyBand = {
            low: computeEnergyRate(lowArr),
            mid: computeEnergyRate(midArr),
            high: computeEnergyRate(highArr)
          }

          cleanup()
          setIsRecording(false)
          resolve({ bands, energyRates, audioBase64: base64 })
        } catch (e) {
          console.error('音频处理错误:', e)
          cleanup()
          setIsRecording(false)
          resolve(null)
        }
      }

      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = finalize
        recorder.stop()
      } else {
        finalize()
      }
    })
  }, [cleanup])

  const stopRecording = useCallback(async (): Promise<AudioCaptureResult | null> => {
    return stopRecordingInternal()
  }, [stopRecordingInternal])

  return {
    isRecording,
    liveFrames,
    progress,
    startRecording,
    stopRecording
  }
}
