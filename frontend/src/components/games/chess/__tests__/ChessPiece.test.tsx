import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ChessPiece } from '../ChessPiece'

describe('ChessPiece', () => {
  it('renders white king symbol', () => {
    const { container } = render(
      <ChessPiece piece={{ type: 'k', color: 'w' }} />
    )
    expect(container.textContent).toBe('♔')
  })

  it('renders black queen symbol', () => {
    const { container } = render(
      <ChessPiece piece={{ type: 'q', color: 'b' }} />
    )
    expect(container.textContent).toBe('♛')
  })

  it('renders white pawn symbol', () => {
    const { container } = render(
      <ChessPiece piece={{ type: 'p', color: 'w' }} />
    )
    expect(container.textContent).toBe('♙')
  })

  it('renders black knight symbol', () => {
    const { container } = render(
      <ChessPiece piece={{ type: 'n', color: 'b' }} />
    )
    expect(container.textContent).toBe('♞')
  })

  it('renders white rook symbol', () => {
    const { container } = render(
      <ChessPiece piece={{ type: 'r', color: 'w' }} />
    )
    expect(container.textContent).toBe('♖')
  })

  it('renders black bishop symbol', () => {
    const { container } = render(
      <ChessPiece piece={{ type: 'b', color: 'b' }} />
    )
    expect(container.textContent).toBe('♝')
  })

  it('applies custom size', () => {
    const { container } = render(
      <ChessPiece piece={{ type: 'k', color: 'w' }} size={64} />
    )
    const div = container.firstChild as HTMLElement
    expect(div.style.fontSize).toBe('64px')
  })
})
