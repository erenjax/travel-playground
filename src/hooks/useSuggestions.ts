import { useEffect, useState } from 'react'
import type { CanvasCategory } from '../liveblocks/types'
import { parseSuggestions, safeUrl, type SuggestionResults } from '../Main/suggestions'

type SearchResult = { data?: SuggestionResults; error?: string }

export function useSuggestions(location: string) {
  const [cache, setCache] = useState<Record<string, SearchResult>>({})
  const [retryToken, setRetryToken] = useState(0)
  const normalizedLocation = location.trim().replace(/\s+/g, ' ')
  const locationKey = normalizedLocation.toLowerCase()

  useEffect(() => {
    if (!normalizedLocation) return
    const controller = new AbortController()
    async function search() {
      await Promise.all(CATEGORIES.map(async (category) => {
        const key = JSON.stringify(['photos-v2', category, locationKey])
        if (cache[key]) return
        try {
          const response = await fetch('/api/suggestions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, location: normalizedLocation }), signal: controller.signal,
          })
          const body = await response.json()
          if (!response.ok) throw new Error(body.error || 'Could not load suggestions.')
          const data: SuggestionResults = {
            suggestions: parseSuggestions(body.suggestions),
            sources: Array.isArray(body.sources) ? body.sources.filter(
              (source: { url?: unknown; title?: unknown }) => safeUrl(source.url) && typeof source.title === 'string',
            ) : [],
          }
          if (!controller.signal.aborted) setCache((current) => ({ ...current, [key]: { data } }))
        } catch (error) {
          if (!controller.signal.aborted) setCache((current) => ({ ...current, [key]: {
            error: error instanceof Error ? error.message : 'Could not load suggestions.',
          } }))
        }
      }))
    }
    void search()
    return () => controller.abort()
  }, [normalizedLocation, locationKey, retryToken])

  function retry() {
    setCache({})
    setRetryToken((token) => token + 1)
  }

  function forCategory(category: CanvasCategory) {
    const result = cache[JSON.stringify(['photos-v2', category, locationKey])]
    return { ...result, loading: Boolean(normalizedLocation && !result), retry }
  }

  return { forCategory, loading: Boolean(normalizedLocation && CATEGORIES.some((category) => !cache[JSON.stringify(['photos-v2', category, locationKey])])), retry }
}

const CATEGORIES: CanvasCategory[] = ['Hotels', 'Attractions', 'Food']
