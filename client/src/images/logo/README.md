# MetriCore Logo — Final (original design + real Space Grotesk)

Original icon design (M from rising bars + peak cap), wordmark now set in
your actual website font, Space Grotesk Bold. Navy #011626 · amber #ffb100.

## Icon files (square) — favicon, manifest, mobile
| File                 | Size     | Goes in                                    |
|----------------------|----------|--------------------------------------------|
| favicon.ico          | 16/32/48 | client/public/favicon.ico                  |
| logo192.png          | 192      | client/public/logo192.png (manifest+apple) |
| logo512.png          | 512      | client/public/logo512.png (manifest)       |
| apple-touch-icon.png | 180      | client/public/apple-touch-icon.png         |
| icon-256.png         | 256      | general / dashboard use                    |
| favicon-16/32/48.png | 16/32/48 | optional explicit sizes                    |
| metricore-icon.svg   | vector   | source — use in React header (scales sharp)|

## Full logo (icon + MetriCore wordmark)
| File                          | Use                              |
|-------------------------------|----------------------------------|
| metricore-logo-full.svg/.png  | DARK backgrounds (your navy site)|
| metricore-logo-light.svg/.png | LIGHT backgrounds (white pages)  |

The SVGs reference font-family "Space Grotesk". They render correctly where
that font is available (your site loads it). For a standalone SVG that renders
in Space Grotesk ANYWHERE (even without the font installed), the text can be
converted to outlines/paths in a vector editor — ask if you want that version.

## Wire-up
1. Copy favicon.ico, logo192.png, logo512.png, apple-touch-icon.png into client/public/
2. index.html already references favicon + apple-touch-icon
3. manifest.json already references logo192 / logo512
4. Header: use metricore-icon.svg + real <span> text styled with your Space Grotesk CSS
