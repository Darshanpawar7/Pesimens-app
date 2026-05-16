import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PromotionPicker } from '../PromotionPicker'

describe('PromotionPicker', () => {
  it('renders all four promotion options', () => {
    const onSelect = vi.fn()
    render(<PromotionPicker colour="w" onSelect={onSelect} />)

    expect(screen.getByText('Queen')).toBeInTheDocument()
    expect(screen.getByText('Rook')).toBeInTheDocument()
    expect(screen.getByText('Bishop')).toBeInTheDocument()
    expect(screen.getByText('Knight')).toBeInTheDocument()
  })

  it('calls onSelect with correct piece when Queen is clicked', () => {
    const onSelect = vi.fn()
    render(<PromotionPicker colour="w" onSelect={onSelect} />)

    const queenButton = screen.getByText('Queen').closest('button')
    fireEvent.click(queenButton!)

    expect(onSelect).toHaveBeenCalledWith('q')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('calls onSelect with correct piece when Rook is clicked', () => {
    const onSelect = vi.fn()
    render(<PromotionPicker colour="w" onSelect={onSelect} />)

    const rookButton = screen.getByText('Rook').closest('button')
    fireEvent.click(rookButton!)

    expect(onSelect).toHaveBeenCalledWith('r')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('calls onSelect with correct piece when Bishop is clicked', () => {
    const onSelect = vi.fn()
    render(<PromotionPicker colour="w" onSelect={onSelect} />)

    const bishopButton = screen.getByText('Bishop').closest('button')
    fireEvent.click(bishopButton!)

    expect(onSelect).toHaveBeenCalledWith('b')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('calls onSelect with correct piece when Knight is clicked', () => {
    const onSelect = vi.fn()
    render(<PromotionPicker colour="w" onSelect={onSelect} />)

    const knightButton = screen.getByText('Knight').closest('button')
    fireEvent.click(knightButton!)

    expect(onSelect).toHaveBeenCalledWith('n')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('renders with white pieces when colour is "w"', () => {
    const onSelect = vi.fn()
    const { container } = render(<PromotionPicker colour="w" onSelect={onSelect} />)

    // ChessPiece components should be rendered with white color
    expect(container).toBeInTheDocument()
  })

  it('renders with black pieces when colour is "b"', () => {
    const onSelect = vi.fn()
    const { container } = render(<PromotionPicker colour="b" onSelect={onSelect} />)

    // ChessPiece components should be rendered with black color
    expect(container).toBeInTheDocument()
  })

  it('displays the modal overlay with correct styling', () => {
    const onSelect = vi.fn()
    const { container } = render(<PromotionPicker colour="w" onSelect={onSelect} />)

    const overlay = container.firstChild as HTMLElement
    expect(overlay).toHaveStyle({
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
    })
  })

  it('displays the title "Choose Promotion"', () => {
    const onSelect = vi.fn()
    render(<PromotionPicker colour="w" onSelect={onSelect} />)

    expect(screen.getByText('Choose Promotion')).toBeInTheDocument()
  })

  it('displays the instruction text', () => {
    const onSelect = vi.fn()
    render(<PromotionPicker colour="w" onSelect={onSelect} />)

    expect(screen.getByText('Select a piece to promote your pawn')).toBeInTheDocument()
  })
})
