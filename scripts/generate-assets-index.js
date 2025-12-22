const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const outputFile = path.join(assetsDir, 'index.json');

const layerFolders = [
  'face',
  'eyes',
  'hair',
  'earrings',
  'eyebrows',
  'tattoo',
  'sunglasses',
  'clothes'
];

const index = {};

layerFolders.forEach(layer => {
  const layerDir = path.join(assetsDir, layer);
  
  if (!fs.existsSync(layerDir)) {
    return;
  }
  
  const items = fs.readdirSync(layerDir);
  const hasSubfolders = items.some(item => {
    const itemPath = path.join(layerDir, item);
    return fs.statSync(itemPath).isDirectory();
  });
  
  if (hasSubfolders) {
    // Layer has color modes (subfolders)
    index[layer] = {};
    items.forEach(item => {
      const itemPath = path.join(layerDir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        const modeName = item;
        const modeDir = itemPath;
        const files = [];
        
        const modeItems = fs.readdirSync(modeDir);
        modeItems.forEach(modeItem => {
          const modeItemPath = path.join(modeDir, modeItem);
          if (fs.statSync(modeItemPath).isFile() && modeItem.toLowerCase().endsWith('.png')) {
            files.push(modeItem);
          }
        });
        files.sort();
        index[layer][modeName] = files;
      }
    });
  } else {
    // Layer has flat structure (no color modes)
    const files = [];
    items.forEach(item => {
      const itemPath = path.join(layerDir, item);
      if (fs.statSync(itemPath).isFile() && item.toLowerCase().endsWith('.png')) {
        files.push(item);
      }
    });
    files.sort();
    index[layer] = files;
  }
});

fs.writeFileSync(outputFile, JSON.stringify(index, null, 2));
console.log(`Generated ${outputFile}`);
console.log('Layer counts:', Object.entries(index).map(([k, v]) => {
  if (Array.isArray(v)) {
    return `${k}: ${v.length}`;
  } else {
    const total = Object.values(v).reduce((sum, arr) => sum + arr.length, 0);
    return `${k}: ${total} (${Object.keys(v).join(', ')})`;
  }
}).join(', '));

