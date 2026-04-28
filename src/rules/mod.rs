use crate::collection::next_id;
use crate::error::LibraryError;
use crate::types::{BanEntry, TableRules};

pub fn create_table_rules(
    table_rules: &mut Vec<TableRules>,
    name: &str,
    based_on: Vec<String>,
) -> String {
    let id = next_id("rules");
    table_rules.push(TableRules {
        id: id.clone(),
        name: name.to_string(),
        based_on,
        unbanned: Vec::new(),
        banned: Vec::new(),
        banned_keywords: Vec::new(),
        errata: std::collections::HashMap::new(),
    });
    id
}

pub fn delete_table_rules(
    table_rules: &mut Vec<TableRules>,
    id: &str,
) -> Result<(), LibraryError> {
    let pos = table_rules
        .iter()
        .position(|r| r.id == id)
        .ok_or_else(|| LibraryError::NotFound(id.to_string()))?;
    table_rules.remove(pos);
    Ok(())
}

pub fn add_ban(
    table_rules: &mut [TableRules],
    rules_id: &str,
    card_name: &str,
    format: &str,
) -> Result<(), LibraryError> {
    let ruleset = table_rules
        .iter_mut()
        .find(|r| r.id == rules_id)
        .ok_or_else(|| LibraryError::NotFound(rules_id.to_string()))?;
    let entry = BanEntry {
        card_name: card_name.to_string(),
        format: format.to_string(),
    };
    ruleset.banned.push(entry);
    Ok(())
}

pub fn add_unban(
    table_rules: &mut [TableRules],
    rules_id: &str,
    card_name: &str,
    format: &str,
) -> Result<(), LibraryError> {
    let ruleset = table_rules
        .iter_mut()
        .find(|r| r.id == rules_id)
        .ok_or_else(|| LibraryError::NotFound(rules_id.to_string()))?;
    let entry = BanEntry {
        card_name: card_name.to_string(),
        format: format.to_string(),
    };
    ruleset.unbanned.push(entry);
    Ok(())
}

pub fn add_banned_keyword(
    table_rules: &mut [TableRules],
    rules_id: &str,
    keyword: &str,
) -> Result<(), LibraryError> {
    let ruleset = table_rules
        .iter_mut()
        .find(|r| r.id == rules_id)
        .ok_or_else(|| LibraryError::NotFound(rules_id.to_string()))?;
    ruleset.banned_keywords.push(keyword.to_string());
    Ok(())
}

pub fn set_errata(
    table_rules: &mut [TableRules],
    rules_id: &str,
    card_name: &str,
    oracle_override: &str,
) -> Result<(), LibraryError> {
    let ruleset = table_rules
        .iter_mut()
        .find(|r| r.id == rules_id)
        .ok_or_else(|| LibraryError::NotFound(rules_id.to_string()))?;
    ruleset
        .errata
        .insert(card_name.to_string(), oracle_override.to_string());
    Ok(())
}
