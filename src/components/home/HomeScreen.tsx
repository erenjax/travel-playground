import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Place } from '../../liveblocks/types'
import { createRoomId, parseRoomId } from '../../lib/roomId'
import { tripDraftError } from '../../lib/tripDraft'
import { PlaceSearch } from '../places/PlaceSearch'

type Mode = 'create' | 'join'

export function HomeScreen() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('create')
  const [destination, setDestination] = useState<Place | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [joinInput, setJoinInput] = useState('')
  const [error, setError] = useState('')

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    const nextError = tripDraftError({ destination, startDate, endDate })
    if (nextError) {
      setError(nextError)
      return
    }
    const roomId = createRoomId()
    navigate(`/r/${roomId}`, { state: { destination, startDate, endDate } })
  }

  function handleJoin(event: FormEvent) {
    event.preventDefault()
    const roomId = parseRoomId(joinInput)
    if (!roomId) {
      setError('Enter a room code')
      return
    }
    navigate(`/r/${roomId}`)
  }

  return (
    <div className="gate">
      <div className="gate-card home-card">
        <h1>TripJam</h1>
       
        <div className="home-modes" role="tablist" aria-label="Start a trip">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'create'}
            className="home-mode"
            onClick={() => {
              setMode('create')
              setError('')
            }}
          >
            Create a trip
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'join'}
            className="home-mode"
            onClick={() => {
              setMode('join')
              setError('')
            }}
          >
            Join a trip
          </button>
        </div>

        {mode === 'create' ? (
          <form className="home-form" onSubmit={handleCreate}>
            <label htmlFor="trip-destination">Destination</label>
            <PlaceSearch id="trip-destination" value={destination} onChange={setDestination} />

            <div className="home-dates">
              <label className="home-date">
                <span>Start</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label className="home-date">
                <span>End</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>

            {error && <p className="home-error">{error}</p>}
            <button type="submit">Create trip</button>
          </form>
        ) : (
          <form className="home-form" onSubmit={handleJoin}>
            <label htmlFor="trip-code">Room code</label>
            <input
              id="trip-code"
              value={joinInput}
              onChange={(event) => setJoinInput(event.target.value)}
              placeholder="Paste a code or invite link"
              autoComplete="off"
              autoFocus
            />
            {error && <p className="home-error">{error}</p>}
            <button type="submit">Join trip</button>
          </form>
        )}
      </div>
    </div>
  )
}
