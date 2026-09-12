const ROOM_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const ROOM_ID_LENGTH = 8
const ROOM_ID_PATTERN = /^[a-z0-9-]{4,32}$/

export function isValidRoomId(id: string): boolean {
  return ROOM_ID_PATTERN.test(id)
}

export function parseRoomId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const fromPath = trimmed.match(/\/r\/([a-z0-9-]{4,32})/i)
  const candidate = (fromPath?.[1] ?? trimmed.replace(/\s+/g, '')).toLowerCase()
  return isValidRoomId(candidate) ? candidate : null
}

export function createRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_ID_LENGTH))
  return Array.from(bytes, (byte) => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join('')
}

export function liveblocksRoomId(code: string): string {
  return `trip-${code}`
}
