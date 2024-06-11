# Cardivore-library
My own custom MTG deckbulding and card searching tool.

## Sources
[https://docs.magicthegathering.io/](https://docs.magicthegathering.io/)
[https://github.com/MagicTheGathering/mtg-sdk-rust](https://github.com/MagicTheGathering/mtg-sdk-rust)
[https://medium.com/@orfeas_erevos/integrating-rust-into-react-native-a-comprehensive-guide-df4daa6fc0c8](https://medium.com/@orfeas_erevos/integrating-rust-into-react-native-a-comprehensive-guide-df4daa6fc0c8)
[https://www.tkat0.dev/posts/how-to-create-a-react-app-with-rust-and-wasm/](https://www.tkat0.dev/posts/how-to-create-a-react-app-with-rust-and-wasm/)
[https://github.com/xonoxitron/rust2wasm2react-native](https://github.com/xonoxitron/rust2wasm2react-native)
[https://developer.mozilla.org/en-US/docs/WebAssembly/Rust_to_wasm](https://developer.mozilla.org/en-US/docs/WebAssembly/Rust_to_wasm)

## Tasks

| Status | Task | Description |
|--------|------|-------------|
| [ ] | Let the library update the MTG database | Every week or so, the local MTG database should be updated.  (Cardlists, Banlists, Rulesets, etc) |
| [ ] | Let the library query the local MTG database according to user criterion | Use the MTG standard for querying the local database and send back results that match the search criterion |
| [ ] | Let the library save cards to favorites lists | Create API commands to the library that lets users create, add to, remove from, add delete favorite lists |
| [ ] | Let the library save cards to decks | Create API commands to the library that lets users create, add to, remove from, add delete deck lists |
| [ ] | Let the library set metadata with cards in decks | Create API commands to the library that lets users set properties to cards in decks: (Commanderm, Companion, Quantity, Notes, etc) |
| [ ] | Let the library set advanced metadata associated with decks and cards in them | Create API commands to the library that lets users set properties to decks and cards in them: (Card Categories, Ruleset, Contains Bans, Deck Folders) | 
| [ ] | Let the library save "Table Rules" | Create API commands to the library that lets users create sets of "Table Rules" (Table Name, Based on which formats, Unbanned cards, Banned cards ,Banned keywords, Errata cards, etc) | 
| [ ] | Let the library export and import "Table Rules" | Create API commands to the library that lets users import and export "Table Rules" so that players can share the ruleset of their tables with their friends |
| [ ] | Let the library export and import deck lists | Create API commands to the library that lets users import and export deck lists so that players can share the ruleset of their tables with their friend (Support multiple formats (1x, 1, none, etc), Support Categories (Main Board, Side Board, Commander, Custom Category: XXX) |
| [ ] | Let the library query popular Card Vendors for card price | Let the library query popular Card Vendors for card price |
