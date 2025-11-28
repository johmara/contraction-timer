# Icon Generation Instructions

## Quick Start

1. Open `generate-icons.html` in your web browser
2. Click each "Download PNG" button to save the icons
3. The icons will be downloaded to your downloads folder

## Files to Generate

- `favicon.png` (32x32) - Convert to `.ico` using an online tool like https://convertio.co/png-ico/
- `icon-192.png` (192x192) - PWA icon
- `icon-192-maskable.png` (192x192) - PWA maskable icon with safe zone
- `icon-512.png` (512x512) - PWA icon
- `icon-512-maskable.png` (512x512) - PWA maskable icon with safe zone

## Installation

1. Save all downloaded icons to the `public/` folder
2. For the favicon, convert the PNG to ICO format and save as `public/favicon.ico`
3. Build the project: `npm run build`
4. The icons will be included in your deployment

## Icon Design

The icon features:
- **Clock face**: Represents timing and tracking
- **Heartbeat wave**: Represents contractions/labor
- **Purple gradient**: Matches the app's color scheme (#4A3F5C to #6B5B7D)
- **Sand background**: Matches the app's warm, calming aesthetic (#E8DCC8)

## Maskable Icons

Maskable icons include 10% padding on all sides to ensure the important parts of the icon aren't cropped by various mobile OS icon shapes (circle, squircle, rounded square, etc.).

## Alternative: SVG Icon

If you prefer, you can use `public/icon.svg` directly in some contexts, though PNG/ICO formats are more universally supported for favicons and PWA icons.
