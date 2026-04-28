use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Card {
    pub id: String,
    pub name: String,
    pub mana_cost: Option<String>,
    pub cmc: f32,
    pub colors: Vec<String>,
    pub color_identity: Vec<String>,
    pub type_line: String,
    pub oracle_text: Option<String>,
    pub power: Option<String>,
    pub toughness: Option<String>,
    pub loyalty: Option<String>,
    pub set_code: String,
    pub rarity: String,
    pub image_url: Option<String>,
    pub legalities: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CardInDeck {
    pub card_id: String,
    pub quantity: u32,
    pub category: String,
    pub is_commander: bool,
    pub is_companion: bool,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Deck {
    pub id: String,
    pub name: String,
    pub format: String,
    pub folder: Option<String>,
    pub ruleset_id: Option<String>,
    pub cards: Vec<CardInDeck>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FavoritesList {
    pub id: String,
    pub name: String,
    pub card_ids: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BanEntry {
    pub card_name: String,
    pub format: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TableRules {
    pub id: String,
    pub name: String,
    pub based_on: Vec<String>,
    pub unbanned: Vec<BanEntry>,
    pub banned: Vec<BanEntry>,
    pub banned_keywords: Vec<String>,
    pub errata: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CardPrice {
    pub card_id: String,
    pub vendor: String,
    pub currency: String,
    pub normal: Option<f64>,
    pub foil: Option<f64>,
    pub url: Option<String>,
    pub fetched_at: f64,
}
