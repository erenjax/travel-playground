import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useSelf, useStorage, useUpdateMyPresence } from '@liveblocks/react/suspense'
import { Link, useParams } from 'react-router-dom'
import type { CanvasCategory } from '../liveblocks/types'
import { resolvePlaceAnchor, showAnchorOnTab, type LastSpot } from '../lib/placeAnchor'
import { cardTitle, categoryOfKind, placeFromCard } from '../lib/placeFromCard'
import { formatTripRange } from '../lib/tripDraft'
import { Canvas } from './Canvas/Canvas'
import { CardBody } from './Canvas/CardBody'
import { useCamera } from './Canvas/useCamera'
import { SideTab } from './Bars/SideTab'
import { CATEGORIES, CATEGORY_KIND } from './categories'
import { summarizeGroupVotes } from '../lib/cardVotes'
import type { Card as CardData } from '../liveblocks/types'

type ActiveTab = CanvasCategory | 'Itinerary'
type Itinerary = { days: { date: string; title: string; activities: { cardId: string; name: string; category: string; note: string }[] }[] }

export function Main() {
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [category, setCategory] = useState<CanvasCategory>('Hotels')
  const [copied, setCopied] = useState(false)
  const [lastSpot, setLastSpot] = useState<LastSpot | null>(null)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [itineraryBusy, setItineraryBusy] = useState(false)
  const [itineraryError, setItineraryError] = useState('')
  const destination = useStorage((root) => root.destination)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const updateMyPresence = useUpdateMyPresence()
  const cameraControls = useCamera(category === 'Itinerary' ? 'Hotels' : category)
  const { roomId } = useParams()
  const cards = useStorage((root) => root.cards)
  const startDate = useStorage((root) => root.startDate)
  const endDate = useStorage((root) => root.endDate)
  const selectedCardId = useSelf((me) => me.presence.selectedCardId)
  const dateLabel = formatTripRange(startDate ?? '', endDate ?? '')
  const placeLabel = destination?.label.trim() ?? ''
  const anchor = resolvePlaceAnchor(lastSpot, destination)
  async function createItinerary() {
    setItineraryBusy(true)
    setItineraryError('')
    try {
      const response = await fetch('/api/itinerary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destination: placeLabel, startDate, endDate, cards: Object.values(cards).map((card) => ({ id: card.id, type: card.content._tag, name: contenderName(card.content), address: 'location' in card.content.data ? card.content.data.location.label : '' })) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not create itinerary.')
      setItinerary(data)
      setCategory('Itinerary')
    } catch (error) { setItineraryError(error instanceof Error ? error.message : 'Could not create itinerary.') }
    finally { setItineraryBusy(false) }
  }
  const topContenders = useMemo(() => {
    if (category === 'Itinerary') return []
    const kind = CATEGORY_KIND[category]
    const categoryCards = Object.values(cards).filter((card): card is CardData => card.content._tag === kind)
    return summarizeGroupVotes(categoryCards).ranking.filter((card) => card.score > 0).slice(0, 3)
  }, [cards, category])

  useEffect(() => {
    if (!selectedCardId) return
    const card = cards[selectedCardId]
    if (!card) return
    const place = placeFromCard(card.content)
    const sourceCategory = categoryOfKind(card.content._tag)
    if (!place || !sourceCategory) return
    setLastSpot({
      place,
      category: sourceCategory,
      title: cardTitle(card.content) ?? place.label,
    })
  }, [selectedCardId, cards])

  function selectCategory(next: CanvasCategory) {
    if (next === category) return
    updateMyPresence({
      activeCategory: next,
      cursor: null,
      selectedCardId: null,
      selectedEdgeId: null,
      editingCardId: null,
    })
    setCategory(next)
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % CATEGORIES.length; break
      case 'ArrowLeft': next = (index + CATEGORIES.length - 1) % CATEGORIES.length; break
      case 'Home': next = 0; break
      case 'End': next = CATEGORIES.length - 1; break
      default: return
    }
    event.preventDefault()
    selectCategory(CATEGORIES[next])
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="app">
      <header className="canvas-top-bar">
        <Link to="/" className="canvas-home-link">
          All trips
        </Link>
        {(placeLabel || dateLabel) && (
          <p className="canvas-trip-meta">
            {placeLabel && <span>{placeLabel}</span>}
            {placeLabel && dateLabel && <span aria-hidden="true"> · </span>}
            {dateLabel && <span>{dateLabel}</span>}
          </p>
        )}
        <span className="canvas-top-bar-label">Canvases</span>
        <div className="canvas-tabs" role="tablist" aria-label="Travel canvases">
          {CATEGORIES.map((item, index) => (
            <button
              key={item}
              ref={(element) => { tabRefs.current[index] = element }}
              type="button"
              role="tab"
              id={`canvas-tab-${item}`}
              aria-controls={`canvas-panel-${item}`}
              aria-selected={category === item}
              tabIndex={category === item ? 0 : -1}
              className="canvas-tab"
              onClick={() => selectCategory(item)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {item}
              {showAnchorOnTab(anchor, item, category) && (
                <span className="canvas-tab-spot">{anchor?.title}</span>
              )}
            </button>
          ))}
          {itinerary && <button type="button" role="tab" className="canvas-tab" aria-selected={category === 'Itinerary'} onClick={() => setCategory('Itinerary')}>Itinerary</button>}
        </div>
        {roomId && (
          <button type="button" className="canvas-itinerary-button" onClick={() => void createItinerary()} disabled={itineraryBusy || Object.keys(cards).length === 0}>
            {itineraryBusy ? 'Creating…' : 'Create itinerary'}
          </button>
        )}
        {roomId && (
          <button
            type="button"
            className="canvas-invite"
            onClick={() => {
              void navigator.clipboard.writeText(`${window.location.origin}/r/${roomId}`)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            }}
          >
            {copied ? 'Copied' : 'Copy invite'}
          </button>
        )}
      </header>
      {itineraryError && <div className="itinerary-error" role="alert">{itineraryError}</div>}
      {category !== 'Itinerary' && <div className="top-contenders-bar" aria-label="Top contenders">
        <span className="top-contenders-label">Top contenders</span>
        <div className="top-contenders-list">
          {topContenders.map((contender, index) => (
            <button
              key={contender.cardId}
              type="button"
              className="top-contender"
              onClick={() => updateMyPresence({ selectedCardId: contender.cardId, selectedEdgeId: null })}
              aria-label={`Top contender ${index + 1}: ${contenderName(contender.content)}, score ${contender.score}`}
            >
              <span className="top-contender-rank">{index + 1}</span>
              <span className="top-contender-content">{contenderName(contender.content)}</span>
              <span className="top-contender-score">{contender.score > 0 ? '+' : ''}{contender.score}</span>
            </button>
          ))}
        </div>
      </div>}
      {CATEGORIES.map((item) => (
        <div
          key={item}
          className="app-body"
          role="tabpanel"
          id={`canvas-panel-${item}`}
          aria-labelledby={`canvas-tab-${item}`}
          hidden={category !== item}
          tabIndex={0}
          style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
        >
          {category === item && (
            <>
              <Canvas category={item} cameraControls={cameraControls} />
              <SideTab
                category={item}
                width={sidebarWidth}
                onResize={setSidebarWidth}
                anchor={anchor}
                onClearSpot={() => setLastSpot(null)}
              />
            </>
          )}
        </div>
      ))}
      {itinerary && <div className="app-body itinerary-body" hidden={category !== 'Itinerary'}><ItineraryCanvas itinerary={itinerary} cards={cards} /></div>}
    </div>
  )
}

function contenderName(content: CardData['content']) {
  switch (content._tag) {
    case 'HotelCard':
    case 'AttractionCard':
    case 'FoodCard':
      return content.data.name
    case 'FlightCard':
      return `${content.data.departure.place.label} → ${content.data.arrival.place.label}`
    case 'PhotoCard':
      return content.data.caption ?? 'Photo'
    case 'BlankCard':
      return content.data.text || 'Blank card'
  }
}

function ItineraryCanvas({ itinerary, cards }: { itinerary: Itinerary; cards: Record<string, CardData> }) {
  const [days, setDays] = useState(itinerary.days)
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  useEffect(() => setDays(itinerary.days), [itinerary.days])

  function moveCard(dayDate: string, cardId = draggedCardId) {
    if (!cardId) return
    setDays((current) => {
      const activity = current.flatMap((day) => day.activities).find((item) => item.cardId === cardId)
      if (!activity) return current
      return current.map((day) => ({
        ...day,
        activities: day.date === dayDate
          ? [...day.activities.filter((item) => item.cardId !== cardId), activity]
          : day.activities.filter((item) => item.cardId !== cardId),
      }))
    })
    setDraggedCardId(null)
  }

  return (
    <div className="itinerary-canvas">
      <div className="itinerary-columns">
        {days.map((day) => (
          <section className="itinerary-column" key={day.date} onDragOver={(event) => event.preventDefault()} onDrop={() => moveCard(day.date)}>
            <header><strong>{day.date}</strong><span>{day.title}</span></header>
            <div className="itinerary-column-cards">
              {day.activities.map((activity) => {
                const card = cards[activity.cardId]
                if (!card) return null
                return <article className="itinerary-card" key={activity.cardId} draggable onDragStart={(event) => { setDraggedCardId(activity.cardId); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', activity.cardId) }} onDragEnd={() => setDraggedCardId(null)}><CardBody content={card.content} /><p>{activity.note}</p><label className="itinerary-move"><span>Move to</span><select value={day.date} onChange={(event) => moveCard(event.target.value, activity.cardId)} onPointerDown={(event) => event.stopPropagation()}>{days.map((option) => <option key={option.date} value={option.date}>{option.date}</option>)}</select></label></article>
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
