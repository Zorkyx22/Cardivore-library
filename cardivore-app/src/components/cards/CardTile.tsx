import { useState } from 'react'
import type { Card } from '../../wasm/types'
import { RARITY_COLORS } from '../../wasm/types'
import ColorPips from './ColorPips'

interface CardTileProps {
  card: Card
  onClick?: (card: Card) => void
}

export default function CardTile({ card, onClick }: CardTileProps) {
  const [imgError, setImgError] = useState(false)
  const rarityColor = RARITY_COLORS[card.rarity] ?? '#9e9e9e'

  const primaryColor = card.colors[0] ?? (card.color_identity[0] ?? 'C')
  const bgColors: Record<string, string> = {
    W: '#2a2820',
    U: '#0d1e2a',
    B: '#1a1020',
    R: '#2a1010',
    G: '#0d2010',
    C: '#1c1a17',
  }
  const cardBg = bgColors[primaryColor] ?? '#1c1a17'

  return (
    <button
      onClick={() => onClick?.(card)}
      className="text-left w-full rounded-lg overflow-hidden transition-all duration-150 mtg-glow"
      style={{
        background: cardBg,
        border: `1px solid var(--color-border)`,
        cursor: 'pointer',
      }}
    >
      {/* Card image */}
      <div className="relative w-full" style={{ aspectRatio: '63/88' }}>
        {card.image_url && !imgError ? (
          <img
            src={card.image_url}
            alt={card.name}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <TextCard card={card} bg={cardBg} />
        )}
        {/* Rarity dot */}
        <span
          className="absolute bottom-1 right-1 w-2 h-2 rounded-full"
          style={{ background: rarityColor }}
          title={card.rarity}
        />
      </div>

      {/* Footer */}
      <div className="px-2 py-1.5 flex items-center justify-between gap-1">
        <span
          className="text-xs font-medium truncate"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {card.name}
        </span>
        <ColorPips colors={card.colors.length ? card.colors : card.color_identity} />
      </div>
    </button>
  )
}

function TextCard({ card, bg }: { card: Card; bg: string }) {
  return (
    <div
      className="w-full h-full flex flex-col p-2 gap-1"
      style={{ background: bg }}
    >
      <div
        className="text-xs font-bold leading-tight"
        style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
      >
        {card.name}
      </div>
      {card.mana_cost && (
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {card.mana_cost}
        </div>
      )}
      <div
        className="text-xs leading-tight mt-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {card.type_line}
      </div>
      {card.oracle_text && (
        <div
          className="text-xs mt-1 leading-snug overflow-hidden"
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '10px',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {card.oracle_text}
        </div>
      )}
    </div>
  )
}
