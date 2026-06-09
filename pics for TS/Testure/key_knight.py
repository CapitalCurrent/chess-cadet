"""Key the Grok dragon-knight (cream piece + bold BLACK outline on a light
checker) into transparent wN/bN PNGs framed to match the dragons-bold set.

Light-on-light, so luminance keying fails — instead we use the closed black
outline: label all LIGHT regions, mark those touching the border as background,
keep everything else (outline + enclosed interior) as the piece."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = r"F:\Software Builds\chess-cadet\Chess sets from grok\grok-image-b8c53481-62da-4a0d-bb82-5cf406d72dfb.jpg"
REF = r"F:\Software Builds\chess-cadet\public\pieces\dragons-bold\wN.png"
OUTDIR = r"F:\Software Builds\chess-cadet\public\pieces\dragon-knight-ornate"

im = Image.open(SRC).convert("RGB")
rgb = np.asarray(im).astype(np.float32)
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
light = lum >= 95  # checker + cream piece fill; dark outline is False

lbl, _ = ndimage.label(light)
border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
border.discard(0)
bg = np.isin(lbl, list(border))           # exterior checker (light, border-connected)
piece = ~bg                                # black outline + enclosed interior

# Soft edge: blur the hard mask a touch then back to alpha for anti-aliasing.
alpha = ndimage.gaussian_filter(piece.astype(np.float32), 0.6)
alpha = np.clip(alpha, 0, 1)
a8 = (alpha * 255).astype(np.uint8)
out_rgb = np.asarray(im).copy()
out_rgb[a8 == 0] = 0
piece_img = Image.fromarray(np.dstack([out_rgb, a8]), "RGBA")
bbox = piece_img.getchannel("A").getbbox()
piece_img = piece_img.crop(bbox)
pw, ph = piece_img.size

# Frame to match the reference set's content box.
ref = Image.open(REF).convert("RGBA")
RW, RH = ref.size
rl, rt, rr, rb = ref.getchannel("A").getbbox()
target_h = rb - rt
scale = target_h / ph
nw, nh = int(round(pw * scale)), int(round(ph * scale))
small = piece_img.resize((nw, nh), Image.LANCZOS)

canvas = Image.new("RGBA", (RW, RH), (0, 0, 0, 0))
canvas.alpha_composite(small, ((RW - nw) // 2, rb - nh))

os.makedirs(OUTDIR, exist_ok=True)
canvas.save(os.path.join(OUTDIR, "wN.png"))

# Black side: invert RGB, keep alpha (matches the set's dark pieces).
arr = np.asarray(canvas).copy()
arr[..., :3] = 255 - arr[..., :3]
arr[np.asarray(canvas)[..., 3] == 0] = 0
Image.fromarray(arr, "RGBA").save(os.path.join(OUTDIR, "bN.png"))
print("wrote", OUTDIR, "| piece", (pw, ph), "-> scaled", (nw, nh))
