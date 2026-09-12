import { describe, expect, test } from 'vitest'
import { createRoomId, isValidRoomId, liveblocksRoomId, parseRoomId } from './roomId'

describe('parseRoomId', () => {
  test('reads a bare code and lowercases it', () => {
    expect(parseRoomId('AbC234xy')).toBe('abc234xy')
  })

  test('reads a path', () => {
    expect(parseRoomId('/r/abc234xy')).toBe('abc234xy')
  })

  test('reads a full URL', () => {
    expect(parseRoomId('https://example.com/r/abc234xy')).toBe('abc234xy')
  })

  test('strips query strings from a URL', () => {
    expect(parseRoomId('https://example.com/r/abc234xy?from=invite')).toBe('abc234xy')
  })

  test('rejects empty input', () => {
    expect(parseRoomId('   ')).toBeNull()
  })

  test('rejects junk', () => {
    expect(parseRoomId('not a room!!!')).toBeNull()
  })
})

describe('createRoomId', () => {
  test('returns unique 8-character codes', () => {
    const a = createRoomId()
    const b = createRoomId()
    expect(a).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/)
    expect(isValidRoomId(a)).toBe(true)
    expect(a).not.toBe(b)
  })
})

describe('liveblocksRoomId', () => {
  test('prefixes the public code', () => {
    expect(liveblocksRoomId('abc234xy')).toBe('trip-abc234xy')
  })
})
