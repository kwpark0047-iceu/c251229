import { getProposals } from './proposal-crud';
import { getLeads } from './supabase-service';
import { getProgressBatch } from './crm-service';
import type { Contract, Lead, SalesProgress } from './types';

const CONTRACT_DEFAULT_MONTHS = 12;
const EXPIRING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function getContractStatus(endDate?: string): 'active' | 'expiring' | 'expired' | 'unknown' {
  if (!endDate) return 'unknown';
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return 'unknown';
  const now = Date.now();
  if (end < now) return 'expired';
  if (end - now < EXPIRING_WINDOW_MS) return 'expiring';
  return 'active';
}

function parseContractDates(progressList: SalesProgress[]): { startDate?: string; endDate?: string } {
  const contractStep = progressList.find((sp) => sp.step === 'CONTRACT_SIGNED');
  if (!contractStep?.notes) return {};
  try {
    const parsed = JSON.parse(contractStep.notes);
    if (parsed && typeof parsed === 'object') {
      return {
        startDate: typeof parsed.startDate === 'string' ? parsed.startDate : undefined,
        endDate: typeof parsed.endDate === 'string' ? parsed.endDate : undefined,
      };
    }
  } catch {
    return {};
  }
  return {};
}

function deriveEndDate(startDate?: string): string | undefined {
  if (!startDate) return undefined;
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setMonth(d.getMonth() + CONTRACT_DEFAULT_MONTHS);
  return d.toISOString();
}

export async function getContracts(): Promise<{ success: boolean; contracts: Contract[]; message: string }> {
  try {
    const [propResult, leadResult] = await Promise.all([
      getProposals({ status: 'ACCEPTED' }),
      getLeads({ pageSize: 200 }),
    ]);
    if (!propResult.success || !leadResult.success) {
      return { success: false, contracts: [], message: '계약 데이터를 불러오지 못했습니다.' };
    }
    const leadMap = new Map<string, Lead>(leadResult.leads.map((l) => [l.id, l]));
    const leadIds = [...new Set(propResult.proposals.map((p) => p.leadId))];
    const progressMap = leadIds.length > 0 ? await getProgressBatch(leadIds) : new Map<string, SalesProgress[]>();

    const contracts: Contract[] = propResult.proposals.map((p) => {
      const lead = leadMap.get(p.leadId);
      const parsed = parseContractDates(progressMap.get(p.leadId) ?? []);
      const startDate = parsed.startDate || p.updatedAt || p.sentAt || undefined;
      const endDate = parsed.endDate || deriveEndDate(startDate);
      return {
        id: p.id,
        leadId: p.leadId,
        lead,
        proposalTitle: p.title,
        totalPrice: p.totalPrice,
        discountRate: p.discountRate,
        finalPrice: p.finalPrice,
        acceptedAt: p.updatedAt,
        sentAt: p.sentAt,
        startDate,
        endDate,
        organizationId: p.organizationId,
      };
    });
    contracts.sort((a, b) => (b.acceptedAt ?? '').localeCompare(a.acceptedAt ?? ''));
    return { success: true, contracts, message: '' };
  } catch (e) {
    return {
      success: false,
      contracts: [],
      message: e instanceof Error ? e.message : '계약 데이터를 불러오지 못했습니다.',
    };
  }
}
