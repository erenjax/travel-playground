import { useEffect, useState } from 'react'
import type { CanvasCategory } from '../liveblocks/types'
import { parseSuggestions, safeUrl, type SuggestionResults } from '../Main/suggestions'

type SearchResult = { data?: SuggestionResults; error?: string }

export function useSuggestions(category: CanvasCategory, location: string) {
  const [cache, setCache] = useState<Record<string, SearchResult>>({})
  const key = JSON.stringify(['photos-v2', category, location.trim().replace(/\s+/g, ' ').toLowerCase()])
  const result = cache[key]

  useEffect(() => {
    if (!location || result) return
    const controller = new AbortController()
    async function search() {
      try {
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, location }),
          signal: controller.signal,
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
    }
    void search()
    return () => controller.abort()
  }, [category, location, key, result])

  function retry() {
    setCache((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  return { ...result, loading: Boolean(location && !result), retry }
}
