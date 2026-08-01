const fs = require('fs');
const path = require('path');

const filePath = 'd:/MO_MO/webapp/src/App.css';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Total Lines:', lines.length);

const uniqueLines = new Set(lines.map(l => l.trim()));
console.log('Unique Trimmed Lines:', uniqueLines.size);

// Check for large repeated blocks
const blocks = content.split('}');
const uniqueBlocks = new Set(blocks.map(b => b.trim()));
console.log('Total Blocks (approx):', blocks.length);
console.log('Unique Blocks (approx):', uniqueBlocks.size);

if (blocks.length > uniqueBlocks.size) {
    console.log('⚠️ Duplication detected! Approx', blocks.length - uniqueBlocks.size, 'duplicated blocks.');
}
