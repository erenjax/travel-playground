import { describe, expect, test } from 'vitest'
import type { Card } from '../../liveblocks/types'
import { CARD_HEIGHT, CARD_WIDTH, anchorPoint, findDropTarget } from './edgeGeometry'

const card = (id: string, x: number, y: number): Card => ({
  id,
  position: { x, y },
  content: { _tag: 'BlankCard', data: { text: id } },
})

describe('anchorPoint', () => {
  test('places side anchors using the card height', () => {
    const note = card('note', 10, 20)

    expect(anchorPoint(note, 'right', { width: CARD_WIDTH, height: 80 })).toEqual({
      x: 10 + CARD_WIDTH,
      y: 60,
    })
    expect(anchorPoint(note, 'bottom', { width: CARD_WIDTH, height: 80 })).toEqual({
      x: 10 + CARD_WIDTH / 2,
      y: 100,
    })
  })

  test('falls back to the default height', () => {
    const note = card('note', 0, 0)

    expect(anchorPoint(note, 'bottom').y).toBe(CARD_HEIGHT)
  })
})

describe('findDropTarget', () => {
  test('hits a short card only inside its measured bounds', () => {
    const cards = { short: card('short', 0, 0) }
    const sizes = { short: { width: CARD_WIDTH, height: 60 } }

    expect(findDropTarget(cards, { x: 100, y: 30 }, 'other', sizes)?.cardId).toBe('short')
    expect(findDropTarget(cards, { x: 100, y: 140 }, 'other', sizes)).toBeNull()
  })
})
