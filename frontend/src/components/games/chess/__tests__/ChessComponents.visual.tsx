/**
 * Visual test component for ChessSquare and ChessPiece
 * This file demonstrates the components in various states
 * Run this in Storybook or a test page to visually verify the components
 */

import { ChessSquare } from '../ChessSquare'
import { ChessPiece } from '../ChessPiece'

export function ChessComponentsVisualTest() {
  return (
    <div style={{ padding: 20, background: '#0a0a0f', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', marginBottom: 20 }}>Chess Components Visual Test</h1>

      {/* All piece types */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ color: '#fff', marginBottom: 10 }}>All Piece Types</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ background: '#f0d9b5', padding: 10 }}>
            <ChessPiece piece={{ type: 'k', color: 'w' }} />
          </div>
          <div style={{ background: '#f0d9b5', padding: 10 }}>
            <ChessPiece piece={{ type: 'q', color: 'w' }} />
          </div>
          <div style={{ background: '#f0d9b5', padding: 10 }}>
            <ChessPiece piece={{ type: 'r', color: 'w' }} />
          </div>
          <div style={{ background: '#f0d9b5', padding: 10 }}>
            <ChessPiece piece={{ type: 'b', color: 'w' }} />
          </div>
          <div style={{ background: '#f0d9b5', padding: 10 }}>
            <ChessPiece piece={{ type: 'n', color: 'w' }} />
          </div>
          <div style={{ background: '#f0d9b5', padding: 10 }}>
            <ChessPiece piece={{ type: 'p', color: 'w' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <div style={{ background: '#b58863', padding: 10 }}>
            <ChessPiece piece={{ type: 'k', color: 'b' }} />
          </div>
          <div style={{ background: '#b58863', padding: 10 }}>
            <ChessPiece piece={{ type: 'q', color: 'b' }} />
          </div>
          <div style={{ background: '#b58863', padding: 10 }}>
            <ChessPiece piece={{ type: 'r', color: 'b' }} />
          </div>
          <div style={{ background: '#b58863', padding: 10 }}>
            <ChessPiece piece={{ type: 'b', color: 'b' }} />
          </div>
          <div style={{ background: '#b58863', padding: 10 }}>
            <ChessPiece piece={{ type: 'n', color: 'b' }} />
          </div>
          <div style={{ background: '#b58863', padding: 10 }}>
            <ChessPiece piece={{ type: 'p', color: 'b' }} />
          </div>
        </div>
      </section>

      {/* Square states */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ color: '#fff', marginBottom: 10 }}>Square States</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#fff', fontSize: 12, marginBottom: 5 }}>Normal Light</p>
            <ChessSquare
              square="e4"
              piece={{ type: 'k', color: 'w' }}
              isLight={true}
              isSelected={false}
              isLegalMove={false}
              isLastMoveFrom={false}
              isLastMoveTo={false}
              isCheck={false}
              onClick={() => {}}
            />
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 12, marginBottom: 5 }}>Normal Dark</p>
            <ChessSquare
              square="d4"
              piece={{ type: 'q', color: 'b' }}
              isLight={false}
              isSelected={false}
              isLegalMove={false}
              isLastMoveFrom={false}
              isLastMoveTo={false}
              isCheck={false}
              onClick={() => {}}
            />
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 12, marginBottom: 5 }}>Selected</p>
            <ChessSquare
              square="e4"
              piece={{ type: 'n', color: 'w' }}
              isLight={true}
              isSelected={true}
              isLegalMove={false}
              isLastMoveFrom={false}
              isLastMoveTo={false}
              isCheck={false}
              onClick={() => {}}
            />
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 12, marginBottom: 5 }}>Legal Move (empty)</p>
            <ChessSquare
              square="e5"
              piece={null}
              isLight={false}
              isSelected={false}
              isLegalMove={true}
              isLastMoveFrom={false}
              isLastMoveTo={false}
              isCheck={false}
              onClick={() => {}}
            />
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 12, marginBottom: 5 }}>Legal Move (capture)</p>
            <ChessSquare
              square="f5"
              piece={{ type: 'p', color: 'b' }}
              isLight={true}
              isSelected={false}
              isLegalMove={true}
              isLastMoveFrom={false}
              isLastMoveTo={false}
              isCheck={false}
              onClick={() => {}}
            />
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 12, marginBottom: 5 }}>Last Move From</p>
            <ChessSquare
              square="e2"
              piece={null}
              isLight={true}
              isSelected={false}
              isLegalMove={false}
              isLastMoveFrom={true}
              isLastMoveTo={false}
              isCheck={false}
              onClick={() => {}}
            />
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 12, marginBottom: 5 }}>Last Move To</p>
            <ChessSquare
              square="e4"
              piece={{ type: 'p', color: 'w' }}
              isLight={false}
              isSelected={false}
              isLegalMove={false}
              isLastMoveFrom={false}
              isLastMoveTo={true}
              isCheck={false}
              onClick={() => {}}
            />
          </div>
          <div>
            <p style={{ color: '#fff', fontSize: 12, marginBottom: 5 }}>Check</p>
            <ChessSquare
              square="e8"
              piece={{ type: 'k', color: 'b' }}
              isLight={true}
              isSelected={false}
              isLegalMove={false}
              isLastMoveFrom={false}
              isLastMoveTo={false}
              isCheck={true}
              onClick={() => {}}
            />
          </div>
        </div>
      </section>

      {/* Mini board preview */}
      <section>
        <h2 style={{ color: '#fff', marginBottom: 10 }}>Mini Board (4x4 preview)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 60px)', width: 'fit-content' }}>
          <ChessSquare square="a4" piece={{ type: 'r', color: 'b' }} isLight={false} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="b4" piece={{ type: 'n', color: 'b' }} isLight={true} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="c4" piece={{ type: 'b', color: 'b' }} isLight={false} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="d4" piece={{ type: 'q', color: 'b' }} isLight={true} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          
          <ChessSquare square="a3" piece={null} isLight={true} isSelected={false} isLegalMove={true} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="b3" piece={null} isLight={false} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="c3" piece={null} isLight={true} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="d3" piece={null} isLight={false} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          
          <ChessSquare square="a2" piece={{ type: 'p', color: 'w' }} isLight={false} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="b2" piece={{ type: 'p', color: 'w' }} isLight={true} isSelected={true} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="c2" piece={{ type: 'p', color: 'w' }} isLight={false} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="d2" piece={{ type: 'p', color: 'w' }} isLight={true} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          
          <ChessSquare square="a1" piece={{ type: 'r', color: 'w' }} isLight={true} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="b1" piece={{ type: 'n', color: 'w' }} isLight={false} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="c1" piece={{ type: 'b', color: 'w' }} isLight={true} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
          <ChessSquare square="d1" piece={{ type: 'k', color: 'w' }} isLight={false} isSelected={false} isLegalMove={false} isLastMoveFrom={false} isLastMoveTo={false} isCheck={false} onClick={() => {}} />
        </div>
      </section>
    </div>
  )
}
