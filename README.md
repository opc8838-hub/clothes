# your present

衣架作品集网站：T 恤侧挂在不锈钢挂杆上；鼠标移上去，逐帧播放 AI 生成的真实转身（侧面 → 正面），两边的衣服被挤开晃动；点击后放大看详情，用左右箭头切换。

纯静态网页，不需要安装任何东西。线上地址：https://opc8838-hub.github.io/clothes/

## 本地预览

```
python -m http.server 8765
```

然后用浏览器打开 http://127.0.0.1:8765

## 加 / 换衣服

1. **抠图**：白底正面 T 恤照片放进一个文件夹，运行
   ```
   python -P tools/cutout.py <照片文件夹> <抠图输出文件夹>
   ```
   白色、浅色衣服如果被抠坏，加 `--flood 03,05`（写文件名）改用填充法。
2. **加衣架**（详情页用的正面图）：
   ```
   python tools/build_garments.py <抠图输出文件夹> assets/clothes <母版文件夹>
   ```
3. **生成转身视频**：把母版放到 3:4 浅灰底（高度 86%、顶部留 5%）当首帧，用 MiniMax-H3-Max 图生视频，
   提示词让衣服「从正面转约 90° 到侧面，正面转向画面左边」，5 秒。
4. **做转身帧条**（侧面 → 正面，24 帧，自动找第一次转到侧面的那一刻）：
   ```
   python -P tools/turn_frames.py <视频.mp4> assets/turn/NN.webp
   ```
   如果自动找的终点不对，加 `--end 秒数` 手动指定。
5. **登记**：在 `data/products.js` 加一行：`name`、`img`、`turn`、`frames`。

需要的 Python 包：`rembg`、`opencv-python`、`numpy`、`Pillow`、`scipy`。

## 常改的地方

| 想改什么 | 在哪改 |
|---|---|
| 主色（logo、文字、按钮） | `css/style.css` 顶部 `--ink` |
| 跑马灯颜色 | `css/style.css` 顶部 `--bar`、`--bar-ink` |
| 跑马灯文字 | `js/app.js` 里的 `unit` |
| 衣服大小 | `css/style.css` 顶部 `--gh` |
| 衣服顺序 / 名字 | `data/products.js` |
| About / Contact / Availability 文字 | `index.html` 底部的三个 `<template>` |
| Logo | 替换 `assets/logo.png`（黑色字、透明底） |
