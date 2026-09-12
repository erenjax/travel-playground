import { shallow } from '@liveblocks/client'
import {
  useMutation,
  useOthers,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} from '@liveblocks/react/suspense'
import { useRef, type PointerEvent } from 'react'
import { TopBar } from '../ui/TopBar'
import { Card } from './Card'
import { RemoteCursor } from './RemoteCursor'

const CARD_WIDTH = 160
const CARD_HEIGHT = 56

type CanvasProps = {
  onChangeName: () => void
}

export function Canvas({ onChangeName }: CanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)

  const cards = useStorage((root) => root.cards)
  const others = useOthers()
  const updateMyPresence = useUpdateMyPresence()
  const myUser = useSelf((me) => me.presence.user, shallow)
  const mySelectedCardId = useSelf((me) => me.presence.selectedCardId)

  const addCard = useMutation(({ storage }) => {
    const cards = storage.get('cards')
    const surface = surfaceRef.current
    const offset = (cards.size % 6) * 28
    const id = crypto.randomUUID()

    cards.set(id, {
      id,
      text: 'New card',
      position: {
        x: Math.round((surface?.clientWidth ?? 960) / 2 - CARD_WIDTH / 2) + offset,
        y: Math.round((surface?.clientHeight ?? 600) / 2 - CARD_HEIGHT / 2) + offset,
      },
    })
  }, [])

  const moveCard = useMutation(({ storage }, id: string, x: number, y: number) => {
    const cards = storage.get('cards')
    const card = cards.get(id)
    if (!card) return
    cards.set(id, { ...card, position: { x, y } })
  }, [])

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    updateMyPresence({
      cursor: {
        x: Math.round(event.clientX - rect.left),
        y: Math.round(event.clientY - rect.top),
      },
    })
  }

  return (
    <div className="app">
      <TopBar
        self={myUser}
        others={others.map(({ connectionId, presence }) => ({
          connectionId,
          user: presence.user,
        }))}
        onAddCard={addCard}
        onChangeName={onChangeName}
      />

      <div
        ref={surfaceRef}
        className="canvas"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => updateMyPresence({ cursor: null })}
        onPointerDown={() => updateMyPresence({ selectedCardId: null })}
      >
        {Object.values(cards).map((card) => (
          <Card
            key={card.id}
            card={card}
            myColor={myUser.color}
            selectedByMe={mySelectedCardId === card.id}
            selectedByOthers={others
              .filter(({ presence }) => presence.selectedCardId === card.id)
              .map(({ presence }) => presence.user)}
            onSelect={(id) => updateMyPresence({ selectedCardId: id })}
            onMove={moveCard}
          />
        ))}

        {others.map(({ connectionId, presence }) =>
          presence.cursor ? (
            <RemoteCursor
              key={connectionId}
              x={presence.cursor.x}
              y={presence.cursor.y}
              name={presence.user.name}
              color={presence.user.color}
            />
          ) : null,
        )}
      </div>
    </div>
  )
}
