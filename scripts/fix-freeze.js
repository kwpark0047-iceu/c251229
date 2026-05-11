const fs = require('fs');

const file = 'd:/c251229/src/app/lead-manager/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/checkSimilarity: true,/g, 'checkSimilarity: false,');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed checkSimilarity bottleneck in page.tsx');
