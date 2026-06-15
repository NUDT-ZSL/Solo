export type Category = 'all' | 'work' | 'life'

export interface NoteCard {
  id: string
  text: string
  audioPath: string
  duration: number
  category: Exclude<Category, 'all'>
  createdAt: number
  waveform: number[]
}
