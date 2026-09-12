import { describe, expect, test } from 'vitest'
import { createJoinNotice, createUserMessage, mergeChatFeed, unreadSince } from './chat'

describe('createUserMessage', () => {
  test('trims text and keeps the author', () => {
    expect(
      createUserMessage({
        id: 'm1',
        name: 'Maya',
        color: '#0d9488',
        text: '  tacos are non-negotiable  ',
        now: 100,
      }),
    ).toEqual({
      id: 'm1',
      kind: 'user',
      name: 'Maya',
      color: '#0d9488',
      text: 'tacos are non-negotiable',
      at: 100,
    })
  })

  test('rejects blank messages', () => {
    expect(createUserMessage({ name: 'Maya', color: '#0d9488', text: '   ' })).toBeNull()
  })

  test('caps long messages', () => {
    const text = 'x'.repeat(600)
    const message = createUserMessage({ id: 'm2', name: 'Maya', color: '#0d9488', text, now: 1 })
    expect(message?.text).toHaveLength(280)
  })
})

describe('createJoinNotice', () => {
  test('uses the screenshot-style join line', () => {
    expect(createJoinNotice({ id: 'j1', name: 'Jordan', now: 20 })).toEqual({
      id: 'j1',
      kind: 'join',
      name: 'Jordan',
      color: '',
      text: 'Jordan joined',
      at: 20,
    })
  })
})

describe('mergeChatFeed', () => {
  test('orders persisted messages and live joins by time', () => {
    const persisted = [
      createUserMessage({ id: 'm1', name: 'Maya', color: '#0d9488', text: 'hello', now: 30 })!,
    ]
    const live = [createJoinNotice({ id: 'j1', name: 'Alex', now: 10 })]

    expect(mergeChatFeed(persisted, live).map((item) => item.id)).toEqual(['j1', 'm1'])
  })
})

describe('unreadSince', () => {
  test('counts later messages from other people', () => {
    const feed = [
      createUserMessage({ id: 'm1', name: 'Maya', color: '#111', text: 'one', now: 10 })!,
      createUserMessage({ id: 'm2', name: 'Alex', color: '#222', text: 'two', now: 20 })!,
      createJoinNotice({ id: 'j1', name: 'Jordan', now: 30 }),
      createUserMessage({ id: 'm3', name: 'Maya', color: '#111', text: 'three', now: 40 })!,
    ]

    expect(unreadSince(feed, 15, 'Alex')).toBe(1)
  })
})
