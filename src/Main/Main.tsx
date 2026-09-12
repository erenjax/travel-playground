import { useRef } from 'react'
import { Canvas, type CanvasHandle } from './Canvas/Canvas'
import { ProfileBadge } from './Bars/ProfileBadge'
import { SideTab } from './Bars/SideTab'

type MainProps = {
  onChangeName: () => void
}

export function Main({ onChangeName }: MainProps) {
  const canvasRef = useRef<CanvasHandle>(null)

  return (
    <div className="app">
      <div className="app-body">
        <Canvas ref={canvasRef} />
        <ProfileBadge onChangeName={onChangeName} />
        <SideTab onAddCard={() => canvasRef.current?.addCard()} />
      </div>
    </div>
  )
}
