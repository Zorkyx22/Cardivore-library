use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

pub mod db;
pub mod collection;
pub mod error;
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
}

fn lib_err_to_js(e: LibraryError) -> JsValue {
    JsValue::from_str(&e.to_string())
}
