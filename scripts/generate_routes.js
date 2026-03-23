const fs = require('fs');

const csvData = fs.readFileSync('./temp_chanyou/station_code.csv', 'utf8');
const linesArr = csvData.trim().split('\n');

const records = [];
// skip header
for (let i = 1; i < linesArr.length; i++) {
    const parts = linesArr[i].split(',');
    if (parts.length >= 6) {
        records.push({
            external_code: parts[2].trim(),
            lat: parseFloat(parts[4]),
            lng: parseFloat(parts[5])
        });
    }
}

const extractCoords = (prefix, min, max, exceptions = []) => {
    let filtered = records.filter(r => {
        const c = r.external_code;
        if (!c.startsWith(prefix)) return false;
        if (exceptions.includes(c)) return false;
        
        // Parse the numeric part of the code, e.g., '150' -> 150
        const num = parseInt(c.replace(/[^0-9]/g, ''));
        if (num < parseInt(min) || num > parseInt(max)) return false;
        
        return true;
    });

    filtered.sort((a, b) => {
        const numA = parseInt(a.external_code.replace(/[^0-9]/g, ''));
        const numB = parseInt(b.external_code.replace(/[^0-9]/g, ''));
        return numA - numB;
    });

    return filtered.map(r => [r.lat, r.lng]);
};

// Line 2 branches
const L2_EX = ['211-1','211-2','211-3','211-4','234-1','234-2','234-3','234-4', '200'];

// Line 1 is tricky, '1xx' covers 100 to 161 etc. Let's just use Seoul Metro Section 150-158
// Or expanded: from 114 (Dobong) to 141 (Guro). wait, Line 1 is Korail mostly. 150-158 is Seoul Metro.
// The user asked for "서울교통공사 서울지하철 노선도". I will just include 100 to 161 (Soyosan to Incheon) for Line 1 main line, and skip branches (P1xx).
const extractLine1 = () => {
    let filtered = records.filter(r => r.external_code.startsWith('1') && !r.external_code.startsWith('100') && r.external_code.length === 3 && parseInt(r.external_code) >= 100 && parseInt(r.external_code) <= 161);
    
    filtered.sort((a, b) => parseInt(a.external_code) - parseInt(b.external_code));
    return filtered.map(r => [r.lat, r.lng]);
}

const line2Coords = extractCoords('2', '201', '243', L2_EX);
line2Coords.push(line2Coords[0]); // close the circle!

let lineRoutes = {
    '1': {
        color: '#0052A4',
        coords: extractLine1()
    },
    '2': {
        color: '#00A84D',
        coords: line2Coords
    },
    '3': { color: '#EF7C1C', coords: extractCoords('3', '309', '352') },
    '4': { color: '#00A5DE', coords: extractCoords('4', '409', '434') },
    '5': { color: '#996CAC', coords: extractCoords('5', '510', '553') },
    // Line 6 eungam loop is 610-616, it forms a loop. 
    // We order numerically: 610 (Eungam) -> 611 -> 612 -> 613 -> 614 -> 615 -> 616 -> goes back to 610?? Eungam is 610. Then 617 represents Saejeol.
    // Eungam -> Yeokchon -> Bulgwang -> Dokbawi -> Yeonsinnae -> Gusan -> Eungam -> Saejeol...
    // The exact path is: Eungam(610) -> Yeokchon(611) -> Bulgwang(612) -> Dokbawi(613) -> Yeonsinnae(614) -> Gusan(615) -> Eungam(610) -> Saejeol(616).
    // Wait, the codes for Line 6 Eungam loop:
    // 610 Eungam, 611 Yeokchon, 612 Bulgwang, 613 Dokbawi, 614 Yeonsinnae, 615 Gusan, 616 Saejeol
    // Wait! 611-615 forms the loop, and it should connect back to 610!
    // If we just sort 610..647, it will draw 610->611->612->613->614->615->616. 
    // Wait, 615 Gusan is near 610 Eungam. Is 615 to 616 (Saejeol) a gap?
    // Eungam(610) -> Saejeol(616) is a connection.
    // If I draw 615 to 616, it crosses across Eungam.
    // The accurate polyline is 611->612->613->614->615->610->616->617...
    // Let's manually fix Line 6.
    '6': { color: '#CD7C2F', coords: (() => {
        let base = extractCoords('6', '610', '647');
        // base currently is 610, 611, 612, 613, 614, 615, 616, 617...
        // Insert 610 after 615
        const c610 = base[0];
        base.splice(6, 0, c610);
        return base;
    })() },
    '7': { color: '#747F00', coords: extractCoords('7', '701', '761', ['701','702']) }, // Actually 709 is Jangam.
    '8': { color: '#E6186C', coords: extractCoords('8', '810', '827') },
    '9': { color: '#BDB092', coords: extractCoords('9', '901', '938') }
};

fs.writeFileSync('routes_output.json', JSON.stringify(lineRoutes, null, 2));
console.log('done!');
