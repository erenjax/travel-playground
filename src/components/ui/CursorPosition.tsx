import { shallow } from '@liveblocks/client'
import { useSelf } from '@liveblocks/react/suspense'

export function CursorPosition() {
  const cursor = useSelf((me) => me.presence.cursor, shallow)

  return (
    <span className="cursor-position" title="Your cursor position on the canvas">
      {cursor ? `x ${cursor.x}, y ${cursor.y}` : 'off canvas'}
    </span>
  )
}
