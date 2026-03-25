from PIL import Image
import os


SOURCE_IMAGE = "myphoto.jpg"  

os.makedirs("icons", exist_ok=True)

for size in [16, 48, 128]:
    img = Image.open(SOURCE_IMAGE)
    img = img.resize((size, size), Image.LANCZOS)
    img.save(f"icons/icon{size}.png")
    print(f"Created icon{size}.png")