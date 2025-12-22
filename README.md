# Avatar Prototype

A web-based avatar generator that creates random avatars by combining layered image assets. Users can generate random avatars or manually customize them by selecting specific ingredients for each layer. Avatars can be customized with background colors and downloaded as PNG files.

## What It Does

This application provides two ways to create avatars:

### Random Generation
- Generates random avatars by combining multiple image layers
- **Color Mode Selection**: For layers with color modes, randomly selects a mode first, then a random asset from that mode
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

4. **`assets/index.json`** - Generated index of all available assets organized by layer. Supports both flat structure (for layers without modes) and nested structure (for layers with color modes):
   ```json
   {
     "face": {
       "dark": ["01.png", "02.png", ...],
       "light": ["01.png", "02.png", ...]
     },
     "eyes": ["01.png", "02.png"]
   }
   ```

5. **`scripts/generate-assets-index.js`** - Node.js script that scans the assets directory and generates the index file

### Layer System

Layers are rendered in the order defined in the manifest:
- **Required layers** (face, eyes, eyebrows, clothes) are always included
- **Optional layers** (hair, earrings, tattoo, sunglasses) can be included or set to "none"
- Each layer can have multiple asset variations that can be selected manually or randomly chosen

### Color Mode System

Some layers support color modes (variants organized by color theme):
- **Layers with color modes** use subfolder organization (e.g., `assets/face/dark/`, `assets/face/light/`)
- **Layers without modes** use flat structure (e.g., `assets/eyes/01.png`)
- **Automatic Detection**: The system automatically detects if a layer has color modes by checking for subfolders
- **Mode Selection**: When viewing a layer with color modes, users first select a color mode (e.g., "Dark" or "Light"), then see thumbnails for that mode only
- **Current Implementation**: Face (dark/light) and Eyebrows (color2/color3) use color modes
- **Future Extensibility**: Hair and other layers can easily be converted to use color modes by organizing assets into subfolders

### Manual Customization Interface

The manual customization system provides:
- **Tab Navigation**: Button-style tabs for each layer (Face, Eyes, Hair, Earrings, Eyebrows, Tattoo, Sunglasses, Clothes)
- **Color Mode Selector**: For layers with color modes, mode buttons appear above the thumbnail grid (e.g., "Dark", "Light")
- **Thumbnail Grid**: Real-time preview thumbnails generated on-the-fly showing how each option looks with the current avatar
- **Mode Filtering**: Thumbnails are filtered by the selected color mode, showing only assets from that mode
- **Selection State**: Selected ingredients are highlighted with a white outline
- **Real-time Updates**: Avatar updates immediately when selecting ingredients, modes, or changing colors
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
- **Mode Format**: For layers with color modes, recipes include the mode (e.g., `face: dark/01.png` or `eyebrows: color2/001.png`)
- **Flat Format**: For layers without modes, recipes show just the filename (e.g., `eyes: 01.png`)
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
4. **For layers with color modes** (Face, Eyebrows): Select a color mode first (e.g., "Dark" or "Light")
5. Click on a thumbnail to select that ingredient
6. Continue selecting ingredients for other layers
7. The avatar updates in real-time as you make selections
8. Click "Download" to save your custom avatar

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
- **Detects color modes**: If a layer folder contains subfolders, it treats them as color modes
- **Flat structure**: If a layer folder contains PNGs directly, it creates a flat array
- **Nested structure**: If a layer folder contains subfolders, it creates a nested object with mode names as keys
- Generates `assets/index.json` with the complete asset list in the appropriate format

### Adding New Layers

1. Create a new folder in `assets/` with your layer name
2. Add PNG assets to that folder (either directly or in color mode subfolders)
3. Update `avatar-manifest.json` to include the new layer definition
4. Update `scripts/generate-assets-index.js` to include the new layer in `layerFolders`
5. Regenerate the assets index
6. The new layer will automatically appear as a tab in the interface

### Adding Color Modes to Existing Layers

To convert a layer to use color modes:

1. **Organize assets into subfolders**: Create subfolders within the layer folder (e.g., `assets/face/dark/`, `assets/face/light/`)
2. **Move and rename files**: Move PNG files into the appropriate subfolder and remove the mode prefix from filenames (e.g., `dark-01.png` → `dark/01.png`)
3. **Regenerate index**: Run `node scripts/generate-assets-index.js` to update the asset index
4. **Automatic detection**: The system will automatically detect the color modes and show the mode selector in the UI

**Example structure:**
```
assets/
  face/
    dark/
      01.png, 02.png, 03.png...
    light/
      01.png, 02.png, 03.png...
  eyebrows/
    color2/
      001.png, 002.png...
    color3/
      001.png, 002.png...
```

### Modifying Layer Probabilities

Edit `avatar-manifest.json` to adjust:
- `required`: Set to `true` for always-included layers, `false` for optional
- `includeChance`: Probability (0.0 to 1.0) that an optional layer will be included in random generation

### Technical Details

- **Canvas Size**: 1024x1024 pixels
- **Thumbnail Size**: 128x128 pixels
- **Thumbnail Cache**: Keyed by layer, asset filename, and recipe hash
- **State Management**: 
  - `currentRecipe` is the single source of truth for the current avatar state
  - `selectedColorModes` tracks the selected color mode for each layer with modes
- **Path Handling**: The system handles both flat paths (`assets/eyes/01.png`) and mode-based paths (`assets/face/dark/01.png`)
- **Background Rendering**: Only rendered when `hasSelectedColor` is true, otherwise transparent
- **Mode Detection**: Color modes are automatically detected by checking if a layer folder contains subfolders vs. PNG files directly
