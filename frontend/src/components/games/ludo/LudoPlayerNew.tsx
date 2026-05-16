import { useLudoStore } from '../../../lib/ludo/store'
import { BaseID } from '../../../lib/ludo/types'
import { getBaseHexColor } from '../../../lib/ludo/utils'
import { LudoDiceNew } from './LudoDiceNew'

export const BASE_NAMES: Record<BaseID, string> = {
  [BaseID.BASE_1]: 'Blue',
  [BaseID.BASE_2]: 'Green',
  [BaseID.BASE_3]: 'Red',
  [BaseID.BASE_4]: 'Yellow',
}

interface LudoPlayerNewProps {
  baseID: BaseID
  placement: 'top' | 'bottom'
}

export function LudoPlayerNew({ baseID }: LudoPlayerNewProps) {
  const { bases, coins, currentTurn } = useLudoStore()
  const base = bases[baseID]

  if (!base || !base.enabled) return null

  const isActive = currentTurn === baseID
  const color = getBaseHexColor(base.color)
  const name = BASE_NAMES[baseID]

  const inBase = base.coinIDs.filter(
    (id) => coins[id] && !coins[id].isSpawned && !coins[id].isRetired,
  ).length

  const onBoard = base.coinIDs.filter(
    (id) => coins[id] && coins[id].isSpawned && !coins[id].isRetired,
  ).length

  const atHome = base.coinIDs.filter((id) => coins[id] && coins[id].isRetired).length

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 14,
        background: isActive
          ? 'linear-gradient(135deg, #1a1a2e, #16161f)'
          : 'rgba(255,255,255,0.03)',
        border: `2px solid ${isActive ? color + '66' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: isActive ? `0 0 20px ${color}22` : 'none',
        transition: 'all 0.2s',
        opacity: base.hasWon ? 0.65 : 1,
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      {/* Color dot + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Token icon */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: color,
            border: isActive ? '2px solid white' : '2px solid rgba(0,0,0,0.3)',
            boxShadow: isActive ? `0 0 10px ${color}88` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.7)',
            }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
          {base.hasWon ? (
            <div style={{ color: '#f0c040', fontSize: 11 }}>🏆 Won!</div>
          ) : isActive ? (
            <div style={{ color: color, fontSize: 11, fontWeight: 600 }}>▶ Your turn</div>
          ) : null}
        </div>
      </div>

      {/* Token counts */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          fontSize: 11,
          color: '#8888a8',
          flexShrink: 0,
        }}
      >
        <span title="In base" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ opacity: 0.6 }}>🏠</span>
          <span style={{ color: '#ccc', fontWeight: 600 }}>{inBase}</span>
        </span>
        <span title="On board" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ opacity: 0.6 }}>●</span>
          <span style={{ color: '#ccc', fontWeight: 600 }}>{onBoard}</span>
        </span>
        <span title="Home" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ opacity: 0.6 }}>✅</span>
          <span style={{ color: '#ccc', fontWeight: 600 }}>{atHome}</span>
        </span>
      </div>

      {/* Dice — push to far right when active */}
      {isActive && !base.hasWon && (
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <LudoDiceNew baseColor={color} size={72} />
        </div>
      )}
    </div>
  )
}
