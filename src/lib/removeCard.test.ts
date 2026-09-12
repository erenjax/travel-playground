import { describe, expect, test } from 'vitest'
import type { Edge } from '../liveblocks/types'
import { edgeIdsAttachedTo } from './removeCard'

const edge = (id: string, from: string, to: string): Edge => ({
  id,
  from: { cardId: from, side: 'right' },
  to: { cardId: to, side: 'left' },
  color: '#000',
  thickness: 2,
})

describe('edgeIdsAttachedTo', () => {
  test('returns every connector that touches the card', () => {
    const edges = [edge('a', 'one', 'two'), edge('b', 'three', 'one'), edge('c', 'two', 'three')]

    expect(edgeIdsAttachedTo(edges, 'one')).toEqual(['a', 'b'])
  })

  test('returns nothing when the card has no connectors', () => {
    expect(edgeIdsAttachedTo([edge('a', 'one', 'two')], 'three')).toEqual([])
  })
})
