import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLibraryStore } from '../store/useLibraryStore'
import type { TableRules } from '../wasm/types'
import Button from '../components/ui/Button'

export default function RulesEditorPage() {
  const { rulesId } = useParams<{ rulesId: string }>()
  const navigate = useNavigate()
  const lib = useLibraryStore((s) => s.lib)
  const { addBan, addUnban, addBannedKeyword, setErrata, mutationCount } = useLibraryStore()

  const [rules, setRules] = useState<TableRules | null>(null)
  const [banName, setBanName] = useState('')
  const [banFormat, setBanFormat] = useState('commander')
  const [unbanName, setUnbanName] = useState('')
  const [keyword, setKeyword] = useState('')
  const [errataName, setErrataName] = useState('')
  const [errataText, setErrataText] = useState('')

  useEffect(() => {
    if (!lib || !rulesId) return
    try {
      setRules(lib.getTableRules(rulesId))
    } catch {
      navigate('/rules')
    }
  }, [lib, rulesId, mutationCount, navigate])

  async function handleAddBan() {
    if (!rulesId || !banName.trim()) return
    try {
      await addBan(rulesId, banName.trim(), banFormat)
      setBanName('')
      toast.success('Ban added')
    } catch {
      toast.error('Failed to add ban')
    }
  }

  async function handleAddUnban() {
    if (!rulesId || !unbanName.trim()) return
    try {
      await addUnban(rulesId, unbanName.trim(), banFormat)
      setUnbanName('')
      toast.success('Unban added')
    } catch {
      toast.error('Failed to add unban')
    }
  }

  async function handleAddKeyword() {
    if (!rulesId || !keyword.trim()) return
    try {
      await addBannedKeyword(rulesId, keyword.trim())
      setKeyword('')
    } catch {
      toast.error('Failed to add keyword')
    }
  }

  async function handleSetErrata() {
    if (!rulesId || !errataName.trim() || !errataText.trim()) return
    try {
      await setErrata(rulesId, errataName.trim(), errataText.trim())
      setErrataName('')
      setErrataText('')
      toast.success('Errata set')
    } catch {
      toast.error('Failed to set errata')
    }
  }

  function handleExport() {
    if (!lib || !rulesId) return
    const json = lib.exportTableRules(rulesId)
    navigator.clipboard.writeText(json).then(() => toast.success('Copied to clipboard!'))
  }

  if (!rules) return null

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-10"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)' }}
      >
        <button onClick={() => navigate('/rules')} style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold flex-1 truncate" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
          {rules.name}
        </h1>
        <Button size="sm" variant="ghost" onClick={handleExport}>
          <Download size={14} /> Export
        </Button>
      </div>

      <div className="p-4 space-y-6 max-w-2xl">
        {/* Bans */}
        <Section title="Bans">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Card name"
              value={banName}
              onChange={(e) => setBanName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBan()}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <input
              type="text"
              placeholder="Format"
              value={banFormat}
              onChange={(e) => setBanFormat(e.target.value)}
              className="w-28 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <Button size="sm" onClick={handleAddBan} disabled={!banName.trim()}>
              <Plus size={14} />
            </Button>
          </div>
          {rules.banned.map((b, i) => (
            <div key={i} className="flex items-center justify-between py-1 text-sm">
              <span style={{ color: 'var(--color-text-primary)' }}>{b.card_name}</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(211,32,42,0.15)', color: 'var(--color-mana-r)' }}>
                banned in {b.format}
              </span>
            </div>
          ))}
          {rules.banned.length === 0 && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No bans</p>}
        </Section>

        {/* Unbans */}
        <Section title="Unbans">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Card name"
              value={unbanName}
              onChange={(e) => setUnbanName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUnban()}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <Button size="sm" onClick={handleAddUnban} disabled={!unbanName.trim()}>
              <Plus size={14} />
            </Button>
          </div>
          {rules.unbanned.map((u, i) => (
            <div key={i} className="text-sm py-1">
              <span style={{ color: 'var(--color-text-primary)' }}>{u.card_name}</span>
              <span className="ml-2 text-xs" style={{ color: 'var(--color-mana-g)' }}>unbanned in {u.format}</span>
            </div>
          ))}
          {rules.unbanned.length === 0 && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No unbans</p>}
        </Section>

        {/* Banned Keywords */}
        <Section title="Banned Keywords">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="e.g. partner"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <Button size="sm" onClick={handleAddKeyword} disabled={!keyword.trim()}>
              <Plus size={14} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {rules.banned_keywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(211,32,42,0.15)', color: 'var(--color-mana-r)' }}>
                {kw}
              </span>
            ))}
          </div>
          {rules.banned_keywords.length === 0 && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No banned keywords</p>}
        </Section>

        {/* Errata */}
        <Section title="Errata">
          <div className="space-y-2 mb-3">
            <input
              type="text"
              placeholder="Card name"
              value={errataName}
              onChange={(e) => setErrataName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <textarea
              placeholder="Oracle text override…"
              value={errataText}
              onChange={(e) => setErrataText(e.target.value)}
              rows={3}
              className="w-full px-3 py-1.5 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <Button size="sm" onClick={handleSetErrata} disabled={!errataName.trim() || !errataText.trim()}>
              <Plus size={14} /> Set Errata
            </Button>
          </div>
          {Object.entries(rules.errata).map(([name, text]) => (
            <div key={name} className="py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{text}</p>
            </div>
          ))}
          {Object.keys(rules.errata).length === 0 && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No errata</p>}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
    >
      <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
