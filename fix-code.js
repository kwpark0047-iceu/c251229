const fs = require('fs');

try {
    // 1. page.tsx 수정
    let page = fs.readFileSync('src/app/lead-manager/page.tsx', 'utf8');
    page = page.replace(")        ) : mainTab === 'proposals' ? (", "</> ) : mainTab === 'proposals' ? (");
    fs.writeFileSync('src/app/lead-manager/page.tsx', page);
    console.log('page.tsx fixed');

    // 2. InventoryTable.tsx 수정
    let inv = fs.readFileSync('src/app/lead-manager/components/inventory/InventoryTable.tsx', 'utf8');
    inv = inv.replace(/<\/div>\s*<\/div>\s*\);\s*\}/, "</div>\n    </>\n  );\n}");
    fs.writeFileSync('src/app/lead-manager/components/inventory/InventoryTable.tsx', inv);
    console.log('InventoryTable.tsx fixed');

    // 3. ListView.tsx 수정
    let listLines = fs.readFileSync('src/app/lead-manager/components/ListView.tsx', 'utf8').split('\n');
    let startIndex = listLines.findIndex((line, i) => i > 130 && line.trim() === 'return (');
    let nextReturnIndex = listLines.findIndex((line, i) => i > startIndex && line.trim() === 'return (');

    if (startIndex !== -1 && nextReturnIndex !== -1) {
        listLines.splice(startIndex, nextReturnIndex - startIndex);
        fs.writeFileSync('src/app/lead-manager/components/ListView.tsx', listLines.join('\n'));
        console.log(`ListView.tsx fixed: removed lines from ${startIndex + 1} to ${nextReturnIndex}`);
    } else {
        console.log('Could not find exact return statements in ListView.');
    }
} catch (e) {
    console.error(e);
}
