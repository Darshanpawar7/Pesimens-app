import { describe, it, expect } from 'vitest'
import { getClubImageAlt } from '../utils'

describe('getClubImageAlt', () => {
  it('returns explicit alt text when provided', () => {
    expect(getClubImageAlt('Chess Club', 'A chessboard with pieces'))
      .toBe('A chessboard with pieces')
  })

  it('returns club name + suffix when no explicit alt', () => {
    expect(getClubImageAlt('Robotics Club'))
      .toBe('Robotics Club cover image')
  })

  it('returns generic fallback when neither name nor alt is provided', () => {
    expect(getClubImageAlt()).toBe('Club cover image')
  })

  it('returns generic fallback for empty string name', () => {
    expect(getClubImageAlt('')).toBe('Club cover image')
  })

  it('returns generic fallback for undefined name and empty alt', () => {
    expect(getClubImageAlt(undefined, '')).toBe('Club cover image')
  })

  it('prefers explicit alt over club name', () => {
    expect(getClubImageAlt('Drama Club', 'Stage photo from annual play'))
      .toBe('Stage photo from annual play')
  })
})
