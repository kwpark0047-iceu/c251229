'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, Upload, MapPin, Loader2, RefreshCw } from 'lucide-react';
import {
  FloorPlan,
  AdPosition,
  MetroLine,
  METRO_LINE_NAMES,
  METRO_LINE_COLORS,
} from '../../floor-plans/types';
import {
  getFloorPlansByLine,
  getAdPositionsByFloorPlan,
  getFloorPlanCounts,
} from '../../floor-plans/floor-plan-service';
import { downloadFloorPlanImage } from '../../floor-plans/storage-service';

import LineSelector from '../../floor-plans/components/LineSelector';
import StationList from '../../floor-plans/components/StationList';
import FloorPlanViewer from '../../floor-plans/components/OptimizedFloorPlanViewer';
import AdPositionDetail from '../../floor-plans/components/AdPositionDetail';
import BatchDownloadModal from '../../floor-plans/components/BatchDownloadModal';
import FloorPlanUploadModal from '../../floor-plans/components/FloorPlanUploadModal';
import AdPositionDetailModal from '../../floor-plans/components/AdPositionDetailModal';

export default function FloorPlansView() {
  // 상태
  const [selectedLine, setSelectedLine] = useState<MetroLine>('2');
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<FloorPlan | null>(null);
  const [adPositions, setAdPositions] = useState<AdPosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<AdPosition | null>(null);
  const [planCounts, setPlanCounts] = useState<Record<MetroLine, { station_layout: number; psd: number }> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 다운로드 모달
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedDownloadIds, setSelectedDownloadIds] = useState<string[]>([]);

  // 업로드 모달
  const [showUploadModal, setShowUploadModal] = useState(false);

  // 도면 통계 로드
  const loadCounts = useCallback(async () => {
    try {
      const counts = await getFloorPlanCounts();
      setPlanCounts(counts);
    } catch (err) {
      console.error('통계 로드 오류:', err);
    }
  }, []);

  // 노선별 도면 로드
  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFloorPlansByLine(selectedLine);
      setPlans(data);

      if (data.length > 0) {
        const samePlan = data.find(p => p.id === selectedPlan?.id);
        if (samePlan) {
          setSelectedPlan(samePlan);
        } else {
          setSelectedPlan(data[0]);
        }
      } else {
        setSelectedPlan(null);
      }
    } catch (err) {
      setError((err as Error).message);
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLine]);

  // 광고 위치 로드
  const loadAdPositions = useCallback(async () => {
    if (!selectedPlan) {
      setAdPositions([]);
      return;
    }

    try {
      const positions = await getAdPositionsByFloorPlan(selectedPlan.id);
      setAdPositions(positions);
    } catch (err) {
      console.error('광고 위치 로드 오류:', err);
      setAdPositions([]);
    }
  }, [selectedPlan]);

  // 초기 로드
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // 노선 변경 시 도면 로드
  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // 도면 선택 시 광고 위치 로드
  useEffect(() => {
    loadAdPositions();
  }, [loadAdPositions]);

  // 노선 변경 핸들러
  const handleLineChange = (line: MetroLine) => {
    setSelectedLine(line);
    setSelectedPlan(null);
  };

  // 도면 선택 핸들러
  const handleSelectPlan = (plan: FloorPlan) => {
    setSelectedPlan(plan);
  };

  // 단일 다운로드
  const handleDownload = async (plan: FloorPlan) => {
    const fileName = `${plan.lineNumber}호선_${plan.stationName}_${plan.planType}.jpg`;
    await downloadFloorPlanImage(plan.imageUrl, fileName);
  };

  // 일괄 다운로드 모달 열기
  const handleOpenDownloadModal = () => {
    setSelectedDownloadIds(plans.map((p) => p.id));
    setShowDownloadModal(true);
  };

  // 다운로드 선택 토글
  const handleToggleDownloadSelect = (id: string) => {
    setSelectedDownloadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 광고 위치 클릭
  const handlePositionClick = (position: AdPosition) => {
    setSelectedPosition(position);
  };

  const lineColor = METRO_LINE_COLORS[selectedLine];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[var(--bg-primary)]">
      {/* 액션 바 */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div
            className="p-2 rounded-xl bg-[--line-bg]"
            // eslint-disable-next-line react/forbid-dom-props
            style={{
              '--line-bg': `linear-gradient(135deg, ${lineColor}20 0%, ${lineColor}10 100%)`,
            } as React.CSSProperties}
          >
            <MapPin className="w-5 h-5 text-[--line-color]" 
              // eslint-disable-next-line react/forbid-dom-props
              style={{ '--line-color': lineColor } as React.CSSProperties} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
              역사 도면
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {METRO_LINE_NAMES[selectedLine]} • {plans.length}개 도면
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadCounts();
              loadPlans();
            }}
            className="p-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4 text-[var(--text-muted)]" />
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <Upload className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              업로드
            </span>
          </button>

          <button
            onClick={handleOpenDownloadModal}
            disabled={plans.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-white font-semibold disabled:opacity-50 transition-all shadow-md active:scale-95 bg-[--line-color]"
            // eslint-disable-next-line react/forbid-dom-props
            style={{ '--line-color': lineColor } as React.CSSProperties}
          >
            <Download className="w-4 h-4" />
            <span className="text-xs">일괄 다운로드</span>
          </button>
        </div>
      </div>

      {/* 노선 선택 */}
      <LineSelector
        selectedLine={selectedLine}
        onLineChange={handleLineChange}
        planCounts={planCounts ?? undefined}
      />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[--line-color]" 
                // eslint-disable-next-line react/forbid-dom-props
                style={{ '--line-color': lineColor } as React.CSSProperties} />
              <p className="text-[var(--text-muted)] text-sm font-medium">도면을 불러오는 중...</p>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20 text-[--line-color]" 
                // eslint-disable-next-line react/forbid-dom-props
                style={{ '--line-color': lineColor } as React.CSSProperties} />
              <p className="text-[var(--text-muted)] mb-2 font-medium">
                {METRO_LINE_NAMES[selectedLine]}에 등록된 도면이 없습니다
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 역 목록 사이드바 */}
            <div className="w-72 flex-shrink-0 border-r border-[var(--border-subtle)]">
              <StationList
                plans={plans}
                selectedPlanId={selectedPlan?.id ?? null}
                onSelectPlan={handleSelectPlan}
                lineNumber={selectedLine}
              />
            </div>

            {/* 도면 뷰어 영역 */}
            <div className="flex-1 relative bg-[var(--bg-tertiary)]">
              <FloorPlanViewer
                plan={selectedPlan}
                adPositions={adPositions}
                onDownload={handleDownload}
                onPositionClick={handlePositionClick}
              />

              <AdPositionDetail
                position={selectedPosition}
                onClose={() => setSelectedPosition(null)}
              />
            </div>
          </>
        )}
      </div>

      {/* 모달들 */}
      <BatchDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        plans={plans}
        selectedIds={selectedDownloadIds}
        onToggleSelect={handleToggleDownloadSelect}
        onSelectAll={() => setSelectedDownloadIds(plans.map((p) => p.id))}
        onDeselectAll={() => setSelectedDownloadIds([])}
      />

      <FloorPlanUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          loadCounts();
          loadPlans();
        }}
        defaultLine={selectedLine}
      />

      <AdPositionDetailModal
        isOpen={!!selectedPosition}
        onClose={() => setSelectedPosition(null)}
        position={selectedPosition}
      />
    </div>
  );
}
