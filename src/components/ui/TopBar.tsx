import type { CanvasUser } from '../../liveblocks/types'
import { ConnectedUsers, type OtherUser } from './ConnectedUsers'
import { CursorPosition } from './CursorPosition'

type TopBarProps = {
  self: CanvasUser
  others: OtherUser[]
  onAddCard: () => void
  onChangeName: () => void
}

export function TopBar({ self, others, onAddCard, onChangeName }: TopBarProps) {
  return (
    <header className="top-bar">
      <span className="top-bar-title">Multiplayer Canvas</span>

      <ConnectedUsers self={self} others={others} />

      <span className="top-bar-spacer" />

      <CursorPosition />

      <span className="top-bar-me">
        {self.name}
        <button type="button" className="link-button" onClick={onChangeName}>
          Change
        </button>
      </span>

      <button type="button" className="primary-button" onClick={onAddCard}>
        + Card
      </button>
    </header>
  )
}
