import type { Card, CardInDeck, Deck, FavoritesList, TableRules, CardPrice } from './types'

type WasmModule = typeof import('./pkg/cardivore_library')
type RawLib = import('./pkg/cardivore_library').CardivoreLibrary

let _mod: WasmModule | null = null
let _lib: RawLib | null = null

async function getModule(): Promise<WasmModule> {
  if (_mod) return _mod
  const mod = await import('./pkg/cardivore_library')
  await mod.default()
  _mod = mod
  return mod
}

export async function initLib(savedState?: string | null): Promise<LibWrapper> {
  const mod = await getModule()
  if (savedState) {
    _lib = mod.CardivoreLibrary.from_state(savedState)
  } else {
    _lib = new mod.CardivoreLibrary()
  }
  return new LibWrapper(_lib)
}

function parse<T>(json: string): T {
  return JSON.parse(json) as T
}

export class LibWrapper {
  private lib: RawLib

  constructor(lib: RawLib) {
    this.lib = lib
  }

  exportState(): string {
    return this.lib.export_state()
  }

  lastSyncTimestamp(): number {
    return this.lib.last_sync_timestamp()
  }

  async syncDatabase(): Promise<number> {
    return this.lib.sync_database()
  }

  searchCards(query: string): Card[] {
    try {
      return parse<Card[]>(this.lib.search_cards(query))
    } catch {
      return []
    }
  }

  // ── Favorites ────────────────────────────────────────────────────────────────

  createFavoritesList(name: string): string {
    return this.lib.create_favorites_list(name)
  }

  deleteFavoritesList(id: string): void {
    this.lib.delete_favorites_list(id)
  }

  addToFavorites(listId: string, cardId: string): void {
    this.lib.add_to_favorites(listId, cardId)
  }

  removeFromFavorites(listId: string, cardId: string): void {
    this.lib.remove_from_favorites(listId, cardId)
  }

  getFavoritesList(id: string): FavoritesList {
    return parse<FavoritesList>(this.lib.get_favorites_list(id))
  }

  listFavorites(): FavoritesList[] {
    return parse<FavoritesList[]>(this.lib.list_favorites())
  }

  // ── Decks ────────────────────────────────────────────────────────────────────

  createDeck(name: string, format: string): string {
    return this.lib.create_deck(name, format)
  }

  deleteDeck(id: string): void {
    this.lib.delete_deck(id)
  }

  getDeck(id: string): Deck {
    return parse<Deck>(this.lib.get_deck(id))
  }

  listDecks(): Deck[] {
    return parse<Deck[]>(this.lib.list_decks())
  }

  addCardToDeck(deckId: string, card: CardInDeck): void {
    this.lib.add_card_to_deck(deckId, JSON.stringify(card))
  }

  removeCardFromDeck(deckId: string, cardId: string, category: string): void {
    this.lib.remove_card_from_deck(deckId, cardId, category)
  }

  updateCardInDeck(deckId: string, card: CardInDeck): void {
    this.lib.update_card_in_deck(deckId, JSON.stringify(card))
  }

  setDeckFolder(deckId: string, folder?: string | null): void {
    this.lib.set_deck_folder(deckId, folder ?? undefined)
  }

  setDeckRuleset(deckId: string, rulesetId?: string | null): void {
    this.lib.set_deck_ruleset(deckId, rulesetId ?? undefined)
  }

  importDeck(name: string, format: string, text: string): string {
    return this.lib.import_deck(name, format, text)
  }

  exportDeck(deckId: string): string {
    return this.lib.export_deck(deckId)
  }

  // ── Table Rules ──────────────────────────────────────────────────────────────

  createTableRules(name: string, basedOn: string[]): string {
    return this.lib.create_table_rules(name, JSON.stringify(basedOn))
  }

  deleteTableRules(id: string): void {
    this.lib.delete_table_rules(id)
  }

  getTableRules(id: string): TableRules {
    return parse<TableRules>(this.lib.get_table_rules(id))
  }

  listTableRules(): TableRules[] {
    return parse<TableRules[]>(this.lib.list_table_rules())
  }

  addBan(rulesId: string, cardName: string, format: string): void {
    this.lib.add_ban(rulesId, cardName, format)
  }

  addUnban(rulesId: string, cardName: string, format: string): void {
    this.lib.add_unban(rulesId, cardName, format)
  }

  addBannedKeyword(rulesId: string, keyword: string): void {
    this.lib.add_banned_keyword(rulesId, keyword)
  }

  setErrata(rulesId: string, cardName: string, oracleOverride: string): void {
    this.lib.set_errata(rulesId, cardName, oracleOverride)
  }

  exportTableRules(id: string): string {
    return this.lib.export_table_rules(id)
  }

  importTableRules(json: string): string {
    return this.lib.import_table_rules(json)
  }

  // ── Pricing ──────────────────────────────────────────────────────────────────

  async getCardPrice(cardId: string, vendor = 'scryfall'): Promise<CardPrice> {
    return parse<CardPrice>(await this.lib.get_card_price(cardId, vendor))
  }
}
