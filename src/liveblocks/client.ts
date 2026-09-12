export const ROOM_ID = 'multiplayer-demo'

const rawKey: string | undefined = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY

export const LIVEBLOCKS_PUBLIC_KEY = rawKey?.trim() ?? ''
