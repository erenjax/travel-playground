import type { Place } from '../liveblocks/types'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_API_KEY?.trim() ?? ''

export function hasGoogleMapsKey() {
  return GOOGLE_MAPS_KEY.length > 0
}

export type PlaceSuggestion = {
  placeId: string
  primary: string
  secondary: string
  resolve: () => Promise<Place>
}

let mapsReady: Promise<void> | null = null

function loadMapsScript(): Promise<void> {
  if (typeof window.google?.maps?.importLibrary === 'function') return Promise.resolve()
  if (mapsReady) return mapsReady

  mapsReady = new Promise((resolve, reject) => {
    const callback = '__initGoogleMaps'
    ;(window as unknown as Record<string, () => void>)[callback] = () => resolve()
    const script = document.createElement('script')
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_KEY,
      v: 'weekly',
      callback,
      loading: 'async',
    })
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`
    script.async = true
    script.onerror = () => {
      mapsReady = null
      reject(new Error('Failed to load Google Maps'))
    }
    document.head.append(script)
  })

  return mapsReady
}

export async function loadPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  if (!hasGoogleMapsKey()) {
    throw new Error('Missing VITE_GOOGLE_API_KEY')
  }
  await loadMapsScript()
  return google.maps.importLibrary('places') as Promise<google.maps.PlacesLibrary>
}

export async function createAutocompleteSession() {
  const { AutocompleteSessionToken } = await loadPlacesLibrary()
  return new AutocompleteSessionToken()
}

function storedPlace(label: string, address?: string | null, lat?: number, lng?: number): Place {
  return {
    label,
    ...(address ? { address } : {}),
    ...(lat != null ? { lat } : {}),
    ...(lng != null ? { lng } : {}),
  }
}

async function fetchNewSuggestions(
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
): Promise<PlaceSuggestion[]> {
  const { AutocompleteSuggestion } = await loadPlacesLibrary()
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    sessionToken,
  })

  return suggestions.flatMap((suggestion) => {
    const prediction = suggestion.placePrediction
    if (!prediction) return []
    return [{
      placeId: prediction.placeId,
      primary: prediction.mainText?.text ?? prediction.text.text,
      secondary: prediction.secondaryText?.text ?? '',
      resolve: async () => {
        const place = prediction.toPlace()
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] })
        return storedPlace(
          place.displayName ?? prediction.mainText?.text ?? prediction.text.text,
          place.formattedAddress,
          place.location?.lat(),
          place.location?.lng(),
        )
      },
    }]
  })
}

async function fetchLegacySuggestions(input: string): Promise<PlaceSuggestion[]> {
  const { AutocompleteService, PlacesService } = await loadPlacesLibrary()
  const service = new AutocompleteService()

  const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
    service.getPlacePredictions({ input }, (results, status) => {
      if (status === 'OK' && results) resolve(results)
      else if (status === 'ZERO_RESULTS') resolve([])
      else reject(new Error(status))
    })
  })

  const details = new PlacesService(document.createElement('div'))

  return predictions.map((prediction) => ({
    placeId: prediction.place_id,
    primary: prediction.structured_formatting.main_text,
    secondary: prediction.structured_formatting.secondary_text,
    resolve: () =>
      new Promise<Place>((resolve, reject) => {
        details.getDetails(
          { placeId: prediction.place_id, fields: ['name', 'formatted_address', 'geometry'] },
          (place, status) => {
            if (status !== 'OK' || !place) {
              reject(new Error(status))
              return
            }
            resolve(storedPlace(
              place.name ?? prediction.structured_formatting.main_text,
              place.formatted_address,
              place.geometry?.location?.lat(),
              place.geometry?.location?.lng(),
            ))
          },
        )
      }),
  }))
}

export async function fetchPlaceSuggestions(
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
): Promise<PlaceSuggestion[]> {
  try {
    return await fetchNewSuggestions(input, sessionToken)
  } catch {
    return fetchLegacySuggestions(input)
  }
}
