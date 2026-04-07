import { mapColorToStatus, findTargetDateColumnIndex } from './src/app/lead-manager/utils/excel-color-utils';

// 오늘 기준 15일 뒤 날짜
const targetDate = new Date();
targetDate.setDate(targetDate.getDate() + 15);
const m = targetDate.getMonth() + 1;
const d = targetDate.getDate();

console.log(`--- 테스트 시작 (기준 날짜: ${m}/${d}) ---`);

// 1. 날짜 컬럼 찾기 테스트
const headers = ['역사', '위치명', '유형', '04/10', '04/17', '04/24', '메모'];

// 오늘이 4월 2일이라고 가정하면 15일 뒤는 4월 17일
// 헤더에 MM/DD 형식이 있는지 확인
const targetDateStr = `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
const foundIndex = findTargetDateColumnIndex(headers, targetDate);

console.log(`헤더 목록: [${headers.join(', ')}]`);
console.log(`찾으려는 날짜: ${targetDateStr}`);
console.log(`찾은 인덱스: ${foundIndex} (기대값: 4)`);

if (headers[foundIndex]?.includes(targetDateStr)) {
  console.log('✅ 날짜 컬럼 찾기 성공!');
} else {
  console.log('❌ 날짜 컬럼 찾기 실패 (헤더 구성을 확인하세요)');
}

// 2. 색상 매핑 테스트
const testColors = [
  { argb: 'FFFF0000', expected: 'RESERVED', name: '표준 노랑' },
  { argb: 'FFFFCC00', expected: 'RESERVED', name: '밝은 노랑' },
  { argb: 'FFFFC0CB', expected: 'OCCUPIED', name: '분홍(Pink)' },
  { argb: 'FFFF00FF', expected: 'OCCUPIED', name: '마젠타' },
  { argb: undefined, expected: 'AVAILABLE', name: '색상 없음(공란)' }
];

console.log('\n--- 색상 매핑 테스트 ---');
testColors.forEach(tc => {
  const result = mapColorToStatus(tc.argb);
  const success = result === tc.expected;
  console.log(`[${tc.name}] ARGB: ${tc.argb || 'N/A'} -> 결과: ${result} (${success ? '✅' : '❌'})`);
});
