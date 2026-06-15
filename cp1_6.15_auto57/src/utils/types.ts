export interface BeatPoint {
  time: number
  color: string
}

export interface BeatSequence {
  id: string
  points: BeatPoint[]
  color: string
  name: string
}
