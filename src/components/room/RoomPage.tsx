import { LiveList, LiveMap } from '@liveblocks/client'
import { ClientSideSuspense, RoomProvider } from '@liveblocks/react/suspense'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { Main } from '../../Main'
import { getUserColor } from '../../lib/userColor'
import { isValidRoomId, liveblocksRoomId } from '../../lib/roomId'
import { tripDraftError, type TripDraft } from '../../lib/tripDraft'
import type { Card, Edge, Place, Sticker, Stroke } from '../../liveblocks/types'

type RoomPageProps = {
  displayName: string
}

function isTripSeed(value: unknown): value is TripDraft & { destination: Place } {
  if (!value || typeof value !== 'object') return false
  const draft = value as TripDraft
  return (
    tripDraftError({
      destination: draft.destination ?? null,
      startDate: typeof draft.startDate === 'string' ? draft.startDate : '',
      endDate: typeof draft.endDate === 'string' ? draft.endDate : '',
    }) === null
  )
}

export function RoomPage({ displayName }: RoomPageProps) {
  const { roomId } = useParams()
  const location = useLocation()
  const seed = isTripSeed(location.state) ? location.state : null
  const code = roomId?.toLowerCase() ?? ''

  if (!isValidRoomId(code)) {
    return <Navigate to="/" replace />
  }

  return (
    <RoomProvider
      id={liveblocksRoomId(code)}
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
        strokes: new LiveMap<string, Stroke>(),
        stickers: new LiveMap<string, Sticker>(),
        tripTitle: seed?.destination.label ?? 'Untitled trip',
        destination: seed?.destination ?? { label: '' },
        startDate: seed?.startDate ?? '',
        endDate: seed?.endDate ?? '',
        itinerary: '',
        itineraryStatus: 'idle',
        messages: new LiveList([]),
      }}
    >
      <ClientSideSuspense fallback={<div className="status">Opening {code}…</div>}>
        <Main />
      </ClientSideSuspense>
    </RoomProvider>
  )
}
