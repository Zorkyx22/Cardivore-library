export interface Card {
  id: string
  name: string
  mana_cost: string | null
  cmc: number
  colors: string[]
  color_identity: string[]
  type_line: string
  oracle_text: string | null
  power: string | null
  toughness: string | null
  loyalty: string | null
  set_code: string
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | string
  image_url: string | null
  legalities: Record<string, string>
}

export interface CardInDeck {
  card_id: string
  quantity: number
  category: string
  is_commander: boolean
  is_companion: boolean
  notes: string | null
}

export interface Deck {
  id: string
  name: string
  format: string
  folder: string | null
  ruleset_id: string | null
  cards: CardInDeck[]
}

export interface FavoritesList {
  id: string
  name: string
  card_ids: string[]
}

export interface BanEntry {
  card_name: string
  format: string
}

export interface TableRules {
  id: string
  name: string
  based_on: string[]
  unbanned: BanEntry[]
  banned: BanEntry[]
  banned_keywords: string[]
  errata: Record<string, string>
}

export interface CardPrice {
  card_id: string
  vendor: string
  currency: string
  normal: number | null
  foil: number | null
  url: string | null
  fetched_at: number
}

export const MTG_FORMATS = [
  'standard',
  'pioneer',
  'modern',
  'legacy',
  'vintage',
  'commander',
  'pauper',
  'brawl',
  'historic',
  'explorer',
] as const

export const COLOR_MAP: Record<string, { label: string; bg: string; text: string }> = {
  W: { label: 'White', bg: 'bg-mana-w', text: 'text-gray-800' },
  U: { label: 'Blue', bg: 'bg-mana-u', text: 'text-white' },
  B: { label: 'Black', bg: 'bg-mana-b', text: 'text-white' },
  R: { label: 'Red', bg: 'bg-mana-r', text: 'text-white' },
  G: { label: 'Green', bg: 'bg-mana-g', text: 'text-white' },
}

export const RARITY_COLORS: Record<string, string> = {
  common: '#9e9e9e',
  uncommon: '#c0c0c0',
  rare: '#d4af37',
  mythic: '#e05c00',
}
