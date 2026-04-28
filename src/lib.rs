use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

pub mod collection;
pub mod db;
pub mod error;
pub mod pricing;
pub mod rules;
pub mod types;

use error::LibraryError;

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct CardivoreLibrary {
    cards: Vec<types::Card>,
    decks: Vec<types::Deck>,
    favorites: Vec<types::FavoritesList>,
    table_rules: Vec<types::TableRules>,
    last_sync: Option<f64>,
}

impl Default for CardivoreLibrary {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl CardivoreLibrary {
    #[wasm_bindgen(constructor)]
    pub fn new() -> CardivoreLibrary {
        CardivoreLibrary {
            cards: Vec::new(),
            decks: Vec::new(),
            favorites: Vec::new(),
            table_rules: Vec::new(),
            last_sync: None,
        }
    }

    pub fn export_state(&self) -> Result<String, JsValue> {
        serde_json::to_string(self)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn from_state(json: &str) -> Result<CardivoreLibrary, JsValue> {
        serde_json::from_str(json)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    // ── Phase 2: DB sync ──────────────────────────────────────────────────────

    pub fn last_sync_timestamp(&self) -> f64 {
        self.last_sync.unwrap_or(0.0)
    }

    pub async fn sync_database(&mut self) -> Result<u32, JsValue> {
        let cards = db::sync::fetch_all_cards().await.map_err(lib_err_to_js)?;
        let count = cards.len() as u32;
        self.cards = cards;
        self.last_sync = Some(js_sys::Date::now());
        Ok(count)
    }

    // ── Phase 3: Card search ──────────────────────────────────────────────────

    pub fn search_cards(&self, query: &str) -> Result<String, JsValue> {
        let q = db::query::Query::parse(query).map_err(lib_err_to_js)?;
        let results: Vec<&crate::types::Card> =
            self.cards.iter().filter(|c| q.matches(c)).collect();
        serde_json::to_string(&results).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    // ── Phase 4: Favorites ────────────────────────────────────────────────────

    pub fn create_favorites_list(&mut self, name: &str) -> Result<String, JsValue> {
        Ok(collection::create_favorites_list(&mut self.favorites, name))
    }

    pub fn delete_favorites_list(&mut self, id: &str) -> Result<(), JsValue> {
        collection::delete_favorites_list(&mut self.favorites, id).map_err(lib_err_to_js)
    }

    pub fn add_to_favorites(&mut self, list_id: &str, card_id: &str) -> Result<(), JsValue> {
        collection::add_to_favorites(&mut self.favorites, list_id, card_id)
            .map_err(lib_err_to_js)
    }

    pub fn remove_from_favorites(&mut self, list_id: &str, card_id: &str) -> Result<(), JsValue> {
        collection::remove_from_favorites(&mut self.favorites, list_id, card_id)
            .map_err(lib_err_to_js)
    }

    pub fn get_favorites_list(&self, id: &str) -> Result<String, JsValue> {
        self.favorites
            .iter()
            .find(|f| f.id == id)
            .ok_or_else(|| JsValue::from_str(&format!("Not found: {}", id)))
            .and_then(|f| {
                serde_json::to_string(f).map_err(|e| JsValue::from_str(&e.to_string()))
            })
    }

    pub fn list_favorites(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.favorites)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    // ── Phase 4: Decks ────────────────────────────────────────────────────────

    pub fn create_deck(&mut self, name: &str, format: &str) -> Result<String, JsValue> {
        Ok(collection::create_deck(&mut self.decks, name, format))
    }

    pub fn delete_deck(&mut self, id: &str) -> Result<(), JsValue> {
        collection::delete_deck(&mut self.decks, id).map_err(lib_err_to_js)
    }

    pub fn get_deck(&self, id: &str) -> Result<String, JsValue> {
        self.decks
            .iter()
            .find(|d| d.id == id)
            .ok_or_else(|| JsValue::from_str(&format!("Not found: {}", id)))
            .and_then(|d| {
                serde_json::to_string(d).map_err(|e| JsValue::from_str(&e.to_string()))
            })
    }

    pub fn list_decks(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.decks)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn add_card_to_deck(
        &mut self,
        deck_id: &str,
        card_in_deck_json: &str,
    ) -> Result<(), JsValue> {
        let card: crate::types::CardInDeck = serde_json::from_str(card_in_deck_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        collection::add_card_to_deck(&mut self.decks, deck_id, card).map_err(lib_err_to_js)
    }

    pub fn remove_card_from_deck(
        &mut self,
        deck_id: &str,
        card_id: &str,
        category: &str,
    ) -> Result<(), JsValue> {
        collection::remove_card_from_deck(&mut self.decks, deck_id, card_id, category)
            .map_err(lib_err_to_js)
    }

    pub fn update_card_in_deck(
        &mut self,
        deck_id: &str,
        card_in_deck_json: &str,
    ) -> Result<(), JsValue> {
        let card: crate::types::CardInDeck = serde_json::from_str(card_in_deck_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        collection::update_card_in_deck(&mut self.decks, deck_id, card).map_err(lib_err_to_js)
    }

    pub fn set_deck_folder(
        &mut self,
        deck_id: &str,
        folder: Option<String>,
    ) -> Result<(), JsValue> {
        self.decks
            .iter_mut()
            .find(|d| d.id == deck_id)
            .ok_or_else(|| JsValue::from_str(&format!("Not found: {}", deck_id)))
            .map(|d| {
                d.folder = folder;
            })
    }

    pub fn set_deck_ruleset(
        &mut self,
        deck_id: &str,
        ruleset_id: Option<String>,
    ) -> Result<(), JsValue> {
        self.decks
            .iter_mut()
            .find(|d| d.id == deck_id)
            .ok_or_else(|| JsValue::from_str(&format!("Not found: {}", deck_id)))
            .map(|d| {
                d.ruleset_id = ruleset_id;
            })
    }

    // ── Phase 5 — Table Rules CRUD ────────────────────────────────────────────

    pub fn create_table_rules(&mut self, name: &str, based_on_json: &str) -> Result<String, JsValue> {
        let based_on: Vec<String> = serde_json::from_str(based_on_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(rules::create_table_rules(&mut self.table_rules, name, based_on))
    }

    pub fn delete_table_rules(&mut self, id: &str) -> Result<(), JsValue> {
        rules::delete_table_rules(&mut self.table_rules, id).map_err(lib_err_to_js)
    }

    pub fn get_table_rules(&self, id: &str) -> Result<String, JsValue> {
        self.table_rules
            .iter()
            .find(|r| r.id == id)
            .ok_or_else(|| JsValue::from_str(&format!("Not found: {}", id)))
            .and_then(|r| serde_json::to_string(r).map_err(|e| JsValue::from_str(&e.to_string())))
    }

    pub fn list_table_rules(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.table_rules)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn add_ban(&mut self, rules_id: &str, card_name: &str, format: &str) -> Result<(), JsValue> {
        rules::add_ban(&mut self.table_rules, rules_id, card_name, format).map_err(lib_err_to_js)
    }

    pub fn add_unban(&mut self, rules_id: &str, card_name: &str, format: &str) -> Result<(), JsValue> {
        rules::add_unban(&mut self.table_rules, rules_id, card_name, format).map_err(lib_err_to_js)
    }

    pub fn add_banned_keyword(&mut self, rules_id: &str, keyword: &str) -> Result<(), JsValue> {
        rules::add_banned_keyword(&mut self.table_rules, rules_id, keyword).map_err(lib_err_to_js)
    }

    pub fn set_errata(&mut self, rules_id: &str, card_name: &str, oracle_override: &str) -> Result<(), JsValue> {
        rules::set_errata(&mut self.table_rules, rules_id, card_name, oracle_override).map_err(lib_err_to_js)
    }

    pub fn export_table_rules(&self, id: &str) -> Result<String, JsValue> {
        self.table_rules
            .iter()
            .find(|r| r.id == id)
            .ok_or_else(|| JsValue::from_str(&format!("Not found: {}", id)))
            .and_then(|r| serde_json::to_string(r).map_err(|e| JsValue::from_str(&e.to_string())))
    }

    pub fn import_table_rules(&mut self, json: &str) -> Result<String, JsValue> {
        let mut ruleset: crate::types::TableRules = serde_json::from_str(json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        let new_id = collection::next_id("rules");
        ruleset.id = new_id.clone();
        self.table_rules.push(ruleset);
        Ok(new_id)
    }

    // ── Phase 6 — Deck import / export ───────────────────────────────────────

    pub fn import_deck(&mut self, deck_name: &str, format: &str, text: &str) -> Result<String, JsValue> {
        let mut cards = collection::parse_deck_text(text).map_err(lib_err_to_js)?;
        // Resolve card IDs from the local card database by case-insensitive name match.
        for c in &mut cards {
            if let Some(found) = self
                .cards
                .iter()
                .find(|card| card.name.to_lowercase() == c.card_id.to_lowercase())
            {
                c.card_id = found.id.clone();
            }
            // If not found, card_id stays as the lowercased name placeholder.
        }
        let id = collection::next_id("deck");
        let deck = crate::types::Deck {
            id: id.clone(),
            name: deck_name.to_string(),
            format: format.to_string(),
            folder: None,
            ruleset_id: None,
            cards,
        };
        self.decks.push(deck);
        Ok(id)
    }

    pub fn export_deck(&self, deck_id: &str) -> Result<String, JsValue> {
        let deck = self
            .decks
            .iter()
            .find(|d| d.id == deck_id)
            .ok_or_else(|| JsValue::from_str(&format!("Not found: {}", deck_id)))?;
        let card_lookup: std::collections::HashMap<String, crate::types::Card> = self
            .cards
            .iter()
            .map(|c| (c.id.clone(), c.clone()))
            .collect();
        Ok(collection::emit_deck_text(deck, &card_lookup))
    }

    // ── Phase 7 — Card pricing ────────────────────────────────────────────────

    pub async fn get_card_price(&self, card_id: &str, vendor: &str) -> Result<String, JsValue> {
        let card = self
            .cards
            .iter()
            .find(|c| c.id == card_id)
            .ok_or_else(|| JsValue::from_str(&format!("Not found: {}", card_id)))?;
        let price = pricing::fetch_price(card, vendor)
            .await
            .map_err(lib_err_to_js)?;
        serde_json::to_string(&price).map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

fn lib_err_to_js(e: LibraryError) -> JsValue {
    JsValue::from_str(&e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn make_library_with_deck() -> CardivoreLibrary {
        CardivoreLibrary {
            cards: Vec::new(),
            decks: vec![types::Deck {
                id: "deck-001".to_string(),
                name: "Test Commander".to_string(),
                format: "commander".to_string(),
                folder: Some("favorites".to_string()),
                ruleset_id: None,
                cards: vec![
                    types::CardInDeck {
                        card_id: "card-atraxa".to_string(),
                        quantity: 1,
                        category: "commander".to_string(),
                        is_commander: true,
                        is_companion: false,
                        notes: None,
                    },
                    types::CardInDeck {
                        card_id: "card-bolt".to_string(),
                        quantity: 4,
                        category: "mainboard".to_string(),
                        is_commander: false,
                        is_companion: false,
                        notes: Some("fast removal".to_string()),
                    },
                ],
            }],
            favorites: Vec::new(),
            table_rules: Vec::new(),
            last_sync: Some(1_700_000_000_000.0),
        }
    }

    fn make_library_with_rules() -> CardivoreLibrary {
        let mut errata = HashMap::new();
        errata.insert("Balance".to_string(), "Custom oracle text".to_string());

        CardivoreLibrary {
            cards: Vec::new(),
            decks: Vec::new(),
            favorites: Vec::new(),
            table_rules: vec![types::TableRules {
                id: "rules-001".to_string(),
                name: "House Rules".to_string(),
                based_on: vec!["commander".to_string()],
                unbanned: vec![types::BanEntry {
                    card_name: "Sylvan Primordial".to_string(),
                    format: "commander".to_string(),
                }],
                banned: vec![types::BanEntry {
                    card_name: "Sol Ring".to_string(),
                    format: "commander".to_string(),
                }],
                banned_keywords: vec!["Poison".to_string()],
                errata,
            }],
            last_sync: None,
        }
    }

    #[test]
    fn test_deck_state_round_trip() {
        let lib = make_library_with_deck();
        let json = serde_json::to_string(&lib).unwrap();
        let restored: CardivoreLibrary = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.decks.len(), 1);
        let deck = &restored.decks[0];
        assert_eq!(deck.id, "deck-001");
        assert_eq!(deck.name, "Test Commander");
        assert_eq!(deck.format, "commander");
        assert_eq!(deck.folder, Some("favorites".to_string()));
        assert_eq!(deck.cards.len(), 2);

        let cmd = deck.cards.iter().find(|c| c.is_commander).unwrap();
        assert_eq!(cmd.card_id, "card-atraxa");
        assert_eq!(cmd.quantity, 1);

        let mb = deck.cards.iter().find(|c| c.category == "mainboard").unwrap();
        assert_eq!(mb.card_id, "card-bolt");
        assert_eq!(mb.quantity, 4);
        assert_eq!(mb.notes.as_deref(), Some("fast removal"));

        assert_eq!(restored.last_sync, Some(1_700_000_000_000.0));
    }

    #[test]
    fn test_table_rules_export_import_round_trip() {
        let lib = make_library_with_rules();
        let json = serde_json::to_string(&lib).unwrap();

        // Simulate clearing: deserialize into a fresh library then replace table_rules.
        let mut restored: CardivoreLibrary = serde_json::from_str(&json).unwrap();
        assert_eq!(restored.table_rules.len(), 1);

        // Export the ruleset.
        let exported = serde_json::to_string(&restored.table_rules[0]).unwrap();

        // Clear, then re-import with a new id (mirrors import_table_rules logic).
        restored.table_rules.clear();
        assert!(restored.table_rules.is_empty());

        let mut reimported: types::TableRules = serde_json::from_str(&exported).unwrap();
        reimported.id = "rules-002".to_string();
        restored.table_rules.push(reimported);

        let rules = &restored.table_rules[0];
        assert_eq!(rules.id, "rules-002");
        assert_eq!(rules.name, "House Rules");
        assert_eq!(rules.based_on, vec!["commander".to_string()]);
        assert_eq!(rules.unbanned.len(), 1);
        assert_eq!(rules.unbanned[0].card_name, "Sylvan Primordial");
        assert_eq!(rules.banned.len(), 1);
        assert_eq!(rules.banned[0].card_name, "Sol Ring");
        assert_eq!(rules.banned_keywords, vec!["Poison".to_string()]);
        assert_eq!(rules.errata.get("Balance").map(String::as_str), Some("Custom oracle text"));
    }
}
