import * as Tone from 'tone'
import { NOTES, BASE_OCTAVE, NOTE_RANGE, MIN_DURATION, MAX_DURATION } from '../constants'
import type { InkBlob, MusicControls, TonePreset } from '../types'

const hueToNoteIndex = (h: number): number => {
  return Math.floor((h / 360) * NOTE_RANGE)
}

const noteIndexToName = (idx: number): string => {
  const note = NOTES[idx % 12]
  const octave = BASE_OCTAVE + Math.floor(idx / 12)
  return `${note}${octave}`
}

const saturationToVolume = (s: number): number => {
  return Tone.dbToGain(-24 + (s / 100) * 18)
}

const lightnessToDetune = (l: number): number => {
  return (l / 100 - 0.5) * 40
}

const xToPan = (x: number, canvasWidth: number): number => {
  return (x / canvasWidth - 0.5) * 2
}

interface NoteEvent {
  time: number
  blobIndex: number
  note: string
  velocity: number
  pan: number
  duration: number
  detune: number
}

export const generateMusic = (
  blobs: InkBlob[],
  canvasWidth: number,
  canvasHeight: number,
  initialTempo: number = 120,
  initialTone: TonePreset = 'piano'
): MusicControls => {
  const sortedBlobs = [...blobs].sort((a, b) => a.x - b.x)
  const blobCount = sortedBlobs.length

  if (blobCount === 0) {
    return createNoOpControls()
  }

  const targetDuration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, blobCount * 2.5))
  const beatDuration = 60 / initialTempo
  const totalBeats = Math.floor(targetDuration / beatDuration)

  const noteEvents: NoteEvent[] = []
  const arpStep = 0.25

  let beatCursor = 0
  let eventIndex = 0
  const maxEvents = Math.floor(totalBeats / arpStep)

  const blobIndexMap = new Map<InkBlob, number>()
  blobs.forEach((b, i) => blobIndexMap.set(b, i))

  while (beatCursor < totalBeats && eventIndex < maxEvents) {
    const sortedBlobIdx = eventIndex % blobCount
    const blob = sortedBlobs[sortedBlobIdx]

    const hueOffset = Math.floor(eventIndex / blobCount) * 7
    const noteIdx = (hueToNoteIndex(blob.color.h) + hueOffset) % NOTE_RANGE
    const note = noteIndexToName(noteIdx)

    const velocity = saturationToVolume(blob.color.s) * (0.85 + Math.random() * 0.3)
    const pan = xToPan(blob.x, canvasWidth)
    const duration = arpStep * beatDuration * (0.9 + Math.random() * 0.4)
    const detune = lightnessToDetune(blob.color.l)

    const originalIndex = blobIndexMap.get(blob) ?? 0

    noteEvents.push({
      time: beatCursor * beatDuration,
      blobIndex: originalIndex,
      note,
      velocity: Math.min(1, velocity),
      pan,
      duration,
      detune
    })

    beatCursor += arpStep
    eventIndex++
  }

  return createControls(noteEvents, initialTempo, initialTone, targetDuration)
}

const createNoOpControls = (): MusicControls => ({
  start: () => {},
  stop: () => {},
  setTempo: () => {},
  setTone: () => {},
  isPlaying: () => false,
  onNoteTrigger: () => {}
})

const createSynth = (preset: TonePreset): Tone.PolySynth => {
  switch (preset) {
    case 'strings':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'fatsawtooth',
          count: 3,
          spread: 20
        } as any,
        envelope: {
          attack: 0.4,
          decay: 0.3,
          sustain: 0.7,
          release: 1.5
        }
      })
    case 'synth':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'square'
        },
        envelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.4,
          release: 0.6
        }
      })
    case 'piano':
    default:
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'triangle'
        },
        envelope: {
          attack: 0.02,
          decay: 0.3,
          sustain: 0.1,
          release: 0.8
        }
      })
  }
}

const createControls = (
  events: NoteEvent[],
  initialTempo: number,
  tone: TonePreset,
  duration: number
): MusicControls => {
  let currentTone = tone
  let synth = createSynth(tone)
  const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.35 })
  const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.15, wet: 0.15 })
  const panner = new Tone.Panner(0)
  const masterGain = new Tone.Gain(0.6)

  synth.chain(delay, reverb, panner, masterGain, Tone.Destination)

  let scheduledIds: number[] = []
  let playing = false
  let noteTriggerCallback: ((blobIndex: number) => void) | null = null

  const disposeAll = () => {
    scheduledIds.forEach(id => Tone.Transport.clear(id))
    scheduledIds = []
  }

  const scheduleEvents = () => {
    disposeAll()

    events.forEach(evt => {
      const id = Tone.Transport.schedule((time) => {
        panner.pan.setValueAtTime(evt.pan, time)
        synth.triggerAttackRelease(evt.note, evt.duration, time, evt.velocity)

        Tone.Draw.schedule(() => {
          if (noteTriggerCallback) {
            noteTriggerCallback(evt.blobIndex)
          }
        }, time)
      }, evt.time)
      scheduledIds.push(id)
    })

    const endId = Tone.Transport.schedule(() => {
      stopInternal()
    }, duration + 2)
    scheduledIds.push(endId)
  }

  const stopInternal = () => {
    playing = false
    Tone.Transport.stop()
    disposeAll()
    synth.releaseAll(Tone.now())
  }

  const start = async () => {
    if (playing) return
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }
    playing = true
    Tone.Transport.bpm.value = initialTempo
    scheduleEvents()
    Tone.Transport.position = 0
    Tone.Transport.start()
  }

  const stop = () => {
    stopInternal()
  }

  const setTempo = (newTempo: number) => {
    Tone.Transport.bpm.rampTo(newTempo, 0.1)
  }

  const setTone = (newTone: TonePreset) => {
    if (newTone === currentTone) return
    currentTone = newTone

    const wasPlaying = playing

    synth.disconnect()
    synth.dispose()

    synth = createSynth(newTone)
    synth.chain(delay, reverb, panner, masterGain, Tone.Destination)

    if (wasPlaying) {
      disposeAll()
      scheduleEvents()
    }
  }

  const isPlaying = () => playing

  const onNoteTrigger = (cb: (blobIndex: number) => void) => {
    noteTriggerCallback = cb
  }

  return { start, stop, setTempo, setTone, isPlaying, onNoteTrigger }
}
