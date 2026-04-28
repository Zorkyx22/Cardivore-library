{
  description = "Cardivore — MTG WASM library and cross-platform app";

  inputs = {
    nixpkgs.url     = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };

        # ── Rust toolchain ──────────────────────────────────────────────────
        # Read the channel/version from rust-toolchain.toml, then add the
        # extras the project needs: wasm32 target, clippy, rust-src.
        rustToolchain = (pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml).override {
          extensions = [ "rustfmt" "clippy" "rust-src" ];
          targets    = [ "wasm32-unknown-unknown" ];
        };

        # makeRustPlatform lets buildRustPackage use *our* pinned toolchain
        # instead of nixpkgs' default Rust.
        rustPlatform = pkgs.makeRustPlatform {
          cargo = rustToolchain;
          rustc = rustToolchain;
        };

        # ── wasm-bindgen-cli pinned to match Cargo.lock ────────────────────
        # wasm-bindgen-cli MUST be the same version as the wasm-bindgen crate
        # in Cargo.lock (currently 0.2.120). If you update wasm-bindgen in
        # Cargo.toml, bump the version here and update both hashes by running:
        #
        #   nix build .#wasm  (first run will print the correct hashes)
        #
        wasmBindgenCli = pkgs.wasm-bindgen-cli.override {
          version = "0.2.120";
          # Replace these two placeholders the first time you run `nix build .#wasm`.
          # Nix will fail and print: "got: sha256-<actual>". Paste it in.
          hash      = pkgs.lib.fakeHash;
          cargoHash = pkgs.lib.fakeHash;
        };

        # ── Package: WASM library ──────────────────────────────────────────
        # Compiles cardivore-library to wasm32, then runs wasm-bindgen to
        # produce the JS+WASM package that the React app imports.
        #
        # Uses cargoLock.lockFile so Nix derives per-crate fetchers from
        # Cargo.lock automatically — no cargoHash required.
        wasmPkg = rustPlatform.buildRustPackage {
          pname   = "cardivore-wasm";
          version = "0.1.0";
          src     = ./.;

          cargoLock.lockFile = ./Cargo.lock;

          nativeBuildInputs = [ wasmBindgenCli ];

          buildPhase = ''
            cargo build \
              --target wasm32-unknown-unknown \
              --release \
              --locked
          '';

          installPhase = ''
            mkdir -p "$out"
            wasm-bindgen \
              target/wasm32-unknown-unknown/release/cardivore_library.wasm \
              --target web \
              --out-dir "$out"
          '';

          # Tests are native; skip them for the cross-compile derivation.
          doCheck = false;
        };

        # ── Package: web app ───────────────────────────────────────────────
        # Builds the Vite/React frontend inside cardivore-app/.
        # `buildNpmPackage` vendors npm deps from package-lock.json, so no
        # network access is needed at build time.
        #
        # FIRST RUN: `nix build .#app` will fail and print the correct
        # npmDepsHash. Replace the placeholder below with that value.
        webApp = pkgs.buildNpmPackage {
          pname   = "cardivore-app";
          version = "0.0.0";
          src     = ./cardivore-app;

          # Replace with the hash printed on first `nix build .#app` run.
          npmDepsHash = pkgs.lib.fakeHash;

          # Disable the default `npm test` step (no test suite in the app).
          npmPackFlags = [ "--ignore-scripts" ];

          preBuild = ''
            # Copy the WASM output into the location Vite expects.
            cp -r ${wasmPkg} src/wasm/pkg
          '';

          buildPhase = ''
            npm run build
          '';

          installPhase = ''
            cp -r dist "$out"
          '';
        };

        # ── Package: native Rust library (for IDE / cargo use) ────────────
        nativeLib = rustPlatform.buildRustPackage {
          pname   = "cardivore-library";
          version = "0.1.0";
          src     = ./.;

          cargoLock.lockFile = ./Cargo.lock;

          # Build as rlib only (skip cdylib for a native build).
          buildPhase = ''
            cargo build --release --locked --lib
          '';

          installPhase = ''
            mkdir -p "$out/lib"
            cp target/release/libcardivore_library.rlib "$out/lib/" 2>/dev/null || true
          '';

          doCheck = false;
        };

      in
      {
        # ── Exposed packages ───────────────────────────────────────────────
        # nix build .          → full web app (dist/)
        # nix build .#wasm     → WASM package (JS + .wasm)
        # nix build .#app      → full web app
        # nix build .#lib      → native Rust rlib (for tooling)
        packages = {
          default = webApp;
          app     = webApp;
          wasm    = wasmPkg;
          lib     = nativeLib;
        };

        # ── Checks ─────────────────────────────────────────────────────────
        # nix flake check  → runs cargo test
        checks = {
          tests = rustPlatform.buildRustPackage {
            pname   = "cardivore-tests";
            version = "0.1.0";
            src     = ./.;

            cargoLock.lockFile = ./Cargo.lock;

            # Only the rlib target is needed to run tests.
            buildPhase   = "cargo test --release --locked";
            installPhase = "mkdir \"$out\"";
          };
        };

        # ── Dev shell ──────────────────────────────────────────────────────
        # nix develop  → drops you into a shell with everything ready
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = [
            # Rust: pinned toolchain + wasm32 target + clippy
            rustToolchain

            # WASM tooling (wasm-pack downloads the matching wasm-bindgen-cli
            # on first use when running interactively; fine in a dev shell
            # since the network is available).
            pkgs.wasm-pack

            # Node.js 22 LTS + npm (for the React/Vite app)
            pkgs.nodejs_22

            # Useful extras
            pkgs.cargo-watch   # `cargo watch -x test` for TDD
          ];

          # Expose rust-src so rust-analyzer works in editors.
          RUST_SRC_PATH = "${rustToolchain}/lib/rustlib/src/rust/library";

          shellHook = ''
            echo ""
            echo "  Cardivore dev environment"
            echo ""
            echo "  Rust library (repo root):"
            echo "    cargo build                         native build"
            echo "    cargo test                          run tests"
            echo "    cargo clippy                        lint"
            echo "    cargo fmt                           format"
            echo "    wasm-pack build --target web \\"
            echo "      --out-dir cardivore-app/src/wasm/pkg"
            echo "                                        WASM build"
            echo ""
            echo "  React app (cd cardivore-app):"
            echo "    npm install                         install deps"
            echo "    npm run dev                         dev server"
            echo "    npm run build                       production build"
            echo "    npm run build:full                  WASM + web"
            echo ""
            echo "  Nix builds:"
            echo "    nix build .#wasm                    build WASM pkg"
            echo "    nix build .#app                     build web app"
            echo "    nix flake check                     run cargo tests"
            echo ""
          '';
        };
      }
    );
}
