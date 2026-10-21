"""Colour ink-wash (彩墨) cosmos art for the hero: a spiral galaxy and a nebula sky.

Usage: python scripts/gen_ink_art.py assets
"""
import math
import random
import sys

OUT = sys.argv[1]

INK = "#24211d"
AZURITE = "#2e5f80"   # 石青
INDIGO = "#3c5a6e"    # 花青
ROUGE = "#b5485d"     # 胭脂
GAMBOGE = "#d1a02c"   # 藤黄
OCHRE = "#a0643a"     # 赭石
CINNABAR = "#c0412f"  # 朱砂
MALACHITE = "#4e8b6f" # 石绿


def f(v):
    return f"{v:.1f}"


def filters(names, region="x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"120%\""):
    """Filters share one user-space region so wide blooms are never clipped to a box."""
    lib = {
        # Brush: rough, dry edges.
        "brush": '<filter id="brush" REGION>'
                 '<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="n"/>'
                 '<feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" result="d"/>'
                 '<feGaussianBlur in="d" stdDeviation="0.8"/></filter>',
        # Wash: pigment bleeding into wet paper.
        "wash": '<filter id="wash" REGION>'
                '<feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="9" result="n"/>'
                '<feDisplacementMap in="SourceGraphic" in2="n" scale="38" xChannelSelector="R" yChannelSelector="G" result="d"/>'
                '<feGaussianBlur in="d" stdDeviation="7"/></filter>',
        # Bloom: ink dropped in water — large tendrils, very soft.
        "bloom": '<filter id="bloom" REGION>'
                 '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="5" seed="21" result="n"/>'
                 '<feDisplacementMap in="SourceGraphic" in2="n" scale="140" xChannelSelector="R" yChannelSelector="B" result="d"/>'
                 '<feGaussianBlur in="d" stdDeviation="18"/></filter>',
        # Dry brush (飞白): speckled breaks through the stroke.
        "dry": '<filter id="dry" REGION>'
               '<feTurbulence type="fractalNoise" baseFrequency="0.045 0.018" numOctaves="3" seed="7" result="t"/>'
               '<feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -4.5 3.3" result="m"/>'
               '<feComposite in="SourceGraphic" in2="m" operator="in" result="c"/>'
               '<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="2" result="n"/>'
               '<feDisplacementMap in="c" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter>',
        # Water-mark rim (水痕): pigment pooled at the edge of a wash.
        "rim": '<filter id="rim" REGION>'
               '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="5" seed="21" result="n"/>'
               '<feDisplacementMap in="SourceGraphic" in2="n" scale="140" xChannelSelector="R" yChannelSelector="B" result="d"/>'
               '<feGaussianBlur in="d" stdDeviation="3.5"/></filter>',
        "soft": '<filter id="soft" REGION><feGaussianBlur stdDeviation="3"/></filter>',
    }
    return "".join(lib[n] for n in names).replace("REGION", region)


def spiral_stroke(cx, cy, a, b, phase, t0, t1, wmax, jitter, rng, n=140, taper=0.8):
    """Tapered brush stroke along a log spiral r = a·e^(bθ)."""
    left, right = [], []
    for i in range(n + 1):
        u = i / n
        th = t0 + (t1 - t0) * u
        r = a * math.exp(b * th)
        x = cx + r * math.cos(th + phase)
        y = cy + r * math.sin(th + phase)
        # tangent of log spiral
        dx = b * math.cos(th + phase) - math.sin(th + phase)
        dy = b * math.sin(th + phase) + math.cos(th + phase)
        ln = math.hypot(dx, dy)
        nx, ny = -dy / ln, dx / ln
        w = wmax * (math.sin(math.pi * u) ** taper) * (1 + jitter * (rng.random() - 0.5))
        left.append((x + nx * w / 2, y + ny * w / 2))
        right.append((x - nx * w / 2, y - ny * w / 2))
    pts = left + right[::-1]
    return "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts) + "Z"


def spiral_point(cx, cy, a, b, phase, th):
    r = a * math.exp(b * th)
    return cx + r * math.cos(th + phase), cy + r * math.sin(th + phase)


# ─── Galaxy (face-on; CSS tilts and slowly turns it) ────────────────
def galaxy():
    rng = random.Random(3)
    S, C = 800, 400
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">', "<defs>", filters(["brush", "wash", "dry", "soft"], 'filterUnits="userSpaceOnUse" x="-100" y="-100" width="1000" height="1000"')]
    o.append(
        f'<radialGradient id="core"><stop offset="0" stop-color="#fbf3d6"/><stop offset="0.22" stop-color="{GAMBOGE}" stop-opacity="0.95"/>'
        f'<stop offset="0.55" stop-color="{OCHRE}" stop-opacity="0.55"/><stop offset="1" stop-color="{OCHRE}" stop-opacity="0"/></radialGradient>'
    )
    o.append(
        f'<radialGradient id="halo"><stop offset="0" stop-color="{AZURITE}" stop-opacity="0.32"/>'
        f'<stop offset="0.6" stop-color="{INDIGO}" stop-opacity="0.14"/><stop offset="1" stop-color="{INDIGO}" stop-opacity="0"/></radialGradient>'
    )
    o.append("</defs>")

    # Diffuse disk wash.
    o.append(f'<circle cx="{C}" cy="{C}" r="360" fill="url(#halo)" filter="url(#wash)"/>')

    a, b = 24, 0.31
    for k in range(2):
        ph = k * math.pi
        # Broad azurite / malachite washes under the arm (渲染).
        o.append(f'<path d="{spiral_stroke(C, C, a, b, ph, 0.6, 8.4, 150, 0.25, rng)}" fill="{AZURITE}" opacity="0.26" filter="url(#wash)"/>')
        o.append(f'<path d="{spiral_stroke(C, C, a, b, ph + 0.35, 2.5, 8.0, 90, 0.25, rng)}" fill="{MALACHITE}" opacity="0.20" filter="url(#wash)"/>')
        # Indigo body, dry-brushed.
        o.append(f'<path d="{spiral_stroke(C, C, a, b, ph + 0.06, 0.8, 8.2, 70, 0.4, rng)}" fill="{INDIGO}" opacity="0.62" filter="url(#dry)"/>')
        # Dark ink spine — the dust lane.
        o.append(f'<path d="{spiral_stroke(C, C, a, b, ph - 0.14, 1.1, 7.4, 20, 0.9, rng, taper=1.2)}" fill="{INK}" opacity="0.6" filter="url(#dry)"/>')
        # Flocculent brush flicks around the arm (碎笔).
        for _ in range(14):
            t0 = rng.uniform(1.4, 7.0)
            o.append(
                f'<path d="{spiral_stroke(C, C, a * rng.uniform(0.85, 1.2), b, ph + rng.uniform(-0.5, 0.5), t0, t0 + rng.uniform(0.6, 1.8), rng.uniform(6, 22), 0.8, rng, n=40, taper=1.3)}" '
                f'fill="{rng.choice([INK, INDIGO, INDIGO, AZURITE])}" opacity="{rng.uniform(0.25, 0.6):.2f}" filter="url(#dry)"/>'
            )
        # Rouge HII knots strung along the arm (点染).
        for _ in range(22):
            th = rng.uniform(2.0, 8.0)
            x, y = spiral_point(C, C, a, b, ph + rng.uniform(-0.15, 0.22), th)
            r = rng.uniform(3, 9)
            o.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{ROUGE}" opacity="{rng.uniform(0.45, 0.85):.2f}" filter="url(#brush)"/>')

    # Bulge: gamboge into ochre, bled into the paper.
    o.append(f'<circle cx="{C}" cy="{C}" r="150" fill="url(#core)" filter="url(#wash)"/>')
    o.append(f'<circle cx="{C}" cy="{C}" r="34" fill="#fbf3d6" opacity="0.9" filter="url(#soft)"/>')

    # Scattered stars as ink specks.
    for _ in range(140):
        rr = abs(rng.gauss(0, 150)) + 20
        th = rng.uniform(0, 2 * math.pi)
        x, y = C + rr * math.cos(th), C + rr * math.sin(th)
        if math.hypot(x - C, y - C) > 360:
            continue
        o.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{rng.uniform(0.8, 2.2):.1f}" fill="{INK}" opacity="{rng.uniform(0.3, 0.75):.2f}"/>')
    o.append("</svg>")
    return "\n".join(o)


# ─── Sky: nebula blooms, star-chart dots, Big Dipper ────────────────
def sky():
    rng = random.Random(11)
    W, H = 1600, 900
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">', "<defs>", filters(["bloom", "rim", "wash", "soft"], 'filterUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="1700"'), "</defs>"]

    # Nebula blooms — colour ink spreading in water, with pooled rims (水痕).
    for cx, cy, rx, ry, col, op in [
        (170, 770, 340, 220, AZURITE, 0.30),
        (60, 600, 200, 150, MALACHITE, 0.26),
        (470, 880, 230, 110, ROUGE, 0.22),
        (1500, 110, 250, 170, ROUGE, 0.17),
        (1330, 40, 210, 110, GAMBOGE, 0.22),
        (900, 980, 380, 110, INDIGO, 0.13),
    ]:
        o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{col}" opacity="{op}" filter="url(#bloom)"/>')
        o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx * 0.92:.0f}" ry="{ry * 0.92:.0f}" fill="none" stroke="{col}" stroke-width="3" opacity="{op * 0.8:.2f}" filter="url(#rim)"/>')
    # Deeper pools of pigment inside the large bloom (积墨).
    for _ in range(6):
        cx, cy = rng.uniform(30, 420), rng.uniform(620, 880)
        o.append(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rng.uniform(40, 120))}" ry="{f(rng.uniform(20, 60))}" fill="{rng.choice([INDIGO, AZURITE, INK])}" opacity="0.12" filter="url(#wash)"/>')

    # Star-chart dots: ink, cinnabar, and open circles as on old Chinese star maps.
    for _ in range(90):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        roll = rng.random()
        r = rng.uniform(1.2, 2.6)
        if roll < 0.14:
            o.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r + 1.2)}" fill="{CINNABAR}" opacity="0.55"/>')
        elif roll < 0.24:
            o.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r + 1.6)}" fill="none" stroke="{INK}" stroke-width="1" opacity="0.4"/>')
        else:
            o.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r * 0.7)}" fill="{INK}" opacity="{rng.uniform(0.18, 0.45):.2f}"/>')

    # Big Dipper (北斗七星) in the upper left.
    stars = [(11.062, 61.75), (11.031, 56.38), (11.897, 53.69), (12.257, 57.03),
             (12.900, 55.96), (13.399, 54.93), (13.792, 49.31)]
    cx0, cy0, sc = 760, 150, 12
    proj = [(cx0 - (ra - 12.4) * 15 * math.cos(math.radians(55)) * sc * 1.0,
             cy0 - (dec - 55.5) * sc * 1.0) for ra, dec in stars]
    order = [0, 1, 2, 3, 0, 3, 4, 5, 6]
    d = " ".join(f"{'M' if k == 0 else 'L'}{f(proj[i][0])},{f(proj[i][1])}" for k, i in enumerate(order))
    o.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="1.2" opacity="0.38"/>')
    for x, y in proj:
        o.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="5" fill="{INK}" opacity="0.62"/>')
    o.append("</svg>")
    return "\n".join(o)


open(f"{OUT}/ink-galaxy.svg", "w").write(galaxy())
open(f"{OUT}/ink-sky.svg", "w").write(sky())
print("ok")


# ─── Brush line used under section titles ───────────────────────────
def brush_line():
    rng = random.Random(5)
    W, H = 240, 24
    top, bot = [], []
    n = 60
    for i in range(n + 1):
        u = i / n
        x = 6 + u * (W - 12)
        # Heavy press at the start, lifting off toward the end (起笔重，收笔轻).
        w = 10 * (min(1, u * 9) ** 0.6) * (1 - u) ** 0.55 + 0.6
        y = H / 2 + math.sin(u * 3.1) * 1.6
        top.append((x, y - w / 2 + rng.uniform(-0.4, 0.4)))
        bot.append((x, y + w / 2 + rng.uniform(-0.4, 0.4)))
    d = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in top + bot[::-1]) + "Z"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><defs>{filters(["dry"])}</defs>'
        f'<path d="{d}" fill="{INK}" opacity="0.85" filter="url(#dry)"/></svg>'
    )


open(f"{OUT}/brush-line.svg", "w").write(brush_line())
