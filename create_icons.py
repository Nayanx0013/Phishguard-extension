
from PIL import Image, ImageDraw
import os

os.makedirs("icons", exist_ok=True)

for size in [16, 48, 128]:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([2, 2, size-2, size-2], fill=(220, 50, 50, 255))
    img.save(f"icons/icon{size}.png")

print("Icons created!")