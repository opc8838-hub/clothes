# your present

衣架作品集网站：T 恤挂在不锈钢挂杆上、转开约 72°；鼠标移上去会在 3D 里转回正面、两边的衣服被挤开晃动；点击后放大看详情，用左右箭头切换。

纯静态网页，不需要安装任何东西。线上地址：https://opc8838-hub.github.io/clothes/

## 本地预览

```
python -m http.server 8765
```

然后用浏览器打开 http://127.0.0.1:8765

## 加 / 换衣服（三步）

1. **抠图**：白底正面 T 恤照片放进一个文件夹，运行
   ```
   python -P tools/cutout.py <照片文件夹> <抠图输出文件夹>
   ```
   白色、浅色衣服如果被抠坏，加 `--flood 03,05`（写文件名）改用填充法。
2. **加衣架**：
   ```
   python tools/build_garments.py <抠图输出文件夹> assets/clothes
   ```
   会生成 `assets/clothes/NN.webp`（正面 + 红木衣架 + 金属挂钩）。
3. **登记**：打开 `data/products.js`，加一行：名字 `name`、图片 `img`、挂着时转开的角度 `rest`。

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
