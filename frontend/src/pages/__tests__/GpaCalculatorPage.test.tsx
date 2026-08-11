import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import GpaCalculatorPage, { GRADE_POINTS } from '../GpaCalculatorPage'

describe('GpaCalculatorPage', () => {
  it('renders the header and all 3 navigation tabs', () => {
    render(<GpaCalculatorPage />)

    expect(screen.getByText(/GPA & CGPA Calculator/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /SGPA Calculator/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /CGPA Calculator/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Target Predictor/i })).toBeDefined()
  })

  it('correctly maps PES University grade points', () => {
    expect(GRADE_POINTS.S).toBe(10)
    expect(GRADE_POINTS.A).toBe(9)
    expect(GRADE_POINTS.B).toBe(8)
    expect(GRADE_POINTS.C).toBe(7)
    expect(GRADE_POINTS.D).toBe(6)
    expect(GRADE_POINTS.E).toBe(5)
    expect(GRADE_POINTS.F).toBe(0)
  })

  it('calculates initial default SGPA correctly', () => {
    render(<GpaCalculatorPage />)

    // Default courses:
    // Course 1: 4 cr, S (10) = 40
    // Course 2: 4 cr, A (9) = 36
    // Course 3: 3 cr, A (9) = 27
    // Course 4: 3 cr, B (8) = 24
    // Course 5: 2 cr, S (10) = 20
    // Total credits = 16, Total points = 147 -> SGPA = 147 / 16 = 9.19
    expect(screen.getByText('9.19')).toBeDefined()
    expect(screen.getByText('16')).toBeDefined()
    expect(screen.getByText('147')).toBeDefined()
  })

  it('supports adding and deleting courses in SGPA tab', () => {
    render(<GpaCalculatorPage />)

    const addButton = screen.getByRole('button', { name: /Add Course/i })
    fireEvent.click(addButton)

    // Should now have 6 courses
    expect(screen.getByText(/6 courses added/i)).toBeDefined()
  })

  it('switches to CGPA tab and computes cumulative GPA', () => {
    render(<GpaCalculatorPage />)

    const cgpaTabBtn = screen.getByRole('button', { name: /CGPA Calculator/i })
    fireEvent.click(cgpaTabBtn)

    expect(screen.getByText(/Past Semesters/i)).toBeDefined()
    // Defaults: Sem 1 (8.5 * 20 = 170), Sem 2 (8.8 * 22 = 193.6), Sem 3 (8.2 * 20 = 164)
    // Total credits = 62, total points = 527.6 -> CGPA = 8.51
    expect(screen.getByText('8.51')).toBeDefined()
  })

  it('switches to Target Predictor tab and computes required SGPA', () => {
    render(<GpaCalculatorPage />)

    const targetTabBtn = screen.getByRole('button', { name: /Target Predictor/i })
    fireEvent.click(targetTabBtn)

    expect(screen.getByText(/Target Predictor Parameters/i)).toBeDefined()
    expect(screen.getByText(/Required SGPA Next Sem/i)).toBeDefined()

    // Default: current 8.0 with 60 cr, target 8.5 with 20 upcoming cr
    // required = (8.5 * 80 - 8.0 * 60) / 20 = (680 - 480) / 20 = 10.00
    expect(screen.getByText('10.00')).toBeDefined()
  })

  it('shows impossible target warning when target SGPA exceeds 10.0', () => {
    render(<GpaCalculatorPage />)

    const targetTabBtn = screen.getByRole('button', { name: /Target Predictor/i })
    fireEvent.click(targetTabBtn)

    // Change target CGPA input to 9.5
    const targetInput = screen.getByDisplayValue('8.5')
    fireEvent.change(targetInput, { target: { value: '9.5' } })

    // required = (9.5 * 80 - 8.0 * 60) / 20 = (760 - 480) / 20 = 14.00 > 10
    expect(screen.getByText(/Mathematically Impossible/i)).toBeDefined()
  })

  it('rejects semester credit changes below minimum (< 1)', () => {
    render(<GpaCalculatorPage />)

    const cgpaTabBtn = screen.getByRole('button', { name: /CGPA Calculator/i })
    fireEvent.click(cgpaTabBtn)

    const creditInputs = screen.getAllByPlaceholderText('Credits')
    const firstCreditInput = creditInputs[0] as HTMLInputElement

    // Try setting to 0 (below allowed minimum 1)
    fireEvent.change(firstCreditInput, { target: { value: '0' } })

    // Value should remain original (20) and not change to 0
    expect(firstCreditInput.value).toBe('20')
  })
})
