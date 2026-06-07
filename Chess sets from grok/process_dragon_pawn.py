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
pad = int(side * 0.22)  # generous margin so the pawn reads SMALLER than the majors
canvas = Image.new("RGBA", (side + 2 * pad, side + 2 * pad), (0, 0, 0, 0))
canvas.paste(crop, ((canvas.size[0] - crop.size[0]) // 2, (canvas.size[1] - crop.size[1]) // 2), crop)
canvas = canvas.resize((512, 512), Image.LANCZOS)

# Match the cream tone to the rest of the bold set (sample the knight's cream) so
# the white pawn isn't a darker shade than the other white pieces.
def cream_mean(a):
    op = a[:, :, 3] > 0
    lum = a[:, :, :3].mean(axis=2)
    m = op & (lum > 150)
    return a[:, :, :3][m].mean(axis=0) if m.any() else np.array([255.0, 255.0, 255.0])

ref = np.array(Image.open("F:/Software Builds/chess-cadet/public/pieces/dragons-bold/wN.png").convert("RGBA"))
cv = np.array(canvas).astype(float)
shift = cream_mean(ref) - cream_mean(np.array(canvas))
op = cv[:, :, 3] > 0
lum = cv[:, :, :3].mean(axis=2)
mask = op & (lum > 120)            # the cream fill (leave the dark outline alone)
for c in range(3):
    cv[:, :, c][mask] = np.clip(cv[:, :, c][mask] + shift[c], 0, 255)
canvas = Image.fromarray(cv.astype(np.uint8), "RGBA")
canvas.save(os.path.join(OUT, "wP.png"))
print("cream shift applied:", shift.round(1))

# Black = invert RGB on opaque pixels (matches how the dragon black set is made).
b = np.array(canvas)
op = b[:, :, 3] > 0
for c in range(3):
    b[:, :, c][op] = 255 - b[:, :, c][op]
Image.fromarray(b, "RGBA").save(os.path.join(OUT, "bP.png"))

print("opaque pixels:", int((alpha > 0).sum()), "of", alpha.size, "| crop:", crop.size)
