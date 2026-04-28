import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Search, Layers, Heart, Shield, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/decks', icon: Layers, label: 'Decks' },
  { to: '/favorites', icon: Heart, label: 'Favorites' },
  { to: '/rules', icon: Shield, label: 'Rules' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function AppShell() {
  const location = useLocation()

  return (
    <div
      className="flex h-full"
      style={{ background: 'var(--color-bg-base)' }}
    >
      {/* Sidebar — desktop only */}
      <nav
        className="hidden md:flex flex-col w-56 shrink-0 border-r py-6 gap-1"
        style={{
          background: 'var(--color-bg-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="px-4 pb-6 text-xl tracking-wider"
          style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
        >
          Cardivore
        </div>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
              }}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Bottom nav — mobile only */}
        <nav
          className="flex md:hidden border-t safe-bottom"
          style={{
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors"
                style={{
                  color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
