"""Generate dark app icons (favicon + PWA) from the keyed dragon-shield PNG, so
the browser-tab / installed icon matches the in-app brand (no more gold tile)."""
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter

SHIELD = r"F:\Software Builds\chess-cadet\public\textures\dragon-shield.png"
PUB = r"F:\Software Builds\chess-cadet\public"

shield = Image.open(SHIELD).convert("RGBA")
# Brighten the (deliberately dark) shield so it reads at small icon sizes.
bright = ImageEnhance.Brightness(shield).enhance(1.7)
bright = ImageEnhance.Contrast(bright).enhance(1.05)


def make(size):
    canvas = Image.new("RGBA", (size, size), (11, 12, 16, 255))
    # Soft cool glow behind the shield.
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    pad = int(size * 0.16)
    gd.ellipse([pad, pad, size - pad, size - pad], fill=(0, 220, 255, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12))
    canvas.alpha_composite(glow)
    # Shield, fit to ~84% height, centered.
    th = int(size * 0.84)
    tw = int(bright.width * th / bright.height)
    s = bright.resize((tw, th), Image.LANCZOS)
    canvas.alpha_composite(s, ((size - tw) // 2, (size - th) // 2))
    return canvas.convert("RGB")


make(512).save(PUB + r"\logo512.png")
make(192).save(PUB + r"\logo192.png")
ico = make(64)
ico.save(PUB + r"\favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print("icons written: logo512.png, logo192.png, favicon.ico")
