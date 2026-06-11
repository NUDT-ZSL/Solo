import { v4 as uuidv4 } from 'uuid'

export interface VoteOption {
  id: string
  text: string
  count: number
}

export interface Vote {
  id: string
  title: string
  options: VoteOption[]
  type: 'single' | 'multiple'
  duration: number
  active: boolean
  startTime: number
}

export interface BarrageMessage {
  id: string
  text: string
  color: string
  socketId: string
  timestamp: number
}

export interface ActivityState {
  currentVote: Vote | null
  emojiRainActive: boolean
  emojiRainType: string | null
  barrageHistory: BarrageMessage[]
}

export const state: ActivityState = {
  currentVote: null,
  emojiRainActive: false,
  emojiRainType: null,
  barrageHistory: [],
}

export function createVote(
  title: string,
  options: string[],
  type: 'single' | 'multiple',
  duration: number,
  onEnd: (voteId: string, winnerId: string | null) => void,
): Vote {
  const vote: Vote = {
    id: uuidv4(),
    title,
    options: options.map((text) => ({
      id: uuidv4(),
      text,
      count: 0,
    })),
    type,
    duration,
    active: true,
    startTime: Date.now(),
  }

  state.currentVote = vote

  setTimeout(() => {
    if (state.currentVote && state.currentVote.id === vote.id) {
      vote.active = false
      const winnerId = getWinnerId(vote)
      onEnd(vote.id, winnerId)
    }
  }, duration * 1000)

  return vote
}

export function castVote(voteId: string, optionId: string): Vote | null {
  if (!state.currentVote || state.currentVote.id !== voteId || !state.currentVote.active) {
    return null
  }

  const option = state.currentVote.options.find((o) => o.id === optionId)
  if (!option) {
    return null
  }

  option.count += 1
  return state.currentVote
}

export function getWinnerId(vote: Vote): string | null {
  if (vote.options.length === 0) return null
  const sorted = [...vote.options].sort((a, b) => b.count - a.count)
  if (sorted[0].count === 0) return null
  return sorted[0].id
}

export function getFullState(): ActivityState {
  return { ...state }
}
