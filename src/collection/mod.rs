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

// ── Deck import / export ──────────────────────────────────────────────────────

/// Parse a deck-list text file into a `Vec<CardInDeck>`.
///
/// Format rules:
/// - Empty lines are skipped.
/// - A line whose first character is a digit is a card line: `[N[x]] Name`.
/// - Any other non-empty line is treated as a category header.
///   Known headers: Commander, Sideboard, Mainboard / Main, Companion.
///   Unknown headers are lower-cased and used verbatim.
/// - `card_id` is set to the lower-cased card name (placeholder until a real
///   card database look-up is performed later).
pub fn parse_deck_text(
    text: &str,
) -> Result<Vec<crate::types::CardInDeck>, crate::error::LibraryError> {
    let mut cards: Vec<crate::types::CardInDeck> = Vec::new();
    let mut category = "mainboard".to_string();
    let mut is_commander_category = false;
    let mut is_companion_category = false;

    for raw_line in text.lines() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }

        // Detect card lines: start with a digit.
        if line.starts_with(|c: char| c.is_ascii_digit()) {
            // Strip optional trailing 'x' from the quantity token.
            let (qty_str, rest) = line
                .split_once(|c: char| c == ' ' || c == '\t')
                .unwrap_or((line, ""));
            let qty_clean = qty_str.trim_end_matches('x');
            let quantity: u32 = qty_clean.parse().unwrap_or(1);
            let name = rest.trim().to_string();
            if name.is_empty() {
                continue;
            }
            cards.push(crate::types::CardInDeck {
                card_id: name.to_lowercase(),
                quantity,
                category: category.clone(),
                is_commander: is_commander_category,
                is_companion: is_companion_category,
                notes: None,
            });
        } else {
            // Category header line.
            let lower = line.to_lowercase();
            match lower.as_str() {
                "commander" => {
                    category = "commander".to_string();
                    is_commander_category = true;
                    is_companion_category = false;
                }
                "sideboard" => {
                    category = "sideboard".to_string();
                    is_commander_category = false;
                    is_companion_category = false;
                }
                "mainboard" | "main" => {
                    category = "mainboard".to_string();
                    is_commander_category = false;
                    is_companion_category = false;
                }
                "companion" => {
                    category = "companion".to_string();
                    is_commander_category = false;
                    is_companion_category = true;
                }
                _ => {
                    category = lower;
                    is_commander_category = false;
                    is_companion_category = false;
                }
            }
        }
    }

    Ok(cards)
}

/// Emit a deck-list text representation from a `Deck`.
///
/// Cards are grouped by category; each group is prefixed with a capitalized
/// category header, and groups are separated by a blank line.  Card names are
/// resolved from `card_lookup`; if a card is not found the `card_id` is used
/// as the name.
pub fn emit_deck_text(
    deck: &crate::types::Deck,
    card_lookup: &std::collections::HashMap<String, crate::types::Card>,
) -> String {
    // Collect categories preserving insertion order via an ordered list of keys.
    let mut category_order: Vec<String> = Vec::new();
    let mut by_category: std::collections::HashMap<String, Vec<&crate::types::CardInDeck>> =
        std::collections::HashMap::new();

    for card in &deck.cards {
        if !by_category.contains_key(&card.category) {
            category_order.push(card.category.clone());
        }
        by_category
            .entry(card.category.clone())
            .or_default()
            .push(card);
    }

    let mut sections: Vec<String> = Vec::new();

    for cat in &category_order {
        let header = {
            let mut h = cat.clone();
            if let Some(first) = h.get_mut(0..1) {
                first.make_ascii_uppercase();
            }
            h
        };

        let mut lines = vec![header];
        for card in &by_category[cat] {
            let name = card_lookup
                .get(&card.card_id)
                .map(|c| c.name.as_str())
                .unwrap_or(&card.card_id);
            lines.push(format!("{} {}", card.quantity, name));
        }
        sections.push(lines.join("\n"));
    }

    sections.join("\n\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_deck_text_round_trip() {
        let text = include_str!("../../tests/fixtures/sample_deck.txt");
        let cards = parse_deck_text(text).unwrap();
        // Atraxa (1 entry), Lightning Bolt (1 entry with qty 3), Sol Ring (1 entry), Path to Exile (1 entry) = 4
        assert_eq!(cards.len(), 4);
        let commander = cards.iter().find(|c| c.is_commander).unwrap();
        assert_eq!(commander.card_id, "atraxa, praetor's voice");
        let bolt = cards.iter().find(|c| c.card_id == "lightning bolt").unwrap();
        assert_eq!(bolt.quantity, 3);
        let path = cards.iter().find(|c| c.category == "sideboard").unwrap();
        assert_eq!(path.quantity, 2);
    }
}
