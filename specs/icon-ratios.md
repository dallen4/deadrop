# Icon ratios — diagnosis & plan

Deferred behind the Linux setup work. Recording the measurements so they don't
have to be re-derived.

## Measured state

Every icon in the repo is **100% full-bleed with 0% transparent margin** —
`desktop/src-tauri/icons/*`, `web/public/icons/*`, and
`vscode-extension/media/icon.png` are all the same artwork edge to edge.

- Tile: `#1a1b1e` rounded square (matches `manifest.json` `background_color`)
- Glyph: `#1971c2` (matches `theme_color`)
- Corners: transparent, so the tile shape is baked into the asset
- Clean vector source exists: `web/public/icons/handshake-transparent.svg`,
  512 viewBox (also `desktop/public/handshake.svg`)

## Two defects

**1. macOS icon renders oversized in the Dock.** Apple's convention insets a
rounded-rect app icon to roughly 824/1024 (~80%) of the canvas, reserving the
remaining margin for shadow. Ours fills 100%, so deadrop sits visibly larger
than native neighbours. Confirmed by the user against their own Dock.

**2. Android maskable icons get clipped.** `web/public/manifest.json` declares
`"purpose": "any maskable"` on a single asset. Those requirements contradict:
`any` means "render exactly as authored, corners included"; `maskable` means
"I am full-bleed background, crop me to the platform's shape". Android crops
maskable icons to a safe zone (the inner 80% circle), so our rounded square
loses its corners and is then composited inside *another* rounded shape. The
user's report — "the handshake goes all the way to the edge" — is this.

## Plan

1. **macOS**: regenerate from a 1024 source with the tile at ~824 and
   transparent margin. `tauri icon` (CLI 2.11.4 is available) regenerates
   `.icns`/`.ico`/PNG set from one source.
2. **Maskable**: a *separate* asset — background filling the full square with
   no corners of our own, glyph confined to the safe zone. The guaranteed
   region is a centred circle of 80% diameter, so a square glyph inscribed in
   it is ~56% of canvas. Target the glyph at ~55%.
3. **Manifest**: split into distinct `"purpose": "any"` and
   `"purpose": "maskable"` entries rather than one asset claiming both.
4. Leave the `any` web icons full-bleed — correct for favicons and tabs.

Rasterise from the SVG via Playwright (already a `tests/` devDependency)
rather than rescaling PNGs, so every size stays crisp.

## Review before overwriting

These are brand assets across web, desktop, and the extension. Generate to a
scratch directory and get a visual sign-off before replacing anything.
