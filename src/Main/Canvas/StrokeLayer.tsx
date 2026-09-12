import type { Stroke } from '../../liveblocks/types'
import { pointsToPath } from './boardGeometry'

/** Minimum click target for a stroke, in screen pixels. */
const HIT_WIDTH = 14

type StrokeLayerProps = {
  strokes: readonly Stroke[]
  /** The stroke being drawn right now, before it lands in storage. */
  draft: Stroke | null
  zoom: number
  selectedId: string | null
  selectionColor: string
  /** Off while another tool is active, so pen strokes go over existing ink. */
  selectable: boolean
  onSelect: (id: string) => void
}

/**
 * Freehand ink under the cards. Same 1x1 visible-overflow SVG trick as the connector
 * layer, so paths can use raw world coordinates.
 */
export function StrokeLayer({ strokes, draft, zoom, selectedId, selectionColor, selectable, onSelect }: StrokeLayerProps) {
  return (
    <svg className="stroke-layer" width="1" height="1">
      {strokes.map((stroke) => (
        <g key={stroke.id}>
          {stroke.id === selectedId ? (
            <path
              d={pointsToPath(stroke.points)}
              className="stroke-halo"
              stroke={selectionColor}
              strokeWidth={stroke.width + 8 / zoom}
            />
          ) : null}
          <path
            d={pointsToPath(stroke.points)}
            className="stroke-ink"
            stroke={stroke.color}
            strokeWidth={stroke.width}
          />
          {selectable ? (
            <path
              d={pointsToPath(stroke.points)}
              className="stroke-hit"
              strokeWidth={Math.max(stroke.width, HIT_WIDTH / zoom)}
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.stopPropagation()
                onSelect(stroke.id)
              }}
            />
          ) : null}
        </g>
      ))}
      {draft ? (
        <path
          d={pointsToPath(draft.points)}
          className="stroke-ink"
          stroke={draft.color}
          strokeWidth={draft.width}
        />
      ) : null}
    </svg>
  )
}
