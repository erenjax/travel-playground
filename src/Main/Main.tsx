import { Canvas } from './Canvas/Canvas'
import { ProfileBadge } from './Bars/ProfileBadge'
import { SideTab } from './Bars/SideTab'

type MainProps = {
  onChangeName: () => void
}

export function Main({ onChangeName }: MainProps) {
  return (
    <div className="app">
      <div className="app-body">
        <Canvas />
        <ProfileBadge onChangeName={onChangeName} />
        <SideTab />
      </div>
    </div>
  )
}
