# your present

衣架作品集网站：衣服侧挂在挂杆上，鼠标移上去会转成正面、两边的衣服被挤开；点击后放大看详情，用左右箭头切换。

纯静态网页，不需要安装任何东西。

## 本地预览

在这个文件夹里运行：

```
python -m http.server 8765
```

然后用浏览器打开 http://127.0.0.1:8765

## 换成自己的衣服

1. 每件衣服准备两张 **透明底 PNG**：
   - `xx-front.png`：正面平挂（领口朝上、衣服居中）
   - `xx-side.png`：侧挂（对折后从侧面看）
   - 比例尽量接近：正面图 300:340，侧面图 110:340，领口贴着图片顶部
2. 放进 `assets/clothes/`
3. 打开 `data/products.js`，改 `name`（名字）、`front`、`side` 三项
4. 如果照片里已经有衣架，把那件的 `hanger` 改成 `false`

现在仓库里的是代码画的占位衣服（`.svg`），由 `tools/make_placeholders.py` 生成。

## 常改的地方

| 想改什么 | 在哪改 |
|---|---|
| 品牌色（logo、文字、按钮） | `css/style.css` 顶部 `--ink` |
| 底部跑马灯颜色 | `css/style.css` 顶部 `--bar` |
| 衣服大小 | `css/style.css` 顶部 `--gh` |
| 跑马灯文字 | `js/app.js` 最后的 `unit` |
| About / Contact / Availability 文字 | `index.html` 底部的三个 `<template>` |
| Logo | 替换 `assets/logo.png`（黑色字、透明底） |
