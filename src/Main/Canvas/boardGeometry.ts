import type { Point } from './useCamera'

/** Post-it colors, in the order the toolbar shows them. */
export const NOTE_COLORS = ['#fef3a8', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#fed7aa', '#ddd6fe']

export const DEFAULT_NOTE_COLOR = NOTE_COLORS[0]

export const PEN_COLORS = ['#1c1917', '#e11d48', '#0f9b8e', '#2563eb', '#f97316', '#7c3aed']

export const PEN_WIDTHS = [2, 4, 8]

export const DEFAULT_PEN_COLOR = PEN_COLORS[0]
export const DEFAULT_PEN_WIDTH = PEN_WIDTHS[1]

export const STICKERS = [
  '🔥', '❤️', '😍', '🤩', '😂', '🥳', '👀', '💯',
  '✅', '❌', '⭐', '💡', '🚩', '⚠️', '💸', '🤑',
  '🌴', '🏖️', '🌊', '⛰️', '🏛️', '🌮', '🍕', '🍹',
  '☕', '🎉', '📸', '🗺️', '✈️', '🚗', '🛏️', '🌅',
]

/** World-space font size of a freshly placed sticker, in pixels. */
export const STICKER_SIZE = 48

/**
 * Strokes are stored as a flat `[x0, y0, x1, y1, …]` array, so a long scribble stays
 * one compact JSON value rather than hundreds of point objects.
 */
export function pointsToPath(points: readonly number[]): string {
  if (points.length < 2) return ''
  let path = `M${points[0]} ${points[1]}`
  if (points.length === 2) return `${path} L${points[0]} ${points[1]}`
  for (let i = 2; i < points.length - 1; i += 2) {
    path += ` L${points[i]} ${points[i + 1]}`
  }
  return path
}

function distanceToSegment(p: Point, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  let t = lengthSquared === 0 ? 0 : ((p.x - ax) * dx + (p.y - ay) * dy) / lengthSquared
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy))
}

/** True when `point` lies within `tolerance` of any segment of the stroke. */
export function strokeHit(points: readonly number[], point: Point, tolerance: number): boolean {
  if (points.length < 2) return false
  if (points.length === 2) {
    return Math.hypot(point.x - points[0], point.y - points[1]) <= tolerance
  }
  for (let i = 0; i < points.length - 3; i += 2) {
    if (distanceToSegment(point, points[i], points[i + 1], points[i + 2], points[i + 3]) <= tolerance) {
      return true
    }
  }
  return false
}
