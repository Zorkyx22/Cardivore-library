use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, RequestMode, Response};
use serde::Deserialize;
use std::collections::HashMap;

use crate::types::Card;
use crate::error::LibraryError;

// Raw API response shapes

#[derive(Deserialize)]
struct ApiLegality {
    format: String,
    legality: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiCard {
    id: Option<String>,
    name: Option<String>,
    mana_cost: Option<String>,
    cmc: Option<f32>,
    colors: Option<Vec<String>>,
    color_identity: Option<Vec<String>>,
    #[serde(rename = "type")]
    type_line: Option<String>,
    #[serde(rename = "text")]
    oracle_text: Option<String>,
    power: Option<String>,
    toughness: Option<String>,
    loyalty: Option<String>,
    set: Option<String>,
    rarity: Option<String>,
    #[serde(rename = "imageUrl")]
    image_url: Option<String>,
    legalities: Option<Vec<ApiLegality>>,
}

#[derive(Deserialize)]
struct ApiCardsPage {
    cards: Vec<ApiCard>,
}

fn api_card_to_card(api: ApiCard) -> Option<Card> {
    let id = api.id?;
    let name = api.name?;
    let type_line = api.type_line?;
    let set_code = api.set?;
    let rarity = api.rarity?;

    let legalities: HashMap<String, String> = api
        .legalities
        .unwrap_or_default()
        .into_iter()
        .map(|l| (l.format, l.legality))
        .collect();

    Some(Card {
        id,
        name,
        mana_cost: api.mana_cost,
        cmc: api.cmc.unwrap_or(0.0),
        colors: api.colors.unwrap_or_default(),
        color_identity: api.color_identity.unwrap_or_default(),
        type_line,
        oracle_text: api.oracle_text,
        power: api.power,
        toughness: api.toughness,
        loyalty: api.loyalty,
        set_code,
        rarity,
        image_url: api.image_url,
        legalities,
    })
}

async fn fetch_page(page: u32) -> Result<(Vec<Card>, Option<u32>), LibraryError> {
    let url = format!("https://api.magicthegathering.io/v1/cards?page={}&pageSize=100", page);

    let mut opts = RequestInit::new();
    opts.method("GET");
    opts.mode(RequestMode::Cors);

    let request = Request::new_with_str_and_init(&url, &opts)
        .map_err(|e| LibraryError::InvalidInput(format!("Failed to build request: {:?}", e)))?;

    let window = web_sys::window()
        .ok_or_else(|| LibraryError::InvalidInput("No window object".to_string()))?;

    let resp_value = JsFuture::from(window.fetch_with_request(&request))
        .await
        .map_err(|e| LibraryError::InvalidInput(format!("Fetch failed: {:?}", e)))?;

    let response: Response = resp_value
        .dyn_into()
        .map_err(|_| LibraryError::InvalidInput("Response is not a Response object".to_string()))?;

    // Read X-Total-Count header to determine total cards
    let total_count: Option<u32> = if page == 1 {
        response
            .headers()
            .get("X-Total-Count")
            .ok()
            .flatten()
            .and_then(|v| v.parse::<u32>().ok())
    } else {
        None
    };

    let json_value = JsFuture::from(
        response
            .json()
            .map_err(|e| LibraryError::InvalidInput(format!("response.json() failed: {:?}", e)))?,
    )
    .await
    .map_err(|e| LibraryError::InvalidInput(format!("Awaiting JSON failed: {:?}", e)))?;

    let page_data: ApiCardsPage = serde_wasm_bindgen_or_json(json_value)?;

    let cards: Vec<Card> = page_data.cards.into_iter().filter_map(api_card_to_card).collect();

    Ok((cards, total_count))
}

/// Deserialize a JsValue into T via JSON round-trip.
fn serde_wasm_bindgen_or_json<T: for<'de> serde::Deserialize<'de>>(
    value: JsValue,
) -> Result<T, LibraryError> {
    // Serialize the JsValue to a JSON string using JSON.stringify, then parse with serde_json.
    let json_str = js_sys::JSON::stringify(&value)
        .map_err(|e| LibraryError::InvalidInput(format!("JSON.stringify failed: {:?}", e)))?
        .as_string()
        .ok_or_else(|| LibraryError::InvalidInput("JSON.stringify returned non-string".to_string()))?;

    serde_json::from_str(&json_str).map_err(LibraryError::SerdeJson)
}

pub async fn fetch_all_cards() -> Result<Vec<Card>, LibraryError> {
    let (first_page_cards, total_count) = fetch_page(1).await?;

    let total = total_count.unwrap_or(first_page_cards.len() as u32);
    let total_pages = (total + 99) / 100; // ceil division

    let mut all_cards = first_page_cards;

    for page in 2..=total_pages {
        let (cards, _) = fetch_page(page).await?;
        if cards.is_empty() {
            break;
        }
        all_cards.extend(cards);
    }

    Ok(all_cards)
}
