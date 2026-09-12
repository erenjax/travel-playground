import type { Edge, EdgeEndpoint } from '../../liveblocks/types'
import {
  arrowheadPath,
  arrowModeOf,
  edgePath,
  endpointPoint,
  oppositeSide,
  type CardMap,
} from './edgeGeometry'
import type { Point } from './useCamera'

export type DraftEdge = {
  from: EdgeEndpoint
  /** The anchor the drag is currently snapped to, if any. */
  to: EdgeEndpoint | null
  /** Raw world cursor, used to draw the loose end while nothing is snapped. */
  cursor: Point
}

/** Minimum click target for a connector, in screen pixels. */
const HIT_WIDTH = 16

/** How much wider than the stroke a selection halo sits, in screen pixels. */
const HALO_SPREAD = 6

type EdgeLayerProps = {
  edges: readonly Edge[]
  cards: CardMap
  zoom: number
  draft: DraftEdge | null
  /** Maps an edge id to the color of whoever currently has it selected. */
  selection: Readonly<Record<string, string>>
  onSelect: (id: string) => void
}

/**
 * Renders every connector in one SVG. A 1x1 SVG with visible overflow lets paths use
 * raw world coordinates, including negative ones, on an unbounded canvas.
 */
export function EdgeLayer({ edges, cards, zoom, draft, selection, onSelect }: EdgeLayerProps) {
  return (
    <svg className="edge-layer" width="1" height="1">
      {edges.map((edge) => {
        const from = endpointPoint(cards, edge.from)
        const to = endpointPoint(cards, edge.to)
        if (!from || !to) return null

        const path = edgePath(from, edge.from.side, to, edge.to.side)
        const haloColor = selection[edge.id]
        const arrow = arrowModeOf(edge)

        return (
          <g key={edge.id}>
            {haloColor ? (
              <path
                d={path}
                className="edge-halo"
                stroke={haloColor}
                strokeWidth={edge.thickness + HALO_SPREAD / zoom}
              />
            ) : null}

            <path d={path} className="edge-line" stroke={edge.color} strokeWidth={edge.thickness} />

            {arrow !== 'none' ? (
              <path
                d={arrowheadPath(to, edge.to.side, edge.thickness)}
                className="edge-arrow"
                fill={edge.color}
              />
            ) : null}

            {arrow === 'both' ? (
              <path
                d={arrowheadPath(from, edge.from.side, edge.thickness)}
                className="edge-arrow"
                fill={edge.color}
              />
            ) : null}

            <path
              d={path}
              className="edge-hit"
              strokeWidth={Math.max(edge.thickness, HIT_WIDTH / zoom)}
              onPointerDown={(event) => {
                event.stopPropagation()
                onSelect(edge.id)
              }}
            />
          </g>
        )
      })}

      {draft ? <DraftPath cards={cards} draft={draft} /> : null}
    </svg>
  )
}

function DraftPath({ cards, draft }: { cards: CardMap; draft: DraftEdge }) {
  const from = endpointPoint(cards, draft.from)
  if (!from) return null

  const to = draft.to ? endpointPoint(cards, draft.to) : draft.cursor
  if (!to) return null

  const toSide = draft.to ? draft.to.side : oppositeSide(draft.from.side)
  return <path d={edgePath(from, draft.from.side, to, toSide)} className="edge-draft" />
}
