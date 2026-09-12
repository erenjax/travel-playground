import { NOTE_COLORS, PEN_COLORS, PEN_WIDTHS, STICKERS } from './boardGeometry'

export type Tool = 'select' | 'note' | 'draw' | 'erase' | 'sticker'

const TOOLS: { tool: Tool; label: string; icon: string }[] = [
  { tool: 'select', label: 'Select and move (V)', icon: 'M3.5 2.5l9 5.2-4 1 2.5 4.2-1.8 1-2.5-4.2-3.2 2.8z' },
  { tool: 'note', label: 'Add a post-it note (N)', icon: 'M3 3h10v6.5L9.5 13H3zM9.5 13V9.5H13' },
  { tool: 'draw', label: 'Draw (D)', icon: 'M3 13l1-3.5 6.8-6.8a1.4 1.4 0 0 1 2 0l.5.5a1.4 1.4 0 0 1 0 2L6.5 12zM9.5 4l2.5 2.5' },
  { tool: 'erase', label: 'Erase strokes (E)', icon: 'M2.5 10.5 8.5 4.5a1.4 1.4 0 0 1 2 0l2.5 2.5a1.4 1.4 0 0 1 0 2L9.5 12.5H6zM6 12.5 3 9.5M9.5 12.5H14' },
  { tool: 'sticker', label: 'Add a sticker (S)', icon: 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM5.8 6.8h.1M10.1 6.8h.1M5.5 9.3c.6 1 1.5 1.5 2.5 1.5s1.9-.5 2.5-1.5' },
]

type BoardToolbarProps = {
  tool: Tool
  noteColor: string
  penColor: string
  penWidth: number
  sticker: string
  onChangeTool: (tool: Tool) => void
  onChangeNoteColor: (color: string) => void
  onChangePenColor: (color: string) => void
  onChangePenWidth: (width: number) => void
  onChangeSticker: (emoji: string) => void
}

/** The bottom tool strip. Each tool's options pop up above it while it is active. */
export function BoardToolbar({
  tool,
  noteColor,
  penColor,
  penWidth,
  sticker,
  onChangeTool,
  onChangeNoteColor,
  onChangePenColor,
  onChangePenWidth,
  onChangeSticker,
}: BoardToolbarProps) {
  return (
    <div className="board-toolbar-wrap" onPointerDown={(event) => event.stopPropagation()}>
      {tool === 'note' ? (
        <div className="board-popover" role="group" aria-label="Note color">
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={color === noteColor ? 'board-swatch board-swatch-active' : 'board-swatch'}
              style={{ backgroundColor: color }}
              aria-label={`Note color ${color}`}
              aria-pressed={color === noteColor}
              onClick={() => onChangeNoteColor(color)}
            />
          ))}
          <span className="board-popover-hint">Click the board to place</span>
        </div>
      ) : null}

      {tool === 'draw' ? (
        <div className="board-popover" role="group" aria-label="Pen">
          {PEN_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={color === penColor ? 'board-swatch board-swatch-active' : 'board-swatch'}
              style={{ backgroundColor: color }}
              aria-label={`Pen color ${color}`}
              aria-pressed={color === penColor}
              onClick={() => onChangePenColor(color)}
            />
          ))}
          <span className="board-popover-divider" />
          {PEN_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              className={width === penWidth ? 'board-weight board-weight-active' : 'board-weight'}
              aria-label={`Pen width ${width}px`}
              aria-pressed={width === penWidth}
              onClick={() => onChangePenWidth(width)}
            >
              <span style={{ width: `${width + 4}px`, height: `${width + 4}px`, backgroundColor: penColor }} />
            </button>
          ))}
        </div>
      ) : null}

      {tool === 'sticker' ? (
        <div className="board-popover board-sticker-grid" role="group" aria-label="Sticker">
          {STICKERS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={emoji === sticker ? 'board-emoji board-emoji-active' : 'board-emoji'}
              aria-label={`Sticker ${emoji}`}
              aria-pressed={emoji === sticker}
              onClick={() => onChangeSticker(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="board-toolbar" role="toolbar" aria-label="Board tools">
        {TOOLS.map((item) => (
          <button
            key={item.tool}
            type="button"
            className={item.tool === tool ? 'board-tool board-tool-active' : 'board-tool'}
            aria-label={item.label}
            title={item.label}
            aria-pressed={item.tool === tool}
            onClick={() => onChangeTool(item.tool)}
          >
            {item.tool === 'sticker' ? (
              <span className="board-tool-emoji">{sticker}</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d={item.icon}
                  fill={item.tool === 'note' && tool === 'note' ? noteColor : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
