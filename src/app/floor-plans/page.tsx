'use client';

/**
 * 지하철 역사 도면 페이지
 * 노선별 도면 뷰어 및 광고 위치 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, MapPin, Loader2, RefreshCw, Home, Users } from 'lucide-react';
import {
  FloorPlan,
  AdPosition,
  MetroLine,
  METRO_LINE_NAMES,
  METRO_LINE_COLORS,
} from './types';
import {
  getFloorPlansByLine,
  getAdPositionsByFloorPlan,
  getFloorPlanCounts,
} from './floor-plan-service';
import { downloadFloorPlanImage } from './storage-service';

import LineSelector from './components/LineSelector';
import StationList from './components/StationList';
import FloorPlanViewer from './components/FloorPlanViewer';
import BatchDownloadModal from './components/BatchDownloadModal';
import FloorPlanUploadModal from './components/FloorPlanUploadModal';
import AdPositionDetailModal from './components/AdPositionDetailModal';
import ThemeToggle from '@/components/ThemeToggle';

export default function FloorPlansPage() {
  const router = useRouter();

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

      // 첫 번째 도면 자동 선택
      if (data.length > 0 && !selectedPlan) {
        setSelectedPlan(data[0]);
      } else if (data.length > 0) {
        // 같은 노선의 도면이 있는지 확인
        const samePlan = data.find(p => p.id === selectedPlan?.id);
        if (!samePlan) {
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
  }, [selectedLine, selectedPlan]);

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
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* 헤더 */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-xl">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 네비게이션 버튼 */}
              <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                <button
                  onClick={() => router.push('/')}
                  className="p-2.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  title="메인페이지"
                >
                  <Home className="w-5 h-5" />
                </button>
                <button
                  onClick={() => router.push('/lead-manager')}
                  className="p-2.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  title="영업관리"
                >
                  <Users className="w-5 h-5" />
                </button>
              </div>

              <div
                className="p-3 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${lineColor}20 0%, ${lineColor}10 100%)`,
                }}
              >
                <MapPin className="w-6 h-6" style={{ color: lineColor }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  지하철 역사 도면
                </h1>
                <p className="text-sm text-[var(--text-muted)]">
                  {METRO_LINE_NAMES[selectedLine]} • {plans.length}개 도면
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 테마 토글 */}
              <ThemeToggle />

              {/* 새로고침 */}
              <button
                onClick={() => {
                  loadCounts();
                  loadPlans();
                }}
                className="p-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors"
                title="새로고침"
              >
                <RefreshCw className="w-5 h-5 text-[var(--text-muted)]" />
              </button>

              {/* 업로드 버튼 */}
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <Upload className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  업로드
                </span>
              </button>

              {/* 일괄 다운로드 버튼 */}
              <button
                onClick={handleOpenDownloadModal}
                disabled={plans.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-50 transition-opacity"
                style={{ background: lineColor }}
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">일괄 다운로드</span>
              </button>
            </div>
          </div>
        </div>
      </header>

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
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: lineColor }} />
              <p className="text-[var(--text-muted)]">도면을 불러오는 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={loadPlans}
                className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: lineColor }} />
              <p className="text-[var(--text-muted)] mb-2">
                {METRO_LINE_NAMES[selectedLine]}에 등록된 도면이 없습니다
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                도면을 업로드하여 시작하세요
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 역 목록 사이드바 */}
            <div className="w-72 flex-shrink-0">
              <StationList
                plans={plans}
                selectedPlanId={selectedPlan?.id ?? null}
                onSelectPlan={handleSelectPlan}
                lineNumber={selectedLine}
              />
            </div>

            {/* 도면 뷰어 */}
            <FloorPlanViewer
              plan={selectedPlan}
              adPositions={adPositions}
              onDownload={handleDownload}
              onPositionClick={handlePositionClick}
            />
          </>
        )}
      </div>

      {/* 일괄 다운로드 모달 */}
      <BatchDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        plans={plans}
        selectedIds={selectedDownloadIds}
        onToggleSelect={handleToggleDownloadSelect}
        onSelectAll={() => setSelectedDownloadIds(plans.map((p) => p.id))}
        onDeselectAll={() => setSelectedDownloadIds([])}
      />

      {/* 업로드 모달 */}
      <FloorPlanUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          loadCounts();
          loadPlans();
        }}
        defaultLine={selectedLine}
      />

      {/* 광고 위치 상세 모달 */}
      <AdPositionDetailModal
        isOpen={!!selectedPosition}
        onClose={() => setSelectedPosition(null)}
        position={selectedPosition}
      />
    </div>
  );
}
