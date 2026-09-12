// Bumped when the storage schema gains a key: `initialStorage` only seeds brand-new
// rooms, so an existing room would be missing `edges` entirely.
export const ROOM_ID = 'multiplayer-demo-2'

const rawKey: string | undefined = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY

export const LIVEBLOCKS_PUBLIC_KEY = rawKey?.trim() ?? ''
