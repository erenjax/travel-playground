import type { Card, CardContent, CardVote, VoteValue } from '../liveblocks/types'

export type CardVoteEntry = {
  readonly voterId: string
  readonly voterName: string
  readonly value: VoteValue
}

/** One card's votes, flattened so a prompt can list who voted without joining other state. */
export type CardVoteTally = {
  readonly cardId: string
  readonly content: CardContent
  readonly up: number
  readonly down: number
  readonly score: number
  readonly votes: CardVoteEntry[]
}

export type GroupVoteSummary = {
  readonly cards: CardVoteTally[]
  /** Same tallies, highest score first, then most upvotes. */
  readonly ranking: CardVoteTally[]
}

/** Liveblocks can hand back a missing/legacy field as a plain object, which is not iterable. */
export function voteList(votes: Card['votes'] | unknown): CardVote[] {
  if (Array.isArray(votes)) return votes
  if (!votes || typeof votes !== 'object') return []
  return Object.entries(votes).flatMap(([key, value]) => {
    if (!value || typeof value !== 'object') return []
    const vote = value as { voterId?: string; name?: string; value?: VoteValue }
    if (vote.value !== 2 && vote.value !== 1 && vote.value !== -1) return []
    return [{
      voterId: vote.voterId ?? key,
      name: typeof vote.name === 'string' ? vote.name : key,
      value: vote.value,
    }]
  })
}

export function voteOf(
  votes: Card['votes'],
  voterId: string,
): VoteValue | undefined {
  return voteList(votes).find((vote) => vote.voterId === voterId)?.value
}

export function scoreOf(votes: Card['votes']): number {
  let score = 0
  for (const vote of voteList(votes)) score += vote.value
  return score
}

/**
 * Clicking the same direction again clears the vote. Switching from up to down
 * (or the reverse) replaces it.
 */
export function toggleCardVote(
  votes: Card['votes'],
  voterId: string,
  name: string,
  value: VoteValue,
): CardVote[] | undefined {
  const current = voteList(votes)
  const existing = current.find((vote) => vote.voterId === voterId)
  const next = existing?.value === value
    ? current.filter((vote) => vote.voterId !== voterId)
    : existing
      ? current.map((vote) => (vote.voterId === voterId ? { voterId, name, value } : vote))
      : [...current, { voterId, name, value }]
  return next.length === 0 ? undefined : next
}

export function tallyCardVotes(card: Card): CardVoteTally {
  const entries: CardVoteEntry[] = voteList(card.votes).map((vote) => ({
    voterId: vote.voterId,
    voterName: vote.name,
    value: vote.value,
  }))
  let up = 0
  let down = 0
  let love = 0
  for (const entry of entries) {
    if (entry.value === 1) up += 1
    else if (entry.value === -1) down += 1
    else love += 1
  }
  return {
    cardId: card.id,
    content: card.content,
    up,
    down,
    score: up + love * 2 - down,
    votes: entries,
  }
}

/** Pass any card list — a category tab, an edge cluster, a hand-picked set. */
export function summarizeGroupVotes(cards: readonly Card[]): GroupVoteSummary {
  const tallies = cards.map(tallyCardVotes)
  const ranking = [...tallies].sort((a, b) => b.score - a.score || b.up - a.up)
  return { cards: tallies, ranking }
}
