type ZoomControlsProps = {
  zoom: number
  canZoomIn: boolean
  canZoomOut: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function ZoomControls({
  zoom,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps) {
  return (
    <div className="zoom-controls" onPointerDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="zoom-button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom out"
      >
        −
      </button>

      <span className="zoom-level">{Math.round(zoom * 100)}%</span>

      <button
        type="button"
        className="zoom-button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
      >
        +
      </button>

      <button type="button" className="zoom-reset" onClick={onReset}>
        Reset view
      </button>
    </div>
  )
}
