import type { CardContent, FlightStop, Money } from '../../liveblocks/types'
import { CARD_KIND_LABELS } from '../cardContent'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Stored times are zoneless wall-clock, so they are sliced rather than parsed: handing
 * `2026-10-02T08:15` to `Date` would shift it into the viewer's zone and show the wrong
 * departure time.
 */
function formatDay(iso: string) {
  const [, month, day] = iso.slice(0, 10).split('-')
  return `${MONTHS[Number(month) - 1]} ${Number(day)}`
}

function formatClock(iso: string) {
  return iso.slice(11, 16)
}

function formatMoney({ amount, currency }: Money) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function stopsSummary(stops: readonly FlightStop[]): string {
  if (stops.length === 0) return 'Nonstop'
  const vias = stops.map((stop) => stop.place.label).join(', ')
  const layover = stops[0].layoverMinutes
  const count = `${stops.length} stop${stops.length > 1 ? 's' : ''}`
  return layover ? `${count} · ${vias} ${formatDuration(layover)}` : `${count} · ${vias}`
}

function joinMeta(parts: readonly (string | undefined)[]) {
  return parts.filter(Boolean).join(' · ')
}

type ImageProps = { src: string; alt: string; tall?: boolean }

function CardImage({ src, alt, tall }: ImageProps) {
  return (
    <img
      className={tall ? 'card-image card-image-tall' : 'card-image'}
      src={src}
      alt={alt}
      // The card handles its own pointer drag; a native image drag would fight it.
      draggable={false}
    />
  )
}

/** The type-specific inside of a card. The frame, anchors, and dragging live in `Card`. */
export function CardBody({ content }: { content: CardContent }) {
  const kind = <span className="card-kind">{CARD_KIND_LABELS[content._tag]}</span>

  switch (content._tag) {
    case 'HotelCard': {
      const { name, imageUrl, location, price, checkIn, checkOut } = content.data
      return (
        <>
          <CardImage src={imageUrl} alt={name} />
          <div className="card-lines">
            {kind}
            <span className="card-title">{name}</span>
            <span className="card-meta">{location.label}</span>
            <span className="card-meta">
              {joinMeta([`${formatDay(checkIn)} – ${formatDay(checkOut)}`, formatMoney(price)])}
            </span>
          </div>
        </>
      )
    }

    case 'FlightCard': {
      const { airline, flightNumber, departure, arrival, stops } = content.data
      return (
        <div className="card-lines">
          {kind}
          <span className="card-title">
            {departure.place.label} → {arrival.place.label}
          </span>
          <span className="card-meta">{joinMeta([airline, flightNumber])}</span>
          <span className="card-meta">
            {formatClock(departure.time)} – {formatClock(arrival.time)}
          </span>
          <span className="card-meta">{stopsSummary(stops)}</span>
        </div>
      )
    }

    case 'AttractionCard': {
      const { name, location, imageUrl, price, startsAt, endsAt } = content.data
      const when = startsAt
        ? joinMeta([
            `${formatDay(startsAt)} ${formatClock(startsAt)}`,
            endsAt ? formatClock(endsAt) : undefined,
          ])
        : undefined
      return (
        <>
          {imageUrl ? <CardImage src={imageUrl} alt={name} /> : null}
          <div className="card-lines">
            {kind}
            <span className="card-title">{name}</span>
            <span className="card-meta">{location.label}</span>
            <span className="card-meta">
              {joinMeta([when, price ? formatMoney(price) : undefined]) || 'No times set'}
            </span>
          </div>
        </>
      )
    }

    case 'FoodCard': {
      const { name, location, cuisine, priceLevel, reservationAt, imageUrl } = content.data
      return (
        <>
          {imageUrl ? <CardImage src={imageUrl} alt={name} /> : null}
          <div className="card-lines">
            {kind}
            <span className="card-title">{name}</span>
            <span className="card-meta">
              {joinMeta([cuisine, priceLevel ? '$'.repeat(priceLevel) : undefined])}
            </span>
            <span className="card-meta">
              {reservationAt
                ? `${formatDay(reservationAt)} ${formatClock(reservationAt)}`
                : location.label}
            </span>
          </div>
        </>
      )
    }

    case 'PhotoCard': {
      const { imageUrl, caption } = content.data
      return (
        <>
          <CardImage src={imageUrl} alt={caption ?? 'Trip photo'} tall />
          <div className="card-lines">
            {caption ? <span className="card-meta">{caption}</span> : kind}
          </div>
        </>
      )
    }

    case 'BlankCard':
      return <div className="card-lines">{content.data.text}</div>
  }
}
