import { create } from 'zustand'
import { mapByProperty } from './utils'
import {
  BaseID,
  CellType,
  IBase,
  ICoin,
  ILudoGameState,
  IServerGameData,
  WalkwayPosition,
} from './types'
import { WINNING_MOVES } from './constants'

// ─── Helper: get next enabled, non-winner base ────────────────────────────────
// Walks the nextTurn linked list up to 4 steps, skipping disabled/won bases.
// Returns currentTurn unchanged if no valid next base found (all won = game over).
function getNextTurn(bases: Record<string, IBase>, currentTurn: BaseID): BaseID {
  let nextID = bases[currentTurn]?.nextTurn
  if (!nextID) return currentTurn
  for (let i = 0; i < 4; i++) {
    const next = bases[nextID]
    if (!next) return currentTurn
    if (next.enabled && !next.hasWon) return nextID
    nextID = next.nextTurn
  }
  return currentTurn // all bases won — game over, no valid next
}

// ─── Helper: get coins that can legally move given a dice roll ────────────────
function getMovableCoins(
  bases: Record<string, IBase>,
  coins: Record<string, ICoin>,
  currentTurn: BaseID,
  diceRoll: number,
): string[] {
  const base = bases[currentTurn]
  if (!base) return []
  return base.coinIDs.filter((coinID) => {
    const coin = coins[coinID]
    if (!coin) return false
    return coin.isSpawned && !coin.isRetired && coin.steps + diceRoll <= WINNING_MOVES
  })
}

// ─── Helper: lift coin from a cell (immutable) ───────────────────────────────
function liftCoinFromCell(
  cells: ILudoGameState['cells'],
  coinID: string,
  position: WalkwayPosition,
  cellID: string,
): ILudoGameState['cells'] {
  const positionCells = cells[position]
  if (!positionCells || !positionCells[cellID]) return cells
  const cellCoins = [...positionCells[cellID].coinIDs]
  const idx = cellCoins.indexOf(coinID)
  if (idx !== -1) cellCoins.splice(idx, 1)
  return {
    ...cells,
    [position]: {
      ...positionCells,
      [cellID]: { ...positionCells[cellID], coinIDs: cellCoins },
    },
  }
}

// ─── Helper: place coin on a cell (immutable) ────────────────────────────────
function placeCoinOnCell(
  cells: ILudoGameState['cells'],
  coinID: string,
  position: WalkwayPosition,
  cellID: string,
): ILudoGameState['cells'] {
  const positionCells = cells[position]
  if (!positionCells || !positionCells[cellID]) return cells
  return {
    ...cells,
    [position]: {
      ...positionCells,
      [cellID]: {
        ...positionCells[cellID],
        coinIDs: [...positionCells[cellID].coinIDs, coinID],
      },
    },
  }
}

// ─── Helper: reset all coins to unspawned state ───────────────────────────────
// Also clears all coinIDs from cells so the board is clean.
function resetCoinsAndCells(
  coins: ILudoGameState['coins'],
  cells: ILudoGameState['cells'],
): { coins: ILudoGameState['coins']; cells: ILudoGameState['cells'] } {
  // Reset all coins
  const resetCoins: ILudoGameState['coins'] = {}
  for (const [id, coin] of Object.entries(coins)) {
    resetCoins[id] = {
      ...coin,
      isSpawned: false,
      isRetired: false,
      steps: 0,
      cellID: null,
      position: null,
    }
  }
  // Clear all coinIDs from every cell
  const resetCells: ILudoGameState['cells'] = {}
  for (const [pos, posCells] of Object.entries(cells)) {
    resetCells[pos] = {}
    for (const [cid, cell] of Object.entries(posCells)) {
      resetCells[pos][cid] = { ...cell, coinIDs: [] }
    }
  }
  return { coins: resetCoins, cells: resetCells }
}

// ─── Store interface ──────────────────────────────────────────────────────────
interface ILudoStore extends ILudoGameState {
  loadGameData: () => Promise<void>
  startGame: (playerCount: 2 | 3 | 4) => void
  rollDice: () => void
  clickCoin: (coinID: string, position: WalkwayPosition, cellID: string) => void
  resetGame: () => void
  // internal helpers (exposed for cross-action calls within the store)
  spawnCoin: (baseID: BaseID, coinID: string) => void
  performMove: (coinID: string, startPosition: WalkwayPosition, startCellID: string) => void
  checkWinner: (baseID: BaseID, coins: Record<string, ICoin>, bases: Record<string, IBase>) => void
}

const initialState: ILudoGameState = {
  bases: {},
  cells: {},
  coins: {},
  links: {},
  relationships: [],
  walkways: {},
  currentTurn: BaseID.BASE_3,
  diceRoll: null,
  isDiceRollAllowed: true,
  isDiceRollValid: false,
  winner: null,
  phase: 'setup',
  playerCount: 4,
  loadError: null,
}

export const useLudoStore = create<ILudoStore>((set, get) => ({
  ...initialState,

  // ── Load board data from public/initialGameData.json ──────────────────────
  loadGameData: async () => {
    set({ loadError: null })
    try {
      const gameDataUrl = import.meta.env.VITE_GAME_DATA_URL || '/initialGameData.json'
      const response = await fetch(gameDataUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: IServerGameData = await response.json()

      const basesArray = data.bases.map((base) => ({
        ...base,
        spawnable: false,
        enabled: false,
        hasWon: false,
      }))
      const bases = mapByProperty(basesArray, 'ID')

      const coinsWithColor = data.coins.map((coin) => ({
        ...coin,
        color: bases[coin.baseID]?.color ?? coin.color,
        isSpawned: false,
        isRetired: false,
        steps: 0,
        cellID: null,
        position: null,
      }))

      // Ensure all cells start with empty coinIDs
      const cleanCells: ILudoGameState['cells'] = {}
      for (const [pos, posCells] of Object.entries(data.cells)) {
        cleanCells[pos] = {}
        for (const [cid, cell] of Object.entries(posCells)) {
          cleanCells[pos][cid] = { ...cell, coinIDs: [] }
        }
      }

      set({
        bases,
        cells: cleanCells,
        coins: mapByProperty(coinsWithColor, 'coinID'),
        links: data.links,
        relationships: data.relationships,
        walkways: mapByProperty(data.walkways, 'ID'),
      })
    } catch (err) {
      // Log error in both DEV and production environments
      console.error('Failed to load game data:', err)
      
      // TODO: Add monitoring service integration (e.g., Sentry.captureException(err))
      // This ensures production errors are tracked and developers are notified
      // Example: if (typeof Sentry !== 'undefined') { Sentry.captureException(err) }
      
      set({ loadError: 'Failed to load game data. Please refresh the page.' })
    }
  },

  // ── Start game with N players ─────────────────────────────────────────────
  // BASE_1=BLUE, BASE_2=GREEN, BASE_3=RED (always starts), BASE_4=YELLOW
  // 2 players: BASE_2 + BASE_3
  // 3 players: BASE_2 + BASE_3 + BASE_4
  // 4 players: all
  startGame: (playerCount) => {
    const { bases, coins, cells } = get()

    const enabledBases: BaseID[] = []
    if (playerCount >= 2) enabledBases.push(BaseID.BASE_2, BaseID.BASE_3)
    if (playerCount >= 3) enabledBases.push(BaseID.BASE_4)
    if (playerCount === 4) enabledBases.push(BaseID.BASE_1)

    // Reset bases
    const updatedBases: ILudoGameState['bases'] = {}
    for (const [id, base] of Object.entries(bases)) {
      updatedBases[id] = {
        ...base,
        enabled: enabledBases.includes(id as BaseID),
        spawnable: false,
        hasWon: false,
      }
    }

    // Reset all coins and clear cells
    const { coins: resetCoins, cells: resetCells } = resetCoinsAndCells(coins, cells)

    set({
      bases: updatedBases,
      coins: resetCoins,
      cells: resetCells,
      phase: 'playing',
      playerCount,
      currentTurn: BaseID.BASE_3,
      isDiceRollAllowed: true,
      isDiceRollValid: false,
      diceRoll: null,
      winner: null,
      loadError: null,
    })
  },

  // ── Roll dice ─────────────────────────────────────────────────────────────
  rollDice: () => {
    const { isDiceRollAllowed, bases, coins, currentTurn, phase } = get()
    if (!isDiceRollAllowed || phase !== 'playing') return

    const roll = Math.floor(Math.random() * 6) + 1

    const currentBase = bases[currentTurn]
    if (!currentBase) return

    const spawnedCoinIDs = currentBase.coinIDs.filter(
      (id) => coins[id]?.isSpawned && !coins[id]?.isRetired,
    )
    const movableCoins = getMovableCoins(bases, coins, currentTurn, roll)
    const spawnableCoins = currentBase.coinIDs.filter(
      (id) => coins[id] && !coins[id].isSpawned && !coins[id].isRetired,
    )

    // Set roll — disable further rolling until turn resolves
    set({ diceRoll: roll, isDiceRollAllowed: false, isDiceRollValid: true })

    if (roll === 6 && (spawnableCoins.length > 0 || movableCoins.length > 0)) {
      if ((spawnedCoinIDs.length === 0 || movableCoins.length === 0) && spawnableCoins.length > 0) {
        // Auto-spawn: no movable coins on board — spawn first available coin
        get().spawnCoin(currentTurn, spawnableCoins[0])
        // Bonus roll after auto-spawn
        set({ isDiceRollValid: false, isDiceRollAllowed: true, diceRoll: null })
      } else {
        // Player has choice: spawn a new coin OR move an existing one
        set((s) => ({
          bases: {
            ...s.bases,
            [currentTurn]: { ...s.bases[currentTurn], spawnable: true },
          },
        }))
        // isDiceRollValid stays true — wait for player click
      }
    } else if (movableCoins.length === 1) {
      // Exactly one coin can move — auto-move it
      const coinID = movableCoins[0]
      const coin = get().coins[coinID]
      if (coin?.position && coin?.cellID) {
        get().performMove(coinID, coin.position, coin.cellID)
      }
    } else if (movableCoins.length === 0) {
      // No coins can move — pass turn
      set({ isDiceRollValid: false })
      const next = getNextTurn(get().bases, currentTurn)
      set({ currentTurn: next, isDiceRollAllowed: true, diceRoll: null })
    }
    // else: movableCoins.length > 1 — player must click a coin
  },

  // ── Handle coin click ─────────────────────────────────────────────────────
  clickCoin: (coinID, position, cellID) => {
    const { isDiceRollValid, coins, currentTurn, bases, diceRoll, phase } = get()
    if (!isDiceRollValid || phase !== 'playing') return
    if (!diceRoll) return

    const coin = coins[coinID]
    if (!coin || coin.baseID !== currentTurn) return

    const currentBase = bases[currentTurn]
    if (!currentBase) return

    if (!coin.isSpawned) {
      // Coin is in base — only valid if roll was 6 and base is spawnable
      if (diceRoll === 6 && currentBase.spawnable) {
        get().spawnCoin(currentTurn, coinID)
        // Bonus roll after manual spawn
        set((s) => ({
          bases: { ...s.bases, [currentTurn]: { ...s.bases[currentTurn], spawnable: false } },
          isDiceRollValid: false,
          isDiceRollAllowed: true,
          diceRoll: null,
        }))
      }
      return
    }

    // Coin is on board — move it
    get().performMove(coinID, position, cellID)
  },

  // internal: spawn a coin onto its SPAWN cell
  spawnCoin: (baseID: BaseID, coinID: string) => {
    const { walkways, cells } = get()
    const walkway = Object.values(walkways).find((w) => w.baseID === baseID)
    if (!walkway) return

    const walkwayCells = cells[walkway.position]
    if (!walkwayCells) return

    const spawnCell = Object.values(walkwayCells).find(
      (cell) => cell.cellType === CellType.SPAWN,
    )
    if (!spawnCell) return

    set((s) => ({
      cells: placeCoinOnCell(s.cells, coinID, walkway.position, spawnCell.cellID),
      coins: {
        ...s.coins,
        [coinID]: {
          ...s.coins[coinID],
          cellID: spawnCell.cellID,
          isSpawned: true,
          position: walkway.position,
        },
      },
    }))
  },

  // internal: move a coin N steps along the pre-computed links graph
  performMove: (coinID: string, startPosition: WalkwayPosition, startCellID: string) => {
    const { diceRoll, links, cells, coins, bases, currentTurn } = get()
    if (!diceRoll) return

    // Verify this coin can legally move
    const movable = getMovableCoins(bases, coins, currentTurn, diceRoll)
    if (!movable.includes(coinID)) return

    // Consume the dice roll
    set({ isDiceRollValid: false })

    let cellID = startCellID
    let walkwayPosition = startPosition
    // Work on local copies — commit to store at each step so UI can track
    let newCells = cells
    let newCoins = coins
    let bonusChanceForHomeCoin = false
    let coinRetired = false

    for (let step = 0; step < diceRoll; step++) {
      const nextCells = links[cellID]
      if (!nextCells || nextCells.length === 0) break

      let nextCell: { cellID: string; position: WalkwayPosition }

      if (nextCells.length > 1) {
        // Two options: outer track or home path
        // Take home path ONLY if this coin's baseID matches the home path cell's baseID
        const homePathOption = nextCells.find((nc) => {
          if (nc.cellID === 'HOME') return false
          const cell = newCells[nc.position]?.[nc.cellID]
          return (
            cell?.cellType === CellType.HOMEPATH &&
            cell?.baseID === newCoins[coinID].baseID
          )
        })
        nextCell = homePathOption ?? nextCells[0]
      } else {
        nextCell = nextCells[0]
      }

      // Lift coin from current cell
      newCells = liftCoinFromCell(newCells, coinID, walkwayPosition, cellID)

      if (nextCell.cellID === 'HOME') {
        // Coin reaches home — retire it
        newCoins = {
          ...newCoins,
          [coinID]: {
            ...newCoins[coinID],
            isRetired: true,
            steps: WINNING_MOVES,
            cellID: null,
            position: null,
          },
        }
        bonusChanceForHomeCoin = true
        coinRetired = true
        set({ cells: newCells, coins: newCoins })
        // Check if this player has won
        get().checkWinner(newCoins[coinID].baseID as BaseID, newCoins, get().bases)
        break
      } else {
        // Place coin on next cell
        newCells = placeCoinOnCell(newCells, coinID, nextCell.position, nextCell.cellID)
        newCoins = {
          ...newCoins,
          [coinID]: {
            ...newCoins[coinID],
            cellID: nextCell.cellID,
            position: nextCell.position,
          },
        }
        set({ cells: newCells, coins: newCoins })
        cellID = nextCell.cellID
        walkwayPosition = nextCell.position
      }
    }

    // Update steps count — skip if coin retired (already set to WINNING_MOVES)
    if (!coinRetired) {
      set((s) => ({
        coins: {
          ...s.coins,
          [coinID]: {
            ...s.coins[coinID],
            steps: Math.min(s.coins[coinID].steps + diceRoll, WINNING_MOVES),
          },
        },
      }))
    }

    // Knock-back check — only on NORMAL cells, only if coin is still on board
    let knockedBack = false
    if (!coinRetired) {
      const landedCell = get().cells[walkwayPosition]?.[cellID]
      if (landedCell?.cellType === CellType.NORMAL) {
        const { coins: latestCoins } = get()
        const movingCoin = latestCoins[coinID]
        for (const occupantID of [...landedCell.coinIDs]) {
          if (occupantID === coinID) continue
          const occupant = latestCoins[occupantID]
          if (occupant && movingCoin && occupant.baseID !== movingCoin.baseID) {
            // Send opponent coin back to base
            set((s) => ({
              cells: liftCoinFromCell(s.cells, occupantID, walkwayPosition, cellID),
              coins: {
                ...s.coins,
                [occupantID]: {
                  ...s.coins[occupantID],
                  isSpawned: false,
                  steps: 0,
                  cellID: null,
                  position: null,
                },
              },
            }))
            knockedBack = true
            break // only knock one coin per landing
          }
        }
      }
    }

    // Determine bonus turn
    const bonusChance = bonusChanceForHomeCoin || knockedBack || diceRoll === 6

    // Clear spawnable flag on current base
    set((s) => ({
      bases: {
        ...s.bases,
        [currentTurn]: { ...s.bases[currentTurn], spawnable: false },
      },
    }))

    if (bonusChance) {
      // Same player rolls again
      set({ isDiceRollAllowed: true, diceRoll: null })
    } else {
      // Advance to next player
      const next = getNextTurn(get().bases, currentTurn)
      set({ currentTurn: next, isDiceRollAllowed: true, diceRoll: null })
    }
  },

  // internal: check if all coins of a base are retired (win condition)
  checkWinner: (baseID: BaseID, coins: Record<string, ICoin>, bases: Record<string, IBase>) => {
    const base = bases[baseID]
    if (!base) return
    const allRetired = base.coinIDs.every((id) => coins[id]?.isRetired)
    if (allRetired) {
      set((s) => ({
        bases: {
          ...s.bases,
          [baseID]: { ...s.bases[baseID], hasWon: true },
        },
        winner: baseID,
        phase: 'finished',
      }))
    }
  },

  // ── Reset game — clear all state and reload board data ────────────────────
  resetGame: () => {
    set({ ...initialState })
    get().loadGameData()
  },
}))
