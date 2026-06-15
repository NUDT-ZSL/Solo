import { reactive, computed, ref } from 'vue'
import {
  type Cell,
  type Gem,
  type Player,
  type LineMatch,
  type ElementEffectResult,
  type AnimationEvent,
  type ElementType,
  type GamePhase,
  BOARD_SIZE,
  WIN_TERRITORY,
  MAX_HAND_SIZE,
  createGem,
  randomElement,
  createBoard,
  findLineMatches,
  getAdjacentCells,
} from '@/types/game'

export function useGameState() {
  const board = createBoard()
  const players: [Player, Player] = [
    { id: 1, name: '火龙领主', hand: [], territoryCount: 0 },
    { id: 2, name: '冰龙领主', hand: [], territoryCount: 0 },
  ]
  const currentPlayer = ref<1 | 2>(1)
  const selectedGem = ref<Gem | null>(null)
  const phase = ref<GamePhase>('select')
  const winner = ref<1 | 2 | null>(null)
  const animationQueue = ref<AnimationEvent[]>([])
  const isProcessing = ref(false)
  const turnNumber = ref(1)
  const lastEffectDescription = ref('')
  const eliminatedCells = ref<{ row: number; col: number; element: ElementType }[]>([])

  const currentPlayerData = computed(() => players[currentPlayer.value - 1])
  const opponentPlayerData = computed(() => players[currentPlayer.value === 1 ? 1 : 0])

  function drawCards(playerId: 1 | 2, count: number) {
    const player = players[playerId - 1]
    for (let i = 0; i < count; i++) {
      if (player.hand.length < MAX_HAND_SIZE) {
        player.hand.push(createGem(randomElement()))
      }
    }
  }

  function initGame() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        board[r][c] = {
          row: r,
          col: c,
          gem: null,
          owner: null,
          isFortified: false,
          isFrozen: false,
          frozenBy: null,
        }
      }
    }
    players[0].hand = []
    players[1].hand = []
    players[0].territoryCount = 0
    players[1].territoryCount = 0
    currentPlayer.value = 1
    selectedGem.value = null
    phase.value = 'select'
    winner.value = null
    animationQueue.value = []
    isProcessing.value = false
    turnNumber.value = 1
    lastEffectDescription.value = ''
    eliminatedCells.value = []
    drawCards(1, 5)
    drawCards(2, 5)
  }

  function selectGem(gem: Gem | null) {
    if (phase.value !== 'select' && phase.value !== 'place') return
    selectedGem.value = gem
    phase.value = gem ? 'place' : 'select'
  }

  function canPlaceGem(row: number, col: number): boolean {
    if (phase.value !== 'place') return false
    if (!selectedGem.value) return false
    const cell = board[row][col]
    if (cell.gem) return false
    if (cell.isFrozen && cell.frozenBy !== currentPlayer.value) return false
    return true
  }

  function countTerritory() {
    let count1 = 0
    let count2 = 0
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c].owner === 1) count1++
        if (board[r][c].owner === 2) count2++
      }
    }
    players[0].territoryCount = count1
    players[1].territoryCount = count2
  }

  function applyElementEffects(matches: LineMatch[], player: 1 | 2): ElementEffectResult[] {
    const results: ElementEffectResult[] = []
    const opponent: 1 | 2 = player === 1 ? 2 : 1
    const uniqueElements = [...new Set(matches.map(m => m.element))]

    for (const element of uniqueElements) {
      const matchCells = matches
        .filter(m => m.element === element)
        .flatMap(m => m.cells)

      switch (element) {
        case 'fire': {
          const affected: { row: number; col: number }[] = []
          const seen = new Set<string>()
          for (const mc of matchCells) {
            const adjacent = getAdjacentCells(mc.row, mc.col)
            for (const ac of adjacent) {
              const key = `${ac.row},${ac.col}`
              if (seen.has(key)) continue
              seen.add(key)
              const cell = board[ac.row][ac.col]
              if (cell.owner === opponent && !cell.isFortified) {
                cell.owner = null
                affected.push(ac)
              }
            }
          }
          if (affected.length > 0) {
            results.push({
              type: 'fire',
              affectedCells: affected,
              description: `🔥 火线灼烧！${affected.length}块敌方领地化为中立`,
            })
          }
          break
        }
        case 'ice': {
          const affected: { row: number; col: number }[] = []
          const seen = new Set<string>()
          for (const mc of matchCells) {
            const adjacent = getAdjacentCells(mc.row, mc.col)
            for (const ac of adjacent) {
              const key = `${ac.row},${ac.col}`
              if (seen.has(key)) continue
              seen.add(key)
              const cell = board[ac.row][ac.col]
              if (!cell.gem) {
                cell.isFrozen = true
                cell.frozenBy = opponent
                affected.push(ac)
              }
            }
          }
          if (affected.length > 0) {
            results.push({
              type: 'ice',
              affectedCells: affected,
              description: `❄️ 冰线冻结！${affected.length}个格子被冻结`,
            })
          }
          break
        }
        case 'wind': {
          const affected: { row: number; col: number }[] = []
          for (const mc of matchCells) {
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            for (const [dr, dc] of directions) {
              let r = mc.row + dr
              let c = mc.col + dc
              while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                const cell = board[r][c]
                if (cell.gem) {
                  const gemOwner = cell.owner
                  if (gemOwner) {
                    players[gemOwner - 1].hand.push(cell.gem)
                    if (players[gemOwner - 1].hand.length > MAX_HAND_SIZE) {
                      players[gemOwner - 1].hand.pop()
                    }
                  }
                  cell.gem = null
                  affected.push({ row: r, col: c })
                }
                r += dr
                c += dc
              }
            }
          }
          if (affected.length > 0) {
            results.push({
              type: 'wind',
              affectedCells: affected,
              description: `🌪️ 风线吹散！${affected.length}颗宝石被吹回手牌`,
            })
          }
          break
        }
        case 'earth': {
          const affected: { row: number; col: number }[] = []
          for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
              if (board[r][c].owner === player && !board[r][c].isFortified) {
                board[r][c].isFortified = true
                affected.push({ row: r, col: c })
              }
            }
          }
          if (affected.length > 0) {
            results.push({
              type: 'earth',
              affectedCells: affected,
              description: `🛡️ 土线硬化！${affected.length}块己方领地获得强化`,
            })
          }
          break
        }
      }
    }

    return results
  }

  function clearFrozenForPlayer(player: 1 | 2) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c].isFrozen && board[r][c].frozenBy === player) {
          board[r][c].isFrozen = false
          board[r][c].frozenBy = null
        }
      }
    }
  }

  async function placeGem(row: number, col: number): Promise<boolean> {
    if (!canPlaceGem(row, col)) return false

    const gem = selectedGem.value!
    const player = currentPlayer.value

    isProcessing.value = true
    phase.value = 'resolving'

    board[row][col].gem = gem
    const playerHand = players[player - 1].hand
    const idx = playerHand.findIndex(g => g.id === gem.id)
    if (idx !== -1) playerHand.splice(idx, 1)

    animationQueue.value.push({
      type: 'place',
      row,
      col,
      element: gem.element,
      player,
    })

    await delay(400)

    const matches = findLineMatches(board, row, col)

    if (matches.length > 0) {
      const allMatchedCells = new Set<string>()
      for (const match of matches) {
        for (const cell of match.cells) {
          allMatchedCells.add(`${cell.row},${cell.col}`)
        }
      }

      eliminatedCells.value = [...allMatchedCells].map(key => {
        const [r, c] = key.split(',').map(Number)
        return { row: r, col: c, element: board[r][c].gem!.element }
      })

      animationQueue.value.push({
        type: 'eliminate',
        row,
        col,
        element: gem.element,
        player,
        data: { cells: [...allMatchedCells].map(k => {
          const [r, c] = k.split(',').map(Number)
          return { row: r, col: c }
        })},
      })

      await delay(600)

      for (const key of allMatchedCells) {
        const [r, c] = key.split(',').map(Number)
        board[r][c].gem = null
        board[r][c].owner = player
      }

      animationQueue.value.push({
        type: 'territory',
        row,
        col,
        element: gem.element,
        player,
      })

      await delay(400)

      const effects = applyElementEffects(matches, player)
      for (const effect of effects) {
        lastEffectDescription.value = effect.description
        animationQueue.value.push({
          type: 'element',
          row,
          col,
          element: effect.type,
          player,
          data: { cells: effect.affectedCells },
        })
        await delay(500)
      }

      eliminatedCells.value = []
    }

    countTerritory()

    if (players[0].territoryCount >= WIN_TERRITORY) {
      winner.value = 1
      phase.value = 'gameover'
      animationQueue.value.push({ type: 'victory', row: 0, col: 0, player: 1 })
      isProcessing.value = false
      return true
    }
    if (players[1].territoryCount >= WIN_TERRITORY) {
      winner.value = 2
      phase.value = 'gameover'
      animationQueue.value.push({ type: 'victory', row: 0, col: 0, player: 2 })
      isProcessing.value = false
      return true
    }

    selectedGem.value = null
    drawCards(player, 1)

    const nextPlayer: 1 | 2 = player === 1 ? 2 : 1
    clearFrozenForPlayer(nextPlayer)
    currentPlayer.value = nextPlayer
    turnNumber.value++
    phase.value = 'select'
    isProcessing.value = false

    return true
  }

  function endTurn() {
    if (isProcessing.value) return
    if (phase.value === 'gameover') return

    if (selectedGem.value) {
      selectedGem.value = null
    }

    const player = currentPlayer.value
    drawCards(player, 1)

    const nextPlayer: 1 | 2 = player === 1 ? 2 : 1
    clearFrozenForPlayer(nextPlayer)
    currentPlayer.value = nextPlayer
    turnNumber.value++
    phase.value = 'select'
  }

  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  initGame()

  return {
    board,
    players,
    currentPlayer,
    selectedGem,
    phase,
    winner,
    animationQueue,
    isProcessing,
    turnNumber,
    lastEffectDescription,
    eliminatedCells,
    currentPlayerData,
    opponentPlayerData,
    initGame,
    selectGem,
    canPlaceGem,
    placeGem,
    endTurn,
  }
}
