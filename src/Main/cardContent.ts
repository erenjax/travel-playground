import type { CardContent, CardKind } from '../liveblocks/types'

/** Drives the side tab's order, so it reads blank-first then most-used. */
export const CARD_KINDS: readonly CardKind[] = [
  'BlankCard',
  'HotelCard',
  'FlightCard',
  'AttractionCard',
  'FoodCard',
  'PhotoCard',
]

export const CARD_KIND_LABELS: Record<CardKind, string> = {
  BlankCard: 'Blank',
  HotelCard: 'Hotel',
  FlightCard: 'Flight',
  AttractionCard: 'Attraction',
  FoodCard: 'Food',
  PhotoCard: 'Photo',
}

export const CARD_KIND_HINTS: Record<CardKind, string> = {
  BlankCard: 'A note in your own words',
  HotelCard: 'Stay, dates, and price',
  FlightCard: 'Route, airline, connections',
  AttractionCard: 'A sight or an event',
  FoodCard: 'Restaurant or reservation',
  PhotoCard: 'An image for the board',
}

const KINDS = new Set<string>(CARD_KINDS)

/** Drag payloads arrive as untrusted strings, so an unknown tag degrades to a blank card. */
export function parseCardKind(value: string): CardKind {
  return KINDS.has(value) ? (value as CardKind) : 'BlankCard'
}

function dummyImage(seed: string) {
  return `https://picsum.photos/seed/${seed}/480/280`
}

/** Placeholder content for a freshly dropped card, until real editing exists. */
export function defaultContentFor(kind: CardKind): CardContent {
  switch (kind) {
    case 'HotelCard':
      return {
        _tag: 'HotelCard',
        data: {
          name: 'Hotel Nikko Kanazawa',
          imageUrl: dummyImage('hotel-nikko'),
          location: { label: 'Kanazawa, Japan' },
          price: { amount: 780, currency: 'USD' },
          checkIn: '2026-10-02',
          checkOut: '2026-10-05',
        },
      }
    case 'FlightCard':
      return {
        _tag: 'FlightCard',
        data: {
          airline: 'ANA',
          flightNumber: 'NH 7',
          departure: { place: { label: 'SFO' }, time: '2026-10-01T11:20' },
          arrival: { place: { label: 'KMQ' }, time: '2026-10-02T18:05' },
          stops: [{ place: { label: 'HND' }, layoverMinutes: 130 }],
        },
      }
    case 'AttractionCard':
      return {
        _tag: 'AttractionCard',
        data: {
          name: 'Kenroku-en Garden',
          location: { label: 'Kanazawa, Japan' },
          imageUrl: dummyImage('kenrokuen'),
          price: { amount: 320, currency: 'JPY' },
        },
      }
    case 'FoodCard':
      return {
        _tag: 'FoodCard',
        data: {
          name: 'Omicho Market',
          location: { label: 'Kanazawa, Japan' },
          cuisine: 'Seafood',
          priceLevel: 2,
          reservationAt: '2026-10-03T12:30',
          imageUrl: dummyImage('omicho'),
        },
      }
    case 'PhotoCard':
      return {
        _tag: 'PhotoCard',
        data: {
          imageUrl: dummyImage('trip-photo'),
          caption: 'Somewhere worth going back to',
        },
      }
    case 'BlankCard':
      return { _tag: 'BlankCard', data: { text: 'New card' } }
  }
}
