'use client';

import { useState, useEffect } from 'react';
import { X, Train, Loader2, MapPin, Phone, AlertCircle } from 'lucide-react';
import { StationInfo, getStationInfo, getFacilitySummary } from '../station-info-service';
import { LINE_COLORS } from '../types';

interface StationInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationName: string;
  stationLines: string[];
  nearestExitNo?: string;
}

export default function StationInfoModal({
  isOpen,
  onClose,
  stationName,
  stationLines,
  nearestExitNo,
}: StationInfoModalProps) {
  const [loading, setLoading] = useState(false);
  const [stationInfo, setStationInfo] = useState<StationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<string>(stationLines[0] || '1');

  useEffect(() => {
    if (isOpen && stationName) {
      fetchStationInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 의존성 고정
  }, [isOpen, stationName, selectedLine]);

  const fetchStationInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getStationInfo(selectedLine, stationName);

      if (response.success && response.data) {
        // 응답이 배열인 경우 첫 번째 요소 사용
        const info = Array.isArray(response.data) ? response.data[0] : response.data;
        setStationInfo(info || null);
      } else {
        setError(response.error || '역사 정보를 찾을 수 없습니다.');
        setStationInfo(null);
      }
    } catch {
      setError('역사 정보를 가져오는 중 오류가 발생했습니다.');
      setStationInfo(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const facilities = stationInfo ? getFacilitySummary(stationInfo) : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* 헤더 */}
        <div
          className="px-6 py-4 border-b border-gray-200 dark:border-gray-700"
          style={{
            background: `linear-gradient(135deg, ${LINE_COLORS[selectedLine] || '#666'}20, transparent)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: LINE_COLORS[selectedLine] || '#666' }}
              >
                <Train className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {stationName}역
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  역사 편의시설 정보
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 노선 선택 탭 */}
          {stationLines.length > 1 && (
            <div className="flex gap-2 mt-4">
              {stationLines.map((line) => (
                <button
                  key={line}
                  onClick={() => setSelectedLine(line)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedLine === line
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  style={
                    selectedLine === line
                      ? { backgroundColor: LINE_COLORS[line] || '#666' }
                      : undefined
                  }
                >
                  {line}호선
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 콘텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                역사 정보를 불러오는 중...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
              <p className="text-gray-900 dark:text-gray-100 font-bold mb-2">{error}</p>
              {error.includes('인증') || error.includes('키') ? (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-400 text-left border border-amber-200 dark:border-amber-800">
                  <p className="font-bold mb-1">🛠️ 조치 방법:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li><code className=".env.local">.env.local</code> 파일의 <code className="font-mono">KRIC_API_KEY</code>를 확인해 주세요.</li>
                    <li>철도산업정보센터에서 발급받은 실제 서비스 키인지 대조가 필요합니다.</li>
                    <li>현재 설정된 키가 해시 형태($2a$...)라면 잘못된 키일 가능성이 높습니다.</li>
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.
                </p>
              )}
            </div>
          ) : stationInfo ? (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                {stationInfo.addr && (
                  <div className="col-span-2 flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {stationInfo.addr}
                    </span>
                  </div>
                )}
                {stationInfo.telNo && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <a
                      href={`tel:${stationInfo.telNo}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {stationInfo.telNo}
                    </a>
                  </div>
                )}
                {nearestExitNo && (
                  <div className="col-span-2 flex items-center gap-3 p-4 bg-blue-600 text-white rounded-xl shadow-lg animate-float-subtle">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Train className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-white/70 font-medium">추천 출구</p>
                      <p className="text-lg font-bold">{nearestExitNo}번 출구 (가장 가까움)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 편의시설 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  편의시설
                </h3>
                {facilities.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {stationInfo.exitCnt !== undefined && stationInfo.exitCnt > 0 && (
                      <FacilityCard icon="🚪" label="출구" value={`${stationInfo.exitCnt}개`} />
                    )}
                    {stationInfo.elvtrCnt !== undefined && stationInfo.elvtrCnt > 0 && (
                      <FacilityCard icon="🛗" label="엘리베이터" value={`${stationInfo.elvtrCnt}대`} />
                    )}
                    {stationInfo.escltCnt !== undefined && stationInfo.escltCnt > 0 && (
                      <FacilityCard icon="↗️" label="에스컬레이터" value={`${stationInfo.escltCnt}대`} />
                    )}
                    {stationInfo.whlchLftCnt !== undefined && stationInfo.whlchLftCnt > 0 && (
                      <FacilityCard icon="♿" label="휠체어리프트" value={`${stationInfo.whlchLftCnt}대`} />
                    )}
                    {stationInfo.toiletCnt !== undefined && stationInfo.toiletCnt > 0 && (
                      <FacilityCard icon="🚻" label="화장실" value={`${stationInfo.toiletCnt}개`} />
                    )}
                    {stationInfo.nrsgRoomYn === 'Y' && (
                      <FacilityCard icon="🍼" label="수유실" value="있음" />
                    )}
                    {stationInfo.atmYn === 'Y' && (
                      <FacilityCard icon="🏧" label="ATM" value="있음" />
                    )}
                    {stationInfo.storeYn === 'Y' && (
                      <FacilityCard icon="🏪" label="편의점" value="있음" />
                    )}
                    {stationInfo.lockYn === 'Y' && (
                      <FacilityCard icon="🔐" label="물품보관함" value="있음" />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    편의시설 정보가 없습니다.
                  </p>
                )}
              </div>

              {/* 역코드 정보 (디버그용) */}
              {stationInfo.stinCd && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-400">
                    역코드: {stationInfo.stinCd} | 노선코드: {stationInfo.lnCd}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Train className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                역사 정보를 불러올 수 없습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 편의시설 카드 컴포넌트
function FacilityCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{value}</p>
      </div>
    </div>
  );
}
