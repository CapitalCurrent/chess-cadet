"""Slice the full white dragon set into 6 transparent pieces.
- preserve relative sizes (scale by king height, shared baseline)
- center each piece on its BASE (not bbox) so asymmetric heads can overhang
- contrast-boost the white fill/outlines for board visibility
- derive matched black pieces by inverting white
Outputs public/pieces/dragons/{w,b}{P,R,N,B,K,Q}.png
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

import sys
SRC = r"F:\Software Builds\chess-cadet\Chess sets from grok"
BOLD = len(sys.argv) > 1 and sys.argv[1] == 'bold'
OUT = (r"F:\Software Builds\chess-cadet\public\pieces\dragons-bold" if BOLD
       else r"F:\Software Builds\chess-cadet\public\pieces\dragons")
os.makedirs(OUT, exist_ok=True)
BOLD_FILL = 0.90  # bold variant: each piece fills this fraction of the square height

SIZE = 512
TARGET_KING_FRAC = 0.82  # king height as % of canvas; *1.1 board scale -> ~90% of square (margin top/bottom)
BOTTOM_MARGIN = 0.03
CONTRAST = 1.35
ORDER = ['p', 'r', 'n', 'b', 'k', 'q']  # left -> right in the source row
TYPE_BOOST = {'p': 1.25, 'r': 1.12, 'n': 1.12, 'b': 1.10, 'q': 0.92}  # uniform size nudge per piece (queen a touch smaller than king)
WIDTH_BOOST = {'k': 1.15, 'r': 1.15, 'q': 1.15}            # horizontal-only stretch (wider, same height)
HEAD_ONLY = {'k', 'q'}  # bold variant: crop K & Q to just the head/crown so they're distinct
HEAD_FRAC = {'k': 0.42, 'q': 0.33}  # top fraction kept as "the head" (queen tighter = no neck)
BOLD_WIDTH = {'b': 1.30, 'r': 1.30}  # bold variant per-type width (bishop + rook fatter); default 1.12
BOLD_SCALE = {'q': 0.80}             # bold variant per-type size multiplier (queen smaller than king)


def remove_bg_light(path):
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    lum = a.mean(axis=2)
    free = ~(lum < 110)
    lbl, n = ndimage.label(free)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border))
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    return np.dstack([a.astype(np.uint8), alpha])


def segment(rgba):
    fg = rgba[..., 3] > 12
    lbl, n = ndimage.label(fg)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
    big = [int(i) + 1 for i in np.argsort(sizes)[::-1][:6]]
    cents = ndimage.center_of_mass(fg, lbl, big)
    big_sorted = [c for _, c in sorted(zip([cx for (_, cx) in cents], big))]
    pieces = []
    for comp in big_sorted:
        mask = lbl == comp
        ys, xs = np.where(mask)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        sub = rgba[y0:y1 + 1, x0:x1 + 1].copy()
        subm = mask[y0:y1 + 1, x0:x1 + 1]
        sub[..., 3] = np.where(subm, sub[..., 3], 0)
        pieces.append(Image.fromarray(sub, 'RGBA'))
    return pieces


def base_center_x(scaled_arr):
    """x-center of the bottom 12% (the base) — what should sit on the file center."""
    al = scaled_arr[..., 3]
    h = al.shape[0]
    strip = al[int(h * 0.88):, :]
    cols = np.where(strip.sum(axis=0) > 0)[0]
    if len(cols) == 0:
        cols = np.where(al.sum(axis=0) > 0)[0]
    return (cols.min() + cols.max()) / 2.0


rgba = remove_bg_light(os.path.join(SRC, 'White Drasgon.jpg'))
pieces = segment(rgba)
king_h = pieces[ORDER.index('k')].size[1]
scale = (SIZE * TARGET_KING_FRAC) / king_h

debug = Image.new('RGB', (SIZE * 6, SIZE), (40, 55, 80))
ddraw = ImageDraw.Draw(debug)

for i, (typ, piece) in enumerate(zip(ORDER, pieces)):
    if BOLD and typ in HEAD_ONLY:
        w0, h0 = piece.size
        piece = piece.crop((0, 0, w0, int(h0 * HEAD_FRAC.get(typ, 0.42))))   # keep just the head/crown
        a0 = np.array(piece)
        ys0, xs0 = np.where(a0[..., 3] > 12)
        if len(xs0):
            piece = piece.crop((int(xs0.min()), int(ys0.min()), int(xs0.max()) + 1, int(ys0.max()) + 1))
    pw, ph = piece.size
    if BOLD:
        s = (SIZE * BOLD_FILL * BOLD_SCALE.get(typ, 1.0)) / ph   # fill height, per-type size
        wb = BOLD_WIDTH.get(typ, 1.12)                           # per-type width
    else:
        s = scale * TYPE_BOOST.get(typ, 1.0)
        wb = WIDTH_BOOST.get(typ, 1.0)
    nw = max(1, round(pw * s * wb))
    nh = max(1, round(ph * s))
    scaled = piece.resize((nw, nh), Image.LANCZOS)
    sarr = np.array(scaled)
    bcx = base_center_x(sarr)
    x = int(round(SIZE / 2 - bcx))   # center horizontally on the base
    y = (SIZE - nh) // 2             # center vertically -> equal space above/below
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(scaled, (x, y), scaled)

    # contrast boost (white)
    arr = np.array(canvas).astype(float)
    m = arr[..., 3] > 0
    arr[..., :3] = np.where(m[..., None], np.clip((arr[..., :3] - 128) * CONTRAST + 128, 0, 255), arr[..., :3])
    white = arr.astype(np.uint8)
    Image.fromarray(white, 'RGBA').save(os.path.join(OUT, f'w{typ.upper()}.png'))

    inv = white.copy()
    inv[..., :3] = np.where(m[..., None], 255 - white[..., :3], white[..., :3])
    # dark outer stroke: keeps the silhouette defined on LIGHT squares (the
    # inverted white rim only shows on dark squares, which made size look to change)
    inner = ndimage.binary_erosion(m, iterations=3)
    outer_ring = m & ~inner
    inv[outer_ring, :3] = (22, 22, 28)
    Image.fromarray(inv, 'RGBA').save(os.path.join(OUT, f'b{typ.upper()}.png'))

    # debug: paste white onto a panel with a vertical center line
    debug.paste(Image.fromarray(white, 'RGBA'), (i * SIZE, 0), Image.fromarray(white, 'RGBA'))
    ddraw.line([(i * SIZE + SIZE // 2, 0), (i * SIZE + SIZE // 2, SIZE)], fill=(255, 80, 80), width=3)
    ddraw.line([(i * SIZE, SIZE // 2), ((i + 1) * SIZE, SIZE // 2)], fill=(255, 80, 80), width=3)

debug.save(os.path.join(SRC, 'center_debug.png'))
print('done — base-centered + contrast; wrote 12 PNGs + center_debug.png')
