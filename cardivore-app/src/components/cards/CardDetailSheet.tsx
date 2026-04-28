import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Heart, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Card, FavoritesList } from '../../wasm/types'
import { useLibraryStore } from '../../store/useLibraryStore'
import { RARITY_COLORS } from '../../wasm/types'
import ColorPips from './ColorPips'

interface CardDetailSheetProps {
  card: Card | null
  open: boolean
  onClose: () => void
}

const LEGALITY_COLOR: Record<string, string> = {
  Legal: 'var(--color-mana-g)',
  Banned: 'var(--color-mana-r)',
  Restricted: 'var(--color-rarity-rare)',
  'Not Legal': 'var(--color-text-muted)',
}

export default function CardDetailSheet({ card, open, onClose }: CardDetailSheetProps) {
  const lib = useLibraryStore((s) => s.lib)
  const { addToFavorites, addCardToDeck } = useLibraryStore()
  const [imgError, setImgError] = useState(false)

  const favorites: FavoritesList[] = lib ? lib.listFavorites() : []
  const decks = lib ? lib.listDecks() : []

  async function handleAddToFavorites(listId: string) {
    if (!card) return
    try {
      await addToFavorites(listId, card.id)
      toast.success('Added to favorites')
    } catch {
      toast.error('Failed to add to favorites')
    }
  }

  async function handleAddToDeck(deckId: string) {
    if (!card) return
    try {
      await addCardToDeck(deckId, {
        card_id: card.id,
        quantity: 1,
        category: 'mainboard',
        is_commander: false,
        is_companion: false,
        notes: null,
      })
      toast.success('Added to deck')
    } catch {
      toast.error('Failed to add to deck')
    }
  }

  if (!card) return null
  const rarityColor = RARITY_COLORS[card.rarity] ?? '#9e9e9e'

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        />
        <Dialog.Content
          className="fixed z-50 bottom-0 left-0 right-0 md:top-0 md:right-0 md:left-auto md:w-96 overflow-y-auto rounded-t-2xl md:rounded-none"
          style={{
            background: 'var(--color-bg-elevated)',
            borderTop: '1px solid var(--color-border)',
            maxHeight: '90vh',
          }}
        >
          {/* Header */}
          <div
            className="sticky top-0 flex items-center justify-between px-4 py-3 border-b"
            style={{
              background: 'var(--color-bg-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <Dialog.Title
              className="font-display text-base font-semibold truncate"
              style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
            >
              {card.name}
            </Dialog.Title>
            <Dialog.Close
              className="p-1 rounded"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="p-4 space-y-4">
            {/* Card image */}
            {card.image_url && !imgError ? (
              <img
                src={card.image_url}
                alt={card.name}
                onError={() => setImgError(true)}
                className="w-48 mx-auto rounded-lg"
              />
            ) : null}

            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              <ColorPips colors={card.colors.length ? card.colors : card.color_identity} />
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: rarityColor + '33', color: rarityColor }}
              >
                {card.rarity}
              </span>
              {card.mana_cost && (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {card.mana_cost}
                </span>
              )}
            </div>

            {/* Type + oracle */}
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {card.type_line}
              </p>
              {card.oracle_text && (
                <p
                  className="text-sm mt-2 leading-relaxed whitespace-pre-line"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {card.oracle_text}
                </p>
              )}
              {(card.power || card.loyalty) && (
                <p className="text-sm mt-1 font-bold" style={{ color: 'var(--color-text-muted)' }}>
                  {card.power ? `${card.power}/${card.toughness}` : `Loyalty: ${card.loyalty}`}
                </p>
              )}
            </div>

            {/* Legalities */}
            {Object.keys(card.legalities).length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  LEGALITIES
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(card.legalities).map(([fmt, status]) => (
                    <div key={fmt} className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--color-text-muted)' }}>{fmt}</span>
                      <span style={{ color: LEGALITY_COLOR[status] ?? 'var(--color-text-muted)' }}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {favorites.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  ADD TO FAVORITES
                </p>
                <div className="flex flex-col gap-1">
                  {favorites.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleAddToFavorites(f.id)}
                      className="flex items-center gap-2 text-sm py-1 px-2 rounded text-left"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Heart size={14} style={{ color: 'var(--color-mana-r)' }} />
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {decks.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  ADD TO DECK
                </p>
                <div className="flex flex-col gap-1">
                  {decks.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleAddToDeck(d.id)}
                      className="flex items-center gap-2 text-sm py-1 px-2 rounded text-left"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <Plus size={14} style={{ color: 'var(--color-mana-g)' }} />
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {card.set_code && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Set: {card.set_code.toUpperCase()}
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
