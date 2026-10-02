# Homepage hero artwork

## Optimized storefront assets

The storefront serves WebP copies of the original PNG artwork. The hero images include smaller candidates selected through `srcSet`; the logo and footer decoration are sized for their rendered dimensions. Original PNGs remain here as source artwork.

To regenerate the WebP files after replacing a PNG, install Pillow and run `python scripts/optimize-public-images.py` from the repository root. Commit the generated files alongside the source changes. The footer decoration loads lazily; the hero retains eager, high-priority loading.

`yaqeen-home-hero.png` is a background adapted from the supplied YAQEEN Meaningful Life Showcase mockup using the built-in image generation tool. It is a close reconstruction; the headline, description and Shop Now link are rendered by the website.

Prompt: Extract only the panoramic top desktop hero photograph, approximately 1536:535. Remove navigation, device presentations, the left headline, paragraph and button, reconstructing the cream background. Preserve the central YAQEEN lettering, right-hand acrylic plaques, plant, books, tabletop, olive foliage and warm sunlight as closely as possible. Leave the left side clear for live website text.

The bundled artwork and mockup copy are defaults. Published homepage fields in the Website editor remain authoritative. The image path uses Vite's base URL for local development and GitHub Pages.

## Footer olive artwork

`yaqeen-footer-olive.png` is a transparent reconstruction of the top-right branch in the supplied Elegant Responsive Footer Mockup, generated with the built-in image tool. The prompt preserves the dark narrow leaves, diagonal woody stems, and soft translucent cast shadows, excludes all text and UI, and tightly frames the foliage. It is a close reconstruction, not a pixel-exact extraction. The footer uses this bundled image for its default and the original stock decoration URL; other custom Website editor image URLs remain supported.
