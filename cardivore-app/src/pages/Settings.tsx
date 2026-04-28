import { useState } from 'react'
import { RefreshCw, Trash2, Database } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLibraryStore } from '../store/useLibraryStore'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

export default function SettingsPage() {
  const { syncDatabase, clearAll, lastSync } = useLibraryStore()
  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      const count = await syncDatabase()
      toast.success(`Synced ${count.toLocaleString()} cards`)
    } catch (e) {
      toast.error(`Sync failed: ${String(e)}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleClear() {
    if (!confirm('Clear all data? This cannot be undone.')) return
    setClearing(true)
    try {
      await clearAll()
      toast.success('All data cleared')
    } catch {
      toast.error('Failed to clear data')
    } finally {
      setClearing(false)
    }
  }

  const lastSyncDate = lastSync
    ? new Date(lastSync).toLocaleString()
    : 'Never'

  return (
    <div className="p-6 max-w-lg">
      <h1
        className="text-2xl font-semibold mb-6"
        style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
      >
        Settings
      </h1>

      {/* Database section */}
      <section
        className="rounded-xl p-4 mb-4 border"
        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
          <Database size={14} />
          DATABASE
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>Last sync</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{lastSyncDate}</span>
          </div>

          <Button
            onClick={handleSync}
            disabled={syncing}
            className="w-full"
          >
            {syncing ? <Spinner size={16} /> : <RefreshCw size={16} />}
            {syncing ? 'Syncing… (this may take a minute)' : 'Sync card database'}
          </Button>

          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Downloads all MTG cards from magicthegathering.io. Required before searching.
          </p>
        </div>
      </section>

      {/* Danger zone */}
      <section
        className="rounded-xl p-4 border"
        style={{
          background: 'var(--color-bg-surface)',
          borderColor: 'rgba(211,32,42,0.4)',
        }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-mana-r)' }}>
          DANGER ZONE
        </h2>
        <Button
          variant="danger"
          onClick={handleClear}
          disabled={clearing}
        >
          {clearing ? <Spinner size={16} /> : <Trash2 size={16} />}
          Clear all data
        </Button>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Removes all cards, decks, favorites, and rules. Cannot be undone.
        </p>
      </section>

      {/* About */}
      <section className="mt-6">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Cardivore — MTG Deckbuilding Tool
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Powered by the Cardivore WASM library
        </p>
      </section>
    </div>
  )
}
