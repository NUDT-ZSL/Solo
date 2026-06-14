export const AudioEvents = {
  FILE_LOADED: 'audio:fileLoaded',
  DECODING_START: 'audio:decodingStart',
  DECODING_PROGRESS: 'audio:decodingProgress',
  DECODING_COMPLETE: 'audio:decodingComplete',
  DECODING_ERROR: 'audio:decodingError',
  PLAYBACK_START: 'audio:playbackStart',
  PLAYBACK_STOP: 'audio:playbackStop',
  PLAYBACK_TOGGLE: 'audio:playbackToggle',
  LOOP_POSITION: 'audio:loopPosition',
} as const

export const WaveformEvents = {
  BUFFER_READY: 'waveform:bufferReady',
  RENDER_COMPLETE: 'waveform:renderComplete',
  VIEW_CHANGE: 'waveform:viewChange',
  ZOOM_RESET: 'waveform:zoomReset',
  SCROLL_CHANGE: 'waveform:scrollChange',
  VERTICAL_ZOOM_CHANGE: 'waveform:verticalZoomChange',
} as const

export const SelectionEvents = {
  SELECTION_START: 'selection:start',
  SELECTION_UPDATE: 'selection:update',
  SELECTION_END: 'selection:end',
  SELECTION_CLEAR: 'selection:clear',
} as const

export const UIEvents = {
  FILE_DROP: 'ui:fileDrop',
  FILE_SELECT: 'ui:fileSelect',
  ERROR_MESSAGE: 'ui:errorMessage',
} as const

export const AllEvents = {
  ...AudioEvents,
  ...WaveformEvents,
  ...SelectionEvents,
  ...UIEvents,
} as const

export type AudioEventType = typeof AudioEvents[keyof typeof AudioEvents]
export type WaveformEventType = typeof WaveformEvents[keyof typeof WaveformEvents]
export type SelectionEventType = typeof SelectionEvents[keyof typeof SelectionEvents]
export type UIEventType = typeof UIEvents[keyof typeof UIEvents]
export type EventType = AudioEventType | WaveformEventType | SelectionEventType | UIEventType

export interface FileLoadedPayload {
  file: File
}

export interface DecodingProgressPayload {
  progress: number
}

export interface DecodingCompletePayload {
  buffer: AudioBuffer
  fileName: string
  sampleRate: number
  duration: number
}

export interface DecodingErrorPayload {
  error: string
  fileName: string
}

export interface PlaybackTogglePayload {
  startTime: number
  endTime: number
}

export interface LoopPositionPayload {
  currentTime: number
}

export interface ViewChangePayload {
  scrollX: number
  zoom: number
  verticalZoom: number
}

export interface ZoomResetPayload {}

export interface SelectionPayload {
  startTime: number
  endTime: number
}

export interface ErrorMessagePayload {
  message: string
}

export type EventPayloadMap = {
  [AudioEvents.FILE_LOADED]: FileLoadedPayload
  [AudioEvents.DECODING_START]: void
  [AudioEvents.DECODING_PROGRESS]: DecodingProgressPayload
  [AudioEvents.DECODING_COMPLETE]: DecodingCompletePayload
  [AudioEvents.DECODING_ERROR]: DecodingErrorPayload
  [AudioEvents.PLAYBACK_START]: void
  [AudioEvents.PLAYBACK_STOP]: void
  [AudioEvents.PLAYBACK_TOGGLE]: PlaybackTogglePayload
  [AudioEvents.LOOP_POSITION]: LoopPositionPayload
  [WaveformEvents.BUFFER_READY]: { buffer: AudioBuffer }
  [WaveformEvents.RENDER_COMPLETE]: { renderTime: number }
  [WaveformEvents.VIEW_CHANGE]: ViewChangePayload
  [WaveformEvents.ZOOM_RESET]: ZoomResetPayload
  [WaveformEvents.SCROLL_CHANGE]: { scrollX: number }
  [WaveformEvents.VERTICAL_ZOOM_CHANGE]: { verticalZoom: number }
  [SelectionEvents.SELECTION_START]: SelectionPayload
  [SelectionEvents.SELECTION_UPDATE]: SelectionPayload
  [SelectionEvents.SELECTION_END]: SelectionPayload
  [SelectionEvents.SELECTION_CLEAR]: void
  [UIEvents.FILE_DROP]: { file: File }
  [UIEvents.FILE_SELECT]: { file: File }
  [UIEvents.ERROR_MESSAGE]: ErrorMessagePayload
}

type Listener<T> = (payload: T) => void

class EventBus {
  private listeners: Map<string, Set<Listener<any>>> = new Map()

  on<E extends EventType>(
    event: E,
    listener: Listener<EventPayloadMap[E]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return () => this.off(event, listener)
  }

  off<E extends EventType>(
    event: E,
    listener: Listener<EventPayloadMap[E]>
  ): void {
    const set = this.listeners.get(event)
    if (set) {
      set.delete(listener)
    }
  }

  emit<E extends EventType>(
    event: E,
    payload: EventPayloadMap[E]
  ): void {
    const set = this.listeners.get(event)
    if (set) {
      set.forEach((listener) => listener(payload))
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const eventBus = new EventBus()
export default eventBus
