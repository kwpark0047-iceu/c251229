/** 경기도 음식점 인허가 데이터 동기화 API */

import { createGGSyncHandlers } from '@/app/api/gg-common';

export const dynamic = 'force-dynamic';

const handlers = createGGSyncHandlers({
  endpoint: 'https://openapi.gg.go.kr/GENRESTRT',
  dataKey: 'GENRESTRT',
  envKey: 'GG_REST_API_KEY',
  label: 'GG Restaurant',
  mgtPrefix: 'GG_REST',
  serviceName: '일반음식점',
  category: 'FOOD',
  nameFields: ['BIZPLC_NM'],
  phoneField: 'LOCPLC_FACLT_TELNO',
  operatingStatus: '영업중',
  maxPages: 20,
  supportsSigun: true,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
