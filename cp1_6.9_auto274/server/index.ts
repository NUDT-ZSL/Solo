import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'
import {
  buildWordVectors,
  buildPoemTemplates,
  getBestMatchingTemplate,
  generatePoem,
  getTodayString,
  wordCategories,
  type VoteRecord,
  type CollisionRecord
} from './wordVector'

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json())

const wordVectors = buildWordVectors()
const poemTemplates = buildPoemTemplates()
const allWords = Array.from(wordVectors.keys())

const voteStore = new Map<string, VoteRecord>()
const collisionHistory: CollisionRecord[] = []
const topPoemPerPair = new Map<string, { poemId: string; poem: string; votes: number; cardIdToReplace: string }>()

const dailyReset = () => {
  const today = getTodayString()
  for (const [key, record] of voteStore) {
    if (record.date !== today) {
      voteStore.delete(key)
    }
  }
}

setInterval(dailyReset, 60 * 60 * 1000)

interface CollideRequest {
  word1: string
  word2: string
  card1Id: string
  card2Id: string
}

interface VoteRequest {
  poemId: string
  card1Id: string
  card2Id: string
  word1: string
  word2: string
  poem: string
  userId: string
}

app.get('/api/words', (_req, res) => {
  const shuffled = [...allWords].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, 30)
  res.json({
    success: true,
    words: selected,
    total: allWords.length
  })
})

app.get('/api/word-categories', (_req, res) => {
  res.json({
    success: true,
    categories: wordCategories
  })
})

app.post('/api/collide', (req, res) => {
  try {
    const { word1, word2, card1Id, card2Id }: CollideRequest = req.body

    if (!word1 || !word2) {
      return res.status(400).json({ success: false, error: '缺少词汇参数' })
    }

    const wv1 = wordVectors.get(word1)
    const wv2 = wordVectors.get(word2)

    if (!wv1 || !wv2) {
      return res.status(400).json({ success: false, error: '词汇不在词库中' })
    }

    const { template, similarity } = getBestMatchingTemplate(wv1, wv2, poemTemplates)
    const { poem, poemId } = generatePoem(word1, word2, template)

    const record: CollisionRecord = {
      id: uuidv4(),
      timestamp: Date.now(),
      word1,
      word2,
      poemId,
      poem,
      votes: 0
    }
    collisionHistory.unshift(record)
    if (collisionHistory.length > 100) {
      collisionHistory.length = 100
    }

    const voteKey = `${card1Id}_${card2Id}`
    if (!voteStore.has(voteKey)) {
      voteStore.set(voteKey, {
        poemId,
        card1Id,
        card2Id,
        count: 0,
        votedUsers: new Set(),
        date: getTodayString()
      })
    }

    res.json({
      success: true,
      poemId,
      poem,
      word1,
      word2,
      similarity: Number(similarity.toFixed(3)),
      templateId: template.id,
      historyId: record.id
    })
  } catch (err) {
    console.error('碰撞处理错误:', err)
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.post('/api/vote', (req, res) => {
  try {
    const { poemId, card1Id, card2Id, word1, word2, poem, userId }: VoteRequest = req.body

    if (!poemId || !card1Id || !card2Id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }

    const voteKey = `${card1Id}_${card2Id}`
    let record = voteStore.get(voteKey)
    const today = getTodayString()

    if (!record || record.date !== today) {
      record = {
        poemId,
        card1Id,
        card2Id,
        count: 0,
        votedUsers: new Set(),
        date: today
      }
      voteStore.set(voteKey, record)
    }

    if (record.votedUsers.has(userId)) {
      return res.json({
        success: false,
        error: '您已经为此诗投过票',
        newVoteCount: record.count,
        isTopPoem: false
      })
    }

    record.votedUsers.add(userId)
    record.count += 1
    record.poemId = poemId

    const historyRecord = collisionHistory.find(h => h.poemId === poemId)
    if (historyRecord) {
      historyRecord.votes = record.count
    }

    const pairKey = [card1Id, card2Id].sort().join('_')
    const currentTop = topPoemPerPair.get(pairKey)
    let isTopPoem = false
    let replacement: { cardId: string; newWord: string } | undefined

    if (!currentTop || record.count > currentTop.votes) {
      isTopPoem = true
      const replaceCard1 = Math.random() > 0.5
      const cardIdToReplace = replaceCard1 ? card1Id : card2Id
      const replacementPhrase = replaceCard1 ? poem.slice(0, Math.min(4, poem.length)) : poem.slice(-4)

      topPoemPerPair.set(pairKey, {
        poemId,
        poem,
        votes: record.count,
        cardIdToReplace
      })

      if (record.count >= 3) {
        const newWord = replacementPhrase.length >= 2 ? replacementPhrase : poem.slice(0, 2)
        replacement = {
          cardId: cardIdToReplace,
          newWord
        }
        if (!wordVectors.has(newWord)) {
          const baseWord = replaceCard1 ? word1 : word2
          const baseVec = wordVectors.get(baseWord)
          if (baseVec) {
            wordVectors.set(newWord, {
              word: newWord,
              vector: baseVec.vector.map(v => v + (Math.random() - 0.5) * 0.1),
              category: baseVec.category
            })
          }
        }
      }
    }

    res.json({
      success: true,
      newVoteCount: record.count,
      isTopPoem,
      replacement
    })
  } catch (err) {
    console.error('投票处理错误:', err)
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.get('/api/top-poems', (_req, res) => {
  const results = Array.from(topPoemPerPair.entries()).map(([pairKey, value]) => ({
    pairKey,
    ...value
  }))
  res.json({ success: true, data: results })
})

app.get('/api/history', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const recent = collisionHistory.slice(0, limit)
  res.json({
    success: true,
    data: recent.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      word1: r.word1,
      word2: r.word2,
      poemId: r.poemId,
      poem: r.poem,
      votes: r.votes
    }))
  })
})

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: '悬浮词典服务运行中',
    wordsCount: wordVectors.size,
    templatesCount: poemTemplates.length,
    historyCount: collisionHistory.length
  })
})

app.listen(PORT, () => {
  console.log(`\n🚀 悬浮词典服务已启动`)
  console.log(`📍 后端服务: http://localhost:${PORT}`)
  console.log(`📚 词库大小: ${wordVectors.size} 个词汇`)
  console.log(`📝 诗句模板: ${poemTemplates.length} 个模板\n`)
})
