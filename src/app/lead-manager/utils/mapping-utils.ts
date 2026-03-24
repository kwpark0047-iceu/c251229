/**
 * 서울 지하철 광고 영업 시스템 - 공통 매핑 유틸리티
 */

import { Proposal, ProposalStatus, EffectAnalysis, CallLog, CallOutcome, SalesProgress, ProgressStep } from '../types';

/**
 * 날짜/시간 문자열 변환 (안전한 String 변환)
 */
export const toString = (val: unknown): string | undefined => (val ? String(val) : undefined);

/**
 * 숫자 변환 (안전한 Number 변환)
 */
export const toNumber = (val: unknown): number | undefined => (val !== null && val !== undefined ? Number(val) : undefined);

/**
 * 불리언 변환
 */
export const toBoolean = (val: unknown): boolean => Boolean(val);

/**
 * DB Row에서 Proposal 객체로 매핑
 */
export function mapProposalFromDB(row: Record<string, unknown>): Proposal {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    title: String(row.title),
    greetingMessage: toString(row.greeting_message),
    inventoryIds: (row.inventory_ids as string[]) || [],
    totalPrice: toNumber(row.total_price),
    discountRate: toNumber(row.discount_rate),
    finalPrice: toNumber(row.final_price),
    effectAnalysis: row.effect_analysis as EffectAnalysis | undefined,
    pdfUrl: toString(row.pdf_url),
    isExternal: toBoolean(row.is_external),
    originalFilename: toString(row.original_filename),
    fileType: toString(row.file_type),
    status: (row.status as ProposalStatus) || 'DRAFT',
    sentAt: toString(row.sent_at),
    viewedAt: toString(row.viewed_at),
    emailRecipient: toString(row.email_recipient),
    organizationId: toString(row.organization_id),
    createdAt: toString(row.created_at),
    updatedAt: toString(row.updated_at),
  };
}

/**
 * DB Row에서 CallLog 객체로 매핑
 */
export function mapCallLogFromDB(row: Record<string, unknown>): CallLog {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    calledAt: String(row.called_at),
    durationSeconds: toNumber(row.duration_seconds),
    outcome: row.outcome as CallOutcome,
    contactPerson: toString(row.contact_person),
    notes: toString(row.notes),
    nextAction: toString(row.next_action),
    nextContactDate: toString(row.next_contact_date),
    createdAt: toString(row.created_at),
  };
}

/**
 * DB Row에서 SalesProgress 객체로 매핑
 */
export function mapSalesProgressFromDB(row: Record<string, unknown>): SalesProgress {
  return {
    id: String(row.id),
    leadId: String(row.lead_id),
    step: row.step as ProgressStep,
    completedAt: toString(row.completed_at),
    notes: toString(row.notes),
  };
}
