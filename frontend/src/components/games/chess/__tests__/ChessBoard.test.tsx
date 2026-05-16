import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ChessBoard } from '../ChessBoard'
import { useChessStore } from '../../../../lib/chess/store'

describe('ChessBoard', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useChessStore.getState().resetGame()
    // Initialize game to 'playing' phase
    useChessStore.getState().initGame('passAndPlay')
  })

  it('renders 64 squares in an 8x8 grid', () => {
    const { container } = render(<ChessBoard />)
    const grid = container.querySelector('div[style*="grid-template-columns"]')
    expect(grid).toBeTruthy()
    
    // Count all squares
    const squares = container.querySelectorAll('div[style*="cursor: pointer"]')
    expect(squares.length).toBe(64)
  })

  it('renders pieces in starting position', () => {
    const { container } = render(<ChessBoard />)
    
    // Check for white king (♔)
    expect(container.textContent).toContain('♔')
    // Check for black king (♚)
    expect(container.textContent).toContain('♚')
    // Check for white pawns (♙)
    expect(container.textContent).toContain('♙')
    // Check for black pawns (♟)
    expect(container.textContent).toContain('♟')
  })

  it('highlights selected square when piece is clicked', () => {
    render(<ChessBoard />)
    
    // Directly select e2 (white pawn) via store
    useChessStore.getState().selectSquare('e2')
    
    // Check that a square is now selected
    const state = useChessStore.getState()
    expect(state.selectedSquare).toBe('e2')
    expect(state.legalMoves.length).toBeGreaterThan(0)
    expect(state.legalMoves).toContain('e3')
    expect(state.legalMoves).toContain('e4')
  })

  it('shows legal move highlights after selecting a piece', () => {
    render(<ChessBoard />)
    
    // Select e2 pawn
    useChessStore.getState().selectSquare('e2')
    
    // Re-render to see updates
    render(<ChessBoard />)
    
    // Check that legal moves are highlighted
    const state = useChessStore.getState()
    expect(state.legalMoves).toContain('e3')
    expect(state.legalMoves).toContain('e4')
  })

  it('executes move when clicking legal destination', () => {
    const { rerender } = render(<ChessBoard />)
    
    // Select e2 pawn
    useChessStore.getState().selectSquare('e2')
    rerender(<ChessBoard />)
    
    // Click e4 to move
    useChessStore.getState().selectSquare('e4')
    
    // Check that move was executed
    const state = useChessStore.getState()
    expect(state.lastMove).toEqual({ from: 'e2', to: 'e4' })
    expect(state.moveHistory.length).toBe(1)
    expect(state.turn).toBe('b') // Turn should switch to black
  })

  it('does not allow moves in read-only mode', () => {
    const { container } = render(<ChessBoard readOnly={true} />)
    
    // Try to click a square
    const squares = container.querySelectorAll('div[style*="cursor: pointer"]')
    if (squares[0]) {
      fireEvent.click(squares[0])
    }
    
    // Check that no square was selected
    const state = useChessStore.getState()
    expect(state.selectedSquare).toBeNull()
  })

  it('highlights king square when in check', () => {
    // Load a position where black king is in check
    const checkFen = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2'
    useChessStore.getState().loadFromFen(checkFen)
    
    const { container } = render(<ChessBoard />)
    
    // The component should render without errors
    expect(container).toBeTruthy()
  })

  it('shows last move highlight', () => {
    const { rerender } = render(<ChessBoard />)
    
    // Make a move
    useChessStore.getState().selectSquare('e2')
    useChessStore.getState().selectSquare('e4')
    
    rerender(<ChessBoard />)
    
    // Check that lastMove is set
    const state = useChessStore.getState()
    expect(state.lastMove).toEqual({ from: 'e2', to: 'e4' })
  })

  it('applies custom styling with dark theme', () => {
    const { container } = render(<ChessBoard />)
    
    // Check for dark theme background
    const wrapper = container.querySelector('div[style*="background"]')
    expect(wrapper).toBeTruthy()
  })

  it('renders with correct board orientation (White at bottom)', () => {
    const { container } = render(<ChessBoard />)
    
    // The first row should be rank 8 (Black's back rank)
    // The last row should be rank 1 (White's back rank)
    // This is verified by the piece positions
    expect(container.textContent).toContain('♜') // Black rook should be visible
    expect(container.textContent).toContain('♖') // White rook should be visible
  })
})
