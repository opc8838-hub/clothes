import sys
from PIL import Image, ImageOps
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("L")
inv = ImageOps.invert(im)
# alpha: dark ink -> opaque; soften threshold
a = inv.point(lambda v: 0 if v < 30 else min(255, int((v-30)*255/170)))
bbox = a.getbbox()
pad = 24
bbox = (max(0,bbox[0]-pad), max(0,bbox[1]-pad), min(im.width,bbox[2]+pad), min(im.height,bbox[3]+pad))
a = a.crop(bbox)
rgba = Image.new("RGBA", a.size, (0,0,0,0))
rgba.putalpha(a)
solid = Image.new("RGBA", a.size, (0,0,0,255)); solid.putalpha(a)
solid.save(out)
print(bbox, a.size)
