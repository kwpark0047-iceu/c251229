const fs = require('fs');

const file = 'd:/c251229/src/app/lead-manager/design.css';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/border-bottom-color: color-mix\(in srgb, var\(--border-subtle\) 65%, white 12%\);/g, 'border-bottom-color: var(--border-subtle);');
content = content.replace(/border: 1px solid color-mix\(in srgb, var\(--border-subtle\) 80%, white 10%\);/g, 'border: 1px solid var(--border-subtle);');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed color-mix warnings in design.css');
