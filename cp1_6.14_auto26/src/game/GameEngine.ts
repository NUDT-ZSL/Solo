import { Room, Player, GameState, GameEvent, Pedestal } from './types'
import {
  MAZE_COLS,
  MAZE_ROWS,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  JUMP_FORCE,
  GRAVITY,
  SEED,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  MAX_SHARDS,
} from './constants'
import { TimeLoopManager } from './TimeLoopManager'
import { PuzzleManager } from './PuzzleManager'
import { Renderer } from './Renderer'

class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  shuffleArray<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }
}

type StateListener = (state: GameEngineState) => void

export interface GameEngineState {
  currentRoom: Room
  player: Player
  gameState: GameState
  timeRemaining: number
  loopCount: number
  shardsCollected: string[]
  activePuzzleId: string | null
}

export class GameEngine {
  private canvas: HTMLCanvasElement
  private renderer: Renderer
  private timeLoopManager: TimeLoopManager
  private puzzleManager: PuzzleManager
  private rooms: Map<string, Room> = new Map()
  private player: Player
  private gameState: GameState
  private currentRoomId: string
  private animationId: number = 0
  private lastTime: number = 0
  private keys: Set<string> = new Set()
  private rng: SeededRandom
  private listeners: Set<StateListener> = new Set()
  private finalPedestalOrder: number[] = []
  private activatedPedestalOrder: number[] = []
  private isRunning: boolean = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new Renderer(canvas)
    this.timeLoopManager = new TimeLoopManager()
    this.puzzleManager = new PuzzleManager()
    this.rng = new SeededRandom(SEED)

    this.generateMaze()
    this.setupPuzzles()
    this.setupMemoryShards()
    this.setupFinalRoom()

    const startRoom = this.getStartRoom()
    this.currentRoomId = startRoom.id

    this.player = {
      x: ROOM_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: ROOM_HEIGHT - 48,
      vx: 0,
      vy: 0,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      onGround: false,
      facingRight: true,
      currentRoomId: startRoom.id,
      inventory: [],
    }

    this.gameState = {
      isPaused: false,
      isGameOver: false,
      isWin: false,
      showPuzzle: false,
      activePuzzleId: null,
      transitionAlpha: 0,
      flashAlpha: 0,
      flashCount: 0,
    }

    this.setupEventListeners()
  }

  private generateMaze(): void {
    const grid: (Room | null)[][] = []

    for (let y = 0; y < MAZE_ROWS; y++) {
      grid[y] = []
      for (let x = 0; x < MAZE_COLS; x++) {
        grid[y][x] = null
      }
    }

    const startX = 0
    const startY = Math.floor(MAZE_ROWS / 2)
    const visited = new Set<string>()
    const stack: { x: number; y: number }[] = []

    const startRoom: Room = {
      id: `room_${startX}_${startY}`,
      x: startX,
      y: startY,
      doors: { north: false, south: false, east: false, west: false },
      hasMemoryShard: false,
      shardCollected: false,
      isFinalRoom: false,
    }
    grid[startY][startX] = startRoom
    visited.add(`${startX},${startY}`)
    stack.push({ x: startX, y: startY })

    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const neighbors = this.getUnvisitedNeighbors(current.x, current.y, visited)

      if (neighbors.length === 0) {
        stack.pop()
        continue
      }

      const next = neighbors[this.rng.nextInt(0, neighbors.length - 1)]
      const currentRoom = grid[current.y][current.x]!

      const newRoom: Room = {
        id: `room_${next.x}_${next.y}`,
        x: next.x,
        y: next.y,
        doors: { north: false, south: false, east: false, west: false },
        hasMemoryShard: false,
        shardCollected: false,
        isFinalRoom: false,
      }

      if (next.direction === 'north') {
        currentRoom.doors.north = true
        newRoom.doors.south = true
      } else if (next.direction === 'south') {
        currentRoom.doors.south = true
        newRoom.doors.north = true
      } else if (next.direction === 'east') {
        currentRoom.doors.east = true
        newRoom.doors.west = true
      } else if (next.direction === 'west') {
        currentRoom.doors.west = true
        newRoom.doors.east = true
      }

      grid[next.y][next.x] = newRoom
      visited.add(`${next.x},${next.y}`)
      stack.push({ x: next.x, y: next.y })
    }

    for (let y = 0; y < MAZE_ROWS; y++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        const room = grid[y][x]
        if (room) {
          this.rooms.set(room.id, room)
        }
      }
    }
  }

  private getUnvisitedNeighbors(
    x: number,
    y: number,
    visited: Set<string>,
  ): { x: number; y: number; direction: string }[] {
    const neighbors: { x: number; y: number; direction: string }[] = []

    if (y > 0 && !visited.has(`${x},${y - 1}`)) {
      neighbors.push({ x, y: y - 1, direction: 'north' })
    }
    if (y < MAZE_ROWS - 1 && !visited.has(`${x},${y + 1}`)) {
      neighbors.push({ x, y: y + 1, direction: 'south' })
    }
    if (x < MAZE_COLS - 1 && !visited.has(`${x + 1},${y}`)) {
      neighbors.push({ x: x + 1, y, direction: 'east' })
    }
    if (x > 0 && !visited.has(`${x - 1},${y}`)) {
      neighbors.push({ x: x - 1, y, direction: 'west' })
    }

    return neighbors
  }

  private setupPuzzles(): void {
    const roomIds = Array.from(this.rooms.keys()).filter((id) => {
      const room = this.rooms.get(id)!
      return !(room.x === 0 && room.y === Math.floor(MAZE_ROWS / 2))
    })
    this.puzzleManager.generatePuzzles(roomIds)

    for (const puzzle of this.puzzleManager.getAllPuzzles()) {
      const room = this.rooms.get(puzzle.roomId)
      if (room) {
        room.puzzleId = puzzle.id
      }
    }
  }

  private setupMemoryShards(): void {
    const roomIds = Array.from(this.rooms.keys())
    const shuffled = this.rng.shuffleArray([...roomIds])
    const shardRooms = shuffled.slice(0, MAX_SHARDS)

    for (let i = 0; i < shardRooms.length; i++) {
      const room = this.rooms.get(shardRooms[i])
      if (room) {
        room.hasMemoryShard = true
      }
    }

    this.finalPedestalOrder = [1, 2, 3, 4, 5]
    for (let i = this.finalPedestalOrder.length - 1; i > 0; i--) {
      const j = this.rng.nextInt(0, i)
      ;[this.finalPedestalOrder[i], this.finalPedestalOrder[j]] = [
        this.finalPedestalOrder[j],
        this.finalPedestalOrder[i],
      ]
    }
  }

  private setupFinalRoom(): void {
    const centerX = Math.floor(MAZE_COLS / 2)
    const centerY = Math.floor(MAZE_ROWS / 2)
    const finalRoomId = `room_${centerX}_${centerY}`
    const finalRoom = this.rooms.get(finalRoomId)

    if (finalRoom) {
      finalRoom.isFinalRoom = true
      finalRoom.pedestals = []

      const positions = [
        { x: 40, y: 60 },
        { x: 120, y: 40 },
        { x: 200, y: 60 },
        { x: 80, y: 140 },
        { x: 180, y: 140 },
      ]

      for (let i = 0; i < 5; i++) {
        const pedestal: Pedestal = {
          id: i,
          x: positions[i].x,
          y: positions[i].y,
          activated: false,
          order: this.finalPedestalOrder[i],
        }
        finalRoom.pedestals.push(pedestal)
      }

      finalRoom.portalActive = false
    }
  }

  private getStartRoom(): Room {
    const startY = Math.floor(MAZE_ROWS / 2)
    return this.rooms.get(`room_0_${startY}`)!
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this))
    window.addEventListener('keyup', this.handleKeyUp.bind(this))
    window.addEventListener('resize', this.handleResize.bind(this))
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase()
    this.keys.add(key)

    if (key === 'e' && !this.gameState.showPuzzle) {
      this.tryInteract()
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase())
  }

  private handleResize(): void {
    this.renderer.resize()
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.gameLoop()
  }

  stop(): void {
    this.isRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }

  private gameLoop(): void {
    if (!this.isRunning) return

    const currentTime = performance.now()
    const deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime

    this.update(deltaTime)
    this.render()

    this.animationId = requestAnimationFrame(() => this.gameLoop())
  }

  private update(deltaTime: number): void {
    if (this.gameState.isPaused || this.gameState.isWin) return

    this.timeLoopManager.update(deltaTime, this.gameState.showPuzzle)
    this.updatePlayer()
    this.checkCollisions()
    this.checkRoomTransition()
    this.updateTransitionEffect(deltaTime)
    this.updateFlashEffect(deltaTime)
    this.notifyListeners()
  }

  private updatePlayer(): void {
    const room = this.rooms.get(this.currentRoomId)!
    const roomSize = this.renderer.getRoomSize()
    const wallThickness = 16

    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this.player.vx = -PLAYER_SPEED
      this.player.facingRight = false
    } else if (this.keys.has('d') || this.keys.has('arrowright')) {
      this.player.vx = PLAYER_SPEED
      this.player.facingRight = true
    } else {
      this.player.vx = 0
    }

    if ((this.keys.has('w') || this.keys.has('arrowup') || this.keys.has(' ')) && this.player.onGround) {
      this.player.vy = -JUMP_FORCE
      this.player.onGround = false
    }

    this.player.vy += GRAVITY

    if (this.player.vy > 12) {
      this.player.vy = 12
    }

    this.player.x += this.player.vx
    this.player.y += this.player.vy

    const groundY = roomSize.height - wallThickness - this.player.height
    if (this.player.y >= groundY) {
      this.player.y = groundY
      this.player.vy = 0
      this.player.onGround = true
    }

    if (this.player.y < wallThickness) {
      this.player.y = wallThickness
      this.player.vy = 0
    }

    if (this.player.x < wallThickness) {
      this.player.x = wallThickness
    }
    if (this.player.x > roomSize.width - wallThickness - this.player.width) {
      this.player.x = roomSize.width - wallThickness - this.player.width
    }
  }

  private checkCollisions(): void {
    const room = this.rooms.get(this.currentRoomId)!

    if (room.hasMemoryShard && !room.shardCollected) {
      const shardX = 32
      const shardY = this.renderer.getRoomSize().height - 40
      const shardSize = 10

      if (
        this.player.x < shardX + shardSize &&
        this.player.x + this.player.width > shardX &&
        this.player.y < shardY + shardSize &&
        this.player.y + this.player.height > shardY
      ) {
        this.collectShard()
      }
    }

    if (room.isFinalRoom && room.pedestals && !room.portalActive) {
      for (const pedestal of room.pedestals) {
        if (!pedestal.activated) {
          const px = pedestal.x
          const py = pedestal.y
          const ps = 20

          if (
            this.player.x < px + ps &&
            this.player.x + this.player.width > px &&
            this.player.y < py + ps &&
            this.player.y + this.player.height > py
          ) {
          }
        }
      }
    }

    if (room.isFinalRoom && room.portalActive) {
      const portalX = this.renderer.getRoomSize().width / 2 - 16
      const portalY = 60
      const portalW = 32
      const portalH = 48

      if (
        this.player.x < portalX + portalW &&
        this.player.x + this.player.width > portalX &&
        this.player.y < portalY + portalH &&
        this.player.y + this.player.height > portalY
      ) {
        this.winGame()
      }
    }
  }

  private collectShard(): void {
    const room = this.rooms.get(this.currentRoomId)!
    if (room.shardCollected) return

    const shardId = `shard_${room.id}`
    if (this.timeLoopManager.collectShard(shardId)) {
      room.shardCollected = true
      this.renderer.spawnShardParticles(32, this.renderer.getRoomSize().height - 40)
    }
  }

  private tryInteract(): void {
    const room = this.rooms.get(this.currentRoomId)!

    if (room.puzzleId) {
      const puzzle = this.puzzleManager.getPuzzle(room.puzzleId)
      if (puzzle && !puzzle.solved) {
        this.openPuzzle(room.puzzleId)
        return
      }
    }

    if (room.isFinalRoom && room.pedestals && this.timeLoopManager.checkAllShardsCollected()) {
      for (const pedestal of room.pedestals) {
        const px = pedestal.x
        const py = pedestal.y
        const ps = 20

        if (
          this.player.x < px + ps + 10 &&
          this.player.x + this.player.width > px - 10 &&
          this.player.y < py + ps + 10 &&
          this.player.y + this.player.height > py - 10
        ) {
          this.activatePedestal(pedestal)
          return
        }
      }
    }
  }

  private activatePedestal(pedestal: Pedestal): void {
    if (pedestal.activated) return

    const expectedOrder = this.activatedPedestalOrder.length + 1

    if (pedestal.order === expectedOrder) {
      pedestal.activated = true
      this.activatedPedestalOrder.push(pedestal.order)

      if (this.activatedPedestalOrder.length === 5) {
        const room = this.rooms.get(this.currentRoomId)!
        room.portalActive = true
      }
    } else {
      const room = this.rooms.get(this.currentRoomId)!
      if (room.pedestals) {
        for (const p of room.pedestals) {
          p.activated = false
        }
      }
      this.activatedPedestalOrder = []
    }
  }

  private checkRoomTransition(): void {
    const room = this.rooms.get(this.currentRoomId)!
    const roomSize = this.renderer.getRoomSize()
    const doorWidth = 24
    const doorHeight = 32
    const wallThickness = 16

    if (room.doors.north) {
      const doorX = (roomSize.width - doorWidth) / 2
      if (
        this.player.y <= wallThickness &&
        this.player.x + this.player.width > doorX &&
        this.player.x < doorX + doorWidth
      ) {
        this.changeRoom('north')
        return
      }
    }

    if (room.doors.south) {
      const doorX = (roomSize.width - doorWidth) / 2
      if (
        this.player.y + this.player.height >= roomSize.height - wallThickness &&
        this.player.x + this.player.width > doorX &&
        this.player.x < doorX + doorWidth
      ) {
        this.changeRoom('south')
        return
      }
    }

    if (room.doors.west) {
      const doorY = (roomSize.height - doorHeight) / 2
      if (
        this.player.x <= wallThickness &&
        this.player.y + this.player.height > doorY &&
        this.player.y < doorY + doorHeight
      ) {
        this.changeRoom('west')
        return
      }
    }

    if (room.doors.east) {
      const doorY = (roomSize.height - doorHeight) / 2
      if (
        this.player.x + this.player.width >= roomSize.width - wallThickness &&
        this.player.y + this.player.height > doorY &&
        this.player.y < doorY + doorHeight
      ) {
        this.changeRoom('east')
        return
      }
    }
  }

  private changeRoom(direction: 'north' | 'south' | 'east' | 'west'): void {
    const currentRoom = this.rooms.get(this.currentRoomId)!
    const roomSize = this.renderer.getRoomSize()
    const wallThickness = 16

    let newX = currentRoom.x
    let newY = currentRoom.y

    if (direction === 'north') newY--
    else if (direction === 'south') newY++
    else if (direction === 'east') newX++
    else if (direction === 'west') newX--

    const newRoomId = `room_${newX}_${newY}`
    const newRoom = this.rooms.get(newRoomId)

    if (!newRoom) return

    this.gameState.transitionAlpha = 1
    this.currentRoomId = newRoomId
    this.player.currentRoomId = newRoomId

    if (direction === 'north') {
      this.player.y = roomSize.height - wallThickness - this.player.height - 5
    } else if (direction === 'south') {
      this.player.y = wallThickness + 5
    } else if (direction === 'east') {
      this.player.x = wallThickness + 5
    } else if (direction === 'west') {
      this.player.x = roomSize.width - wallThickness - this.player.width - 5
    }
  }

  private updateTransitionEffect(deltaTime: number): void {
    if (this.gameState.transitionAlpha > 0) {
      this.gameState.transitionAlpha -= deltaTime * 5
      if (this.gameState.transitionAlpha < 0) {
        this.gameState.transitionAlpha = 0
      }
    }
  }

  private updateFlashEffect(deltaTime: number): void {
    if (this.gameState.flashCount > 0) {
      const flashSpeed = 1 / 0.3
      this.gameState.flashAlpha += deltaTime * flashSpeed * (this.gameState.flashCount % 2 === 1 ? -1 : 1)

      if (this.gameState.flashAlpha <= 0) {
        this.gameState.flashAlpha = 0
        this.gameState.flashCount--
        if (this.gameState.flashCount > 0) {
          this.gameState.flashAlpha = 1
        }
      } else if (this.gameState.flashAlpha >= 1) {
        this.gameState.flashAlpha = 1
        this.gameState.flashCount--
      }
    }
  }

  private render(): void {
    const room = this.rooms.get(this.currentRoomId)!
    this.renderer.render(
      room,
      this.player,
      this.gameState,
      this.timeLoopManager.getTimeRemaining(),
      this.timeLoopManager.getLoopCount(),
      this.timeLoopManager.getShardsCollected().length,
    )
  }

  openPuzzle(puzzleId: string): void {
    this.gameState.showPuzzle = true
    this.gameState.activePuzzleId = puzzleId
    this.notifyListeners()
  }

  closePuzzle(): void {
    this.gameState.showPuzzle = false
    this.gameState.activePuzzleId = null
    this.notifyListeners()
  }

  getCurrentRoom(): Room {
    return this.rooms.get(this.currentRoomId)!
  }

  getPlayer(): Player {
    return { ...this.player }
  }

  getGameState(): GameState {
    return { ...this.gameState }
  }

  getTimeLoopManager(): TimeLoopManager {
    return this.timeLoopManager
  }

  getPuzzleManager(): PuzzleManager {
    return this.puzzleManager
  }

  getRenderer(): Renderer {
    return this.renderer
  }

  triggerResetFlash(): void {
    this.gameState.flashCount = 4
    this.gameState.flashAlpha = 1
    this.renderer.spawnResetParticles()
  }

  resetLoop(): void {
    this.timeLoopManager.resetLoop()
    this.triggerResetFlash()

    for (const room of this.rooms.values()) {
      if (room.hasMemoryShard && !this.timeLoopManager.hasShard(`shard_${room.id}`)) {
        room.shardCollected = false
      }
    }

    const startRoom = this.getStartRoom()
    this.currentRoomId = startRoom.id
    this.player.currentRoomId = startRoom.id
    this.player.x = ROOM_WIDTH / 2 - PLAYER_WIDTH / 2
    this.player.y = ROOM_HEIGHT - 48
    this.player.vx = 0
    this.player.vy = 0

    const finalRoom = this.getFinalRoom()
    if (finalRoom && finalRoom.pedestals) {
      for (const pedestal of finalRoom.pedestals) {
        pedestal.activated = false
      }
      this.activatedPedestalOrder = []
      finalRoom.portalActive = false
    }
  }

  private getFinalRoom(): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.isFinalRoom) return room
    }
    return undefined
  }

  private winGame(): void {
    this.gameState.isWin = true
    this.notifyListeners()
  }

  addListener(listener: StateListener): void {
    this.listeners.add(listener)
  }

  removeListener(listener: StateListener): void {
    this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    const state: GameEngineState = {
      currentRoom: this.getCurrentRoom(),
      player: this.getPlayer(),
      gameState: this.getGameState(),
      timeRemaining: this.timeLoopManager.getTimeRemaining(),
      loopCount: this.timeLoopManager.getLoopCount(),
      shardsCollected: this.timeLoopManager.getShardsCollected(),
      activePuzzleId: this.gameState.activePuzzleId,
    }
    this.listeners.forEach((listener) => listener(state))
  }

  getState(): GameEngineState {
    return {
      currentRoom: this.getCurrentRoom(),
      player: this.getPlayer(),
      gameState: this.getGameState(),
      timeRemaining: this.timeLoopManager.getTimeRemaining(),
      loopCount: this.timeLoopManager.getLoopCount(),
      shardsCollected: this.timeLoopManager.getShardsCollected(),
      activePuzzleId: this.gameState.activePuzzleId,
    }
  }
}
