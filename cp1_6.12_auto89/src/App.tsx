import { useState, useEffect, useCallback, useRef } from 'react'
import Lobby from './components/Lobby'
import Game from './components/Game'
import type { WSMessage, Direction, SkillType } from '../shared/types'

export interface RoomInfo {
  id: string
  hostId: string
  players: { id: string; nickname: string; ready: boolean; color: string }[]
  config: {
    maxPlayers: number
    gridSize: number
    skillsEnabled: boolean
  }
  status: string
}

export interface GameStateData {
  players: {
    id: string
    nickname: string
    snake: { x: number; y: number }[]
    direction: Direction
    color: string
    alive: boolean
    score: number
    skill: SkillType | null
    skillCooldown: number
    speedBoost: boolean
    invisible: boolean
  }[]
  foods: { x: number; y: number; type: 'apple' | 'gem' }[]
  skillRunes: { x: number; y: number; type: SkillType }[]
  traps: { x: number; y: number; ownerId: string; duration: number }[]
  lasers: {
    startX: number
    startY: number
    direction: Direction
    length: number
    ownerId: string
    duration: number
  }[]
  gridSize: number
  gameOver: boolean
  winner: string | null
  tickCount: number
}

type Screen = 'lobby' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('lobby')
  const [connected, setConnected] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const [gameState, setGameState] = useState<GameStateData | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [winner, setWinner] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map())

  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:8080`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      const savedId = localStorage.getItem('playerId')
      if (savedId) {
        setPlayerId(savedId)
      }
    }

    ws.onclose = () => {
      setConnected(false)
    }

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        const handler = messageHandlers.current.get(message.type)
        if (handler) {
          handler(message.data)
        }
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }

    return () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    messageHandlers.current.set('room_info', (data: RoomInfo) => {
      setRoomInfo(data)
      if (data.status === 'playing') {
        setScreen('game')
      }
    })

    messageHandlers.current.set('left_room', () => {
      setRoomInfo(null)
      setScreen('lobby')
    })

    messageHandlers.current.set('countdown', (data: { count: number }) => {
      setCountdown(data.count)
    })

    messageHandlers.current.set('game_state', (data: GameStateData) => {
      setGameState(data)
    })

    messageHandlers.current.set('game_over', (data: { winner: string }) => {
      setWinner(data.winner)
    })

    messageHandlers.current.set('error', (data: { message: string }) => {
      alert(data.message)
    })
  }, [])

  const sendMessage = useCallback((type: string, data?: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }))
    }
  }, [])

  const createRoom = useCallback((nick: string) => {
    setNickname(nick)
    const id = playerId || Math.random().toString(36).substring(2, 10)
    if (!playerId) {
      setPlayerId(id)
      localStorage.setItem('playerId', id)
    }
    sendMessage('create_room', { nickname: nick })
  }, [sendMessage, playerId])

  const joinRoom = useCallback((roomId: string, nick: string) => {
    setNickname(nick)
    const id = playerId || Math.random().toString(36).substring(2, 10)
    if (!playerId) {
      setPlayerId(id)
      localStorage.setItem('playerId', id)
    }
    sendMessage('join_room', { roomId, nickname: nick })
  }, [sendMessage, playerId])

  const leaveRoom = useCallback(() => {
    sendMessage('leave_room')
    setRoomInfo(null)
    setGameState(null)
    setCountdown(null)
    setWinner(null)
    setScreen('lobby')
  }, [sendMessage])

  const setReady = useCallback((ready: boolean) => {
    sendMessage('player_ready', { ready })
  }, [sendMessage])

  const updateConfig = useCallback((config: any) => {
    sendMessage('update_config', config)
  }, [sendMessage])

  const startGame = useCallback(() => {
    sendMessage('start_game')
  }, [sendMessage])

  const sendDirection = useCallback((direction: Direction) => {
    sendMessage('player_input', { direction })
  }, [sendMessage])

  const useSkill = useCallback(() => {
    sendMessage('use_skill')
  }, [sendMessage])

  const exitToLobby = useCallback(() => {
    leaveRoom()
  }, [leaveRoom])

  return (
    <div className="app">
      {screen === 'lobby' && (
        <Lobby
          connected={connected}
          roomInfo={roomInfo}
          playerId={playerId}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onLeaveRoom={leaveRoom}
          onSetReady={setReady}
          onUpdateConfig={updateConfig}
          onStartGame={startGame}
        />
      )}
      {screen === 'game' && gameState && (
        <Game
          gameState={gameState}
          playerId={playerId || ''}
          roomInfo={roomInfo}
          countdown={countdown}
          winner={winner}
          onSendDirection={sendDirection}
          onUseSkill={useSkill}
          onExit={exitToLobby}
        />
      )}
    </div>
  )
}
