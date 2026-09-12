import { useState, type CSSProperties } from 'react'
import { Canvas } from './Canvas/Canvas'
import { SideTab } from './Bars/SideTab'

export function Main() {
  const [sidebarWidth, setSidebarWidth] = useState(260)

  return (
    <div className="app">
      <div className="app-body" style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}>
        <Canvas />
        <SideTab width={sidebarWidth} onResize={setSidebarWidth} />
      </div>
    </div>
  )
}
