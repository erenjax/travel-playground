type RemoteCursorProps = {
  x: number
  y: number
  name: string
  color: string
}

export function RemoteCursor({ x, y, name, color }: RemoteCursorProps) {
  return (
    <div className="remote-cursor" style={{ transform: `translate(${x}px, ${y}px)` }}>
      <svg width="20" height="24" viewBox="0 0 20 24" aria-hidden="true">
        <path
          d="M2 1.5 L2 18.5 L6.6 13.9 L9.8 21.5 L12.9 20.2 L9.7 12.7 L16.2 12.4 Z"
          fill={color}
          stroke="#fff"
          strokeWidth="1.2"
        />
      </svg>
      <span className="remote-cursor-name" style={{ backgroundColor: color }}>
        {name}
        <span className="remote-cursor-coords">
          {x}, {y}
        </span>
      </span>
    </div>
  )
}
