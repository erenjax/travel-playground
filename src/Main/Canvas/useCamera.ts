import { useCallback, useState } from 'react'

export type Camera = {
  /** Screen-space offset, in pixels, of the world origin. */
  x: number
  y: number
  zoom: number
}

export type Point = { x: number; y: number }

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.5
const ZOOM_STEP = 1.2

const INITIAL_CAMERA: Camera = { x: 0, y: 0, zoom: 1 }

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/** Converts a point in viewport space (relative to the canvas element) to world space. */
export function screenToWorld(camera: Camera, screen: Point): Point {
  return {
    x: (screen.x - camera.x) / camera.zoom,
    y: (screen.y - camera.y) / camera.zoom,
  }
}

/** Zooms to `zoom` while keeping `anchor` (viewport space) over the same world point. */
function zoomAround(camera: Camera, zoom: number, anchor: Point): Camera {
  const next = clampZoom(zoom)
  const world = screenToWorld(camera, anchor)
  return {
    zoom: next,
    x: anchor.x - world.x * next,
    y: anchor.y - world.y * next,
  }
}

export function useCamera() {
  const [camera, setCamera] = useState<Camera>(INITIAL_CAMERA)

  const panBy = useCallback((dx: number, dy: number) => {
    setCamera((current) => ({ ...current, x: current.x + dx, y: current.y + dy }))
  }, [])

  const zoomBy = useCallback((factor: number, anchor: Point) => {
    setCamera((current) => zoomAround(current, current.zoom * factor, anchor))
  }, [])

  const zoomIn = useCallback((anchor: Point) => zoomBy(ZOOM_STEP, anchor), [zoomBy])

  const zoomOut = useCallback((anchor: Point) => zoomBy(1 / ZOOM_STEP, anchor), [zoomBy])

  const resetCamera = useCallback(() => setCamera(INITIAL_CAMERA), [])

  return {
    camera,
    canZoomIn: camera.zoom < MAX_ZOOM,
    canZoomOut: camera.zoom > MIN_ZOOM,
    panBy,
    zoomBy,
    zoomIn,
    zoomOut,
    resetCamera,
  }
}
