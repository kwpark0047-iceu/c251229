import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContracts, getContractStatus } from './contract-service';
import { getProposals } from './proposal-crud';
import { getLeads } from './supabase-service';
import { getProgressBatch } from './crm-service';
import type { Proposal, Lead, SalesProgress } from './types';

vi.mock('./proposal-crud', () => ({ getProposals: vi.fn() }));
vi.mock('./supabase-service', () => ({ getLeads: vi.fn() }));
vi.mock('./crm-service', () => ({ getProgressBatch: vi.fn() }));

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'p1',
    leadId: 'l1',
    title: '테스트 제안서',
    totalPrice: 100000000,
    discountRate: 10,
    finalPrice: 90000000,
    status: 'ACCEPTED',
    sentAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    organizationId: 'org-1',
    ...overrides,
  } as Proposal;
}

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'l1',
    bizName: '테스트상점',
    nearestStation: '강남역',
    status: 'ACTIVE',
    ...overrides,
  } as Lead;
}

function makeProgress(overrides: Partial<SalesProgress> = {}): SalesProgress {
  return {
    id: 'sp1',
    leadId: 'l1',
    step: 'CONTRACT_SIGNED',
    completedAt: '2026-01-15T00:00:00.000Z',
    notes: JSON.stringify({ startDate: '2026-01-15', endDate: '2027-01-15' }),
    ...overrides,
  } as SalesProgress;
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe('contract-service: getContractStatus', () => {
  it('만료일이 없으면 unknown을 반환한다', () => {
    expect(getContractStatus(undefined)).toBe('unknown');
    expect(getContractStatus('')).toBe('unknown');
  });

  it('잘못된 날짜 문자열이면 unknown을 반환한다', () => {
    expect(getContractStatus('not-a-date')).toBe('unknown');
  });

  it('과거 만료일이면 expired를 반환한다', () => {
    expect(getContractStatus(new Date(Date.now() - 10 * DAY_MS).toISOString())).toBe('expired');
  });

  it('30일 이내 만료일이면 expiring을 반환한다', () => {
    expect(getContractStatus(new Date(Date.now() + 10 * DAY_MS).toISOString())).toBe('expiring');
  });

  it('30일 이후 만료일이면 active를 반환한다', () => {
    expect(getContractStatus(new Date(Date.now() + 60 * DAY_MS).toISOString())).toBe('active');
  });
});

describe('contract-service: getContracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('수락된 제안서를 리드 정보와 조인해 계약 목록을 반환한다', async () => {
    vi.mocked(getProposals).mockResolvedValue({
      success: true,
      proposals: [makeProposal()],
      message: '',
    });
    vi.mocked(getLeads).mockResolvedValue({
      success: true,
      leads: [makeLead()],
      count: 1,
      message: '',
    });
    vi.mocked(getProgressBatch).mockResolvedValue(new Map([['l1', [makeProgress()]]]));

    const result = await getContracts();

    expect(result.success).toBe(true);
    expect(result.contracts).toHaveLength(1);
    const contract = result.contracts[0];
    expect(contract.lead?.bizName).toBe('테스트상점');
    expect(contract.finalPrice).toBe(90000000);
    expect(contract.startDate).toBe('2026-01-15'); // 계약 단계 notes의 startDate 우선
    expect(contract.endDate).toBe('2027-01-15');
  });

  it('계약 단계 notes가 없으면 updatedAt을 계약일로, +12개월을 만료일로 파생한다', async () => {
    vi.mocked(getProposals).mockResolvedValue({
      success: true,
      proposals: [makeProposal()],
      message: '',
    });
    vi.mocked(getLeads).mockResolvedValue({
      success: true,
      leads: [makeLead()],
      count: 1,
      message: '',
    });
    vi.mocked(getProgressBatch).mockResolvedValue(new Map()); // 진행 단계 없음

    const result = await getContracts();

    expect(result.success).toBe(true);
    const contract = result.contracts[0];
    expect(contract.startDate).toBe('2026-01-15T00:00:00.000Z'); // updatedAt 사용
    expect(contract.endDate).toBe('2027-01-15T00:00:00.000Z'); // +12개월
  });

  it('acceptedAt(updatedAt) 내림차순으로 정렬한다', async () => {
    vi.mocked(getProposals).mockResolvedValue({
      success: true,
      proposals: [
        makeProposal({ id: 'p-old', leadId: 'l1', updatedAt: '2026-01-01T00:00:00.000Z' }),
        makeProposal({ id: 'p-new', leadId: 'l2', updatedAt: '2026-03-01T00:00:00.000Z' }),
      ],
      message: '',
    });
    vi.mocked(getLeads).mockResolvedValue({
      success: true,
      leads: [
        makeLead({ id: 'l1', bizName: '오래된상점' }),
        makeLead({ id: 'l2', bizName: '새상점' }),
      ],
      count: 2,
      message: '',
    });
    vi.mocked(getProgressBatch).mockResolvedValue(new Map());

    const result = await getContracts();

    expect(result.contracts[0].id).toBe('p-new');
    expect(result.contracts[1].id).toBe('p-old');
  });

  it('제안서 조회 실패 시 실패 결과와 빈 목록을 반환한다', async () => {
    vi.mocked(getProposals).mockResolvedValue({
      success: false,
      proposals: [],
      message: '조회 실패',
    });

    const result = await getContracts();

    expect(result.success).toBe(false);
    expect(result.contracts).toHaveLength(0);
  });

  it('리드 조회 실패 시 실패 결과와 빈 목록을 반환한다', async () => {
    vi.mocked(getProposals).mockResolvedValue({
      success: true,
      proposals: [makeProposal()],
      message: '',
    });
    vi.mocked(getLeads).mockResolvedValue({
      success: false,
      leads: [],
      count: 0,
      message: '리드 조회 실패',
    });

    const result = await getContracts();

    expect(result.success).toBe(false);
    expect(result.contracts).toHaveLength(0);
  });

  it('ACCEPTED 상태로 조회를 요청하고 비수락 제안서는 제외한다', async () => {
    const allProposals = [
      makeProposal({ status: 'ACCEPTED' }),
      makeProposal({ id: 'p-draft', leadId: 'l2', status: 'SENT' }),
    ];
    vi.mocked(getProposals).mockImplementation(async (opts?: { status?: string }) => {
      const accepted = allProposals.filter((p) => !opts?.status || p.status === opts.status);
      return { success: true, proposals: accepted, message: '' };
    });
    vi.mocked(getLeads).mockResolvedValue({
      success: true,
      leads: [makeLead({ id: 'l1' }), makeLead({ id: 'l2', bizName: '초안상점' })],
      count: 2,
      message: '',
    });
    vi.mocked(getProgressBatch).mockResolvedValue(new Map());

    const result = await getContracts();

    expect(getProposals).toHaveBeenCalledWith({ status: 'ACCEPTED' });
    expect(result.contracts).toHaveLength(1);
    expect(result.contracts[0].id).toBe('p1');
  });
});
