'use client';

/**
 * 리드 상세 패널 (CRM 기능 통합)
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Train,
  Calendar,
  FileText,
  Clock,
  ChevronRight,
  ExternalLink,
  Plus,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  MoreVertical,
} from 'lucide-react';
import {
  LeadWithCRM,
  CallLog,
  Proposal,
  ProposalStatus,
  CALL_OUTCOME_LABELS,
  CALL_OUTCOME_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_COLORS,
} from '../../types';
import { getLeadWithCRM, generateMailtoLink, generateTelLink } from '../../crm-service';
import { findInventoryForLead } from '../../inventory-service';
import { downloadProposalPDF, updateProposal } from '../../proposal-service';
import { formatDistance } from '../../utils';
import ProgressChecklist from './ProgressChecklist';
import CallLogModal from './CallLogModal';
import ProposalForm from '../ProposalForm';

interface LeadDetailPanelProps {
  leadId: string;
  onClose: () => void;
  onStatusChange?: () => void;
}

export default function LeadDetailPanel({
  leadId,
  onClose,
  onStatusChange,
}: LeadDetailPanelProps) {
  const [lead, setLead] = useState<LeadWithCRM | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'calls' | 'proposals'>('info');
  const [showCallModal, setShowCallModal] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [inventoryCount, setInventoryCount] = useState(0);

  useEffect(() => {
    loadLead();
  }, [leadId]);

  const loadLead = async () => {
    setLoading(true);
    const data = await getLeadWithCRM(leadId);
    setLead(data);

    // 인근 광고매체 수 조회
    if (data) {
      const inventory = await findInventoryForLead(data);
      setInventoryCount(inventory.length);
    }

    setLoading(false);
  };

  if (loading || !lead) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[lead.status];

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* 헤더 */}
        <div className={`${statusColor.bg} px-6 py-4 border-b ${statusColor.border}`}>
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-xs font-medium ${statusColor.text}`}>
                {STATUS_LABELS[lead.status]}
              </span>
              <h2 className="text-lg font-semibold text-slate-800 mt-1">
                {lead.bizName}
              </h2>
              {lead.medicalSubject && (
                <p className="text-sm text-slate-600">{lead.medicalSubject}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="flex gap-2 px-4 py-3 border-b border-slate-200">
          {lead.phone && (
            <a
              href={generateTelLink(lead.phone)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">전화</span>
            </a>
          )}
          <button
            onClick={() => setShowCallModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm">통화기록</span>
          </button>
          <button
            onClick={() => setShowProposalForm(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span className="text-sm">제안서</span>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-slate-200">
          {[
            { key: 'info', label: '정보' },
            { key: 'calls', label: `통화 (${lead.callLogs?.length || 0})` },
            { key: 'proposals', label: `제안서 (${lead.proposals?.length || 0})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">기본 정보</h3>
                <div className="space-y-3">
                  {lead.roadAddress && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-600">{lead.roadAddress}</span>
                    </div>
                  )}
                  {lead.nearestStation && (
                    <div className="flex items-start gap-3">
                      <Train className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm text-slate-600">
                          {lead.nearestStation}역
                        </span>
                        {lead.stationDistance && (
                          <span className="text-sm text-slate-400 ml-2">
                            ({formatDistance(lead.stationDistance)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {lead.licenseDate && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-600">
                        인허가: {lead.licenseDate}
                      </span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-600">{lead.phone}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* 인근 광고매체 */}
              {inventoryCount > 0 && (
                <section className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-blue-800">
                        인근 광고매체
                      </h3>
                      <p className="text-sm text-blue-600">
                        {inventoryCount}개의 가용 광고 위치
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-blue-600" />
                  </div>
                </section>
              )}

              {/* 영업 진행 체크리스트 */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  영업 진행 상황
                </h3>
                <ProgressChecklist
                  leadId={leadId}
                  onUpdate={() => {
                    loadLead();
                    onStatusChange?.();
                  }}
                />
              </section>

              {/* 메모 */}
              {lead.notes && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">메모</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    {lead.notes}
                  </p>
                </section>
              )}
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="space-y-3">
              {lead.callLogs && lead.callLogs.length > 0 ? (
                lead.callLogs.map(log => (
                  <CallLogCard key={log.id} log={log} />
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>통화 기록이 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'proposals' && (
            <div className="space-y-4">
              {/* 새 제안서 버튼 */}
              <button
                onClick={() => setShowProposalForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 제안서 작성
              </button>

              {/* 제안서 목록 */}
              {lead.proposals && lead.proposals.length > 0 ? (
                lead.proposals.map(proposal => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onStatusChange={async (status) => {
                      await updateProposal(proposal.id, { status });
                      loadLead();
                      onStatusChange?.();
                    }}
                    onDownloadPDF={() => downloadProposalPDF(proposal.id)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>제안서가 없습니다.</p>
                  <p className="text-sm mt-1">위 버튼을 클릭하여 첫 제안서를 작성하세요.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 통화 기록 모달 */}
      {showCallModal && (
        <CallLogModal
          leadId={leadId}
          leadName={lead.bizName}
          phone={lead.phone}
          onClose={() => setShowCallModal(false)}
          onSuccess={() => {
            loadLead();
            onStatusChange?.();
          }}
        />
      )}

      {/* 제안서 작성 폼 */}
      {showProposalForm && (
        <ProposalForm
          lead={lead}
          onClose={() => setShowProposalForm(false)}
          onSuccess={() => {
            loadLead();
            onStatusChange?.();
          }}
        />
      )}
    </>
  );
}

/**
 * 통화 기록 카드
 */
function CallLogCard({ log }: { log: CallLog }) {
  const outcomeColor = CALL_OUTCOME_COLORS[log.outcome];

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${outcomeColor.bg} ${outcomeColor.text}`}
          >
            {CALL_OUTCOME_LABELS[log.outcome]}
          </span>
          {log.durationSeconds && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.ceil(log.durationSeconds / 60)}분
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {new Date(log.calledAt).toLocaleString('ko-KR')}
        </span>
      </div>

      {log.contactPerson && (
        <p className="text-sm text-slate-600 mt-2">
          담당자: {log.contactPerson}
        </p>
      )}

      {log.notes && (
        <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">
          {log.notes}
        </p>
      )}

      {log.nextAction && (
        <p className="text-sm text-blue-600 mt-2">
          다음: {log.nextAction}
          {log.nextContactDate && ` (${log.nextContactDate})`}
        </p>
      )}
    </div>
  );
}

/**
 * 제안서 카드
 */
function ProposalCard({
  proposal,
  onStatusChange,
  onDownloadPDF,
}: {
  proposal: Proposal;
  onStatusChange: (status: ProposalStatus) => void;
  onDownloadPDF: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const statusColor = PROPOSAL_STATUS_COLORS[proposal.status];

  const statusOptions: ProposalStatus[] = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED'];

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-lg">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-slate-800">{proposal.title}</h4>
          {proposal.createdAt && (
            <p className="text-xs text-slate-400 mt-1">
              {new Date(proposal.createdAt).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${statusColor.bg} ${statusColor.text}`}
          >
            {PROPOSAL_STATUS_LABELS[proposal.status]}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                {statusOptions.map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(status);
                      setShowMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                      proposal.status === status ? 'bg-slate-100 font-medium' : ''
                    }`}
                  >
                    {PROPOSAL_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 정보 */}
      <div className="mt-3 space-y-2">
        {proposal.inventoryIds && proposal.inventoryIds.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>광고 매체 {proposal.inventoryIds.length}개</span>
          </div>
        )}
        {proposal.finalPrice && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">월 광고비:</span>
            <span className="font-semibold text-blue-600">
              {proposal.finalPrice.toLocaleString()}원
            </span>
            {proposal.discountRate && proposal.discountRate > 0 && (
              <span className="text-xs text-red-500">(-{proposal.discountRate}%)</span>
            )}
          </div>
        )}
        {proposal.sentAt && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Send className="w-3 h-3" />
            <span>발송: {new Date(proposal.sentAt).toLocaleString('ko-KR')}</span>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onDownloadPDF}
          className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          PDF
        </button>
        {proposal.emailRecipient && (
          <a
            href={`mailto:${proposal.emailRecipient}`}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Mail className="w-4 h-4" />
            재발송
          </a>
        )}
      </div>
    </div>
  );
}
