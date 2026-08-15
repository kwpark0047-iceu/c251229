import React, { useEffect, useState } from 'react';
import { X, MapPin, Building, Activity, LayoutDashboard, Tag } from 'lucide-react';
import { Lead, AdInventory, STATUS_LABELS, AVAILABILITY_LABELS, AVAILABILITY_COLORS } from '../types';
import { formatPhoneNumber } from '../utils';

interface StationDetailPanelProps {
  station: any;
  leads: Lead[];
  onClose: () => void;
}

export default function StationDetailPanel({ station, leads, onClose }: StationDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'leads'>('inventory');
  const [inventory, setInventory] = useState<AdInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 해당 역 반경 내의 리드 필터링 (가까운 역이 이 역인 경우)
  // TODO: 반경 필터링 로직을 추가로 고도화할 수 있음. 현재는 nearestStation 기준.
  const nearbyLeads = leads.filter(lead => 
    lead.nearestStation?.includes(station.name) || 
    station.name.includes(lead.nearestStation || '')
  );

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/inventory?stationName=${encodeURIComponent(station.name)}`);
        const data = await res.json();
        if (data.success) {
          // 상태 문자열과 카멜케이스 변환 처리
          const mapped = (data.inventory || []).map((inv: any) => ({
            id: inv.id,
            stationName: inv.station_name,
            adType: inv.ad_type,
            locationCode: inv.location_code,
            priceMonthly: inv.price_monthly,
            availabilityStatus: inv.availability_status,
            trafficDaily: inv.traffic_daily,
          }));
          setInventory(mapped);
        }
      } catch (error) {
        console.error('Failed to load inventory', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, [station.name]);

  return (
    <div className="absolute right-0 top-0 h-full w-[360px] bg-white/95 backdrop-blur-xl border-l border-white/20 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-[1001] flex flex-col animate-in slide-in-from-right duration-300">
      {/* 헤더 */}
      <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gradient-to-br from-gray-50/50 to-white/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{station.name}</h2>
            <span className="text-sm font-bold text-gray-400">역</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {station.lines.map((line: string) => (
              <span key={line} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                {line}호선
              </span>
            ))}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 bg-gray-100/80 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex px-4 pt-4 border-b border-gray-100 gap-4">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'inventory' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          광고 매체 ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'leads' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building className="w-4 h-4" />
          주변 리드 ({nearbyLeads.length})
        </button>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'inventory' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-blue-100 animate-spin" />
                <p className="text-sm font-medium text-gray-500">인벤토리 불러오는 중...</p>
              </div>
            ) : inventory.length > 0 ? (
              inventory.map((inv) => {
                const availabilityColor = AVAILABILITY_COLORS[inv.availabilityStatus as keyof typeof AVAILABILITY_COLORS] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
                
                return (
                  <div key={inv.id} className={`bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-1 h-full ${availabilityColor.bg}`} />
                    <div className="flex justify-between items-start mb-2 ml-2">
                      <div>
                        <span className="text-xs font-black tracking-wider text-gray-400 uppercase">{inv.adType}</span>
                        <h4 className="font-bold text-gray-800 text-sm mt-0.5">{inv.locationCode}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${availabilityColor.bg} ${availabilityColor.text} ${availabilityColor.border}`}>
                        {AVAILABILITY_LABELS[inv.availabilityStatus as keyof typeof AVAILABILITY_LABELS] || inv.availabilityStatus}
                      </span>
                    </div>
                    {inv.priceMonthly && (
                      <div className="ml-2 flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-600">
                          월 {inv.priceMonthly.toLocaleString()}원
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                <LayoutDashboard className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-500">등록된 광고 매체가 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="space-y-3">
            {nearbyLeads.length > 0 ? (
              nearbyLeads
                .sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0)) // 점수 높은 순 정렬
                .map((lead) => (
                <div key={lead.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:border-blue-200 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">{lead.bizName}</h4>
                    {lead.leadGrade && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-black ${
                        lead.leadGrade === 'A' ? 'bg-red-100 text-red-600' :
                        lead.leadGrade === 'B' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {lead.leadGrade}등급
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {lead.medicalSubject && (
                      <p className="text-xs font-semibold text-blue-500/80 uppercase tracking-tighter">{lead.medicalSubject}</p>
                    )}
                    <div className="flex items-start gap-1.5 text-gray-500">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="text-xs font-medium leading-snug">{lead.roadAddress || lead.lotAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Activity className="w-3 h-3 flex-shrink-0" />
                      <span className="text-xs font-semibold">{STATUS_LABELS[lead.status]}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                <Building className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-500">주변에 타겟 리드가 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
