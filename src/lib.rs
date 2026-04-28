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
