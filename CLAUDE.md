# Chess Lair (chess-cadet)

## 🎨 Local Image / Asset Studio (free, on the Intel Arc B580)
For chess pieces, dragon-themed art, icons, and scalable SVG assets, generate locally with the
ComfyUI image studio instead of a paid service. Claude: proactively offer this when this app needs art.

- **Start server:** `F:\Software Builds\ComfyUI_Windows_portable\Start-ComfyUI.bat` (serves http://127.0.0.1:8188; start each session).
- **Generate (CLI):** `F:\Software Builds\ComfyUI_Windows_portable\python_standalone\python.exe F:\Software Builds\ComfyUI_Windows_portable\cc-gen.py --tier daily --prompt "..."`
  - Tiers: `daily` (SDXL, stylized, fast, commercial) · `photoreal` (Juggernaut XL, commercial) · `hero` (Flux-schnell ~4min, commercial) · `personal` (Flux-dev ~20min, **NON-COMMERCIAL**)
  - Flags: `--remove-bg` (transparent PNG) · `--vectorize` (scalable .svg) · `--size WxH` · `--seed N`
- **Example (this app):** dragon-influenced chess pieces that must be crisp at every screen size →
  `--tier daily --remove-bg --vectorize` with a flat-art prompt (bold outlines, solid colors) → transparent PNG → **scalable SVG**. Vectorize works best on flat/iconic art like chess pieces.
- **Docs:** `F:\Software Builds\ComfyUI_Windows_portable\README-CapitalCurrent.md` · **Licensing:** `COMMERCIAL-SAFETY.md`
- **⚠️ Stability:** when switching between Flux and SDXL in one sitting, run `Restart-ComfyUI.bat` first (prevents an Arc GPU device-loss crash). `personal` (Flux-dev) output is NON-COMMERCIAL — never ship it in a monetized app.
