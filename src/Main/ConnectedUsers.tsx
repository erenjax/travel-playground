import { getInitials } from '../lib/userColor'
import type { CanvasUser } from '../liveblocks/types'

export type OtherUser = {
  connectionId: number
  user: CanvasUser
}

function Avatar({
  user,
  label,
  highlighted = false,
  onClick,
}: {
  user: CanvasUser
  label: string
  highlighted?: boolean
  onClick?: () => void
}) {
  const className = highlighted ? 'avatar avatar-self' : 'avatar'
  const style = { backgroundColor: user.color }

  if (onClick) {
    return (
      <button type="button" className={className} style={style} title={label} onClick={onClick}>
        {getInitials(user.name)}
      </button>
    )
  }

  return (
    <span className={className} style={style} title={label}>
      {getInitials(user.name)}
    </span>
  )
}

type ConnectedUsersProps = {
  self: CanvasUser
  others: OtherUser[]
  onSelfClick?: () => void
}

export function ConnectedUsers({ self, others, onSelfClick }: ConnectedUsersProps) {
  return (
    <div className="connected-users">
      {others.map(({ connectionId, user }) => (
        <Avatar key={connectionId} user={user} label={user.name} />
      ))}
      <Avatar
        user={self}
        label={`${self.name} (you) — change name`}
        highlighted
        onClick={onSelfClick}
      />
    </div>
  )
}
