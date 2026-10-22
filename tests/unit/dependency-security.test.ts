// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';

const require = createRequire(import.meta.url);
const lock = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));

describe('보안 의존성 잠금 및 파일 호환성', () => {
  it.each([
    ['next', '16.4.2'],
    ['axios', '1.20.0'],
    ['follow-redirects', '1.16.1'],
    ['xlsx', '0.20.3'],
  ])('%s는 검증한 보안 버전으로 잠근다', (name, version) => {
    expect(lock.packages[`node_modules/${name}`].version).toBe(version);
  });

  it('레거시 XLS의 한글과 숫자 열을 유지한다', () => {
    const rows = [['역명', '위치코드', '가격'], ['강남', 'A-1', 1200000]];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), '재고');
    const data = XLSX.write(book, { type: 'array', bookType: 'biff8' });
    const parsed = XLSX.read(data, { type: 'array' });
    expect(XLSX.utils.sheet_to_json(parsed.Sheets[parsed.SheetNames[0]], { header: 1 })).toEqual(rows);
  });

  it('CSV의 한글 헤더와 인용된 쉼표를 유지한다', () => {
    const parsed = XLSX.read('역명,메모\r\n강남,"출구, 안쪽"', { type: 'string' });
    expect(XLSX.utils.sheet_to_json(parsed.Sheets[parsed.SheetNames[0]], { header: 1 }))
      .toEqual([['역명', '메모'], ['강남', '출구, 안쪽']]);
  });

  it('기존 가져오기 스크립트의 CP949 CSV 읽기를 유지한다', () => {
    const sheetjs = require('xlsx');
    const iconv = require('iconv-lite');
    const parsed = sheetjs.read(iconv.encode('역명,가격\r\n강남,1200', 'cp949'), { type: 'buffer', codepage: 949 });
    expect(sheetjs.utils.sheet_to_json(parsed.Sheets[parsed.SheetNames[0]], { header: 1 }))
      .toEqual([['역명', '가격'], ['강남', 1200]]);
  });

  it('서버 CSV 파서의 BOM·인용 필드·열 이름 매핑을 유지한다', () => {
    expect(parse('\uFEFF역명,메모\r\n강남,"출구, 안쪽"', { bom: true, columns: true }))
      .toEqual([{ 역명: '강남', 메모: '출구, 안쪽' }]);
    expect(lock.packages[''].dependencies['csv-parse']).toBe('7.0.3');
    expect(lock.packages[''].devDependencies['csv-parse']).toBeUndefined();
  });

  it('예약 작업은 배포 설정에서 계속 비활성화한다', () => {
    const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
    expect(config.crons).toEqual([]);
  });

  it('ExcelJS 조건부 서식의 UUID 생성과 XLSX 저장·재조회를 유지한다', async () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('재고');
    sheet.addRows([['역명', '가격'], ['강남', 1200]]);
    sheet.addConditionalFormatting({ ref: 'B2', rules: [{ type: 'dataBar', priority: 1, minLength: 0, maxLength: 100, cfvo: [{ type: 'min' }, { type: 'max' }] }] });
    const buffer = await book.xlsx.writeBuffer();
    const copy = new ExcelJS.Workbook();
    await copy.xlsx.load(buffer);
    expect(copy.worksheets[0].getCell('A2').value).toBe('강남');
    expect(copy.worksheets[0].getCell('B2').value).toBe(1200);
  });
});
