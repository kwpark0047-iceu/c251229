import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

const categories = {
  SCHEMA_CONFIGURATION: { status: 503, message: '회원 승인 저장 설정을 확인해야 합니다. 관리자에게 문의해주세요.' },
  PERMISSION_CONFIGURATION: { status: 503, message: '회원 승인 저장 권한 설정을 확인해야 합니다. 관리자에게 문의해주세요.' },
  DATA_CONFLICT: { status: 409, message: '회원 상태 저장 조건이 충돌했습니다. 목록을 새로고침해 상태를 확인해주세요.' },
  DATABASE_UNAVAILABLE: { status: 503, message: '저장 결과를 확인하지 못했습니다. 재처리 전에 목록을 새로고침해 상태를 확인해주세요.' },
  UNKNOWN: { status: 500, message: '회원 처리 결과를 확인하지 못했습니다. 재처리 전에 목록을 새로고침해 상태를 확인해주세요.' },
} as const;

type Category = keyof typeof categories;
const codes: Readonly<Record<string, Category>> = {
  '42703': 'SCHEMA_CONFIGURATION', '42P01': 'SCHEMA_CONFIGURATION',
  PGRST204: 'SCHEMA_CONFIGURATION', PGRST205: 'SCHEMA_CONFIGURATION',
  '42501': 'PERMISSION_CONFIGURATION',
  '23503': 'DATA_CONFLICT', '23505': 'DATA_CONFLICT', '23514': 'DATA_CONFLICT',
  '08000': 'DATABASE_UNAVAILABLE', '08003': 'DATABASE_UNAVAILABLE', '08006': 'DATABASE_UNAVAILABLE',
  '53300': 'DATABASE_UNAVAILABLE', '57P01': 'DATABASE_UNAVAILABLE', '57014': 'DATABASE_UNAVAILABLE',
};

export function memberStatusFailure(error: unknown, stage: 'save' | 'unexpected') {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  // DB 원문에는 개인정보가 포함될 수 있어 알려진 코드만 기록한다.
  const known = typeof code === 'string' && Object.hasOwn(codes, code);
  const category: Category = known ? codes[code] : 'UNKNOWN';
  const requestId = randomUUID();
  console.error('[AdminMemberPatch]', {
    event: 'member_status_failed', stage, category,
    databaseCode: known ? code : 'UNKNOWN', requestId,
  });
  const { status, message } = categories[category];
  return NextResponse.json({ success: false, errorCode: category, requestId,
    message: `${message} (문의번호: ${requestId})` }, { status, headers: { 'X-Request-ID': requestId } });
}
