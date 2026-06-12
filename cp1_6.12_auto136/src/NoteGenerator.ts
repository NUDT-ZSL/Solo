import { Note, LevelConfig } from './types'
import { v4 as uuidv4 } from 'uuid'
import { Scale, Note as TonalNote, Interval } from 'tonal'

export class NoteGenerator {
  private bpm: number
  private duration: number
  private beatInterval: number
  private scale: string[]

  constructor(levelConfig: LevelConfig) {
    this.bpm = levelConfig.bpm
    this.duration = levelConfig.duration
    this.beatInterval = 60000 / this.bpm
    this.scale = this.getScaleForDifficulty(levelConfig.difficulty)
  }

  private getScaleForDifficulty(difficulty: string): string[] {
    switch (difficulty) {
      case 'easy':
        return Scale.get('C major').notes
      case 'normal':
        return Scale.get('A minor').notes
      case 'hard':
        return Scale.get('C# diminished').notes
      default:
        return Scale.get('C major').notes
    }
  }

  generateNotes(): Note[] {
    const notes: Note[] = []
    const totalBeats = Math.floor((this.duration * 1000) / this.beatInterval)

    for (let beat = 4; beat < totalBeats - 4; beat++) {
      const time = beat * this.beatInterval

      const noteChance = 0.6 + Math.sin(beat * 0.1) * 0.3
      if (Math.random() < noteChance) {
        const lane = Math.floor(Math.random() * 3)
        const isBonus = beat % 8 === 0 && Math.random() < 0.5
        const scaleIndex = Math.floor(Math.random() * this.scale.length)
        const octave = 4 + Math.floor(Math.random() * 2)
        const pitch = TonalNote.transpose(this.scale[scaleIndex], Interval.fromSemitones(octave * 12))

        notes.push({
          id: uuidv4(),
          time,
          lane,
          type: isBonus ? 'bonus' : 'normal',
          pitch,
          collected: false,
          perfect: false
        })
      }

      if (beat % 2 === 0 && Math.random() < 0.3) {
        const lane = Math.floor(Math.random() * 3)
        const scaleIndex = Math.floor(Math.random() * this.scale.length)
        const pitch = TonalNote.transpose(this.scale[scaleIndex], Interval.fromSemitones(5 * 12))

        notes.push({
          id: uuidv4(),
          time: time + this.beatInterval * 0.5,
          lane,
          type: 'normal',
          pitch,
          collected: false,
          perfect: false
        })
      }
    }

    return notes.sort((a, b) => a.time - b.time)
  }

  getBeatTimes(): number[] {
    const totalBeats = Math.floor((this.duration * 1000) / this.beatInterval)
    const beats: number[] = []
    for (let i = 0; i < totalBeats; i++) {
      beats.push(i * this.beatInterval)
    }
    return beats
  }

  getBeatInterval(): number {
    return this.beatInterval
  }

  getBpm(): number {
    return this.bpm
  }
}
