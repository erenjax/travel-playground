import { LiveMap } from '@liveblocks/client'
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from '@liveblocks/react/suspense'
import { useState } from 'react'
import { Main } from './Main'
import { NameGate } from './Main/Onboarding/NameGate'
import { useDisplayName } from './hooks/useDisplayName'
import { getUserColor } from './lib/userColor'
import { LIVEBLOCKS_PUBLIC_KEY, ROOM_ID } from './liveblocks/client'
import type { Card, Edge } from './liveblocks/types'
import './App.css'

function MissingKeyNotice() {
  return (
    <div className="gate">
      <div className="gate-card notice">
        <h1>Missing Liveblocks key</h1>
        <p>
          Create a <code>.env.local</code> file in the project root (see{' '}
          <code>.env.example</code>) with your public key from the Liveblocks dashboard, then
          restart <code>npm run dev</code>:
        </p>
        <pre>VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_...</pre>
      </div>
    </div>
  )
}

export default function App() {
  const { displayName, saveDisplayName } = useDisplayName()
  const [editingName, setEditingName] = useState(false)

  if (!LIVEBLOCKS_PUBLIC_KEY) {
    return <MissingKeyNotice />
  }

  if (!displayName || editingName) {
    return (
      <NameGate
        initialName={displayName ?? ''}
        onSubmit={(name) => {
          saveDisplayName(name)
          setEditingName(false)
        }}
      />
    )
  }

  return (
    <LiveblocksProvider publicApiKey={LIVEBLOCKS_PUBLIC_KEY} throttle={16}>
      <RoomProvider
        id={ROOM_ID}
        initialPresence={{
          activeCategory: 'Hotels',
          cursor: null,
          selectedCardId: null,
          selectedEdgeId: null,
          editingCardId: null,
          user: { name: displayName, color: getUserColor(displayName) },
        }}
        initialStorage={{
          cards: new LiveMap<string, Card>(),
          edges: new LiveMap<string, Edge>(),
          tripTitle: 'Untitled trip',
        }}
      >
        <ClientSideSuspense fallback={<div className="status">Connecting to {ROOM_ID}…</div>}>
          <Main />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
