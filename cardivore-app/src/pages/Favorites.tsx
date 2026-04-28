import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLibraryStore } from '../store/useLibraryStore'
import type { FavoritesList } from '../wasm/types'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

function CreateListDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createFavoritesList } = useLibraryStore()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      await createFavoritesList(name.trim())
      setName('')
      onClose()
    } catch {
      toast.error('Failed to create list')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-72 rounded-2xl p-6 space-y-3"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      >
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
          New List
        </h3>
        <input
          autoFocus
          type="text"
          placeholder="List name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        />
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleCreate} disabled={!name.trim() || loading}>Create</Button>
        </div>
      </div>
    </div>
  )
}

export default function FavoritesPage() {
  const lib = useLibraryStore((s) => s.lib)
  const { deleteFavoritesList, mutationCount } = useLibraryStore()
  const [lists, setLists] = useState<FavoritesList[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (lib) setLists(lib.listFavorites())
  }, [lib, mutationCount])

  async function handleDelete(id: string) {
    if (!confirm('Delete this list?')) return
    try {
      await deleteFavoritesList(id)
    } catch {
      toast.error('Failed to delete list')
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
          Favorites
        </h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> New List
        </Button>
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites lists"
          description="Create a list to save cards you love"
          action={<Button size="sm" onClick={() => setCreateOpen(true)}>Create List</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lists.map((list) => (
            <div
              key={list.id}
              className="rounded-xl p-4 border cursor-pointer mtg-glow"
              style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
              onClick={() => navigate(`/favorites/${list.id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{list.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {list.card_ids.length} card{list.card_ids.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Heart size={16} style={{ color: 'var(--color-mana-r)' }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(list.id) }}
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateListDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
