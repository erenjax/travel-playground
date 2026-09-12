import { useRef, useState, type KeyboardEvent } from 'react'
import { CARD_MIME } from '../cardMime'

const categories = ['Hotels', 'Flights', 'Attractions', 'Food'] as const

export function SideTab() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>('Hotels')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % categories.length
        break
      case 'ArrowLeft':
        nextIndex = (index + categories.length - 1) % categories.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = categories.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    setActiveCategory(categories[nextIndex])
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <aside className="side-tab" aria-label="Card library">
      <div className="side-tab-header">
        <span>Card categories</span>
      </div>
      <div className="side-tab-categories" role="tablist" aria-label="Card categories">
        {categories.map((category, index) => (
          <button
            key={category}
            ref={(element) => { tabRefs.current[index] = element }}
            type="button"
            role="tab"
            id={`category-tab-${category}`}
            aria-controls={`category-panel-${category}`}
            aria-selected={activeCategory === category}
            tabIndex={activeCategory === category ? 0 : -1}
            className="side-tab-category"
            onClick={() => setActiveCategory(category)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {category}
          </button>
        ))}
      </div>
      {categories.map((category) => (
        <div
          key={category}
          className="side-tab-body"
          role="tabpanel"
          id={`category-panel-${category}`}
          aria-labelledby={`category-tab-${category}`}
          hidden={activeCategory !== category}
          tabIndex={0}
        >
          <h2 className="side-tab-panel-title">{category} category</h2>
          <div
            className="side-tab-card"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(CARD_MIME, 'new')
              event.dataTransfer.setData('text/plain', 'New card')
              event.dataTransfer.effectAllowed = 'copy'
            }}
          >
            New card
          </div>
          <p className="side-tab-hint">Drag onto the canvas</p>
        </div>
      ))}
    </aside>
  )
}
