'use client';

/**
 * 제안서 작성 폼 컴포넌트
 * Neo-Seoul Transit Design
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Train,
  Mail,
  Send,
  Save,
  Loader2,
  MapPin,
  Users,
  Info,
  Check,
  Plus,
  Minus,
} from 'lucide-react';

import { Lead, AdInventory, LINE_COLORS } from '../types';
import { SUBWAY_STATIONS } from '../constants';
import { createClient } from '@/lib/supabase/client';
import { getDefaultGreeting } from '../proposal-service';

interface ProposalFormProps {
  lead: Lead;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StationInfo {
  name: string;
  lines: string[];
  trafficDaily: number;
  characteristics: string;
}

// 역사별 특색 및 유동인구 정보
const STATION_INFO: Record<string, { trafficDaily: number; characteristics: string }> = {
  '강남': { trafficDaily: 120000, characteristics: '강남 상권 중심, 2030 직장인/학생 밀집 지역' },
  '역삼': { trafficDaily: 85000, characteristics: '스타트업/IT 기업 밀집, 젊은 직장인 주 이용' },
  '선릉': { trafficDaily: 75000, characteristics: '대기업 본사 밀집, 고소득 직장인층' },
  '삼성': { trafficDaily: 110000, characteristics: 'COEX/무역센터 인근, 비즈니스/관광객 다수' },
  '교대': { trafficDaily: 70000, characteristics: '법원/검찰청 인근, 전문직 종사자 다수' },
  '홍대입구': { trafficDaily: 130000, characteristics: '청년 문화 중심지, 1020 유동인구 최다' },
  '신촌': { trafficDaily: 90000, characteristics: '대학가 상권, 학생/젊은층 밀집' },
  '여의도': { trafficDaily: 100000, characteristics: '금융가 중심, 고소득 직장인층' },
  '잠실': { trafficDaily: 115000, characteristics: '롯데타워/잠실운동장, 쇼핑/엔터테인먼트 중심' },
  '명동': { trafficDaily: 95000, characteristics: '관광/쇼핑 중심지, 외국인 관광객 다수' },
  '서울역': { trafficDaily: 140000, characteristics: 'KTX 환승역, 전국 유동인구 집중' },
  '고속터미널': { trafficDaily: 125000, characteristics: '버스터미널 환승, 장거리 이동객 다수' },
};

export default function ProposalForm({ lead, onClose, onSuccess }: ProposalFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // 폼 상태
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedStation, setSelectedStation] = useState<StationInfo | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<AdInventory[]>([]);
  const [discountRate, setDiscountRate] = useState(0);
  const [greetingMessage, setGreetingMessage] = useState('');

  // 인벤토리 목록
  const [availableInventory, setAvailableInventory] = useState<AdInventory[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // 초기 설정
  useEffect(() => {
    // 기본 인사말 설정
    setGreetingMessage(getDefaultGreeting(lead.bizName, lead.nearestStation));

    // 가장 가까운 역 자동 선택
    if (lead.nearestStation) {
      const stationData = SUBWAY_STATIONS.find((s) => s.name === lead.nearestStation);
      const extraInfo = STATION_INFO[lead.nearestStation] || { trafficDaily: 50000, characteristics: '지하철역 인근 상권' };

      if (stationData) {
        setSelectedStation({
          name: stationData.name,
          lines: stationData.lines,
          trafficDaily: extraInfo.trafficDaily,
          characteristics: extraInfo.characteristics,
        });
      }
    }
  }, [lead]);

  // 선택된 역의 인벤토리 로드
  useEffect(() => {
    if (selectedStation) {
      loadInventory(selectedStation.name);
    }
  }, [selectedStation]);

  const loadInventory = async (stationName: string) => {
    setLoadingInventory(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ad_inventory')
        .select('*')
        .eq('station_name', stationName)
        .eq('availability_status', 'AVAILABLE')
        .order('price_monthly', { ascending: true });

      if (!error && data) {
        setAvailableInventory(
          data.map((row) => ({
            id: row.id,
            stationName: row.station_name,
            locationCode: row.location_code,
            adType: row.ad_type,
            adSize: row.ad_size,
            priceMonthly: row.price_monthly,
            priceWeekly: row.price_weekly,
            availabilityStatus: row.availability_status,
            description: row.description,
            trafficDaily: row.traffic_daily,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoadingInventory(false);
    }
  };

  // 금액 계산
  const totalPrice = selectedInventory.reduce((sum, item) => sum + (item.priceMonthly || 0), 0);
  const finalPrice = Math.round(totalPrice * (1 - discountRate / 100));

  // 인벤토리 선택/해제
  const toggleInventory = (item: AdInventory) => {
    if (selectedInventory.find((i) => i.id === item.id)) {
      setSelectedInventory(selectedInventory.filter((i) => i.id !== item.id));
    } else {
      setSelectedInventory([...selectedInventory, item]);
    }
  };

  // 역사 변경
  const handleStationChange = (stationName: string) => {
    const stationData = SUBWAY_STATIONS.find((s) => s.name === stationName);
    const extraInfo = STATION_INFO[stationName] || { trafficDaily: 50000, characteristics: '지하철역 인근 상권' };

    if (stationData) {
      setSelectedStation({
        name: stationData.name,
        lines: stationData.lines,
        trafficDaily: extraInfo.trafficDaily,
        characteristics: extraInfo.characteristics,
      });
      setSelectedInventory([]); // 역 변경 시 선택 초기화
    }
  };

  // 저장 (발송 없이)
  const handleSave = async () => {
    if (!selectedStation || selectedInventory.length === 0) {
      alert('역사와 광고 매체를 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.from('proposals').insert({
        lead_id: lead.id,
        title: `${selectedStation.name}역 광고 제안서`,
        greeting_message: greetingMessage,
        inventory_ids: selectedInventory.map((i) => i.id),
        total_price: totalPrice,
        discount_rate: discountRate,
        final_price: finalPrice,
        status: 'DRAFT',
      });

      if (error) throw error;

      alert('제안서가 저장되었습니다.');
      onSuccess?.();
      onClose();
    } catch (error) {
      alert(`저장 실패: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  // 이메일 발송
  const handleSend = async () => {
    if (!recipientEmail) {
      alert('수신자 이메일을 입력해주세요.');
      return;
    }
    if (!selectedStation || selectedInventory.length === 0) {
      alert('역사와 광고 매체를 선택해주세요.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          recipientEmail,
          recipientName: lead.bizName,
          stationName: selectedStation.name,
          stationLines: selectedStation.lines,
          trafficDaily: selectedStation.trafficDaily,
          stationCharacteristics: selectedStation.characteristics,
          inventoryItems: selectedInventory.map((item) => ({
            id: item.id,
            stationName: item.stationName,
            adType: item.adType,
            locationCode: item.locationCode,
            priceMonthly: item.priceMonthly,
          })),
          totalPrice,
          discountRate,
          finalPrice,
          greetingMessage,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('제안서가 성공적으로 발송되었습니다!');
        onSuccess?.();
        onClose();
      } else {
        alert(`발송 실패: ${result.message}`);
      }
    } catch (error) {
      alert(`발송 오류: ${(error as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* 헤더 */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">광고 제안서 작성</h2>
            <p className="text-sm text-[var(--text-muted)]">{lead.bizName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
          {/* 수신자 이메일 */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              수신자 이메일
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3 rounded-xl border text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--metro-line4)]"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
              }}
            />
          </div>

          {/* 추천 역사 선택 */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
              <Train className="w-4 h-4 inline mr-2" />
              추천 역사 선택
            </label>
            <select
              value={selectedStation?.name || ''}
              onChange={(e) => handleStationChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--metro-line4)]"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <option value="">역사를 선택하세요</option>
              {SUBWAY_STATIONS.map((station) => (
                <option key={station.name} value={station.name}>
                  {station.name}역 ({station.lines.join(', ')}호선)
                </option>
              ))}
            </select>

            {/* 역사 정보 카드 */}
            {selectedStation && (
              <div
                className="mt-4 p-4 rounded-xl border"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-lg font-bold text-[var(--text-primary)]">{selectedStation.name}역</span>
                  <div className="flex gap-1">
                    {selectedStation.lines.map((line) => (
                      <span
                        key={line}
                        className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold"
                        style={{ backgroundColor: LINE_COLORS[line] || '#888' }}
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Users className="w-4 h-4 text-[var(--metro-line2)]" />
                    <span>일일 유동인구: </span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {selectedStation.trafficDaily.toLocaleString()}명
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <Info className="w-4 h-4 mt-0.5 text-[var(--metro-line4)]" />
                    <span>{selectedStation.characteristics}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 광고 매체 선택 */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              광고 매체 선택
            </label>

            {loadingInventory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--metro-line4)]" />
                <span className="ml-2 text-[var(--text-muted)]">매체 로딩 중...</span>
              </div>
            ) : availableInventory.length === 0 ? (
              <div
                className="p-4 rounded-xl border text-center"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <p className="text-[var(--text-muted)]">
                  {selectedStation ? '대신 관심있으신 매체 문의 부탁드립니다.' : '역사를 선택해주세요.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableInventory.map((item) => {
                  const isSelected = selectedInventory.some((i) => i.id === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleInventory(item)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-[var(--metro-line2)] bg-[rgba(60,181,74,0.1)]'
                          : 'border-[var(--border-subtle)] hover:border-[var(--metro-line4)]'
                      }`}
                      style={{ background: isSelected ? undefined : 'var(--bg-tertiary)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isSelected
                              ? 'bg-[var(--metro-line2)] text-white'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-[var(--text-primary)]">{item.adType}</p>
                          <p className="text-sm text-[var(--text-muted)]">{item.locationCode}</p>
                        </div>
                      </div>
                      <span className="font-bold text-[var(--metro-line3)]">
                        {(item.priceMonthly || 0).toLocaleString()}원/월
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 금액 정보 */}
          {selectedInventory.length > 0 && (
            <div
              className="p-4 rounded-xl border"
              style={{
                background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(22, 33, 62, 0.8) 100%)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">합계 금액</span>
                  <span className="text-[var(--text-primary)]">{totalPrice.toLocaleString()}원/월</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">할인율</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDiscountRate(Math.max(0, discountRate - 5))}
                      className="p-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
                    >
                      <Minus className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                    <span className="w-12 text-center font-bold text-[var(--metro-line3)]">{discountRate}%</span>
                    <button
                      onClick={() => setDiscountRate(Math.min(50, discountRate + 5))}
                      className="p-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
                    >
                      <Plus className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">최종 금액</span>
                  <span className="text-xl font-bold text-[var(--metro-line2)]">{finalPrice.toLocaleString()}원/월</span>
                </div>
              </div>
            </div>
          )}

          {/* 인사말 */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">인사말 메시지</label>
            <textarea
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 rounded-xl border text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--metro-line4)] resize-none"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
              }}
            />
          </div>
        </div>

        {/* 푸터 */}
        <div
          className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedInventory.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
            style={{
              background: 'var(--metro-line4)',
              boxShadow: '0 2px 10px rgba(50, 164, 206, 0.3)',
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장만
          </button>
          <button
            onClick={handleSend}
            disabled={sending || selectedInventory.length === 0 || !recipientEmail}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
            style={{
              background: 'var(--metro-line2)',
              boxShadow: '0 2px 10px rgba(60, 181, 74, 0.3)',
            }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            이메일 발송
          </button>
        </div>
      </div>
    </div>
  );
}
