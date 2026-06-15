import { Note, LevelConfig } from './types'
import { v4 as uuidv4 } from 'uuid'

let Tonal: any = null
let tonalLoaded = false
let tonalLoadError: Error | null = null

try {
  Tonal = await import('tonal')
  tonalLoaded = true
} catch (e) {
  tonalLoadError = e as Error
  console.warn('Tonal library failed to load, using fallback generation:', e)
}

interface BeatPattern {
  time: number
  intensity: number
  subdivision: number
  isDownbeat: boolean
}

interface MusicalPhrase {
  rootNote: string
  scaleType: string
  chordProgression: string[]
  rhythmPattern: number[]
  barLength: number
}

interface MidiNoteEvent {
  time: number
  duration: number
  note: number
  velocity: number
  channel: number
}

interface AudioAnalysisResult {
  bpm: number
  beatTimes: number[]
  onsets: number[]
  energy: number[]
  key: string
}

export class NoteGenerator {
  private bpm: number
  private duration: number
  private beatInterval: number
  private levelConfig: LevelConfig
  private phrases: MusicalPhrase[] = []
  private beatPatterns: BeatPattern[] = []
  private midiEvents: MidiNoteEvent[] = []
  private audioAnalysis: AudioAnalysisResult | null = null

  constructor(levelConfig: LevelConfig) {
    this.levelConfig = levelConfig
    this.bpm = levelConfig.bpm
    this.duration = levelConfig.duration
    this.beatInterval = 60000 / this.bpm

    this.buildMusicalPhrases()
    this.simulateAudioAnalysis()
    this.buildBeatPatterns()
    this.simulateMidiParsing()
  }

  private buildMusicalPhrases(): void {
    const difficulty = this.levelConfig.difficulty

    const phraseSets: Record<string, MusicalPhrase[]> = {
      easy: [
        {
          rootNote: 'C',
          scaleType: 'major',
          chordProgression: ['C', 'Am', 'F', 'G'],
          rhythmPattern: [1, 0, 0.5, 0, 1, 0, 0.5, 0],
          barLength: 4
        },
        {
          rootNote: 'G',
          scaleType: 'major',
          chordProgression: ['G', 'Em', 'C', 'D'],
          rhythmPattern: [1, 0, 1, 0, 0.5, 0.5, 1, 0],
          barLength: 4
        }
      ],
      normal: [
        {
          rootNote: 'A',
          scaleType: 'minor',
          chordProgression: ['Am', 'Dm', 'E', 'Am'],
          rhythmPattern: [1, 0.5, 0.5, 0, 1, 0.5, 0.5, 0],
          barLength: 4
        },
        {
          rootNote: 'D',
          scaleType: 'minor',
          chordProgression: ['Dm', 'Bb', 'C', 'Dm'],
          rhythmPattern: [0.5, 0.5, 1, 0, 0.5, 0.5, 1, 0],
          barLength: 4
        }
      ],
      hard: [
        {
          rootNote: 'C#',
          scaleType: 'diminished',
          chordProgression: ['C#dim', 'F#dim', 'Adim', 'C#dim'],
          rhythmPattern: [0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0],
          barLength: 4
        },
        {
          rootNote: 'B',
          scaleType: 'wholetone',
          chordProgression: ['B', 'C#', 'D#', 'F'],
          rhythmPattern: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
          barLength: 4
        }
      ]
    }

    this.phrases = phraseSets[difficulty] || phraseSets.easy
  }

  private simulateAudioAnalysis(): void {
    const totalSamples = Math.floor(this.duration * 60)
    const energy: number[] = []
    const onsets: number[] = []

    for (let i = 0; i < totalSamples; i++) {
      const baseEnergy = 0.3 + Math.sin(i * 0.1) * 0.2
      const beatPulse = Math.sin((i * Math.PI * 2 * this.bpm) / 3600) * 0.3
      energy.push(Math.min(1, Math.max(0, baseEnergy + beatPulse + Math.random() * 0.2)))

      if (i % Math.floor(60 / this.bpm) === 0) {
        onsets.push((i / 60) * 1000)
      }
    }

    const beatTimes: number[] = []
    for (let beat = 0; beat < this.duration * this.bpm / 60; beat++) {
      beatTimes.push(beat * this.beatInterval)
    }

    this.audioAnalysis = {
      bpm: this.bpm,
      beatTimes,
      onsets,
      energy,
      key: this.phrases[0]?.rootNote || 'C'
    }
  }

  private buildBeatPatterns(): void {
    this.beatPatterns = []
    const totalBeats = Math.floor((this.duration * 1000) / this.beatInterval)
    const subdivision = this.levelConfig.difficulty === 'hard' ? 2 : 1

    for (let beat = 0; beat < totalBeats; beat++) {
      const time = beat * this.beatInterval
      const beatInBar = beat % 4

      let intensity = 0.5
      if (beatInBar === 0) intensity = 1.0
      else if (beatInBar === 2) intensity = 0.8

      const isDownbeat = beatInBar === 0

      this.beatPatterns.push({ time, intensity, subdivision, isDownbeat })

      if (subdivision >= 2) {
        const offBeatTime = time + this.beatInterval / 2
        if (offBeatTime < this.duration * 1000) {
          this.beatPatterns.push({
            time: offBeatTime,
            intensity: intensity * 0.4,
            subdivision: 2,
            isDownbeat: false
          })
        }
      }
    }
  }

  private simulateMidiParsing(): void {
    this.midiEvents = []
    const totalBeats = Math.floor((this.duration * 1000) / this.beatInterval)

    if (tonalLoaded && Tonal) {
      const phrase = this.phrases[0]
      let scaleNotes: string[] = []
      try {
        scaleNotes = Tonal.Scale.get(`${phrase.rootNote} ${phrase.scaleType}`).notes || []
      } catch (e) {
        console.warn('Tonal Scale.get failed, using fallback:', e)
        scaleNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
      }

      for (let beat = 0; beat < totalBeats; beat++) {
        if (Math.random() < 0.7) {
          const time = beat * this.beatInterval
          const duration = this.beatInterval * (Math.random() > 0.5 ? 1 : 0.5)
          const noteIndex = Math.floor(Math.random() * Math.min(scaleNotes.length, 12))
          const noteName = scaleNotes[noteIndex] || 'C'
          const octave = 4 + Math.floor(Math.random() * 2)

          let midiNote = 60
          try {
            midiNote = Tonal.Note.midi(`${noteName}${octave}`) || 60
          } catch (e) {
            midiNote = 60 + noteIndex
          }

          this.midiEvents.push({
            time,
            duration,
            note: midiNote,
            velocity: 0.5 + Math.random() * 0.5,
            channel: 0
          })
        }
      }
    } else {
      for (let beat = 0; beat < totalBeats; beat++) {
        if (Math.random() < 0.7) {
          this.midiEvents.push({
            time: beat * this.beatInterval,
            duration: this.beatInterval,
            note: 60 + Math.floor(Math.random() * 12),
            velocity: 0.5 + Math.random() * 0.5,
            channel: 0
          })
        }
      }
    }
  }

  generateNotes(): Note[] {
    const notes: Note[] = []
    const totalBeats = Math.floor((this.duration * 1000) / this.beatInterval)
    const phrase = this.phrases[0]
    const rhythmPattern = phrase.rhythmPattern

    let scaleNotes: string[] = []
    if (tonalLoaded && Tonal) {
      try {
        const scaleName = `${phrase.rootNote} ${phrase.scaleType}`
        scaleNotes = Tonal.Scale.get(scaleName).notes || []
      } catch (e) {
        console.warn('Tonal Scale.get failed in generateNotes:', e)
        scaleNotes = []
      }
    }

    if (scaleNotes.length === 0 || !tonalLoaded) {
      return this.fallbackGenerateNotes()
    }

    if (this.midiEvents.length > 0) {
      return this.generateNotesFromMidi(scaleNotes)
    }

    for (let beat = 4; beat < totalBeats - 4; beat++) {
      const time = beat * this.beatInterval
      const rhythmIndex = beat % rhythmPattern.length
      const rhythmValue = rhythmPattern[rhythmIndex]

      if (rhythmValue <= 0) continue

      if (Math.random() > rhythmValue + 0.2) continue

      const chordIndex = Math.floor((beat / 4) % phrase.chordProgression.length)
      const chordName = phrase.chordProgression[chordIndex]

      let chordNotes: string[] = []
      try {
        chordNotes = Tonal.Chord.get(chordName).notes || []
      } catch (e) {
        console.warn('Tonal Chord.get failed:', e)
        chordNotes = []
      }

      const useChordTone = Math.random() < 0.6
      let pitch: string

      if (useChordTone && chordNotes.length > 0) {
        const noteIndex = Math.floor(Math.random() * chordNotes.length)
        const octave = 4 + Math.floor(Math.random() * 2)
        try {
          pitch = Tonal.Note.transpose(chordNotes[noteIndex], Tonal.Interval.fromSemitones(octave * 12))
        } catch (e) {
          pitch = `${chordNotes[noteIndex]}${octave}`
        }
      } else {
        const noteIndex = Math.floor(Math.random() * scaleNotes.length)
        const octave = 4 + Math.floor(Math.random() * 2)
        try {
          pitch = Tonal.Note.transpose(scaleNotes[noteIndex], Tonal.Interval.fromSemitones(octave * 12))
        } catch (e) {
          pitch = `${scaleNotes[noteIndex]}${octave}`
        }
      }

      const lane = this.pickLane(beat, this.levelConfig.difficulty)
      const isBonus = beat % 8 === 0 && Math.random() < 0.5

      notes.push({
        id: uuidv4(),
        time,
        lane,
        type: isBonus ? 'bonus' : 'normal',
        pitch,
        collected: false,
        perfect: false
      })

      if (this.levelConfig.difficulty !== 'easy' && beat % 2 === 0 && Math.random() < 0.3) {
        const offBeatLane = this.pickLane(beat + 1, this.levelConfig.difficulty)
        const offBeatNoteIdx = Math.floor(Math.random() * scaleNotes.length)
        let offBeatPitch: string
        try {
          offBeatPitch = Tonal.Note.transpose(
            scaleNotes[offBeatNoteIdx],
            Tonal.Interval.fromSemitones(5 * 12)
          )
        } catch (e) {
          offBeatPitch = `${scaleNotes[offBeatNoteIdx]}5`
        }

        notes.push({
          id: uuidv4(),
          time: time + this.beatInterval * 0.5,
          lane: offBeatLane,
          type: 'normal',
          pitch: offBeatPitch,
          collected: false,
          perfect: false
        })
      }
    }

    return notes.sort((a, b) => a.time - b.time)
  }

  private generateNotesFromMidi(scaleNotes: string[]): Note[] {
    const notes: Note[] = []

    for (const midiEvent of this.midiEvents) {
      if (midiEvent.time < 4 * this.beatInterval || midiEvent.time > (this.duration - 4) * 1000) {
        continue
      }

      const lane = this.pickLane(Math.floor(midiEvent.time / this.beatInterval), this.levelConfig.difficulty)
      const isBonus = midiEvent.velocity > 0.8 && Math.random() < 0.3

      let pitch: string
      try {
        pitch = Tonal.Note.fromMidi(midiEvent.note) || `C${Math.floor(midiEvent.note / 12)}`
      } catch (e) {
        pitch = `C${Math.floor(midiEvent.note / 12)}`
      }

      notes.push({
        id: uuidv4(),
        time: midiEvent.time,
        lane,
        type: isBonus ? 'bonus' : 'normal',
        pitch,
        collected: false,
        perfect: false
      })
    }

    return notes.sort((a, b) => a.time - b.time)
  }

  private pickLane(beat: number, difficulty: string): number {
    const beatInBar = beat % 4

    if (difficulty === 'easy') {
      if (beatInBar === 0) return 1
      return Math.floor(Math.random() * 3)
    }

    if (difficulty === 'normal') {
      const pattern = [0, 2, 1, 0]
      if (Math.random() < 0.7) return pattern[beatInBar]
      return Math.floor(Math.random() * 3)
    }

    return Math.floor(Math.random() * 3)
  }

  private getScaleName(): string {
    const phrase = this.phrases[0]
    return `${phrase.rootNote} ${phrase.scaleType}`
  }

  private fallbackGenerateNotes(): Note[] {
    const notes: Note[] = []
    const totalBeats = Math.floor((this.duration * 1000) / this.beatInterval)
    const fallbackNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']

    for (let beat = 4; beat < totalBeats - 4; beat++) {
      const spawnChance = this.levelConfig.difficulty === 'easy' ? 0.5
        : this.levelConfig.difficulty === 'normal' ? 0.65
        : 0.8

      if (Math.random() < spawnChance) {
        notes.push({
          id: uuidv4(),
          time: beat * this.beatInterval,
          lane: Math.floor(Math.random() * 3),
          type: beat % 8 === 0 && Math.random() < 0.3 ? 'bonus' : 'normal',
          pitch: fallbackNotes[Math.floor(Math.random() * fallbackNotes.length)],
          collected: false,
          perfect: false
        })
      }

      if (this.levelConfig.difficulty !== 'easy' && beat % 2 === 0 && Math.random() < 0.3) {
        notes.push({
          id: uuidv4(),
          time: beat * this.beatInterval + this.beatInterval * 0.5,
          lane: Math.floor(Math.random() * 3),
          type: 'normal',
          pitch: fallbackNotes[Math.floor(Math.random() * fallbackNotes.length)],
          collected: false,
          perfect: false
        })
      }
    }

    return notes.sort((a, b) => a.time - b.time)
  }

  getBeatTimes(): number[] {
    return this.beatPatterns.map((bp) => bp.time)
  }

  getBeatPatterns(): BeatPattern[] {
    return [...this.beatPatterns]
  }

  getBeatInterval(): number {
    return this.beatInterval
  }

  getBpm(): number {
    return this.bpm
  }

  getMusicalPhrases(): MusicalPhrase[] {
    return [...this.phrases]
  }

  getScaleNotes(): string[] {
    if (!tonalLoaded || !Tonal) {
      return ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    }
    try {
      return Tonal.Scale.get(this.getScaleName()).notes || ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    } catch (e) {
      return ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    }
  }

  getMidiEvents(): MidiNoteEvent[] {
    return [...this.midiEvents]
  }

  getAudioAnalysis(): AudioAnalysisResult | null {
    return this.audioAnalysis ? { ...this.audioAnalysis } : null
  }

  isTonalLoaded(): boolean {
    return tonalLoaded
  }

  getTonalLoadError(): Error | null {
    return tonalLoadError
  }

  analyzeRhythmDensity(): { averageNotesPerBeat: number; peakDensity: number } {
    const totalBeats = Math.floor((this.duration * 1000) / this.beatInterval)
    const notesPerBeat = new Map<number, number>()

    for (let i = 0; i < totalBeats; i++) {
      notesPerBeat.set(i, 0)
    }

    const notes = this.generateNotes()
    for (const note of notes) {
      const beatIndex = Math.floor(note.time / this.beatInterval)
      notesPerBeat.set(beatIndex, (notesPerBeat.get(beatIndex) || 0) + 1)
    }

    const counts = Array.from(notesPerBeat.values())
    const average = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length)
    const peak = Math.max(0, ...counts)

    return { averageNotesPerBeat: average, peakDensity: peak }
  }

  generateChordProgression(): string[] {
    const phrase = this.phrases[0]
    return [...phrase.chordProgression]
  }
}
