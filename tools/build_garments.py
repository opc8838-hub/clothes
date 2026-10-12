"""把抠好的正面 T 恤（cutout.py 的输出）渲染成网站用图：NN.webp = 正面 + 红木衣架 + 金属挂钩。
网站上把这张图在 3D 里转到约 72° 当作「侧挂」，悬停时转回正面。

坐标：1 单位 = 衣服高 / 340。图片顶部 = 挂杆中心上方 16 单位；衣服原点 = 挂杆中心下方 50 单位。
图片 300×406 单位。

用法：python tools/build_garments.py <抠图文件夹> <输出文件夹> [母版文件夹]
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

U = 4                      # 母版：每单位 4px
FW, SW, HT = 300, 110, 406
OY, ROD = 66, 16           # 衣服原点 / 挂杆中心，距图片顶部（单位）
WEB_SCALE = .75            # 网站用图缩放

WOOD = [(0, (168, 82, 58)), (.1, (136, 50, 34)), (.32, (104, 33, 22)), (.68, (76, 22, 14)), (1, (42, 11, 7))]
CHROME = [(0, (96, 96, 102)), (.22, (226, 226, 230)), (.4, (250, 250, 252)), (.62, (160, 160, 166)), (1, (88, 88, 94))]


def ramp(t, stops):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,), np.float32)
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        m = (t >= t0) & (t <= t1)
        k = ((t[m] - t0) / (t1 - t0))[:, None]
        out[m] = np.array(c0) * (1 - k) + np.array(c1) * k
    return out


def noise(h, w, sy, sx, seed):
    rng = np.random.default_rng(seed)
    n = rng.standard_normal((int(h / sy) + 4, int(w / sx) + 4)).astype(np.float32)
    n = cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)
    return (n - n.mean()) / (n.std() + 1e-6)


def poly(h, w, pts, ss=4):
    im = Image.new("L", (w * ss, h * ss), 0)
    ImageDraw.Draw(im).polygon([(x * ss, y * ss) for x, y in pts], fill=255)
    return np.asarray(im.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255


def catmull(pts, n=12):
    pts = np.array(pts, np.float32)
    P = np.vstack([pts[-1], pts, pts[0], pts[1]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return [tuple(p) for p in out]


def wire(h, w, pts, width):
    """金属丝：深色描边 + 中间调 + 一道高光"""
    ss = 4
    im = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for col, f, off in [((74, 74, 80), 1, 0), ((168, 168, 174), .66, 0), ((246, 246, 248), .26, -.18)]:
        lw = max(1, int(width * f * ss))
        q = [((x + off * width) * ss, y * ss) for x, y in pts]
        d.line(q, fill=col + (255,), width=lw, joint="curve")
        for x, y in (q[0], q[-1]):
            r = lw / 2
            d.ellipse([x - r, y - r, x + r, y + r], fill=col + (255,))
    return np.asarray(im.resize((w, h), Image.LANCZOS)).astype(np.float32)


def hook_path(x0, y_from, r):
    """从衣架顶部竖直往上，到挂杆上方弯一个小钩（像问号的上半截）"""
    rod_y = ROD * U
    cy, R = rod_y - 1.5 * U, r * U
    pts = [(x0, y_from), (x0, cy)]
    for a in np.linspace(np.pi, np.pi * 2.25, 40):
        pts.append((x0 + R + R * np.cos(a), cy + R * np.sin(a)))
    return pts


def over(dst, src):
    """dst/src: float RGBA 0-255"""
    src = np.nan_to_num(src)
    a = src[..., 3:4] / 255
    dst[..., :3] = src[..., :3] * a + dst[..., :3] * (1 - a)
    dst[..., 3:4] = 255 * (a + dst[..., 3:4] / 255 * (1 - a))
    return dst


def contact_shadow(shirt_a, strength=.4, reach=2.5):
    d = cv2.distanceTransform((shirt_a < .5).astype(np.uint8), cv2.DIST_L2, 5)
    return 1 - strength * np.exp(-d / (reach * U))


def ferrule(h, w, x0, y_top, half_w, height):
    m = poly(h, w, [(x0 - half_w, y_top), (x0 + half_w, y_top), (x0 + half_w, y_top + height), (x0 - half_w, y_top + height)])
    X = np.arange(w, dtype=np.float32)[None, :].repeat(h, 0)
    col = ramp((X - (x0 - half_w)) / (2 * half_w), CHROME)
    return np.dstack([col, m * 255])


# ---------------------------------------------------------------- 正面
def render_front(cut, seed):
    Wc, Hc = FW * U, HT * U
    shirt = np.zeros((Hc, Wc, 4), np.float32)
    shirt[OY * U:OY * U + cut.shape[0]] = cut
    a = shirt[..., 3] / 255
    has = (a > .5).any(0)
    top = np.where(has, (a > .5).argmax(0), Hc).astype(np.float32)
    x0 = Wc // 2
    yc = top[x0 - 2 * U:x0 + 2 * U].mean()
    yt = yc - 15 * U                                        # 衣架顶（中间）
    ks = []
    for dx in range(12 * U, 128 * U, U):
        for x in (x0 - dx, x0 + dx):
            if has[x]:
                ks.append((top[x] + 2.5 * U - yt) / dx)
    k = float(np.clip(max(ks), .3, .9))

    # 木衣架：一整块，顶部圆拱 + 挂钩处小凸起，中间厚两头薄
    R = 7 * U
    span = 130 * U

    def ytop(dx):
        dx = np.asarray(dx, np.float32)
        return yt + k * (np.sqrt(dx ** 2 + R ** 2) - R) - 3 * U * np.exp(-(dx / (3.2 * U)) ** 2)

    def thick(dx):
        q = np.clip(np.abs(np.asarray(dx, np.float32)) / span, 0, 1)
        return (9 + 9 * np.exp(-(q / .12) ** 2)) * U

    xs = np.linspace(-span, span, 260)
    upper = [(x0 + dx, float(ytop(dx))) for dx in xs]
    lower = [(x0 + dx, float(ytop(dx) + thick(dx))) for dx in xs[::-1]]
    tip = lambda sgn: [(x0 + sgn * (span + 4.5 * U * np.sin(t)), float(ytop(span) + thick(span) * (1 - np.cos(t)) / 2))
                       for t in np.linspace(0, np.pi, 12)]
    wood_a = poly(Hc, Wc, upper + tip(1) + lower + tip(-1)[::-1])
    Y, X = np.mgrid[0:Hc, 0:Wc].astype(np.float32)
    DX = X - x0
    T = (Y - ytop(DX)) / thick(DX)
    col = ramp(T, WOOD)
    col += 75 * np.exp(-((T - .13) / .06) ** 2)[..., None] * np.clip(1 - np.abs(DX) / span, 0, 1)[..., None] ** .5
    col += 40 * np.exp(-((DX + 1.2 * U) / (1.6 * U)) ** 2 - ((T - .3) / .35) ** 2)[..., None]   # 凸起高光
    col *= (1 + .06 * noise(Hc, Wc, 1.5 * U, 30 * U, seed))[..., None]
    col *= contact_shadow(a)[..., None]
    layer = np.zeros((Hc, Wc, 4), np.float32)
    layer = over(layer, np.dstack([np.clip(col, 0, 255), wood_a * 255]))
    layer = over(layer, wire(Hc, Wc, hook_path(x0, yt - 6 * U, 6), 2.1 * U))
    layer = over(layer, ferrule(Hc, Wc, x0, yt - 7.5 * U, 2.8 * U, 4.5 * U))
    return over(layer, shirt), dict(top=top, yc=yc, has=has, a=a)


def save(arr, path_master, path_web):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    if path_master:
        im.save(path_master)
    w, h = round(im.width * WEB_SCALE), round(im.height * WEB_SCALE)
    im.resize((w, h), Image.LANCZOS).save(path_web, "WEBP", quality=88, method=6)


if __name__ == "__main__":
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    master = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    out.mkdir(parents=True, exist_ok=True)
    if master:
        master.mkdir(parents=True, exist_ok=True)
    for i, f in enumerate(sorted(src.glob("*.png"))):
        cut = np.asarray(Image.open(f).convert("RGBA")).astype(np.float32)
        front, info = render_front(cut, 100 + i)
        save(front, master / f"{f.stem}.png" if master else None, out / f"{f.stem}.webp")
        print(f.stem, "ok")
