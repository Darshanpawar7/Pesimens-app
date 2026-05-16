import React from 'react'
import { useLudoStore } from '../../../lib/ludo/store'
import {
  BaseID,
  BoardEntities,
  CellType,
  WalkwayPosition,
} from '../../../lib/ludo/types'
import {
  BASE_SIZE,
  BOARD_DIMENSION,
  CELL_DIMENSION,
  HOME_SIZE,
  INNER_BASE_SIZE,
  WALKWAY_LENGTH,
  WALKWAY_WIDTH,
} from '../../../lib/ludo/constants'
import { generateCellID, getBaseHexColor } from '../../../lib/ludo/utils'

// ─── Coin ─────────────────────────────────────────────────────────────────────
interface CoinProps {
  color: string
  size: number
  onClick?: () => void
  selectable?: boolean
}

function Coin({ color, size, onClick, selectable }: CoinProps) {
  const outerSize = size * 0.82
  const innerSize = outerSize * 0.38
  return (
    <div
      onClick={onClick}
      title={selectable ? 'Click to move' : undefined}
      style={{
        width: outerSize,
        height: outerSize,
        backgroundColor: color,
        borderRadius: '50%',
        border: selectable ? '2.5px solid white' : '1.5px solid rgba(0,0,0,0.25)',
        boxShadow: selectable
          ? `0 0 8px ${color}, 0 0 0 3px ${color}55`
          : '0 1px 3px rgba(0,0,0,0.35)',
        cursor: selectable ? 'pointer' : 'default',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'box-shadow 0.15s',
        animation: selectable ? 'ludo-coin-pulse 0.9s ease-in-out infinite' : undefined,
      }}
    >
      <div
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.55)',
          marginTop: '-20%',
          marginLeft: '-15%',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

// ─── Home center (4 triangles + retired coins) ───────────────────────────────
function HomeCenter({ baseIDs }: { baseIDs: string[] }) {
  const { bases, coins } = useLudoStore()
  const size = HOME_SIZE * CELL_DIMENSION  // 120px

  const getTriangleCSS = (color: string, index: number): React.CSSProperties => {
    const half = size / 2
    const base: React.CSSProperties = {
      width: 0,
      height: 0,
      borderStyle: 'solid',
      borderColor: `${color} transparent transparent transparent`,
      borderWidth: `${half}px ${half}px 0 ${half}px`,
      position: 'absolute',
    }
    switch (index) {
      case 0: return base
      case 1: return { ...base, left: `${size / 4}px`, top: `${size / 4}px`, transform: 'rotate(90deg)' }
      case 2: return { ...base, top: `${size / 2}px`, transform: 'rotate(180deg)' }
      case 3: return { ...base, right: `${size / 4}px`, top: `${size / 4}px`, transform: 'rotate(-90deg)' }
      default: return {}
    }
  }

  // Collect all retired coins across all bases, grouped by color
  const retiredByBase: { color: string; count: number }[] = baseIDs.flatMap((baseID) => {
    const base = bases[baseID]
    if (!base) return []
    const retiredCount = base.coinIDs.filter((id) => coins[id]?.isRetired).length
    if (retiredCount === 0) return []
    return [{ color: getBaseHexColor(base.color), count: retiredCount }]
  })

  const coinSize = 14  // small coins in the center

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {/* Triangles */}
      {baseIDs.map((baseID, index) => {
        const base = bases[baseID]
        if (!base) return null
        return <div key={index} style={getTriangleCSS(getBaseHexColor(base.color), index)} />
      })}
      {/* Retired coins stacked in center */}
      {retiredByBase.length > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            padding: 4,
            pointerEvents: 'none',
          }}
        >
          {retiredByBase.map(({ color, count }) =>
            Array.from({ length: count }).map((_, i) => (
              <div
                key={`${color}-${i}`}
                style={{
                  width: coinSize,
                  height: coinSize,
                  borderRadius: '50%',
                  background: color,
                  border: '1.5px solid white',
                  boxShadow: `0 0 4px ${color}, 0 1px 3px rgba(0,0,0,0.4)`,
                  flexShrink: 0,
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Track cell ───────────────────────────────────────────────────────────────
interface TrackCellProps {
  cellID: string
  position: WalkwayPosition
  baseColor?: string
}

// Arrow direction for each walkway's spawn cell (shows entry direction)
const SPAWN_ARROW: Record<WalkwayPosition, string> = {
  [WalkwayPosition.NORTH]: '↓',
  [WalkwayPosition.SOUTH]: '↑',
  [WalkwayPosition.WEST]:  '→',
  [WalkwayPosition.EAST]:  '←',
}

function TrackCell({ cellID, position, baseColor }: TrackCellProps) {
  const { cells, coins, currentTurn, isDiceRollValid, diceRoll, clickCoin } = useLudoStore()
  const cell = cells[position]?.[cellID]
  if (!cell) return null

  const isStar     = cell.cellType === CellType.STAR
  const isHomePath = cell.cellType === CellType.HOMEPATH
  const isSpawn    = cell.cellType === CellType.SPAWN

  let bgColor = '#FFFFFF'
  if (isHomePath && baseColor) bgColor = baseColor + 'cc'  // slightly transparent home path
  if (isSpawn && baseColor) bgColor = baseColor + 'dd'

  const coinsInCell = cell.coinIDs.map((id) => coins[id]).filter(Boolean)
  const coinSize    = coinsInCell.length > 1 ? CELL_DIMENSION / 2 : CELL_DIMENSION

  const isSelectable = (cID: string) => {
    if (!isDiceRollValid || !diceRoll) return false
    const coin = coins[cID]
    if (!coin || coin.baseID !== currentTurn) return false
    if (!coin.isSpawned || coin.isRetired) return false
    return coin.steps + diceRoll <= 56
  }

  return (
    <div
      style={{
        width: CELL_DIMENSION,
        height: CELL_DIMENSION,
        backgroundColor: bgColor,
        border: `1px solid ${isHomePath || isSpawn ? 'rgba(0,0,0,0.12)' : '#ccc'}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Star indicator */}
      {isStar && coinsInCell.length === 0 && (
        <span
          style={{
            position: 'absolute',
            fontSize: CELL_DIMENSION * 0.55,
            lineHeight: 1,
            color: 'rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          ☆
        </span>
      )}
      {/* Spawn arrow indicator */}
      {isSpawn && coinsInCell.length === 0 && (
        <span
          style={{
            position: 'absolute',
            fontSize: CELL_DIMENSION * 0.5,
            lineHeight: 1,
            color: baseColor ?? 'rgba(0,0,0,0.35)',
            fontWeight: 700,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {SPAWN_ARROW[position]}
        </span>
      )}
      {coinsInCell.map((coin) => (
        <Coin
          key={coin.coinID}
          color={getBaseHexColor(coin.color)}
          size={coinSize}
          selectable={isSelectable(coin.coinID)}
          onClick={() => {
            if (isSelectable(coin.coinID)) {
              clickCoin(coin.coinID, cell.position, cell.cellID)
            }
          }}
        />
      ))}
    </div>
  )
}

// ─── Walkway ──────────────────────────────────────────────────────────────────
function WalkwaySection({ walkwayID }: { walkwayID: string }) {
  const { walkways, cells, bases } = useLudoStore()
  const walkway = walkways[walkwayID]
  if (!walkway) return null

  const isHorizontal = [WalkwayPosition.EAST, WalkwayPosition.WEST].includes(walkway.position)
  const width  = isHorizontal ? WALKWAY_LENGTH * CELL_DIMENSION : WALKWAY_WIDTH  * CELL_DIMENSION
  const height = isHorizontal ? WALKWAY_WIDTH  * CELL_DIMENSION : WALKWAY_LENGTH * CELL_DIMENSION

  const walkwayCells = cells[walkway.position]
  if (!walkwayCells) return null

  const base      = bases[walkway.baseID]
  const baseColor = base ? getBaseHexColor(base.color) : undefined

  const sortedCells = Object.values(walkwayCells)
    .sort((a, b) => a.row !== b.row ? a.row - b.row : a.column - b.column)

  return (
    <div style={{ width, height, display: 'flex', flexWrap: 'wrap' }}>
      {sortedCells.map((cell) => (
        <TrackCell
          key={generateCellID(cell.position, cell.row, cell.column)}
          cellID={cell.cellID}
          position={cell.position}
          baseColor={baseColor}
        />
      ))}
    </div>
  )
}

// ─── Base spawn position mapping ──────────────────────────────────────────────
const BASE_SPAWN_POSITION: Record<string, WalkwayPosition> = {
  [BaseID.BASE_1]: WalkwayPosition.WEST,
  [BaseID.BASE_2]: WalkwayPosition.NORTH,
  [BaseID.BASE_3]: WalkwayPosition.SOUTH,
  [BaseID.BASE_4]: WalkwayPosition.EAST,
}

// ─── Base quadrant ────────────────────────────────────────────────────────────
function BaseQuadrant({ baseID }: { baseID: string }) {
  const { bases, coins, isDiceRollValid, diceRoll, currentTurn, clickCoin } = useLudoStore()
  const base = bases[baseID]
  if (!base) return null

  const hexColor  = getBaseHexColor(base.color)
  const outerSize = BASE_SIZE       * CELL_DIMENSION
  const innerSize = INNER_BASE_SIZE * CELL_DIMENSION

  const isCurrentTurn = base.ID === currentTurn
  const canSpawn = isCurrentTurn && isDiceRollValid && diceRoll === 6 && base.spawnable

  return (
    <div
      style={{
        width: outerSize,
        height: outerSize,
        backgroundColor: hexColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: innerSize,
          height: innerSize,
          backgroundColor: '#FFFFFF',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          padding: 16,
          borderRadius: 10,
          boxShadow: canSpawn
            ? `0 0 24px ${hexColor}, 0 0 0 3px white`
            : '0 2px 8px rgba(0,0,0,0.25)',
          transition: 'box-shadow 0.2s',
        }}
      >
        {base.coinIDs.map((coinID) => {
          const coin = coins[coinID]
          if (!coin) return null
          const isInBase   = !coin.isSpawned && !coin.isRetired
          const selectable = canSpawn && isInBase

          return (
            <div
              key={coinID}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              {isInBase ? (
                <Coin
                  color={hexColor}
                  size={CELL_DIMENSION}
                  selectable={selectable}
                  onClick={() => {
                    if (selectable) {
                      clickCoin(coinID, BASE_SPAWN_POSITION[baseID] ?? WalkwayPosition.NORTH, '')
                    }
                  }}
                />
              ) : (
                <div
                  style={{
                    width: CELL_DIMENSION * 0.8,
                    height: CELL_DIMENSION * 0.8,
                    borderRadius: '50%',
                    border: '2px dashed rgba(0,0,0,0.18)',
                    background: 'rgba(0,0,0,0.04)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Status bar ───────────────────────────────────────────────────────────────
function GameStatusBar() {
  const { isDiceRollAllowed, isDiceRollValid, diceRoll, currentTurn, bases } = useLudoStore()
  const base  = bases[currentTurn]
  const color = base ? getBaseHexColor(base.color) : '#8888a8'

  let message: string
  let icon: string
  if (isDiceRollAllowed) {
    message = 'Roll the dice to take your turn'
    icon    = '🎲'
  } else if (isDiceRollValid && diceRoll) {
    message = `Rolled ${diceRoll} — tap a coin to move`
    icon    = '👆'
  } else {
    message = 'Processing…'
    icon    = '⏳'
  }

  return (
    <div
      style={{
        marginTop: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '8px 20px',
        borderRadius: 99,
        background: `linear-gradient(135deg, ${color}22, ${color}11)`,
        border: `1px solid ${color}44`,
        boxShadow: `0 0 12px ${color}22`,
        width: 'fit-content',
        alignSelf: 'center',
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 13, color: '#ddddee', fontWeight: 600, letterSpacing: '0.01em' }}>{message}</span>
    </div>
  )
}

// ─── Main board ───────────────────────────────────────────────────────────────
export function LudoBoardNew() {
  const { relationships, bases, walkways } = useLudoStore()

  if (relationships.length === 0) {
    return (
      <div
        style={{
          width: BOARD_DIMENSION,
          height: BOARD_DIMENSION,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 4,
        }}
      >
        <span style={{ color: '#8888a8', fontSize: 14 }}>Loading board…</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <style>{`
        @keyframes ludo-coin-pulse {
          0%, 100% { box-shadow: 0 0 6px currentColor, 0 0 0 2px transparent; }
          50%       { box-shadow: 0 0 14px currentColor, 0 0 0 4px rgba(255,255,255,0.3); }
        }
      `}</style>
      <div
        style={{
          width: BOARD_DIMENSION,
          height: BOARD_DIMENSION,
          display: 'grid',
          gridTemplateColumns: '240px 120px 240px',
          gridTemplateRows: '240px 120px 240px',
          flexShrink: 0,
          border: '3px solid #999',
          boxSizing: 'border-box',
          boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {relationships.map((rel, index) => {
          switch (rel.type) {
            case BoardEntities.BASE:
              if (!bases[rel.ID]) return null
              return <BaseQuadrant key={index} baseID={rel.ID} />
            case BoardEntities.WALKWAY:
              if (!walkways[rel.ID]) return null
              return <WalkwaySection key={index} walkwayID={rel.ID} />
            case BoardEntities.HOME:
              return <HomeCenter key={index} baseIDs={rel.baseIDs ?? []} />
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}

// Export status bar separately so LudoPage can render it outside the scaled wrapper
export { GameStatusBar as LudoGameStatusBar }
