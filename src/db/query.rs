use crate::error::LibraryError;
use crate::types::Card;

#[derive(Debug, PartialEq)]
enum Predicate {
    Name(String),
    Color(Vec<char>),
    ColorIdentity(Vec<char>),
    CmcEq(f32),
    CmcGe(f32),
    CmcLe(f32),
    CmcGt(f32),
    CmcLt(f32),
    TypeLine(String),
    OracleText(String),
    Rarity(String),
    Format(String),
    SetCode(String),
}

pub struct Query {
    predicates: Vec<Predicate>,
}

fn parse_color_chars(value: &str) -> Vec<char> {
    value.chars().collect()
}

fn color_char_to_str(c: char) -> Option<&'static str> {
    match c.to_ascii_lowercase() {
        'w' => Some("W"),
        'u' => Some("U"),
        'b' => Some("B"),
        'r' => Some("R"),
        'g' => Some("G"),
        _ => None,
    }
}

impl Query {
    pub fn parse(input: &str) -> Result<Query, LibraryError> {
        let mut predicates = Vec::new();

        for token in input.split_whitespace() {
            if let Some(colon_pos) = token.find(':') {
                let key = &token[..colon_pos];
                let value = &token[colon_pos + 1..];

                match key {
                    "name" => {
                        predicates.push(Predicate::Name(value.to_string()));
                    }
                    "c" => {
                        predicates.push(Predicate::Color(parse_color_chars(value)));
                    }
                    "ci" => {
                        predicates.push(Predicate::ColorIdentity(parse_color_chars(value)));
                    }
                    "cmc" => {
                        // value is something like "=4", ">=3", "<=5", ">2", "<6"
                        let pred = if let Some(rest) = value.strip_prefix(">=") {
                            let n: f32 = rest.parse().map_err(|_| {
                                LibraryError::InvalidInput(format!(
                                    "Invalid cmc value: {}",
                                    value
                                ))
                            })?;
                            Predicate::CmcGe(n)
                        } else if let Some(rest) = value.strip_prefix("<=") {
                            let n: f32 = rest.parse().map_err(|_| {
                                LibraryError::InvalidInput(format!(
                                    "Invalid cmc value: {}",
                                    value
                                ))
                            })?;
                            Predicate::CmcLe(n)
                        } else if let Some(rest) = value.strip_prefix('>') {
                            let n: f32 = rest.parse().map_err(|_| {
                                LibraryError::InvalidInput(format!(
                                    "Invalid cmc value: {}",
                                    value
                                ))
                            })?;
                            Predicate::CmcGt(n)
                        } else if let Some(rest) = value.strip_prefix('<') {
                            let n: f32 = rest.parse().map_err(|_| {
                                LibraryError::InvalidInput(format!(
                                    "Invalid cmc value: {}",
                                    value
                                ))
                            })?;
                            Predicate::CmcLt(n)
                        } else if let Some(rest) = value.strip_prefix('=') {
                            let n: f32 = rest.parse().map_err(|_| {
                                LibraryError::InvalidInput(format!(
                                    "Invalid cmc value: {}",
                                    value
                                ))
                            })?;
                            Predicate::CmcEq(n)
                        } else {
                            // bare number treated as equals
                            let n: f32 = value.parse().map_err(|_| {
                                LibraryError::InvalidInput(format!(
                                    "Invalid cmc value: {}",
                                    value
                                ))
                            })?;
                            Predicate::CmcEq(n)
                        };
                        predicates.push(pred);
                    }
                    "t" => {
                        predicates.push(Predicate::TypeLine(value.to_string()));
                    }
                    "o" => {
                        predicates.push(Predicate::OracleText(value.to_string()));
                    }
                    "r" => {
                        predicates.push(Predicate::Rarity(value.to_string()));
                    }
                    "f" => {
                        predicates.push(Predicate::Format(value.to_string()));
                    }
                    "set" => {
                        predicates.push(Predicate::SetCode(value.to_string()));
                    }
                    unknown => {
                        return Err(LibraryError::InvalidInput(format!(
                            "Unknown query key: {}",
                            unknown
                        )));
                    }
                }
            } else {
                // Bare token treated as name predicate
                predicates.push(Predicate::Name(token.to_string()));
            }
        }

        Ok(Query { predicates })
    }

    pub fn matches(&self, card: &Card) -> bool {
        self.predicates.iter().all(|pred| match pred {
            Predicate::Name(name) => card
                .name
                .to_lowercase()
                .contains(&name.to_lowercase()),

            Predicate::Color(chars) => chars.iter().all(|&c| {
                color_char_to_str(c)
                    .map(|s| card.colors.iter().any(|col| col == s))
                    .unwrap_or(false)
            }),

            Predicate::ColorIdentity(chars) => chars.iter().all(|&c| {
                color_char_to_str(c)
                    .map(|s| card.color_identity.iter().any(|ci| ci == s))
                    .unwrap_or(false)
            }),

            Predicate::CmcEq(n) => (card.cmc - n).abs() < f32::EPSILON,
            Predicate::CmcGe(n) => card.cmc >= *n,
            Predicate::CmcLe(n) => card.cmc <= *n,
            Predicate::CmcGt(n) => card.cmc > *n,
            Predicate::CmcLt(n) => card.cmc < *n,

            Predicate::TypeLine(t) => card
                .type_line
                .to_lowercase()
                .contains(&t.to_lowercase()),

            Predicate::OracleText(o) => card
                .oracle_text
                .as_deref()
                .unwrap_or("")
                .to_lowercase()
                .contains(&o.to_lowercase()),

            Predicate::Rarity(r) => {
                card.rarity.to_lowercase() == r.to_lowercase()
            }

            Predicate::Format(fmt) => card
                .legalities
                .get(fmt.as_str())
                .map(|v| {
                    let lower = v.to_lowercase();
                    lower == "legal"
                })
                .unwrap_or(false),

            Predicate::SetCode(s) => {
                card.set_code.to_lowercase() == s.to_lowercase()
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn make_card() -> Card {
        let mut legalities = HashMap::new();
        legalities.insert("Standard".to_string(), "Legal".to_string());
        legalities.insert("Modern".to_string(), "Banned".to_string());

        Card {
            id: "test-id".to_string(),
            name: "Lightning Bolt".to_string(),
            mana_cost: Some("{R}".to_string()),
            cmc: 1.0,
            colors: vec!["R".to_string()],
            color_identity: vec!["R".to_string()],
            type_line: "Instant".to_string(),
            oracle_text: Some("Lightning Bolt deals 3 damage to any target.".to_string()),
            power: None,
            toughness: None,
            loyalty: None,
            set_code: "M10".to_string(),
            rarity: "Common".to_string(),
            image_url: None,
            legalities,
        }
    }

    #[test]
    fn test_parse_empty() {
        let q = Query::parse("").unwrap();
        assert!(q.predicates.is_empty());
    }

    #[test]
    fn test_bare_name_predicate() {
        let q = Query::parse("Lightning").unwrap();
        assert_eq!(q.predicates.len(), 1);
        assert!(matches!(&q.predicates[0], Predicate::Name(n) if n == "Lightning"));
    }

    #[test]
    fn test_name_key_predicate() {
        let q = Query::parse("name:bolt").unwrap();
        assert!(matches!(&q.predicates[0], Predicate::Name(n) if n == "bolt"));
    }

    #[test]
    fn test_name_match() {
        let card = make_card();
        let q = Query::parse("lightning").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_name_no_match() {
        let card = make_card();
        let q = Query::parse("counterspell").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_color_match() {
        let card = make_card();
        let q = Query::parse("c:r").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_color_no_match() {
        let card = make_card();
        let q = Query::parse("c:u").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_color_identity_match() {
        let card = make_card();
        let q = Query::parse("ci:r").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_color_identity_no_match() {
        let card = make_card();
        let q = Query::parse("ci:g").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_cmc_eq_match() {
        let card = make_card();
        let q = Query::parse("cmc:=1").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_cmc_eq_no_match() {
        let card = make_card();
        let q = Query::parse("cmc:=3").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_cmc_bare_number() {
        let card = make_card();
        let q = Query::parse("cmc:1").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_cmc_ge_match() {
        let card = make_card();
        let q = Query::parse("cmc:>=1").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_cmc_ge_no_match() {
        let card = make_card();
        let q = Query::parse("cmc:>=2").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_cmc_le_match() {
        let card = make_card();
        let q = Query::parse("cmc:<=1").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_cmc_le_no_match() {
        let card = make_card();
        let q = Query::parse("cmc:<=0").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_cmc_gt_match() {
        let card = make_card();
        let q = Query::parse("cmc:>0").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_cmc_gt_no_match() {
        let card = make_card();
        let q = Query::parse("cmc:>1").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_cmc_lt_match() {
        let card = make_card();
        let q = Query::parse("cmc:<2").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_cmc_lt_no_match() {
        let card = make_card();
        let q = Query::parse("cmc:<1").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_type_line_match() {
        let card = make_card();
        let q = Query::parse("t:instant").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_type_line_no_match() {
        let card = make_card();
        let q = Query::parse("t:creature").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_oracle_text_match() {
        let card = make_card();
        let q = Query::parse("o:damage").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_oracle_text_no_match() {
        let card = make_card();
        let q = Query::parse("o:counter").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_rarity_match() {
        let card = make_card();
        let q = Query::parse("r:common").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_rarity_no_match() {
        let card = make_card();
        let q = Query::parse("r:rare").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_format_legal_match() {
        let card = make_card();
        let q = Query::parse("f:Standard").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_format_banned_no_match() {
        let card = make_card();
        let q = Query::parse("f:Modern").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_format_missing_no_match() {
        let card = make_card();
        let q = Query::parse("f:Legacy").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_set_code_match() {
        let card = make_card();
        let q = Query::parse("set:m10").unwrap();
        assert!(q.matches(&card));
    }

    #[test]
    fn test_set_code_no_match() {
        let card = make_card();
        let q = Query::parse("set:lea").unwrap();
        assert!(!q.matches(&card));
    }

    #[test]
    fn test_unknown_key_error() {
        let result = Query::parse("xyz:value");
        assert!(result.is_err());
    }

    // ── Malformed-input fuzz cases (must return Err, never panic) ─────────────

    #[test]
    fn fuzz_cmc_no_value() {
        assert!(Query::parse("cmc:").is_err());
    }

    #[test]
    fn fuzz_cmc_eq_no_number() {
        assert!(Query::parse("cmc:=").is_err());
    }

    #[test]
    fn fuzz_cmc_ge_no_number() {
        assert!(Query::parse("cmc:>=").is_err());
    }

    #[test]
    fn fuzz_cmc_le_no_number() {
        assert!(Query::parse("cmc:<=").is_err());
    }

    #[test]
    fn fuzz_cmc_gt_no_number() {
        assert!(Query::parse("cmc:>").is_err());
    }

    #[test]
    fn fuzz_cmc_lt_no_number() {
        assert!(Query::parse("cmc:<").is_err());
    }

    #[test]
    fn fuzz_cmc_non_numeric() {
        assert!(Query::parse("cmc:abc").is_err());
    }

    #[test]
    fn fuzz_cmc_ge_non_numeric() {
        assert!(Query::parse("cmc:>=xyz").is_err());
    }

    #[test]
    fn fuzz_empty_key() {
        // ":::value" has key "" which is unknown
        assert!(Query::parse(":value").is_err());
    }

    #[test]
    fn fuzz_triple_colon() {
        assert!(Query::parse(":::").is_err());
    }

    #[test]
    fn fuzz_unknown_key_long() {
        assert!(Query::parse("notakey:dragon").is_err());
    }

    #[test]
    fn fuzz_unicode_key() {
        assert!(Query::parse("naïve:dragon").is_err());
    }

    #[test]
    fn test_multiple_predicates_and_logic() {
        let card = make_card();
        // Both predicates must match
        let q = Query::parse("lightning r:common").unwrap();
        assert!(q.matches(&card));

        // One predicate fails
        let q2 = Query::parse("lightning r:rare").unwrap();
        assert!(!q2.matches(&card));
    }
}
