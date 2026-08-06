/** 경기도 전문대학 데이터 동기화 API */

import { createGGSyncHandlers } from '@/app/api/gg-common';

export const dynamic = 'force-dynamic';

const handlers = createGGSyncHandlers({
  endpoint: 'https://openapi.gg.go.kr/Jnclluniv',
  dataKey: 'Jnclluniv',
  envKey: 'GG_JNCL_UNIV_API_KEY',
  label: 'GG Jncl Univ',
  mgtPrefix: 'GG_JNCL',
  serviceName: '전문대학',
  category: 'EDUCATION',
  nameFields: ['FACLT_NM', 'BIZPLC_NM'],
  phoneField: 'TELNO',
  operatingStatus: '운영중',
  maxPages: 5,
  supportsSigun: false,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
