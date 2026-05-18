const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/gg-data/route.ts',
  'src/app/api/gg-hospitals/route.ts',
  'src/app/api/gg-jncl-univ/route.ts',
  'src/app/api/gg-restaurants/route.ts',
  'src/app/api/gg-univ/route.ts'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace import
  if (!content.includes("import { upsertLeadsByMgtNo }")) {
    content = content.replace(
      /import { findNearestStation(.*) } from '@\/app\/lead-manager\/utils';/,
      `import { findNearestStation$1 } from '@/app/lead-manager/utils';\nimport { upsertLeadsByMgtNo } from '@/app/api/sync-utils';`
    );
  }
  
  // Replace DB upsert
  const dbUpsertRegex = /const { error: dbError } = await supabase\s*\n\s*\.from\('leads'\)\s*\n\s*\.upsert\(dbLeads, { onConflict: 'mgt_no' }\);/g;
  content = content.replace(dbUpsertRegex, 'const { error: dbError } = await upsertLeadsByMgtNo(supabase, dbLeads);');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Fixed', file);
});
