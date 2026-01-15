/**
 * API 라우트 통합 테스트
 * 실제 API 엔드포인트 테스트
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { NextRequest } from 'next/server';

// 테스트 서버 설정
const server = createServer();

describe('API 라우트 통합 테스트', () => {
  beforeAll(async () => {
    // 테스트용 Supabase 클라이언트 설정
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.LOCALDATA_API_KEY = 'test-localdata-key';
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.KRIC_API_KEY = 'test-kric-key';
  });

  describe('/api/localdata', () => {
    it('POST 요청으로 사업자 데이터를 조회할 수 있다', async () => {
      const requestBody = {
        category: 'FOOD',
        region: '서울',
        page: 1,
        limit: 10,
      };

      const request = new NextRequest('http://localhost:3000/api/localdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // 실제 API 라우트 모듈 import
      const { GET, POST } = await import('../../src/app/api/localdata/route');
      
      if (POST) {
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('totalCount');
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it('잘못된 파라미터로 요청하면 400 에러를 반환한다', async () => {
      const requestBody = {
        category: 'INVALID_CATEGORY',
        region: '',
        page: -1,
        limit: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/localdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const { POST } = await import('../../src/app/api/localdata/route');
      
      if (POST) {
        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });

    it('GET 요청은 지원하지 않는다', async () => {
      const request = new NextRequest('http://localhost:3000/api/localdata');

      const { GET } = await import('../../src/app/api/localdata/route');
      
      if (GET) {
        const response = await GET(request);
        expect(response.status).toBe(405);
      }
    });
  });

  describe('/api/ai-proposal', () => {
    it('POST 요청으로 AI 제안서를 생성할 수 있다', async () => {
      const requestBody = {
        leadId: 'lead-1',
        businessType: '음식점',
        targetAudience: '20-30대',
        budget: 5000000,
        duration: '3개월',
        preferredStations: ['강남역', '역삼역'],
      };

      const request = new NextRequest('http://localhost:3000/api/ai-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const { POST } = await import('../../src/app/api/ai-proposal/route');
      
      if (POST) {
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('proposal');
        expect(data.proposal).toHaveProperty('title');
        expect(data.proposal).toHaveProperty('content');
        expect(data.proposal).toHaveProperty('price');
      }
    });

    it('필수 필드가 없으면 400 에러를 반환한다', async () => {
      const requestBody = {
        businessType: '음식점',
        // leadId 누락
      };

      const request = new NextRequest('http://localhost:3000/api/ai-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const { POST } = await import('../../src/app/api/ai-proposal/route');
      
      if (POST) {
        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });
  });

  describe('/api/send-proposal', () => {
    it('POST 요청으로 제안서 이메일을 발송할 수 있다', async () => {
      const requestBody = {
        to: 'client@example.com',
        subject: '광고 제안서 드립니다',
        proposalId: 'proposal-1',
        template: 'standard',
        customMessage: '맞춤형 광고 솔루션을 제안합니다.',
      };

      const request = new NextRequest('http://localhost:3000/api/send-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const { POST } = await import('../../src/app/api/send-proposal/route');
      
      if (POST) {
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('messageId');
      }
    });

    it('잘못된 이메일 주소로 요청하면 400 에러를 반환한다', async () => {
      const requestBody = {
        to: 'invalid-email',
        subject: '테스트',
        proposalId: 'proposal-1',
      };

      const request = new NextRequest('http://localhost:3000/api/send-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const { POST } = await import('../../src/app/api/send-proposal/route');
      
      if (POST) {
        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });
  });

  describe('/api/station-info', () => {
    it('GET 요청으로 역사 정보를 조회할 수 있다', async () => {
      const request = new NextRequest('http://localhost:3000/api/station-info?station=강남역');

      const { GET } = await import('../../src/app/api/station-info/route');
      
      if (GET) {
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
        
        if (data.data.length > 0) {
          expect(data.data[0]).toHaveProperty('stationName');
          expect(data.data[0]).toHaveProperty('lineNum');
        }
      }
    });

    it('station 파라미터가 없으면 400 에러를 반환한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/station-info');

      const { GET } = await import('../../src/app/api/station-info/route');
      
      if (GET) {
        const response = await GET(request);
        expect(response.status).toBe(400);
      }
    });

    it '캐싱이 동작한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/station-info?station=강남역');

      const { GET } = await import('../../src/app/api/station-info/route');
      
      if (GET) {
        // 첫 번째 요청
        const response1 = await GET(request);
        expect(response1.headers.get('cache-control')).toContain('max-age=');
        
        // 두 번째 요청 (캐시된 데이터 사용)
        const response2 = await GET(request);
        expect(response2.status).toBe(200);
      }
    });
  });

  describe('/api/backup', () => {
    it('POST 요청으로 데이터를 백업할 수 있다', async () => {
      const requestBody = {
        organizationId: 'org-1',
        includeLeads: true,
        includeInventory: true,
        includeCallLogs: true,
        includeProposals: true,
      };

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const { POST } = await import('../../src/app/api/backup/route');
      
      if (POST) {
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('backupId');
        expect(data).toHaveProperty('downloadUrl');
      }
    });

    it('GET 요청으로 백업 목록을 조회할 수 있다', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup?organizationId=org-1');

      const { GET } = await import('../../src/app/api/backup/route');
      
      if (GET) {
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('backups');
        expect(Array.isArray(data.backups)).toBe(true);
      }
    });

    it 'DELETE 요청으로 백업을 삭제할 수 있다', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup?backupId=backup-123', {
        method: 'DELETE',
      });

      const { DELETE } = await import('../../src/app/api/backup/route');
      
      if (DELETE) {
        const response = await DELETE(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success');
        expect(data.success).toBe(true);
      }
    });
  });

  describe('/api/floor-plans', () => {
    it('GET 요청으로 도면 목록을 조회할 수 있다', async () => {
      const request = new NextRequest('http://localhost:3000/api/floor-plans?line=2');

      const { GET } = await import('../../src/app/api/floor-plans/route');
      
      if (GET) {
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it('POST 요청으로 도면을 업로드할 수 있다', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg');
      formData.append('line', '2');
      formData.append('station', '강남역');
      formData.append('floor', '1');

      const request = new NextRequest('http://localhost:3000/api/floor-plans', {
        method: 'POST',
        body: formData,
      });

      const { POST } = await import('../../src/app/api/floor-plans/route');
      
      if (POST) {
        const response = await POST(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('floorPlanId');
      }
    });

    it '필수 필드가 없으면 400 에러를 반환한다', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg');
      // line, station, floor 누락

      const request = new NextRequest('http://localhost:3000/api/floor-plans', {
        method: 'POST',
        body: formData,
      });

      const { POST } = await import('../../src/app/api/floor-plans/route');
      
      if (POST) {
        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });
  });

  describe('API 에러 핸들링', () => {
    it '인증되지 않은 요청은 401 에러를 반환한다', async () => {
      // 인증 키 제거
      delete process.env.LOCALDATA_API_KEY;

      const requestBody = {
        category: 'FOOD',
        region: '서울',
      };

      const request = new NextRequest('http://localhost:3000/api/localdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const { POST } = await import('../../src/app/api/localdata/route');
      
      if (POST) {
        const response = await POST(request);
        expect(response.status).toBe(401);
      }
    });

    it '서버 내부 에러는 500 에러를 반환한다', async () => {
      // 잘못된 요청으로 서버 에러 유발
      const requestBody = {
        category: 'FOOD',
        region: null, // null 값으로 에러 유발
      };

      const request = new NextRequest('http://localhost:3000/api/localdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const { POST } = await import('../../src/app/api/localdata/route');
      
      if (POST) {
        const response = await POST(request);
        expect(response.status).toBe(500);
      }
    });
  });

  afterAll(() => {
    // 테스트 환경 정리
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.LOCALDATA_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.KRIC_API_KEY;
  });
});
