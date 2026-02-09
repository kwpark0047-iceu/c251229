/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 도면 데이터 정합성 검증 스크립트
 * 
 * 기능:
 * 1. DB(floor_plans)에 등록된 모든 도면의 image_url이 유효한지 체크
 * 2. storage_path가 Supabase Storage에 실제 존재하는지 체크
 * 3. 요약 리포트 생성
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local에서 설정 로드 (단순 파싱)
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
        console.error('오류: Supabase 설정이 .env.local에 없습니다.');
        process.exit(1);
    }

    console.log('=== 지하철 역사 도면 데이터 검증 시작 ===\n');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. DB에서 모든 도면 데이터 조회
    console.log('1. 데이터베이스 조회 중...');
    const { data: plans, error: dbError } = await supabase
        .from('floor_plans')
        .select('id, station_name, line_number, plan_type, image_url, storage_path');

    if (dbError) {
        console.error(`DB 조회 오류: ${dbError.message}`);
        process.exit(1);
    }

    console.log(`총 ${plans.length}개의 도면을 발견했습니다.\n`);

    let validCount = 0;
    let invalidUrlCount = 0;
    let missingStorageCount = 0;
    const reports = [];

    // 2. 각 도면 검증
    for (let i = 0; i < plans.length; i++) {
        const plan = plans[i];
        const label = `[${i + 1}/${plans.length}] ${plan.line_number}호선 ${plan.station_name} (${plan.plan_type})`;
        process.stdout.write(`${label}... `);

        let isUrlOk = false;
        let isStorageOk = false;

        try {
            // URL 유효성 체크
            const response = await fetch(plan.image_url, { method: 'HEAD' });
            isUrlOk = response.ok;

            // Storage 존재 여부 체크
            const { data: storageData, error: storageError } = await supabase.storage
                .from(BUCKET_NAME)
                .list(path.dirname(plan.storage_path), {
                    search: path.basename(plan.storage_path)
                });

            isStorageOk = !storageError && storageData && storageData.length > 0;

            if (isUrlOk && isStorageOk) {
                console.log('✅ 정상');
                validCount++;
            } else {
                const issues = [];
                if (!isUrlOk) {
                    issues.push('URL 접근 불가');
                    invalidUrlCount++;
                }
                if (!isStorageOk) {
                    issues.push('스토리지 파일 없음');
                    missingStorageCount++;
                }
                console.log(`❌ 오류 (${issues.join(', ')})`);
                reports.push({ ...plan, issues });
            }
        } catch (err) {
            console.log(`❌ 예외 발생: ${err.message}`);
            reports.push({ ...plan, issues: [`예외: ${err.message}`] });
        }
    }

    // 3. 결과 요약
    console.log('\n' + '='.repeat(40));
    console.log('검증 결과 요약');
    console.log('='.repeat(40));
    console.log(`전체 검사: ${plans.length}개`);
    console.log(`정상 도면: ${validCount}개`);
    console.log(`URL 오류: ${invalidUrlCount}개`);
    console.log(`스토리지 유실: ${missingStorageCount}개`);
    console.log('='.repeat(40));

    if (reports.length > 0) {
        console.log('\n[오류 리스트]');
        reports.forEach(r => {
            console.log(`- ${r.line_number}호선 ${r.station_name}: ${r.issues.join(', ')}`);
            console.log(`  Path: ${r.storage_path}`);
            console.log(`  URL: ${r.image_url}\n`);
        });
    } else {
        console.log('\n모든 도면 데이터가 일관적입니다. ✨');
    }
}

main().catch(console.error);
