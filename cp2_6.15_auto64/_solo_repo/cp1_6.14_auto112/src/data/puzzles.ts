import { PuzzleData } from '../types'

export const puzzles: PuzzleData[] = [
  {
    id: 1,
    name: '日落渐变',
    rows: 2,
    cols: 5,
    colors: [
      '#f38b48', '#fab387', '#f9e2af', '#a6e3a1', '#89b4fa',
      '#cba6f7', '#f5c2e7', '#eba0ac', '#f38b48', '#fab387'
    ]
  },
  {
    id: 2,
    name: '森林幻境',
    rows: 2,
    cols: 5,
    colors: [
      '#a6e3a1', '#40a02b', '#89b4fa', '#585b70', '#a6e3a1',
      '#40a02b', '#9399b2', '#a6e3a1', '#40a02b', '#89dceb'
    ]
  },
  {
    id: 3,
    name: '霓虹夜空',
    rows: 2,
    cols: 5,
    colors: [
      '#cba6f7', '#89b4fa', '#f5c2e7', '#cba6f7', '#74c7ec',
      '#89b4fa', '#b4befe', '#cba6f7', '#f5c2e7', '#89b4fa'
    ]
  },
  {
    id: 4,
    name: '沙漠余晖',
    rows: 2,
    cols: 5,
    colors: [
      '#f38b48', '#fab387', '#f9e2af', '#f38b48', '#eba0ac',
      '#fab387', '#f9e2af', '#f38b48', '#fab387', '#cba6f7'
    ]
  },
  {
    id: 5,
    name: '海洋深处',
    rows: 2,
    cols: 5,
    colors: [
      '#89b4fa', '#74c7ec', '#89dceb', '#94e2d5', '#89b4fa',
      '#74c7ec', '#89dceb', '#a6e3a1', '#89b4fa', '#74c7ec'
    ]
  }
]

export const PIECE_SIZE = 80
export const SNAP_THRESHOLD = 20
export const SCORE_PER_PIECE = 10
export const HINT_PENALTY = 5
export const PARTICLE_COLORS = ['#f38b48', '#a6e3a1', '#89b4fa', '#cba6f7', '#fab387']
