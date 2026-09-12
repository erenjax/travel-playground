type SideTabProps = {
  onAddCard: () => void
}

export function SideTab({ onAddCard }: SideTabProps) {
  return (
    <aside className="side-tab">
      <div className="side-tab-header">
        <span>Cards</span>
        <button type="button" className="primary-button" onClick={onAddCard}>
          + Card
        </button>
      </div>
      <div className="side-tab-body">
        <p className="side-tab-placeholder">Card library coming soon</p>
      </div>
    </aside>
  )
}
