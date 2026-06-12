import { Note, LevelConfig } from './types'
import { v4 as uuidv4 } from 'uuid'
import { Scale, Note as TonalNote, Interval, Chord, Pcset } from 'tonal'

interface BeatPattern {
  time: number
  intensity: number
  subdivision: number
}

interface MusicalPhrase {
  rootNote: string
  scaleType: string
  chordProgression: string[]
  rhythmPattern: number[]
}

export class NoteGenerator {
  private bpm: number
  private duration: number
  private beatInterval: number
  private levelConfig: LevelConfig
  private phrases: MusicalPhrase[] = []
  private beatPatterns: BeatPattern[] = []

  constructor(levelConfig: LevelConfig) {
    this.levelConfig = levelConfig
    this.bpm = levelConfig.bpm
    this.duration = levelConfig.duration
    this.beatInterval = 60000 / this.bpm
    this.buildMusicalPhrases()
    this.buildBeatPatterns()
  }

  private buildMusicalPhrases(): void {
    const difficulty = this.levelConfig.difficulty

    const phraseSets: Record<string, MusicalPhrase[]> = {
      easy: [
        {
          rootNote: 'C',
          scaleType: 'major',
          chordProgression: ['C', 'Am', 'F', 'G'],
          rhythmPattern: [1, 0, 0.5, 0, 1, 0, 0.5, 0]
        },
        {
          rootNote: 'G',
          scaleType: 'major',
          chordProgression: ['G', 'Em', 'C', 'D'],
          rhythmPattern: [1, 0, 1, 0, 0.5, 0.5, 1, 0]
        }
      ],
      normal: [
        {
          rootNote: 'A',
          scaleType: 'minor',
          chordProgression: ['Am', 'Dm', 'E', 'Am'],
          rhythmPattern: [1, 0.5, 0.5, 0, 1, 0.5, 0.5, 0]
        },
        {
          rootNote: 'D',
          scaleType: 'minor',
          chordProgression: ['Dm', 'Bb', 'C', 'Dm'],
          rhythmPattern: [0.5, 0.5, 1, 0, 0.5, 0.5, 1, 0]
        }
      ],
      hard: [
        {
          rootNote: 'C#',
          scaleType: 'diminished',
          chordProgression: ['C#dim', 'F#dim', 'Adim', 'C#dim'],
          rhythmPattern: [0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0]
        },
        {
          rootNote: 'B',
          scaleType: 'wholetone',
          chordProgression: ['B', 'C#', 'D#', 'F'],
          rhythmPattern: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
        }
      ]
    }

    this.phrases = phraseSets[difficulty] || phraseSets.easy
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

      this.beatPatterns.push({ time, intensity, subdivision })

      if (subdivision >= 2) {
        const offBeatTime = time + this.beatInterval / 2
        if (offBeatTime < this.duration * 1000) {
          this.beatPatterns.push({
            time: offBeatTime,
            intensity: intensity * 0.4,
            subdivision: 2
          })
        }
      }
    }
  }

  generateNotes(): Note[] {
    const notes: Note[] = []
    const totalBeats = Math.floor((this.duration * 1000) / this.beatInterval)
    const scaleName = this.getScaleName()
    const scaleNotes = Scale.get(scaleName).notes
    const phrase = this.phrases[0]
    const rhythmPattern = phrase.rhythmPattern

    if (scaleNotes.length === 0) {
      return this.fallbackGenerateNotes()
    }

    for (let beat = 4; beat < totalBeats - 4; beat++) {
      const time = beat * this.beatInterval
      const rhythmIndex = beat % rhythmPattern.length
      const rhythmValue = rhythmPattern[rhythmIndex]

      if (rhythmValue <= 0) continue

      if (Math.random() > rhythmValue + 0.2) continue

      const chordIndex = Math.floor((beat / 4) % phrase.chordProgression.length)
      const chordName = phrase.chordProgression[chordIndex]
      const chordNotes = Chord.get(chordName).notes

      const useChordTone = Math.random() < 0.6
      let pitch: string

      if (useChordTone && chordNotes.length > 0) {
        const noteIndex = Math.floor(Math.random() * chordNotes.length)
        const octave = 4 + Math.floor(Math.random() * 2)
        pitch = TonalNote.transpose(chordNotes[noteIndex], Interval.fromSemitones(octave * 12))
      } else {
        const noteIndex = Math.floor(Math.random() * scaleNotes.length)
        const octave = 4 + Math.floor(Math.random() * 2)
        pitch = TonalNote.transpose(scaleNotes[noteIndex], Interval.fromSemitones(octave * 12))
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
        const offBeatPitch = TonalNote.transpose(
          scaleNotes[offBeatNoteIdx],
          Interval.fromSemitones(5 * 12)
        )

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

    for (let beat = 4; beat < totalBeats - 4; beat++) {
      if (Math.random() < 0.5) {
        notes.push({
          id: uuidv4(),
          time: beat * this.beatInterval,
          lane: Math.floor(Math.random() * 3),
          type: 'normal',
          pitch: 'C4',
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
    return Scale.get(this.getScaleName()).notes
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
    const average = counts.reduce((a, b) => a + b, 0) / counts.length
    const peak = Math.max(...counts)

    return { averageNotesPerBeat: average, peakDensity: peak }
  }
}
