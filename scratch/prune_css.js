/**
 * 🧹 CSS Empty-Line Pruner (v2 - Safe & Portable)
 *
 * Removes consecutive blank lines and trailing whitespace from a CSS file.
 * Creates a timestamped .bak backup before any write operation.
 *
 * Usage:
 *   node scratch/prune_css.js [path/to/file.css]
 *
 * Default target: webapp/src/App.css (relative to project root)
 */

const fs = require('fs');
const path = require('path');

// ✅ Portable: resolve relative to project root, not hardcoded drive path
const PROJECT_ROOT = path.resolve(__dirname, '..');
const targetArg = process.argv[2];
const filePath = targetArg
  ? path.resolve(targetArg)
  : path.join(PROJECT_ROOT, 'webapp', 'src', 'App.css');

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// 🧹 Remove blank lines (collapse multiple blanks, strip trailing whitespace per line)
const prunedLines = [];
let prevWasBlank = false;
for (const line of lines) {
  const trimmed = line.trimEnd();
  const isBlank = trimmed.trim() === '';
  if (isBlank && prevWasBlank) continue; // Collapse consecutive blank lines
  prunedLines.push(trimmed);
  prevWasBlank = isBlank;
}

// Remove leading/trailing blank lines from final output
while (prunedLines.length && prunedLines[0].trim() === '') prunedLines.shift();
while (prunedLines.length && prunedLines[prunedLines.length - 1].trim() === '') prunedLines.pop();

const pruned = prunedLines.join('\n') + '\n';
const removed = lines.length - prunedLines.length;

// 🛡️ Safety Backup: write timestamped .bak before overwriting
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `${filePath}.${timestamp}.bak`;
fs.writeFileSync(backupPath, content, 'utf8');
console.log(`📦 Backup saved: ${path.relative(PROJECT_ROOT, backupPath)}`);

fs.writeFileSync(filePath, pruned, 'utf8');
console.log(`✅ Pruned: ${path.relative(PROJECT_ROOT, filePath)}`);
console.log(`   Original lines : ${lines.length}`);
console.log(`   Pruned lines   : ${prunedLines.length}`);
console.log(`   Lines removed  : ${removed}`);
