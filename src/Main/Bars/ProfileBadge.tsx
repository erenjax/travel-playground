import { shallow } from '@liveblocks/client'
import {
  useMutation,
  useOthers,
  useSelf,
  useStorage,
} from '@liveblocks/react/suspense'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ConnectedUsers } from '../ConnectedUsers'

const DEFAULT_TRIP_TITLE = 'Untitled trip'

type ProfileBadgeProps = {
  onChangeName: () => void
}

export function ProfileBadge({ onChangeName }: ProfileBadgeProps) {
  const myUser = useSelf((me) => me.presence.user, shallow)
  const others = useOthers()
  const tripTitle = useStorage((root) => root.tripTitle) ?? DEFAULT_TRIP_TITLE

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(tripTitle)
  const inputRef = useRef<HTMLInputElement>(null)

  const setTripTitle = useMutation(({ storage }, title: string) => {
    storage.set('tripTitle', title)
  }, [])

  useEffect(() => {
    if (!editing) {
      setDraft(tripTitle)
    }
  }, [tripTitle, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commitTitle() {
    const next = draft.trim() || DEFAULT_TRIP_TITLE
    setTripTitle(next)
    setDraft(next)
    setEditing(false)
  }

  function cancelEdit() {
    setDraft(tripTitle)
    setEditing(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    commitTitle()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdit()
    }
  }

  return (
    <div className="profile-badge">
      {editing ? (
        <form className="profile-badge-trip-form" onSubmit={handleSubmit}>
          <span className="profile-badge-trip-measure" aria-hidden>
            {draft || ' '}
          </span>
          <input
            ref={inputRef}
            className="profile-badge-trip-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleKeyDown}
            aria-label="Trip title"
            size={1}
          />
        </form>
      ) : (
        <span
          className="profile-badge-trip"
          onDoubleClick={() => setEditing(true)}
          title="Double-click to rename"
        >
          {tripTitle}
        </span>
      )}
      <ConnectedUsers
        self={myUser}
        others={others.map(({ connectionId, presence }) => ({
          connectionId,
          user: presence.user,
        }))}
        onSelfClick={onChangeName}
      />
    </div>
  )
}
