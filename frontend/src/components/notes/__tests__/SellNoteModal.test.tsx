import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SellNoteModal } from '../SellNoteModal'
import * as apiModule from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}))

describe('SellNoteModal Accessibility & Functionality', () => {
  const onClose = vi.fn()
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with all form fields and the accessible dropzone', () => {
    render(<SellNoteModal open={true} onClose={onClose} onSuccess={onSuccess} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/title/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/subject/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/degree \/ course/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/price/i)).toBeInTheDocument()

    const dropzone = screen.getByRole('button', { name: /upload pdf file dropzone/i })
    expect(dropzone).toBeInTheDocument()
    expect(dropzone).toHaveAttribute('tabIndex', '0')
  })

  it('activates file input when Enter key is pressed on the dropzone', async () => {
    render(<SellNoteModal open={true} onClose={onClose} onSuccess={onSuccess} />)

    const dropzone = screen.getByRole('button', { name: /upload pdf file dropzone/i })
    const fileInput = dropzone.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()

    const clickSpy = vi.spyOn(fileInput, 'click')

    dropzone.focus()
    expect(dropzone).toHaveFocus()

    fireEvent.keyDown(dropzone, { key: 'Enter', code: 'Enter' })
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('activates file input when Space key is pressed on the dropzone without scrolling', async () => {
    render(<SellNoteModal open={true} onClose={onClose} onSuccess={onSuccess} />)

    const dropzone = screen.getByRole('button', { name: /upload pdf file dropzone/i })
    const fileInput = dropzone.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click')

    dropzone.focus()
    expect(dropzone).toHaveFocus()

    fireEvent.keyDown(dropzone, { key: ' ', code: 'Space' })
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('handles drag-and-drop state changes and accepts dropped PDF file', () => {
    render(<SellNoteModal open={true} onClose={onClose} onSuccess={onSuccess} />)

    const dropzone = screen.getByRole('button', { name: /upload pdf file dropzone/i })

    // Drag over
    fireEvent.dragOver(dropzone)
    expect(dropzone.className).toContain('bg-[#6366f1]/10')

    // Drag leave
    fireEvent.dragLeave(dropzone)
    expect(dropzone.className).toContain('bg-[#0f0f0f]')

    // Drop valid PDF file
    const file = new File(['dummy pdf content'], 'sample_notes.pdf', { type: 'application/pdf' })
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    })

    expect(screen.getByText(/sample_notes\.pdf/i)).toBeInTheDocument()
    expect(dropzone).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Selected file: sample_notes.pdf')
    )
  })

  it('rejects non-PDF files with accessible alert message', async () => {
    render(<SellNoteModal open={true} onClose={onClose} onSuccess={onSuccess} />)

    const dropzone = screen.getByRole('button', { name: /upload pdf file dropzone/i })
    const invalidFile = new File(['dummy text'], 'notes.txt', { type: 'text/plain' })

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [invalidFile],
      },
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/only pdf files are allowed/i)
  })

  it('rejects files larger than 15MB with accessible alert message', async () => {
    render(<SellNoteModal open={true} onClose={onClose} onSuccess={onSuccess} />)

    const dropzone = screen.getByRole('button', { name: /upload pdf file dropzone/i })
    const largeFile = new File(['a'], 'huge.pdf', { type: 'application/pdf' })
    Object.defineProperty(largeFile, 'size', { value: 16 * 1024 * 1024 })

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [largeFile],
      },
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/file must be under 15mb/i)
  })

  it('submits form successfully when all required fields and a valid PDF are present', async () => {
    const user = userEvent.setup()
    vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({ ok: true })

    render(<SellNoteModal open={true} onClose={onClose} onSuccess={onSuccess} />)

    await user.type(screen.getByPlaceholderText(/title/i), 'Data Structures Unit 1')
    await user.type(screen.getByPlaceholderText(/subject/i), 'Computer Science')
    await user.type(screen.getByPlaceholderText(/degree \/ course/i), 'B.Tech CSE')
    await user.type(screen.getByPlaceholderText(/description/i), 'Comprehensive notes for Trees and Graphs.')

    const dropzone = screen.getByRole('button', { name: /upload pdf file dropzone/i })
    const file = new File(['valid content'], 'trees_graphs.pdf', { type: 'application/pdf' })
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    })

    const submitBtn = screen.getByRole('button', { name: /submit note/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(apiModule.apiFetch).toHaveBeenCalledWith(
        '/api/notes',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      )
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
