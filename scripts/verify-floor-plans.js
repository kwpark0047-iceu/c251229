/**
 * ?꾨㈃ ?곗씠???뺥빀??寃利??ㅽ겕由쏀듃
 * 
 * 湲곕뒫:
 * 1. DB(floor_plans)???깅줉??紐⑤뱺 ?꾨㈃??image_url???좏슚?쒖? 泥댄겕
 * 2. storage_path媛 Supabase Storage???ㅼ젣 議댁옱?섎뒗吏 泥댄겕
 * 3. ?붿빟 由ы룷???앹꽦
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local?먯꽌 ?ㅼ젙 濡쒕뱶 (?⑥닚 ?뚯떛)
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) return {};

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#\s=]+)\s*=\s*(.*)$/);
        if (match) {
            const key = match[1];
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[key] = value;
        }
    });
    return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET_NAME = 'floor-plans';

async function main() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('?ㅻ쪟: Supabase ?ㅼ젙??.env.local???놁뒿?덈떎.');
        process.exit(1);
    }

    console.log('=== 吏?섏쿋 ??궗 ?꾨㈃ ?곗씠??寃利??쒖옉 ===\n');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. DB?먯꽌 紐⑤뱺 ?꾨㈃ ?곗씠??議고쉶
    console.log('1. ?곗씠?곕쿋?댁뒪 議고쉶 以?..');
    const { data: plans, error: dbError } = await supabase
        .from('floor_plans')
        .select('id, station_name, line_number, plan_type, image_url, storage_path');

    if (dbError) {
        console.error(`DB 議고쉶 ?ㅻ쪟: ${dbError.message}`);
        process.exit(1);
    }

    console.log(`珥?${plans.length}媛쒖쓽 ?꾨㈃??諛쒓껄?덉뒿?덈떎.\n`);

    let validCount = 0;
    let invalidUrlCount = 0;
    let missingStorageCount = 0;
    const reports = [];

    // 2. 媛??꾨㈃ 寃利?
    for (let i = 0; i < plans.length; i++) {
        const plan = plans[i];
        const label = `[${i + 1}/${plans.length}] ${plan.line_number}?몄꽑 ${plan.station_name} (${plan.plan_type})`;
        process.stdout.write(`${label}... `);

        let isUrlOk = false;
        let isStorageOk = false;

        try {
            // URL ?좏슚??泥댄겕
            const response = await fetch(plan.image_url, { method: 'HEAD' });
            isUrlOk = response.ok;

            // Storage 議댁옱 ?щ? 泥댄겕
            const { data: storageData, error: storageError } = await supabase.storage
                .from(BUCKET_NAME)
                .list(path.dirname(plan.storage_path), {
                    search: path.basename(plan.storage_path)
                });

            isStorageOk = !storageError && storageData && storageData.length > 0;

            if (isUrlOk && isStorageOk) {
                console.log('???뺤긽');
                validCount++;
            } else {
                const issues = [];
                if (!isUrlOk) {
                    issues.push('URL ?묎렐 遺덇?');
                    invalidUrlCount++;
                }
                if (!isStorageOk) {
                    issues.push('?ㅽ넗由ъ? ?뚯씪 ?놁쓬');
                    missingStorageCount++;
                }
                console.log(`???ㅻ쪟 (${issues.join(', ')})`);
                reports.push({ ...plan, issues });
            }
        } catch (err) {
            console.log(`???덉쇅 諛쒖깮: ${err.message}`);
            reports.push({ ...plan, issues: [`?덉쇅: ${err.message}`] });
        }
    }

    // 3. 寃곌낵 ?붿빟
    console.log('\n' + '='.repeat(40));
    console.log('寃利?寃곌낵 ?붿빟');
    console.log('='.repeat(40));
    console.log(`?꾩껜 寃?? ${plans.length}媛?);
    console.log(`?뺤긽 ?꾨㈃: ${validCount}媛?);
    console.log(`URL ?ㅻ쪟: ${invalidUrlCount}媛?);
    console.log(`?ㅽ넗由ъ? ?좎떎: ${missingStorageCount}媛?);
    console.log('='.repeat(40));

    if (reports.length > 0) {
        console.log('\n[?ㅻ쪟 由ъ뒪??');
        reports.forEach(r => {
            console.log(`- ${r.line_number}?몄꽑 ${r.station_name}: ${r.issues.join(', ')}`);
            console.log(`  Path: ${r.storage_path}`);
            console.log(`  URL: ${r.image_url}\n`);
        });
    } else {
        console.log('\n紐⑤뱺 ?꾨㈃ ?곗씠?곌? ?쇨??곸엯?덈떎. ??);
    }
}

main().catch(console.error);
