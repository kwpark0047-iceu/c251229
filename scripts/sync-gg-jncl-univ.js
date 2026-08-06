
/**
 * 경기도 전문 및 대학교 현황 데이터 동기화 스크립트
 * 사용법: node scripts/sync-gg-jncl-univ.js
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ggApiKey = process.env.GG_JNCL_UNIV_API_KEY || '0f12a235134748c0a4b9dbce97405083';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL 또는 Key가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncJnclUniversities() {
  console.log('🚀 경기도 전문 및 대학교 현황 데이터 동기화 시작...');
  
  let pIndex = 1;
  const pSize = 1000;
  let totalProcessed = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      console.log(`📦 페이지 ${pIndex} 요청 중...`);
      const response = await axios.get('https://openapi.gg.go.kr/Jnclluniv', {
        params: {
          KEY: ggApiKey,
          Type: 'json',
          pIndex: pIndex,
          pSize: pSize
        }
      });

      if (!response.data.Jnclluniv) {
        console.log('✅ 모든 데이터를 처리했습니다.');
        break;
      }

      const rows = response.data.Jnclluniv[1].row;
      if (!rows || rows.length === 0) break;

      const leads = rows.map(row => {
        return {
          biz_name: row.FACLT_NM,
          road_address: row.REFINE_ROADNM_ADDR || '',
          lot_address: row.REFINE_LOTNO_ADDR || '',
          phone: '', 
          medical_subject: row.SCHOOL_DIV_NM || '대학교',
          service_name: '전문 및 대학교',
          category: 'EDUCATION',
          latitude: parseFloat(row.REFINE_WGS84_LAT) || null,
          longitude: parseFloat(row.REFINE_WGS84_LOGT) || null,
          status: 'NEW',
          operating_status: '영업중',
          mgt_no: `GG_JNCL_${row.FACLT_NM}_${row.REFINE_ZIP_CD || row.REFINE_ROADNM_ADDR}`.replace(/\s+/g, ''),
        };
      });

      if (leads.length > 0) {
        const { error } = await supabase
          .from('leads')
          .upsert(leads, { onConflict: 'mgt_no' });

        if (error) {
          console.error(`❌ DB 저장 오류 (페이지 ${pIndex}):`, error.message);
        } else {
          totalProcessed += leads.length;
          console.log(`✅ ${leads.length}건 저장 완료 (누적: ${totalProcessed}건)`);
        }
      }

      if (rows.length < pSize) {
        hasMore = false;
      } else {
        pIndex++;
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error) {
      console.error('❌ API 요청 오류:', error.message);
      hasMore = false;
    }
  }

  console.log(`\n🎉 동기화 완료! 총 ${totalProcessed}건의 데이터를 처리했습니다.`);
}

syncJnclUniversities();
