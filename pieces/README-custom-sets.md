# Adding a custom / novelty piece set (e.g. Dragons)

## File spec (what to generate in Grok)
- **Transparent background** (PNG with alpha, or SVG).
- **Square canvas**, piece centered, consistent baseline/height across all pieces.
- Recommended **512×512 PNG** (crisp at any board size).
- One file per piece, named `<color><TYPE>.<ext>`:
  - colors: `w` (white) `b` (black)
  - types: `K Q R B N P`
  - e.g. `wN.png` = white knight, `bN.png` = black knight.
- A **white version** (light fill, dark outline) and a **black version** (dark fill) of each piece.

## Two ways to build a set
1. **Full set** — all 12 pieces in your theme. Put them in `public/pieces/<name>/`.
2. **Override set (recommended for "stays traditional")** — keep 5 pieces from a
   traditional set and only replace the themed piece(s). Put just the new files
   (e.g. `wN.png`, `bN.png`) in `public/pieces/dragons/`; the set config points the
   other pieces at `cburnett`. See the commented `dragons` entry in
   `src/pieces/pieceSets.js` — uncomment it to turn the set on.

## Grok prompt (novelty knight that still reads as a Staunton knight)
> Generate a single chess **knight** piece in a flat, 2D vector line-drawing style
> matching a classic Staunton "cburnett" chess set: cream/white fill with clean
> bold black outlines, no 3D, no shading gradients, transparent background, side
> profile, centered on a square canvas.
> Keep the **exact silhouette and proportions of a traditional chess knight**
> (the horse-head-on-a-base shape) so it's instantly recognizable as a knight —
> then restyle the head as a **dragon**: add small horns, a spiked mane/crest down
> the neck, a fiercer snout, and subtle scales, while preserving the knight's
> outline and base. Output one clean piece, white version.
> (Repeat asking for the "black version": same shape, dark fill.)

Tip: ask Grok to **edit/restyle the actual cburnett knight image** for the closest
match to the rest of the set.
