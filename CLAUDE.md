# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`cardivore-library` is a Rust library that compiles to WebAssembly (WASM) for use in React Native or web applications. It is intended to be a backend logic layer for an MTG (Magic: The Gathering) deckbuilding and card searching tool. The library currently exists as early scaffolding — nearly all planned features are not yet implemented.

The library wraps its public API with `wasm-bindgen` so it can be called from JavaScript/TypeScript. The primary build artifact is a WASM package produced by `wasm-pack`.

## Commands

```bash
# Build the Rust library
cargo build

# Build the WASM package (output goes to pkg/)
wasm-pack build

# Run all tests
cargo test

# Run a single test by name
cargo test <test_name>

# Format code
cargo fmt

# Lint
cargo clippy
```

### Nix Dev Environment

The repo ships a Nix flake that pins the exact Rust toolchain (1.75.0 with rustfmt). Enter it with:

```bash
nix develop
```

The toolchain version is also declared in `rust-toolchain.toml`, so `rustup` will select it automatically outside of Nix.

## Architecture

`src/lib.rs` is the single entry point for all public API. Because this compiles to WASM, public functions exposed to JavaScript must be annotated with `#[wasm_bindgen]`.

Planned feature areas (all unimplemented, per `README.md` task list):
- **Database sync** — periodic local MTG card/ban/ruleset database updates
- **Card search** — querying the local database using MTG standard query syntax
- **Favorites & decks** — CRUD APIs for favorites lists and deck lists
- **Deck metadata** — per-card properties (Commander, Companion, quantity, notes) and per-deck properties (categories, ruleset, ban status, folders)
- **Table Rules** — custom format rulesets (unbans, bans, errata, keyword bans) with import/export
- **Deck import/export** — multiple deck list formats, category support (Main Board, Side Board, Commander, custom)
- **Card pricing** — querying external card vendor APIs

External data source: [magicthegathering.io API](https://docs.magicthegathering.io/) via the [mtg-sdk-rust](https://github.com/MagicTheGathering/mtg-sdk-rust) crate (not yet added as a dependency).

## Project Plan

`PROJECT_PLAN.md` contains a phase-by-phase implementation plan written for AI coding agents. It specifies exact function signatures, data shapes, module layout, and acceptance criteria for every planned feature. Read it before starting any implementation work.

## Key Dependencies

| Crate | Purpose |
|---|---|
| `wasm-bindgen` | Generates JS bindings for exported Rust functions |
| `wasm-pack` | Builds and packages the WASM output for npm/bundler consumption |
