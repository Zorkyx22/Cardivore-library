use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

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
}

fn lib_err_to_js(e: LibraryError) -> JsValue {
    JsValue::from_str(&e.to_string())
}
