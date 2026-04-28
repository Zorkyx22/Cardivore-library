use std::sync::atomic::{AtomicU32, Ordering};

use crate::error::LibraryError;
use crate::types::{CardInDeck, Deck, FavoritesList};

static COUNTER: AtomicU32 = AtomicU32::new(0);

pub fn next_id(prefix: &str) -> String {
    let count = COUNTER.fetch_add(1, Ordering::SeqCst);
    let ts = js_sys::Date::now() as u64;
    format!("{}-{}-{}", prefix, ts, count)
}

// ── Favorites ────────────────────────────────────────────────────────────────

pub fn create_favorites_list(favorites: &mut Vec<FavoritesList>, name: &str) -> String {
    let id = next_id("fav");
    favorites.push(FavoritesList {
        id: id.clone(),
        name: name.to_string(),
        card_ids: Vec::new(),
    });
    id
}

pub fn delete_favorites_list(
    favorites: &mut Vec<FavoritesList>,
    id: &str,
) -> Result<(), LibraryError> {
    let pos = favorites
        .iter()
        .position(|f| f.id == id)
        .ok_or_else(|| LibraryError::NotFound(id.to_string()))?;
    favorites.remove(pos);
    Ok(())
}

pub fn add_to_favorites(
    favorites: &mut [FavoritesList],
    list_id: &str,
    card_id: &str,
) -> Result<(), LibraryError> {
    let list = favorites
        .iter_mut()
        .find(|f| f.id == list_id)
        .ok_or_else(|| LibraryError::NotFound(list_id.to_string()))?;
    if !list.card_ids.contains(&card_id.to_string()) {
        list.card_ids.push(card_id.to_string());
    }
    Ok(())
}

pub fn remove_from_favorites(
    favorites: &mut [FavoritesList],
    list_id: &str,
    card_id: &str,
) -> Result<(), LibraryError> {
    let list = favorites
        .iter_mut()
        .find(|f| f.id == list_id)
        .ok_or_else(|| LibraryError::NotFound(list_id.to_string()))?;
    let pos = list
        .card_ids
        .iter()
        .position(|c| c == card_id)
        .ok_or_else(|| LibraryError::NotFound(card_id.to_string()))?;
    list.card_ids.remove(pos);
    Ok(())
}

// ── Decks ─────────────────────────────────────────────────────────────────────

pub fn create_deck(decks: &mut Vec<Deck>, name: &str, format: &str) -> String {
    let id = next_id("deck");
    decks.push(Deck {
        id: id.clone(),
        name: name.to_string(),
        format: format.to_string(),
        folder: None,
        ruleset_id: None,
        cards: Vec::new(),
    });
    id
}

pub fn delete_deck(decks: &mut Vec<Deck>, id: &str) -> Result<(), LibraryError> {
    let pos = decks
        .iter()
        .position(|d| d.id == id)
        .ok_or_else(|| LibraryError::NotFound(id.to_string()))?;
    decks.remove(pos);
    Ok(())
}

pub fn add_card_to_deck(
    decks: &mut [Deck],
    deck_id: &str,
    card_in_deck: CardInDeck,
) -> Result<(), LibraryError> {
    let deck = decks
        .iter_mut()
        .find(|d| d.id == deck_id)
        .ok_or_else(|| LibraryError::NotFound(deck_id.to_string()))?;

    // If the same card+category already exists, update quantity instead of duplicating.
    if let Some(existing) = deck
        .cards
        .iter_mut()
        .find(|c| c.card_id == card_in_deck.card_id && c.category == card_in_deck.category)
    {
        existing.quantity += card_in_deck.quantity;
    } else {
        deck.cards.push(card_in_deck);
    }
    Ok(())
}

pub fn remove_card_from_deck(
    decks: &mut [Deck],
    deck_id: &str,
    card_id: &str,
    category: &str,
) -> Result<(), LibraryError> {
    let deck = decks
        .iter_mut()
        .find(|d| d.id == deck_id)
        .ok_or_else(|| LibraryError::NotFound(deck_id.to_string()))?;

    let pos = deck
        .cards
        .iter()
        .position(|c| c.card_id == card_id && c.category == category)
        .ok_or_else(|| LibraryError::NotFound(format!("{}@{}", card_id, category)))?;

    deck.cards.remove(pos);
    Ok(())
}

pub fn update_card_in_deck(
    decks: &mut [Deck],
    deck_id: &str,
    updated: CardInDeck,
) -> Result<(), LibraryError> {
    let deck = decks
        .iter_mut()
        .find(|d| d.id == deck_id)
        .ok_or_else(|| LibraryError::NotFound(deck_id.to_string()))?;

    let entry = deck
        .cards
        .iter_mut()
        .find(|c| c.card_id == updated.card_id && c.category == updated.category)
        .ok_or_else(|| {
            LibraryError::NotFound(format!("{}@{}", updated.card_id, updated.category))
        })?;

    *entry = updated;
    Ok(())
}
