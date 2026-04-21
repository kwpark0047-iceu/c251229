import React, { useState } from 'react';
import { X, Info, Tag, ExternalLink } from 'lucide-react';
import { FloorPlan, AdInventory, AD_TYPE_LABELS, AVAILABILITY_LABELS, AVAILABILITY_COLORS } from '../../types';

interface StationFloorPlansProps {
    floorPlans: FloorPlan[];
    inventory?: AdInventory[];
}

export default function StationFloorPlans({ floorPlans, inventory = [] }: StationFloorPlansProps) {
    const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
    const [selectedMarker, setSelectedMarker] = useState<AdInventory | null>(null);

    if (floorPlans.length === 0) return null;

    // 현재 선택된 도면의 인벤토리 및 마커 필터링
    const currentInventory = selectedFloorPlan 
        ? inventory.filter(item => {
            // 1. floor_plan_id 직접 매칭 (가장 정확)
            if (item.floorPlanUrl === selectedFloorPlan.imageUrl) return true;
            
            // 2. 역 이름 매칭 (공백 제거, '역' 접미사 통일)
            const cleanName = (name: string) => name.replace(/\s+/g, '').replace(/역$/, '');
            const itemStation = cleanName(item.stationName);
            const planStation = cleanName(selectedFloorPlan.stationName);
            
            // 3. 위치 좌표가 도면에 매핑되어 있는지 확인
            return itemStation === planStation && item.spotPositionX && item.spotPositionY;
          })
        : [];

    return (
        <>
            <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    역사 도면 ({floorPlans.length})
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {floorPlans.map((plan) => (
                        <div
                            key={plan.id}
                            role="button"
                            tabIndex={0}
                            data-testid="floor-plan-thumbnail"
                            aria-label={`${plan.stationName} ${plan.floorName || ''} 도면`}
                            className="flex-shrink-0 w-40 h-40 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-blue-500 transition-all relative group"
                            onClick={() => setSelectedFloorPlan(plan)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    setSelectedFloorPlan(plan);
                                }
                            }}
                        >
                            <img
                                src={plan.thumbnailUrl || plan.imageUrl}
                                alt={`${plan.stationName} ${plan.floorName || ''}`}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-xs font-medium truncate">
                                {plan.floorName || '도면'}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 도면 확대 모달 */}
            {selectedFloorPlan && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => {
                    setSelectedFloorPlan(null);
                    setSelectedMarker(null);
                }}>
                    <div className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <div>
                                <h3 className="font-semibold text-lg text-slate-800">{selectedFloorPlan.stationName} {selectedFloorPlan.floorName}</h3>
                                <p className="text-sm text-slate-500">인근 광고 매체 위치 ({currentInventory.length})</p>
                            </div>
                            <button onClick={() => {
                                setSelectedFloorPlan(null);
                                setSelectedMarker(null);
                            }} title="확대 모달 닫기" aria-label="도면 모달 닫기" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        
                        <div className="flex-1 relative bg-slate-100 overflow-auto flex items-center justify-center min-h-0">
                            <div className="relative inline-block">
                                <img
                                    src={selectedFloorPlan.imageUrl}
                                    alt={`${selectedFloorPlan.stationName} ${selectedFloorPlan.floorName}`}
                                    className="max-w-none object-contain shadow-lg max-h-[calc(90vh-120px)]"
                                />
                                
                                {/* 인벤토리 마커 표시 */}
                                {currentInventory.map((item) => (
                                    <div
                                        key={item.id}
                                        /* eslint-disable-next-line react/forbid-dom-props */
                                        style={{ 
                                            '--marker-x': `${item.spotPositionX}%`, 
                                            '--marker-y': `${item.spotPositionY}%` 
                                        } as React.CSSProperties}
                                        className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-125 z-10 left-[--marker-x] top-[--marker-y] ${
                                            selectedMarker?.id === item.id ? 'scale-125 brightness-110' : ''
                                        }`}
                                        onClick={() => setSelectedMarker(item)}
                                    >
                                        <div className={`w-full h-full rounded-full border-2 border-white shadow-lg animate-float-subtle flex items-center justify-center ${
                                            item.availabilityStatus === 'AVAILABLE' ? 'bg-green-500' : 
                                            item.availabilityStatus === 'RESERVED' ? 'bg-yellow-500' : 'bg-slate-400'
                                        }`}>
                                            <Tag className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 마커 상세 정보 팝업 (Overlay) */}
                            {selectedMarker && (
                                <div className="absolute bottom-6 right-6 w-72 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 p-5 animate-in fade-in slide-in-from-bottom-4 duration-300 z-20">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${AVAILABILITY_COLORS[selectedMarker.availabilityStatus].bg} ${AVAILABILITY_COLORS[selectedMarker.availabilityStatus].text}`}>
                                            {AVAILABILITY_LABELS[selectedMarker.availabilityStatus]}
                                        </span>
                                        <button onClick={() => setSelectedMarker(null)} title="마커 상세 닫기" aria-label="정보 팝업 닫기" className="text-slate-400 hover:text-slate-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-base mb-1">{AD_TYPE_LABELS[selectedMarker.adType] || selectedMarker.adType}</h4>
                                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                        <Info className="w-3 h-3" /> 코드: {selectedMarker.locationCode}
                                    </p>
                                    
                                    <div className="space-y-2 mb-4">
                                        {selectedMarker.priceMonthly && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">월 단가</span>
                                                <span className="font-semibold text-blue-600">₩{selectedMarker.priceMonthly.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {selectedMarker.adSize && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">규격</span>
                                                <span className="text-slate-700">{selectedMarker.adSize}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors">
                                        제안서 추가 <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
