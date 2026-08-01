const fs = require('fs');
const filePath = 'd:/MO_MO/webapp/src/App.css';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const prunedLines = lines.filter(line => line.trim() !== '');
console.log('Original lines:', lines.length);
console.log('Pruned lines:', prunedLines.length);

fs.writeFileSync(filePath, prunedLines.join('\n'), 'utf8');
console.log('Successfully pruned App.css');
