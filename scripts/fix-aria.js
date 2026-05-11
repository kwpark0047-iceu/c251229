const fs = require('fs');
const path = require('path');

const filesToFix = [
  {
    path: 'd:/c251229/src/app/lead-manager/components/ProposalsView.tsx',
    replacements: [
      { from: 'aria-pressed={statusFilter === status ? "true" : "false"}', to: 'aria-pressed={statusFilter === status ? "true" : "false"}' } // wait, React ARIA boolean works if just {statusFilter === status}? Let's use {statusFilter === status}
    ]
  },
  {
    path: 'd:/c251229/src/app/lead-manager/components/ResponsiveLeadManager.tsx',
    replacements: [
      { from: 'aria-pressed={viewMode === \'grid\' ? "true" : "false"}', to: 'aria-pressed={viewMode === \'grid\'}' },
      { from: 'aria-pressed={viewMode === \'list\' ? "true" : "false"}', to: 'aria-pressed={viewMode === \'list\'}' },
      { from: 'aria-pressed={viewMode === \'map\' ? "true" : "false"}', to: 'aria-pressed={viewMode === \'map\'}' }
    ]
  },
  {
    path: 'd:/c251229/src/app/shared/components/AccessibilityComponents.tsx',
    replacements: [
      { from: 'aria-checked={checked ? "true" : "false"}', to: 'aria-checked={checked}' }
    ]
  },
  {
    path: 'd:/c251229/src/app/shared/components/ThemeComponents.tsx',
    replacements: [
      { from: 'aria-expanded={isOpen ? "true" : "false"}', to: 'aria-expanded={isOpen}' },
      { from: 'aria-selected={theme === value ? "true" : "false"}', to: 'aria-selected={theme === value}' }
    ]
  }
];

// For ProposalsView, since I couldn't find the exact string with grep, I'll use regex.
const proposalsViewRegex = /aria-pressed=\{statusFilter === status \? "true" : "false"\}/g;

filesToFix.forEach(file => {
  let content = fs.readFileSync(file.path, 'utf8');
  if (file.path.includes('ProposalsView')) {
    content = content.replace(proposalsViewRegex, 'aria-pressed={statusFilter === status}');
  } else {
    file.replacements.forEach(rep => {
      content = content.replace(rep.from, rep.to);
    });
  }
  fs.writeFileSync(file.path, content, 'utf8');
  console.log(`Updated ${file.path}`);
});
