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
  const files = [];
  
  if (fs.existsSync(layerDir)) {
    const items = fs.readdirSync(layerDir);
    items.forEach(item => {
      const itemPath = path.join(layerDir, item);
      if (fs.statSync(itemPath).isFile() && item.toLowerCase().endsWith('.png')) {
        files.push(item);
      }
    });
    files.sort();
  }
  
  index[layer] = files;
});

fs.writeFileSync(outputFile, JSON.stringify(index, null, 2));
console.log(`Generated ${outputFile}`);
console.log('Layer counts:', Object.entries(index).map(([k, v]) => `${k}: ${v.length}`).join(', '));

