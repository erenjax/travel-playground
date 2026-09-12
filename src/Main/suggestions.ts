import type { CardContent, CanvasCategory } from '../liveblocks/types.ts'

export const SUGGESTION_LIMIT = 3

export type Suggestion = {
  name: string
  address: string
  description: string
  cuisine: string
  website: string
  imageUrl?: string
  imageSourceUrl?: string
}

export type SuggestionResults = {
  suggestions: Suggestion[]
  sources: { title: string; url: string }[]
}

export function safeUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch { return '' }
}

export function parseSuggestions(value: unknown): Suggestion[] {
  if (!Array.isArray(value)) throw new Error('Invalid suggestions response')
  return value.slice(0, SUGGESTION_LIMIT).map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid suggestion')
    const data = item as Record<string, unknown>
    for (const field of ['name', 'address', 'description', 'cuisine', 'website']) {
      if (typeof data[field] !== 'string' || data[field].length > 2000) {
        throw new Error('Invalid suggestion details')
      }
    }
    if (!(data.name as string).trim() || !(data.address as string).trim()) {
      throw new Error('Missing place details')
    }
    return {
      name: data.name as string,
      address: data.address as string,
      description: data.description as string,
      cuisine: data.cuisine as string,
      website: safeUrl(data.website),
      imageUrl: safeUrl(data.imageUrl),
      imageSourceUrl: safeUrl(data.imageSourceUrl),
    }
  })
}

export function suggestionContent(category: CanvasCategory, suggestion: Suggestion): CardContent {
  const common = {
    name: suggestion.name,
    location: { label: suggestion.address },
    imageUrl: safeUrl(suggestion.imageUrl),
    imageSourceUrl: safeUrl(suggestion.imageSourceUrl),
  }
  switch (category) {
    case 'Hotels': return { _tag: 'HotelCard', data: common }
    case 'Attractions': return { _tag: 'AttractionCard', data: common }
    case 'Food': return { _tag: 'FoodCard', data: { ...common, cuisine: suggestion.cuisine } }
  }
}

export const SUGGESTION_MIME = 'application/x-travel-suggestion'
