# Project Plan — Cardivore Library

This document is written for AI coding agents. Each phase is a self-contained unit of work with explicit interfaces, data shapes, and acceptance criteria. Complete phases in order; later phases depend on earlier ones.

---

## Architectural Decisions (Read Before Coding)

**WASM boundary contract**: All public functions exposed to JavaScript via `#[wasm_bindgen]` must accept and return either primitives (`u32`, `f64`, `bool`) or `String`. Complex types are passed as JSON strings. The library deserializes on entry and serializes on exit using `serde_json`.

**State model**: The library exposes a single stateful object (`CardivoreLibrary`) created with `new()`. The host application (React Native / web) owns persistence — it serializes the library state to a string via `export_state() -> String` and restores it via `CardivoreLibrary::from_state(json: &str)`. The library never touches the filesystem or any storage API.

**Error handling**: All fallible `#[wasm_bindgen]` functions return `Result<T, JsValue>` so errors propagate to JavaScript as exceptions. Internal helper functions use `Result<T, LibraryError>` with a custom error enum.

**Module layout** (create these files as needed):
```
src/
  lib.rs          ← re-exports, #[wasm_bindgen] entry points
  error.rs        ← LibraryError enum + From impls
  types.rs        ← all shared data structs (Card, Deck, etc.)
  db/
    mod.rs        ← CardDatabase struct
    sync.rs       ← API fetch + diff logic
    query.rs      ← MTG query syntax parser + filter engine
  collection/
    mod.rs        ← FavoritesList, Deck structs + CRUD
    metadata.rs   ← CardInDeck, DeckProperties
  rules/
    mod.rs        ← TableRules struct + import/export
  pricing/
    mod.rs        ← vendor API client stubs
```

---

## Dependencies to Add (update `Cargo.toml` before Phase 1)

```toml
[dependencies]
wasm-bindgen = "0.2.92"
wasm-pack = "0.12.1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
js-sys = "0.3"
wasm-bindgen-futures = "0.4"

[dev-dependencies]
wasm-bindgen-test = "0.3"
```

> `wasm-pack = "0.12.1"` in `[dependencies]` is incorrect — it is a CLI tool, not a library crate. Remove it from `[dependencies]` once the above block is in place.

---

## Phase 1 — Core Types and Library Shell

**Goal**: Establish the shared data model and the `CardivoreLibrary` struct. No logic yet.

### Tasks

**1.1 — Create `src/error.rs`**

```rust
#[derive(Debug)]
pub enum LibraryError {
    SerdeJson(serde_json::Error),
    NotFound(String),
    InvalidInput(String),
}

impl From<serde_json::Error> for LibraryError { ... }

impl std::fmt::Display for LibraryError { ... }
```

**1.2 — Create `src/types.rs`**

Define the following structs, all deriving `Serialize, Deserialize, Clone, Debug`:

```rust
pub struct Card {
    pub id: String,
    pub name: String,
    pub mana_cost: Option<String>,
    pub cmc: f32,
    pub colors: Vec<String>,
    pub color_identity: Vec<String>,
    pub type_line: String,       // "Legendary Creature — Dragon"
    pub oracle_text: Option<String>,
    pub power: Option<String>,
    pub toughness: Option<String>,
    pub loyalty: Option<String>,
    pub set_code: String,
    pub rarity: String,          // "common" | "uncommon" | "rare" | "mythic"
    pub image_url: Option<String>,
    pub legalities: HashMap<String, String>, // format → "legal" | "banned" | "restricted"
}

pub struct CardInDeck {
    pub card_id: String,
    pub quantity: u32,
    pub category: String,        // "mainboard" | "sideboard" | "commander" | "companion" | custom
    pub is_commander: bool,
    pub is_companion: bool,
    pub notes: Option<String>,
}

pub struct Deck {
    pub id: String,              // uuid-style, generate with a simple timestamp+counter
    pub name: String,
    pub format: String,          // "commander" | "standard" | etc.
    pub folder: Option<String>,
    pub ruleset_id: Option<String>,
    pub cards: Vec<CardInDeck>,
}

pub struct FavoritesList {
    pub id: String,
    pub name: String,
    pub card_ids: Vec<String>,
}

pub struct BanEntry {
    pub card_name: String,       // by name, not id, to survive reprints
    pub format: String,
}

pub struct TableRules {
    pub id: String,
    pub name: String,
    pub based_on: Vec<String>,   // formats this extends
    pub unbanned: Vec<BanEntry>,
    pub banned: Vec<BanEntry>,
    pub banned_keywords: Vec<String>,
    pub errata: HashMap<String, String>, // card_name → override oracle text
}
```

**1.3 — Create the `CardivoreLibrary` shell in `src/lib.rs`**

```rust
#[wasm_bindgen]
pub struct CardivoreLibrary {
    cards: Vec<types::Card>,
    decks: Vec<types::Deck>,
    favorites: Vec<types::FavoritesList>,
    table_rules: Vec<types::TableRules>,
}

#[wasm_bindgen]
impl CardivoreLibrary {
    #[wasm_bindgen(constructor)]
    pub fn new() -> CardivoreLibrary { ... }

    pub fn export_state(&self) -> Result<String, JsValue> { ... }

    pub fn from_state(json: &str) -> Result<CardivoreLibrary, JsValue> { ... }
}
```

**Acceptance criteria**: `cargo build` succeeds, `cargo test` passes, `wasm-pack build` produces a `pkg/` directory.

---

## Phase 2 — Card Database Sync

**Goal**: Populate `self.cards` by fetching from the magicthegathering.io API.

### Background

The API endpoint is `https://api.magicthegathering.io/v1/cards`. It is paginated (query param `page`, returns up to 100 cards per page, total count in `X-Total-Count` header). All fields map directly onto `Card` defined in Phase 1.

### Tasks

**2.1 — Create `src/db/sync.rs`**

Implement a free async function (not `#[wasm_bindgen]` directly):

```rust
pub async fn fetch_all_cards() -> Result<Vec<Card>, LibraryError>
```

- Uses `web_sys::fetch` (via `wasm_bindgen_futures`) to make requests
- Iterates pages until all cards are retrieved
- Maps API JSON onto `Card`; skip cards where required fields are missing

**2.2 — Expose sync to JS in `src/lib.rs`**

```rust
#[wasm_bindgen]
impl CardivoreLibrary {
    // Returns number of cards loaded
    pub async fn sync_database(&mut self) -> Result<u32, JsValue> { ... }

    // Returns timestamp (ms since epoch) of last sync, or 0 if never synced
    pub fn last_sync_timestamp(&self) -> f64 { ... }
}
```

Store `last_sync: Option<f64>` on `CardivoreLibrary` and serialize it as part of `export_state`.

**Acceptance criteria**: Calling `sync_database()` from a browser WASM context populates `self.cards` and returns the count. `export_state` / `from_state` round-trips correctly with the loaded data.

---

## Phase 3 — Card Search

**Goal**: Filter `self.cards` using MTG-style query syntax.

### Query Syntax to Support (subset)

| Token | Meaning |
|---|---|
| `name:dragon` | name contains "dragon" (case-insensitive) |
| `c:r` | color includes red (`w u b r g`) |
| `ci:rug` | color identity matches |
| `cmc=4`, `cmc>=3` | converted mana cost comparison |
| `t:creature` | type line contains |
| `o:flying` | oracle text contains |
| `r:rare` | rarity equals |
| `f:commander` | legal in format |
| `set:neo` | set code equals |
| bare word | matches name (same as `name:`) |

Multiple tokens are AND-ed together.

### Tasks

**3.1 — Create `src/db/query.rs`**

```rust
pub struct Query {
    predicates: Vec<Predicate>,
}

enum Predicate { Name(String), Color(Vec<char>), ColorIdentity(Vec<char>), ... }

impl Query {
    pub fn parse(input: &str) -> Result<Query, LibraryError> { ... }
    pub fn matches(&self, card: &Card) -> bool { ... }
}
```

Implement `Query::parse` with a simple token splitter (split on whitespace, then parse each token as `key:value` or a bare word).

**3.2 — Expose search in `src/lib.rs`**

```rust
#[wasm_bindgen]
impl CardivoreLibrary {
    // Returns JSON array of matching Card objects
    pub fn search_cards(&self, query: &str) -> Result<String, JsValue> { ... }
}
```

**Acceptance criteria**: `search_cards("t:dragon c:r cmc>=6")` returns only red dragons with CMC ≥ 6. Unit tests covering each predicate type in `src/db/query.rs`.

---

## Phase 4 — Favorites and Decks

**Goal**: Full CRUD for `FavoritesList` and `Deck`.

### Tasks

**4.1 — ID generation**

Add a private helper:
```rust
fn next_id(prefix: &str) -> String  // e.g. "deck-1746000000-3"
```
Use a module-level `AtomicU32` counter combined with `js_sys::Date::now()`.

**4.2 — Favorites API**

```rust
pub fn create_favorites_list(&mut self, name: &str) -> Result<String, JsValue>   // returns id
pub fn delete_favorites_list(&mut self, id: &str) -> Result<(), JsValue>
pub fn add_to_favorites(&mut self, list_id: &str, card_id: &str) -> Result<(), JsValue>
pub fn remove_from_favorites(&mut self, list_id: &str, card_id: &str) -> Result<(), JsValue>
pub fn get_favorites_list(&self, id: &str) -> Result<String, JsValue>            // returns JSON FavoritesList
pub fn list_favorites(&self) -> Result<String, JsValue>                          // returns JSON array of FavoritesList
```

**4.3 — Decks API**

```rust
pub fn create_deck(&mut self, name: &str, format: &str) -> Result<String, JsValue>
pub fn delete_deck(&mut self, id: &str) -> Result<(), JsValue>
pub fn get_deck(&self, id: &str) -> Result<String, JsValue>
pub fn list_decks(&self) -> Result<String, JsValue>
pub fn add_card_to_deck(&mut self, deck_id: &str, card_in_deck_json: &str) -> Result<(), JsValue>
pub fn remove_card_from_deck(&mut self, deck_id: &str, card_id: &str, category: &str) -> Result<(), JsValue>
pub fn update_card_in_deck(&mut self, deck_id: &str, card_in_deck_json: &str) -> Result<(), JsValue>
pub fn set_deck_folder(&mut self, deck_id: &str, folder: Option<String>) -> Result<(), JsValue>
pub fn set_deck_ruleset(&mut self, deck_id: &str, ruleset_id: Option<String>) -> Result<(), JsValue>
```

**Acceptance criteria**: Round-trip test: create a deck, add cards, serialize with `export_state`, deserialize with `from_state`, verify deck and cards are intact.

---

## Phase 5 — Table Rules

**Goal**: CRUD for `TableRules` plus import/export to a self-contained JSON format.

### Tasks

**5.1 — Table Rules CRUD**

```rust
pub fn create_table_rules(&mut self, name: &str, based_on_json: &str) -> Result<String, JsValue>
pub fn delete_table_rules(&mut self, id: &str) -> Result<(), JsValue>
pub fn get_table_rules(&self, id: &str) -> Result<String, JsValue>
pub fn list_table_rules(&self) -> Result<String, JsValue>
pub fn add_ban(&mut self, rules_id: &str, card_name: &str, format: &str) -> Result<(), JsValue>
pub fn add_unban(&mut self, rules_id: &str, card_name: &str, format: &str) -> Result<(), JsValue>
pub fn add_banned_keyword(&mut self, rules_id: &str, keyword: &str) -> Result<(), JsValue>
pub fn set_errata(&mut self, rules_id: &str, card_name: &str, oracle_override: &str) -> Result<(), JsValue>
```

**5.2 — Import/Export**

Export format is just a `TableRules` struct serialized to a JSON string (no envelope needed):

```rust
pub fn export_table_rules(&self, id: &str) -> Result<String, JsValue>
pub fn import_table_rules(&mut self, json: &str) -> Result<String, JsValue>  // returns new id after re-id
```

`import_table_rules` must assign a fresh `id` so importing the same ruleset twice doesn't collide.

**Acceptance criteria**: Export a `TableRules`, clear `self.table_rules`, import it back, assert name and ban list are identical.

---

## Phase 6 — Deck Import / Export

**Goal**: Parse and emit the two most common deck list text formats.

### Formats to Support

**Format A — Count-first with optional category headers**
```
Commander
1 Atraxa, Praetor's Voice

Mainboard
3 Lightning Bolt
1 Sol Ring

Sideboard
2 Path to Exile
```

**Format B — Bare list (no header, count prefix)**
```
1x Lightning Bolt
1x Sol Ring
```

### Tasks

**6.1 — Parser in `src/collection/mod.rs`**

```rust
pub fn parse_deck_text(text: &str) -> Result<Vec<CardInDeck>, LibraryError>
```

- Detect format by whether a bare word line (no leading digit) exists before card lines
- Category header "Commander" → `is_commander: true` for that section
- Category header "Sideboard" → `category: "sideboard"`
- Default category is "mainboard"
- `1x` and `1 ` prefixes both supported; fallback quantity is 1

**6.2 — Emitter**

```rust
pub fn emit_deck_text(deck: &Deck, card_lookup: &HashMap<String, Card>) -> String
```

Emits Format A with category headers grouped.

**6.3 — Expose to JS**

```rust
pub fn import_deck(&mut self, deck_name: &str, format: &str, text: &str) -> Result<String, JsValue>
pub fn export_deck(&self, deck_id: &str) -> Result<String, JsValue>
```

`import_deck` looks up card IDs from `self.cards` by name (case-insensitive). Cards not found in the local database are still added to the deck with `card_id` set to the lowercased name as a placeholder.

**Acceptance criteria**: Round-trip a sample deck list through `import_deck` → `export_deck` and assert the card names and quantities are preserved.

---

## Phase 7 — Card Pricing

**Goal**: Stub out a pricing API so the interface is stable even before vendor integrations are built.

### Tasks

**7.1 — Define the price type in `src/types.rs`**

```rust
pub struct CardPrice {
    pub card_id: String,
    pub vendor: String,
    pub currency: String,
    pub normal: Option<f64>,
    pub foil: Option<f64>,
    pub url: Option<String>,
    pub fetched_at: f64,   // ms since epoch
}
```

**7.2 — Create `src/pricing/mod.rs`**

```rust
pub async fn fetch_price(card: &Card, vendor: &str) -> Result<CardPrice, LibraryError>
```

Implement one real vendor (Scryfall's `/cards/named` endpoint returns `prices` with `usd` and `usd_foil`). For any other vendor string, return `LibraryError::InvalidInput("unknown vendor".into())`.

**7.3 — Expose to JS**

```rust
pub async fn get_card_price(&self, card_id: &str, vendor: &str) -> Result<String, JsValue>
// returns JSON CardPrice
```

Look up the card in `self.cards` by id, call `fetch_price`, return the result. Do not cache prices in `self` — the host manages caching.

**Acceptance criteria**: Calling `get_card_price` with a valid card ID and `"scryfall"` returns a `CardPrice` with at least one non-null price field.

---

## Cross-Cutting Work

- After Phase 1: add `wasm-bindgen-test` tests run with `wasm-pack test --headless --firefox`
- After Phase 3: fuzz the query parser with at least 10 malformed input strings and assert it returns `Err` rather than panicking
- After Phase 6: add a test fixture file `tests/fixtures/sample_deck.txt` and test both import paths against it
- Before shipping any phase: run `cargo clippy -- -D warnings` and fix all findings
