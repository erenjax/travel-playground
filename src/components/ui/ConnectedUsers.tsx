import { getInitials } from '../../lib/userColor'
import type { CanvasUser } from '../../liveblocks/types'

export type OtherUser = {
  connectionId: number
  user: CanvasUser
}

function Avatar({ user, label }: { user: CanvasUser; label: string }) {
  return (
    <span className="avatar" style={{ backgroundColor: user.color }} title={label}>
      {getInitials(user.name)}
    </span>
  )
}

type ConnectedUsersProps = {
  self: CanvasUser
  others: OtherUser[]
}

export function ConnectedUsers({ self, others }: ConnectedUsersProps) {
  return (
    <div className="connected-users">
      <Avatar user={self} label={`${self.name} (you)`} />
      {others.map(({ connectionId, user }) => (
        <Avatar key={connectionId} user={user} label={user.name} />
      ))}
    </div>
  )
}
