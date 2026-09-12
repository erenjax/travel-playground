import type { Place } from '../liveblocks/types'

export type TripDraft = {
  destination: Place | null
  startDate: string
  endDate: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type CalendarDay = {
  year: number
  month: number
  day: number
}

function parseIsoDate(value: string): CalendarDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
  }
}

export function tripDraftError(draft: TripDraft): string | null {
  if (!draft.destination?.label.trim()) return 'Choose a destination'
  if (!draft.startDate) return 'Pick a start date'
  if (!draft.endDate) return 'Pick an end date'
  if (draft.endDate < draft.startDate) return 'End date must be on or after the start date'
  return null
}

export function formatTripRange(startDate: string, endDate: string): string {
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  if (!start || !end) return ''
  return `${MONTHS[start.month]} ${start.day} – ${MONTHS[end.month]} ${end.day}, ${end.year}`
}
