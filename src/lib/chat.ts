import type { ChatItem } from '../liveblocks/types'

export const CHAT_TEXT_MAX = 280

export type { ChatItem }

export function trimChatText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function createUserMessage(input: {
  name: string
  color: string
  text: string
  now?: number
  id?: string
}): ChatItem | null {
  const text = trimChatText(input.text).slice(0, CHAT_TEXT_MAX)
  if (!text) return null
  return {
    id: input.id ?? crypto.randomUUID(),
    kind: 'user',
    name: input.name,
    color: input.color,
    text,
    at: input.now ?? Date.now(),
  }
}

export function createJoinNotice(input: { name: string; now?: number; id?: string }): ChatItem {
  return {
    id: input.id ?? crypto.randomUUID(),
    kind: 'join',
    name: input.name,
    color: '',
    text: `${input.name} joined`,
    at: input.now ?? Date.now(),
  }
}

export function mergeChatFeed(persisted: readonly ChatItem[], live: readonly ChatItem[]): ChatItem[] {
  return [...persisted, ...live].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
}

export function unreadSince(items: readonly ChatItem[], since: number, selfName: string): number {
  return items.filter((item) => item.kind === 'user' && item.at > since && item.name !== selfName)
    .length
}
