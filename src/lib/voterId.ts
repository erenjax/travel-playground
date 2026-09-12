const VOTER_ID_KEY = 'multiplayer-canvas-voter-id'

/** Stable across reloads so a person's votes stay theirs after they close the tab. */
export function getVoterId(): string {
  const stored = localStorage.getItem(VOTER_ID_KEY)
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem(VOTER_ID_KEY, id)
  return id
}
