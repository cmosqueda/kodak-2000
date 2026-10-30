"""Kodak 2000 logo: a pixel-art K with a camera lens at its hub, on a 64x64 grid.

Run: python gen.py <output dir>
Writes the layers used for the app icon (full icon, Android adaptive layers, favicon, preview).
"""
import math
import sys
from pathlib import Path

from PIL import Image

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

GRID = 64
NAVY = (27, 36, 56)
FACE = (234, 238, 230)
WHITE = (255, 255, 255)
SHADE = (150, 160, 152)
DROP = (14, 36, 84)

# The app's Series 60 title-bar blue, light to dark, in coarse steps.
BANDS = [(96, 142, 212), (78, 124, 192), (64, 110, 180), (52, 97, 167), (42, 84, 152), (32, 70, 137)]

# Lens centre and the K's geometry, in grid pixels.
LENS = (29.0, 32.0)
LENS_R = 13.5
STEM = (9, 9, 18, 55)  # x0, y0, x1, y1 (exclusive end)
TOP, BOTTOM = 9, 55
ARM_R = 4.7
ARM_HUB = (19.0, 32.0)
ARM_TOP_TIP = (54.0, 5.0)
ARM_BOTTOM_TIP = (54.0, 59.0)


def seg_distance(px, py, a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def letter_mask():
    """The K: a stem plus two arms that leave the hub, clipped to the same top and bottom."""
    mask = set()
    for y in range(GRID):
        for x in range(GRID):
            cx, cy = x + 0.5, y + 0.5
            in_stem = STEM[0] <= x < STEM[2] and STEM[1] <= y < STEM[3]
            in_arm = TOP <= y < BOTTOM and (
                seg_distance(cx, cy, ARM_HUB, ARM_TOP_TIP) <= ARM_R
                or seg_distance(cx, cy, ARM_HUB, ARM_BOTTOM_TIP) <= ARM_R
            )
            if in_stem or in_arm:
                mask.add((x, y))
    return mask


def shifted(mask, dx, dy):
    return {(x + dx, y + dy) for x, y in mask}


def dilate(mask):
    out = set(mask)
    for x, y in mask:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                out.add((x + dx, y + dy))
    return out


def bayer(x, y):
    return ((x & 1) * 2 + (y & 1) * 3) % 4 / 4.0  # 2x2 ordered-dither thresholds


def lens_pixel(x, y):
    """Colour of the lens at pixel (x, y), or None when outside it."""
    cx, cy = LENS
    px, py = x + 0.5, y + 0.5
    d = math.hypot(px - cx, py - cy)
    if d > LENS_R:
        return None
    if d > LENS_R - 1:
        return NAVY
    if d > 9.6:  # silver bezel, lit from the top left
        t = ((px - cx) + (py - cy)) / (2 * (LENS_R - 1))
        steps = [(246, 248, 250), (206, 212, 218), (158, 165, 173), (108, 115, 124)]
        return steps[min(3, max(0, int((t + 1) / 2 * 4)))]
    if d > 8.6:
        return NAVY
    # glass: a radial jelly gradient around an off-centre highlight, ordered-dithered
    hx, hy = cx - 3.2, cy - 3.4
    h = math.hypot(px - hx, py - hy)
    ramp = [(236, 249, 255), (160, 212, 244), (92, 160, 220), (46, 104, 178), (22, 62, 132)]
    pos = min(len(ramp) - 1.001, h / 11.5 * (len(ramp) - 1))
    base = int(pos)
    pick = base + (1 if pos - base > bayer(x, y) else 0)
    color = ramp[min(pick, len(ramp) - 1)]
    # specular glints
    if cx - 6 <= px <= cx - 2.5 and cy - 6.5 <= py <= cy - 4.5:
        return WHITE
    if cx - 6.5 <= px <= cx - 5.5 and cy - 4.5 <= py <= cy - 2.5:
        return WHITE
    if cx + 3 <= px <= cx + 4.5 and cy + 4 <= py <= cy + 5.5:
        return (190, 228, 250)
    return color


def render_art():
    """The K and lens on a transparent 64x64 canvas (drop shadow included)."""
    img = Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))
    px = img.load()
    mask = letter_mask()
    lens_cells = {(x, y) for y in range(GRID) for x in range(GRID) if lens_pixel(x, y) is not None}
    body = mask | lens_cells
    outline = dilate(body) - body
    shadow = shifted(dilate(body), 3, 3) - dilate(body)

    for x, y in shadow:
        if 0 <= x < GRID and 0 <= y < GRID:
            px[x, y] = (*DROP, 255)
    for x, y in outline:
        if 0 <= x < GRID and 0 <= y < GRID:
            px[x, y] = (*NAVY, 255)
    for x, y in mask:
        if (x, y) in lens_cells:
            continue
        lit = (x - 1, y) not in mask or (x, y - 1) not in mask
        dark = (x + 1, y) not in mask or (x, y + 1) not in mask
        px[x, y] = (*(WHITE if lit else SHADE if dark else FACE), 255)
    for x, y in lens_cells:
        px[x, y] = (*lens_pixel(x, y), 255)
    return img, body


def render_background(size):
    """The app's blue gradient with checkerboard dither between bands, and a bevelled edge."""
    img = Image.new('RGBA', (size, size))
    px = img.load()
    for y in range(size):
        t = y / size * len(BANDS)
        band = min(int(t), len(BANDS) - 1)
        frac = t - band
        here = BANDS[band]
        nxt = BANDS[min(band + 1, len(BANDS) - 1)]
        for x in range(size):
            if frac > 0.9 and (x + y) % 2 == 0:
                color = nxt
            elif frac > 0.78 and x % 2 == 0 and y % 2 == 0:
                color = nxt
            else:
                color = here
            px[x, y] = (*color, 255)
    return img


def bevel_and_round(img, radius):
    """Navy outline, white inner highlight on the top/left, stair-stepped corners."""
    size = img.width
    px = img.load()

    def inside(x, y):
        if not (0 <= x < size and 0 <= y < size):
            return False
        cx = min(x, size - 1 - x)
        cy = min(y, size - 1 - y)
        if cx < radius and cy < radius:
            return math.hypot(radius - cx - 0.5, radius - cy - 0.5) <= radius
        return True

    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    o = out.load()
    for y in range(size):
        for x in range(size):
            if not inside(x, y):
                continue
            edge = not (inside(x - 1, y) and inside(x + 1, y) and inside(x, y - 1) and inside(x, y + 1))
            if edge:
                o[x, y] = (*NAVY, 255)
                continue
            ring = not (inside(x - 2, y) and inside(x + 2, y) and inside(x, y - 2) and inside(x, y + 2))
            if ring:
                # lit from the top left: highlight those edges, shade the bottom and right
                top_left = (x <= 2 or y <= 2) and x <= size - 3 and y <= size - 3
                o[x, y] = (*(WHITE if top_left else (20, 46, 98)), 255)
            else:
                o[x, y] = px[x, y]
    return out


def up(img, factor):
    return img.resize((img.width * factor, img.height * factor), Image.NEAREST)


art, body = render_art()

# 1. Full icon (legacy / iOS / splash): background + art, full bleed.
full = render_background(GRID)
full.alpha_composite(art)
up(full, 16).convert('RGB').save(OUT / 'icon.png')

# 2. Rounded logo with bevel (for the README / docs / in-app use).
logo = render_background(GRID)
logo.alpha_composite(art)
rounded = bevel_and_round(logo, 7)
up(rounded, 16).save(OUT / 'logo.png')
rounded.save(OUT / 'logo-64.png')

# 3. Android adaptive icon: 108-unit layers, each pixel drawn 10x so the art stays crisp.
canvas = 108
margin = (canvas - GRID) // 2
fg = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
fg.alpha_composite(art, (margin, margin))
up(fg, 10).save(OUT / 'android-icon-foreground.png')
up(render_background(canvas), 10).convert('RGB').save(OUT / 'android-icon-background.png')

mono = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
mp = mono.load()
for x, y in body:
    mp[x + margin, y + margin] = (255, 255, 255, 255)
up(mono, 10).save(OUT / 'android-icon-monochrome.png')

# 4. Favicon.
rounded.save(OUT / 'favicon.png')

# 5. Preview sheet: icon, rounded logo, and how the adaptive icon looks under a circle mask.
sheet = Image.new('RGBA', (1760, 560), (222, 224, 216, 255))
sheet.alpha_composite(up(rounded, 8), (24, 24))
sheet.alpha_composite(up(full, 8), (560, 24))
adaptive = render_background(canvas)
adaptive.alpha_composite(fg)
mask_img = Image.new('L', (canvas, canvas), 0)
mpx = mask_img.load()
for y in range(canvas):
    for x in range(canvas):
        if math.hypot(x + 0.5 - canvas / 2, y + 0.5 - canvas / 2) <= canvas / 2:
            mpx[x, y] = 255
circle = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
circle.paste(adaptive, (0, 0), mask_img)
sheet.alpha_composite(circle.resize((480, 480), Image.NEAREST), (1096, 24))
sheet.convert('RGB').save(OUT / 'preview.png')
print('wrote', sorted(p.name for p in OUT.iterdir()))

# 6. Splash icon: the rounded logo at 8x, centred on a transparent 1152px canvas. Android 12+
# shows the icon in a 288dp box, so the logo is 128dp wide (2dp per art pixel) and stays
# crisp at 2x and 3x screen density.
splash = Image.new('RGBA', (1152, 1152), (0, 0, 0, 0))
splash.alpha_composite(up(rounded, 8), (320, 320))
splash.save(OUT / 'splash-icon.png')
print('wrote splash-icon.png')
