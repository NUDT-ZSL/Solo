export const EVENT_AUDIO_FILE_LOADED       = 'audio:fileLoaded'
export const EVENT_AUDIO_DECODING_START    = 'audio:decodingStart'
export const EVENT_AUDIO_DECODING_PROGRESS = 'audio:decodingProgress'
export const EVENT_AUDIO_DECODING_COMPLETE = 'audio:decodingComplete'
export const EVENT_AUDIO_DECODING_ERROR    = 'audio:decodingError'
export const EVENT_AUDIO_PLAYBACK_START    = 'audio:playbackStart'
export const EVENT_AUDIO_PLAYBACK_STOP     = 'audio:playbackStop'
export const EVENT_AUDIO_PLAYBACK_TOGGLE   = 'audio:playbackToggle'
export const EVENT_AUDIO_LOOP_POSITION     = 'audio:loopPosition'

export const EVENT_WAVEFORM_BUFFER_READY    = 'waveform:bufferReady'
export const EVENT_WAVEFORM_RENDER_COMPLETE = 'waveform:renderComplete'
export const EVENT_WAVEFORM_VIEW_CHANGE     = 'waveform:viewChange'
export const EVENT_WAVEFORM_ZOOM_RESET      = 'waveform:zoomReset'
export const EVENT_WAVEFORM_SCROLL_CHANGE   = 'waveform:scrollChange'
export const EVENT_WAVEFORM_VERTICAL_ZOOM_CHANGE = 'waveform:verticalZoomChange'

export const EVENT_SELECTION_START  = 'selection:start'
export const EVENT_SELECTION_UPDATE = 'selection:update'
export const EVENT_SELECTION_END    = 'selection:end'
export const EVENT_SELECTION_CLEAR  = 'selection:clear'

export const EVENT_UI_FILE_DROP     = 'ui:fileDrop'
export const EVENT_UI_FILE_SELECT   = 'ui:fileSelect'
export const EVENT_UI_ERROR_MESSAGE = 'ui:errorMessage'

export const AudioEvents = {
  FILE_LOADED: EVENT_AUDIO_FILE_LOADED,
  DECODING_START: EVENT_AUDIO_DECODING_START,
  DECODING_PROGRESS: EVENT_AUDIO_DECODING_PROGRESS,
  DECODING_COMPLETE: EVENT_AUDIO_DECODING_COMPLETE,
  DECODING_ERROR: EVENT_AUDIO_DECODING_ERROR,
  PLAYBACK_START: EVENT_AUDIO_PLAYBACK_START,
  PLAYBACK_STOP: EVENT_AUDIO_PLAYBACK_STOP,
  PLAYBACK_TOGGLE: EVENT_AUDIO_PLAYBACK_TOGGLE,
  LOOP_POSITION: EVENT_AUDIO_LOOP_POSITION,
} as const

export const WaveformEvents = {
  BUFFER_READY: EVENT_WAVEFORM_BUFFER_READY,
  RENDER_COMPLETE: EVENT_WAVEFORM_RENDER_COMPLETE,
  VIEW_CHANGE: EVENT_WAVEFORM_VIEW_CHANGE,
  ZOOM_RESET: EVENT_WAVEFORM_ZOOM_RESET,
  SCROLL_CHANGE: EVENT_WAVEFORM_SCROLL_CHANGE,
  VERTICAL_ZOOM_CHANGE: EVENT_WAVEFORM_VERTICAL_ZOOM_CHANGE,
} as const

export const SelectionEvents = {
  SELECTION_START: EVENT_SELECTION_START,
  SELECTION_UPDATE: EVENT_SELECTION_UPDATE,
  SELECTION_END: EVENT_SELECTION_END,
  SELECTION_CLEAR: EVENT_SELECTION_CLEAR,
} as const

export const UIEvents = {
  FILE_DROP: EVENT_UI_FILE_DROP,
  FILE_SELECT: EVENT_UI_FILE_SELECT,
  ERROR_MESSAGE: EVENT_UI_ERROR_MESSAGE,
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
