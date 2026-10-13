"""把 AI 生成的「正面 → 转到侧面」视频，做成网站用的转身帧条（侧面 → 正面）。

用法：python -P tools/turn_frames.py <视频.mp4> <输出.webp> [--frames 24] [--end 秒]

前提：视频首帧 = 即梦上传 / first_NN.png（3:4，衣服画布按 0.86 高度、顶部 5% 摆放）。
据此把每帧裁回网站坐标（300×406 单位：顶部 = 挂杆中心上方 16 单位），所以挂钩位置跟网站完全对齐。
--end 不填时自动找第一次窄到正面宽度 30% 的那一帧当终点（--side 0.3 可调）。
"""
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

FF = r"E:\claude工作区\back-to-work-video\tools\ffmpeg.exe"
FIRST_W, FIRST_H = 1440, 1920          # 首帧尺寸
MASTER_W, MASTER_H = 1200, 1624        # 衣服画布母版（300×406 单位 × 4）
SCALE_IN_FIRST = FIRST_H * .86 / MASTER_H
EXTRA = 34                             # 侧挂时布料下垂更长：画布底部多留的单位（网站用 406+34=440 单位高）
OUT_W, OUT_H = 480, round(650 * (406 + EXTRA) / 406)   # 每帧输出尺寸


def read_frames(path):
    probe = subprocess.run([FF, "-hide_banner", "-i", str(path)], capture_output=True, text=True).stderr
    import re
    w, h = map(int, re.search(r"(\d{3,4})x(\d{3,4})", probe.split("Video:")[1]).groups())
    raw = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    return fr, w, h


def crop_box(w, h):
    k = w / FIRST_W                              # 视频像素 / 首帧像素
    gw = MASTER_W * SCALE_IN_FIRST
    x0 = (FIRST_W - gw) / 2
    y0 = round(FIRST_H * .05)
    return x0 * k, y0 * k, gw * k, MASTER_H * SCALE_IN_FIRST * k * (406 + EXTRA) / 406


def matte(frames, session):
    """AI 抠图 + 背景色差抠图取并集：背景是均匀浅灰，色差能补上 AI 漏掉的布料"""
    from rembg import remove
    out = []
    for f in frames:
        a = np.asarray(remove(Image.fromarray(f), session=session, post_process_mask=True))[:, :, 3].astype(np.float32)
        a[a < 14] = 0
        g = f.astype(np.int16)
        bg = np.median(np.concatenate([g[:20].reshape(-1, 3), g[-20:].reshape(-1, 3), g[:, :20].reshape(-1, 3)]), 0)
        d = np.abs(g - bg).max(2).astype(np.float32)
        dm = np.clip((d - 12) / 14, 0, 1) * 255
        near = cv2.dilate((a > 128).astype(np.uint8), np.ones((31, 31), np.uint8)) > 0
        a = np.maximum(a, np.where(near, dm, 0))
        # 补内部洞
        solid = (a > 128).astype(np.uint8)
        inv = 1 - solid
        n, lab = cv2.connectedComponents(inv, connectivity=4)
        edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        a[~np.isin(lab, edge) & (inv > 0)] = 255
        out.append(a)
    return out


def main():
    a = sys.argv[1:]
    n_out = 24
    end_s = None
    if "--frames" in a:
        i = a.index("--frames"); n_out = int(a[i + 1]); del a[i:i + 2]
    side_ratio = .3
    if "--side" in a:
        i = a.index("--side"); side_ratio = float(a[i + 1]); del a[i:i + 2]
    if "--end" in a:
        i = a.index("--end"); end_s = float(a[i + 1]); del a[i:i + 2]
    src, dst = Path(a[0]), Path(a[1])

    frames, w, h = read_frames(src)
    fps = 24
    if end_s is None:
        # 按背景色快速估衣服宽度，找「第一次」转到最侧的那一帧（有的视频会继续转到背面再转回来）
        widths = []
        for f in frames:
            g = f.astype(np.int16)
            bg = np.median(np.concatenate([g[:20].reshape(-1, 3), g[-20:].reshape(-1, 3)]), 0)
            m = (np.abs(g - bg).max(2) > 14)
            widths.append(int((m.sum(0) > 8).sum()))
        widths = np.array(widths)
        # 参考片的「侧挂」不是正 90°：大约是正面宽度的 30%，看得到袖子和木衣架头
        thr = max(widths.min() * 1.05, widths[0] * side_ratio)
        end = int(np.argmax(widths <= thr))
    print("end frame", end, f"({end / fps:.2f}s)")

    pick = np.linspace(end, 0, n_out).round().astype(int)        # 倒放：侧面 → 正面
    sel = [frames[i] for i in pick]
    from rembg import new_session
    session = new_session("isnet-general-use")
    alphas = matte(sel, session)

    x0, y0, cw, ch = crop_box(w, h)
    sprite = Image.new("RGBA", (OUT_W * n_out, OUT_H), (0, 0, 0, 0))
    M = np.float32([[OUT_W / cw, 0, -x0 * OUT_W / cw], [0, OUT_H / ch, -y0 * OUT_H / ch]])
    for k, (f, al) in enumerate(zip(sel, alphas)):
        # 去白边：边缘收 1px，再把半透明像素里混进去的背景灰减掉（背景色已知）
        al = cv2.erode(al, np.ones((3, 3), np.uint8)).astype(np.float32)
        g = f.astype(np.float32)
        bg = np.median(np.concatenate([g[:20].reshape(-1, 3), g[-20:].reshape(-1, 3)]), 0)
        a1 = (al / 255)[..., None]
        fg = np.where(a1 > .03, (g - (1 - a1) * bg) / np.maximum(a1, .03), g)
        f = np.clip(fg, 0, 255).astype(np.uint8)
        rgba = np.dstack([f, al.astype(np.uint8)])
        warped = cv2.warpAffine(rgba, M, (OUT_W, OUT_H), flags=cv2.INTER_AREA, borderValue=(0, 0, 0, 0))
        sprite.paste(Image.fromarray(warped, "RGBA"), (k * OUT_W, 0))
    dst.parent.mkdir(parents=True, exist_ok=True)
    sprite.save(dst, "WEBP", quality=82, method=6)
    print("saved", dst, sprite.size)


if __name__ == "__main__":
    main()
