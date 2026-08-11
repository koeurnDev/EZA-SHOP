/**
 * 🔍 AST-Based JSX Syntax Validator (replaces naive bracket counter)
 *
 * Uses @babel/parser to accurately validate JSX/ES6 syntax including:
 *   - JSX components and fragments
 *   - Template literals, string literals, and comments
 *   - ES module import/export statements
 *
 * Usage:
 *   node scratch/check_braces.js [path/to/Component.jsx]
 *
 * Default target: webapp/src/components/AdminDashboard.jsx
 */

const fs = require('fs');
const path = require('path');

// Resolve the target file: argument or default (relative to project root)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(PROJECT_ROOT, 'webapp', 'src', 'components', 'AdminDashboard.jsx');

if (!fs.existsSync(target)) {
  console.error(`❌ File not found: ${target}`);
  process.exit(1);
}

let parser;
try {
  parser = require('@babel/parser');
} catch (e) {
  console.error('❌ @babel/parser is not installed.');
  console.error('   Run: npm install --save-dev @babel/parser');
  process.exit(1);
}

const code = fs.readFileSync(target, 'utf-8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    errorRecovery: false,
  });
  console.log(`✅ Syntax OK: ${path.relative(PROJECT_ROOT, target)}`);
} catch (err) {
  const loc = err.loc ? ` (Line ${err.loc.line}, Col ${err.loc.column})` : '';
  console.error(`❌ Syntax Error${loc}: ${err.message}`);
  process.exit(1);
}
