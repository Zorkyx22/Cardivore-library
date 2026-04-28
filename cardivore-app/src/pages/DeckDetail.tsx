import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Download, Search, Plus, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLibraryStore } from '../store/useLibraryStore'
import type { Deck, Card, CardInDeck } from '../wasm/types'
import SearchBar from '../components/search/SearchBar'
import CardDetailSheet from '../components/cards/CardDetailSheet'
import Button from '../components/ui/Button'

const CATEGORIES = ['commander', 'companion', 'mainboard', 'sideboard']

function ManaCurve({ deck, cardMap }: { deck: Deck; cardMap: Map<string, Card> }) {
  const cmcCounts: Record<number, number> = {}
  deck.cards.forEach(({ card_id, quantity }) => {
    const card = cardMap.get(card_id)
    const cmc = Math.min(card ? Math.floor(card.cmc) : 0, 7)
    cmcCounts[cmc] = (cmcCounts[cmc] ?? 0) + quantity
  })
  const max = Math.max(...Object.values(cmcCounts), 1)

  return (
    <div className="flex items-end gap-1 h-12">
      {Array.from({ length: 8 }, (_, i) => {
        const count = cmcCounts[i] ?? 0
        return (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
            <div
              className="w-full rounded-sm"
              style={{
                height: `${(count / max) * 40}px`,
                minHeight: count ? 4 : 0,
                background: 'var(--color-accent)',
                opacity: 0.7,
              }}
            />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>
              {i === 7 ? '7+' : i}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CardRow({
  entry,
  card,
  onQtyChange,
  onRemove,
}: {
  entry: CardInDeck
  card: Card | undefined
  onQtyChange: (qty: number) => void
  onRemove: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg"
      style={{ background: 'var(--color-bg-surface)' }}
    >
      <div className="flex items-center gap-1">
        <button
          onClick={() => entry.quantity > 1 && onQtyChange(entry.quantity - 1)}
          className="p-0.5 rounded"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Minus size={12} />
        </button>
        <span className="w-5 text-center text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>
          {entry.quantity}
        </span>
        <button
          onClick={() => onQtyChange(entry.quantity + 1)}
          className="p-0.5 rounded"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Plus size={12} />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
          {card?.name ?? entry.card_id}
        </p>
        {card && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {card.mana_cost ?? ''} {card.type_line}
          </p>
        )}
      </div>
      <button onClick={onRemove} style={{ color: 'var(--color-text-muted)' }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const lib = useLibraryStore((s) => s.lib)
  const { deleteDeck, removeCardFromDeck, updateCardInDeck, mutationCount } = useLibraryStore()

  const [deck, setDeck] = useState<Deck | null>(null)
  const [cardMap, setCardMap] = useState<Map<string, Card>>(new Map())
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Card[]>([])
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [exportText, setExportText] = useState('')
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    if (!lib || !deckId) return
    try {
      const d = lib.getDeck(deckId)
      setDeck(d)
      // Build card map from search index
      const allCards = lib.searchCards('')
      const map = new Map<string, Card>()
      allCards.forEach((c) => map.set(c.id, c))
      setCardMap(map)
    } catch {
      navigate('/decks')
    }
  }, [lib, deckId, mutationCount, navigate])

  useEffect(() => {
    if (!lib) return
    const timer = setTimeout(() => {
      const res = lib.searchCards(query || '')
      setSearchResults(res.slice(0, 100))
    }, 300)
    return () => clearTimeout(timer)
  }, [lib, query])

  async function handleDelete() {
    if (!deckId || !confirm('Delete this deck?')) return
    try {
      await deleteDeck(deckId)
      navigate('/decks')
    } catch {
      toast.error('Failed to delete deck')
    }
  }

  function handleExport() {
    if (!lib || !deckId) return
    const text = lib.exportDeck(deckId)
    setExportText(text)
    setShowExport(true)
  }

  async function handleQtyChange(entry: CardInDeck, qty: number) {
    if (!deckId) return
    try {
      await updateCardInDeck(deckId, { ...entry, quantity: qty })
    } catch {
      toast.error('Failed to update quantity')
    }
  }

  async function handleRemove(entry: CardInDeck) {
    if (!deckId) return
    try {
      await removeCardFromDeck(deckId, entry.card_id, entry.category)
    } catch {
      toast.error('Failed to remove card')
    }
  }

  if (!deck) return null

  const grouped = CATEGORIES.reduce<Record<string, CardInDeck[]>>((acc, cat) => {
    const cards = deck.cards.filter((c) => c.category === cat)
    if (cards.length) acc[cat] = cards
    return acc
  }, {})
  const customCats = [...new Set(deck.cards.map((c) => c.category))].filter(
    (c) => !CATEGORIES.includes(c)
  )
  customCats.forEach((cat) => {
    grouped[cat] = deck.cards.filter((c) => c.category === cat)
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)' }}
      >
        <button onClick={() => navigate('/decks')} style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1
            className="text-lg font-semibold truncate"
            style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
          >
            {deck.name}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {deck.format} · {deck.cards.reduce((s, c) => s + c.quantity, 0)} cards
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleExport}>
            <Download size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSearch((v) => !v)}>
            <Search size={14} />
          </Button>
          <Button size="sm" variant="danger" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Deck list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mana curve */}
          {deck.cards.length > 0 && (
            <div
              className="rounded-xl p-4 border"
              style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                MANA CURVE
              </p>
              <ManaCurve deck={deck} cardMap={cardMap} />
            </div>
          )}

          {/* Categories */}
          {Object.entries(grouped).map(([cat, cards]) => (
            <div key={cat}>
              <p
                className="text-xs font-semibold mb-2 uppercase tracking-wide"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {cat} ({cards.reduce((s, c) => s + c.quantity, 0)})
              </p>
              <div className="space-y-1.5">
                {cards.map((entry) => (
                  <CardRow
                    key={`${entry.card_id}-${entry.category}`}
                    entry={entry}
                    card={cardMap.get(entry.card_id)}
                    onQtyChange={(qty) => handleQtyChange(entry, qty)}
                    onRemove={() => handleRemove(entry)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Search panel */}
        {showSearch && (
          <div
            className="w-72 border-l flex flex-col overflow-hidden"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)' }}
          >
            <div className="p-3">
              <SearchBar value={query} onChange={setQuery} placeholder="Add cards…" />
            </div>
            <div className="flex-1 overflow-y-auto px-3 space-y-1">
              {searchResults.map((card) => (
                <button
                  key={card.id}
                  className="w-full text-left py-2 px-2 rounded-lg text-sm hover:bg-white/5"
                  style={{ color: 'var(--color-text-primary)' }}
                  onClick={() => setSelectedCard(card)}
                >
                  <span className="block truncate">{card.name}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {card.mana_cost ?? ''} · {card.type_line}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-3"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
              Export Deck
            </h3>
            <textarea
              readOnly
              value={exportText}
              rows={12}
              className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none resize-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(exportText).then(() => toast.success('Copied!'))}
              >
                Copy
              </Button>
              <Button className="flex-1" onClick={() => setShowExport(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <CardDetailSheet
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  )
}
