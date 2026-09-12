import { shallow } from '@liveblocks/client'
import { useSelf } from '@liveblocks/react/suspense'
import type { Presence } from '../../liveblocks/types'

export function CursorPosition() {
  const cursor = useSelf<Presence['cursor']>((me) => me.presence.cursor, shallow)

  return (
    <span className="cursor-position" title="Your cursor position on the canvas">
      {cursor ? `x ${cursor.x}, y ${cursor.y}` : 'off canvas'}
    </span>
  )
}
