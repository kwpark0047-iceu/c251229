/**
 * 데이터베이스 통합 테스트
 * Supabase 연동 및 RLS 정책 테스트
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// 테스트용 Supabase 클라이언트
let supabase: any;

describe('데이터베이스 통합 테스트', () => {
  beforeAll(async () => {
    // 테스트 환경 설정
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
    );
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리
    await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  });

  describe('리드 관리', () => {
    it('새로운 리드를 생성할 수 있다', async () => {
      const testOrg = await supabase.from('organizations').insert({
        name: '테스트 조직',
        slug: 'test-org',
      }).select().single();

      const leadData = {
        biz_name: '테스트 상점',
        road_address: '서울시 강남구 테헤란로 123',
        biz_type: '음식점',
        category: 'FOOD',
        status: 'NEW',
        nearest_station: '강남역',
        distance: 500,
        organization_id: testOrg.data.id,
      };

      const result = await supabase.from('leads').insert(leadData).select().single();

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.biz_name).toBe('테스트 상점');
      expect(result.data.organization_id).toBe(testOrg.data.id);
    });

    it('조직별로 리드를 필터링할 수 있다', async () => {
      // 테스트 조직 생성
      const org1 = await supabase.from('organizations').insert({
        name: '조직 1',
        slug: 'org-1',
      }).select().single();

      const org2 = await supabase.from('organizations').insert({
        name: '조직 2',
        slug: 'org-2',
      }).select().single();

      // 각 조직에 리드 추가
      await supabase.from('leads').insert({
        biz_name: '조직1 리드',
        organization_id: org1.data.id,
      });

      await supabase.from('leads').insert({
        biz_name: '조직2 리드',
        organization_id: org2.data.id,
      });

      // 조직1 리드 조회
      const org1Leads = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', org1.data.id);

      expect(org1Leads.data).toHaveLength(1);
      expect(org1Leads.data[0].biz_name).toBe('조직1 리드');
    });

    it('리드 상태를 업데이트할 수 있다', async () => {
      const testOrg = await supabase.from('organizations').insert({
        name: '테스트 조직',
        slug: 'test-org',
      }).select().single();

      const lead = await supabase.from('leads').insert({
        biz_name: '테스트 상점',
        organization_id: testOrg.data.id,
        status: 'NEW',
      }).select().single();

      const updated = await supabase
        .from('leads')
        .update({ status: 'PROPOSAL_SENT' })
        .eq('id', lead.data.id)
        .select().single();

      expect(updated.error).toBeNull();
      expect(updated.data.status).toBe('PROPOSAL_SENT');
    });
  });

  describe('인벤토리 관리', () => {
    it('새로운 인벤토리를 생성할 수 있다', async () => {
      const inventoryData = {
        station_name: '강남역',
        line_num: '2',
        ad_type: '포스터',
        location: '1번 출구',
        size: 'A0',
        price: 2000000,
        stock: 10,
        organization_id: 'test-org-id',
      };

      const result = await supabase.from('ad_inventory').insert(inventoryData).select().single();

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.station_name).toBe('강남역');
      expect(result.data.price).toBe(2000000);
    });

    it('재고를 업데이트할 수 있다', async () => {
      const inventory = await supabase.from('ad_inventory').insert({
        station_name: '강남역',
        line_num: '2',
        ad_type: '포스터',
        stock: 10,
      }).select().single();

      const updated = await supabase
        .from('ad_inventory')
        .update({ stock: 15 })
        .eq('id', inventory.data.id)
        .select().single();

      expect(updated.error).toBeNull();
      expect(updated.data.stock).toBe(15);
    });
  });

  describe('CRM 기능', () => {
    it('통화 기록을 추가할 수 있다', async () => {
      const testOrg = await supabase.from('organizations').insert({
        name: '테스트 조직',
        slug: 'test-org',
      }).select().single();

      const lead = await supabase.from('leads').insert({
        biz_name: '테스트 상점',
        organization_id: testOrg.data.id,
      }).select().single();

      const callLogData = {
        lead_id: lead.data.id,
        user_id: 'test-user',
        call_type: 'INCOMING',
        duration: 300,
        summary: '초기 상담',
        next_action: '제안서 발송',
        organization_id: testOrg.data.id,
      };

      const result = await supabase.from('call_logs').insert(callLogData).select().single();

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.lead_id).toBe(lead.data.id);
      expect(result.data.call_type).toBe('INCOMING');
    });

    it('영업 진행상황을 관리할 수 있다', async () => {
      const testOrg = await supabase.from('organizations').insert({
        name: '테스트 조직',
        slug: 'test-org',
      }).select().single();

      const lead = await supabase.from('leads').insert({
        biz_name: '테스트 상점',
        organization_id: testOrg.data.id,
      }).select().single();

      const progressData = {
        lead_id: lead.data.id,
        step: 'INITIAL_CONTACT',
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        notes: '초기 연락 완료',
        organization_id: testOrg.data.id,
      };

      const result = await supabase.from('sales_progress').insert(progressData).select().single();

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.step).toBe('INITIAL_CONTACT');
      expect(result.data.status).toBe('COMPLETED');
    });
  });

  describe('제안서 관리', () => {
    it('제안서를 생성할 수 있다', async () => {
      const testOrg = await supabase.from('organizations').insert({
        name: '테스트 조직',
        slug: 'test-org',
      }).select().single();

      const lead = await supabase.from('leads').insert({
        biz_name: '테스트 상점',
        organization_id: testOrg.data.id,
      }).select().single();

      const proposalData = {
        lead_id: lead.data.id,
        title: '강남역 광고 제안서',
        content: '효과적인 광고 솔루션...',
        price: 5000000,
        duration: '3개월',
        status: 'DRAFT',
        organization_id: testOrg.data.id,
      };

      const result = await supabase.from('proposals').insert(proposalData).select().single();

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.lead_id).toBe(lead.data.id);
      expect(result.data.title).toBe('강남역 광고 제안서');
    });
  });

  describe('RLS 정책 테스트', () => {
    it('다른 조직의 데이터에 접근할 수 없다', async () => {
      // 조직 1 생성
      const org1 = await supabase.from('organizations').insert({
        name: '조직 1',
        slug: 'org-1',
      }).select().single();

      // 조직 2 생성
      const org2 = await supabase.from('organizations').insert({
        name: '조직 2',
        slug: 'org-2',
      }).select().single();

      // 조직 1에 리드 추가
      await supabase.from('leads').insert({
        biz_name: '조직1 리드',
        organization_id: org1.data.id,
      });

      // 조직 2 사용자로 조직 1 리드 조회 시도
      const result = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', org1.data.id);

      // RLS 정책에 따라 빈 결과 반환
      expect(result.data).toHaveLength(0);
    });

    it('인증되지 않은 사용자는 데이터에 접근할 수 없다', async () => {
      // 익명 클라이언트로 접근 시도
      const anonymousClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
        'anonymous-key'
      );

      const result = await anonymousClient.from('leads').select('*');

      // RLS 정책에 따라 빈 결과 반환
      expect(result.data).toHaveLength(0);
    });
  });

  describe('데이터 무결성', () => {
    it('필수 필드가 없으면 데이터를 생성할 수 없다', async () => {
      const result = await supabase.from('leads').insert({
        // biz_name 누락
        road_address: '서울시 강남구 테헤란로 123',
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.code).toBe('23502'); // NOT NULL violation
    });

    it('외래 키 제약 조건을 준수한다', async () => {
      const result = await supabase.from('leads').insert({
        biz_name: '테스트 상점',
        road_address: '서울시 강남구 테헤란로 456',
        organization_id: '00000000-0000-0000-0000-000000000000', // 형식은 맞지만 존재하지 않는 ID
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.code).toBe('23503'); // Foreign key violation
    });

    it('unique 제약 조건을 준수한다', async () => {
      const testOrg = await supabase.from('organizations').insert({
        name: '테스트 조직 ' + Date.now(),
        slug: 'test-org-' + Date.now(),
      }).select().single();

      if (!testOrg.data) throw new Error('Failed to create test org');

      // 첫 번째 리드 생성
      await supabase.from('leads').insert({
        biz_name: '동일한 상점명',
        road_address: '서울시 강남구 테헤란로 789',
        organization_id: testOrg.data.id,
      });

      // 동일한 상점명과 주소로 두 번째 리드 생성 시도
      const result = await supabase.from('leads').insert({
        biz_name: '동일한 상점명',
        road_address: '서울시 강남구 테헤란로 789',
        organization_id: testOrg.data.id,
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.code).toBe('23505'); // Unique violation
    });
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('ad_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('call_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('sales_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('proposals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  });
});
