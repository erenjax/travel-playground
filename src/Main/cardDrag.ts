import type { Place } from '../liveblocks/types'
import { parseCardKind, type PlaceFill } from './cardContent'

export type CardDragPayload = {
  kind: ReturnType<typeof parseCardKind>
  fill?: PlaceFill
}

function isPlace(value: unknown): value is Place {
  return Boolean(value && typeof value === 'object' && typeof (value as Place).label === 'string')
}

function isPriceLevel(value: unknown): value is 1 | 2 | 3 | 4 {
  return value === 1 || value === 2 || value === 3 || value === 4
}

function parseFill(value: unknown): PlaceFill | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (!isPlace(record.place)) return undefined
  return {
    place: record.place,
    ...(typeof record.imageUrl === 'string' ? { imageUrl: record.imageUrl } : {}),
    ...(typeof record.cuisine === 'string' ? { cuisine: record.cuisine } : {}),
    ...(isPriceLevel(record.priceLevel) ? { priceLevel: record.priceLevel } : {}),
  }
}

export function serializeCardDrag(kind: CardDragPayload['kind'], fill?: PlaceFill): string {
  if (!fill) return kind
  return JSON.stringify({ kind, fill })
}

/** Drag payloads arrive as untrusted strings, so a bad body degrades to a kind only. */
export function parseCardDrag(value: string): CardDragPayload {
  const trimmed = value.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { kind?: unknown; fill?: unknown }
      if (typeof parsed.kind === 'string') {
        return { kind: parseCardKind(parsed.kind), fill: parseFill(parsed.fill) }
      }
    } catch {
      // Fall through to the plain-kind parser.
    }
  }
  return { kind: parseCardKind(value) }
}
