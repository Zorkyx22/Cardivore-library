import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useLibraryStore } from './store/useLibraryStore'
import AppShell from './components/layout/AppShell'
import SearchPage from './pages/Search'
import DeckListPage from './pages/Decks'
import DeckDetailPage from './pages/DeckDetail'
import FavoritesPage from './pages/Favorites'
import FavoritesDetailPage from './pages/FavoritesDetail'
import TableRulesPage from './pages/TableRules'
import RulesEditorPage from './pages/RulesEditor'
import SettingsPage from './pages/Settings'

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full flex-col gap-4">
      <div
        className="text-4xl font-display"
        style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
      >
        Cardivore
      </div>
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{
          borderColor: 'var(--color-border)',
          borderTopColor: 'var(--color-accent)',
        }}
      />
    </div>
  )
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center h-full flex-col gap-4 p-8 text-center">
      <div className="text-2xl" style={{ color: 'var(--color-mana-r)' }}>
        Failed to initialize
      </div>
      <p style={{ color: 'var(--color-text-muted)' }}>{error}</p>
    </div>
  )
}

export default function App() {
  const { initialize, status, error } = useLibraryStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (status === 'idle' || status === 'loading') return <LoadingScreen />
  if (status === 'error') return <ErrorScreen error={error ?? 'Unknown error'} />

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/search" replace />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="decks" element={<DeckListPage />} />
          <Route path="decks/:deckId" element={<DeckDetailPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="favorites/:listId" element={<FavoritesDetailPage />} />
          <Route path="rules" element={<TableRulesPage />} />
          <Route path="rules/:rulesId" element={<RulesEditorPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
