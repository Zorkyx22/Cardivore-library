import { useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'

const HINTS = [
  { syntax: 'name:bolt', desc: 'Name contains' },
  { syntax: 'c:r', desc: 'Color (W/U/B/R/G)' },
  { syntax: 'ci:rug', desc: 'Color identity' },
  { syntax: 'cmc:=4', desc: 'Mana value equals' },
  { syntax: 'cmc:>=3', desc: 'Mana value comparison' },
  { syntax: 't:creature', desc: 'Type line contains' },
  { syntax: 'o:flying', desc: 'Oracle text contains' },
  { syntax: 'r:rare', desc: 'Rarity' },
  { syntax: 'f:commander', desc: 'Legal in format' },
  { syntax: 'set:neo', desc: 'Set code' },
]

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search cards… (e.g. c:r t:dragon)',
}: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function insertSyntax(syntax: string) {
    const prefix = syntax.includes(':') ? syntax.split(':')[0] + ':' : syntax
    const newVal = value ? `${value} ${prefix}` : prefix
    onChange(newVal)
    inputRef.current?.focus()
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div
          className="flex items-center gap-2 px-3 rounded-xl"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none py-2.5 text-sm"
            style={{ color: 'var(--color-text-primary)', caretColor: 'var(--color-accent)' }}
          />
          {value && (
            <button onClick={() => onChange('')}>
              <X size={14} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          className="rounded-xl shadow-2xl p-3 z-30 w-72"
          sideOffset={4}
          align="start"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p
            className="text-xs font-semibold mb-2 uppercase tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Search syntax
          </p>
          <div className="grid gap-1">
            {HINTS.map(({ syntax, desc }) => (
              <button
                key={syntax}
                onClick={() => insertSyntax(syntax)}
                className="flex items-center justify-between text-xs px-2 py-1.5 rounded text-left hover:bg-white/5"
              >
                <code
                  className="font-mono"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {syntax}
                </code>
                <span style={{ color: 'var(--color-text-muted)' }}>{desc}</span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
