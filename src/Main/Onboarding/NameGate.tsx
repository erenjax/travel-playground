import { useState } from 'react'

type NameGateProps = {
  initialName?: string
  onSubmit: (name: string) => void
}

export function NameGate({ initialName = '', onSubmit }: NameGateProps) {
  const [name, setName] = useState(initialName)
  const trimmed = name.trim()

  return (
    <div className="gate">
      <form
        className="gate-card"
        onSubmit={(event) => {
          event.preventDefault()
          if (trimmed) onSubmit(trimmed)
        }}
      >
        <h1>Travel Playground</h1>
        <label htmlFor="display-name">What&apos;s your name?</label>
        <input
          id="display-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Sam"
          maxLength={32}
          autoComplete="off"
          autoFocus
        />
        <button type="submit" disabled={!trimmed}>
          Join
        </button>
      </form>
    </div>
  )
}
