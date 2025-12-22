# Avatar Prototype

A web-based avatar generator that creates random avatars by combining layered image assets. Users can generate random avatars or manually customize them by selecting specific ingredients for each layer. Avatars can be customized with background colors and downloaded as PNG files.

## What It Does

This application provides two ways to create avatars:

### Random Generation
- Generates random avatars by combining multiple image layers
- Applies configurable inclusion probabilities for optional layers
- Creates unique combinations with each click

### Manual Customization
- Browse and select specific assets for each layer using a tabbed interface
- View real-time thumbnail previews of each option
- Build your avatar ingredient by ingredient
- See immediate visual feedback as you make selections

### Additional Features
- Customizable background colors via color swatches
- Transparent background option (when no color is selected)
- Real-time recipe display showing all selected ingredients
- Export avatars as PNG files with or without background

## How It Works

### Architecture

The application consists of:

1. **`index.html`** - The main HTML structure with:
   - Canvas element for rendering the avatar (1024x1024)
   - Avatar container with floating action buttons (Randomize and Download)
   - Color picker with predefined swatches
   - Tab navigation for layer selection
   - Thumbnail grid for browsing assets
   - Status display and recipe textarea

2. **`app.js`** - The core JavaScript logic that:
   - Loads the manifest and assets index on initialization
   - Builds random "recipes" based on layer requirements and probabilities
   - Renders avatars by compositing layered images on a canvas
   - Generates on-the-fly thumbnail previews using canvas rendering
   - Manages manual ingredient selection via tabbed interface
   - Handles color selection and background updates
   - Caches thumbnails for performance
   - Manages avatar generation and PNG export

3. **`avatar-manifest.json`** - Configuration file defining:
   - Canvas size (1024x1024)
   - Layer definitions with `required` flags
   - Optional layer inclusion probabilities (`includeChance`)
   - Layer rendering order

4. **`assets/index.json`** - Generated index of all available assets organized by layer

5. **`scripts/generate-assets-index.js`** - Node.js script that scans the assets directory and generates the index file

### Layer System

Layers are rendered in the order defined in the manifest:
- **Required layers** (face, eyes, eyebrows, clothes) are always included
- **Optional layers** (hair, earrings, tattoo, sunglasses) can be included or set to "none"
- Each layer can have multiple asset variations that can be selected manually or randomly chosen

### Manual Customization Interface

The manual customization system provides:
- **Tab Navigation**: Button-style tabs for each layer (Face, Eyes, Hair, Earrings, Eyebrows, Tattoo, Sunglasses, Clothes)
- **Thumbnail Grid**: Real-time preview thumbnails generated on-the-fly showing how each option looks with the current avatar
- **Selection State**: Selected ingredients are highlighted with a white outline
- **Real-time Updates**: Avatar updates immediately when selecting ingredients or changing colors
- **Thumbnail Caching**: Thumbnails are cached to avoid regeneration when the recipe hasn't changed

### Color System

- Users can select from predefined color swatches positioned above the tabs
- The selected color is applied to the avatar area background
- The canvas background uses a lighter version of the selected color (10% lightness increase)
- **Transparent Background**: When no color is selected, the canvas background remains transparent (useful for PNG export)
- Color selection updates existing avatars and thumbnails in real-time

### Recipe System

The `currentRecipe` object always reflects the current avatar state:
- Manual selections update the recipe immediately
- Random generation creates a completely new recipe
- The recipe shows which asset file was used for each layer
- The selected background color is included in the recipe display
- Recipe is displayed in a textarea for reference

### Thumbnail Generation

Thumbnails are generated on-the-fly using canvas rendering:
- Each thumbnail is a 128x128 preview showing the current avatar with a specific option applied
- Thumbnails are cached using a recipe hash to avoid regeneration
- Cache is invalidated when the recipe or color changes
- Thumbnails update immediately when colors change

## Usage

### Random Generation
1. Open `index.html` in a web browser
2. (Optional) Select a background color from the color swatches
3. Click the "Randomize" button (bottom right) to create a random avatar
4. View the recipe to see which assets were used
5. Click "Download" (bottom left) to save the avatar as PNG

### Manual Customization
1. Open `index.html` in a web browser
2. (Optional) Select a background color from the color swatches
3. Click on a layer tab (Face, Eyes, Hair, etc.) to browse options
4. Click on a thumbnail to select that ingredient
5. Continue selecting ingredients for other layers
6. The avatar updates in real-time as you make selections
7. Click "Download" to save your custom avatar

### Color Selection
- Click any color swatch to apply it as the background
- The avatar and thumbnails update immediately
- Leave no color selected for a transparent background in the exported PNG

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
6. The new layer will automatically appear as a tab in the interface

### Modifying Layer Probabilities

Edit `avatar-manifest.json` to adjust:
- `required`: Set to `true` for always-included layers, `false` for optional
- `includeChance`: Probability (0.0 to 1.0) that an optional layer will be included in random generation

### Technical Details

- **Canvas Size**: 1024x1024 pixels
- **Thumbnail Size**: 128x128 pixels
- **Thumbnail Cache**: Keyed by layer, asset filename, and recipe hash
- **State Management**: `currentRecipe` is the single source of truth for the current avatar state
- **Background Rendering**: Only rendered when `hasSelectedColor` is true, otherwise transparent
