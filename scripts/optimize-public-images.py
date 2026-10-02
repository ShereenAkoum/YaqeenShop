"""Regenerate storefront WebP assets from the original PNGs (requires Pillow)."""
from pathlib import Path
from PIL import Image

image_dir = Path(__file__).resolve().parents[1] / 'public' / 'images'
assets = {
    'yaqeen-home-hero': (1536, 960),
    'yaqeen-our-story': (1024, 640),
    'yaqeen-footer-olive': (560,),
    'Logo': (480,),
}
for name, widths in assets.items():
    source = image_dir / f'{name}.png'
    with Image.open(source) as original:
        original.load()
        for index, width in enumerate(widths):
            image = original.copy()
            image.thumbnail((width, original.height), Image.Resampling.LANCZOS)
            suffix = '' if index == 0 else '-mobile'
            target = image_dir / f'{name}{suffix}.webp'
            image.save(target, 'WEBP', quality=85, method=6)
            print(f'{target.name}: {image.width}x{image.height}, {target.stat().st_size:,} bytes')
