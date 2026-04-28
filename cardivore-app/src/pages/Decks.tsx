import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Layers, Trash2, Upload } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import toast from 'react-hot-toast'
import { useLibraryStore } from '../store/useLibraryStore'
import type { Deck } from '../wasm/types'
import { MTG_FORMATS } from '../wasm/types'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import ColorPips from '../components/cards/ColorPips'

function DeckCard({ deck, onDelete }: { deck: Deck; onDelete: () => void }) {
  const navigate = useNavigate()
  return (
    <div
      className="rounded-xl p-4 border cursor-pointer hover:border-accent transition-colors mtg-glow"
      style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
      onClick={() => navigate(`/decks/${deck.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {deck.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {deck.format} · {deck.cards.length} cards
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {deck.cards.length > 0 && (
        <div className="mt-2">
          <ColorPips colors={[]} />
        </div>
      )}
    </div>
  )
}

function CreateDeckDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createDeck } = useLibraryStore()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [format, setFormat] = useState('commander')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const id = await createDeck(name.trim(), format)
      onClose()
      setName('')
      navigate(`/decks/${id}`)
    } catch {
      toast.error('Failed to create deck')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.7)' }} />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-2xl p-6"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <Dialog.Title className="text-lg font-semibold mb-4" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
            New Deck
          </Dialog.Title>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Deck name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {MTG_FORMATS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={!name.trim() || loading}>
                Create
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ImportDeckDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { importDeck } = useLibraryStore()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [format, setFormat] = useState('commander')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleImport() {
    if (!name.trim() || !text.trim()) return
    setLoading(true)
    try {
      const id = await importDeck(name.trim(), format, text.trim())
      onClose()
      setText('')
      setName('')
      navigate(`/decks/${id}`)
    } catch (e) {
      toast.error(`Import failed: ${String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.7)' }} />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 rounded-2xl p-6"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <Dialog.Title className="text-lg font-semibold mb-4" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
            Import Deck
          </Dialog.Title>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Deck name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {MTG_FORMATS.map((f) => (<option key={f} value={f}>{f}</option>))}
            </select>
            <textarea
              placeholder={"Paste deck list:\n\nCommander\n1 Atraxa, Praetor's Voice\n\nMainboard\n4 Lightning Bolt"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none font-mono"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" onClick={handleImport} disabled={!name.trim() || !text.trim() || loading}>
                Import
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function DecksPage() {
  const lib = useLibraryStore((s) => s.lib)
  const { deleteDeck, mutationCount } = useLibraryStore()
  const [decks, setDecks] = useState<Deck[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    if (lib) setDecks(lib.listDecks())
  }, [lib, mutationCount])

  async function handleDelete(id: string) {
    if (!confirm('Delete this deck?')) return
    try {
      await deleteDeck(id)
      toast.success('Deck deleted')
    } catch {
      toast.error('Failed to delete deck')
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
          Decks
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setImportOpen(true)}>
            <Upload size={14} /> Import
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> New
          </Button>
        </div>
      </div>

      {decks.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No decks yet"
          description="Create a deck or import an existing deck list"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setImportOpen(true)}>Import</Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>Create</Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((d) => (
            <DeckCard key={d.id} deck={d} onDelete={() => handleDelete(d.id)} />
          ))}
        </div>
      )}

      <CreateDeckDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportDeckDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
