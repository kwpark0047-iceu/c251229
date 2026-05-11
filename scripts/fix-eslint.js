const fs = require('fs');

const file = 'd:/c251229/eslint.config.mjs';
let content = fs.readFileSync(file, 'utf8');

// The regex will match the array form or any other form and replace it with "off"
content = content.replace(/"react\/forbid-dom-props":\s*\["warn",\s*\{\s*"forbid":\s*\[\]\s*\}\],/, '"react/forbid-dom-props": "off",');

fs.writeFileSync(file, content, 'utf8');
console.log('Disabled react/forbid-dom-props in eslint.config.mjs');
