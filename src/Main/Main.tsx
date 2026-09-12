import { Canvas } from './Canvas/Canvas'
import { ProfileBadge } from './Bars/ProfileBadge'
import { SideTab } from './Bars/SideTab'

type MainProps = {
  onChangeName: () => void
}

export function Main({ onChangeName }: MainProps) {
  const [sidebarWidth, setSidebarWidth] = useState(260)

  return (
    <div className="app">
      <div className="app-body" style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}>
        <Canvas />
        <ProfileBadge onChangeName={onChangeName} />
        <SideTab width={sidebarWidth} onResize={setSidebarWidth} />
      </div>
    </div>
  )
}
import { useState, type CSSProperties } from 'react'
