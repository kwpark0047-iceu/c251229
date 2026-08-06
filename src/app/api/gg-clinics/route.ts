/** 경기도 의원 인허가 데이터 동기화 API */

import { createGGSyncHandlers } from '@/app/api/gg-common';

export const dynamic = 'force-dynamic';

const handlers = createGGSyncHandlers({
  endpoint: 'https://openapi.gg.go.kr/AsembyStus',
  dataKey: 'AsembyStus',
  envKey: 'GG_CLINIC_API_KEY',
  label: 'GG Clinic',
  mgtPrefix: 'GG_CLINIC',
  serviceName: '의원',
  category: 'HEALTH',
  nameFields: ['BIZPLC_NM'],
  phoneField: 'LOCPLC_FACLT_TELNO',
  operatingStatus: '영업중',
  maxPages: 20,
  supportsSigun: true,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
