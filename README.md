# Avatar Prototype

A web-based avatar generator that creates random avatars by combining layered image assets. Users can generate unique avatars with customizable background colors and download them as PNG files.

## What It Does

This application generates random avatars by:
- Combining multiple image layers (face, eyes, hair, earrings, eyebrows, tattoo, sunglasses, clothes)
- Applying configurable inclusion probabilities for optional layers
- Allowing users to select background colors
- Displaying the "recipe" (which assets were used) for each generated avatar
- Exporting avatars as PNG files

## How It Works

### Architecture

The application consists of:

1. **`index.html`** - The main HTML structure with:
   - Canvas element for rendering the avatar
   - Color picker with predefined swatches
   - Generate and download buttons
   - Status display and recipe textarea

2. **`app.js`** - The core JavaScript logic that:
   - Loads the manifest and assets index on initialization
   - Builds random "recipes" based on layer requirements and probabilities
   - Renders avatars by compositing layered images on a canvas
   - Handles color selection and background updates
   - Manages avatar generation and PNG export

3. **`avatar-manifest.json`** - Configuration file defining:
   - Canvas size (1024x1024)
   - Layer definitions with `required` flags
   - Optional layer inclusion probabilities (`includeChance`)

4. **`assets/index.json`** - Generated index of all available assets organized by layer

5. **`scripts/generate-assets-index.js`** - Node.js script that scans the assets directory and generates the index file

### Layer System

Layers are rendered in the order defined in the manifest:
- **Required layers** (face, eyes, eyebrows, clothes) are always included
- **Optional layers** (hair, earrings, tattoo, sunglasses) are included based on their `includeChance` probability
- Each layer can have multiple asset variations that are randomly selected

### Color System

- Users can select from predefined color swatches
- The selected color is applied to the avatar area background
- The canvas background uses a lighter version of the selected color (10% lightness increase)
- Color selection updates existing avatars in real-time

### Recipe System

Each generated avatar has a "recipe" that shows:
- Which asset file was used for each layer
- The selected background color
- This recipe is displayed in a textarea for reference

## Usage

1. Open `index.html` in a web browser
2. (Optional) Select a background color from the color swatches
3. Click "Generate avatar" to create a random avatar
4. View the recipe to see which assets were used
5. Click "Download PNG" to save the avatar

## Development

### Generating the Assets Index

After adding or removing assets, regenerate the index:

```bash
node scripts/generate-assets-index.js
```

This script:
- Scans the `assets/` directory for each layer folder
- Finds all PNG files in each folder
- Generates `assets/index.json` with the complete asset list

### Adding New Layers

1. Create a new folder in `assets/` with your layer name
2. Add PNG assets to that folder
3. Update `avatar-manifest.json` to include the new layer definition
4. Update `scripts/generate-assets-index.js` to include the new layer in `layerFolders`
5. Regenerate the assets index

### Modifying Layer Probabilities

Edit `avatar-manifest.json` to adjust:
- `required`: Set to `true` for always-included layers, `false` for optional
- `includeChance`: Probability (0.0 to 1.0) that an optional layer will be included
