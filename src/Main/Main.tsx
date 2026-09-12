import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { shallow } from '@liveblocks/client'
import { useMutation, useOthers, useSelf, useStorage, useUpdateMyPresence } from '@liveblocks/react/suspense'
import { Link, useParams } from 'react-router-dom'
import type { CanvasCategory } from '../liveblocks/types'
import { resolvePlaceAnchor, sameSpot, showAnchorOnTab, type LastSpot } from '../lib/placeAnchor'
import { cardTitle, categoryOfKind, placeFromCard } from '../lib/placeFromCard'
import { formatTripRange } from '../lib/tripDraft'
import { Canvas } from './Canvas/Canvas'
import { CardBody } from './Canvas/CardBody'
import { useCamera } from './Canvas/useCamera'
import { LiveChat } from './Bars/LiveChat'
import { SideTab } from './Bars/SideTab'
import { ConnectedUsers } from './ConnectedUsers'
import { CATEGORIES, CATEGORY_KIND } from './categories'
import { summarizeGroupVotes } from '../lib/cardVotes'
import type { Card as CardData } from '../liveblocks/types'

type ActiveTab = CanvasCategory | 'Itinerary'
type Itinerary = { days: { date: string; title: string; activities: { cardId: string; name: string; category: string; note: string }[] }[] }

export function Main() {
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [category, setCategory] = useState<ActiveTab>('Hotels')
  const [copied, setCopied] = useState(false)
  const [lastSpot, setLastSpot] = useState<LastSpot | null>(null)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [itineraryBusy, setItineraryBusy] = useState(false)
  const [itineraryError, setItineraryError] = useState('')
  const [editingTripTitle, setEditingTripTitle] = useState(false)
  const [tripTitleDraft, setTripTitleDraft] = useState('')
  const destination = useStorage((root) => root.destination)
  const publishedItinerary = useStorage((root) => root.itinerary)
  const itineraryStatus = useStorage((root) => root.itineraryStatus)
  const tripTitle = useStorage((root) => root.tripTitle)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const updateMyPresence = useUpdateMyPresence()
  const publishItinerary = useMutation(({ storage }, value: string) => {
    storage.set('itinerary', value)
    storage.set('itineraryStatus', 'ready')
  }, [])
  const setItineraryStatus = useMutation(({ storage }, status: string) => {
    storage.set('itineraryStatus', status)
  }, [])
  const setTripTitle = useMutation(({ storage }, value: string) => {
    storage.set('tripTitle', value)
  }, [])
  const myUser = useSelf((me) => me.presence.user, shallow)
  const others = useOthers()
  const cameraControls = useCamera(category === 'Itinerary' ? 'Hotels' : category)
  const { roomId } = useParams()
  const cards = useStorage((root) => root.cards)
  const edges = useStorage((root) => root.edges)
  const startDate = useStorage((root) => root.startDate)
  const endDate = useStorage((root) => root.endDate)
  const selectedCardId = useSelf((me) => me.presence.selectedCardId)
  const dateLabel = formatTripRange(startDate ?? '', endDate ?? '')
  const placeLabel = destination?.label.trim() ?? ''
  // Memoized explicitly: the React Compiler bails out of Main (try/finally in createItinerary),
  // and SideTab refetches suggestions whenever this reference changes.
  const anchor = useMemo(() => resolvePlaceAnchor(lastSpot, destination), [lastSpot, destination])
  useEffect(() => {
    if (!publishedItinerary) return
    try {
      setItinerary(JSON.parse(publishedItinerary) as Itinerary)
    } catch {
      setItineraryError('The shared itinerary could not be loaded.')
    }
  }, [publishedItinerary])
  useEffect(() => {
    if (!editingTripTitle) setTripTitleDraft(tripTitle || 'Untitled trip')
  }, [tripTitle, editingTripTitle])

  function commitTripTitle() {
    const value = tripTitleDraft.trim() || 'Untitled trip'
    setTripTitle(value)
    setTripTitleDraft(value)
    setEditingTripTitle(false)
  }
  async function createItinerary() {
    setItineraryBusy(true)
    setItineraryError('')
    setItineraryStatus('generating')
    try {
      const response = await fetch('/api/itinerary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destination: placeLabel, startDate, endDate, refresh: Boolean(publishedItinerary), cards: Object.values(cards).map((card) => ({ id: card.id, type: card.content._tag, name: contenderName(card.content), address: 'location' in card.content.data ? card.content.data.location.label : '', cuisine: card.content._tag === 'FoodCard' ? card.content.data.cuisine ?? '' : '', votes: (card.votes ?? []).reduce((score, vote) => score + vote.value, 0) })), edges: Object.values(edges).filter((edge) => edge.arrow && edge.arrow !== 'none').map((edge) => ({ from: edge.from.cardId, to: edge.to.cardId, arrow: edge.arrow })) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not create itinerary.')
      setItinerary(data)
      publishItinerary(JSON.stringify(data))
      setCategory('Itinerary')
    } catch (error) {
      setItineraryError(error instanceof Error ? error.message : 'Could not create itinerary.')
      setItineraryStatus('idle')
    }
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
    const next: LastSpot = {
      place,
      category: sourceCategory,
      title: cardTitle(card.content) ?? place.label,
    }
    // Keep the same object unless the spot changed, so unrelated card edits don't refetch suggestions.
    setLastSpot((prev) => (sameSpot(prev, next) ? prev : next))
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
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21.5 10.8 13 8V3.5a1.5 1.5 0 0 0-3 0V8l-8.5 2.8a1.2 1.2 0 1 0 .8 2.3L10 11.2v5.5l-2.4 1.4a1.2 1.2 0 1 0 1.2 2.1l2.7-1.6 2.7 1.6a1.2 1.2 0 1 0 1.2-2.1L13 16.7v-5.5l7.7 1.9a1.2 1.2 0 1 0 .8-2.3Z" fill="currentColor" />
          </svg>
          <span className="sr-only">All trips</span>
        </Link>
        <div className="canvas-trip-heading">
          {editingTripTitle ? (
            <input
              className="canvas-trip-title-input"
              value={tripTitleDraft}
              onChange={(event) => setTripTitleDraft(event.target.value)}
              onBlur={commitTripTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitTripTitle()
                if (event.key === 'Escape') {
                  setTripTitleDraft(tripTitle || 'Untitled trip')
                  setEditingTripTitle(false)
                }
              }}
              autoFocus
              size={Math.max(tripTitleDraft.length, 1)}
              aria-label="Trip title"
            />
          ) : (
            <strong className="canvas-trip-title" onDoubleClick={() => setEditingTripTitle(true)} title="Double-click to rename">
              {tripTitle || 'Untitled trip'}
            </strong>
          )}
          {(placeLabel || dateLabel) && (
            <span className="canvas-trip-meta">
              {placeLabel && <span>{placeLabel}</span>}
              {placeLabel && dateLabel && <span aria-hidden="true"> · </span>}
              {dateLabel && <span>{dateLabel}</span>}
            </span>
          )}
        </div>
        <ConnectedUsers
          self={myUser}
          others={others.map(({ connectionId, presence }) => ({ connectionId, user: presence.user }))}
        />
        {roomId && <div className="canvas-header-actions">
          <button
            type="button"
            className="canvas-invite"
            aria-label="Share trip invite"
            onClick={() => {
              void navigator.clipboard.writeText(`${window.location.origin}/r/${roomId}`)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            }}
          >
            <svg className="canvas-share-icon" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5.5 10.5 10.75 5.25M7 4h4.5A1.5 1.5 0 0 1 13 5.5V10M11 12H5.5A1.5 1.5 0 0 1 4 10.5V5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {copied ? 'Shared' : 'Share'}
          </button>
          <button type="button" className="canvas-itinerary-button" onClick={() => void createItinerary()} disabled={itineraryBusy || itineraryStatus === 'generating' || Object.keys(cards).length === 0}>
            {itineraryBusy ? 'Creating…' : 'Create itinerary'}
          </button>
        </div>}
      </header>
      {itineraryError && <div className="itinerary-error" role="alert">{itineraryError}</div>}
      <div className="top-contenders-bar" aria-label="Canvas focus and top contenders">
        <span className="focus-label">Focus</span>
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
              {category !== 'Itinerary' && showAnchorOnTab(anchor, item, category) && (
                <span className="canvas-tab-spot">{anchor?.title}</span>
              )}
            </button>
          ))}
          {itinerary && <button type="button" role="tab" className="canvas-tab" aria-selected={category === 'Itinerary'} onClick={() => setCategory('Itinerary')}>Itinerary</button>}
        </div>
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
      </div>
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
      <LiveChat />
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
