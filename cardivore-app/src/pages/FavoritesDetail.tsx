import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { useLibraryStore } from '../store/useLibraryStore'
import type { Card, FavoritesList } from '../wasm/types'
import CardGrid from '../components/cards/CardGrid'
import CardDetailSheet from '../components/cards/CardDetailSheet'
import EmptyState from '../components/ui/EmptyState'

export default function FavoritesDetailPage() {
  const { listId } = useParams<{ listId: string }>()
  const navigate = useNavigate()
  const lib = useLibraryStore((s) => s.lib)
  const { mutationCount } = useLibraryStore()

  const [list, setList] = useState<FavoritesList | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  useEffect(() => {
    if (!lib || !listId) return
    try {
      const l = lib.getFavoritesList(listId)
      setList(l)
      const allCards = lib.searchCards('')
      const cardMap = new Map(allCards.map((c) => [c.id, c]))
      setCards(l.card_ids.flatMap((id) => (cardMap.has(id) ? [cardMap.get(id)!] : [])))
    } catch {
      navigate('/favorites')
    }
  }, [lib, listId, mutationCount, navigate])

  if (!list) return null

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)' }}
      >
        <button onClick={() => navigate('/favorites')} style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1
          className="text-lg font-semibold"
          style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
        >
          {list.name}
        </h1>
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {cards.length} cards
        </span>
      </div>

      <div className="flex-1 min-h-0">
        {cards.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No cards in this list"
            description="Add cards from the Search tab"
          />
        ) : (
          <CardGrid cards={cards} onCardClick={setSelectedCard} />
        )}
      </div>

      <CardDetailSheet
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  )
}
