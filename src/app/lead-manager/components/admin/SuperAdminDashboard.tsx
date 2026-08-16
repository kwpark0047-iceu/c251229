'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Shield, CheckCircle, XCircle, Building, 
  Search, Filter, Activity,
  Settings, History, Download, FileText, Calendar,
  BarChart3, UserCheck, X, AlertCircle, Trash2, GraduationCap, Utensils,
  Coffee, Truck, Plus, Edit
} from 'lucide-react';
import { 
  getAllProfiles, 
  updateProfileStatus, 
  updateUserOrganization, 
  getAllOrganizations,
  createOrganization,
  getAllUserLogs,
  getUserLogs,
  deleteUserProfile,
  updateUserTier,
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  UserInfo
} from '../../auth-service';
import { Bell, Check, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  isApproved: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  tier: 'FREE' | 'DEMO' | 'MEDIA' | 'SALES' | null;
  trialExpiresAt: string | null;
  membership: {
    role: string;
    organizationId: string;
    organizationName: string;
  } | null;
}

interface Props {
  user?: UserInfo | null;
}

interface SyncCardProps {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  colorName: string;
  features: string[];
  apiPath: string;
  sectorKey: string;
  syncingSector: string | null;
  onSync: (sector: string, apiPath: string, title: string) => Promise<void>;
}

function SyncCard({
  title, subtitle, description, icon: Icon, colorName, features, apiPath, sectorKey, syncingSector, onSync
}: SyncCardProps) {
  const isSyncing = syncingSector === sectorKey;
  
  const colorMap: Record<string, any> = {
    emerald: { 
      from: 'from-emerald-500/5', iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400', 
      check: 'text-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20',
      syncBtn: 'bg-emerald-800'
    },
    indigo: { 
      from: 'from-indigo-500/5', iconBg: 'bg-indigo-500/20', iconColor: 'text-indigo-400', 
      check: 'text-indigo-500', btn: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20',
      syncBtn: 'bg-indigo-800'
    },
    rose: { 
      from: 'from-rose-500/5', iconBg: 'bg-rose-500/20', iconColor: 'text-rose-400', 
      check: 'text-rose-500', btn: 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20',
      syncBtn: 'bg-rose-800'
    },
    amber: { 
      from: 'from-amber-500/5', iconBg: 'bg-amber-500/20', iconColor: 'text-amber-400', 
      check: 'text-amber-500', btn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20',
      syncBtn: 'bg-amber-800'
    },
    orange: { 
      from: 'from-orange-500/5', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-400', 
      check: 'text-orange-500', btn: 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20',
      syncBtn: 'bg-orange-800'
    },
    cyan: { 
      from: 'from-cyan-500/5', iconBg: 'bg-cyan-500/20', iconColor: 'text-cyan-400', 
      check: 'text-cyan-500', btn: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20',
      syncBtn: 'bg-cyan-800'
    }
  };

  const c = colorMap[colorName] || colorMap.indigo;

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
      <div className={`absolute inset-0 bg-gradient-to-r ${c.from} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 ${c.iconBg} rounded-xl`}>
            <Icon className={`w-6 h-6 ${c.iconColor}`} />
          </div>
          <div>
            <h3 className="font-black text-white text-xl uppercase tracking-tighter">{title}</h3>
            <p className={`text-xs ${c.iconColor}/60 font-black tracking-widest uppercase`}>{subtitle}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">{description}</p>
        
        <div className="space-y-3 mb-8">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
              <Check className={`w-3.5 h-3.5 ${c.check}`} />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
      
      <button 
        onClick={() => onSync(sectorKey, apiPath, title)}
        disabled={isSyncing}
        className={`relative z-10 flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl ${
          isSyncing ? `${c.syncBtn} opacity-50 cursor-not-allowed` : `${c.btn} text-white`
        }`}
      >
        {isSyncing ? <span className="animate-spin mr-2">↻</span> : <Download className="w-4 h-4" />}
        {isSyncing ? '동기화 진행 중...' : `${title} 동기화`}
      </button>
    </div>
  );
}

export default function SuperAdminDashboard({ user }: Props) {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'data'>('users');
  
  // Data States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  
  // Scoring Config States
  const [selectedScoreOrg, setSelectedScoreOrg] = useState('');
  const [scoreConfig, setScoreConfig] = useState<{
    distance: { max: number; within300: number; within700: number; within1500: number; over1500: number };
    category: { max: number; health: number; animalCulture: number; foodLiving: number; other: number };
    completeness: { max: number; phone: number; address: number; businessName: number };
  } | null>(null);
  const [savingScoreConfig, setSavingScoreConfig] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'FREE' | 'DEMO' | 'MEDIA' | 'SALES'>('ALL');
  
  // Modal States
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [showUserLogsModal, setShowUserLogsModal] = useState(false);
  const [selectedUserLogs, setSelectedUserLogs] = useState<any[]>([]);
  const [userLogsLoading, setUserLogsLoading] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [toastNotification, setToastNotification] = useState<any | null>(null);
  const [syncingSector, setSyncingSector] = useState<string | null>(null);

  // Dynamic API Configuration States
  const [apiConfigs, setApiConfigs] = useState<any[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; duration?: number; error?: string }>>({});

  // Load API configurations from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('antigravity_api_configs');
      if (saved) {
        try {
          setApiConfigs(JSON.parse(saved));
        } catch {
          setApiConfigs([]);
        }
      } else {
        // Preload default active keys for seamless UX
        const defaults = [
          {
            id: 'default-seoul-clinic',
            name: '서울시 의원 인허가 API',
            type: 'seoul-clinic',
            apiKey: '6d7a6b6c766b777033346b53716455',
            sigunNm: '',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 'default-gg-clinic',
            name: '경기도 의원 상세 API',
            type: 'gg-clinic',
            apiKey: 'c9c5e32c0aff406bbe3de0f7af75f6f8',
            sigunNm: '',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 'default-gg-academy',
            name: '경기도 학원/교습소 API',
            type: 'gg-academy',
            apiKey: 'e9efa0682eef460cb25cefcc42c52484',
            sigunNm: '',
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem('antigravity_api_configs', JSON.stringify(defaults));
        setApiConfigs(defaults);
      }
    }
  }, []);

  const handleSaveConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const apiKey = formData.get('apiKey') as string;
    const sigunNm = formData.get('sigunNm') as string || '';
    const isActive = formData.get('isActive') === 'true';

    if (!name || !type || !apiKey) {
      toast.warning('필수 항목을 모두 작성해주세요.');
      return;
    }

    let updatedConfigs;
    if (editingConfig) {
      updatedConfigs = apiConfigs.map(c => c.id === editingConfig.id ? {
        ...c,
        name,
        type,
        apiKey,
        sigunNm,
        isActive,
        updatedAt: new Date().toISOString()
      } : c);
    } else {
      const newConfig = {
        id: `config-${Date.now()}`,
        name,
        type,
        apiKey,
        sigunNm,
        isActive,
        createdAt: new Date().toISOString()
      };
      updatedConfigs = [...apiConfigs, newConfig];
    }

    setApiConfigs(updatedConfigs);
    localStorage.setItem('antigravity_api_configs', JSON.stringify(updatedConfigs));
    setShowConfigModal(false);
    setEditingConfig(null);
  };

  const handleDeleteConfig = (id: string) => {
    if (!confirm('정말 이 API 설정을 삭제하시겠습니까?')) return;
    const updatedConfigs = apiConfigs.filter(c => c.id !== id);
    setApiConfigs(updatedConfigs);
    localStorage.setItem('antigravity_api_configs', JSON.stringify(updatedConfigs));
    
    const newResults = { ...testResults };
    delete newResults[id];
    setTestResults(newResults);
  };

  const handleTestConnection = async (id: string, type: string, apiKey: string, sigunNm?: string) => {
    setTestingId(id);
    setTestResults(prev => ({
      ...prev,
      [id]: { success: false, error: '검증 중...' }
    }));

    try {
      // API 키가 URL에 노출되지 않도록 POST body로 전송
      const res = await fetch('/api/api-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          apiKey,
          sigunNm: sigunNm || '',
        }),
      });
      const data = await res.json();

      if (data.success) {
        setTestResults(prev => ({
          ...prev,
          [id]: { success: true, duration: data.duration }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [id]: { success: false, error: data.error || '연결 실패' }
        }));
      }
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, error: '네트워크 연결 오류' }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const loadData = useCallback(async () => {
    // 최초 로딩 시에만 스피너 표시
    if (profiles.length === 0) setLoading(true);
    
    const [pResult, oData, nResult] = await Promise.all([
      getAllProfiles(),
      getAllOrganizations(),
      getAdminNotifications(10)
    ]);
    if (pResult.success) setProfiles(pResult.profiles);
    setOrgs(oData);
    
    if (nResult.success) {
      setNotifications(nResult.notifications);
      setUnreadCount(nResult.notifications.filter((n: any) => !n.is_read).length);
    }
    
    setLoading(false);
  }, [profiles.length]);

  const loadScoringConfig = useCallback(async (orgId: string) => {
    if (!orgId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('organizations')
      .select('scoring_config')
      .eq('id', orgId)
      .maybeSingle();
    const existing = data?.scoring_config as any;
    setScoreConfig({
      distance: { max: 40, within300: 40, within700: 30, within1500: 20, over1500: 10, ...(existing?.distance || {}) },
      category: { max: 30, health: 30, animalCulture: 20, foodLiving: 10, other: 5, ...(existing?.category || {}) },
      completeness: { max: 30, phone: 15, address: 10, businessName: 5, ...(existing?.completeness || {}) },
    });
  }, []);

  const saveScoringConfig = async () => {
    if (!selectedScoreOrg || !scoreConfig) return;
    setSavingScoreConfig(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('organizations')
        .update({ scoring_config: scoreConfig })
        .eq('id', selectedScoreOrg);
      if (error) {
        alert(`저장 실패: ${error.message}`);
      } else {
        alert('스코어링 가중치가 저장되었습니다. 다음 동기화부터 적용됩니다.');
      }
    } catch (err) {
      alert('네트워크 오류로 저장하지 못했습니다.');
    } finally {
      setSavingScoreConfig(false);
    }
  };

  const updateScoreField = (group: 'distance' | 'category' | 'completeness', field: string, value: number) => {
    setScoreConfig(prev => prev ? ({ ...prev, [group]: { ...prev[group], [field]: value } }) : prev);
  };

  const handleSync = async (sector: string, apiPath: string, title: string) => {
    if (!confirm(`${title} 동기화를 시작하시겠습니까?\n이 작업은 수 분이 소요될 수 있습니다.`)) return;
    
    setSyncingSector(sector);
    try {
      let finalPath = `${apiPath}${apiPath.includes('?') ? '&' : '?'}sync=true`;
      
      // sectorKey 매핑하여 활성 API 키 주입
      const typeMap: Record<string, string> = {
        academy: 'gg-academy',
        clinic: 'gg-clinic',
        hospital: 'gg-hospital',
        univ: 'gg-univ',
        restaurant: 'gg-restaurant',
        jncl: 'gg-jncl-univ',
        'food-trucks': 'gg-food-trucks',
        'coffee-shops': 'gg-coffee-shops',
        'seoul-clinic': 'seoul-clinic'
      };
      
      const mappedType = typeMap[sector] || sector;
      const activeConfig = apiConfigs.find(c => c.type === mappedType && c.isActive);
      
      if (activeConfig && activeConfig.apiKey) {
        finalPath += `&apiKey=${encodeURIComponent(activeConfig.apiKey)}`;
        if (activeConfig.sigunNm) {
          finalPath += `&sigunNm=${encodeURIComponent(activeConfig.sigunNm)}`;
        }
      }

      // 브라우저 및 Next.js 라우터 캐시 완벽 우회를 위한 캐시 무효화 파라미터 추가
      finalPath += `&_t=${Date.now()}`;

      const response = await fetch(finalPath, { cache: 'no-store' });
      const result = await response.json();
      if (result.success) {
        toast.success(`동기화 성공: ${result.leads?.length || 0}건의 데이터를 처리했습니다.`);
      } else {
        toast.error(`오류 발생: ${result.message || result.error}`);
      }
    } catch (err) {
      toast.error('동기화 중 통신 오류가 발생했습니다.');
    } finally {
      setSyncingSector(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

useEffect(() => {
    if (!user?.id) return;

    // 실시간 구독 설정 (최종 안정화 버전)
    const supabase = createClient();

    // 채널 생성 및 존재감 구독
    const channel = supabase
      .channel('antigravity-admin-global-presence', {
        config: {
          presence: {
            key: user.id,
          },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          setIsLive(true);
          loadData();
          setTimeout(() => setIsLive(false), 2000);
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // 중복 제거 (user_id 기반으로 더욱 정확하게)
        const entries = Object.values(state).flat() as any[];
        const uniqueEntries = entries.filter((v, i, a) => 
          v.user_id && a.findIndex(t => t.user_id === v.user_id) === i
        );
        
        console.log('Realtime Presence Synced:', uniqueEntries);
        setOnlineUsers(uniqueEntries);
        setOnlineUsersCount(uniqueEntries.length);
      })
      .on('presence', { event: 'join' }, ({ newPresences }: { newPresences: any[] }) => {
        console.log('Admin Node Joined:', newPresences);
        setIsLive(true);
        setTimeout(() => setIsLive(false), 3000);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: any[] }) => {
        console.log('Admin Node Left:', leftPresences);
        setTimeout(() => {
          loadData();
        }, 200);
      })
      .subscribe((status: string, err: any) => {
      });

    // 관리자 알림 실시간 구독
    const notificationChannel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload: { new: any }) => {
          console.log('New Notification Received:', payload.new);
          const newNotif = payload.new;
          
          // 상태 업데이트
          setNotifications(prev => [newNotif, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
          
          // 토스트 팝업 표시
          setToastNotification(newNotif);
          
          // 8초 후 토스트 자동 소멸
          setTimeout(() => setToastNotification(null), 8000);
          
          // 사용자 목록 데이터도 갱신 (신규 가입 알림인 경우)
          if (newNotif.type === 'SIGNUP') {
            loadData();
          }
        }
      )
      .subscribe((status: string, err: any) => {
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notificationChannel);
    };
  }, [user?.id, activeTab, loadData]); 

  const loadAllLogs = useCallback(async () => {
    setLogsLoading(true);
    const result = await getAllUserLogs(200);
    if (result.success) {
      setAllLogs(result.logs);
    }
    setLogsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'logs' && allLogs.length === 0) {
      loadAllLogs();
    }
  }, [activeTab, allLogs.length, loadAllLogs]);

  const handleApproval = async (userId: string, isApproved: boolean) => {
    if (!confirm(isApproved ? '이 사용자를 승인하시겠습니까?' : '승인을 취소하시겠습니까?')) return;
    const result = await updateProfileStatus(userId, { isApproved });
    if (result.success) {
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleOrgUpdate = async (userId: string, orgId: string | null, role: any) => {
    const result = await updateUserOrganization(userId, orgId, role);
    if (result.success) {
      setShowOrgModal(false);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    const result = await createOrganization(newOrgName);
    setCreatingOrg(false);
    if (result.success) {
      toast.success(result.message);
      setShowCreateOrgModal(false);
      setNewOrgName('');
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleViewUserLogs = async (profile: Profile) => {
    setSelectedProfile(profile);
    setShowUserLogsModal(true);
    setUserLogsLoading(true);
    const result = await getUserLogs(profile.id, 50);
    if (result.success) {
      setSelectedUserLogs(result.logs);
    } else {
      setSelectedUserLogs([]);
    }
    setUserLogsLoading(false);
  };

  const handleDeleteProfile = async (userId: string, email: string) => {
    if (!window.confirm(`[주의] ${email} 회원을 시스템에서 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 모든 소속 정보가 함께 삭제됩니다.`)) return;
    
    setLoading(true);
    const result = await deleteUserProfile(userId);
    if (result.success) {
      loadData();
    } else {
      toast.error(result.message);
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'APPROVED' && p.isApproved) || 
                         (statusFilter === 'PENDING' && !p.isApproved);
    const matchesTier = tierFilter === 'ALL' || p.tier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  // KPI Metrics
  const allMembersCount = profiles.length;
  const registeredUsersCount = profiles.filter(p => p.tier !== null).length;
  const pendingUsersCount = profiles.filter(p => !p.isApproved).length;
  const demoUsersCount = profiles.filter(p => p.tier === 'DEMO').length;

  const handleTierChange = async (userId: string, email: string, tier: string) => {
    const result = await updateUserTier(userId, email, tier);
    if (result.success) {
      setIsLive(true);
      loadData();
      setTimeout(() => setIsLive(false), 2000);
    } else {
      toast.error(`Tier 변경 실패: ${result.error}`);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const result = await markNotificationAsRead(id);
    if (result.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };


  return (
    <div className="flex flex-col h-full bg-[#050505] text-slate-200">
      {/* 최고 관리자 헤더 (Premium Antigravity Style) */}
      <div className="relative px-8 py-10 overflow-hidden border-b border-white/5">
        {/* 다이내믹 배경 효과 */}
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <Shield className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500">
                  SUPER ADMIN <span className="text-indigo-400/80 font-medium">DASHBOARD</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <p className="text-xs font-bold text-emerald-400/80 tracking-[0.2em] uppercase">System Core Integrity Active</p>
                </div>
              </div>
            </div>
          </div>

          {/* 최고 관리자 식별 섹션 (Active Admin Profile Card) */}
          {user && (
            <div className="group relative animate-float transition-all duration-500">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative flex items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center font-black text-xl text-indigo-300 shadow-inner">
                    {(user.email[0]).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#050505] rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white tracking-tight">{user.email.split('@')[0]}</span>
                    <span className="px-1.5 py-0.5 bg-indigo-500 text-xs font-black rounded uppercase tracking-tighter shadow-lg shadow-indigo-500/20">ROOT</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{user.email}</span>
                </div>
                <div className="ml-4 pl-4 border-l border-white/5 flex flex-col items-end">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Master Auth</p>
                  <p className="text-xs font-black text-indigo-400/80 uppercase tracking-tighter">Verified Session</p>
                </div>

                {/* 알림 센터 벨 (NEW) */}
                <div className="relative ml-4 pl-4 border-l border-white/5">
                  <button 
                    onClick={() => setShowNotificationList(!showNotificationList)}
                    className={`p-2.5 rounded-xl border transition-all duration-300 relative group ${
                      showNotificationList ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                    aria-label="시스템 알림"
                  >
                    <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-black rounded-full flex items-center justify-center border-2 border-[#0D0D0D] shadow-lg animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* 알림 드롭다운 (Premium Glassmorphism) */}
                  {showNotificationList && (
                    <div className="absolute right-0 mt-4 w-80 bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-indigo-400" />
                          Security Alerts
                        </h4>
                        <button 
                          onClick={handleMarkAllAsRead}
                          className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-tighter"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => handleMarkAsRead(notif.id)}
                              className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 group relative ${!notif.is_read ? 'bg-indigo-500/[0.03]' : ''}`}
                            >
                              {!notif.is_read && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                              )}
                              <div className="flex gap-3">
                                <div className={`mt-1 p-1.5 rounded-lg border ${
                                  notif.type === 'SIGNUP' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                }`}>
                                  {notif.type === 'SIGNUP' ? <UserCheck className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-xs leading-relaxed ${notif.is_read ? 'text-slate-400' : 'text-slate-200 font-bold'}`}>
                                    {notif.message}
                                  </p>
                                  <p className="text-xs text-slate-600 mt-1 font-medium italic">
                                    {new Date(notif.created_at).toLocaleString()}
                                  </p>
                                </div>
                                {!notif.is_read && (
                                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-10 text-center flex flex-col items-center gap-3">
                            <Shield className="w-8 h-8 text-slate-800" />
                            <p className="text-xs text-slate-600 font-black uppercase tracking-widest">No Active Alerts</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white/[0.02] border-t border-white/5 text-center">
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">System Integrity Verified</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>


        {/* KPI 필드 리뉴얼 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-12 relative z-10">
          <div className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all duration-500 animate-float shadow-2xl translate-y-0 hover:-translate-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-blue-500/60 tracking-widest uppercase mb-1">Scale</span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-black rounded-full border border-blue-500/20">TOTAL</span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tighter leading-none">{allMembersCount.toLocaleString()}</h3>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wide">시스템 전체 회원</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all duration-500 animate-float delay-100 shadow-2xl translate-y-0 hover:-translate-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-emerald-500/60 tracking-widest uppercase mb-1">Status</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-full border border-emerald-500/20">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                  ONLINE
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-emerald-400 tracking-tighter leading-none">{onlineUsersCount.toLocaleString()}</h3>
              <div className="flex -space-x-2 mt-2">
                {onlineUsers.slice(0, 5).map((u, i) => (
                  <div
                    key={u.id}
                    className={`w-5 h-5 rounded-full bg-emerald-500 border border-white/20 flex items-center justify-center text-[10px] font-bold animate-fade-in animate-float-subtle opacity-90 delay-${i * 100}`}
                  >
                    {(u.email || '?')[0].toUpperCase()}
                  </div>
                ))}
                {onlineUsersCount > 5 && <div className="w-5 h-5 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-bold">+ {onlineUsersCount - 5}</div>}
              </div>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wide">실시간 활성 계정</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all duration-500 animate-float delay-200 shadow-2xl translate-y-0 hover:-translate-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-indigo-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-indigo-500/60 tracking-widest uppercase mb-1">Trust</span>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs font-black rounded-full border border-indigo-500/20">REGS</span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tighter leading-none">{registeredUsersCount.toLocaleString()}</h3>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wide">정식 승인 회원</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all duration-500 animate-float delay-300 shadow-2xl translate-y-0 hover:-translate-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-amber-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/10 ${isLive ? 'animate-pulse bg-amber-500/30' : ''}`}>
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-amber-500/60 tracking-widest uppercase mb-1">Action</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-black rounded-full border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  <span className="w-1 h-1 bg-amber-500 rounded-full animate-ping"></span>
                  LIVE PENDING
                </span>
              </div>
            </div>
            <div>
              <h3 className={`text-3xl font-black text-amber-400 tracking-tighter leading-none transition-all duration-500 ${isLive ? 'scale-110 translate-x-2 text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : ''}`}>{pendingUsersCount.toLocaleString()}</h3>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wide">검토 대기 중인 계정</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all duration-500 animate-float delay-450 shadow-2xl translate-y-0 hover:-translate-y-2 border-indigo-500/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-purple-500/60 tracking-widest uppercase mb-1">Trial</span>
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs font-black rounded-full border border-purple-500/20">DEMO</span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-purple-400 tracking-tighter leading-none">{demoUsersCount.toLocaleString()}</h3>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wide">데모 라이선스 활성</p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 (Glass Design) */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/5 px-8 flex items-center gap-8 sticky top-0 z-20 shadow-2xl shadow-black/50">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-5 px-3 font-bold text-xs tracking-widest uppercase transition-all border-b-2 relative group ${
            activeTab === 'users' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className={`w-4 h-4 ${activeTab === 'users' ? 'text-indigo-400' : 'text-slate-500'}`} />
            Account Management
          </div>
          {activeTab === 'users' && <div className="absolute inset-0 bg-indigo-500/5 blur-xl -z-10"></div>}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-5 px-3 font-bold text-xs tracking-widest uppercase transition-all border-b-2 relative group ${
            activeTab === 'logs' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${activeTab === 'logs' ? 'text-indigo-400' : 'text-slate-500'}`} />
            System Audit Logs
          </div>
          {activeTab === 'logs' && <div className="absolute inset-0 bg-indigo-500/5 blur-xl -z-10"></div>}
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`py-5 px-3 font-bold text-xs tracking-widest uppercase transition-all border-b-2 relative group ${
            activeTab === 'data' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Download className={`w-4 h-4 ${activeTab === 'data' ? 'text-indigo-400' : 'text-slate-500'}`} />
            Data Management
          </div>
          {activeTab === 'data' && <div className="absolute inset-0 bg-indigo-500/5 blur-xl -z-10"></div>}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-transparent to-transparent">
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 검색 및 필터 바 (Glass Interior) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-2xl">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative group">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by Identity..."
                    className="pl-11 pr-5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none w-80 transition-all shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="상태 필터"
                    className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-black/50 transition-all cursor-pointer shadow-inner uppercase tracking-wider"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="ALL">All Status</option>
                    <option value="APPROVED">Trusted</option>
                    <option value="PENDING">Review</option>
                  </select>
                  <select
                    aria-label="등급 필터"
                    className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-black/50 transition-all cursor-pointer shadow-inner uppercase tracking-wider"
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value as any)}
                  >
                    <option value="ALL">All Tiers</option>
                    <option value="FREE">Standard</option>
                    <option value="DEMO">Trial</option>
                    <option value="MEDIA">Publisher</option>
                    <option value="SALES">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-px bg-white/5 mx-2 hidden lg:block"></div>
                <button 
                  onClick={() => setShowCreateOrgModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Create Organization
                </button>
                <button 
                  onClick={loadAllLogs}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  <Activity className="w-4 h-4" />
                  Refresh System
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 blur-xl bg-indigo-500/20 rounded-full animate-pulse"></div>
                </div>
                <p className="text-slate-500 font-black text-xs uppercase tracking-[0.3em] animate-pulse">Synchronizing Core Data...</p>
              </div>
            ) : filteredProfiles.length > 0 ? (
              <div className="bg-white/[0.01] backdrop-blur-sm rounded-3xl border border-white/5 shadow-2xl overflow-hidden mb-12">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/5 text-slate-400 text-xs font-black uppercase tracking-[0.2em]">
                      <th className="px-8 py-5">Identity Profile</th>
                      <th className="px-8 py-5">Organization & Access</th>
                      <th className="px-8 py-5">Security Tier</th>
                      <th className="px-8 py-5">Trust Status</th>
                      <th className="px-8 py-5">Node Entry</th>
                      <th className="px-8 py-5 text-right">System Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProfiles.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.04] transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-black border border-white/10 text-slate-400 flex items-center justify-center font-black text-lg shadow-2xl group-hover:scale-105 transition-transform">
                              {(p.fullName || p.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-white text-sm tracking-tight">{p.fullName || 'Unidentified Node'}</p>
                              <p className="text-xs text-slate-500 font-medium group-hover:text-indigo-400 transition-colors">{p.email}</p>
                            </div>
                            {p.isSuperAdmin && (
                              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-xs font-black tracking-widest shadow-lg shadow-indigo-500/10">ROOT</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800/40 rounded-lg border border-white/5">
                              <Building className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-slate-300 font-bold text-xs">
                                {p.membership?.organizationName || <span className="text-slate-600 italic font-medium">No Domain</span>}
                              </p>
                              <p className="text-xs uppercase font-black text-indigo-500/60 tracking-wider">
                                {p.membership?.role || 'Guest'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-2">
                            <select
                              aria-label="회원 등급 변경"
                              value={p.tier || 'FREE'}
                              onChange={(e) => handleTierChange(p.id, p.email, e.target.value)}
                              className={`inline-flex items-center w-fit px-2.5 py-1 rounded text-xs font-black uppercase tracking-[0.15em] shadow-lg cursor-pointer outline-none transition-all ${
                                p.tier === 'DEMO' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                p.tier === 'MEDIA' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                p.tier === 'SALES' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                'bg-slate-800/40 text-slate-500 border border-white/5'
                              }`}
                            >
                              <option value="FREE" className="bg-[#0f172a] text-slate-400">FREE</option>
                              <option value="DEMO" className="bg-[#0f172a] text-purple-400">DEMO</option>
                              <option value="MEDIA" className="bg-[#0f172a] text-blue-400">MEDIA</option>
                              <option value="SALES" className="bg-[#0f172a] text-amber-400">SALES</option>
                            </select>
                            {p.tier === 'DEMO' && p.trialExpiresAt && (
                              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <span className="w-1 h-1 bg-purple-500 rounded-full"></span>
                                {Math.max(0, Math.ceil((new Date(p.trialExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Days Remaining
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm font-medium">
                          {p.isApproved ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                              <CheckCircle className="w-3.5 h-3.5" /> Trusted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-xl text-xs font-black uppercase tracking-widest border border-amber-500/20 shadow-lg shadow-amber-500/5">
                              <AlertCircle className="w-3.5 h-3.5" /> Verification
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Entry Date</p>
                            <p className="text-slate-300 text-xs font-bold mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleViewUserLogs(p)}
                              className="p-2.5 bg-white/[0.03] text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 border border-white/5 rounded-xl transition-all shadow-xl active:scale-90"
                              title="Audit History"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProfile(p);
                                setShowOrgModal(true);
                              }}
                              className="p-2.5 bg-white/[0.03] text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 border border-white/5 rounded-xl transition-all shadow-xl active:scale-90"
                              title="Domain Access Control"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            {!p.isApproved ? (
                              <button
                                onClick={() => handleApproval(p.id, true)}
                                className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl transition-all shadow-xl active:scale-90"
                                title="Grant Access"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            ) : (
                            <button
                                onClick={() => handleApproval(p.id, false)}
                                className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-xl transition-all shadow-xl active:scale-90"
                                title="Revoke Trust"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteProfile(p.id, p.email)}
                              className="p-2.5 bg-white/[0.03] text-slate-700 hover:text-red-500 hover:bg-red-500/10 border border-white/5 rounded-xl transition-all shadow-xl active:scale-90"
                              title="Purge Identity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white/[0.01] rounded-3xl border border-white/5 border-dashed p-32 flex flex-col items-center justify-center shadow-2xl">
                <div className="w-20 h-20 bg-slate-800/40 rounded-full flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-slate-600 animate-pulse" />
                </div>
                <p className="text-slate-500 font-black text-sm uppercase tracking-[0.2em]">No matching nodes identified.</p>
              </div>
            )}
          </div>
        )}

        {/* 감사 로그 탭 역시 고도화된 다크 모드 적용 (생략된 경우에도 동일 기조 적용) */}
        {activeTab === 'logs' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
             <div className="bg-white/[0.02] backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl flex items-center justify-between relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>
                  <h3 className="font-black text-white text-xl uppercase tracking-tighter">System Audit Node Flow</h3>
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-tight ml-10">Real-time telemetry and trajectory tracking of all administrative nodes.</p>
              </div>
              <button 
                onClick={loadAllLogs} 
                className="relative z-10 flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95 border border-white/10 shadow-2xl"
              >
                <Activity className="w-4 h-4" />
                Rescan System
              </button>
            </div>
            
            {logsLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-xs font-black text-slate-600 uppercase tracking-widest animate-pulse">Syncing Audit Stream...</p>
              </div>
            ) : allLogs.length > 0 ? (
              <div className="relative space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-indigo-500/50 before:via-purple-500/20 before:to-transparent">
                {allLogs.map((log, idx) => (
                  <div 
                    key={log.id} 
                    className="relative pl-12 group animate-in fade-in slide-in-from-left-4" 
                     
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{ 
                      '--delay': `${idx * 0.05}s`,
                       
                    } as React.CSSProperties}
                  >
                    {/* Node Dot with Pulse */}
                    <div className={`absolute left-0 top-1 w-10 h-10 rounded-2xl border flex items-center justify-center shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 ${
                      log.action_type.includes('PROPOSAL') ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                      log.action_type.includes('LEAD') ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                      'bg-slate-800 border-white/10 text-slate-500'
                    }`}>
                      {log.action_type.includes('PROPOSAL') ? <FileText className="w-5 h-5" /> : 
                       log.action_type.includes('LEAD') ? <Users className="w-5 h-5" /> : 
                       <Activity className="w-5 h-5" />}
                    </div>

                    <div className="bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-md border border-white/5 p-6 rounded-3xl transition-all duration-500 group-hover:border-indigo-500/20 shadow-xl group-hover:shadow-indigo-500/5 translate-x-0 group-hover:translate-x-2">
                       <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-xs font-black text-slate-500">
                               {(log.user_email || 'U')[0].toUpperCase()}
                             </div>
                             <div>
                                <p className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">{log.user_email}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                                      log.action_type.includes('PROPOSAL') ? 'bg-purple-500/20 text-purple-400' :
                                      log.action_type.includes('LEAD') ? 'bg-indigo-500/20 text-indigo-400' :
                                      'bg-slate-800 text-slate-500'
                                   }`}>
                                      {log.action_type}
                                   </span>
                                   <span className="text-xs text-slate-600 font-bold uppercase tracking-tighter flex items-center gap-1">
                                      <Calendar className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}
                                   </span>
                                </div>
                             </div>
                          </div>
                          
                          {log.details?.client_context && (
                             <div className="group/meta relative">
                                <AlertCircle className="w-4 h-4 text-slate-700 cursor-help hover:text-slate-400 transition-colors" />
                                <div className="absolute right-0 top-full mt-2 w-48 p-3 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl opacity-0 group-hover/meta:opacity-100 transition-opacity z-30 pointer-events-none">
                                   <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Node Metadata</p>
                                   <p className="text-xs text-slate-400 break-all leading-relaxed">{log.details.client_context.userAgent}</p>
                                </div>
                             </div>
                          )}
                       </div>
                       
                       <div className="pl-11">
                          <p className="text-sm text-slate-300 font-medium leading-relaxed">
                            {log.details?.message || `${log.action_type} 작업이 수행되었습니다.`}
                          </p>
                          {log.entity_id && (
                             <div className="mt-3 flex items-center gap-2">
                                <div className="px-2 py-1 bg-black/40 border border-white/5 rounded-lg text-xs text-slate-600 font-bold font-mono">
                                   ENTITY_ID: {log.entity_id}
                                </div>
                             </div>
                          )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.01] rounded-3xl border border-white/5 border-dashed p-32 flex flex-col items-center justify-center text-slate-600">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">No audit particles detected.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            {/* API Key Vault - 설정 관리 센터 */}
            <div className="bg-white/[0.02] backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <Settings className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="font-black text-white text-xl uppercase tracking-tighter">API KEY VAULT (설정 관리 센터)</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tight ml-10">
                    공공데이터 API 통신을 위한 엔드포인트 커스텀 키 등록, 수정, 삭제 및 실시간 연결 유효성을 검증합니다.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingConfig(null);
                    setShowConfigModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.1em] transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-4 h-4" />
                  새 API 키 추가
                </button>
              </div>

              {/* API 키 목록 */}
              <div className="relative z-10 overflow-x-auto rounded-2xl border border-white/5 bg-[#0D0D0D]/60 backdrop-blur-md">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="p-4">API 이름</th>
                      <th className="p-4">연동 엔드포인트</th>
                      <th className="p-4">API KEY</th>
                      <th className="p-4">시군/세부조건</th>
                      <th className="p-4">상태</th>
                      <th className="p-4 text-right">관리 / 검증</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                    {apiConfigs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
                          등록된 API 키 설정이 없습니다. 신규 설정을 추가해주세요.
                        </td>
                      </tr>
                    ) : (
                      apiConfigs.map((config) => {
                        const isTesting = testingId === config.id;
                        const result = testResults[config.id];
                        
                        return (
                          <tr key={config.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 font-black text-white">{config.name}</td>
                            <td className="p-4 font-mono text-slate-400 uppercase">{config.type}</td>
                            <td className="p-4 font-mono text-slate-500">
                              {config.apiKey ? `${config.apiKey.slice(0, 6)}****************${config.apiKey.slice(-4)}` : '-'}
                            </td>
                            <td className="p-4">{config.sigunNm || '-'}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                                config.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'
                              }`}>
                                {config.isActive ? '사용중' : '중지'}
                              </span>
                            </td>
                            <td className="p-4 text-right flex items-center justify-end gap-2">
                              {/* 연결 테스트 결과 표시 */}
                              {result && (
                                <span className={`text-xs font-bold mr-2 ${
                                  result.success ? 'text-emerald-400 animate-pulse' : 'text-rose-400'
                                }`}>
                                  {result.success ? `SUCCESS (${result.duration}ms)` : `ERROR: ${result.error}`}
                                </span>
                              )}
                              
                              <button
                                onClick={() => handleTestConnection(config.id, config.type, config.apiKey, config.sigunNm)}
                                disabled={isTesting}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
                                  isTesting ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed' : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                                }`}
                              >
                                {isTesting ? '확인 중...' : '연결 확인'}
                              </button>
                              
                              <button
                                onClick={() => {
                                  setEditingConfig(config);
                                  setShowConfigModal(true);
                                }}
                                className="p-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-colors"
                                title="수정"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={() => handleDeleteConfig(config.id)}
                                className="p-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-rose-400 hover:text-rose-300 transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 리드 스코어링 가중치 설정 */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl p-8 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">리드 스코어링 가중치</h3>
                  <p className="text-sm text-gray-400">조직별 리드 점수 산출 기준을 조정합니다. 저장된 값은 다음 데이터 동기화부터 적용됩니다.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">조직 선택</label>
                  <select
                    value={selectedScoreOrg}
                    onChange={async (e) => {
                      const orgId = e.target.value;
                      setSelectedScoreOrg(orgId);
                      await loadScoringConfig(orgId);
                    }}
                    className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-100 text-sm focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="">스코어링 설정을 적용할 조직을 선택하세요</option>
                    {orgs.map((org: any) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>

                {selectedScoreOrg && scoreConfig && (
                  <div className="space-y-5 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-300">역세권 거리</span>
                          <span className="text-sm font-bold text-amber-400">{scoreConfig.distance.max}점</span>
                        </div>
                        <input
                          type="range" min={0} max={60} step={5}
                          value={scoreConfig.distance.max}
                          onChange={(e) => updateScoreField('distance', 'max', Number(e.target.value))}
                          className="w-full accent-amber-400"
                        />
                        <p className="mt-2 text-xs text-gray-500">강남역·역세권 300m 이내 리드의 만점 배점</p>
                      </div>

                      <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-300">업종 가중치</span>
                          <span className="text-sm font-bold text-amber-400">{scoreConfig.category.max}점</span>
                        </div>
                        <input
                          type="range" min={0} max={60} step={5}
                          value={scoreConfig.category.max}
                          onChange={(e) => updateScoreField('category', 'max', Number(e.target.value))}
                          className="w-full accent-amber-400"
                        />
                        <p className="mt-2 text-xs text-gray-500">의원(HEALTH) 업종 리드의 만점 배점</p>
                      </div>

                      <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-300">데이터 완전성</span>
                          <span className="text-sm font-bold text-amber-400">{scoreConfig.completeness.max}점</span>
                        </div>
                        <input
                          type="range" min={0} max={60} step={5}
                          value={scoreConfig.completeness.max}
                          onChange={(e) => updateScoreField('completeness', 'max', Number(e.target.value))}
                          className="w-full accent-amber-400"
                        />
                        <p className="mt-2 text-xs text-gray-500">전화번호·주소·업체명 정보 충실도 만점 배점</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <button
                        onClick={saveScoringConfig}
                        disabled={savingScoreConfig}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        {savingScoreConfig ? '저장 중...' : '가중치 저장'}
                      </button>
                      <p className="text-xs text-gray-500">상세 세부 배점은 저장 시 자동으로 비율 스케일링됩니다.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sync cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 서울열린광장 의원 데이터 */}
              <SyncCard 
                sectorKey="seoul-clinic"
                id="sync-seoul-clinic-btn"
                title="서울열린광장 의원 데이터"
                subtitle="Seoul Open Data Integration"
                description="서울 열린데이터 광장(Seoul Open Data) API를 통해 서울시 관내 의원급 의료기관 정보를 실시간 동기화합니다. GRS80/TM 중부원점 좌표계를 WGS84 위경도로 자동 변환하고 인근 역사 도면과 매칭합니다."
                icon={Activity}
                colorName="cyan"
                features={["서울시 25개 자치구 전체 데이터 연계", "GRS80/TM 중부원점 좌표계 자동 변환", "업종 자동 분류 및 역세권 리드 생성 (HEALTH)"]}
                apiPath="/api/seoul-clinics"
                syncingSector={syncingSector}
                onSync={handleSync}
              />

              <SyncCard 
                sectorKey="academy"
                id="sync-gg-btn"
                title="경기도 학원 데이터"
                subtitle="External Integration"
                description="경기도 데이터 드림(Gyeonggi Data Dream) API를 통해 도내 학원 및 교습소 정보를 실시간으로 동기화합니다. 좌표를 기반으로 가장 가까운 지하철역을 자동으로 매칭하여 리드 데이터로 변환합니다."
                icon={Building}
                colorName="emerald"
                features={["경기도 내 31개 시/군 전역 데이터", "WGS84 좌표 기반 역세권 자동 분석", "업종 자동 분류 (EDUCATION)"]}
                apiPath="/api/gg-data"
                syncingSector={syncingSector}
                onSync={handleSync}
              />

              <SyncCard 
                sectorKey="clinic"
                id="sync-gg-clinic-btn"
                title="경기도 의원 데이터"
                subtitle="Healthcare Integration"
                description="경기도 의원 인허가 상세 현황 API를 통해 도내 의료 시설 정보를 동기화합니다. 진료 과목 정보를 포함하여 마케팅 타겟팅에 활용 가능한 리드로 변환합니다."
                icon={Activity}
                colorName="indigo"
                features={["도내 의원급 의료기관 전체 데이터", "진료 과목(피부과, 내과 등) 상세 분석", "업종 자동 분류 (HEALTH)"]}
                apiPath="/api/gg-clinics"
                syncingSector={syncingSector}
                onSync={handleSync}
              />

              <SyncCard 
                sectorKey="hospital"
                id="sync-gg-hospital-btn"
                title="경기도 병원 데이터"
                subtitle="Healthcare Expansion"
                description="경기도 병원 상세 현황 API를 통해 도내 중대형 의료 시설 정보를 동기화합니다. 요양병원, 종합병원 등을 포함한 상세 시설 정보를 수집합니다."
                icon={Shield}
                colorName="rose"
                features={["도내 병원/종합병원/요양병원 전체", "시설 규모 및 병상 수 정보 연동 예정", "업종 자동 분류 (HEALTH)"]}
                apiPath="/api/gg-hospitals"
                syncingSector={syncingSector}
                onSync={handleSync}
              />

              <SyncCard 
                sectorKey="univ"
                id="sync-gg-univ-btn"
                title="대학교 데이터"
                subtitle="Education Network"
                description="경기데이터드림 및 공공데이터포털 API를 통해 전국 대학교 및 대학원 정보를 동기화합니다. 학교 홈페이지 및 연락처 정보를 포함하여 캠퍼스 광고 영업용 리드로 활용합니다."
                icon={GraduationCap}
                colorName="amber"
                features={["대학교, 전문대학, 대학원 통합 데이터", "홈페이지 및 대표 연락처 정보 검색 최적화", "캠퍼스별 위치 정보 및 역세권 분석"]}
                apiPath="/api/gg-univ"
                syncingSector={syncingSector}
                onSync={handleSync}
              />

              <SyncCard 
                sectorKey="restaurant"
                id="sync-gg-rest-btn"
                title="경기도 음식점 데이터"
                subtitle="Food & Beverage"
                description="경기데이터드림 일반음식점 현황 API(GENRESTRT)를 통해 지역 내 식음료 업장 정보를 동기화합니다. 업종별 영업 상태를 실시간으로 파악하여 영업 리드로 전환합니다."
                icon={Utensils}
                colorName="orange"
                features={["도내 일반음식점 인허가 데이터", "영업/폐업 상태 실시간 업데이트 반영", "업종 자동 분류 (FOOD)"]}
                apiPath="/api/gg-restaurants"
                syncingSector={syncingSector}
                onSync={handleSync}
              />

              <SyncCard 
                sectorKey="food-trucks"
                id="sync-gg-food-truck-btn"
                title="경기도 푸드트럭 데이터"
                subtitle="Mobile Dining"
                description="경기데이터드림 식품접객업(푸드트럭) 현황 API(Resrestrtfodtuck)를 통해 이동식 음식 판매 업장 정보를 동기화합니다."
                icon={Truck}
                colorName="lime"
                features={["이동식 음식 판매업(푸드트럭) 인허가 데이터", "영업 상태 실시간 반영", "업종 자동 분류 (FOOD)"]}
                apiPath="/api/gg-food-trucks"
                syncingSector={syncingSector}
                onSync={handleSync}
              />

              <SyncCard 
                sectorKey="coffee-shops"
                id="sync-gg-coffee-shop-btn"
                title="경기도 커피숍 데이터"
                subtitle="Coffee Culture"
                description="경기데이터드림 식품접객업(커피숍) 현황 API(RESRESTRT)를 통해 도내 커피숍 업장 정보를 동기화합니다."
                icon={Coffee}
                colorName="teal"
                features={["커피숍 인허가 데이터", "업종명 기준 업소 식별", "업종 자동 분류 (FOOD)"]}
                apiPath="/api/gg-coffee-shops"
                syncingSector={syncingSector}
                onSync={handleSync}
              />

              <SyncCard 
                sectorKey="jncl"
                id="sync-gg-jncl-univ-btn"
                title="전문 및 대학교 현황"
                subtitle="Academic Status"
                description="경기도 내 전문대학 및 대학교의 최신 인허가 및 영업 현황 정보를 동기화합니다. 신규 개설 학교 및 캠퍼스 정보를 실시간으로 관리합니다."
                icon={GraduationCap}
                colorName="cyan"
                features={["전문대학, 대학교, 각종학교 통합 현황", "인허가 기반 최신 영업 상태 및 위치 정보", "교육 서비스 리드 자동 생성 (EDUCATION)"]}
                apiPath="/api/gg-jncl-univ"
                syncingSector={syncingSector}
                onSync={handleSync}
              />

              {/* 추가 데이터 관리 카드 (플레이스홀더) */}
              <div className="bg-white/[0.01] backdrop-blur-xl p-8 rounded-3xl border border-white/5 border-dashed flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-16 h-16 bg-slate-800/40 rounded-full flex items-center justify-center mb-4">
                  <Activity className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="font-black text-slate-500 text-lg uppercase tracking-tighter">준비 중인 데이터 소스</h3>
                <p className="text-xs text-slate-600 mt-2">추가적인 공공데이터 소스 통합이 예정되어 있습니다.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Key Vault 설정 모달 */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[90] p-4 animate-in fade-in duration-200">
          <div className="bg-[#0D0D0D]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-float">
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  {editingConfig ? 'API 설정 정보 수정' : '신규 API 설정 등록'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-tight">공공데이터 통신 노드 추가 및 매개변수 바인딩</p>
              </div>
              <button 
                onClick={() => {
                  setShowConfigModal(false);
                  setEditingConfig(null);
                }} 
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                aria-label="모달 닫기"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <form onSubmit={handleSaveConfig}>
              <div className="p-6 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest block">API 설정 이름 *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="예: 서울시 의원 인허가 API"
                    defaultValue={editingConfig?.name || ''}
                    className="w-full bg-[#151515] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-colors font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest block">API 연동 유형 *</label>
                  <select
                    name="type"
                    required
                    defaultValue={editingConfig?.type || 'seoul-clinic'}
                    className="w-full bg-[#151515] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-colors font-medium"
                  >
                    <option value="seoul-clinic">서울시 의원 인허가 정보 (LOCALDATA_010102)</option>
                    <option value="seoul-hospital">서울시 병원 인허가 정보 (LOCALDATA_010101)</option>
                    <option value="gg-clinic">경기도 의원 상세 현황 (AsembyStus)</option>
                    <option value="gg-hospital">경기도 병원 상세 현황 (GgMedctnstus)</option>
                    <option value="gg-academy">경기도 학원/교습소 현황 (GenmstClassStus)</option>
                    <option value="gg-restaurant">경기도 일반음식점 현황 (GENRESTRT)</option>
                    <option value="gg-food-trucks">경기도 푸드트럭 현황 (Resrestrtfodtuck)</option>
                    <option value="gg-coffee-shops">경기도 커피숍 현황 (RESRESTRT)</option>
                    <option value="gg-jncl-univ">경기도 전문대학 현황 (GgJnclUnivStus)</option>
                    <option value="gg-univ">경기도 대학교 현황 (GgUnivStus)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest block">공공데이터 API KEY *</label>
                  <input
                    type="text"
                    name="apiKey"
                    required
                    placeholder="인증 키를 정확하게 입력해주세요."
                    defaultValue={editingConfig?.apiKey || ''}
                    className="w-full bg-[#151515] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-colors font-mono font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest block">시군명 (경기도 전용 / 선택)</label>
                  <input
                    type="text"
                    name="sigunNm"
                    placeholder="예: 수원시, 성남시 (미입력 시 전체)"
                    defaultValue={editingConfig?.sigunNm || ''}
                    className="w-full bg-[#151515] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-colors font-medium"
                  />
                  <p className="text-xs text-slate-500 mt-1">※ 서울시 데이터에는 적용되지 않습니다.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-400 uppercase tracking-widest block">활성화 여부 *</label>
                  <select
                    name="isActive"
                    required
                    defaultValue={editingConfig?.isActive ? 'true' : 'false'}
                    className="w-full bg-[#151515] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-colors font-medium"
                  >
                    <option value="true">활성화 (ACTIVE)</option>
                    <option value="false">비활성화 (INACTIVE)</option>
                  </select>
                </div>
              </div>
              <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowConfigModal(false);
                    setEditingConfig(null);
                  }} 
                  className="flex-1 py-3 border border-white/10 rounded-xl font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl uppercase tracking-wider transition-colors shadow-lg shadow-indigo-500/20"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 조직 생성 모달 */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600" />
                  조직 생성
                </h3>
                <p className="text-sm text-slate-500 mt-1">새 소속 조직을 만들면 즉시 목록에 추가됩니다.</p>
              </div>
              <button onClick={() => setShowCreateOrgModal(false)} className="text-slate-400 hover:text-slate-600" aria-label="모달 닫기">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <form onSubmit={handleCreateOrg}>
              <div className="p-6 space-y-4 text-sm">
                <div className="space-y-1.5">
                  <label className="font-semibold block text-slate-700">조직 이름</label>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="예: 강남지점 영업팀"
                    maxLength={50}
                    className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button type="button" onClick={() => setShowCreateOrgModal(false)} className="flex-1 py-2 border rounded-xl font-medium hover:bg-slate-100 transition-colors">취소</button>
                <button type="submit" disabled={creatingOrg || !newOrgName.trim()} className="flex-1 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  {creatingOrg ? '생성 중...' : '조직 생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 조직 및 역할 관리 모달 (기존과 동일) */}
      {showOrgModal && selectedProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* 모달 폼 생략 방지를 위해 축소/이식 */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" />
                  조직 및 역할 할당
                </h3>
                <p className="text-sm text-slate-500 mt-1">{selectedProfile.email}</p>
              </div>
              <button onClick={() => setShowOrgModal(false)} className="text-slate-400 hover:text-slate-600" aria-label="모달 닫기">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleOrgUpdate(selectedProfile.id, formData.get('orgId') as string || null, formData.get('role') as any);
            }}>
              <div className="p-6 space-y-4 text-sm">
                <div className="space-y-1.5">
                  <label className="font-semibold block text-slate-700">소속 조직</label>
                  <select name="orgId" aria-label="소속 조직 선택" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" defaultValue={selectedProfile.membership?.organizationId || ''}>
                    <option value="">소속 없음</option>
                    {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold block text-slate-700">역할 (Role)</label>
                  <select name="role" aria-label="역할 선택" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" defaultValue={selectedProfile.membership?.role || 'member'}>
                    <option value="member">일반 멤버 (Member)</option>
                    <option value="admin">관리자 (Admin)</option>
                    <option value="owner">소유자 (Owner)</option>
                  </select>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button type="button" onClick={() => setShowOrgModal(false)} className="flex-1 py-2 border rounded-xl font-medium hover:bg-slate-100 transition-colors">취소</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">저장하기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 개별 사용자 로그 상세 모달 */}
      {showUserLogsModal && selectedProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                  {(selectedProfile.fullName || selectedProfile.email)[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedProfile.fullName || '이름 없음'} 님의 활동 타임라인</h3>
                  <p className="text-sm text-slate-500">{selectedProfile.email}</p>
                </div>
              </div>
              <button onClick={() => setShowUserLogsModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors" aria-label="모달 닫기">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-6 max-h-[500px] overflow-y-auto">
              {userLogsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="text-sm text-slate-500">활동 기록을 불러오는 중...</p>
                </div>
              ) : selectedUserLogs.length > 0 ? (
                <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
                  {selectedUserLogs.map((log) => (
                    <div key={log.id} className="relative">
                      {/* 타임라인 원형 마커 */}
                      <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white ${
                        log.action_type === 'DOWNLOAD' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}></span>
                      
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            log.action_type === 'DOWNLOAD' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {log.action_type === 'DOWNLOAD' ? <Download className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            {log.action_type}
                          </span>
                          <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3"/>
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">
                          <strong className="font-semibold text-slate-900">&quot;{log.proposals?.title || '알 수 없는 문서'}&quot;</strong> 제안서를 확인했습니다.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <History className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">조회된 시스템 관련 행동 로그가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 실시간 플로팅 토스트 알림 (NEW - Antigravity Style) */}
      {toastNotification && (
        <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-right-10 fade-in duration-500">
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 animate-pulse"></div>
            <div className="relative bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl shadow-2xl flex items-center gap-5 min-w-[320px] animate-float">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-emerald-400 animate-bounce" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">New Deployment</span>
                  <button 
                    onClick={() => setToastNotification(null)} 
                    className="text-slate-600 hover:text-white transition-colors"
                    title="알림 닫기"
                    aria-label="알림 닫기"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h5 className="text-sm font-black text-white tracking-tight">신규 회원가입 발생</h5>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                  <span className="text-emerald-300 font-bold">{toastNotification.user_email}</span> 님이 시스템에 새롭게 합류했습니다.
                </p>
              </div>
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-emerald-500/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 animate-[shimmer_8s_linear_forwards] origin-left" 
                   
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={{  
                  '--shimmer-fallback': 'left' } as React.CSSProperties}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Style for animations */}
      <style jsx global>{`
        @keyframes shimmer {
          from { width: 100%; }
          to { width: 0%; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
