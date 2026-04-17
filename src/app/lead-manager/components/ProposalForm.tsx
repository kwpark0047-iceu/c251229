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

// 留ㅼ껜 ?좏삎 ?쒓? ?쇰꺼
const AD_TYPE_LABELS: Record<string, string> = {
  'SCREEN_DOOR': '?ㅽ겕由곕룄??PSD)',
  'LIGHT_BOX': '??대뱶而щ윭(議곕챸)',
  'POSTER': '?ъ뒪??愿묎퀬',
  'DIGITAL_POSTER': '디지털 포스터',
  'CM_BOARD': 'CM 蹂대뱶',
  'ESCALATOR': '?먯뒪而щ젅?댄꽣 愿묎퀬',
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

// ?대찓???좏슚??寃??
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function ProposalForm({ lead, onClose, onSuccess }: ProposalFormProps) {
  const { showNotification } = useNotification();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);

  // ???곹깭
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedStation, setSelectedStation] = useState<StationInfo | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<AdInventory[]>([]);
  const [discountRate, setDiscountRate] = useState(0);
  const [greetingMessage, setGreetingMessage] = useState('');

  // ?몃깽?좊━ 紐⑸줉
  const [availableInventory, setAvailableInventory] = useState<AdInventory[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // 紐⑤떖 ?곹깭
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // ?쒖븞???좏삎 諛??낅줈???곹깭
  const [proposalType, setProposalType] = useState<'AUTO' | 'UPLOAD'>(lead ? 'AUTO' : 'UPLOAD');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'SENT' | 'DRAFT'>('SENT');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // 怨좊룄?? ?ㅼ쨷 泥⑤? 愿???곹깭
  const [externalProposals, setExternalProposals] = useState<Proposal[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  // 珥덇린 ?ㅼ젙 諛?沅뚰븳 ?뺤씤
  useEffect(() => {
    // 沅뚰븳 ?뺤씤
    getCurrentUser().then(user => {
      setCurrentUser(user);
    });

    // 湲곕낯 ?몄궗留??ㅼ젙
    if (lead) {
      setGreetingMessage(getDefaultGreeting(lead.bizName, lead.nearestStation));

      // 媛??媛源뚯슫 ???먮룞 ?좏깮
      if (lead.nearestStation) {
        const stationData = SUBWAY_STATIONS.find((s) => s.name === lead.nearestStation);
        const extraInfo = STATION_INFO[lead.nearestStation] || { trafficDaily: 50000, characteristics: '吏?섏쿋???멸렐 ?곴텒' };

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
      setUploadTitle(`留ㅼ껜??怨듭슜 ?쒖븞??(${new Date().toLocaleDateString()})`);
    }

    // 留ㅼ껜???쒖븞???몃? ?뚯씪) 濡쒕뱶
    const loadExternalProposals = async () => {
      setIsLoadingAttachments(true);
      const result = await getProposals();
      if (result.success) {
        // ?꾩옱 由щ뱶???대? ?낅줈?쒕맂 ?뚯씪?대굹, 議곗쭅 ?꾩껜?먯꽌 ?щ┛ 怨듭슜 ?뚯씪?ㅼ쓣 媛?몄샂
        // ?ш린?쒕뒗 ?몄쓽??議곗쭅 ?꾩껜???몃? ?뚯씪????곸쑝濡???
        setExternalProposals(result.proposals.filter(p => p.isExternal));
      }
      setIsLoadingAttachments(false);
    };

    loadExternalProposals();
  }, [lead]);

  // ?뚯씪 ?좏깮 ??湲곕낯 ?쒕ぉ ?ㅼ젙 (珥덇린媛믪씠 湲곕낯 由щ뱶 ?쒖븞???뺤떇?닿굅??怨듭슜 ?쒖븞???뺤떇??寃쎌슦?먮쭔 ??뼱?)
  useEffect(() => {
    if (uploadFile) {
      const isDefaultTitle = !uploadTitle || 
                            uploadTitle.startsWith('매체사 공용 제안서(') ||
                            (lead ? uploadTitle.startsWith(`${lead.bizName} 광고 제안서`) : false);
      
      if (isDefaultTitle) {
        if (lead) {
          setUploadTitle(`${lead.bizName} 愿묎퀬 ?쒖븞??(${uploadFile.name.split('.')[0]})`);
        } else {
          setUploadTitle(`${uploadFile.name.split('.')[0]}`);
        }
      }
    }
  }, [uploadFile, lead]);

  // ... (loadInventory, toggleInventory, handleStationChange, handleSave, handleSendClick, handleSend??湲곗〈 濡쒖쭅 ?좎?) ...

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
      showNotification('error', '留ㅼ껜 紐⑸줉??遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
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
    const extraInfo = STATION_INFO[stationName] || { trafficDaily: 50000, characteristics: '吏?섏쿋???멸렐 ?곴텒' };

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
      showNotification('error', '??궗瑜??좏깮?댁＜?몄슂.');
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

      showNotification('success', '?쒖븞?쒓? ??λ릺?덉뒿?덈떎.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (error) {
      showNotification('error', `????ㅽ뙣: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendClick = () => {
    if (!recipientEmail) {
      showNotification('error', '?섏떊???대찓?쇱쓣 ?낅젰?댁＜?몄슂.');
      return;
    }
    if (!isValidEmail(recipientEmail)) {
      showNotification('error', '?щ컮瑜??대찓???뺤떇???꾨떃?덈떎.');
      return;
    }
    if (!selectedStation) {
      showNotification('error', '??궗瑜??좏깮?댁＜?몄슂.');
      return;
    }
    setShowConfirmSend(true);
  };

  const handleSend = async () => {
    setShowConfirmSend(false);
    setSending(true);

    try {
      // 1. ?쒖븞???뺣낫 DB??癒쇱? ???(DRAFT濡?
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
        throw new Error(`?쒖븞???앹꽦 ?ㅽ뙣: ${sendResult.message}`);
      }

      const proposal = sendResult.proposal;

      // 2. 怨좊룄?붾맂 ?대찓??諛쒖넚 ?쒕퉬???몄텧 (?ㅼ쨷 泥⑤? ?ы븿)
      const result = await sendProposalEmail(
        proposal.id,
        {
          to: recipientEmail,
          subject: `[?쒖슱 吏?섏쿋 愿묎퀬 ?쒖븞] ${lead?.bizName || '怨좉컼'}?섍퍡 ?쒕━???쒖븞?쒖엯?덈떎.`,
          body: greetingMessage,
        },
        selectedAttachmentIds
      );

      if (result.success) {
        showNotification('success', '?쒖븞?쒖? 泥⑤??뚯씪???깃났?곸쑝濡?諛쒖넚?섏뿀?듬땲??');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        showNotification('error', `諛쒖넚 ?ㅽ뙣: ${result.message}`);
      }
    } catch (error) {
      showNotification('error', `諛쒖넚 ?ㅻ쪟: ${(error as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  // ?뚯씪 ?낅줈??泥섎━ 怨좊룄??
  const handleUpload = async () => {
    if (!uploadFile) return;
    if (!uploadTitle.trim()) {
      showNotification('error', '?쒖븞???쒕ぉ???낅젰?댁＜?몄슂.');
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
        showNotification('error', `?낅줈???ㅽ뙣: ${result.message}`);
      }
    } catch (error) {
      showNotification('error', `?낅줈???ㅻ쪟: ${(error as Error).message}`);
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
        // ?뚯씪 ?쒕ぉ ?먮룞 ?ㅼ젙
        setUploadTitle(file.name.split('.')[0]);
      } else {
        showNotification('error', 'PDF ?먮뒗 PPT ?뚯씪留??낅줈??媛?ν빀?덈떎.');
      }
    }
  };

  // 沅뚰븳 ?뺤씤: SuperAdmin ?닿굅??Admin/Owner ??寃쎌슦?먮쭔 ?낅줈??媛??
  const canUpload = currentUser?.isSuperAdmin || currentUser?.role === 'admin' || currentUser?.role === 'owner';

  const emailValid = recipientEmail && isValidEmail(recipientEmail);
  const emailInvalid = recipientEmail && !isValidEmail(recipientEmail);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-[var(--bg-primary)] border-[var(--border-subtle)]"
        >
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">愿묎퀬 ?쒖븞???묒꽦</h2>
            <p className="text-sm text-[var(--text-muted)]">{lead?.bizName || '공용 매체 보관함'}</p>
          </div>
          <button onClick={onClose} title="?リ린" className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* ?쒖븞???좏삎 ?좏깮 ??*/}
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
              <span className="font-bold">?먮룞 ?쒖븞???앹꽦</span>
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
              <span className="font-bold">留ㅼ껜??沅뚰븳 ?꾩슜</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {proposalType === 'AUTO' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  ?섏떊???대찓??
                </label>
                <div className="relative">
                  <input
                    id="recipient-email"
                    name="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="example@email.com"
                    aria-label="수신자 이메일"
                    className={`w-full px-4 py-3 pr-12 bg-[var(--bg-secondary)] rounded-xl border text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 ${emailValid
                      ? 'border-green-500 focus:ring-green-500/50'
                      : emailInvalid
                        ? 'border-red-500 focus:ring-red-500/50'
                        : 'border-[var(--border-subtle)] focus:ring-[var(--metro-line4)]'
                      }`}
                  />
                  {emailValid && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
                  {emailInvalid && <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />}
                </div>
                {emailInvalid && <p className="mt-1 text-sm text-red-400">?щ컮瑜??대찓???뺤떇???낅젰?댁＜?몄슂.</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  <Train className="w-4 h-4 inline mr-2" />
                  異붿쿇 ??궗 ?좏깮
                </label>
                <select
                  id="selected-station"
                  name="selectedStation"
                  value={selectedStation?.name || ''}
                  onChange={(e) => handleStationChange(e.target.value)}
                   aria-label="??궗 ?좏깮"
                   title="??궗 ?좏깮"
                   className="w-full px-4 py-3 bg-[var(--bg-secondary)] border-[var(--border-subtle)] rounded-xl border text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--metro-line4)]"
                >
                  <option value="">역사를 선택하세요</option>
                  {SUBWAY_STATIONS.map((station) => (
                    <option key={station.name} value={station.name}>
                      {station.name}??({station.lines.join(', ')}?몄꽑)
                    </option>
                  ))}
                </select>

                {selectedStation && (
                  <div
                    className="mt-4 p-4 bg-[var(--bg-tertiary)] border-[var(--border-subtle)] rounded-xl border animate-scale-in"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-lg font-bold text-[var(--text-primary)]">{selectedStation.name}역</span>
                      <div className="flex gap-1">
                        {selectedStation.lines.map((line) => (
                          <span
                            key={line}
                            className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold bg-[--line-color]"
                            // eslint-disable-next-line react/forbid-dom-props
                            style={{ '--line-color': LINE_COLORS[line] || '#888' } as React.CSSProperties}
                          >
                            {line}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Users className="w-4 h-4 text-[var(--metro-line2)]" />
                        <span>?쇱씪 ?좊룞?멸뎄: </span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {selectedStation.trafficDaily.toLocaleString()}紐?
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
                  愿묎퀬 留ㅼ껜 ?좏깮
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {loadingInventory ? (
                    <div className="col-span-full py-8 flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      <span>留ㅼ껜 紐⑸줉??遺덈윭?ㅻ뒗 以?..</span>
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
                          <span className="text-[var(--text-muted)]">{item.adSize || '?쒖? 洹쒓꺽'}</span>
                          <span className="font-bold text-[var(--metro-line4)]">
                            {item.priceMonthly?.toLocaleString()}??
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-[var(--text-muted)] italic">
                      {selectedStation ? '媛?⑺븳 留ㅼ껜媛 ?놁뒿?덈떎.' : '??궗瑜?癒쇱? ?좏깮?댁＜?몄슂.'}
                    </div>
                  )}
                </div>
              </div>

              {/* 怨좊룄?? 留ㅼ껜 ?쒖븞??異붽? 泥⑤? ?뱀뀡 */}
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-3">
                  <FilePlus className="w-4 h-4 inline mr-2 text-[var(--metro-line2)]" />
                  留ㅼ껜 ?쒖븞??異붽? 泥⑤? (湲곗〈 ?낅줈???뚯씪)
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
                      癒쇱? '?쒖븞???뚯씪 吏곸젒 ?낅줈?? ??뿉??留ㅼ껜 ?쒖븞?쒕? ?щ젮蹂댁꽭??
                    </div>
                  )}
                  {selectedAttachmentIds.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 text-[10px] text-[var(--metro-line2)] font-bold">
                      <CheckCircle className="w-3 h-3" />
                      {selectedAttachmentIds.length}媛쒖쓽 留ㅼ껜 ?쒖븞?쒓? 異붽?濡?泥⑤??⑸땲??
                    </div>
                  )}
                </div>
              </div>

              {/* ?몄궗留??낅젰 */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  ?몄궗留?諛??쒖븞 ?댁슜
                </label>
                <textarea
                  id="greeting-message"
                  name="greetingMessage"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  rows={8}
                  title="?몄궗留?諛??쒖븞 ?댁슜"
                  placeholder="고객에게 전달할 인사말 및 제안 내용을 입력하세요"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--metro-line4)] resize-none"
                />
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* ?쒕ぉ ?낅젰 ?꾨뱶 異붽? */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  ?쒖븞???쒕ぉ
                </label>
                <input
                  id="upload-title"
                  name="uploadTitle"
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="?? 媛뺣궓??愿묎퀬 ?쒖븞??- XX?깊삎?멸낵"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--metro-line4)]"
                />
              </div>

              {/* ?쒕옒洹????쒕∼ ?곸뿭 */}
              <div className={`text-center p-8 border-2 border-dashed rounded-2xl transition-colors group overflow-hidden ${
                  dragActive ? 'border-[var(--metro-line4)] bg-[var(--bg-tertiary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!uploadFile ? (
                  <div className="flex flex-col items-center animate-float">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FileUp className="w-8 h-8 text-[var(--metro-line4)]" />
                    </div>
                    <p className="text-lg font-bold text-[var(--text-primary)] mb-1">
                      ?쒖븞???뚯씪???ш린???쒕옒洹명븯?몄슂
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mb-6">
                      PDF, PPT, PPTX ?뚯씪 吏??(理쒕? 100MB)
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
                      ?뚯씪 ?좏깮?섍린
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
                      ?ㅻⅨ ?뚯씪 ?좏깮
                    </button>
                  </div>
                )}
              </div>

              {/* ?낅줈?????곹깭 ?좏깮 */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-[var(--text-secondary)]">?낅줈?????곹깭 ?ㅼ젙</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUploadStatus('SENT')}
                    className={`flex-1 p-4 rounded-xl border text-center transition-all ${
                      uploadStatus === 'SENT'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="font-bold mb-1">?낅줈??諛?諛쒖넚 泥섎━</div>
                    <div className="text-[10px] opacity-70">?쒖뒪?쒖뿉???쒖븞??諛쒖넚 ?꾨즺濡?泥섎━?⑸땲??</div>
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
                    <div className="text-[10px] opacity-70">?낅줈?쒕쭔 ?섍퀬 諛쒖넚 泥섎━???섏쨷???⑸땲??</div>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--metro-line4)]/5 border border-[var(--metro-line4)]/20 flex gap-3 animate-float-subtle">
                <Info className="w-5 h-5 text-[var(--metro-line4)] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                  <p className="font-bold text-[var(--text-primary)] mb-1">직접 업로드 기능 고도화</p>
                  ?낅줈?쒕맂 ?쒖븞?쒕뒗 ?대떦 由щ뱶? ?먮룞?쇰줈 ?곌껐?섎ŉ, 議곗쭅 ???ㅻⅨ 愿由ъ옄?ㅺ낵??蹂닿??⑥뿉??怨듭쑀?⑸땲??
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t bg-[var(--bg-primary)] border-[var(--border-subtle)]"
        >
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
            痍⑥냼
          </button>
          {proposalType === 'AUTO' ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving || !selectedStation}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 hover:scale-105 bg-[var(--metro-line4)]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                ???
              </button>
              <button
                onClick={handleSendClick}
                disabled={sending || !selectedStation || !emailValid}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 hover:scale-105 bg-[var(--metro-line2)]"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                ?대찓??諛쒖넚
              </button>
            </>
          ) : (
            <button
              onClick={handleUpload}
              disabled={uploading || !uploadFile}
              className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 hover:scale-105 active:scale-95 bg-[var(--metro-line4)]"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  ?뚯씪 泥섎━ 以?..
                </>
              ) : (
                <>
                  <FilePlus className="w-5 h-5" />
                  ?쒖븞???낅줈???꾨즺
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showConfirmSend && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowConfirmSend(false)} />
          <div className="relative w-full max-w-md rounded-2xl border p-6 bg-[var(--bg-primary)] border-[var(--border-subtle)] animate-float">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">?대찓??諛쒖넚 ?뺤씤</h3>
              <p className="text-[var(--text-secondary)]">?쒖븞?쒕? {recipientEmail}?섍퍡 諛쒖넚?좉퉴??</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmSend(false)} className="flex-1 px-4 py-3 rounded-xl font-semibold text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">痍⑥냼</button>
              <button onClick={handleSend} className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-[var(--metro-line2)] hover:scale-105 transition-transform">諛쒖넚?섍린</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
