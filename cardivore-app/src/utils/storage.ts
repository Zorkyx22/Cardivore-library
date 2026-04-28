import { Preferences } from '@capacitor/preferences'

const CARDS_KEY = 'cardivore_cards'
const META_KEY = 'cardivore_meta'

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key })
      return value
    } catch {
      return localStorage.getItem(key)
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value })
    } catch {
      localStorage.setItem(key, value)
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key })
    } catch {
      localStorage.removeItem(key)
    }
  },
}

export async function saveState(fullJson: string): Promise<void> {
  try {
    const parsed = JSON.parse(fullJson) as Record<string, unknown>
    const cards = parsed.cards
    const meta = { ...parsed, cards: [] }
    await Promise.all([
      storage.set(META_KEY, JSON.stringify(meta)),
      storage.set(CARDS_KEY, JSON.stringify(cards)),
    ])
  } catch {
    // Fallback: save everything together (may fail on large state)
    await storage.set(META_KEY, fullJson)
  }
}

export async function loadState(): Promise<string | null> {
  const [metaJson, cardsJson] = await Promise.all([
    storage.get(META_KEY),
    storage.get(CARDS_KEY),
  ])

  if (!metaJson) return null

  try {
    const meta = JSON.parse(metaJson) as Record<string, unknown>
    const cards = cardsJson ? JSON.parse(cardsJson) : []
    return JSON.stringify({ ...meta, cards })
  } catch {
    return metaJson
  }
}

export async function clearState(): Promise<void> {
  await Promise.all([storage.remove(META_KEY), storage.remove(CARDS_KEY)])
}
