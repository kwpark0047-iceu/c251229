import React from 'react';
import { X, Calendar, DollarSign, Activity, Users, Info } from 'lucide-react';
import { AdPosition } from '../types';
import { 
  AVAILABILITY_LABELS, 
  AVAILABILITY_COLORS, 
  AD_TYPE_LABELS 
} from '../../lead-manager/types';

interface AdPositionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: AdPosition | null;
}

export default function AdPositionDetailModal({
  isOpen,
  onClose,
  position,
}: AdPositionDetailModalProps) {
  if (!isOpen || !position) return null;

  const { inventory, label, adCode } = position;
  const hasInventory = !!inventory;

  const availabilityStatus = inventory?.availabilityStatus || 'AVAILABLE';
  const statusColor = AVAILABILITY_COLORS[availabilityStatus] || AVAILABILITY_COLORS.AVAILABLE;
  const statusLabel = AVAILABILITY_LABELS[availabilityStatus] || '정보 없음';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[var(--border-subtle)] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {hasInventory ? inventory.locationCode : (adCode || '광고 위치 상세')}
              </h2>
              {hasInventory && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                  {statusLabel}
                </span>
              )}
            </div>
            <p className="text-[var(--text-muted)] text-sm">
              {hasInventory ? (AD_TYPE_LABELS[inventory.adType] || inventory.adType) : (label || '미등록 광고 위치')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {hasInventory ? (
            <>
              {/* Price Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 mb-2 text-[var(--text-muted)]">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">월 광고료</span>
                  </div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {inventory.priceMonthly?.toLocaleString()}원
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 mb-2 text-[var(--text-muted)]">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">주간 광고료</span>
                  </div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {inventory.priceWeekly?.toLocaleString() || '-'}원
                  </p>
                </div>
              </div>

              {/* Data Grid */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">사용 가능 기간</h4>
                    <p className="text-sm text-[var(--text-muted)]">
                      {inventory.availableFrom ? `${inventory.availableFrom} ~ ${inventory.availableTo || '별도 협의'}` : '즉시 가능'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">규격</h4>
                    <p className="text-sm text-[var(--text-muted)]">
                      {inventory.adSize || '규격 정보 없음'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">일일 유동인구 / 입지</h4>
                    <p className="text-sm text-[var(--text-muted)]">
                      {inventory.trafficDaily ? `${inventory.trafficDaily.toLocaleString()}명` : '-'}
                      {inventory.demographics && ` • ${inventory.demographics}`}
                    </p>
                  </div>
                </div>
                
                {inventory.description && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gray-500/10 text-gray-500 mt-0.5">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">상세 설명</h4>
                      <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">
                        {inventory.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-3">
                <Info className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">
                상세 정보가 없습니다
              </h3>
              <p className="text-[var(--text-muted)] text-sm">
                아직 인벤토리 데이터가 연결되지 않은 광고 위치입니다.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium transition-colors border border-[var(--border-subtle)]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
