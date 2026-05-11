const fs = require('fs');

const file = 'd:/c251229/src/app/lead-manager/supabase-service.ts';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('const isAddressInRegion'));
if (startIdx !== -1) {
  // The function and its comment block take up 10 lines (261 to 270)
  // Let's remove from startIdx - 4 to startIdx + 5
  lines.splice(startIdx - 4, 10);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('Successfully removed isAddressInRegion');
} else {
  console.log('Could not find isAddressInRegion');
}
