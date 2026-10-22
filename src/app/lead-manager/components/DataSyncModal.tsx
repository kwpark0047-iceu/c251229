'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, RefreshCw, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronUp, Database, MapPin,
} from 'lucide-react';

// ============================================================
// 타입 정의
// ============================================================

interface SourceConfig {
  key: string;
  label: string;
  region: '경기도' | '서울';
  category: string;
  hasKey: boolean;
  envKey?: string;
  disabled?: boolean;
  disabledReason?: string;
}

type SyncStatus = 'idle' | 'running' | 'success' | 'error';

interface SourceResult {
  source: string;
  label: string;
  total: number;
  fetched: number;
  saved: number;
  error?: string;
  warning?: string;
}

interface SyncRequestBody {
  sources: string[];
  sync: true;
  sigunNm?: string;
  apiKeys?: Record<string, string>;
}

interface SyncResponse {
  results?: SourceResult[];
  error?: string;
}

interface SourceState {
  status: SyncStatus;
  result?: SourceResult;
}

// ============================================================
// 경기도 시군구 목록
// ============================================================

const GG_SIGUNS = [
  '수원시', '성남시', '의정부시', '안양시', '부천시', '광명시', '평택시',
  '동두천시', '안산시', '고양시', '과천시', '구리시', '남양주시', '오산시',
  '시흥시', '군포시', '의왕시', '하남시', '용인시', '파주시', '이천시',
  '안성시', '김포시', '화성시', '광주시', '양주시', '포천시', '여주시',
  '연천군', '가평군', '양평군',
];

// ============================================================
// 메인 컴포넌트
// ============================================================

interface DataSyncModalProps {
  onClose: () => void;
  onSyncComplete?: (savedCount: number) => void;
}

export default function DataSyncModal({ onClose, onSyncComplete }: DataSyncModalProps) {
  const syncLock = useRef(false);
  const [loadError, setLoadError] = useState('');
  const [sources, setSources] = useState<SourceConfig[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [sigunNm, setSigunNm] = useState<string>('');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [sourceStates, setSourceStates] = useState<Record<string, SourceState>>({});
  const [totalSaved, setTotalSaved] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [currentSource, setCurrentSource] = useState<string>('');

  // 사용 가능한 소스 목록 로드
  useEffect(() => {
    fetch('/api/sync-all')
      .then(async r => { if (!r.ok) throw new Error('소스 목록을 불러오지 못했습니다.'); return r.json(); })
      .then(data => {
        setSources(data.sources || []);
        // API 키가 있고 비활성(disabled)이 아닌 소스만 기본 선택
        const defaultSelected = (data.sources || [])
          .filter((s: SourceConfig) => s.hasKey && !s.disabled)
          .map((s: SourceConfig) => s.key);
        setSelectedSources(defaultSelected);
      })
      .catch(() => setLoadError('동기화 소스 목록을 불러오지 못했습니다. 다시 열어 주세요.'));
  }, []);

  const toggleSource = (key: string) => {
    setSelectedSources(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllByRegion = (region: '경기도' | '서울') => {
    if (syncLock.current) return;
    const regionKeys = sources.filter(s => s.region === region && s.hasKey && !s.disabled).map(s => s.key);
    const allSelected = regionKeys.every(k => selectedSources.includes(k));
    if (allSelected) {
      setSelectedSources(prev => prev.filter(k => !regionKeys.includes(k)));
    } else {
      setSelectedSources(prev => [...new Set([...prev, ...regionKeys])]);
    }
  };

  const startSync = async () => {
    if (selectedSources.length === 0 || syncLock.current) return;
    syncLock.current = true;

    setSyncState('syncing');
    setTotalSaved(0);

    // 선택된 소스별 상태 초기화
    const initialStates: Record<string, SourceState> = {};
    selectedSources.forEach(key => { initialStates[key] = { status: 'idle' }; });
    setSourceStates(initialStates);

    // 선택된 소스를 순차적으로 처리 (소스별 진행 상황 표시)
    let totalSavedCount = 0;
    const allResults: SourceResult[] = [];

    for (const sourceKey of selectedSources) {
      setCurrentSource(sourceKey);
      setSourceStates(prev => ({ ...prev, [sourceKey]: { status: 'running' } }));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 270_000);
      try {
        const body: SyncRequestBody = {
          sources: [sourceKey],
          sync: true,
        };
        if (sigunNm) body.sigunNm = sigunNm;
        if (Object.keys(apiKeys).length > 0) body.apiKeys = apiKeys;

        const res = await fetch('/api/sync-all', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data: SyncResponse = await res.json();
        const result: SourceResult = data.results?.[0] || {
          source: sourceKey,
          label: sourceKey,
          total: 0,
          fetched: 0,
          saved: 0,
           error: data.error || (res.status === 503
             ? 'Supabase 인증 설정을 확인해 주세요.'
             : `동기화 요청 실패 (${res.status})`),
        };

        allResults.push(result);
        totalSavedCount += result.saved;

        setSourceStates(prev => ({
          ...prev,
          [sourceKey]: {
            status: result.error ? 'error' : 'success',
            result,
          },
        }));
      } catch (e: unknown) {
        const message = controller.signal.aborted
          ? '응답 대기 시간이 초과되었습니다. 서버 작업이 진행 중일 수 있으니 저장 결과를 확인한 뒤 다시 시도해 주세요.'
          : '동기화 응답을 받지 못했습니다. 로그인 상태와 서버 연결을 확인해 주세요.';
        setSourceStates(prev => ({
          ...prev,
          [sourceKey]: {
            status: 'error',
            result: { source: sourceKey, label: sourceKey, total: 0, fetched: 0, saved: 0, error: message },
          },
        }));
      } finally { clearTimeout(timeout); }
    }

    syncLock.current = false;
    setCurrentSource('');
    setTotalSaved(totalSavedCount);
    setSyncState('done');

    if (totalSavedCount > 0) {
      onSyncComplete?.(totalSavedCount);
    }
  };

  const ggSources = sources.filter(s => s.region === '경기도');
  const seoulSources = sources.filter(s => s.region === '서울');
  const ggAllSelected = ggSources.some(s => s.hasKey && !s.disabled) && ggSources.filter(s => s.hasKey && !s.disabled).every(s => selectedSources.includes(s.key));
  const seoulAllSelected = seoulSources.some(s => s.hasKey && !s.disabled) && seoulSources.filter(s => s.hasKey && !s.disabled).every(s => selectedSources.includes(s.key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--glass-border)] shadow-2xl bg-[var(--bg-secondary)] flex flex-col max-h-[90vh] overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--metro-line3)] to-[var(--metro-line2)] flex items-center justify-center shadow-md">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">공공데이터 동기화</h2>
              <p className="text-xs text-[var(--text-muted)]">경기도 / 서울 열린데이터광장 데이터를 DB에 저장합니다</p>
            </div>
          </div>
          <button disabled={syncState === 'syncing'} onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadError && <p role="alert" className="px-6 py-2 text-red-500">{loadError}</p>}
        {/* 본문 - 스크롤 가능 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* 경기도 소스 선택 */}
          {ggSources.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--metro-line3)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">경기데이터드림</span>
                </div>
                <button
                  onClick={() => selectAllByRegion('경기도')}
                  className="text-xs text-[var(--metro-line3)] hover:underline"
                >
                  {ggAllSelected ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ggSources.map(src => (
                  <SourceCard
                    key={src.key}
                    source={src}
                    selected={selectedSources.includes(src.key)}
                    state={sourceStates[src.key]}
                    onToggle={() => toggleSource(src.key)}
                    isCurrent={currentSource === src.key}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 서울 소스 선택 */}
          {seoulSources.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--metro-line1)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">서울 열린광장 API</span>
                </div>
                <button
                  onClick={() => selectAllByRegion('서울')}
                  className="text-xs text-[var(--metro-line1)] hover:underline"
                >
                  {seoulAllSelected ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {seoulSources.map(src => (
                  <SourceCard
                    key={src.key}
                    source={src}
                    selected={selectedSources.includes(src.key)}
                    state={sourceStates[src.key]}
                    onToggle={() => toggleSource(src.key)}
                    isCurrent={currentSource === src.key}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 고급 설정 */}
          <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <span className="font-medium">고급 설정</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)]">
                <div className="mt-3">
                  <label htmlFor="sync-city-filter" className="text-xs font-medium text-[var(--text-muted)] block mb-1.5">
                    경기도 시군구 필터 (빈칸 = 전체)
                  </label>
                  <select id="sync-city-filter"
                    value={sigunNm}
                    onChange={e => setSigunNm(e.target.value)}
                    className="w-full text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--metro-line3)]"
                  >
                    <option value="">전체 시군구</option>
                    {GG_SIGUNS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  API 키는 서버 환경변수에서 읽습니다. 키 등록은 이용 권한 검증을 의미하지 않습니다. 서울 데이터는 영업 중이며 최근 3개월 내 수정된 업소만 수집합니다.
                </p>
              </div>
            )}
          </div>

          {/* 완료 결과 요약 */}
          {syncState === 'done' && (
            <div className={`rounded-xl p-4 border ${totalSaved > 0 ? 'bg-[var(--metro-line2)]/10 border-[var(--metro-line2)]/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                {totalSaved > 0 ? `✅ 동기화 완료: 총 ${totalSaved.toLocaleString()}건 저장` : '⚠️ 저장된 데이터 없음'}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                리드 목록을 새로고침하면 최신 데이터를 확인할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* 푸터 액션 */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-muted)]">
            {selectedSources.length}개 소스 선택됨
          </span>
          <div className="flex gap-2">
            <button
              disabled={syncState === 'syncing'} onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              {syncState === 'done' ? '닫기' : '취소'}
            </button>
            {syncState !== 'done' && (
              <button
                onClick={startSync}
                disabled={syncState === 'syncing' || selectedSources.length === 0}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white transition-all disabled:opacity-50 bg-gradient-to-r from-[var(--metro-line3)] to-[var(--metro-line2)] hover:opacity-90 shadow-md"
              >
                {syncState === 'syncing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 동기화 중...</>
                ) : (
                  <><RefreshCw className="w-4 h-4" /> 동기화 시작</>
                )}
              </button>
            )}
            {syncState === 'done' && (
              <button
                onClick={() => { setSyncState('idle'); setSourceStates({}); setTotalSaved(0); }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white bg-[var(--metro-line4)] hover:opacity-90 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> 다시 동기화
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 소스 카드 서브 컴포넌트
// ============================================================

interface SourceCardProps {
  source: SourceConfig;
  selected: boolean;
  state?: SourceState;
  onToggle: () => void;
  isCurrent: boolean;
}

function SourceCard({ source, selected, state, onToggle, isCurrent }: SourceCardProps) {
  const isRunning = state?.status === 'running' || isCurrent;
  const isSuccess = state?.status === 'success';
  const isError = state?.status === 'error';

  const regionColor = source.region === '경기도' ? 'var(--metro-line3)' : 'var(--metro-line1)';

  return (
    <button
      onClick={onToggle}
      disabled={source.disabled || !source.hasKey || isRunning || isSuccess || isError}
      className={`text-left p-3 rounded-xl border transition-all text-sm ${
        isError
          ? 'border-red-500/50 bg-red-500/10'
          : isSuccess
          ? 'border-[var(--metro-line2)]/50 bg-[var(--metro-line2)]/10'
          : isRunning
          ? 'border-[var(--metro-line4)]/50 bg-[var(--metro-line4)]/10'
          : selected
          ? 'border-[--region-color]/60 bg-[--region-color]/10'
          : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)] hover:border-[--region-color]/40'
      }`}
      style={{ '--region-color': regionColor } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-[var(--text-primary)] text-xs leading-tight">{source.label}</span>
        {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--metro-line4)]" />}
        {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--metro-line2)]" />}
        {isError && <XCircle className="w-3.5 h-3.5 text-red-400" />}
        {!isRunning && !isSuccess && !isError && (
          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-[--region-color] bg-[--region-color]' : 'border-[var(--border-subtle)]'}`}
            style={{ '--region-color': regionColor } as React.CSSProperties}>
            {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </span>
        )}
      </div>

      {/* 진행 중 상태 */}
      {isRunning && (
        <p className="text-xs text-[var(--metro-line4)]">데이터 수집 중...</p>
      )}

      {/* 성공 결과 */}
      {isSuccess && state?.result && (
        <p className="text-xs text-[var(--metro-line2)]">
          {state.result.saved.toLocaleString()}건 저장 / {state.result.fetched.toLocaleString()}건 수집
        </p>
      )}

      {state?.result?.warning && <p className="text-xs text-amber-500">{state.result.warning}</p>}
      {/* 실패 결과 */}
      {isError && state?.result?.error && (
        <p className="text-xs text-red-400 truncate" title={state.result.error}>
          {state.result.error}
        </p>
      )}

      {/* 기본 상태 */}
      {!isRunning && !isSuccess && !isError && (
        <p className="text-xs text-[var(--text-muted)]">
          {source.disabled ? `사용 중지: ${source.disabledReason || '제공기관 서비스 확인 필요'}` : source.hasKey ? '✓ API 키 설정됨 (권한 미검증)' : `⚠ API 키 미설정${source.envKey ? ` (${source.envKey})` : ''}`}
        </p>
      )}
    </button>
  );
}
