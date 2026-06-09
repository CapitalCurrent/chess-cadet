"""Key out the baked checkerboard background from the Grok shield JPG and write a
true-transparent PNG. The shield is dark on a light checker, so we alpha by
luminance, then flood-fill from the border so interior engraving never becomes a
hole. Output trimmed to the shield."""
import numpy as np
from PIL import Image
from collections import deque

SRC = r"F:\Software Builds\chess-cadet\pics for TS\Testure\Shield.jpg"
OUT = r"F:\Software Builds\chess-cadet\public\textures\dragon-shield.png"

im = Image.open(SRC).convert("RGB")
rgb = np.asarray(im).astype(np.float32)
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]

# Soft alpha: opaque where dark (<=LOW), transparent where light (>=HIGH). The
# checker tones are ~184 & 255; the shield tops out ~176, so key just below 183.
LOW, HIGH = 164.0, 180.0
alpha = np.clip((HIGH - lum) / (HIGH - LOW), 0.0, 1.0)

# Flood-fill the transparent candidates from the image border -> that's the real
# background. Anything transparent but unreachable (interior) is forced opaque.
trans = alpha < 0.5
H, W = trans.shape
visited = np.zeros_like(trans, dtype=bool)
dq = deque()
for x in range(W):
    for y in (0, H - 1):
        if trans[y, x] and not visited[y, x]:
            visited[y, x] = True
            dq.append((y, x))
for y in range(H):
    for x in (0, W - 1):
        if trans[y, x] and not visited[y, x]:
            visited[y, x] = True
            dq.append((y, x))
while dq:
    y, x = dq.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and trans[ny, nx] and not visited[ny, nx]:
            visited[ny, nx] = True
            dq.append((ny, nx))
hole = trans & ~visited
alpha[hole] = 1.0

alpha[alpha < 0.12] = 0.0  # floor out faint JPEG ringing in the background
a8 = (alpha * 255).astype(np.uint8)
out_rgb = np.asarray(im).copy()
out_rgb[a8 == 0] = 0  # zero RGB of fully transparent pixels (kills any fringe)
rgba = np.dstack([out_rgb, a8])
res = Image.fromarray(rgba, "RGBA")

# Trim by row/column DENSITY so sparse speckles (a few stray solid px near the
# edges) don't bloat the crop: the shield has hundreds of solid px per line.
solid = alpha > 0.5
colcount = solid.sum(0)
rowcount = solid.sum(1)
THRESH = 20
xs = np.where(colcount > THRESH)[0]
ys = np.where(rowcount > THRESH)[0]
pad = 14
l, r = max(0, xs.min() - pad), min(W, xs.max() + pad)
t, b = max(0, ys.min() - pad), min(H, ys.max() + pad)
res = res.crop((l, t, r, b))

res.save(OUT)
print("saved", OUT, res.size, "| opaque px:", int((a8 > 0).sum()))
