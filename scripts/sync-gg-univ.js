
/**
 * 경기도 전문 및 대학교 현황 데이터 동기화 스크립트
 * 사용법: node scripts/sync-gg-univ.js
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ggApiKey = process.env.GG_UNIV_API_KEY || '8d6df268ee064aa6bfc808742aada7d5';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL 또는 Key가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 경기도 주요 지하철역 좌표 데이터
const GG_STATIONS = [
  { name: '수원', lat: 37.2659, lng: 127.0001, lines: ['1', '수인분당'] },
  { name: '부천', lat: 37.4841, lng: 126.7827, lines: ['1'] },
  { name: '의정부', lat: 37.7394, lng: 127.0458, lines: ['1'] },
  { name: '평택', lat: 36.9923, lng: 127.0861, lines: ['1'] },
  { name: '안양', lat: 37.4022, lng: 126.9229, lines: ['1'] },
  { name: '판교', lat: 37.3948, lng: 127.1111, lines: ['신분당', '경강'] },
];

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // meters
}

function findNearestStation(lat, lng) {
  if (!lat || !lng) return null;
  let nearest = null;
  let minDistance = Infinity;

  for (const station of GG_STATIONS) {
    const dist = calculateDistance(lat, lng, station.lat, station.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = { ...station, distance: Math.round(dist) };
    }
  }
  return nearest;
}

async function syncUniversities() {
  console.log('🚀 경기도 대학교 데이터 동기화 시작...');
  
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
        const lat = parseFloat(row.REFINE_WGS84_LAT);
        const lng = parseFloat(row.REFINE_WGS84_LOGT);
        const nearest = findNearestStation(lat, lng);

        return {
          biz_name: row.FACLT_NM,
          road_address: row.REFINE_ROADNM_ADDR || '',
          lot_address: row.REFINE_LOTNO_ADDR || '',
          phone: '', 
          medical_subject: row.SCHOOL_DIV_NM || '대학교',
          service_name: row.PLVTINST_DIV_NM || '대학교',
          category: 'EDUCATION',
          latitude: lat || null,
          longitude: lng || null,
          nearest_station: nearest ? nearest.name : null,
          station_lines: nearest ? nearest.lines : null,
          station_distance: nearest ? nearest.distance : null,
          status: 'NEW',
          operating_status: '영업중',
          mgt_no: `GG_UNIV_${row.FACLT_NM}_${row.REFINE_ZIP_CD || row.REFINE_ROADNM_ADDR}`.replace(/\s+/g, ''),
          region_code: '6410000',
          assigned_to: null
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

  console.log(`\n🎉 동기화 완료! 총 ${totalProcessed}건의 대학교 데이터를 처리했습니다.`);
}

syncUniversities();
