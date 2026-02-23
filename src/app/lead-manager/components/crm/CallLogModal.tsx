'use client';

/**
 * 통화 기록 모달 컴포넌트
 */

import React, { useState } from 'react';
import { X, Phone, Clock, User, FileText, Calendar } from 'lucide-react';
import {
  CallOutcome,
  CALL_OUTCOME_LABELS,
  CALL_OUTCOME_COLORS,
} from '../../types';
import { logCall } from '../../crm-service';

interface CallLogModalProps {
  leadId: string;
  leadName: string;
  phone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CallLogModal({
  leadId,
  leadName,
  phone,
  onClose,
  onSuccess,
}: CallLogModalProps) {
  const [outcome, setOutcome] = useState<CallOutcome>('NO_ANSWER');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [nextAction, setNextAction] = useState<string>('');
  const [nextContactDate, setNextContactDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await logCall(leadId, outcome, {
      durationSeconds: durationMinutes ? parseInt(durationMinutes) * 60 : undefined,
      contactPerson: contactPerson || undefined,
      notes: notes || undefined,
      nextAction: nextAction || undefined,
      nextContactDate: nextContactDate || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      alert(result.message);
    }
  };

  const handleCall = () => {
    if (phone) {
      window.location.href = `tel:${phone.replace(/[^0-9]/g, '')}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">통화 기록</h2>
            <p className="text-sm text-slate-500">{leadName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 전화 버튼 */}
        {phone && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
            <button
              onClick={handleCall}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span>{phone}</span>
            </button>
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 통화 결과 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
              <Phone className="w-4 h-4" />
              통화 결과
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CALL_OUTCOME_LABELS) as CallOutcome[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOutcome(key)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${outcome === key
                      ? `${CALL_OUTCOME_COLORS[key].bg} ${CALL_OUTCOME_COLORS[key].text} border-current`
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {CALL_OUTCOME_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {/* 통화 시간 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Clock className="w-4 h-4" />
              통화 시간 (분)
            </label>
            <input
              id="call-duration"
              name="durationMinutes"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="예: 5"
              min="0"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 담당자명 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <User className="w-4 h-4" />
              담당자명
            </label>
            <input
              id="contact-person"
              name="contactPerson"
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="통화한 담당자 이름"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FileText className="w-4 h-4" />
              통화 메모
            </label>
            <textarea
              id="call-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="통화 내용을 기록하세요..."
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 다음 액션 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              다음 액션
            </label>
            <input
              id="next-action"
              name="nextAction"
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="예: 제안서 발송, 미팅 일정 조율"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 다음 연락일 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Calendar className="w-4 h-4" />
              다음 연락 예정일
            </label>
            <input
              id="next-contact-date"
              name="nextContactDate"
              type="date"
              value={nextContactDate}
              onChange={(e) => setNextContactDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
