import { useCallback, useState } from 'react'

const DISPLAY_NAME_KEY = 'multiplayer-canvas-display-name'

function readStoredName(): string | null {
  const stored = localStorage.getItem(DISPLAY_NAME_KEY)?.trim()
  return stored ? stored : null
}

export function useDisplayName() {
  const [displayName, setDisplayName] = useState<string | null>(readStoredName)

  const saveDisplayName = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem(DISPLAY_NAME_KEY, trimmed)
    setDisplayName(trimmed)
  }, [])

  return { displayName, saveDisplayName }
}
