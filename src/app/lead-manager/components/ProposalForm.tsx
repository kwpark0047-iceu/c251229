'use client';

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
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileUp,
  FilePlus,
  ArrowRight,
  FileText
} from 'lucide-react';

import { useNotification } from '@/context/NotificationContext';
import { Lead, AdInventory } from '../types';
import { SUBWAY_STATIONS, METRO_LINE_COLORS as LINE_COLORS, STATION_MARKETING_INFO as STATION_INFO } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser, UserInfo } from '../auth-service';
import { Proposal } from '../types';
import { getDefaultGreeting, uploadProposalFile, getProposals, sendProposalEmail, createProposal } from '../proposal-service';

// 매체 유형 한글 라벨
const AD_TYPE_LABELS: Record<string, string> = {
  'SCREEN_DOOR': '스크린도어(PSD)',
  'LIGHT_BOX': '와이드컬러(조명)',
  'POSTER': '포스터 광고',
  'DIGITAL_POSTER': '디지털 포스터',
  'CM_BOARD': 'CM 보드',
  'ESCALATOR': '에스컬레이터 광고',
};

interface ProposalFormProps {
  lead: Lead | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StationInfo {
  name: string;
  lines: string[];
  trafficDaily: number;
  characteristics: string;
}

// 이메일 유효성 검사
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function ProposalForm({ lead, onClose, onSuccess }: ProposalFormProps) {
  const { showNotification } = useNotification();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);

  // 폼 상태
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedStation, setSelectedStation] = useState<StationInfo | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<AdInventory[]>([]);
  const [discountRate, setDiscountRate] = useState(0);
  const [greetingMessage, setGreetingMessage] = useState('');

  // 인벤토리 목록
  const [availableInventory, setAvailableInventory] = useState<AdInventory[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // 모달 상태
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // 제안서 유형 및 업로드 상태
  const [proposalType, setProposalType] = useState<'AUTO' | 'UPLOAD'>(lead ? 'AUTO' : 'UPLOAD');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'SENT' | 'DRAFT'>('SENT');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // 고도화: 다중 첨부 관련 상태
  const [externalProposals, setExternalProposals] = useState<Proposal[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  // 초기 설정 및 권한 확인
  useEffect(() => {
    // 권한 확인
    getCurrentUser().then(user => {
      setCurrentUser(user);
    });

    // 기본 인사말 설정
    if (lead) {
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
    } else {
      setUploadTitle(`매체사 공용 제안서 (${new Date().toLocaleDateString()})`);
    }

    // 매체사 제안서(외부 파일) 로드
    const loadExternalProposals = async () => {
      setIsLoadingAttachments(true);
      const result = await getProposals();
      if (result.success) {
        // 현재 리드에 이미 업로드된 파일이나, 조직 전체에서 올린 공용 파일들을 가져옴
        // 여기서는 편의상 조직 전체의 외부 파일을 대상으로 함
        setExternalProposals(result.proposals.filter(p => p.isExternal));
      }
      setIsLoadingAttachments(false);
    };

    loadExternalProposals();
  }, [lead]);

  // 파일 선택 시 기본 제목 설정 (초기값이 기본 리드 제안서 형식이거나 공용 제안서 형식인 경우에만 덮어씀)
  useEffect(() => {
    if (uploadFile) {
      const isDefaultTitle = !uploadTitle || 
                            uploadTitle.startsWith('매체사 공용 제안서') || 
                            (lead && uploadTitle === `${lead.bizName} 광고 제안서`);
      
      if (isDefaultTitle) {
        if (lead) {
          setUploadTitle(`${lead.bizName} 광고 제안서 (${uploadFile.name.split('.')[0]})`);
        } else {
          setUploadTitle(`${uploadFile.name.split('.')[0]}`);
        }
      }
    }
  }, [uploadFile, lead]);

  // ... (loadInventory, toggleInventory, handleStationChange, handleSave, handleSendClick, handleSend는 기존 로직 유지) ...

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
          data.map((row: any) => ({
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
      showNotification('error', '매체 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingInventory(false);
    }
  };

  const totalPrice = selectedInventory.reduce((sum, item) => sum + (item.priceMonthly || 0), 0);
  const finalPrice = Math.round(totalPrice * (1 - discountRate / 100));

  const toggleInventory = (item: AdInventory) => {
    if (selectedInventory.find((i) => i.id === item.id)) {
      setSelectedInventory(selectedInventory.filter((i) => i.id !== item.id));
    } else {
      setSelectedInventory([...selectedInventory, item]);
    }
  };

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
      setSelectedInventory([]);
    }
  };

  const handleSave = async () => {
    if (!selectedStation) {
      showNotification('error', '역사를 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const createResult = await createProposal(
        lead?.id || '',
        selectedInventory.map(i => i.id),
        {
          title: `${selectedStation.name}역 광고 제안서`,
          greetingMessage,
          discountRate,
          emailRecipient: recipientEmail || undefined,
        }
      );

      if (!createResult.success) throw new Error(createResult.message);

      showNotification('success', '제안서가 저장되었습니다.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (error) {
      showNotification('error', `저장 실패: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendClick = () => {
    if (!recipientEmail) {
      showNotification('error', '수신자 이메일을 입력해주세요.');
      return;
    }
    if (!isValidEmail(recipientEmail)) {
      showNotification('error', '올바른 이메일 형식이 아닙니다.');
      return;
    }
    if (!selectedStation) {
      showNotification('error', '역사를 선택해주세요.');
      return;
    }
    setShowConfirmSend(true);
  };

  const handleSend = async () => {
    setShowConfirmSend(false);
    setSending(true);

    try {
      // 1. 제안서 정보 DB에 먼저 저장 (DRAFT로)
      const supabase = createClient();
      const sendResult = await createProposal(
        lead?.id || '',
        selectedInventory.map(i => i.id),
        {
          title: `${selectedStation!.name}역 광고 제안서`,
          greetingMessage,
          discountRate,
          emailRecipient: recipientEmail || undefined,
        }
      );

      if (!sendResult.success || !sendResult.proposal) {
        throw new Error(`제안서 생성 실패: ${sendResult.message}`);
      }

      const proposal = sendResult.proposal;

      // 2. 고도화된 이메일 발송 서비스 호출 (다중 첨부 포함)
      const result = await sendProposalEmail(
        proposal.id,
        {
          to: recipientEmail,
          subject: `[서울 지하철 광고 제안] ${lead?.bizName || '고객'}님께 드리는 제안서입니다.`,
          body: greetingMessage,
        },
        selectedAttachmentIds
      );

      if (result.success) {
        showNotification('success', '제안서와 첨부파일이 성공적으로 발송되었습니다!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        showNotification('error', `발송 실패: ${result.message}`);
      }
    } catch (error) {
      showNotification('error', `발송 오류: ${(error as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  // 파일 업로드 처리 고도화
  const handleUpload = async () => {
    if (!uploadFile) return;
    if (!uploadTitle.trim()) {
      showNotification('error', '제안서 제목을 입력해주세요.');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadProposalFile(uploadFile, lead?.id || null, uploadTitle, uploadStatus as any);

      if (result.success) {
        showNotification('success', `제안서가 ${uploadStatus === 'SENT' ? '업로드 및 발송' : '임시 저장'}되었습니다.`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        showNotification('error', `업로드 실패: ${result.message}`);
      }
    } catch (error) {
      showNotification('error', `업로드 오류: ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'ppt', 'pptx'].includes(ext || '')) {
        setUploadFile(file);
        // 파일 제목 자동 설정
        setUploadTitle(file.name.split('.')[0]);
      } else {
        showNotification('error', 'PDF 또는 PPT 파일만 업로드 가능합니다.');
      }
    }
  };

  // 권한 확인: SuperAdmin 이거나 Admin/Owner 인 경우에만 업로드 가능
  const canUpload = currentUser?.isSuperAdmin || currentUser?.role === 'admin' || currentUser?.role === 'owner';

  const emailValid = recipientEmail && isValidEmail(recipientEmail);
  const emailInvalid = recipientEmail && !isValidEmail(recipientEmail);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">광고 제안서 작성</h2>
            <p className="text-sm text-[var(--text-muted)]">{lead?.bizName || '공용 매체 보관함'}</p>
          </div>
          <button onClick={onClose} title="닫기" className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* 제안서 유형 선택 탭 */}
        <div className="flex px-6 pt-6 gap-2">
          {lead ? (
            <button
              onClick={() => setProposalType('AUTO')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                proposalType === 'AUTO'
                  ? 'border-[var(--metro-line2)] bg-[var(--metro-line2)]/5 text-[var(--metro-line2)]'
                  : 'border-transparent bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <FilePlus className="w-5 h-5" />
              <span className="font-bold">자동 제안서 생성</span>
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-muted)] opacity-50 border-2 border-transparent">
              <Info className="w-5 h-5" />
              <span className="font-medium text-sm">업체 선택 시 자동생성 가능</span>
            </div>
          )}
          
          {canUpload ? (
            <button
              onClick={() => setProposalType('UPLOAD')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all animate-float-subtle ${
                proposalType === 'UPLOAD'
                  ? 'border-[var(--metro-line4)] bg-[var(--metro-line4)]/5 text-[var(--metro-line4)]'
                  : 'border-transparent bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <FileUp className="w-5 h-5" />
              <span className="font-bold">제안서 파일 직접 업로드</span>
            </button>
          ) : (
            <div title="관리자 권한이 필요합니다" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100/10 text-slate-500 cursor-not-allowed opacity-50 grayscale border-2 border-transparent">
              <FileUp className="w-5 h-5" />
              <span className="font-bold">매체사 권한 전용</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {proposalType === 'AUTO' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  수신자 이메일
                </label>
                <div className="relative">
                  <input
                    id="recipient-email"
                    name="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="example@email.com"
                    className={`w-full px-4 py-3 pr-12 rounded-xl border text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 ${emailValid
                      ? 'border-green-500 focus:ring-green-500/50'
                      : emailInvalid
                        ? 'border-red-500 focus:ring-red-500/50'
                        : 'border-[var(--border-subtle)] focus:ring-[var(--metro-line4)]'
                      }`}
                    style={{
                      background: 'var(--bg-secondary)',
                    }}
                  />
                  {emailValid && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
                  {emailInvalid && <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />}
                </div>
                {emailInvalid && <p className="mt-1 text-sm text-red-400">올바른 이메일 형식을 입력해주세요.</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  <Train className="w-4 h-4 inline mr-2" />
                  추천 역사 선택
                </label>
                <select
                  id="selected-station"
                  name="selectedStation"
                  value={selectedStation?.name || ''}
                  onChange={(e) => handleStationChange(e.target.value)}
                  title="역사 선택"
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

                {selectedStation && (
                  <div
                    className="mt-4 p-4 rounded-xl border animate-scale-in"
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

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  광고 매체 선택
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {loadingInventory ? (
                    <div className="col-span-full py-8 flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      <span>매체 목록을 불러오는 중...</span>
                    </div>
                  ) : availableInventory.length > 0 ? (
                    availableInventory.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleInventory(item)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedInventory.find((i) => i.id === item.id)
                            ? 'border-[var(--metro-line4)] bg-[var(--metro-line4)]/5 ring-1 ring-[var(--metro-line4)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {AD_TYPE_LABELS[item.adType] || item.adType}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] border px-1 rounded">
                            {item.locationCode}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-muted)]">{item.adSize || '표준 규격'}</span>
                          <span className="font-bold text-[var(--metro-line4)]">
                            {item.priceMonthly?.toLocaleString()}원
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-[var(--text-muted)] italic">
                      {selectedStation ? '가용한 매체가 없습니다.' : '역사를 먼저 선택해주세요.'}
                    </div>
                  )}
                </div>
              </div>

              {/* 고도화: 매체 제안서 추가 첨부 섹션 */}
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-3">
                  <FilePlus className="w-4 h-4 inline mr-2 text-[var(--metro-line2)]" />
                  매체 제안서 추가 첨부 (기존 업로드 파일)
                </label>
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-subtle)] space-y-3">
                  {isLoadingAttachments ? (
                    <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--metro-line2)]" /></div>
                  ) : externalProposals.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {externalProposals.map(prop => (
                        <div 
                          key={prop.id}
                          onClick={() => {
                            if (selectedAttachmentIds.includes(prop.id)) {
                              setSelectedAttachmentIds(selectedAttachmentIds.filter(id => id !== prop.id));
                            } else {
                              setSelectedAttachmentIds([...selectedAttachmentIds, prop.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedAttachmentIds.includes(prop.id)
                            ? 'border-[var(--metro-line2)] bg-[var(--metro-line2)]/5 ring-1 ring-[var(--metro-line2)]/20'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${selectedAttachmentIds.includes(prop.id) ? 'bg-[var(--metro-line2)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[var(--text-primary)]">{prop.title}</span>
                              <span className="text-[10px] text-[var(--text-muted)]">{prop.originalFilename}</span>
                            </div>
                          </div>
                          <div className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-medium">
                            {prop.fileType || 'PDF'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-[var(--text-muted)] italic">
                      먼저 '제안서 파일 직접 업로드' 탭에서 매체 제안서를 올려보세요.
                    </div>
                  )}
                  {selectedAttachmentIds.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 text-[10px] text-[var(--metro-line2)] font-bold">
                      <CheckCircle className="w-3 h-3" />
                      {selectedAttachmentIds.length}개의 매체 제안서가 추가로 첨부됩니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 인사말 입력 */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  인사말 및 제안 내용
                </label>
                <textarea
                  id="greeting-message"
                  name="greetingMessage"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--metro-line4)] resize-none"
                />
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* 제목 입력 필드 추가 */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  제안서 제목
                </label>
                <input
                  id="upload-title"
                  name="uploadTitle"
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="예: 강남역 광고 제안서 - XX성형외과"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--metro-line4)]"
                />
              </div>

              {/* 드래그 앤 드롭 영역 */}
              <div className="text-center p-8 border-2 border-dashed rounded-2xl transition-colors bg-[var(--bg-secondary)] group overflow-hidden"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{ 
                  borderColor: dragActive ? 'var(--metro-line4)' : 'var(--border-subtle)',
                  background: dragActive ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'
                }}
              >
                {!uploadFile ? (
                  <div className="flex flex-col items-center animate-float">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FileUp className="w-8 h-8 text-[var(--metro-line4)]" />
                    </div>
                    <p className="text-lg font-bold text-[var(--text-primary)] mb-1">
                      제안서 파일을 여기에 드래그하세요
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mb-6">
                      PDF, PPT, PPTX 파일 지원 (최대 100MB)
                    </p>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,.ppt,.pptx"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          setUploadFile(file);
                          setUploadTitle(file.name.split('.')[0]);
                        }
                      }}
                    />
                    <label
                      htmlFor="file-upload"
                      className="px-6 py-2.5 rounded-xl bg-[var(--metro-line4)] text-white font-bold cursor-pointer hover:shadow-lg hover:shadow-[var(--metro-line4)]/20 transition-all active:scale-95"
                    >
                      파일 선택하기
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-col items-center animate-float">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)] w-full max-w-sm mb-4">
                      <p className="font-bold text-[var(--text-primary)] truncate">{uploadFile.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button 
                      onClick={() => {
                        setUploadFile(null);
                        setUploadTitle('');
                      }}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      다른 파일 선택
                    </button>
                  </div>
                )}
              </div>

              {/* 업로드 시 상태 선택 */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">업로드 후 상태 설정</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUploadStatus('SENT')}
                    className={`flex-1 p-4 rounded-xl border text-center transition-all ${
                      uploadStatus === 'SENT'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="font-bold mb-1">업로드 및 발송 처리</div>
                    <div className="text-[10px] opacity-70">시스템에서 제안서 발송 완료로 처리됩니다.</div>
                  </button>
                  <button
                    onClick={() => setUploadStatus('DRAFT')}
                    className={`flex-1 p-4 rounded-xl border text-center transition-all ${
                      uploadStatus === 'DRAFT'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="font-bold mb-1">임시 저장</div>
                    <div className="text-[10px] opacity-70">업로드만 하고 발송 처리는 나중에 합니다.</div>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--metro-line4)]/5 border border-[var(--metro-line4)]/20 flex gap-3 animate-float-subtle">
                <Info className="w-5 h-5 text-[var(--metro-line4)] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                  <p className="font-bold text-[var(--text-primary)] mb-1">직접 업로드 기능 고도화</p>
                  업로드된 제안서는 담당 리드와 자동으로 연결되며, 조직 내 다른 관리자들과도 보관함에서 공유됩니다.
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
            취소
          </button>
          {proposalType === 'AUTO' ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving || !selectedStation}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 hover:scale-105"
                style={{ background: 'var(--metro-line4)' }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
              <button
                onClick={handleSendClick}
                disabled={sending || !selectedStation || !emailValid}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 hover:scale-105"
                style={{ background: 'var(--metro-line2)' }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                이메일 발송
              </button>
            </>
          ) : (
            <button
              onClick={handleUpload}
              disabled={uploading || !uploadFile}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
              style={{ background: 'var(--metro-line4)' }}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  파일 처리 중...
                </>
              ) : (
                <>
                  <FilePlus className="w-5 h-5" />
                  제안서 업로드 완료
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showConfirmSend && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowConfirmSend(false)} />
          <div className="relative w-full max-w-md rounded-2xl border p-6 bg-[var(--bg-primary)] border-[var(--glass-border)] animate-float">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">이메일 발송 확인</h3>
              <p className="text-[var(--text-secondary)]">제안서를 {recipientEmail}님께 발송할까요?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmSend(false)} className="flex-1 px-4 py-3 rounded-xl font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">취소</button>
              <button onClick={handleSend} className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-[var(--metro-line2)] hover:scale-105 transition-transform">발송하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
