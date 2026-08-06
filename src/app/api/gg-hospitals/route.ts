/** 경기도 병원 인허가 데이터 동기화 API */

import { createGGSyncHandlers } from '@/app/api/gg-common';

export const dynamic = 'force-dynamic';

const handlers = createGGSyncHandlers({
  endpoint: 'https://openapi.gg.go.kr/GgHosptlM',
  dataKey: 'GgHosptlM',
  envKey: 'GG_HOSPITAL_API_KEY',
  label: 'GG Hospital',
  mgtPrefix: 'GG_HOSPITAL',
  serviceName: '병원',
  category: 'HEALTH',
  nameFields: ['BIZPLC_NM'],
  phoneField: 'LOCPLC_FACLT_TELNO',
  operatingStatus: '영업중',
  maxPages: 20,
  supportsSigun: true,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
