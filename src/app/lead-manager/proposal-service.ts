/**
 * 서울 지하철 광고 영업 시스템 - 제안서 서비스
 * 제안서 생성, PDF 생성, 관리
 *
 * 이 파일은 기능별로 분리된 서비스 파일들의 배럴(barrel) re-export 입니다.
 * 기존 import 구문(page.tsx, proposal-service.test.ts)은 변경 없이 동작합니다.
 */

export * from './proposal-crud';
export * from './proposal-pdf';
export * from './proposal-email';
export * from './proposal-analysis';
export * from './proposal-greeting';
export * from './proposal-logs';