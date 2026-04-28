import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Plus, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLibraryStore } from '../store/useLibraryStore'
import type { TableRules } from '../wasm/types'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

function CreateRulesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createTableRules } = useLibraryStore()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const id = await createTableRules(name.trim(), [])
      onClose()
      navigate(`/rules/${id}`)
    } catch {
      toast.error('Failed to create ruleset')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-72 rounded-2xl p-6 space-y-3" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>New Ruleset</h3>
        <input
          autoFocus
          type="text"
          placeholder="Ruleset name"
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

function ImportRulesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { importTableRules } = useLibraryStore()
  const [json, setJson] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleImport() {
    if (!json.trim()) return
    setLoading(true)
    try {
      await importTableRules(json.trim())
      setJson('')
      onClose()
      toast.success('Ruleset imported')
    } catch (e) {
      toast.error(`Import failed: ${String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-3" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>Import Ruleset</h3>
        <textarea
          autoFocus
          placeholder="Paste ruleset JSON…"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none resize-none"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        />
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleImport} disabled={!json.trim() || loading}>Import</Button>
        </div>
      </div>
    </div>
  )
}

export default function TableRulesPage() {
  const lib = useLibraryStore((s) => s.lib)
  const { deleteTableRules, mutationCount } = useLibraryStore()
  const [rules, setRules] = useState<TableRules[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (lib) setRules(lib.listTableRules())
  }, [lib, mutationCount])

  async function handleDelete(id: string) {
    if (!confirm('Delete this ruleset?')) return
    try {
      await deleteTableRules(id)
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
          Table Rules
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

      {rules.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No custom rulesets"
          description="Create a ruleset to define custom bans, unbans, and errata for your playgroup"
          action={<Button size="sm" onClick={() => setCreateOpen(true)}>Create Ruleset</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className="rounded-xl p-4 border cursor-pointer mtg-glow"
              style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
              onClick={() => navigate(`/rules/${r.id}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {r.banned.length} bans · {r.unbanned.length} unbans · {Object.keys(r.errata).length} errata
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }}
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateRulesDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportRulesDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
