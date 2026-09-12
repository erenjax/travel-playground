import type { ArrowMode, Edge } from '../../liveblocks/types'
import { arrowModeOf, EDGE_COLORS, EDGE_THICKNESSES } from './edgeGeometry'

const ARROW_OPTIONS: { mode: ArrowMode; label: string; icon: string }[] = [
  { mode: 'none', label: 'No arrow', icon: 'M2.5 8h11' },
  { mode: 'end', label: 'Arrow at the target end', icon: 'M2.5 8h10.5M9 4.5 13.5 8 9 11.5' },
  {
    mode: 'both',
    label: 'Arrows at both ends',
    icon: 'M2.5 8h11M7 4.5 2.5 8 7 11.5M9 4.5 13.5 8 9 11.5',
  },
]

const FLIP_ICON = 'M3.5 6h9M10 3.5 12.5 6 10 8.5M12.5 10h-9M6 7.5 3.5 10 6 12.5'

type EdgeToolbarProps = {
  edge: Edge
  /** Viewport-space position of the connector's midpoint. */
  x: number
  y: number
  onChangeColor: (color: string) => void
  onChangeThickness: (thickness: number) => void
  onChangeArrow: (arrow: ArrowMode) => void
  onFlip: () => void
  onDelete: () => void
}

/**
 * Lives in viewport space rather than the world layer, so it keeps a constant size
 * regardless of zoom.
 */
export function EdgeToolbar({
  edge,
  x,
  y,
  onChangeColor,
  onChangeThickness,
  onChangeArrow,
  onFlip,
  onDelete,
}: EdgeToolbarProps) {
  const arrow = arrowModeOf(edge)

  return (
    <div
      className="edge-toolbar"
      style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -150%)` }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="edge-toolbar-group">
        {EDGE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={color === edge.color ? 'edge-swatch edge-swatch-active' : 'edge-swatch'}
            style={{ backgroundColor: color }}
            aria-label={`Connector color ${color}`}
            aria-pressed={color === edge.color}
            onClick={() => onChangeColor(color)}
          />
        ))}
      </div>

      <span className="edge-toolbar-divider" />

      <div className="edge-toolbar-group">
        {EDGE_THICKNESSES.map((thickness) => (
          <button
            key={thickness}
            type="button"
            className={toolClass(thickness === edge.thickness, 'edge-weight')}
            aria-label={`Connector thickness ${thickness}px`}
            aria-pressed={thickness === edge.thickness}
            onClick={() => onChangeThickness(thickness)}
          >
            <span style={{ height: `${thickness}px` }} />
          </button>
        ))}
      </div>

      <span className="edge-toolbar-divider" />

      <div className="edge-toolbar-group">
        {ARROW_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            className={toolClass(option.mode === arrow)}
            aria-label={option.label}
            aria-pressed={option.mode === arrow}
            onClick={() => onChangeArrow(option.mode)}
          >
            <ToolIcon path={option.icon} />
          </button>
        ))}

        {/* Flipping only changes anything visible when exactly one end has a head. */}
        {arrow === 'end' ? (
          <button
            type="button"
            className="edge-tool"
            aria-label="Reverse the connector's direction"
            onClick={onFlip}
          >
            <ToolIcon path={FLIP_ICON} />
          </button>
        ) : null}
      </div>

      <span className="edge-toolbar-divider" />

      <button
        type="button"
        className="edge-tool edge-delete"
        aria-label="Delete connector"
        onClick={onDelete}
      >
        <ToolIcon path="M3 5h10M6.5 5V3.5h3V5M4.5 5l.6 8h5.8l.6-8M6.8 7.2v3.6M9.2 7.2v3.6" />
      </button>
    </div>
  )
}

function toolClass(active: boolean, extra?: string) {
  return ['edge-tool', extra, active ? 'edge-tool-active' : ''].filter(Boolean).join(' ')
}

function ToolIcon({ path }: { path: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
