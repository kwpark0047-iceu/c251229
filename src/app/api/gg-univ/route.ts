/** 경기도 대학교 데이터 동기화 API */

import { createGGSyncHandlers } from '@/app/api/gg-common';

export const dynamic = 'force-dynamic';

const handlers = createGGSyncHandlers({
  endpoint: 'https://openapi.gg.go.kr/Univ',
  dataKey: 'Univ',
  envKey: 'GG_UNIV_API_KEY',
  label: 'GG Univ',
  mgtPrefix: 'GG_UNIV',
  serviceName: '대학교',
  category: 'EDUCATION',
  nameFields: ['FACLT_NM', 'BIZPLC_NM'],
  phoneField: 'TELNO',
  operatingStatus: '운영중',
  maxPages: 5,
  supportsSigun: false,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
