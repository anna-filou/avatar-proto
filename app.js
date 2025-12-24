const canvas = document.getElementById('avatarCanvas');
const ctx = canvas.getContext('2d');
const avatarArea = document.getElementById('avatarArea');
const generateBtn = document.getElementById('generateBtn');
const saveBtn = document.getElementById('saveBtn');
const statusText = document.getElementById('statusText');
const recipeText = document.getElementById('recipeText');

let manifest = null;
let assetsIndex = null;
let currentRecipe = null;
let selectedBackgroundColor = '#3a3a3a';
let canvasBackgroundColor = null;
let placeholderImage = null;
let hasSelectedColor = false;
let activeTab = null;
let thumbnailCache = {};
let selectedColorModes = {};

// Color mapping for color modes (mode name -> hex color)
const colorModeColors = {
  // Face modes
  '01': '#FFCBA5',  // Light skin tone
  '02': '#C17A59',  // Medium-light skin tone
  '03': '#8F4F33',  // Medium skin tone
  '04': '#622B1A',  // Dark skin tone (saddle brown)
  
  // Eyebrow modes
  'color2': '#654321', // Darker brown
  'color3': '#3D2817'  // Dark brown
};

// Convert hex to HSL and add lightness
function lightenColor(hex, lightnessDelta) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  // Add lightness
  l = Math.min(100, Math.max(0, (l * 100) + lightnessDelta));
  
  // Convert back to hex
  const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s);
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = (l / 100) - c / 2;
  
  let r2, g2, b2;
  if (h < 1/6) {
    r2 = c; g2 = x; b2 = 0;
  } else if (h < 2/6) {
    r2 = x; g2 = c; b2 = 0;
  } else if (h < 3/6) {
    r2 = 0; g2 = c; b2 = x;
  } else if (h < 4/6) {
    r2 = 0; g2 = x; b2 = c;
  } else if (h < 5/6) {
    r2 = x; g2 = 0; b2 = c;
  } else {
    r2 = c; g2 = 0; b2 = x;
  }
  
  r2 = Math.round((r2 + m) * 255);
  g2 = Math.round((g2 + m) * 255);
  b2 = Math.round((b2 + m) * 255);
  
  return '#' + [r2, g2, b2].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Initialize canvas size
function initCanvas() {
  canvas.width = 1024;
  canvas.height = 1024;
}

// Load and display placeholder image
function loadPlaceholder() {
  const img = new Image();
  img.onload = () => {
    placeholderImage = img;
    drawPlaceholder();
  };
  img.onerror = () => {
    console.warn('Placeholder image not found');
    placeholderImage = null;
    // Draw background only if user has selected a color
    if (hasSelectedColor && canvasBackgroundColor) {
      ctx.fillStyle = canvasBackgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };
  img.src = 'assets/avatar-placeholder.png';
}

// Draw placeholder with current background color
function drawPlaceholder() {
  if (placeholderImage) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw background color only if user has selected a color
    if (hasSelectedColor && canvasBackgroundColor) {
      ctx.fillStyle = canvasBackgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(placeholderImage, 0, 0, canvas.width, canvas.height);
  } else {
    // Draw background only if user has selected a color
    if (hasSelectedColor && canvasBackgroundColor) {
      ctx.fillStyle = canvasBackgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
}

// Fetch manifest and assets index
async function loadData() {
  try {
    const [manifestRes, assetsRes] = await Promise.all([
      fetch('avatar-manifest.json'),
      fetch('assets/index.json')
    ]);
    
    if (!manifestRes.ok || !assetsRes.ok) {
      throw new Error('Failed to load configuration files');
    }
    
    manifest = await manifestRes.json();
    assetsIndex = await assetsRes.json();
    
    initCanvas();
    // Don't initialize canvas background color unless user has selected a color
    // This keeps the canvas transparent until a color is chosen
    avatarArea.style.backgroundColor = selectedBackgroundColor;
    loadPlaceholder();
    statusText.textContent = 'Ready';
    
    // Setup tab navigation after data is loaded
    setupTabNavigation();
  } catch (error) {
    statusText.textContent = 'Error: ' + error.message;
    console.error(error);
  }
}

// Update recipe display
function updateRecipeDisplay() {
  if (!currentRecipe) return;
  
  const recipeLines = manifest.layers.map(layer => {
    const filename = currentRecipe[layer.name];
    return `${layer.name}: ${filename || 'none'}`;
  });
  // Add color to recipe
  const colorLine = `color: ${hasSelectedColor ? selectedBackgroundColor : 'none'}`;
  recipeText.value = recipeLines.join('\n') + '\n' + colorLine;
}

// Select a weighted random mode based on modeChances in manifest
function selectWeightedMode(layer, modes) {
  if (modes.length === 0) return null;
  
  // Check if layer has modeChances defined
  if (layer.modeChances && typeof layer.modeChances === 'object') {
    // Use weighted selection based on modeChances
    const random = Math.random();
    let cumulative = 0;
    
    // Normalize probabilities to ensure they sum to 1
    const total = Object.values(layer.modeChances).reduce((sum, chance) => sum + chance, 0);
    
    for (const mode of modes) {
      const chance = (layer.modeChances[mode] || 0) / total;
      cumulative += chance;
      if (random < cumulative) {
        return mode;
      }
    }
    // Fallback to last mode if rounding errors occur
    return modes[modes.length - 1];
  } else {
    // No modeChances defined, use equal probability
    return modes[Math.floor(Math.random() * modes.length)];
  }
}

// Build a random recipe
function buildRecipe() {
  const recipe = {};
  
  manifest.layers.forEach(layer => {
    const layerName = layer.name;
    
    if (layer.required) {
      if (hasColorModes(layerName)) {
        // Layer has color modes: pick random mode first, then random asset
        const modes = getColorModes(layerName);
        if (modes.length === 0) {
          throw new Error(`Required layer "${layerName}" has no color modes`);
        }
        // Use weighted selection if modeChances are defined, otherwise random
        const selectedMode = selectWeightedMode(layer, modes);
        const files = getAssetsForMode(layerName, selectedMode);
        if (files.length === 0) {
          throw new Error(`Required layer "${layerName}" mode "${selectedMode}" has no assets`);
        }
        const randomAssetIndex = Math.floor(Math.random() * files.length);
        recipe[layerName] = `${selectedMode}/${files[randomAssetIndex]}`;
        selectedColorModes[layerName] = selectedMode;
      } else {
        // Layer without modes: pick random asset
        const files = getAllAssetsForLayer(layerName);
        if (files.length === 0) {
          throw new Error(`Required layer "${layerName}" has no assets`);
        }
        const randomIndex = Math.floor(Math.random() * files.length);
        recipe[layerName] = files[randomIndex];
      }
    } else {
      // Optional layer
      const shouldInclude = layer.includeChance !== undefined 
        ? Math.random() < layer.includeChance 
        : Math.random() < 0.5;
      
      if (shouldInclude) {
        if (hasColorModes(layerName)) {
          // Layer has color modes: pick random mode first, then random asset
          const modes = getColorModes(layerName);
          if (modes.length > 0) {
            // Use weighted selection if modeChances are defined, otherwise random
            const selectedMode = selectWeightedMode(layer, modes);
            const files = getAssetsForMode(layerName, selectedMode);
            if (files.length > 0) {
              const randomAssetIndex = Math.floor(Math.random() * files.length);
              recipe[layerName] = `${selectedMode}/${files[randomAssetIndex]}`;
              selectedColorModes[layerName] = selectedMode;
            } else {
              recipe[layerName] = null;
            }
          } else {
            recipe[layerName] = null;
          }
        } else {
          // Layer without modes: pick random asset
          const files = getAllAssetsForLayer(layerName);
          if (files.length > 0) {
            const randomIndex = Math.floor(Math.random() * files.length);
            recipe[layerName] = files[randomIndex];
          } else {
            recipe[layerName] = null;
          }
        }
      } else {
        recipe[layerName] = null;
      }
    }
  });
  
  return recipe;
}

// Load an image from a file path
function loadImage(layerName, filename) {
  return new Promise((resolve, reject) => {
    if (filename === null) {
      resolve(null);
      return;
    }
    
    // Check if filename contains a mode (e.g., "dark/01.png")
    let imagePath;
    if (filename.includes('/')) {
      // New format: mode/filename (e.g., "dark/01.png")
      imagePath = `assets/${layerName}/${filename}`;
    } else if (hasColorModes(layerName)) {
      // Layer has modes but filename doesn't include mode
      // Try to use selected mode or current recipe mode
      let mode = selectedColorModes[layerName];
      if (!mode && currentRecipe && currentRecipe[layerName]) {
        const recipeValue = currentRecipe[layerName];
        if (recipeValue.includes('/')) {
          mode = recipeValue.split('/')[0];
        }
      }
      if (mode) {
        imagePath = `assets/${layerName}/${mode}/${filename}`;
      } else {
        // Fallback: try first available mode
        const modes = getColorModes(layerName);
        if (modes.length > 0) {
          imagePath = `assets/${layerName}/${modes[0]}/${filename}`;
        } else {
          imagePath = `assets/${layerName}/${filename}`;
        }
      }
    } else {
      // Flat structure (no modes)
      imagePath = `assets/${layerName}/${filename}`;
    }
    
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${imagePath}`));
    img.src = imagePath;
  });
}

// Generate and render avatar
async function generateAvatar() {
  if (!manifest || !assetsIndex) {
    statusText.textContent = 'Error: Configuration not loaded';
    return;
  }
  
  try {
    statusText.textContent = 'Generating…';
    
    // Build recipe (completely new recipe)
    currentRecipe = buildRecipe();
    
    // Invalidate thumbnail cache since recipe changed
    thumbnailCache = {};
    
    // Display recipe
    updateRecipeDisplay();
    
    // Regenerate thumbnails for active tab if one is selected
    if (activeTab) {
      renderThumbnailGrid(activeTab);
    }
    
    // Load all images
    const imagePromises = manifest.layers.map(layer => 
      loadImage(layer.name, currentRecipe[layer.name])
    );
    const images = await Promise.all(imagePromises);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background color only if user has selected a color
    if (hasSelectedColor && canvasBackgroundColor) {
      ctx.fillStyle = canvasBackgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw images in stacking order
    images.forEach((img, index) => {
      if (img !== null) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    });
    
    statusText.textContent = 'Avatar generated';
  } catch (error) {
    statusText.textContent = 'Error: ' + error.message;
    recipeText.value = '';
    console.error(error);
  }
}

// Save avatar as PNG
function saveAvatar() {
  if (!currentRecipe) {
    statusText.textContent = 'Error: No avatar generated yet';
    return;
  }
  
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avatar-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    statusText.textContent = 'Avatar saved';
  }, 'image/png');
}

// Handle color selection
function setupColorSelector() {
  const colorPickerBtn = document.getElementById('colorPickerBtn');
  const colorSwatches = document.getElementById('colorSwatches');
  const currentColorIndicator = document.getElementById('currentColorIndicator');
  const swatchButtons = document.querySelectorAll('.color-swatch');
  
  // Initialize current color indicator (transparent/default)
  updateColorIndicator();
  
  // Toggle color swatches visibility
  colorPickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    colorSwatches.classList.toggle('visible');
  });
  
  // Close swatches when clicking outside
  document.addEventListener('click', (e) => {
    if (!colorPickerBtn.contains(e.target) && !colorSwatches.contains(e.target)) {
      colorSwatches.classList.remove('visible');
    }
  });
  
  swatchButtons.forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Remove selected class from all swatches
      swatchButtons.forEach(s => s.classList.remove('selected'));
      
      // Add selected class to clicked swatch
      swatch.classList.add('selected');
      
      // Update background colors and mark as selected
      selectedBackgroundColor = swatch.dataset.color;
      canvasBackgroundColor = lightenColor(selectedBackgroundColor, 10);
      hasSelectedColor = true;
      avatarArea.style.backgroundColor = selectedBackgroundColor;
      
      // Update color indicator
      updateColorIndicator();
      
      // Close the swatches
      colorSwatches.classList.remove('visible');
      
      // Invalidate thumbnail cache since color changed
      thumbnailCache = {};
      
      // Update recipe display if there's a current recipe
      if (currentRecipe) {
        updateRecipeDisplay();
      }
      
      // If there's a current avatar, redraw it with new background
      if (currentRecipe) {
        redrawAvatar();
      } else {
        // Otherwise, redraw the placeholder with new background
        drawPlaceholder();
      }
      
      // Regenerate thumbnails for active tab if one is selected
      if (activeTab) {
        // Update mode selector if layer has modes
        renderColorModeSelector(activeTab);
        renderThumbnailGrid(activeTab);
      }
    });
  });
}

// Update the current color indicator
function updateColorIndicator() {
  const currentColorIndicator = document.getElementById('currentColorIndicator');
  if (!currentColorIndicator) return;
  
  if (hasSelectedColor && selectedBackgroundColor) {
    currentColorIndicator.style.backgroundColor = selectedBackgroundColor;
    currentColorIndicator.style.border = '2px solid #fff';
    currentColorIndicator.style.backgroundImage = 'none';
    currentColorIndicator.style.transform = 'none';
  } else {
    // Show first four colors from color selector when no color is selected in a 2x2 grid
    // Top row: #E74447 (red), #F9832E (orange)
    // Bottom row: #6CBF0C (green), #9B62F6 (purple)
    currentColorIndicator.style.backgroundColor = 'transparent';
    currentColorIndicator.style.border = '2px solid #666';
    currentColorIndicator.style.backgroundImage = `
      linear-gradient(90deg, #E74447 0%, #E74447 50%, #F9832E 50%, #F9832E 100%),
      linear-gradient(90deg, #6CBF0C 0%, #6CBF0C 50%, #9B62F6 50%, #9B62F6 100%)
    `;
    currentColorIndicator.style.backgroundSize = '100% 50%';
    currentColorIndicator.style.backgroundPosition = '0 0, 0 100%';
    currentColorIndicator.style.backgroundRepeat = 'no-repeat';
    currentColorIndicator.style.transform = 'rotate(45deg)';
  }
}

// Redraw avatar with current background color
async function redrawAvatar() {
  if (!currentRecipe) return;
  
  try {
    // Load all images
    const imagePromises = manifest.layers.map(layer => 
      loadImage(layer.name, currentRecipe[layer.name])
    );
    const images = await Promise.all(imagePromises);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background color only if user has selected a color
    if (hasSelectedColor && canvasBackgroundColor) {
      ctx.fillStyle = canvasBackgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw images in stacking order
    images.forEach((img, index) => {
      if (img !== null) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    });
  } catch (error) {
    console.error('Error redrawing avatar:', error);
  }
}

// Event listeners
generateBtn.addEventListener('click', generateAvatar);
saveBtn.addEventListener('click', saveAvatar);

// Generate a simple hash of current recipe for cache invalidation
function getRecipeHash() {
  if (!currentRecipe) return '';
  return JSON.stringify(currentRecipe);
}

// Check if a layer has color modes (nested structure in index)
function hasColorModes(layerName) {
  if (!assetsIndex || !assetsIndex[layerName]) return false;
  const layerData = assetsIndex[layerName];
  // If it's an object (not an array), it has color modes
  return typeof layerData === 'object' && !Array.isArray(layerData);
}

// Get array of available color modes for a layer
function getColorModes(layerName) {
  if (!hasColorModes(layerName)) return [];
  const layerData = assetsIndex[layerName];
  return Object.keys(layerData).sort();
}

// Get assets for a specific mode
function getAssetsForMode(layerName, mode) {
  if (!hasColorModes(layerName)) return [];
  const layerData = assetsIndex[layerName];
  return layerData[mode] || [];
}

// Get all assets for a layer (handles both flat and nested structures)
function getAllAssetsForLayer(layerName) {
  if (!assetsIndex || !assetsIndex[layerName]) return [];
  const layerData = assetsIndex[layerName];
  
  if (Array.isArray(layerData)) {
    // Flat structure (no color modes)
    return layerData;
  } else {
    // Nested structure (has color modes) - return all assets from all modes
    const allAssets = [];
    Object.values(layerData).forEach(modeAssets => {
      allAssets.push(...modeAssets);
    });
    return allAssets;
  }
}

// Setup tab navigation
function setupTabNavigation() {
  if (!manifest) return;
  
  const tabNavigation = document.getElementById('tabNavigation');
  tabNavigation.innerHTML = '';
  
  manifest.layers.forEach(layer => {
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.textContent = layer.name.charAt(0).toUpperCase() + layer.name.slice(1);
    tabButton.dataset.layer = layer.name;
    
    tabButton.addEventListener('click', () => {
      // Remove active class from all tabs
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to clicked tab
      tabButton.classList.add('active');
      activeTab = layer.name;
      
      // Render color mode selector and thumbnail grid for this layer
      renderThumbnailGrid(layer.name);
    });
    
    tabNavigation.appendChild(tabButton);
  });
  
  // Activate first tab by default
  if (manifest.layers.length > 0) {
    const firstTab = tabNavigation.querySelector('.tab-button');
    if (firstTab) {
      firstTab.classList.add('active');
      activeTab = manifest.layers[0].name;
      renderThumbnailGrid(manifest.layers[0].name);
    }
  }
}

// Generate a thumbnail preview for a specific asset
async function generateThumbnail(layerName, assetFilename) {
  // Create a temporary recipe with this specific asset
  const tempRecipe = currentRecipe ? { ...currentRecipe } : {};
  
  // Handle mode-based filenames (e.g., "dark/01.png")
  if (assetFilename && assetFilename.includes('/')) {
    tempRecipe[layerName] = assetFilename;
  } else if (hasColorModes(layerName)) {
    // If layer has modes but filename doesn't include mode, use current mode
    const mode = selectedColorModes[layerName];
    if (mode && assetFilename) {
      tempRecipe[layerName] = `${mode}/${assetFilename}`;
    } else {
      tempRecipe[layerName] = assetFilename;
    }
  } else {
    tempRecipe[layerName] = assetFilename;
  }
  
  // Generate cache key based on temp recipe
  const tempRecipeHash = JSON.stringify(tempRecipe);
  const cacheKey = `${layerName}:${assetFilename}:${tempRecipeHash}`;
  
  // Check cache first
  if (thumbnailCache[cacheKey]) {
    return thumbnailCache[cacheKey];
  }
  
  // Create temporary canvas for thumbnail
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 128;
  thumbCanvas.height = 128;
  const thumbCtx = thumbCanvas.getContext('2d');
  
  // Load all images for the thumbnail
  const imagePromises = manifest.layers.map(layer => {
    const filename = tempRecipe[layer.name];
    return loadImage(layer.name, filename);
  });
  
  try {
    const images = await Promise.all(imagePromises);
    
    // Draw background color only if user has selected a color
    if (hasSelectedColor && canvasBackgroundColor) {
      thumbCtx.fillStyle = canvasBackgroundColor;
      thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    
    // Draw all layers
    images.forEach((img, index) => {
      if (img !== null) {
        thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }
    });
    
    // Convert to data URL and cache
    const dataUrl = thumbCanvas.toDataURL('image/png');
    thumbnailCache[cacheKey] = dataUrl;
    
    return dataUrl;
  } catch (error) {
    console.error(`Error generating thumbnail for ${layerName}/${assetFilename}:`, error);
    return null;
  }
}

// Render color mode selector for a layer
function renderColorModeSelector(layerName) {
  const colorModeSelector = document.getElementById('colorModeSelector');
  colorModeSelector.innerHTML = '';
  
  if (!hasColorModes(layerName)) {
    colorModeSelector.style.display = 'none';
    return;
  }
  
  colorModeSelector.style.display = 'flex';
  const modes = getColorModes(layerName);
  const currentMode = selectedColorModes[layerName];
  
  modes.forEach(mode => {
    const modeButton = document.createElement('button');
    modeButton.className = 'color-mode-button';
    
    // Get hex color for this mode, or use mode name as fallback
    const hexColor = colorModeColors[mode] || '#000000';
    modeButton.dataset.mode = mode;
    modeButton.dataset.layer = layerName;
    modeButton.dataset.color = hexColor;
    modeButton.style.backgroundColor = hexColor;
    
    if (currentMode === mode) {
      modeButton.classList.add('active');
    }
    
    modeButton.addEventListener('click', () => {
      selectColorMode(layerName, mode);
    });
    
    colorModeSelector.appendChild(modeButton);
  });
  
  // Auto-select first mode if none selected
  if (!currentMode && modes.length > 0) {
    selectColorMode(layerName, modes[0]);
  }
}

// Handle color mode selection
async function selectColorMode(layerName, mode) {
  selectedColorModes[layerName] = mode;
  
  // Update active state in mode selector
  document.querySelectorAll(`.color-mode-button[data-layer="${layerName}"]`).forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === mode) {
      btn.classList.add('active');
    }
  });
  
  // Update current recipe if it exists and uses a different mode
  if (currentRecipe && currentRecipe[layerName]) {
    const currentValue = currentRecipe[layerName];
    // If current value is mode-based, update it
    if (currentValue.includes('/')) {
      const parts = currentValue.split('/');
      const assetName = parts[1] || parts[0];
      const assets = getAssetsForMode(layerName, mode);
      if (assets.length > 0) {
        // Try to keep the same asset number if possible, otherwise use first
        const assetMatch = assets.find(a => a === assetName) || assets[0];
        currentRecipe[layerName] = `${mode}/${assetMatch}`;
        await redrawAvatar();
        updateRecipeDisplay();
      }
    }
  }
  
  // Regenerate thumbnails for the selected mode
  await renderThumbnailGrid(layerName, mode);
}

// Render thumbnail grid for a specific layer
async function renderThumbnailGrid(layerName, mode = null) {
  const thumbnailGrid = document.getElementById('thumbnailGrid');
  
  if (!assetsIndex || !assetsIndex[layerName]) {
    thumbnailGrid.innerHTML = '';
    return;
  }
  
  // Show color mode selector
  renderColorModeSelector(layerName);
  
  // Determine which mode to use
  if (hasColorModes(layerName)) {
    if (!mode) {
      mode = selectedColorModes[layerName];
      if (!mode) {
        // Auto-select first mode if none selected
        const modes = getColorModes(layerName);
        if (modes.length > 0) {
          mode = modes[0];
          selectedColorModes[layerName] = mode;
        }
      }
    }
  }
  
  // If no current recipe exists, create a default one for thumbnail generation
  if (!currentRecipe) {
    currentRecipe = {};
    manifest.layers.forEach(layer => {
      if (layer.required) {
        if (hasColorModes(layer.name)) {
          const modes = getColorModes(layer.name);
          const defaultMode = modes[0];
          const assets = getAssetsForMode(layer.name, defaultMode);
          if (assets.length > 0) {
            currentRecipe[layer.name] = `${defaultMode}/${assets[0]}`;
            selectedColorModes[layer.name] = defaultMode;
          }
        } else {
          const files = getAllAssetsForLayer(layer.name);
          if (files.length > 0) {
            currentRecipe[layer.name] = files[0];
          }
        }
      } else {
        currentRecipe[layer.name] = null;
      }
    });
    // Render the default avatar
    redrawAvatar();
    updateRecipeDisplay();
  }
  
  const layer = manifest.layers.find(l => l.name === layerName);
  
  // Get assets based on whether layer has color modes
  let assets;
  if (hasColorModes(layerName) && mode) {
    assets = getAssetsForMode(layerName, mode);
  } else {
    assets = getAllAssetsForLayer(layerName);
  }
  
  // Calculate total number of thumbnails (including "none" for optional layers)
  const totalThumbnails = assets.length + (layer.required ? 0 : 1);
  
  // Create placeholder buttons first to maintain layout
  thumbnailGrid.innerHTML = '';
  const placeholderButtons = [];
  
  for (let i = 0; i < totalThumbnails; i++) {
    const placeholderButton = document.createElement('button');
    placeholderButton.className = 'thumbnail-button loading-placeholder';
    placeholderButton.innerHTML = '<div class="thumbnail-skeleton"></div>';
    thumbnailGrid.appendChild(placeholderButton);
    placeholderButtons.push(placeholderButton);
  }
  
  // Create thumbnails for each asset
  const thumbnailPromises = [];
  
  // For optional layers, add a "none" option first
  if (!layer.required) {
    thumbnailPromises.push(
      generateThumbnail(layerName, null).then(dataUrl => ({
        filename: null,
        dataUrl: dataUrl,
        isNone: true,
        index: 0
      }))
    );
  }
  
  // Add all asset thumbnails
  let assetIndex = layer.required ? 0 : 1;
  for (const assetFilename of assets) {
    const currentIndex = assetIndex;
    // For layers with modes, store full path (mode/filename) for proper selection checking
    const fullPath = (hasColorModes(layerName) && mode) ? `${mode}/${assetFilename}` : assetFilename;
    thumbnailPromises.push(
      generateThumbnail(layerName, fullPath).then(dataUrl => ({
        filename: fullPath,
        dataUrl: dataUrl,
        isNone: false,
        index: currentIndex
      }))
    );
    assetIndex++;
  }
  
  const thumbnails = await Promise.all(thumbnailPromises);
  
  // Update placeholder buttons with actual thumbnails
  thumbnails.forEach(({ filename, dataUrl, isNone, index }) => {
    const placeholderButton = placeholderButtons[index];
    if (!placeholderButton) return;
    
    // Remove placeholder class and skeleton
    placeholderButton.classList.remove('loading-placeholder');
    placeholderButton.innerHTML = '';
    placeholderButton.dataset.layer = layerName;
    placeholderButton.dataset.filename = filename || 'none';
    
    // Check if this is the currently selected asset
    // filename already contains the full path (mode/filename or just filename)
    let isSelected = false;
    if (currentRecipe && currentRecipe[layerName]) {
      const recipeValue = currentRecipe[layerName];
      isSelected = recipeValue === filename;
    }
    if (isSelected) {
      placeholderButton.classList.add('selected');
    }
    
    if (isNone) {
      placeholderButton.classList.add('none-option');
      placeholderButton.textContent = 'None';
    } else {
      const thumbImg = document.createElement('img');
      thumbImg.src = dataUrl || '';
      thumbImg.alt = filename;
      placeholderButton.appendChild(thumbImg);
    }
    
    // Add click listener
    placeholderButton.addEventListener('click', () => {
      // filename already contains mode/filename format if layer has modes
      selectAsset(layerName, filename);
    });
  });
}

// Handle asset selection
async function selectAsset(layerName, assetFilename) {
  if (!currentRecipe) {
    // If no recipe exists, create one with defaults first
    currentRecipe = {};
    manifest.layers.forEach(layer => {
      if (layer.required) {
        if (hasColorModes(layer.name)) {
          const modes = getColorModes(layer.name);
          const defaultMode = modes[0];
          const assets = getAssetsForMode(layer.name, defaultMode);
          if (assets.length > 0) {
            currentRecipe[layer.name] = `${defaultMode}/${assets[0]}`;
            selectedColorModes[layer.name] = defaultMode;
          }
        } else {
          const files = getAllAssetsForLayer(layer.name);
          if (files.length > 0) {
            currentRecipe[layer.name] = files[0];
          }
        }
      } else {
        currentRecipe[layer.name] = null;
      }
    });
  }
  
  // Update current recipe (assetFilename may already include mode, e.g., "dark/01.png")
  currentRecipe[layerName] = assetFilename;
  
  // Extract mode from assetFilename if it contains a mode
  if (assetFilename && assetFilename.includes('/')) {
    const parts = assetFilename.split('/');
    selectedColorModes[layerName] = parts[0];
  }
  
  // Invalidate cache for this layer's thumbnails
  Object.keys(thumbnailCache).forEach(key => {
    if (key.startsWith(`${layerName}:`)) {
      delete thumbnailCache[key];
    }
  });
  
  // Update selected state in thumbnail grid (without regenerating)
  document.querySelectorAll(`.thumbnail-button[data-layer="${layerName}"]`).forEach(btn => {
    btn.classList.remove('selected');
    const btnFilename = btn.dataset.filename;
    // Check if this button matches the selected asset
    if (assetFilename && assetFilename.includes('/')) {
      // Mode-based: compare full path
      if (btnFilename === assetFilename || btnFilename === assetFilename.split('/')[1]) {
        btn.classList.add('selected');
      }
    } else {
      // Flat: direct comparison
      if (btnFilename === (assetFilename || 'none')) {
        btn.classList.add('selected');
      }
    }
  });
  
  // Redraw avatar
  await redrawAvatar();
  
  // Update recipe display
  updateRecipeDisplay();
  
  // Note: We don't regenerate thumbnails here to avoid layout shift
  // Thumbnails will be regenerated when user switches tabs or when needed
  // The cache invalidation ensures fresh thumbnails next time
}

// Initialize on load
loadData();
setupColorSelector();

