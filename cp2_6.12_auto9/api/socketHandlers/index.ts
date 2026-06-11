import type { Server } from 'socket.io'
import { castVote, state } from '../state.js'
import { v4 as uuidv4 } from 'uuid'

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.emit('state_sync', {
      currentVote: state.currentVote,
      emojiRainActive: state.emojiRainActive,
      emojiRainType: state.emojiRainType,
    })

    socket.on('vote', (data: { voteId: string; optionId: string }) => {
      const updated = castVote(data.voteId, data.optionId)
      if (updated) {
        io.emit('vote_update', updated)
      }
    })

    socket.on('send_barrage', (data: { text: string; color: string }) => {
      if (typeof data.text !== 'string' || data.text.length === 0 || data.text.length > 30) {
        return
      }
      if (typeof data.color !== 'string') {
        return
      }

      const msg = {
        id: uuidv4(),
        text: data.text,
        color: data.color,
        socketId: socket.id,
        timestamp: Date.now(),
      }
      state.barrageHistory.push(msg)
      if (state.barrageHistory.length > 100) {
        state.barrageHistory = state.barrageHistory.slice(-100)
      }
      io.emit('barrage', msg)
    })

    socket.on('trigger_emoji_rain', (data: { type: string }) => {
      const validEmojis = ['❤️', '🎉', '🔥']
      if (!validEmojis.includes(data.type)) {
        return
      }

      state.emojiRainActive = true
      state.emojiRainType = data.type

      io.emit('emoji_rain', { type: data.type })

      setTimeout(() => {
        state.emojiRainActive = false
        state.emojiRainType = null
      }, 15_000)
    })
  })
}
