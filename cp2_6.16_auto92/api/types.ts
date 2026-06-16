export type Genre = '动作' | '喜剧' | '科幻' | '悬疑' | '动画'

export interface Movie {
  id: string
  title: string
  posterEmoji: string
  posterColor: string
  duration: number
  genre: Genre
  synopsis: string
}

export interface Schedule {
  id: string
  movieId: string
  startTime: string
  endTime: string
  votingDeadline: string
  isVotingClosed: boolean
  createdAt: string
}

export interface Vote {
  id: string
  scheduleId: string
  userId: string
  movieId: string
  createdAt: string
}

export interface VoteResult {
  movieId: string
  count: number
}
