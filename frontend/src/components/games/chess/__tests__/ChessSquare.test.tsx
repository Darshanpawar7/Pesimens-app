import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ChessSquare } from '../ChessSquare'

describe('ChessSquare', () => {
  it('renders light square with correct background color', () => {
    const { container } = render(
      <ChessSquare
        square="e4"
        piece={null}
        isLight={true}
        isSelected={false}
        isLegalMove={false}
        isLastMoveFrom={false}
        isLastMoveTo={false}
        isCheck={false}
        onClick={() => {}}
      />
    )
    const square = container.firstChild as HTMLElement
    expect(square.style.backgroundColor).toBe('rgb(240, 217, 181)') // #f0d9b5
  })

  it('renders dark square with correct background color', () => {
    const { container } = render(
      <ChessSquare
        square="d4"
        piece={null}
        isLight={false}
        isSelected={false}
        isLegalMove={false}
        isLastMoveFrom={false}
        isLastMoveTo={false}
        isCheck={false}
        onClick={() => {}}
      />
    )
    const square = container.firstChild as HTMLElement
    expect(square.style.backgroundColor).toBe('rgb(181, 136, 99)') // #b58863
  })

  it('renders piece when provided', () => {
    const { container } = render(
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
    )
    expect(container.textContent).toBe('♔')
  })

  it('shows selected highlight with indigo border', () => {
    const { container } = render(
      <ChessSquare
        square="e4"
        piece={null}
        isLight={true}
        isSelected={true}
        isLegalMove={false}
        isLastMoveFrom={false}
        isLastMoveTo={false}
        isCheck={false}
        onClick={() => {}}
      />
    )
    const square = container.firstChild as HTMLElement
    expect(square.style.border).toContain('3px solid')
  })

  it('shows legal move dot on empty square', () => {
    const { container } = render(
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
    )
    // Check for the dot indicator
    const square = container.firstChild as HTMLElement
    const dot = square.querySelector('div[style*="border-radius"]')
    expect(dot).toBeTruthy()
  })

  it('shows check highlight overlay', () => {
    const { container } = render(
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
    )
    const square = container.firstChild as HTMLElement
    const overlay = square.querySelector('div[style*="position: absolute"]')
    expect(overlay).toBeTruthy()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <ChessSquare
        square="e4"
        piece={null}
        isLight={true}
        isSelected={false}
        isLegalMove={false}
        isLastMoveFrom={false}
        isLastMoveTo={false}
        isCheck={false}
        onClick={handleClick}
      />
    )
    const square = container.firstChild as HTMLElement
    fireEvent.click(square)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows last move highlight', () => {
    const { container } = render(
      <ChessSquare
        square="e4"
        piece={null}
        isLight={true}
        isSelected={false}
        isLegalMove={false}
        isLastMoveFrom={true}
        isLastMoveTo={false}
        isCheck={false}
        onClick={() => {}}
      />
    )
    const square = container.firstChild as HTMLElement
    const overlay = square.querySelector('div[style*="position: absolute"]')
    expect(overlay).toBeTruthy()
  })

  it('applies custom size', () => {
    const { container } = render(
      <ChessSquare
        square="e4"
        piece={null}
        isLight={true}
        isSelected={false}
        isLegalMove={false}
        isLastMoveFrom={false}
        isLastMoveTo={false}
        isCheck={false}
        onClick={() => {}}
        size={80}
      />
    )
    const square = container.firstChild as HTMLElement
    expect(square.style.width).toBe('80px')
    expect(square.style.height).toBe('80px')
  })
})
