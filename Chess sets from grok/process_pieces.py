"""Turn the two Grok dragon-knight JPGs (checkerboard 'transparency' baked in)
into clean transparent PNGs, normalized to the same size/centering.

White piece: flood the light checkerboard from the border, stopping at the dark
outline -> keeps cream fill + black lines.
Black piece: find the dark body, fill holes, rebuild a crisp white rim, keep the
light interior detail lines.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = r"F:\Software Builds\chess-cadet\Chess sets from grok"
OUT = r"F:\Software Builds\chess-cadet\public\pieces\dragons"

import os
os.makedirs(OUT, exist_ok=True)


def normalize(rgba, size=512, frac=0.90):
    arr = np.array(rgba)
    alpha = arr[..., 3]
    ys, xs = np.where(alpha > 12)
    if len(xs) == 0:
        return rgba.resize((size, size))
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    crop = rgba.crop((int(x0), int(y0), int(x1) + 1, int(y1) + 1))
    cw, ch = crop.size
    scale = (size * frac) / max(cw, ch)
    nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
    crop = crop.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(crop, ((size - nw) // 2, (size - nh) // 2), crop)
    return canvas


def process_white(path):
    a = np.array(Image.open(path).convert("RGB")).astype(int)
    lum = a.mean(axis=2)
    barrier = lum < 110               # the black outline is the wall
    free = ~barrier                   # light pixels (checkerboard + cream fill)
    lbl, n = ndimage.label(free)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border))   # light region connected to the edge = checkerboard
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    rgb = a.astype(np.uint8)
    out = np.dstack([rgb, alpha])
    return normalize(Image.fromarray(out, "RGBA"))


def process_black(path):
    a = np.array(Image.open(path).convert("RGB")).astype(int)
    lum = a.mean(axis=2)
    dark = lum < 90
    lbl, n = ndimage.label(dark)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
    main = lbl == (int(np.argmax(sizes)) + 1)
    S = ndimage.binary_fill_holes(main)
    rim = ndimage.binary_dilation(S, iterations=7) & ~S
    body = S & (lum < 140)
    detail = S & (lum >= 140)
    out = np.zeros((a.shape[0], a.shape[1], 4), np.uint8)
    out[body] = [26, 26, 32, 255]
    out[detail] = [228, 228, 235, 255]
    out[rim] = [248, 248, 250, 255]
    return normalize(Image.fromarray(out, "RGBA"))


w = process_white(os.path.join(SRC, "download.jpg"))
b = process_black(os.path.join(SRC, "image.jpg"))
w.save(os.path.join(OUT, "wN.png"))
b.save(os.path.join(OUT, "bN.png"))

# debug sheet on a gray bg to eyeball
sheet = Image.new("RGBA", (1024, 512), (90, 110, 140, 255))
sheet.alpha_composite(w, (0, 0))
sheet.alpha_composite(b, (512, 0))
sheet.convert("RGB").save(os.path.join(SRC, "preview_on_board.png"))
print("saved wN.png, bN.png and preview_on_board.png")
print("white alpha px:", int((np.array(w)[..., 3] > 12).sum()))
print("black alpha px:", int((np.array(b)[..., 3] > 12).sum()))
