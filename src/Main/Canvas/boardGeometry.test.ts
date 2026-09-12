import { describe, expect, test } from 'vitest'
import { pointsToPath, strokeHit } from './boardGeometry'

describe('pointsToPath', () => {
  test('a single point becomes a dot the pen can render', () => {
    expect(pointsToPath([10, 20])).toBe('M10 20 L10 20')
  })

  test('joins points with line segments', () => {
    expect(pointsToPath([0, 0, 10, 5, 20, 5])).toBe('M0 0 L10 5 L20 5')
  })

  test('nothing to draw yields an empty path', () => {
    expect(pointsToPath([])).toBe('')
  })
})

describe('strokeHit', () => {
  const stroke = [0, 0, 100, 0]

  test('hits a point within tolerance of a segment', () => {
    expect(strokeHit(stroke, { x: 50, y: 4 }, 5)).toBe(true)
  })

  test('misses a point past the end of the segment', () => {
    expect(strokeHit(stroke, { x: 120, y: 0 }, 5)).toBe(false)
  })

  test('misses a point too far from the line', () => {
    expect(strokeHit(stroke, { x: 50, y: 12 }, 5)).toBe(false)
  })

  test('a single-point stroke hits within tolerance of the dot', () => {
    expect(strokeHit([10, 10], { x: 12, y: 12 }, 5)).toBe(true)
    expect(strokeHit([10, 10], { x: 30, y: 30 }, 5)).toBe(false)
  })
})
