# your present

衣架作品集网站：浅灰色陈列空间中的 T 恤作品集。默认中间灰色 T 恤正面展开，其他衣服侧挂，悬停时逐帧转身、相邻衣服轻微让位；移开后保留当前款式，点击居中查看详情和放大原图。

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
| 陈列配色、光影、响应式布局 | `css/studio.css` |
| 衣服大小 | `css/studio.css` 顶部 `--gh` |
| 衣服顺序 / 名字 | `data/products.js` |
| About / Contact / Availability 文字 | `index.html` 底部的三个 `<template>` |
| Logo | 替换 `assets/logo.png`（黑色字、透明底） |

## Studio 优化版

- 保留原有品牌、9 款衣服和转身帧素材；没有引入前端框架或实时 3D 引擎。
- 参考原作的留白和比例：浅灰礼物纹样背景、不锈钢挂杆的环境反射、套筒亮边与斜槽螺丝；保留黑白走马灯。
- 详情左侧展示原始正面图，右侧显示名称、简介、系列与发售信息，背景衣架淡化虚焦；支持放大、左右循环切换和返回，手机端信息排列在衣服下方。
- 手机可横向浏览衣杆并点开衣服；支持键盘焦点约束与减少动态效果。
- 衣服动画静止后停止 requestAnimationFrame，页面隐藏时暂停。
- `css/studio.css` 保存展示层样式，`css/style.css` 保留原始组件与素材坐标基础。

也可以用 Node 启动本地预览：

```sh
node tools/preview.mjs
```

浏览器打开 http://127.0.0.1:8765 。上传到 GitHub Pages 时仍只需要静态文件，无需构建。

当前仍使用已有二维照片和 AI 转身帧；原始素材的抠图边缘及转身形变不会被 CSS 真正修复。若后续制作 Blender 资产，可用相同画布、挂点和帧数替换 `assets/turn`，并同步导出同视角的正面图。


## 服装 AI 演示

完整演示站：[虎门服装 AI 演示](https://opc8838-hub.github.io/clothes/humen-ai-talk/#03)。原服装展厅继续保留。

15 页演示、九镜首帧、S03/S06 尾帧及 S04 实际视频。当前只有 S04 是已生成视频，九镜成片尚未生成。

完整站点包位于 [GitHub Releases](https://github.com/opc8838-hub/clothes/releases/tag/humen-ai-talk-2026-10-20)。

网站由 `.github/workflows/pages.yml` 自动发布。`tools/build-pages.py` 从上述 Release 下载完整演示站并保留原服装展厅；无需通过 Git 重复上传大体积媒体。


## 已完成三镜成片

[直接播放12秒短片](https://opc8838-hub.github.io/clothes/humen-ai-talk/film.html)：街头行走 → 侧身回望 → 车旁站定，三个真实生成镜头，每镜4秒。页面提供MP4下载。

本次增量源文件位于 [三镜版本 Release](https://github.com/opc8838-hub/clothes/releases/tag/humen-three-shot-2026-10-21)。构建脚本校验原站点包及增量包的 SHA256，随后生成包含全部新视频的完整站点下载包。
