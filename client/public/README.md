# MetriCore Logo Files

Brand: navy #011626 · amber #ffb100 · Space Grotesk feel
Concept: an "M" built from rising bars + a peak — reads as the letter
AND a growth/metrics chart. Stays legible down to 16px (favicon size).

## Icon files (square mark) — for favicon, manifest, mobile

| File                  | Size    | Where it goes                                    |
|-----------------------|---------|--------------------------------------------------|
| favicon.ico           | 16/32/48| client/public/favicon.ico (browser tab)          |
| favicon-16.png        | 16      | optional explicit favicon size                   |
| favicon-32.png        | 32      | optional explicit favicon size                   |
| logo192.png           | 192     | client/public/logo192.png (manifest + apple)     |
| logo512.png           | 512     | client/public/logo512.png (manifest, maskable)   |
| apple-touch-icon.png  | 180     | client/public/apple-touch-icon.png (iOS home)    |
| icon-256.png          | 256     | general use / dashboard sidebar icon             |
| metricore-icon.svg    | vector  | source — scales to any size, use in React header |

## Full logo (icon + "MetriCore" wordmark)

| File                        | Use                                             |
|-----------------------------|-------------------------------------------------|
| metricore-logo-full.svg/png | DARK backgrounds (your navy site header/dashboard) |
| metricore-logo-light.svg/png| LIGHT backgrounds (white pages, invoices, docs) |

Prefer the .SVG versions in your React app — they're vector (sharp at any
size) and tiny. The .PNG versions are for places that need raster.

## To wire into your app

1. Copy favicon.ico, logo192.png, logo512.png, apple-touch-icon.png into client/public/
   (overwrite the old React defaults).
2. In client/public/index.html, add (if not present):
     <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
     <link rel="apple-touch-icon" href="%PUBLIC_URL%/apple-touch-icon.png" />
3. manifest.json already references logo192.png / logo512.png — done.
4. For the dashboard/site header, import metricore-icon.svg (or logo-full.svg)
   as a React component or <img src>.

## Note on the wordmark font

The wordmark was rendered with a fallback font (Space Grotesk wasn't available
in the render environment). For pixel-perfect brand consistency, open the .svg
in a vector editor (Figma / Illustrator / free: Inkscape) and set the text in
Space Grotesk Bold — your actual brand font — then re-export. The icon needs no
such fix; it's pure shapes.
