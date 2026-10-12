"""生成占位衣服图（正面 + 侧面 SVG）。真衣服照片到位后，直接替换 assets/clothes 里的文件即可。

用法：python tools/make_placeholders.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "clothes"
OUT.mkdir(parents=True, exist_ok=True)

# id, 款式(tee/long/crew), 布料色, 印花色, 印花样式
ITEMS = [
    ("01", "tee",   "#6d5f55", "#e9dfcf", "camo"),
    ("02", "tee",   "#1d1d1f", "#efece6", "chest"),
    ("03", "tee",   "#f4f2ef", "#2a3352", "script"),
    ("04", "tee",   "#26262a", "#e8e2d6", "serif"),
    ("05", "crew",  "#2f4b3e", "#f1ede4", "block"),
    ("06", "long",  "#1b1a1e", "#f0ece4", "badge"),
    ("07", "tee",   "#f6f3f1", "#d9506a", "flowers"),
    ("08", "tee",   "#f3f1ee", "#2f6b4f", "bill"),
    ("09", "tee",   "#f5f3f0", "#1d1d1f", "stack"),
    ("10", "tee",   "#77777b", "#f2f0ec", "chest"),
]


def shade_defs(uid, base):
    return f"""
  <defs>
    <linearGradient id="g{uid}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".22"/>
      <stop offset=".18" stop-color="#000" stop-opacity=".04"/>
      <stop offset=".5" stop-color="#fff" stop-opacity=".07"/>
      <stop offset=".82" stop-color="#000" stop-opacity=".05"/>
      <stop offset="1" stop-color="#000" stop-opacity=".25"/>
    </linearGradient>
    <linearGradient id="v{uid}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".06"/>
      <stop offset=".75" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".12"/>
    </linearGradient>
    <filter id="s{uid}" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".18"/>
    </filter>
  </defs>"""


def front_outline(kind):
    if kind == "tee":
        return ("M120 14 Q150 34 180 14 L214 20 L280 70 L256 120 L228 106 "
                "L230 322 Q150 330 70 322 L72 106 L44 120 L20 70 L86 20 Z")
    # 长袖 / 卫衣：袖子垂到下摆附近
    return ("M120 14 Q150 34 180 14 L214 20 Q248 40 258 80 L286 296 L256 304 "
            "L230 128 L232 322 Q150 330 68 322 L70 128 L44 304 L14 296 L42 80 "
            "Q52 40 86 20 Z")


def print_art(style, ink):
    c = ink
    if style == "chest":
        return f'<text x="128" y="78" font-family="Georgia,serif" font-style="italic" font-size="13" fill="{c}">your present</text>'
    if style == "script":
        return (f'<text x="150" y="150" text-anchor="middle" font-family="Brush Script MT,Segoe Script,cursive" '
                f'font-size="58" textLength="150" lengthAdjust="spacingAndGlyphs" fill="{c}">your</text>'
                f'<text x="150" y="205" text-anchor="middle" font-family="Brush Script MT,Segoe Script,cursive" '
                f'font-size="58" textLength="190" lengthAdjust="spacingAndGlyphs" fill="{c}">present</text>')
    if style == "serif":
        return (f'<g font-family="Didot,Georgia,serif" font-style="italic" fill="{c}" text-anchor="middle">'
                f'<text x="150" y="120" font-size="34">Be Here</text>'
                f'<text x="150" y="158" font-size="34" textLength="150" lengthAdjust="spacingAndGlyphs">Right Now</text>'
                f'<text x="150" y="196" font-size="34">Always</text>'
                f'<text x="150" y="232" font-size="9" font-style="normal" textLength="140">YOUR PRESENT · EST 2026</text></g>')
    if style == "block":
        return (f'<g font-family="Georgia,serif" font-weight="700" fill="{c}" text-anchor="middle">'
                f'<text x="150" y="120" font-size="34">Open</text>'
                f'<text x="150" y="158" font-size="34">It</text>'
                f'<text x="150" y="196" font-size="34">Today</text>'
                f'<circle cx="150" cy="232" r="10" fill="none" stroke="{c}" stroke-width="2"/></g>')
    if style == "badge":
        return (f'<g fill="none" stroke="{c}" stroke-width="3">'
                f'<circle cx="150" cy="150" r="40"/><circle cx="150" cy="150" r="30"/></g>'
                f'<text x="150" y="98" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="30" textLength="150" lengthAdjust="spacingAndGlyphs" fill="{c}">present</text>'
                f'<text x="150" y="162" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="{c}">yp</text>'
                f'<text x="150" y="214" text-anchor="middle" font-family="Arial" font-size="9" letter-spacing="1.5" fill="{c}">WE WERE NEVER SUPPOSED TO</text>'
                f'<text x="150" y="226" text-anchor="middle" font-family="Arial" font-size="9" letter-spacing="1.5" fill="{c}">WAIT FOR LATER</text>')
    if style == "flowers":
        petals = []
        cols = ["#d9506a", "#f0a63c", "#7b6bd6", "#3d9fd8", "#e6608f", "#59b36a"]
        pos = [(112, 150), (176, 140), (150, 182), (122, 205), (186, 196), (150, 128)]
        for (x, y), col in zip(pos, cols):
            for a in range(0, 360, 45):
                petals.append(f'<ellipse cx="{x}" cy="{y-9}" rx="4" ry="9" fill="{col}" transform="rotate({a} {x} {y})"/>')
            petals.append(f'<circle cx="{x}" cy="{y}" r="4" fill="#f6d34a"/>')
        return ("".join(petals) +
                f'<text x="150" y="110" text-anchor="middle" font-family="Brush Script MT,Segoe Script,cursive" font-size="48" fill="#1d1d1f">your</text>'
                f'<text x="150" y="250" text-anchor="middle" font-family="Brush Script MT,Segoe Script,cursive" font-size="48" textLength="170" lengthAdjust="spacingAndGlyphs" fill="#1d1d1f">present</text>')
    if style == "bill":
        return (f'<rect x="92" y="130" width="116" height="52" rx="3" fill="#dfeee3" stroke="{c}" stroke-width="2"/>'
                f'<rect x="99" y="137" width="102" height="38" fill="none" stroke="{c}" stroke-width="1"/>'
                f'<circle cx="150" cy="156" r="13" fill="none" stroke="{c}" stroke-width="1.5"/>'
                f'<text x="150" y="126" text-anchor="middle" font-family="Didot,Georgia,serif" font-style="italic" font-size="44" fill="#1d1d1f">Gift</text>'
                f'<text x="150" y="222" text-anchor="middle" font-family="Didot,Georgia,serif" font-style="italic" font-size="44" fill="#1d1d1f">Time</text>'
                f'<text x="150" y="262" text-anchor="middle" font-family="Arial" font-weight="700" font-size="8" letter-spacing="1" fill="#1d1d1f">THE PRESENT IS THE GIFT</text>')
    if style == "stack":
        return "".join(
            f'<text x="150" y="{110 + i*26}" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" '
            f'font-size="22" textLength="150" lengthAdjust="spacingAndGlyphs" fill="{c}" opacity="{1 - i*0.16:.2f}">PRESENT</text>' for i in range(6))
    if style == "camo":
        blobs = []
        cols = ["#8b7b6a", "#4f443b", "#a39582", "#3c342d"]
        import random
        rnd = random.Random(7)
        for i in range(70):
            x, y = rnd.randint(10, 290), rnd.randint(20, 320)
            blobs.append(f'<ellipse cx="{x}" cy="{y}" rx="{rnd.randint(8,22)}" ry="{rnd.randint(5,14)}" '
                         f'fill="{cols[i % 4]}" transform="rotate({rnd.randint(0,180)} {x} {y})"/>')
        return "".join(blobs) + f'<text x="150" y="220" text-anchor="middle" font-family="Georgia,serif" font-size="46" fill="{c}">現在</text>'
    return ""


def front_svg(uid, kind, base, ink, style):
    outline = front_outline(kind)
    cuffs = ""
    if kind != "tee":
        cuffs = (f'<path d="M14 296 L44 304 L46 290 L16 282 Z" fill="#000" opacity=".12"/>'
                 f'<path d="M286 296 L256 304 L254 290 L284 282 Z" fill="#000" opacity=".12"/>')
    hem = '<path d="M68 312 Q150 320 232 312 L232 322 Q150 330 68 322 Z" fill="#000" opacity=".10"/>' if kind == "crew" else ""
    folds = ('<path d="M110 140 Q118 230 104 318" stroke="#000" stroke-opacity=".06" stroke-width="10" fill="none"/>'
             '<path d="M196 150 Q186 240 198 318" stroke="#000" stroke-opacity=".06" stroke-width="12" fill="none"/>'
             '<path d="M150 40 Q152 120 150 200" stroke="#fff" stroke-opacity=".05" stroke-width="18" fill="none"/>')
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340">{shade_defs(uid, base)}
  <clipPath id="c{uid}"><path d="{outline}"/></clipPath>
  <g filter="url(#s{uid})">
    <path d="{outline}" fill="{base}"/>
    <g clip-path="url(#c{uid})">
      {print_art(style, ink)}
      {folds}{cuffs}{hem}
      <rect width="300" height="340" fill="url(#g{uid})"/>
      <rect width="300" height="340" fill="url(#v{uid})"/>
    </g>
    <path d="M120 14 Q150 34 180 14" stroke="#000" stroke-opacity=".28" stroke-width="5" fill="none"/>
    <path d="M114 16 Q150 44 186 16" stroke="#000" stroke-opacity=".10" stroke-width="2" fill="none"/>
  </g>
</svg>
"""


def side_svg(uid, kind, base, ink, style):
    # 侧挂：对折后从侧面看，窄长条 + 袖子的鼓包
    if kind == "tee":
        outline = ("M52 10 Q66 16 74 28 L90 54 Q97 82 92 114 L82 118 L84 318 "
                   "Q60 326 34 318 L30 70 Q32 30 52 10 Z")
        sleeve = '<path d="M74 30 L90 54 Q97 82 92 114 L82 118 Q86 80 74 30 Z" fill="#000" opacity=".16"/>'
    else:
        outline = ("M52 10 Q66 16 74 28 Q90 52 90 90 L92 300 L80 306 L80 320 "
                   "Q58 326 32 318 L30 70 Q32 30 52 10 Z")
        sleeve = '<path d="M74 30 Q90 52 90 90 L92 300 L80 306 L78 120 Q80 70 74 30 Z" fill="#000" opacity=".18"/>'
    edge = ""
    if style in ("camo",):
        edge = print_art(style, ink)
    elif style in ("badge", "serif"):
        edge = (f'<g fill="none" stroke="{ink}" stroke-width="2" opacity=".85">'
                f'<path d="M78 120 Q72 160 80 200"/><path d="M76 150 Q70 170 78 190"/></g>')
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 340">{shade_defs(uid, base)}
  <clipPath id="c{uid}"><path d="{outline}"/></clipPath>
  <g filter="url(#s{uid})">
    <path d="{outline}" fill="{base}"/>
    <g clip-path="url(#c{uid})">
      {edge}
      <path d="M44 80 Q40 200 46 318" stroke="#000" stroke-opacity=".08" stroke-width="8" fill="none"/>
      <path d="M64 120 Q70 220 62 318" stroke="#fff" stroke-opacity=".06" stroke-width="10" fill="none"/>
      {sleeve}
      <rect width="110" height="340" fill="url(#g{uid})"/>
      <rect width="110" height="340" fill="url(#v{uid})"/>
    </g>
  </g>
</svg>
"""


for uid, kind, base, ink, style in ITEMS:
    (OUT / f"{uid}-front.svg").write_text(front_svg(uid + "f", kind, base, ink, style), encoding="utf-8")
    (OUT / f"{uid}-side.svg").write_text(side_svg(uid + "s", kind, base, ink, style), encoding="utf-8")
print("ok", len(ITEMS))
