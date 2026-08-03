const fs = require('fs');
const path = 'd:/MO_MO/webapp/src/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { compressImage }')) {
  content = content.replace(
    "import { AreaChart",
    "import { compressImage } from '../utils/imageUtils';\nimport { AreaChart"
  );
}

// Fix named upload handlers
content = content.replace(/formData\.append\('image', file\);/g, "const compressed = await compressImage(file);\n    formData.append('image', compressed);");

// Fix inline upload handlers (Add/Edit Product)
content = content.replace(/const file = e\.target\.files\?\.\[0\];\s*if\s*\(file\)\s*\{\s*const fd = new FormData\(\);\s*fd\.append\('image', file\);/g, 
  "const file = e.target.files?.[0];\n                        if (file) {\n                          const compressed = await compressImage(file);\n                          const fd = new FormData();\n                          fd.append('image', compressed);");

// Note: inline handlers use different spacing, let's just make it robust
content = content.replace(/const fd = new FormData\(\);\s*fd\.append\('image', file\);/g, 
  "const fd = new FormData();\n                          const compressed = await compressImage(file);\n                          fd.append('image', compressed);");


// Make sure inline handlers are async:
content = content.replace(/onChange=\{e => \{/g, "onChange={async e => {");

fs.writeFileSync(path, content, 'utf8');
console.log('Image compression injected!');
