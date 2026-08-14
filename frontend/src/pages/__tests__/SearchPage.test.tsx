import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchPage from '../SearchPage'

const RECENT_KEY = 'pesu_hub_recent_searches'

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(() =>
    Promise.resolve({ results: {}, total_count: 0, query: '' })
  ),
}))

describe('SearchPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: {} },
  })

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SearchPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
  })

  it('renders without crashing', () => {
    const { container } = renderComponent()
    expect(container).toBeInTheDocument()
  })

  it('shows the recent searches dropdown on focus when history exists', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['react', 'placements']))
    renderComponent()

    const input = screen.getByPlaceholderText(/search people/i)
    fireEvent.focus(input)

    expect(screen.getByRole('listbox', { name: /recent searches/i })).toBeInTheDocument()
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('placements')).toBeInTheDocument()
  })

  it('does not show the dropdown when there is no history', () => {
    renderComponent()
    const input = screen.getByPlaceholderText(/search people/i)
    fireEvent.focus(input)
    expect(screen.queryByRole('listbox', { name: /recent searches/i })).not.toBeInTheDocument()
  })

  it('clicking a recent term runs the search and closes the dropdown', async () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['react']))
    renderComponent()

    const input = screen.getByPlaceholderText(/search people/i) as HTMLInputElement
    fireEvent.focus(input)
    fireEvent.click(screen.getByText('react'))

    await waitFor(() => expect(input.value).toBe('react'))
    expect(screen.queryByRole('listbox', { name: /recent searches/i })).not.toBeInTheDocument()
  })

  it('Clear button empties the list and localStorage', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['react', 'placements']))
    renderComponent()

    const input = screen.getByPlaceholderText(/search people/i)
    fireEvent.focus(input)
    fireEvent.click(screen.getByText('Clear'))

    expect(screen.queryByRole('listbox', { name: /recent searches/i })).not.toBeInTheDocument()
    expect(localStorage.getItem(RECENT_KEY)).toBeNull()
  })

  it('supports keyboard navigation to select a recent term', async () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['react', 'placements']))
    renderComponent()

    const input = screen.getByPlaceholderText(/search people/i) as HTMLInputElement
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(input.value).toBe('react'))
  })
})
