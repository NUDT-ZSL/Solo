import Datastore from 'nedb-promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface VoteOption {
  id: string
  text: string
  votes: number
}

export interface Vote {
  _id?: string
  title: string
  options: VoteOption[]
  duration: number
  status: 'pending' | 'active' | 'ended'
  createdAt: number
  startedAt?: number
  endedAt?: number
  totalVotes: number
}

export interface VoteResult {
  _id?: string
  voteId: string
  optionId: string
  voterId: string
  timestamp: number
}

const votesDb = Datastore.create(join(__dirname, '../../data/votes.db'))
const resultsDb = Datastore.create(join(__dirname, '../../data/results.db'))

await votesDb.load()
await resultsDb.load()

export const database = {
  async createVote(title: string, options: string[], duration: number): Promise<Vote> {
    const voteOptions: VoteOption[] = options.map(text => ({
      id: uuidv4(),
      text,
      votes: 0
    }))

    const vote: Vote = {
      title,
      options: voteOptions,
      duration,
      status: 'pending',
      createdAt: Date.now(),
      totalVotes: 0
    }

    const result = await votesDb.insert(vote)
    return result as Vote
  },

  async getVote(id: string): Promise<Vote | null> {
    return await votesDb.findOne({ _id: id }) as Vote | null
  },

  async getAllVotes(): Promise<Vote[]> {
    return await votesDb.find({}).sort({ createdAt: -1 }) as Vote[]
  },

  async startVote(id: string): Promise<Vote | null> {
    const vote = await this.getVote(id)
    if (!vote) return null

    const updated = await votesDb.update(
      { _id: id },
      { $set: { status: 'active', startedAt: Date.now() } },
      { returnUpdatedDocs: true }
    )
    return updated as unknown as Vote
  },

  async stopVote(id: string): Promise<Vote | null> {
    const vote = await this.getVote(id)
    if (!vote) return null

    const updated = await votesDb.update(
      { _id: id },
      { $set: { status: 'ended', endedAt: Date.now() } },
      { returnUpdatedDocs: true }
    )
    return updated as unknown as Vote
  },

  async castVote(voteId: string, optionId: string, voterId: string): Promise<Vote | null> {
    const existingVote = await resultsDb.findOne({ voteId, voterId })
    if (existingVote) {
      return await this.getVote(voteId)
    }

    const result: VoteResult = {
      voteId,
      optionId,
      voterId,
      timestamp: Date.now()
    }
    await resultsDb.insert(result)

    const vote = await this.getVote(voteId)
    if (!vote) return null

    const optionIndex = vote.options.findIndex(o => o.id === optionId)
    if (optionIndex === -1) return vote

    const updated = await votesDb.update(
      { _id: voteId },
      {
        $inc: {
          [`options.${optionIndex}.votes`]: 1,
          totalVotes: 1
        }
      },
      { returnUpdatedDocs: true }
    )
    return updated as unknown as Vote
  },

  async getVoteResults(voteId: string): Promise<VoteResult[]> {
    return await resultsDb.find({ voteId }) as VoteResult[]
  },

  async deleteVote(id: string): Promise<number> {
    await resultsDb.remove({ voteId: id }, { multi: true })
    return await votesDb.remove({ _id: id })
  }
}
