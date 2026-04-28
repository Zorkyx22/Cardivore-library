use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, RequestMode, Response};

use crate::error::LibraryError;
use crate::types::{Card, CardPrice};

pub async fn fetch_price(card: &Card, vendor: &str) -> Result<CardPrice, LibraryError> {
    match vendor {
        "scryfall" => fetch_scryfall_price(card).await,
        _ => Err(LibraryError::InvalidInput("unknown vendor".into())),
    }
}

async fn fetch_scryfall_price(card: &Card) -> Result<CardPrice, LibraryError> {
    // Percent-encode the card name for use in the URL query string.
    let encoded_name = js_sys::encode_uri_component(&card.name)
        .as_string()
        .ok_or_else(|| LibraryError::InvalidInput("Failed to encode card name".to_string()))?;

    let url = format!(
        "https://api.scryfall.com/cards/named?exact={}",
        encoded_name
    );

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

    let json_value = JsFuture::from(
        response
            .json()
            .map_err(|e| LibraryError::InvalidInput(format!("response.json() failed: {:?}", e)))?,
    )
    .await
    .map_err(|e| LibraryError::InvalidInput(format!("Awaiting JSON failed: {:?}", e)))?;

    // Serialize the JsValue to a JSON string, then parse with serde_json.
    let json_str = js_sys::JSON::stringify(&json_value)
        .map_err(|e| LibraryError::InvalidInput(format!("JSON.stringify failed: {:?}", e)))?
        .as_string()
        .ok_or_else(|| {
            LibraryError::InvalidInput("JSON.stringify returned non-string".to_string())
        })?;

    let parsed: serde_json::Value =
        serde_json::from_str(&json_str).map_err(LibraryError::SerdeJson)?;

    let prices = parsed
        .get("prices")
        .ok_or_else(|| LibraryError::InvalidInput("No 'prices' field in response".to_string()))?;

    let normal = prices
        .get("usd")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<f64>().ok());

    let foil = prices
        .get("usd_foil")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<f64>().ok());

    Ok(CardPrice {
        card_id: card.id.clone(),
        vendor: "scryfall".to_string(),
        currency: "USD".to_string(),
        normal,
        foil,
        url: None,
        fetched_at: js_sys::Date::now(),
    })
}
