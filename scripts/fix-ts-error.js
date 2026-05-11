const fs = require('fs');

const file = 'd:/c251229/src/app/lead-manager/supabase-service.ts';
let content = fs.readFileSync(file, 'utf8');

// The block to remove is from line 261 to 270. Let's just find the function and remove it using a regex.
content = content.replace(/\/\*\*[\s\S]*?const isAddressInRegion = [\s\S]*?};/g, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Removed isAddressInRegion');
