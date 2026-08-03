const fs = require('fs');
const path = 'd:/MO_MO/webapp/src/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /\<div style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr 1fr',\s*(.*?)\}\}/g,
  '<div className="admin-responsive-grid" style={{ $1 }}'
);

const cssToAdd = `
          .admin-responsive-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          @media (max-width: 768px) {
            .admin-responsive-grid {
              grid-template-columns: 1fr;
            }
          }
`;

content = content.replace('.glass-card-luxury {', cssToAdd + '          .glass-card-luxury {');

fs.writeFileSync(path, content, 'utf8');
console.log('Responsive grid applied');
