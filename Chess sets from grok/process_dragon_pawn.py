# Process a single Grok dragon piece (JPG with baked checkerboard "transparency")
# into a clean transparent PNG pawn (white), plus a black version by inversion.
# Background removal = connected-components: the dragon's thick black outline
# encloses the cream interior, so non-dark regions touching the border are the
# background and get made transparent; the interior is a separate component and
# stays opaque.
import os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "F:/Software Builds/chess-cadet/Chess sets from grok/grok-image-55c845e8-7629-4e6b-8a93-d69570995ec1.jpg"
OUT = "F:/Software Builds/chess-cadet/public/pieces/dragon-pawn"
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC).convert("RGBA")
arr = np.array(img)
rgb = arr[:, :, :3].astype(int)
lum = rgb.mean(axis=2)

dark = lum < 100              # the black outline (barrier)
nondark = ~dark
lbl, n = ndimage.label(nondark)
border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
border.discard(0)
bg = np.isin(lbl, list(border))   # background = non-dark regions touching an edge
alpha = np.where(bg, 0, 255).astype(np.uint8)
arr[:, :, 3] = alpha

out = Image.fromarray(arr, "RGBA")
ys, xs = np.where(alpha > 0)
crop = out.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

side = max(crop.size)
pad = int(side * 0.08)
canvas = Image.new("RGBA", (side + 2 * pad, side + 2 * pad), (0, 0, 0, 0))
canvas.paste(crop, ((canvas.size[0] - crop.size[0]) // 2, (canvas.size[1] - crop.size[1]) // 2), crop)
canvas = canvas.resize((512, 512), Image.LANCZOS)
canvas.save(os.path.join(OUT, "wP.png"))

# Black = invert RGB on opaque pixels (matches how the dragon black set is made).
b = np.array(canvas)
op = b[:, :, 3] > 0
for c in range(3):
    b[:, :, c][op] = 255 - b[:, :, c][op]
Image.fromarray(b, "RGBA").save(os.path.join(OUT, "bP.png"))

print("opaque pixels:", int((alpha > 0).sum()), "of", alpha.size, "| crop:", crop.size)
