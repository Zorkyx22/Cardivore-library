import { create } from 'zustand'
import { LibWrapper, initLib } from '../wasm/loader'
import { saveState, loadState, clearState } from '../utils/storage'
import type { CardInDeck } from '../wasm/types'

type InitStatus = 'idle' | 'loading' | 'ready' | 'error'

interface LibraryState {
  lib: LibWrapper | null
  status: InitStatus
  error: string | null
  cardCount: number
  lastSync: number
  mutationCount: number

  initialize: () => Promise<void>
  persist: () => Promise<void>
  clearAll: () => Promise<void>

  syncDatabase: () => Promise<number>
  createDeck: (name: string, format: string) => Promise<string>
  deleteDeck: (id: string) => Promise<void>
  addCardToDeck: (deckId: string, card: CardInDeck) => Promise<void>
  removeCardFromDeck: (deckId: string, cardId: string, category: string) => Promise<void>
  updateCardInDeck: (deckId: string, card: CardInDeck) => Promise<void>
  setDeckFolder: (deckId: string, folder?: string | null) => Promise<void>
  setDeckRuleset: (deckId: string, rulesetId?: string | null) => Promise<void>
  importDeck: (name: string, format: string, text: string) => Promise<string>
  createFavoritesList: (name: string) => Promise<string>
  deleteFavoritesList: (id: string) => Promise<void>
  addToFavorites: (listId: string, cardId: string) => Promise<void>
  removeFromFavorites: (listId: string, cardId: string) => Promise<void>
  createTableRules: (name: string, basedOn: string[]) => Promise<string>
  deleteTableRules: (id: string) => Promise<void>
  addBan: (rulesId: string, cardName: string, format: string) => Promise<void>
  addUnban: (rulesId: string, cardName: string, format: string) => Promise<void>
  addBannedKeyword: (rulesId: string, keyword: string) => Promise<void>
  setErrata: (rulesId: string, cardName: string, oracleOverride: string) => Promise<void>
  importTableRules: (json: string) => Promise<string>
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  lib: null,
  status: 'idle',
  error: null,
  cardCount: 0,
  lastSync: 0,
  mutationCount: 0,

  initialize: async () => {
    set({ status: 'loading' })
    try {
      const saved = await loadState()
      const lib = await initLib(saved)
      const lastSync = lib.lastSyncTimestamp()
      const decks = lib.listDecks()
      set({
        lib,
        status: 'ready',
        lastSync,
        cardCount: decks.length,
        error: null,
      })
    } catch (e) {
      set({ status: 'error', error: String(e) })
    }
  },

  persist: async () => {
    const { lib } = get()
    if (!lib) return
    const json = lib.exportState()
    await saveState(json)
  },

  clearAll: async () => {
    await clearState()
    const lib = await initLib(null)
    set({ lib, cardCount: 0, lastSync: 0, mutationCount: 0 })
  },

  syncDatabase: async () => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    const count = await lib.syncDatabase()
    set((s) => ({ lastSync: Date.now(), mutationCount: s.mutationCount + 1 }))
    await persist()
    return count
  },

  createDeck: async (name, format) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    const id = lib.createDeck(name, format)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
    return id
  },

  deleteDeck: async (id) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.deleteDeck(id)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  addCardToDeck: async (deckId, card) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.addCardToDeck(deckId, card)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  removeCardFromDeck: async (deckId, cardId, category) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.removeCardFromDeck(deckId, cardId, category)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  updateCardInDeck: async (deckId, card) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.updateCardInDeck(deckId, card)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  setDeckFolder: async (deckId, folder) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.setDeckFolder(deckId, folder)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  setDeckRuleset: async (deckId, rulesetId) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.setDeckRuleset(deckId, rulesetId)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  importDeck: async (name, format, text) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    const id = lib.importDeck(name, format, text)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
    return id
  },

  createFavoritesList: async (name) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    const id = lib.createFavoritesList(name)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
    return id
  },

  deleteFavoritesList: async (id) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.deleteFavoritesList(id)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  addToFavorites: async (listId, cardId) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.addToFavorites(listId, cardId)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  removeFromFavorites: async (listId, cardId) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.removeFromFavorites(listId, cardId)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  createTableRules: async (name, basedOn) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    const id = lib.createTableRules(name, basedOn)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
    return id
  },

  deleteTableRules: async (id) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.deleteTableRules(id)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  addBan: async (rulesId, cardName, format) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.addBan(rulesId, cardName, format)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  addUnban: async (rulesId, cardName, format) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.addUnban(rulesId, cardName, format)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  addBannedKeyword: async (rulesId, keyword) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.addBannedKeyword(rulesId, keyword)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  setErrata: async (rulesId, cardName, oracleOverride) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    lib.setErrata(rulesId, cardName, oracleOverride)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
  },

  importTableRules: async (json) => {
    const { lib, persist } = get()
    if (!lib) throw new Error('Library not ready')
    const id = lib.importTableRules(json)
    set((s) => ({ mutationCount: s.mutationCount + 1 }))
    await persist()
    return id
  },
}))
