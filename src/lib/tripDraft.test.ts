import { describe, expect, test } from 'vitest'
import { formatTripRange, tripDraftError } from './tripDraft'

const kyoto = { label: 'Kyoto' }

describe('tripDraftError', () => {
  test('asks for a destination first', () => {
    expect(tripDraftError({ destination: null, startDate: '2026-09-12', endDate: '2026-09-20' })).toBe(
      'Choose a destination',
    )
  })

  test('asks for a start date', () => {
    expect(tripDraftError({ destination: kyoto, startDate: '', endDate: '2026-09-20' })).toBe(
      'Pick a start date',
    )
  })

  test('asks for an end date', () => {
    expect(tripDraftError({ destination: kyoto, startDate: '2026-09-12', endDate: '' })).toBe(
      'Pick an end date',
    )
  })

  test('rejects an end date before the start', () => {
    expect(tripDraftError({ destination: kyoto, startDate: '2026-09-20', endDate: '2026-09-12' })).toBe(
      'End date must be on or after the start date',
    )
  })

  test('accepts a same-day trip', () => {
    expect(tripDraftError({ destination: kyoto, startDate: '2026-09-12', endDate: '2026-09-12' })).toBeNull()
  })
})

describe('formatTripRange', () => {
  test('formats a range in the same year', () => {
    expect(formatTripRange('2026-09-12', '2026-09-20')).toBe('Sep 12 – Sep 20, 2026')
  })

  test('returns empty when a date is missing', () => {
    expect(formatTripRange('2026-09-12', '')).toBe('')
  })
})
