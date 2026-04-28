import { useRef, useState, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Card } from '../../wasm/types'
import CardTile from './CardTile'

interface CardGridProps {
  cards: Card[]
  onCardClick?: (card: Card) => void
}

const MIN_COL_WIDTH = 140
const GAP = 8

function useColumns(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [cols, setCols] = useState(3)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setCols(Math.max(2, Math.floor((w + GAP) / (MIN_COL_WIDTH + GAP))))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [containerRef])

  return cols
}

export default function CardGrid({ cards, onCardClick }: CardGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const cols = useColumns(parentRef)
  const rowCount = Math.ceil(cards.length / cols)
  const rowHeight = Math.floor(((MIN_COL_WIDTH + GAP) / cols) * (88 / 63)) + 32 + GAP

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  })

  const getCard = useCallback(
    (row: number, col: number) => cards[row * cols + col],
    [cards, cols]
  )

  return (
    <div ref={parentRef} style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vRow) => (
          <div
            key={vRow.key}
            style={{
              position: 'absolute',
              top: vRow.start,
              left: 0,
              right: 0,
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: GAP,
              padding: `0 ${GAP}px`,
            }}
          >
            {Array.from({ length: cols }).map((_, col) => {
              const card = getCard(vRow.index, col)
              if (!card) return <div key={col} />
              return (
                <CardTile key={card.id} card={card} onClick={onCardClick} />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
