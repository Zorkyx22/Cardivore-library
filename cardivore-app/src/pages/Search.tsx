import { useState, useEffect, useCallback } from 'react'
import { Search as SearchIcon, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLibraryStore } from '../store/useLibraryStore'
import type { Card } from '../wasm/types'
import SearchBar from '../components/search/SearchBar'
import CardGrid from '../components/cards/CardGrid'
import CardDetailSheet from '../components/cards/CardDetailSheet'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import Button from '../components/ui/Button'

let debounceTimer: ReturnType<typeof setTimeout>

export default function SearchPage() {
  const lib = useLibraryStore((s) => s.lib)
  const lastSync = useLibraryStore((s) => s.lastSync)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Card[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const navigate = useNavigate()

  const doSearch = useCallback(
    (q: string) => {
      if (!lib) return
      setSearching(true)
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        const res = lib.searchCards(q || '')
        setResults(res.slice(0, 300))
        setSearching(false)
      }, 300)
    },
    [lib]
  )

  useEffect(() => {
    doSearch(query)
  }, [query, doSearch])

  const neverSynced = lastSync === 0
  const cardCount = results.length

  return (
    <div className="flex flex-col h-full">
      {/* Sync banner */}
      {neverSynced && (
        <div
          className="px-4 py-3 flex items-center justify-between gap-3 text-sm border-b"
          style={{
            background: 'rgba(201,168,76,0.1)',
            borderColor: 'var(--color-accent-dim)',
            color: 'var(--color-accent)',
          }}
        >
          <span>No cards yet — sync the database to get started.</span>
          <Button size="sm" onClick={() => navigate('/settings')}>
            <RefreshCw size={14} /> Sync
          </Button>
        </div>
      )}

      {/* Search bar */}
      <div className="px-3 pt-4 pb-2">
        <SearchBar value={query} onChange={setQuery} />
        {!neverSynced && (
          <p className="text-xs mt-1.5 px-1" style={{ color: 'var(--color-text-muted)' }}>
            {searching ? 'Searching…' : `${cardCount} result${cardCount !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 min-h-0">
        {searching ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : results.length === 0 && !neverSynced ? (
          <EmptyState
            icon={SearchIcon}
            title={query ? 'No cards found' : 'Start searching'}
            description={query ? `No results for "${query}"` : 'Type a card name or use the query syntax'}
          />
        ) : (
          <CardGrid cards={results} onCardClick={setSelectedCard} />
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
