// Bumped when the storage schema changes: `initialStorage` only seeds brand-new rooms, so
// an existing room would be missing `edges`, or holding cards from before card types.
export const ROOM_ID = 'multiplayer-demo-3'

const rawKey: string | undefined = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY

export const LIVEBLOCKS_PUBLIC_KEY = rawKey?.trim() ?? ''
