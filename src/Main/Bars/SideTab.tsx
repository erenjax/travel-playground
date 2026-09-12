import { CARD_MIME } from '../cardMime'

export function SideTab() {
  return (
    <aside className="side-tab">
      <div className="side-tab-header">
        <span>Cards</span>
      </div>
      <div className="side-tab-body">
        <div
          className="side-tab-card"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(CARD_MIME, 'new')
            event.dataTransfer.setData('text/plain', 'New card')
            event.dataTransfer.effectAllowed = 'copy'
          }}
        >
          New card
        </div>
        <p className="side-tab-hint">Drag onto the canvas</p>
      </div>
    </aside>
  )
}
