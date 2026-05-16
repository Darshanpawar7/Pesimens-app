/**
 * Visual test component for ChessBoard
 * This file demonstrates the ChessBoard component in various states
 * Run this in Storybook or a test page to visually verify the component
 */

import { ChessBoard } from '../ChessBoard'
import { useChessStore } from '../../../../lib/chess/store'

export function ChessBoardVisualTest() {
  const { initGame, selectSquare, loadFromFen, resetGame } = useChessStore()

  return (
    <div style={{ padding: 20, background: '#0a0a0f', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', marginBottom: 20 }}>ChessBoard Visual Test</h1>

      {/* Controls */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ color: '#fff', marginBottom: 10 }}>Controls</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => initGame('passAndPlay')}
            style={{
              padding: '8px 16px',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Start New Game
          </button>
          <button
            onClick={() => resetGame()}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            onClick={() => selectSquare('e2')}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Select e2
          </button>
          <button
            onClick={() => selectSquare('e4')}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Move to e4
          </button>
          <button
            onClick={() =>
              loadFromFen('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4')
            }
            style={{
              padding: '8px 16px',
              background: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Load Italian Game
          </button>
          <button
            onClick={() =>
              loadFromFen('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2')
            }
            style={{
              padding: '8px 16px',
              background: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Load Check Position
          </button>
        </div>
      </section>

      {/* Interactive Board */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ color: '#fff', marginBottom: 10 }}>Interactive Board</h2>
        <ChessBoard />
      </section>

      {/* Read-only Board */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ color: '#fff', marginBottom: 10 }}>Read-Only Board (Spectator Mode)</h2>
        <ChessBoard readOnly={true} />
      </section>

      {/* Game State Info */}
      <section>
        <h2 style={{ color: '#fff', marginBottom: 10 }}>Current Game State</h2>
        <pre
          style={{
            background: '#1a1a1a',
            color: '#fff',
            padding: 16,
            borderRadius: 4,
            overflow: 'auto',
            maxWidth: 600,
          }}
        >
          {JSON.stringify(
            {
              phase: useChessStore.getState().phase,
              turn: useChessStore.getState().turn,
              selectedSquare: useChessStore.getState().selectedSquare,
              legalMoves: useChessStore.getState().legalMoves,
              lastMove: useChessStore.getState().lastMove,
              inCheck: useChessStore.getState().inCheck,
              isGameOver: useChessStore.getState().isGameOver,
              result: useChessStore.getState().result,
              moveHistory: useChessStore.getState().moveHistory,
            },
            null,
            2
          )}
        </pre>
      </section>
    </div>
  )
}
