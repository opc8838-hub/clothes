"""把白底 T 恤正面图抠成透明底，并统一画布：300:340 比例，领口贴顶、左右居中。

用法：python tools/cutout.py <原图文件夹> <输出文件夹> [--flood 03,05]
原图按文件名排序，输出同名 PNG。
--flood 指定的图不用 AI，改用「从四周白底往里填充」：适合白色 / 浅色衣服（AI 容易把衣服当背景）。
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

args = sys.argv[1:]
flood = set()
if "--flood" in args:
    k = args.index("--flood")
    flood = set(args[k + 1].split(","))
    del args[k:k + 2]
src, out = Path(args[0]), Path(args[1])
out.mkdir(parents=True, exist_ok=True)

W, H = 1200, 1360          # 300:340
TOP = 24                   # 领口离画布顶部


def ai_alpha(im):
    from rembg import new_session, remove
    global _session
    if "_session" not in globals():
        _session = new_session("isnet-general-use")
    a = np.asarray(remove(im, session=_session, post_process_mask=True))[:, :, 3].astype(np.float32)
    a[a < 12] = 0
    # 衣服内部被误判成背景的洞（深色印花常见）补实
    solid = (a > 128).astype(np.uint8)
    inv = 1 - solid
    n, lab = cv2.connectedComponents(inv, connectivity=4)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    a[~np.isin(lab, edge) & (inv > 0)] = 255
    return a.astype(np.uint8)


def flood_alpha(im):
    rgb = np.asarray(im).astype(np.float32)
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    bg_like = ((lum >= 250.5) & (sat <= 6)).astype(np.uint8)
    n, lab = cv2.connectedComponents(bg_like, connectivity=4)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0]) & (bg_like > 0)
    fg = (~bg).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
    keep = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    fg = (lab == keep).astype(np.uint8)
    # 补洞（印花里的白色）
    inv = (1 - fg).astype(np.uint8)
    n, lab = cv2.connectedComponents(inv, connectivity=4)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    fg[~np.isin(lab, edge) & (inv > 0)] = 1
    # 边缘 2px 按亮度做柔边
    band = cv2.dilate(fg, np.ones((5, 5), np.uint8)) - cv2.erode(fg, np.ones((5, 5), np.uint8))
    soft = np.clip((253.5 - lum) / 7.0, 0, 1)
    a = fg.astype(np.float32)
    a[band > 0] = np.minimum(soft[band > 0], cv2.dilate(fg, np.ones((3, 3), np.uint8))[band > 0])
    return (a * 255).astype(np.uint8)


for f in sorted(src.glob("*.png")):
    im = Image.open(f).convert("RGB")
    a = flood_alpha(im) if f.stem in flood else ai_alpha(im)
    alpha = Image.fromarray(a).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.6))
    rgba = im.convert("RGBA")
    rgba.putalpha(alpha)
    rgba = rgba.crop(alpha.getbbox())
    s = min(W / rgba.width, (H - TOP) / rgba.height)
    rgba = rgba.resize((round(rgba.width * s), round(rgba.height * s)), Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(rgba, ((W - rgba.width) // 2, TOP))
    canvas.save(out / f.name)
    print(f.name, "flood" if f.stem in flood else "ai", rgba.size)
