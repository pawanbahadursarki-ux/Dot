import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { 
  Play, Pause, RotateCcw, Video, Wallet, ArrowRight, Check,
  Sparkles, Camera, FlipHorizontal, ThumbsUp, ThumbsDown, 
  Smile, Lightbulb, ShieldCheck, ChevronRight, ChevronLeft, Download, 
  ExternalLink, Phone, Search, Star, Globe, RefreshCw, X, AlertCircle,
  UserPlus, LogOut, Smartphone, Mail, Lock, Eye, EyeOff, KeyRound,
  LogIn, CheckCircle2, MapPin, Building2, User,
  Volume2, VolumeX, Languages, Image as ImageIcon,
  PhoneCall, Sun, Grid, Bot, MessageSquare, Mic, MicOff, Send, Loader2, Volume1, Upload, Square,
  Trophy, Award, Folder, ChevronDown, Palette, Wand2, Sliders, Zap, ZapOff, Music, Disc, Cpu, Battery, Radio,
  Shield, FileText, CheckSquare, Timer, Clock, Gift, Maximize2, BarChart3, Home, Bell
} from 'lucide-react';
import { triggerConfetti } from '../utils/confettiEffect';
import { PhoneProduct, ProductCategory, FeedbackItem, UserProfile, WithdrawalTransaction, Gateway, RegisteredUser, MobileQuestion, SubscriptionTier } from '../types';
import { PHONES, QUESTIONS, PRODUCT_CATEGORIES, GATEWAYS, phoneById, rs, getPhoneCapabilities, PhoneCapabilities } from '../data/initialData';
import { auth, formatFirestoreErrorMessage } from '../firebase';
import { requestRealWithdrawalBatch } from '../services/firebaseService';
import { INTERVIEW_SCRIPTS_20, getPhoneSpecificQuestions, get10CoreMobileQuestions, AI_VOICE_TONES, AiVoiceToneOption, formatSalutationGreeting } from '../data/interviewQuestions';
import { PHONE_BRANDS, getPhoneBrandFolderId, getPhoneGenerationGroup } from '../data/allPhones';
import { LoginScreen } from './LoginScreen';

const PhoneSelectorModal = lazy(() =>
  import('./PhoneSelectorModal').then((m) => ({ default: m.PhoneSelectorModal }))
);
const UserLeaderboard = lazy(() =>
  import('./UserLeaderboard').then((m) => ({ default: m.UserLeaderboard }))
);
const TikTokCameraStudio = lazy(() =>
  import('./TikTokCameraStudio').then((m) => ({ default: m.TikTokCameraStudio }))
);
const UserProfileComponent = lazy(() =>
  import('./UserProfile').then((m) => ({ default: m.UserProfileComponent }))
);

interface ConsumerViewProps {
  user: UserProfile;
  onUpdateUser: (user: Partial<UserProfile>) => void;
  onAddReview: (review: FeedbackItem) => Promise<FeedbackItem | void> | void;
  onAddWithdrawal: (tx: WithdrawalTransaction) => void;
  transactions?: WithdrawalTransaction[];
  myVideosList?: FeedbackItem[];
  feedbackList?: FeedbackItem[];
  deviceFrameMode: boolean;
  onOpenGoogleAuth: (mode?: 'login' | 'register' | 'profile') => void;
  onOpenVideoModal: (review: FeedbackItem, initialTab?: 'summary' | 'transcript' | 'ai_summary') => void;
  textSize: string;
  onCycleTextSize: () => void;
  initialScreen?: string;
  onLogout?: () => void;
  registeredUsers?: RegisteredUser[];
  onAuthenticated?: (profile: UserProfile, preferredDestination?: 'customer' | 'company') => void;
  onOpenProfile?: () => void;
  activePlan?: SubscriptionTier;
  reviewsQuotaUsed?: number;
  onOpenSubscriptionModal?: (targetBrand?: string) => void;
  currentScreen?: string;
  onNavigateScreen?: (screen: string) => void;
  onNavigateView?: (view: 'customer' | 'company' | 'login' | 'admin' | 'dual') => void;
  onToggleLarge?: () => void;
}

export const ConsumerView: React.FC<ConsumerViewProps> = ({
  user,
  onUpdateUser,
  onAddReview,
  onAddWithdrawal,
  transactions = [],
  myVideosList = [],
  feedbackList = [],
  deviceFrameMode,
  onOpenGoogleAuth,
  onOpenVideoModal,
  textSize,
  onCycleTextSize,
  initialScreen = 'welcome',
  onLogout,
  registeredUsers = [],
  onAuthenticated,
  onOpenProfile,
  activePlan,
  reviewsQuotaUsed = 0,
  onOpenSubscriptionModal,
  currentScreen,
  onNavigateScreen,
  onNavigateView,
  onToggleLarge,
}) => {
  const [internalScreen, setInternalScreen] = useState<string>(initialScreen);
  const screen = currentScreen !== undefined ? currentScreen : internalScreen;
  const setScreen = (s: string) => {
    setInternalScreen(s);
    if (onNavigateScreen) onNavigateScreen(s);
  };
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('a55');
  const [draftReview, setDraftReview] = useState<any>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [campaignSubmitNotice, setCampaignSubmitNotice] = useState<string | null>(null);
  const [expandedVideoQaId, setExpandedVideoQaId] = useState<string | null>(null);

  const walletHistory = useMemo(() => {
    const earnedItems = myVideosList.map((v) => {
      const p = phoneById(v.phone);
      const isApproved = v.moderationStatus === 'approved' || v.payoutStatus === 'credited';
      const isRejected = v.moderationStatus === 'rejected' || v.payoutStatus === 'rejected';
      const statusLabel = isApproved
        ? 'Approved & Credited'
        : isRejected
        ? 'Rejected (Not Credited)'
        : 'Pending Admin Approval';
      return {
        title: `Video · ${p.name}`,
        when: `${v.time || 'Recent'} · ${statusLabel}`,
        amt: isRejected ? 0 : v.rewardAmount ?? p.reward ?? 150,
        kind: isApproved ? ('credited' as const) : isRejected ? ('rejected' as const) : ('pending_credit' as const),
        ts: new Date(v.createdAt || 0).getTime(),
      };
    });
    const withdrawalItems = transactions.map((tx) => ({
      title: `${tx.title} (${tx.status})`,
      when: tx.transferReference ? `${tx.when} · Ref: ${tx.transferReference}` : tx.when,
      amt: -Math.abs(tx.amount),
      kind: 'withdrawal' as const,
      ts: Date.now() - 1000,
    }));
    return [...withdrawalItems, ...earnedItems];
  }, [myVideosList, transactions]);

  const [selectedBrandFolder, setSelectedBrandFolder] = useState<string>('samsung');

  // Consumer Real-Time Notification System (own moderation/payout/company-fix + community/brand submissions)
  interface ConsumerNotificationItem {
    id: string;
    title: string;
    message: string;
    category: 'submission' | 'approval' | 'company_fix' | 'brand_activity' | 'payout';
    timestamp: number;
    read: boolean;
    targetScreen?: 'myvideos' | 'wallet' | 'home';
  }

  const [consumerAlerts, setConsumerAlerts] = useState<ConsumerNotificationItem[]>([]);
  const [activeConsumerToast, setActiveConsumerToast] = useState<ConsumerNotificationItem | null>(null);
  const [showConsumerNotifDrawer, setShowConsumerNotifDrawer] = useState<boolean>(false);

  const consumerMountTimeRef = useRef<number>(Date.now());
  const prevMyStatusMapRef = useRef<Map<string, string>>(
    new Map(
      myVideosList.map((v) => [
        v.id,
        `${v.moderationStatus || 'pending'}|${Boolean(v.isBlocked)}|${v.defectStatus || 'open'}`,
      ])
    )
  );
  const prevCommunityIdsRef = useRef<Set<string>>(new Set(feedbackList.map((f) => f.id)));
  const prevTxStatusMapRef = useRef<Map<string, string>>(
    new Map(transactions.map((t) => [t.id, t.status]))
  );

  const pushConsumerNotification = (item: ConsumerNotificationItem, showToastBanner = true) => {
    setConsumerAlerts((prev) => {
      if (prev.some((a) => a.id === item.id)) return prev;
      return [item, ...prev].slice(0, 20);
    });
    if (showToastBanner) {
      setActiveConsumerToast(item);
    }
  };

  // Auto-dismiss active consumer toast after 6.5 seconds
  useEffect(() => {
    if (!activeConsumerToast) return;
    const timer = window.setTimeout(() => {
      setActiveConsumerToast((cur) => (cur?.id === activeConsumerToast.id ? null : cur));
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [activeConsumerToast?.id]);

  // Watch own feedback moderation & company engineering defect updates in real time
  useEffect(() => {
    if (!user?.isLoggedIn) return;
    const prevMap = prevMyStatusMapRef.current;
    const nextMap = new Map<string, string>();
    const now = Date.now();

    myVideosList.forEach((v) => {
      const mod = v.moderationStatus || 'pending';
      const blk = Boolean(v.isBlocked);
      const def = v.defectStatus || 'open';
      const sig = `${mod}|${blk}|${def}`;
      nextMap.set(v.id, sig);

      const oldSig = prevMap.get(v.id);
      if (oldSig && oldSig !== sig) {
        const [oldMod, oldBlk, oldDef] = oldSig.split('|');
        const p = phoneById(v.phone);
        const phoneTitle = v.phoneName || p.name;

        if (oldMod !== mod) {
          if (mod === 'approved') {
            pushConsumerNotification({
              id: `my-appr-${v.id}-${now}`,
              title: 'Review Approved & Reward Credited',
              message: `${phoneTitle} approved! Earned ${rs(v.rewardAmount ?? p.reward ?? 150)} in wallet.`,
              category: 'approval',
              timestamp: now,
              read: false,
              targetScreen: 'wallet',
            });
          } else if (mod === 'rejected') {
            pushConsumerNotification({
              id: `my-rej-${v.id}-${now}`,
              title: blk ? 'Submission Blocked by Admin' : 'Review Needs Update',
              message: `${phoneTitle}: ${v.moderationReason || v.blockReason || 'Did not pass quality verification.'}`,
              category: 'approval',
              timestamp: now,
              read: false,
              targetScreen: 'myvideos',
            });
          }
        } else if (oldDef !== def && def !== 'open') {
          pushConsumerNotification({
            id: `my-fix-${v.id}-${def}-${now}`,
            title: def === 'resolved' ? 'Company Resolved Your Reported Issue' : `Company Update: ${def}`,
            message: `${phoneTitle}${v.defectFixedInVersion ? ` (${v.defectFixedInVersion})` : ''}: ${v.defectResolutionNote || 'Engineering team updated your defect report.'}`,
            category: 'company_fix',
            timestamp: now,
            read: false,
            targetScreen: 'myvideos',
          });
        }
      }
    });

    prevMyStatusMapRef.current = nextMap;
  }, [myVideosList, user?.isLoggedIn]);

  // Watch new consumer feedback uploads across the platform (brand-aware + community notifications)
  useEffect(() => {
    if (!user?.isLoggedIn) {
      prevCommunityIdsRef.current = new Set(feedbackList.map((f) => f.id));
      return;
    }
    const prevIds = prevCommunityIdsRef.current;
    const added = feedbackList.filter((f) => !prevIds.has(f.id));
    prevCommunityIdsRef.current = new Set(feedbackList.map((f) => f.id));

    if (added.length === 0) return;

    const now = Date.now();
    const myEmail = (user.email || '').toLowerCase();
    const myUid = auth.currentUser?.uid || '';
    const myReviewedBrands = new Set(
      myVideosList.map((v) => getPhoneBrandFolderId(phoneById(v.phone)))
    );
    const activeBrandFolder = getPhoneBrandFolderId(phoneById(selectedPhoneId));

    const freshOtherReviews = added.filter((item) => {
      const itemEmail = (item.userEmail || '').toLowerCase();
      const itemUid = (item as { uid?: string }).uid || '';
      if ((myEmail && itemEmail === myEmail) || (myUid && itemUid === myUid)) {
        return false; // Own submission fires its dedicated confirmation toast
      }
      if (prevIds.size === 0) {
        const createdMs = item.createdAt ? new Date(item.createdAt).getTime() : 0;
        const isRecent = createdMs > 0 && now - createdMs < 90_000;
        if (!isRecent && now - consumerMountTimeRef.current <= 2500) return false;
      }
      const itemBrand = getPhoneBrandFolderId(phoneById(item.phone));
      if (selectedBrandFolder === 'all') return true;
      return itemBrand === selectedBrandFolder || itemBrand === activeBrandFolder || myReviewedBrands.has(itemBrand);
    });

    if (freshOtherReviews.length > 0) {
      const newest = freshOtherReviews[0];
      const p = phoneById(newest.phone);
      pushConsumerNotification({
        id: `comm-fb-${newest.id}-${now}`,
        title: `New ${p.brand} Feedback Submitted`,
        message: `${newest.user} shared a review on ${newest.phoneName || p.name}.`,
        category: 'brand_activity',
        timestamp: now,
        read: false,
        targetScreen: 'home',
      });
    }
  }, [feedbackList, user?.isLoggedIn, user?.email, selectedPhoneId, selectedBrandFolder, myVideosList]);

  // Watch withdrawal payout status updates
  useEffect(() => {
    if (!user?.isLoggedIn) return;
    const prevMap = prevTxStatusMapRef.current;
    const nextMap = new Map<string, string>();
    const now = Date.now();

    transactions.forEach((tx) => {
      nextMap.set(tx.id, tx.status);
      const prevStatus = prevMap.get(tx.id);
      if (prevStatus && prevStatus !== tx.status) {
        pushConsumerNotification({
          id: `tx-${tx.id}-${tx.status}-${now}`,
          title: `Cashout ${tx.status}`,
          message: `${tx.title} (${rs(Math.abs(tx.amount))}) is now ${tx.status}.`,
          category: 'payout',
          timestamp: now,
          read: false,
          targetScreen: 'wallet',
        });
      }
    });

    prevTxStatusMapRef.current = nextMap;
  }, [transactions, user?.isLoggedIn]);

  const unreadConsumerAlertsCount = useMemo(
    () => consumerAlerts.filter((a) => !a.read).length,
    [consumerAlerts]
  );

  useEffect(() => {
    if (!user?.isLoggedIn && screen !== 'welcome') {
      setScreen('welcome');
    }
  }, [user?.isLoggedIn, screen]);

  const SCREENS = [
    ['welcome', '01', 'Sign in'],
    ['home', '02', 'Pick your phone'],
    ['detail', '03', 'Phone details'],
    ['record', '04', 'Record 2.5m video'],
    ['review', '05', 'Check & send'],
    ['success', '06', 'Money earned'],
    ['wallet', '07', 'Wallet'],
    ['withdraw', '08', 'Take out money'],
    ['leaderboard', '09', 'Leaderboard'],
    ['myvideos', '10', 'My videos'],
    ['profile', '11', 'Me / settings'],
  ];

  const DARK_SCREENS = ['welcome', 'record', 'success'];
  const NO_TABS = ['welcome', 'record', 'review', 'success', 'withdraw', 'detail'];

  const go = (s: string) => {
    if (s !== 'welcome' && !user?.isLoggedIn) {
      onOpenGoogleAuth('login');
      return;
    }
    setScreen(s);
  };

  const currentPhone = phoneById(selectedPhoneId) || PHONES[0];
  const isDark = DARK_SCREENS.includes(screen);
  const statusBg = screen === 'welcome' 
    ? 'var(--ink)' 
    : screen === 'record' 
      ? '#0E0E10' 
      : screen === 'success' 
        ? 'var(--money)' 
        : 'var(--paper)';

  // Helper topbar
  const TopBar = ({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px 10px', minHeight: 52 }}>
      {onBack && (
        <button className="fp-iconbtn" onClick={onBack} aria-label="Go back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div style={{ flex: 1, fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'calc(20px * var(--fs))', letterSpacing: '-0.01em' }}>
        {title}
      </div>
      {right}
    </div>
  );

  // Star Rating widget
  const StarPicker = ({ value, onChange, size = 38 }: { value: number; onChange?: (val: number) => void; size?: number }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onChange && onChange(s)}
          className={`p-1 transition-transform duration-100 ${onChange ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'}`}
          aria-label={`${s} stars`}
        >
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"
              fill={s <= value ? '#F2A900' : 'none'}
              stroke={s <= value ? '#F2A900' : '#C9C3B8'}
              strokeWidth={s <= value ? '1' : '1.6'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );

  // TabBar - 4 core options: Home, My Videos (or Company for admins), Wallet, and Me
  const TabBar = () => {
    const isCustomerLocked = user?.role !== 'company_admin' && user?.accountMode === 'customer';
    const tabs = [
      { id: 'home', icon: 'home', label: 'Home' },
      isCustomerLocked
        ? { id: 'myvideos', icon: 'videos', label: 'My Videos' }
        : { id: 'company', icon: 'company', label: 'Company' },
      { id: 'wallet', icon: 'wallet', label: 'Wallet' },
      { id: 'profile', icon: 'user', label: 'Me' },
    ];
    const active = screen === 'detail' ? 'home' : screen === 'withdraw' ? 'wallet' : screen;

    return (
      <div style={{ display: 'flex', borderTop: '1px solid var(--line)', background: '#fff', padding: '6px 6px 4px' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === 'company') {
                if (onNavigateView) {
                  onNavigateView('company');
                } else {
                  go('home');
                }
              } else {
                go(t.id);
              }
            }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 0',
              minHeight: 56,
              cursor: 'pointer',
              color: active === t.id ? 'var(--ink)' : 'var(--ink3)',
              transition: 'all 0.15s ease',
            }}
            title={t.id === 'company' ? 'Company Analysis & Business Portal' : t.label}
          >
            <span
              style={{
                padding: '4px 14px',
                borderRadius: 99,
                background: active === t.id ? 'var(--paper2)' : 'transparent',
              }}
            >
              {t.icon === 'home' && (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active === t.id ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" />
                </svg>
              )}
              {t.icon === 'videos' && (
                <Video className="w-[22px] h-[22px]" strokeWidth={active === t.id ? 2.5 : 2} />
              )}
              {t.icon === 'company' && (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active === t.id ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                  <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                  <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                  <path d="M10 6h4" />
                  <path d="M10 10h4" />
                  <path d="M10 14h4" />
                  <path d="M10 18h4" />
                </svg>
              )}
              {t.icon === 'wallet' && (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active === t.id ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18" /><circle cx="16.5" cy="15" r="1.4" fill="currentColor" />
                </svg>
              )}
              {t.icon === 'user' && (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active === t.id ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5" />
                </svg>
              )}
            </span>
            <span style={{ fontSize: 'calc(13px * var(--fs))', fontWeight: 700 }}>{t.label}</span>
          </button>
        ))}
      </div>
    );
  };

  /* =========================================================================
   * SCREEN 1 USES FIREBASE GOOGLE AUTHENTICATION VIA <LoginScreen />
   * ========================================================================= */

  /* =========================================================================
   * SCREEN 2: HOME (PICK YOUR PHONE)
   * ========================================================================= */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<string>('all');
  const [homeViewMode, setHomeViewMode] = useState<'grid' | 'folders'>('grid');
  const [openHomeFolders, setOpenHomeFolders] = useState<Record<string, boolean>>({
    apple: true,
    samsung: false,
    vivo: false,
    oppo: false,
    google: false,
    oneplus: false,
    xiaomi: false,
  });
  const [questionFilter, setQuestionFilter] = useState<'all' | 'camera_display' | 'battery_performance' | 'hardware_build' | 'software_ecosystem' | 'value_service'>('all');

  const filteredPhones = useMemo(() => {
    return PHONES.filter((p) => {
      let matchesBrand = true;
      if (selectedBrandFolder !== 'all') {
        const folderId = getPhoneBrandFolderId(p);
        matchesBrand = folderId === selectedBrandFolder;
      }
      
      let matchesEra = true;
      if (selectedEra !== 'all') {
        matchesEra = getPhoneGenerationGroup(p) === selectedEra;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (p.brand + ' ' + p.name + ' ' + p.spec + ' ' + (p.description || '')).toLowerCase().includes(q);

      return matchesBrand && matchesEra && matchesSearch;
    });
  }, [selectedBrandFolder, selectedEra, searchQuery]);

  // Grouped phones by brand folder for Home Folder Accordion View
  const homePhonesByFolder = useMemo(() => {
    const map: Record<string, PhoneProduct[]> = {};
    PHONE_BRANDS.filter(b => b.id !== 'all').forEach(b => {
      map[b.id] = [];
    });
    PHONES.forEach((p) => {
      const fid = getPhoneBrandFolderId(p);
      if (map[fid]) {
        map[fid].push(p);
      } else if (map['gaming']) {
        map['gaming'].push(p);
      }
    });
    return map;
  }, []);

  const renderHome = () => (
    <div className="fp-screen fp-scroll">
      <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div className="min-w-0">
          <div style={{ color: 'var(--ink2)', fontSize: 'calc(15px * var(--fs))' }}>Namaste,</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'calc(26px * var(--fs))', letterSpacing: '-0.02em' }}>
            {(user?.name || 'Reviewer').split(' ')[0]} 👋
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              setShowConsumerNotifDrawer((prev) => !prev);
              setConsumerAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
            }}
            aria-label="Open notifications"
            className="relative w-10 h-10 rounded-full bg-white border border-neutral-200 hover:border-neutral-300 flex items-center justify-center text-neutral-800 shadow-xs cursor-pointer transition-colors"
            title="Live Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadConsumerAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-mono tabular-nums font-bold text-[10px] flex items-center justify-center">
                {unreadConsumerAlertsCount}
              </span>
            )}
          </button>
          <button onClick={() => go('wallet')} className="fp-pill" style={{ background: 'var(--moneyTint)', color: 'var(--money)' }}>
            <Wallet className="w-5 h-5" />
            <span>{rs(user?.walletBalance ?? 0)}</span>
          </button>
        </div>
      </div>

      {/* 3 Steps Banner */}
      <div style={{ margin: '16px 20px 0', padding: 18, borderRadius: 24, background: 'var(--ink)', color: '#fff' }}>
        <div style={{ fontSize: 'calc(14px * var(--fs))', color: 'rgba(255,255,255,.6)', marginBottom: 12, fontWeight: 600 }}>
          How it works (Super simple)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            ['1', 'Pick phone', '#fff', 'var(--ink)'],
            ['2', 'Record 1 min', 'var(--rec)', '#fff'],
            ['3', 'Get cash', 'var(--money)', '#fff'],
          ].map(([num, txt, bg, col]) => (
            <div key={num} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 99, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 'calc(16px * var(--fs))', background: bg, color: col }}>
                {num}
              </div>
              <div style={{ fontSize: 'calc(15px * var(--fs))', lineHeight: 1.2, fontWeight: 700 }}>{txt}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Phone Selection Header with Search Bar and Mobile Model Brand Selection */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'calc(22px * var(--fs))', letterSpacing: '-0.02em' }}>
          Which phone do you own?
        </div>
        <div style={{ color: 'var(--ink2)', fontSize: 'calc(14.5px * var(--fs))', marginTop: 2, marginBottom: 12 }}>
          Tap your phone model to start feedback
        </div>

        {/* Search Bar */}
        <label className="fp-search" style={{ marginBottom: 10 }}>
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Galaxy S25 Ultra, iPhone 16, Redmi, Vivo..."
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-neutral-400 hover:text-neutral-700">Clear</button>
          )}
        </label>

        {/* Mobile Model Selection Options / Brand Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 -mx-1 px-1 scrollbar-none">
          {[
            { id: 'all', label: '📱 All Brands', count: 129 },
            { id: 'samsung', label: '🌌 Samsung Galaxy', count: 24 },
            { id: 'apple', label: '🍏 Apple iPhone', count: 30 },
            { id: 'xiaomi', label: '🟠 Xiaomi / Redmi', count: 11 },
            { id: 'vivo', label: '📸 Vivo & iQOO', count: 15 },
            { id: 'google', label: '🔍 Google Pixel', count: 15 },
            { id: 'oneplus', label: '⚡ OnePlus', count: 14 },
            { id: 'oppo', label: '🟢 OPPO & Realme', count: 14 },
            { id: 'nothing', label: '⚪ Nothing Phone', count: 4 },
          ].map((bf) => {
            const isActive = selectedBrandFolder === bf.id;
            return (
              <button
                key={bf.id}
                type="button"
                onClick={() => {
                  setSelectedBrandFolder(bf.id);
                  setSelectedEra('all');
                  if (bf.id !== 'all') {
                    const firstOfBrand = PHONES.find(p => getPhoneBrandFolderId(p) === bf.id);
                    if (firstOfBrand) {
                      setSelectedPhoneId(firstOfBrand.id);
                    }
                  }
                }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-md ring-2 ring-neutral-900/40 scale-105 font-black'
                    : 'bg-white/90 hover:bg-white text-neutral-700 border border-neutral-300 hover:border-neutral-400'
                }`}
              >
                <span>{bf.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-white font-bold' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {bf.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          📱 MOBILE BRAND CATEGORIES HUB & PICTURE-FIRST GALLERY (SHORT & CLEAN)
          Apple all in 1 category, Samsung all in 1 category, Vivo all in 1 category
          ======================================================== */}
      {selectedBrandFolder === 'all' && !searchQuery ? (
        /* --------------------------------------------------------
           1. BRAND CATEGORIES OVERVIEW HUB (SHORT, CLEAN & HIGH LEVEL)
           -------------------------------------------------------- */
        <div style={{ padding: '0 20px 24px' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-sky-600" />
                <span>Brand Categories Overview</span>
              </h3>
              <p className="text-[11px] text-neutral-500">
                Tap any category to view all models under it
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-neutral-200/80 px-2 py-0.5 rounded-full text-neutral-700">
              {PHONE_BRANDS.filter((b) => b.id !== 'all').length} Categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PHONE_BRANDS.filter((b) => b.id !== 'all').map((brand) => {
              const brandPhones = PHONES.filter((p) => getPhoneBrandFolderId(p) === brand.id);
              const count = brandPhones.length;
              const maxReward = brandPhones.length > 0 ? Math.max(...brandPhones.map((p) => p.reward)) : 850;
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => {
                    setSelectedBrandFolder(brand.id);
                    setSelectedEra('all');
                    if (brand.id !== 'all') {
                      const firstOfBrand = PHONES.find(p => getPhoneBrandFolderId(p) === brand.id);
                      if (firstOfBrand) {
                        setSelectedPhoneId(firstOfBrand.id);
                      }
                    }
                  }}
                  className="rounded-2xl border border-neutral-200 hover:border-sky-500 bg-white hover:bg-sky-50/30 p-3.5 transition-all text-left shadow-xs hover:shadow-md cursor-pointer flex items-center gap-3.5 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900 overflow-hidden relative shrink-0 shadow-sm">
                    <img
                      src={brand.photo || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80'}
                      alt={brand.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-xl">
                      {brand.iconEmoji}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-neutral-900 group-hover:text-sky-600 transition-colors truncate">
                        {brand.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                      {brand.description}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-mono">
                        {count} Models
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        Earn up to {rs(maxReward)}
                      </span>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-neutral-100 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center text-neutral-400 transition-colors shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* --------------------------------------------------------
           2. DEDICATED BRAND CATEGORY GALLERY (PICTURE FIRST & CAPABILITIES)
           Clean, short, and focused on ONLY the selected brand's models
           -------------------------------------------------------- */
        <div style={{ padding: '0 20px 24px' }}>
          {/* Active Category Header Banner */}
          {selectedBrandFolder !== 'all' && (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border border-sky-400/40 text-white shadow-lg text-left">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0 border border-white/20">
                    {PHONE_BRANDS.find((b) => b.id === selectedBrandFolder)?.iconEmoji || '📱'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm sm:text-base text-white truncate">
                        {PHONE_BRANDS.find((b) => b.id === selectedBrandFolder)?.name} Category
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-400/30">
                        {filteredPhones.length} Models
                      </span>
                    </div>
                    <div className="text-[11px] text-sky-200/80 truncate">
                      {PHONE_BRANDS.find((b) => b.id === selectedBrandFolder)?.description}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrandFolder('all');
                    setSelectedEra('all');
                  }}
                  className="shrink-0 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold border border-white/20 transition-all cursor-pointer"
                  title="View all brand categories"
                >
                  All Brands ▾
                </button>
              </div>

              {/* Sub-series / Generation Filter Pills */}
              {PHONE_BRANDS.find((b) => b.id === selectedBrandFolder)?.generations && (
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {PHONE_BRANDS.find((b) => b.id === selectedBrandFolder)?.generations?.map((gen) => {
                    const isEraActive = selectedEra === gen || (selectedEra === 'all' && gen.startsWith('All'));
                    return (
                      <button
                        key={gen}
                        type="button"
                        onClick={() => {
                          if (gen.startsWith('All')) setSelectedEra('all');
                          else setSelectedEra(gen);
                        }}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          isEraActive
                            ? 'bg-sky-400 text-neutral-950 font-black shadow-md'
                            : 'bg-white/10 hover:bg-white/20 text-white/80 border border-white/15'
                        }`}
                      >
                        {gen}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2-Column Picture First Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
          {filteredPhones.map((p) => {
            const cap = getPhoneCapabilities(p);
            const isSelected = selectedPhoneId === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between bg-white shadow-xs hover:shadow-md group ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-400/40'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {/* 1. PICTURE FIRST: Clean, spacious product showcase container */}
                <div 
                  onClick={() => {
                    setSelectedPhoneId(p.id);
                    go('detail');
                  }}
                  className="relative h-38 sm:h-44 w-full bg-neutral-50/90 p-3 flex items-center justify-center overflow-hidden cursor-pointer border-b border-neutral-100"
                >
                  {/* Floating Brand & Year Badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/95 text-neutral-800 shadow-2xs border border-neutral-200">
                      {p.brand}
                    </span>
                    {p.releaseYear && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-neutral-200/80 text-neutral-600">
                        {p.releaseYear}
                      </span>
                    )}
                  </div>

                  {/* Earning Reward Pill Tag Top-Right */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs flex items-center gap-0.5">
                      <span>💰</span>
                      <span>+{rs(p.reward)}</span>
                    </span>
                  </div>

                  {/* Crisp Phone Image (Picture First) */}
                  <img
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    className="max-h-28 sm:max-h-34 max-w-[85%] object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Active Selection Indicator */}
                  {isSelected && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black flex items-center gap-1 shadow-sm z-10">
                      <Check className="w-2.5 h-2.5" />
                      <span>Active</span>
                    </div>
                  )}
                </div>

                {/* 2. CARD BODY: Title & Hardware Capabilities */}
                <div className="p-3 flex-1 flex flex-col justify-between text-left">
                  <div>
                    {/* Model Name */}
                    <div 
                      onClick={() => {
                        setSelectedPhoneId(p.id);
                        go('detail');
                      }}
                      className="font-extrabold text-xs sm:text-sm text-neutral-900 line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
                      title={p.name}
                    >
                      {p.name}
                    </div>

                    {/* Hardware Capabilities Badges */}
                    <div className="mt-2 space-y-1">
                      {/* Camera */}
                      <div className="text-[10px] text-neutral-600 flex items-center gap-1.5 leading-tight truncate">
                        <Camera className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{cap.camera}</span>
                      </div>

                      {/* Display / Chip */}
                      <div className="text-[10px] text-neutral-600 flex items-center gap-1.5 leading-tight truncate">
                        <Smartphone className="w-3 h-3 text-sky-500 shrink-0" />
                        <span className="truncate">{cap.display}</span>
                      </div>

                      {/* Processor / Battery */}
                      <div className="text-[10px] text-neutral-600 flex items-center gap-1.5 leading-tight truncate">
                        <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">{cap.chipset}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. ONE-CLICK CTA: Start Recording & Earn Cash */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPhoneId(p.id);
                        go('record');
                      }}
                      className="w-full py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[11px] shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      title={`I own this ${p.name} · Record 1-min video review and earn ${rs(p.reward)}`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Record & Earn {rs(p.reward)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPhoneId(p.id);
                        setCampaignSubmitNotice(null);
                        go('detail');
                      }}
                      className="w-full py-0.5 text-[10px] font-bold text-neutral-500 hover:text-neutral-800 text-center cursor-pointer"
                    >
                      Campaign & Submit →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPhones.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: 28, textAlign: 'center', color: 'var(--ink2)', fontSize: 'calc(16px * var(--fs))' }}>
              No phone found for "{searchQuery}". Try selecting "Samsung Galaxy" or "Apple iPhone" above.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );

  /* =========================================================================
   * SCREEN 3: CONSUMER CAMPAIGN DETAILS & SUBMIT ENTRY
   * (No questions are shown before recording starts)
   * ========================================================================= */
  const renderDetail = () => {
    const cap = getPhoneCapabilities(currentPhone);
    const hasDraftForThisPhone = Boolean(draftReview && draftReview.phone === currentPhone.id);
    const draftAnsweredCount = hasDraftForThisPhone
      ? Object.keys(draftReview?.allAnswers || {}).filter((k) => Boolean((draftReview?.allAnswers || {})[k])).length
      : 0;

    return (
      <div className="fp-screen" style={{ display: 'flex', flexDirection: 'column' }}>
        <TopBar onBack={() => go('home')} title="Campaign" />
        <div className="fp-scroll" style={{ flex: 1 }}>
          <div style={{ margin: '0 20px', borderRadius: 28, background: '#fff', height: 220, display: 'grid', placeItems: 'center', border: '1px solid var(--line)', padding: 12 }}>
            <img src={currentPhone.img} alt={currentPhone.name} style={{ maxWidth: '80%', maxHeight: 190, objectFit: 'contain' }} />
          </div>

          <div style={{ padding: '18px 20px 0' }}>
            <div style={{ fontSize: 'calc(14px * var(--fs))', color: 'var(--ink2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {currentPhone.brand}
            </div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 'calc(28px * var(--fs))', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              {currentPhone.name}
            </div>
            <div style={{ color: 'var(--ink2)', fontSize: 'calc(15px * var(--fs))', marginTop: 6 }}>
              {currentPhone.spec}
            </div>
            <button
              type="button"
              onClick={() => {
                setCampaignSubmitNotice(null);
                setIsPhoneSelectorOpen(true);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all border border-neutral-300 shadow-xs cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>Switch Mobile Model ▾</span>
            </button>
          </div>

          {/* Reward & Duration Summary */}
          <div style={{ margin: '16px 20px 0', display: 'flex', gap: 10 }}>
            <div className="fp-stat" style={{ background: 'var(--moneyTint)', color: 'var(--money)' }}>
              <div style={{ fontSize: 'calc(13px * var(--fs))', fontWeight: 700 }}>You earn</div>
              <div style={{ fontSize: 'calc(24px * var(--fs))', fontWeight: 800, fontFamily: 'var(--display)' }}>
                {rs(currentPhone.reward)}
              </div>
            </div>
            <div className="fp-stat">
              <div style={{ fontSize: 'calc(13px * var(--fs))', fontWeight: 700, color: 'var(--ink2)' }}>Time</div>
              <div style={{ fontSize: 'calc(24px * var(--fs))', fontWeight: 800, fontFamily: 'var(--display)' }}>
                2-3 min
              </div>
            </div>
          </div>

          {/* Campaign Device Specs & Recording Readiness (No Questions Displayed Before Recording) */}
          <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 20, padding: '14px 16px' }} className="space-y-2.5 text-left">
              <div style={{ fontWeight: 800, fontSize: 'calc(16px * var(--fs))', color: 'var(--ink)' }}>
                Device & Campaign Highlights
              </div>
              <div className="space-y-1.5 text-xs text-neutral-700">
                <div className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span><b>Camera:</b> {cap.camera}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span><b>Display:</b> {cap.display}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span><b>Processor:</b> {cap.chipset}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-100 text-xs text-neutral-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Questions appear live on screen only once video recording starts so every review stays natural and authentic.
                </span>
              </div>
            </div>

            {/* Recorded Draft Video & Answers Ready Card on Campaign Screen */}
            {hasDraftForThisPhone && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 20, padding: '14px 16px' }} className="space-y-2.5 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Recorded Review Ready to Submit</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-800">
                    {draftAnsweredCount} answers
                  </span>
                </div>
                {draftReview?.videoUrl && (
                  <div className="rounded-xl overflow-hidden bg-black aspect-video border border-emerald-200">
                    <video
                      src={draftReview.videoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVideoPreviewModal(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Preview Video & All Q&A
                  </button>
                  <button
                    type="button"
                    onClick={() => go('review')}
                    className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer transition-colors"
                  >
                    Edit & Rate →
                  </button>
                </div>
              </div>
            )}

            {campaignSubmitNotice && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{campaignSubmitNotice}</p>
                </div>
              </div>
            )}

            {submissionError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submissionError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Consumer Campaign Action Bar: Record Video + Submit Review */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--line)', background: 'var(--paper)', display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="fp-btn fp-btn-rec"
            style={{ flex: 1, minWidth: 0, fontSize: 'calc(14px * var(--fs))', padding: '0 14px' }}
            onClick={() => {
              setCampaignSubmitNotice(null);
              setSubmissionError(null);
              go('record');
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 99, background: '#fff', flexShrink: 0 }} />
            <span className="truncate">{hasDraftForThisPhone ? 'Re-record Video' : 'Start Video'}</span>
          </button>

          <button
            type="button"
            disabled={isSubmittingReview}
            className="fp-btn fp-btn-dark"
            style={{ flex: 1, minWidth: 0, fontSize: 'calc(14px * var(--fs))', padding: '0 14px' }}
            onClick={() => {
              if (!user?.isLoggedIn || !auth.currentUser) {
                onOpenGoogleAuth('login');
                return;
              }
              if (!hasDraftForThisPhone) {
                setCampaignSubmitNotice('Record your campaign video first — questions appear live while recording, then you can preview and submit.');
                return;
              }
              submitCurrentDraftFeedback();
            }}
          >
            {isSubmittingReview ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                <span className="truncate">Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 shrink-0" />
                <span className="truncate">Submit Review</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  /* =========================================================================
   * SCREEN 4: 2.5-MIN CONVERSATIONAL AI VOICE & VISIBLE CAMERA STUDIO
   * ========================================================================= */
  /* =========================================================================
   * SCREEN 4: 2.5 - 3 MIN CONVERSATIONAL AI VOICE & VISIBLE CAMERA STUDIO
   * ========================================================================= */
  type InterviewLanguage = 'ne' | 'en' | 'hi' | 'es' | 'ne-en' | 'mai';

  const INTERVIEW_LANGUAGES: Array<{ id: InterviewLanguage; label: string; flag: string; sub: string; greetingAudioText: string }> = [
    { 
      id: 'ne', 
      label: 'नेपाली (Nepali)', 
      flag: '🇳🇵', 
      sub: 'आफ्नो मातृभाषामा सहजै कुराकानी गर्नुहोस्',
      greetingAudioText: 'नमस्ते! dot भिडियो स्टुडियोमा स्वागत छ।'
    },
    { 
      id: 'en', 
      label: 'English', 
      flag: '🇬🇧', 
      sub: 'Clear, natural English conversational interview',
      greetingAudioText: 'Namaste! Welcome to dot video review studio.'
    },
    { 
      id: 'hi', 
      label: 'हिंदी (Hindi)', 
      flag: '🇮🇳', 
      sub: 'अपनी पसंदीदा हिंदी भाषा में फोन पर बात करें',
      greetingAudioText: 'नमस्ते! dot वीडियो स्टूडियो में आपका स्वागत है।'
    },
    { 
      id: 'es', 
      label: 'Español (Spanish)', 
      flag: '🇪🇸', 
      sub: 'Entrevista conversacional clara y natural en español',
      greetingAudioText: '¡Hola! Te damos la bienvenida a dot video estudio.'
    },
    { 
      id: 'ne-en', 
      label: 'नेपाली + English Mix', 
      flag: '🇳🇵🇬🇧', 
      sub: 'Colloquial Nepali & English mixed phone style',
      greetingAudioText: 'Namaste ji! Welcome to dot phone interview.'
    },
    { 
      id: 'mai', 
      label: 'मैथिली / भोजपुरी', 
      flag: '🌾', 
      sub: 'अपन भाषा में आसानी सँ मोबाइल के रिव्यू करू',
      greetingAudioText: 'प्रणाम! dot वीडियो स्टूडियो में अहाँक स्वागत अछि।'
    },
  ];

  const INTERVIEW_SCRIPTS = INTERVIEW_SCRIPTS_20;

  // Total recording length is generous for all 21 interactive questions (up to 6 minutes)
  const TOTAL_RECORD_SECONDS = 360; // 6 minutes total duration
  const QUESTION_DURATION = Math.round(TOTAL_RECORD_SECONDS / 21);

  // Workflow states
  const [recPhase, setRecPhase] = useState<'studio'>('studio');
  const [selectedLanguage, setSelectedLanguage] = useState<InterviewLanguage>('ne');
  const [recState, setRecState] = useState<'ready' | 'recording'>('ready');
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [useFrontCamera, setUseFrontCamera] = useState<boolean>(true); // true = Front Face Cam, false = Back Product Cam
  const [cameraSource, setCameraSource] = useState<'webcam' | 'studio_face'>('webcam');
  const [reviewerFacePhoto, setReviewerFacePhoto] = useState<string>(() => {
    return user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
  });
  const [cameraFormat, setCameraFormat] = useState<'portrait' | 'wide'>('portrait');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [ringLightActive, setRingLightActive] = useState<boolean>(false);
  const [demoSpeed, setDemoSpeed] = useState<number>(1.0);
  const [isCameraStreaming, setIsCameraStreaming] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Professional Camera Studio states (from camera_interface attachment)
  const [studioMode, setStudioMode] = useState<'video' | 'photo' | 'quick' | 'live'>('video');
  const [cameraSpeed, setCameraSpeed] = useState<'1x' | '0.5x' | '2x' | '3x'>('1x');
  const [timerDelay, setTimerDelay] = useState<'Off' | '3s' | '10s'>('Off');
  const [beautifyActive, setBeautifyActive] = useState<boolean>(true);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [showSoundModal, setShowSoundModal] = useState<boolean>(false);
  const [selectedSoundTrack, setSelectedSoundTrack] = useState<string>('AI Voice Host · Active');
  const [questionMode, setQuestionMode] = useState<'10_core' | '21_deep'>('10_core');

  // Camera Visual Effects & Filters (Engagement & Live Stream Filters)
  type CameraFilterId = 'studio' | 'vivid' | 'cinematic' | 'golden' | 'beauty' | 'noir' | 'retro' | 'none';
  const [activeCameraFilter, setActiveCameraFilter] = useState<CameraFilterId>('studio');
  const [showFilterDock, setShowFilterDock] = useState<boolean>(true);
  const [showRecStudioOverlay, setShowRecStudioOverlay] = useState<boolean>(true);

  const CAMERA_FILTERS: Array<{
    id: CameraFilterId;
    name: string;
    icon: string;
    cssFilter: string;
    badge: string;
    description: string;
    gradient: string;
  }> = [
    { id: 'studio', name: 'Studio Glow', icon: '✨', cssFilter: 'brightness(1.15) contrast(1.1) saturate(1.15)', badge: 'Popular', description: 'Studio ring-light & balanced radiance', gradient: 'from-amber-400 to-rose-500' },
    { id: 'vivid', name: 'Cyber Vivid', icon: '🎨', cssFilter: 'contrast(1.24) saturate(1.4) hue-rotate(-5deg)', badge: 'Punchy', description: 'High-contrast vibrant colors', gradient: 'from-fuchsia-500 to-cyan-500' },
    { id: 'cinematic', name: 'Cinematic', icon: '🎬', cssFilter: 'contrast(1.18) saturate(1.15) hue-rotate(15deg) brightness(1.05)', badge: 'Movie', description: 'Teal & orange film color grade', gradient: 'from-teal-600 to-amber-500' },
    { id: 'golden', name: 'Golden Hour', icon: '🌅', cssFilter: 'sepia(0.35) saturate(1.4) contrast(1.1) brightness(1.05)', badge: 'Warm', description: 'Sun-drenched amber glow', gradient: 'from-amber-500 to-orange-600' },
    { id: 'beauty', name: 'Beauty Soft', icon: '💄', cssFilter: 'brightness(1.12) contrast(1.05) saturate(1.08)', badge: 'Smooth', description: 'Soft skin tone smoothing', gradient: 'from-pink-400 to-rose-400' },
    { id: 'noir', name: 'B&W Noir', icon: '🎞️', cssFilter: 'grayscale(1) contrast(1.3) brightness(0.95)', badge: 'Classic', description: 'Monochrome silver halide 35mm', gradient: 'from-stone-500 to-stone-900' },
    { id: 'retro', name: 'Retro 90s', icon: '📼', cssFilter: 'sepia(0.2) contrast(1.15) brightness(1.08) saturate(0.9)', badge: 'Vintage', description: 'Faded warm videotape aesthetic', gradient: 'from-yellow-600 to-amber-800' },
    { id: 'none', name: 'Natural', icon: '🌿', cssFilter: 'none', badge: 'Raw', description: 'Raw natural camera sensor feed', gradient: 'from-neutral-600 to-neutral-800' },
  ];

  const currentCameraFilter = CAMERA_FILTERS.find((f) => f.id === activeCameraFilter) || CAMERA_FILTERS[0];
  const computedCameraFilterCss = `${currentCameraFilter.cssFilter}${ringLightActive ? ' brightness(1.22) contrast(1.08)' : ''}`;

  // AI Voice State
  const [isAiVoiceMuted, setIsAiVoiceMuted] = useState<boolean>(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [lastSpokenQIdx, setLastSpokenQIdx] = useState<number>(-1);

  // Product Photo Snapshot State
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);

  // Preset faces list for reviewers
  const PRESET_FACES = [
    { id: 'user', label: 'My Profile', url: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80' },
    { id: 'pawan', label: 'Reviewer Pawan', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
    { id: 'creator', label: 'Tech Creator', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80' },
    { id: 'female', label: 'Mobile Reviewer', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },
  ];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceUploadInputRef = useRef<HTMLInputElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Question & User Answers State (Supports Voice, Tap-Select, or Typing for all ages 1-90)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [micRecording, setMicRecording] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Phone Selector Modal state & Brand Folder selection
  const [isPhoneSelectorOpen, setIsPhoneSelectorOpen] = useState<boolean>(false);
  const [phoneSelectorInitialBrand, setPhoneSelectorInitialBrand] = useState<string>('all');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [submissionStatusMsg, setSubmissionStatusMsg] = useState<string>('');
  const [lastSubmittedReview, setLastSubmittedReview] = useState<FeedbackItem | null>(null);

  // Two-way interactive Voice Call Interview & Quiz Selection state
  const [callTurn, setCallTurn] = useState<'ai_asking' | 'user_answering'>('ai_asking');
  const [animatingOptionIdx, setAnimatingOptionIdx] = useState<number | null>(null);
  const [showQuestionDirectory, setShowQuestionDirectory] = useState<boolean>(false);
  const [showVoiceToneModal, setShowVoiceToneModal] = useState<boolean>(false);

  // Selected AI Voice Tone (1 of 5 distinct tones)
  const [selectedVoiceTone, setSelectedVoiceTone] = useState<string>(() => {
    return user?.preferredVoiceTone || 'warm_friendly';
  });

  // Auto-Detected Device Hardware Specs (Non-Intrusive, Safe Browser Web APIs)
  interface DetectedHardwareSpecs {
    os: string;
    browser: string;
    resolution: string;
    pixelRatio: number;
    cores?: number;
    memoryGb?: number;
    verifiedBadge: string;
  }

  const [detectedSpecs] = useState<DetectedHardwareSpecs>(() => {
    if (typeof window === 'undefined') {
      return {
        os: 'Mobile Device',
        browser: 'Browser',
        resolution: '1080 × 2400',
        pixelRatio: 2,
        verifiedBadge: '🔒 Verified Device · HD',
      };
    }
    const ua = navigator.userAgent || '';
    let os = 'Android Mobile';
    if (/iPad|iPhone|iPod/.test(ua)) os = 'Apple iOS Device';
    else if (/Android/.test(ua)) os = 'Android Mobile';
    else if (/Macintosh|Mac OS X/.test(ua)) os = 'Apple macOS';
    else if (/Windows NT/.test(ua)) os = 'Windows Device';
    else if (/Linux/.test(ua)) os = 'Linux Device';

    let browser = 'Chrome';
    if (/Edg/.test(ua)) browser = 'Edge';
    else if (/Chrome/.test(ua) && !/Chromium|Edg/.test(ua)) browser = 'Chrome';
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    else if (/Firefox/.test(ua)) browser = 'Firefox';

    const w = window.screen?.width || window.innerWidth || 390;
    const h = window.screen?.height || window.innerHeight || 844;
    const dpr = window.devicePixelRatio ? Math.round(window.devicePixelRatio * 10) / 10 : 2;
    const cores = navigator.hardwareConcurrency || 8;
    const memoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory;

    const resolution = `${w} × ${h} px (${dpr}x)`;
    const verifiedBadge = `🔒 Verified ${os} · ${w}×${h} · ${browser}`;

    return {
      os,
      browser,
      resolution,
      pixelRatio: dpr,
      cores,
      memoryGb,
      verifiedBadge,
    };
  });

  // Privacy-First Trust & Legal Verification states
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
  const [hidePhoneModelInReview, setHidePhoneModelInReview] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showPrivacyInfoModal, setShowPrivacyInfoModal] = useState<boolean>(false);
  const [showVideoPreviewModal, setShowVideoPreviewModal] = useState<boolean>(false);
  const [termsHighlightAlert, setTermsHighlightAlert] = useState<boolean>(false);

  const handleToggleTerms = (checked: boolean) => {
    setTermsAccepted(checked);
    if (checked) {
      setTermsHighlightAlert(false);
    }
    playAudioEffect('click');
  };

  // Salutation & Gender state (Detect female login or male login)
  const isDefaultFemale = useMemo(() => {
    if (user?.gender === 'female') return true;
    if (user?.title === 'Mrs.' || user?.title === 'Ms.') return true;
    if (user?.name && /(sita|priya|sharma|rita|gita|puja|anita|devi|shrimati)/i.test(user.name)) return true;
    return false;
  }, [user?.gender, user?.title, user?.name]);

  const [activeGender, setActiveGender] = useState<'female' | 'male'>(isDefaultFemale ? 'female' : 'male');
  const [activeTitle, setActiveTitle] = useState<'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.'>(
    user?.title || (isDefaultFemale ? 'Mrs.' : 'Mr.')
  );
  const [customReviewerName, setCustomReviewerName] = useState<string>(user?.name || '');

  // Keep synced if user profile updates
  useEffect(() => {
    if (user?.name) setCustomReviewerName(user.name);
    const female = user?.gender === 'female' || (user?.title === 'Mrs.' || user?.title === 'Ms.') || (user?.name && /(sita|priya|sharma|rita|gita)/i.test(user.name));
    setActiveGender(female ? 'female' : 'male');
    setActiveTitle(user?.title || (female ? 'Mrs.' : 'Mr.'));
  }, [user?.name, user?.gender, user?.title]);

  const handleGenderChange = (gender: 'female' | 'male') => {
    setActiveGender(gender);
    const newTitle = gender === 'female' ? 'Mrs.' : 'Mr.';
    setActiveTitle(newTitle);
    onUpdateUser({ gender, title: newTitle });
    playAudioEffect('click');
  };

  const handleTitleChange = (title: 'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.') => {
    setActiveTitle(title);
    const gender = title === 'Mrs.' || title === 'Ms.' ? 'female' : 'male';
    setActiveGender(gender);
    onUpdateUser({ title, gender });
    playAudioEffect('click');
  };

  // Helper to format formal username "Mr. [Name]" or "Mrs. [Name]" based on gender and title
  const getFormalUserName = (rawName?: string) => {
    const raw = (rawName || customReviewerName || user?.name || 'Reviewer').trim();
    return formatSalutationGreeting(raw, activeGender, activeTitle, selectedLanguage);
  };

  // Dynamically generated phone-specific questions (Defaults to 10 Focused Questions)
  const activeQuestions = useMemo(() => {
    if (questionMode === '10_core') {
      return get10CoreMobileQuestions(currentPhone, selectedLanguage);
    }
    return getPhoneSpecificQuestions(currentPhone, selectedLanguage);
  }, [currentPhone, selectedLanguage, questionMode]);

  const activeScript = useMemo(() => {
    const base = INTERVIEW_SCRIPTS[selectedLanguage] || INTERVIEW_SCRIPTS.ne;
    return {
      ...base,
      questions: activeQuestions,
    };
  }, [selectedLanguage, activeQuestions]);

  const questionIndex = currentQuestionIdx;
  const currentQData = activeScript.questions[questionIndex] || activeScript.questions[0];
  const withinQuestionSeconds = secondsElapsed;

  // Dynamic Pending Earnings Tally State (Financial Incentive Reinforcement)
  const [recentEarnedBonus, setRecentEarnedBonus] = useState<{ amount: number; reason: string; timestamp: number } | null>(null);

  const pendingEarningsData = useMemo(() => {
    const total = currentPhone?.reward || 850;
    const answeredCount = Object.keys(userAnswers).length;
    const totalQ = activeScript?.questions?.length || 21;

    // Step 1: Base setup unlocked (Profile & Camera Readiness) - 15%
    const baseReward = Math.round(total * 0.15);
    // Step 2: Answered evaluation questions (Up to 50% unlocked)
    const questionReward = Math.round((Math.min(answeredCount, totalQ) / totalQ) * (total * 0.50));
    // Step 3: Video Recording duration (Up to 25% unlocked)
    const videoRatio = recState === 'recording'
      ? Math.min(secondsElapsed / TOTAL_RECORD_SECONDS, 1)
      : 0;
    const videoReward = Math.round(videoRatio * (total * 0.25));
    // Step 4: Product Proof Snapshots (Up to 10% unlocked)
    const photoReward = capturedPhotos.length > 0
      ? Math.min(Math.round(total * 0.10), capturedPhotos.length * Math.round(total * 0.05))
      : 0;

    const currentEarned = Math.min(total, baseReward + questionReward + videoReward + photoReward);
    const percentage = Math.min(100, Math.max(15, Math.round((currentEarned / total) * 100)));
    const remaining = Math.max(0, total - currentEarned);

    // Dynamic Step Statuses (1 to 4)
    const step1Done = true;
    const step2Done = answeredCount >= 1;
    const step3Done = recState === 'recording' && secondsElapsed >= 5;
    const step4Done = capturedPhotos.length >= 1;

    const completedStepsCount = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0) + (step4Done ? 1 : 0);

    return {
      total,
      currentEarned,
      remaining,
      percentage,
      baseReward,
      questionReward,
      answeredCount,
      totalQ,
      videoReward,
      photoReward,
      step1Done,
      step2Done,
      step3Done,
      step4Done,
      completedStepsCount,
    };
  }, [currentPhone?.reward, userAnswers, activeScript, recState, secondsElapsed, capturedPhotos.length, TOTAL_RECORD_SECONDS]);

  // Sound Synthesis & Web Audio Context Unlocker
  const unlockAudioContext = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    } catch {}
  };

  const playAudioEffect = (type: 'ring' | 'shutter' | 'chime' | 'click' | 'clapper' | 'pop') => {
    try {
      unlockAudioContext();
      if (!audioContextRef.current) return;
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'ring') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'shutter') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.09);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'clapper') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(840, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch {}
  };

  // Interactive Live Floating Reactions State
  interface FloatingReactionItem {
    id: string;
    emoji: string;
    left: number;
  }
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionItem[]>([]);
  const [clapperCountdown, setClapperCountdown] = useState<number | null>(null);
  const [recordingAtmosphere, setRecordingAtmosphere] = useState<'bedroom' | 'studio' | 'hype'>('studio');

  const triggerFloatingReaction = (emoji: string) => {
    playAudioEffect('pop');
    const id = Math.random().toString(36).substring(2, 9);
    const left = Math.floor(Math.random() * 65) + 18;
    setFloatingReactions((prev) => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2200);
  };

  const handleSelectAtmosphere = (atmo: 'bedroom' | 'studio' | 'hype') => {
    setRecordingAtmosphere(atmo);
    playAudioEffect('click');
    if (atmo === 'bedroom') {
      handleSelectVoiceTone('bedroom_whisper');
      setActiveCameraFilter('noir');
    } else if (atmo === 'hype') {
      handleSelectVoiceTone('energetic_creator');
      setActiveCameraFilter('vivid');
    } else {
      handleSelectVoiceTone('warm_friendly');
      setActiveCameraFilter('studio');
    }
  };


  // High-reliability Browser Speech Synthesis with 5 AI Voice Tones
  const fallbackSpeechSynth = (text: string, lang: InterviewLanguage, toneOverride?: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsAiSpeaking(false);
      setCallTurn('user_answering');
      startVoiceListening();
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const cleanText = text.replace(/[*_#`~]/g, '').trim();
      const utter = new SpeechSynthesisUtterance(cleanText);

      const toneId = toneOverride || selectedVoiceTone;
      const currentTone = AI_VOICE_TONES.find((t) => t.id === toneId) || AI_VOICE_TONES[0];
      utter.rate = currentTone.rate;
      utter.pitch = currentTone.pitch;

      if (lang === 'es') {
        utter.lang = 'es-ES';
      } else if (lang === 'ne' || lang === 'ne-en' || lang === 'mai') {
        utter.lang = 'hi-IN'; // Indian voice engines pronounce Nepali/Maithili Devanagari text accurately
      } else if (lang === 'hi') {
        utter.lang = 'hi-IN';
      } else {
        utter.lang = 'en-US';
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const targetGender = currentTone.genderPref || activeGender;
        let matchingVoices = voices.filter((v) =>
          lang === 'es'
            ? v.lang.startsWith('es')
            : lang === 'en'
            ? v.lang.startsWith('en')
            : v.lang.startsWith('hi') || v.lang.startsWith('ne') || v.lang.includes('India')
        );
        if (matchingVoices.length === 0) {
          matchingVoices = voices;
        }

        let matchedVoice: SpeechSynthesisVoice | undefined;
        if (targetGender === 'female') {
          matchedVoice = matchingVoices.find((v) =>
            /female|zira|samantha|victoria|veena|lekha|kavya|google हिन्दी/i.test(v.name)
          );
        } else {
          matchedVoice = matchingVoices.find((v) =>
            /male|david|alex|daniel|rishi|google us/i.test(v.name)
          );
        }
        utter.voice = matchedVoice || matchingVoices[0] || voices[0];
      }

      utter.onstart = () => {
        setIsAiSpeaking(true);
        setCallTurn('ai_asking');
      };

      utter.onend = () => {
        setIsAiSpeaking(false);
        setCallTurn('user_answering');
        // Once AI finishes speaking the question, start voice listening so user can answer!
        startVoiceListening();
      };

      utter.onerror = (err) => {
        console.warn('SpeechSynthesis error:', err);
        setIsAiSpeaking(false);
        setCallTurn('user_answering');
        startVoiceListening();
      };

      (window as unknown as { _currentVoiceUtterance: SpeechSynthesisUtterance })._currentVoiceUtterance = utter;
      window.speechSynthesis.speak(utter);

      // Chrome safety watchdog: if synthesis pauses unexpectedly, resume it
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 300);
    } catch {
      setIsAiSpeaking(false);
      setCallTurn('user_answering');
      startVoiceListening();
    }
  };

  // Web Audio buffer player for base64 audio (Immune to HTMLMediaElement user activation restrictions)
  const playBase64AudioWithContext = async (base64Data: string): Promise<boolean> => {
    try {
      unlockAudioContext();
      const ctx = audioContextRef.current;
      if (!ctx) return false;

      // Stop any existing buffer source
      if (currentBufferSourceRef.current) {
        try {
          currentBufferSourceRef.current.stop();
        } catch {}
        currentBufferSourceRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Decode audio data using Web Audio API
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentBufferSourceRef.current = source;

      setIsAiSpeaking(true);
      setCallTurn('ai_asking');
      source.onended = () => {
        setIsAiSpeaking(false);
        setCallTurn('user_answering');
        currentBufferSourceRef.current = null;
        startVoiceListening();
      };

      source.start(0);
      return true;
    } catch (err) {
      console.warn('Web Audio decode failed, falling back:', err);
      return false;
    }
  };

  // Single AI Voice Speaker: Instant, zero-delay speech without microphone collisions
  const speakSingleAi = (text: string, lang: InterviewLanguage = selectedLanguage, toneOverride?: string) => {
    if (isAiVoiceMuted) return;
    unlockAudioContext();

    // Crucial: Stop microphone listening so mic never suppresses or monopolizes audio engine!
    stopVoiceListening();

    if (currentBufferSourceRef.current) {
      try {
        currentBufferSourceRef.current.stop();
      } catch {}
      currentBufferSourceRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    setIsAiSpeaking(true);
    setCallTurn('ai_asking');
    const cleanText = text.replace(/[*_#`~]/g, '').trim();

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }

    // 40ms tick allows Chrome speech engine to complete cancel before speaking new utterance
    setTimeout(() => {
      fallbackSpeechSynth(cleanText, lang, toneOverride);
    }, 40);
  };

  // Switch voice tone (1 of 5 styles)
  const handleSelectVoiceTone = (toneId: string) => {
    setSelectedVoiceTone(toneId);
    onUpdateUser({ preferredVoiceTone: toneId });
    playAudioEffect('click');
  };

  // Test an AI voice tone with immediate sample phrase
  const handleTestVoiceTone = (tone: AiVoiceToneOption) => {
    unlockAudioContext();
    handleSelectVoiceTone(tone.id);
    const formalGreetingName = getFormalUserName(customReviewerName || user?.name);
    const sample = tone.sampleText(formalGreetingName, currentPhone.name);
    speakSingleAi(sample, selectedLanguage, tone.id);
  };

  // Alias for backward compatibility
  const speakAiVoice = speakSingleAi;

  // Physical Camera Stream Starter with resilient fallback
  const startPhysicalCamera = async (front: boolean = useFrontCamera) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setIsCameraStreaming(false);
        setCameraSource('studio_face');
        return;
      }

      // Stop previous tracks safely
      if (activeStreamRef.current) {
        try {
          activeStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: front ? 'user' : { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback to any available video sensor if environment facingMode fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      activeStreamRef.current = stream;
      setIsCameraStreaming(true);
      setCameraSource('webcam');
      setCameraError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Physical camera unavailable, using Reviewer Face Studio:', err);
      setIsCameraStreaming(false);
      setCameraSource('studio_face');
      setCameraError('Webcam unavailable. Live Reviewer Face Studio active.');
    }
  };

  // Seamless Camera Flip without freezing video stream or speech
  const toggleFlipCamera = async () => {
    unlockAudioContext();
    playAudioEffect('click');
    const targetFront = !useFrontCamera;
    setUseFrontCamera(targetFront);

    if (cameraSource === 'webcam') {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;

        let newStream: MediaStream;
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: targetFront ? 'user' : { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        // Safely swap tracks
        if (activeStreamRef.current) {
          try {
            activeStreamRef.current.getTracks().forEach((t) => t.stop());
          } catch {}
        }

        activeStreamRef.current = newStream;
        setIsCameraStreaming(true);
        setCameraSource('webcam');
        setCameraError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Camera flip error:', err);
      }
    }
  };

  // Custom Face Photo Upload Handler
  const handleFacePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setReviewerFacePhoto(base64);
        onUpdateUser({ avatar: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  // Microphone voice recognition & transcription for answering
  const toggleVoiceAnswer = () => {
    if (isListeningMic) {
      stopVoiceListening();
    } else {
      startVoiceListening();
    }
  };

  const startVoiceListening = () => {
    unlockAudioContext();
    playAudioEffect('click');

    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang =
          selectedLanguage === 'ne'
            ? 'ne-NP'
            : selectedLanguage === 'hi'
            ? 'hi-IN'
            : 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setUserAnswers((prev) => ({
              ...prev,
              [currentQuestionIdx]: transcript.trim(),
            }));
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition error:', e);
          setIsListeningMic(false);
        };

        recognition.onend = () => {
          setIsListeningMic(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsListeningMic(true);
        return;
      } catch (e) {
        console.warn('SpeechRecognition failed, falling back to MediaRecorder', e);
      }
    }

    // Browser fallback when SpeechRecognition is unavailable
    setMicNotice('Live SpeechRecognition is not available in this browser. Please use the 1-tap options or type your feedback.');
    setIsListeningMic(false);
  };

  const stopVoiceListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsListeningMic(false);
    setMicRecording(false);
  };

  // Option select handler (1-Tap answering for grandparents/kids)
  const handleSelectOption = (opt: string) => {
    playAudioEffect('click');
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: opt,
    }));
  };

  // Type answer handler
  const handleTypeAnswer = (text: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: text,
    }));
  };

  // Clean Web Speech, recognition, and audio when exiting or stopping
  useEffect(() => {
    return () => {
      stopVoiceListening();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (currentBufferSourceRef.current) {
        try {
          currentBufferSourceRef.current.stop();
        } catch {}
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // When studio phase is activated, attempt starting physical camera
  useEffect(() => {
    if (screen === 'record' && recPhase === 'studio') {
      startPhysicalCamera(useFrontCamera);
    }
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [screen, recPhase]);

  // Overall recording timer (Total 165s = 2m 45s)
  useEffect(() => {
    if (recState !== 'recording' || recPhase !== 'studio') return;
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => {
        const next = prev + 0.1 * demoSpeed;
        if (next >= TOTAL_RECORD_SECONDS) {
          clearInterval(interval);
          finishRecording(TOTAL_RECORD_SECONDS);
          return TOTAL_RECORD_SECONDS;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [recState, recPhase, demoSpeed]);

  // Snap photo from live camera canvas or product image
  const handleTakeProductSnapshot = () => {
    playAudioEffect('shutter');
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 220);

    try {
      if (isCameraStreaming && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (useFrontCamera) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setCapturedPhotos((prev) => [dataUrl, ...prev]);
          return;
        }
      }
    } catch {}

    // Fallback product photo snapshot
    setCapturedPhotos((prev) => [currentPhone.img, ...prev]);

    // Financial incentive notification
    const photoBonus = Math.round(currentPhone.reward * 0.05);
    setRecentEarnedBonus({
      amount: photoBonus,
      reason: 'Photo Proof Snapped',
      timestamp: Date.now(),
    });
  };

  const finishRecording = (finalSecs: number) => {
    stopVoiceListening();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (currentBufferSourceRef.current) {
      try {
        currentBufferSourceRef.current.stop();
      } catch {}
      currentBufferSourceRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsAiSpeaking(false);
    setRecState('ready');

    const formalName = getFormalUserName(user?.name);
    const compiledAnswers: Record<string, string> = {
      like: userAnswers[4] || userAnswers[0] || activeScript.questions[4]?.sampleText || 'Superb daylight clarity and smooth 120Hz display.',
      dislike: userAnswers[12] || userAnswers[1] || 'Slight warmth during prolonged gaming, no power brick in box.',
      comfort: userAnswers[1] || userAnswers[2] || 'Ergonomic in-hand grip and balanced weight for one-handed typing.',
      improve: userAnswers[20] || userAnswers[3] || 'Keep optimizing battery standby endurance and faster charging.',
    };

    // Store all 21 questions answers
    activeScript.questions.forEach((q, idx) => {
      if (userAnswers[idx]) {
        compiledAnswers[q.k] = userAnswers[idx];
      }
    });

    setDraftReview({
      phone: currentPhone.id,
      seconds: Math.round(finalSecs) || TOTAL_RECORD_SECONDS,
      stars: userAnswers[20]?.includes('3') ? 3 : userAnswers[20]?.includes('4') ? 4 : 5,
      answers: compiledAnswers,
      allAnswers: userAnswers,
      productPhotos: capturedPhotos.length > 0 ? capturedPhotos : [currentPhone.img],
      language: selectedLanguage,
      hidePhoneModel: hidePhoneModelInReview,
      verifiedDevice: detectedSpecs.verifiedBadge,
      privacyProtected: true,
    });
    // Open automatic video preview & hardware verification modal
    setShowVideoPreviewModal(true);
    go('review');
  };

  // 1-Tap Animated Quiz Option Selector (User selects 1 of 4 options -> animates -> next question)
  const handleSelectQuizOption = (optionText: string, optionIdx: number) => {
    unlockAudioContext();
    playAudioEffect('chime');
    setAnimatingOptionIdx(optionIdx);

    // Save answer for this question
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: optionText,
    }));

    // Trigger Dynamic Pending Earnings Ticker Bump
    const qRewardVal = Math.max(15, Math.round((currentPhone.reward * 0.50) / (activeScript?.questions?.length || 21)));
    setRecentEarnedBonus({
      amount: qRewardVal,
      reason: `Q${currentQuestionIdx + 1} Answered!`,
      timestamp: Date.now(),
    });

    // Cancel ongoing speech
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsAiSpeaking(false);

    const formalName = getFormalUserName(user?.name);
    const curQ = activeScript.questions[currentQuestionIdx];
    const ack = curQ?.aiAcknowledgement
      ? curQ.aiAcknowledgement(formalName, currentPhone.name, currentQuestionIdx + 1)
      : 'धेरै राम्रो! अर्को प्रश्नमा जाऔँ।';

    // After animation pulse (500ms), speak acknowledgement and advance smoothly to next question or finish
    setTimeout(() => {
      setAnimatingOptionIdx(null);
      if (currentQuestionIdx >= activeScript.questions.length - 1) {
        speakSingleAi(ack, selectedLanguage);
        setTimeout(() => {
          finishRecording(secondsElapsed);
        }, 1400);
      } else {
        const nextIdx = currentQuestionIdx + 1;
        setCurrentQuestionIdx(nextIdx);
        setCallTurn('ai_asking');
        const nextQ = activeScript.questions[nextIdx];
        const nextPrompt = `${ack} ${nextQ.voiceText(formalName, currentPhone.name)}`;
        speakSingleAi(nextPrompt, selectedLanguage);
      }
    }, 500);
  };

  // Navigate to Next Question & speak it with the ONE AI voice (requires an answer selection first)
  const handleNextQuestion = () => {
    if (!userAnswers[currentQuestionIdx]) {
      return;
    }
    if (currentQuestionIdx >= activeScript.questions.length - 1) {
      finishRecording(secondsElapsed);
    } else {
      const nextIdx = currentQuestionIdx + 1;
      setCurrentQuestionIdx(nextIdx);
      setCallTurn('ai_asking');
      playAudioEffect('chime');
      const formalName = getFormalUserName(user?.name);
      const nextQ = activeScript.questions[nextIdx];
      speakSingleAi(nextQ.voiceText(formalName, currentPhone.name), selectedLanguage);
    }
  };

  // Navigate to Previous Question
  const handlePrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      const prevIdx = currentQuestionIdx - 1;
      setCurrentQuestionIdx(prevIdx);
      setCallTurn('ai_asking');
      playAudioEffect('click');
      const formalName = getFormalUserName(user?.name);
      const prevQ = activeScript.questions[prevIdx];
      speakSingleAi(prevQ.voiceText(formalName, currentPhone.name), selectedLanguage);
    }
  };

  // Jump directly to any of the 21 questions from the directory
  const jumpToQuestion = (targetIdx: number) => {
    if (targetIdx >= 0 && targetIdx < activeScript.questions.length) {
      setCurrentQuestionIdx(targetIdx);
      setCallTurn('ai_asking');
      setShowQuestionDirectory(false);
      playAudioEffect('click');
      const formalName = getFormalUserName(user?.name);
      const targetQ = activeScript.questions[targetIdx];
      speakSingleAi(targetQ.voiceText(formalName, currentPhone.name), selectedLanguage);
    }
  };

  // Replay current question voice with the ONE AI
  const handleReplayQuestion = () => {
    unlockAudioContext();
    playAudioEffect('click');
    setCallTurn('ai_asking');
    const formalName = getFormalUserName(user?.name);
    const currentQ = activeScript.questions[currentQuestionIdx];
    speakSingleAi(currentQ.voiceText(formalName, currentPhone.name), selectedLanguage);
  };

  // Start recording session: Fun 3-2-1 Clapperboard countdown -> AI greeting with Mrs./Mr. name & Question 1!
  const startRecordingSession = () => {
    if (!user?.isLoggedIn) {
      onOpenGoogleAuth('login');
      return;
    }
    if (!termsAccepted) {
      setTermsHighlightAlert(true);
      setShowTermsModal(true);
      playAudioEffect('click');
      return;
    }
    unlockAudioContext();
    playAudioEffect('clapper');
    setClapperCountdown(3);

    // Ensure camera is running
    if (!isCameraStreaming && cameraSource === 'webcam') {
      startPhysicalCamera(useFrontCamera);
    }

    setTimeout(() => {
      setClapperCountdown(2);
      playAudioEffect('click');
    }, 450);

    setTimeout(() => {
      setClapperCountdown(1);
      playAudioEffect('click');
    }, 900);

    setTimeout(() => {
      setClapperCountdown(0); // 0 = ACTION!
      playAudioEffect('clapper');

      setTimeout(() => setClapperCountdown(null), 650);

      setRecState('recording');
      setCallTurn('ai_asking');
      setSecondsElapsed(0);
      setCurrentQuestionIdx(0);
      setCapturedPhotos([]);

      // Stop mic listening so audio channel is completely unhindered for AI voice
      stopVoiceListening();

      // 1. Instant Zero-Delay Voice Greeting with Salutation (Mrs./Mr.) & Question 1
      const formalGreeting = getFormalUserName(customReviewerName || user?.name);
      const q1 = activeScript.questions[0];
      const q1Prompt = q1.voiceText(formalGreeting, currentPhone.name);

      let fullWelcomeGreeting = '';
      if (selectedLanguage === 'ne' || selectedLanguage === 'ne-en') {
        fullWelcomeGreeting = `${formalGreeting}, dot भिडियो रिभ्यु स्टुडियोमा स्वागत छ! तपाईंको ${currentPhone.name} को सबै २० मुख्य फिचर्स र पोटेन्सियलको रिभ्यु सुरु गरौँ। पहिलो प्रश्न: ${q1Prompt}`;
      } else if (selectedLanguage === 'hi') {
        fullWelcomeGreeting = `${formalGreeting}, dot वीडियो रिव्यू स्टूडियो में आपका हार्दिक स्वागत है! आपके ${currentPhone.name} के सभी 20 फीचर्स और पोटेंशियल का रिव्यू शुरू करते हैं। पहला सवाल: ${q1Prompt}`;
      } else {
        fullWelcomeGreeting = `Namaste ${formalGreeting}! Welcome to the ${currentPhone.name} review studio! Let's examine all 20 questions on this mobile's potential and looks. Question 1: ${q1Prompt}`;
      }

      speakSingleAi(fullWelcomeGreeting, selectedLanguage);
    }, 1350);
  };

  const nextQuestion = handleNextQuestion;
  const replayCurrentQuestionVoice = handleReplayQuestion;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const renderRecorder = () => {
    return (
      <Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-400">Loading video studio...</div>}>
        <TikTokCameraStudio
          user={user}
          currentPhone={currentPhone}
          selectedLanguage={selectedLanguage}
          onChangeLanguage={setSelectedLanguage}
          selectedVoiceTone={selectedVoiceTone}
          onChangeVoiceTone={setSelectedVoiceTone}
          recordingAtmosphere={recordingAtmosphere}
          onChangeAtmosphere={handleSelectAtmosphere}
          activeGender={activeGender}
          activeTitle={activeTitle}
          onChangeGender={handleGenderChange}
          onChangeTitle={handleTitleChange}
          customReviewerName={customReviewerName}
          onChangeReviewerName={(name) => {
            setCustomReviewerName(name);
            onUpdateUser({ name });
          }}
          detectedSpecs={detectedSpecs}
          termsAccepted={termsAccepted}
          onToggleTerms={handleToggleTerms}
          hidePhoneModelInReview={hidePhoneModelInReview}
          onToggleHidePhoneModel={setHidePhoneModelInReview}
          onFinishRecording={(reviewData) => {
            setDraftReview(reviewData);
            if (reviewData.allAnswers) {
              setUserAnswers(reviewData.allAnswers);
            }
            setShowVideoPreviewModal(true);
            go('review');
          }}
          onExit={() => go('detail')}
          onOpenPhoneSelector={() => setIsPhoneSelectorOpen(true)}
          onUpdateUser={onUpdateUser}
          playAudioEffect={playAudioEffect}
        />
      </Suspense>
    );
  };

  /* =========================================================================
   * SCREEN 5: CHECK & SEND (REVIEW WITH PLAYABLE VIDEO + ALL Q&A PREVIEW)
   * ========================================================================= */
  const [starsRating, setStarsRating] = useState<number>(5);

  // Reusable submit handler shared by Campaign Detail, Check & Send, and Video Preview Modal
  const submitCurrentDraftFeedback = async () => {
    if (!user?.isLoggedIn || !auth.currentUser) {
      onOpenGoogleAuth('login');
      return;
    }
    setSubmissionError(null);
    setCampaignSubmitNotice(null);
    setIsSubmittingReview(true);
    setSubmissionStatusMsg('Saving verified review to Cloud Firestore...');

    const mergedAnswers: Record<number, string> = {
      ...(draftReview?.allAnswers || {}),
      ...(userAnswers || {}),
    };
    const allAnswersCombined = Object.values(mergedAnswers).join(' ').toLowerCase();
    const sentimentScore = Math.min(100, Math.max(20, starsRating * 19 + 5));
    const sentiment: 'positive' | 'neutral' | 'mixed' | 'negative' =
      starsRating >= 4 ? 'positive' : starsRating === 3 ? 'neutral' : 'negative';
    const sentimentTone =
      starsRating >= 5
        ? 'Delighted & Satisfied'
        : starsRating === 4
        ? 'Positive & Constructive'
        : starsRating === 3
        ? 'Balanced & Neutral'
        : 'Critical & Needs Improvement';
    const sentimentSummary = `Verified reviewer rated ${currentPhone.name} ${starsRating}/5 stars.`;
    const derivedTags = [
      allAnswersCombined.includes('camera') ? 'Camera' : null,
      allAnswersCombined.includes('battery') || allAnswersCombined.includes('charg') ? 'Battery' : null,
      allAnswersCombined.includes('heat') || allAnswersCombined.includes('bug') ? 'Thermal / Bug' : null,
      allAnswersCombined.includes('display') || allAnswersCombined.includes('screen') ? 'Display' : null,
      'UX',
      'Verified Review',
    ].filter((t): t is string => Boolean(t)).slice(0, 6);

    const bLower = currentPhone.brand.toLowerCase();
    const nLower = currentPhone.name.toLowerCase();
    const brandFolder = (bLower === 'apple' || nLower.includes('iphone')) ? 'iPhone (Models 1 to 18)' :
      (bLower === 'samsung' || nLower.includes('galaxy')) ? 'Samsung Galaxy (S1 to S25)' :
      (bLower === 'google' || nLower.includes('pixel')) ? 'Google Pixel' :
      bLower === 'oneplus' ? 'OnePlus' :
      ['xiaomi', 'poco', 'redmi'].includes(bLower) ? 'Xiaomi / Redmi / POCO' :
      ['vivo', 'iqoo'].includes(bLower) ? 'Vivo & iQOO' :
      ['oppo', 'realme'].includes(bLower) ? 'OPPO & Realme' :
      bLower === 'nothing' ? 'Nothing Phone' : 'Gaming & Others';

    const studioQuestions = get10CoreMobileQuestions(currentPhone, (draftReview?.language || selectedLanguage) as any);
    const transcriptLines = studioQuestions.map((q, idx) => {
      const cleanTitle = q.title
        .replace(/फोनको/g, `${currentPhone.name} को`)
        .replace(/फोन/g, currentPhone.name)
        .replace(/Phone/gi, currentPhone.name)
        .slice(0, 120);
      const ans = mergedAnswers[idx] || 'Not answered';
      return `Q${idx + 1} (${cleanTitle}): ${ans}`;
    });
    const compiledTranscript = (
      transcriptLines.length > 0
        ? transcriptLines.join('\n')
        : [
            `Liked: ${draftReview?.answers?.like || activeScript.questions[0].sampleText}`,
            `Friction: ${draftReview?.answers?.dislike || activeScript.questions[2].sampleText}`,
            `Comfort: ${draftReview?.answers?.comfort || activeScript.questions[3].sampleText}`,
            `Improvement: ${draftReview?.answers?.improve || 'Keep optimizing software updates.'}`,
          ].join('\n')
    ).slice(0, 2500);

    let uploadedVideoUrl: string | undefined = undefined;
    if (draftReview?.videoBlob instanceof Blob && draftReview.videoBlob.size > 0) {
      setSubmissionStatusMsg('Uploading recorded video...');
      const baseVideoMime = (draftReview.videoBlob.type || 'video/webm').split(';')[0].trim() || 'video/webm';
      try {
        const uploadResp = await fetch('/api/videos/upload', {
          method: 'POST',
          headers: {
            'Content-Type': baseVideoMime,
          },
          body: draftReview.videoBlob,
        });
        if (uploadResp.ok) {
          const uploadData = await uploadResp.json();
          if (uploadData?.videoUrl) {
            uploadedVideoUrl = String(uploadData.videoUrl);
          }
        } else {
          setMicNotice('Video file upload failed; your review transcript & data will still be saved.');
        }
      } catch {
        setMicNotice('Video file upload failed; your review transcript & data will still be saved.');
      }
    }

    setSubmissionStatusMsg('Saving verified review to Cloud Firestore...');

    const newRev: FeedbackItem = {
      id: `fb_${Date.now()}`,
      user: user.name || 'Reviewer',
      userEmail: user.email,
      userAvatar: user.avatar,
      age: 26,
      city: user.city || 'Nepal',
      phone: currentPhone.id,
      phoneName: currentPhone.name,
      phoneBrand: currentPhone.brand,
      rating: starsRating,
      time: 'Just now',
      like: draftReview?.answers?.like || mergedAnswers[3] || mergedAnswers[0] || activeScript.questions[0].sampleText,
      dislike: draftReview?.answers?.dislike || mergedAnswers[8] || activeScript.questions[2].sampleText,
      comfort: draftReview?.answers?.comfort || mergedAnswers[1] || activeScript.questions[3].sampleText,
      improve: draftReview?.answers?.improve || mergedAnswers[9] || 'Keep optimizing software updates.',
      seconds: draftReview?.seconds || TOTAL_RECORD_SECONDS,
      videoUrl: uploadedVideoUrl,
      transcriptText: compiledTranscript,
      fresh: true,
      status: 'Pending Moderation',
      moderationStatus: 'pending',
      payoutStatus: 'pending',
      rewardAmount: currentPhone.reward,
      productPhotos: draftReview?.productPhotos || [currentPhone.img],
      sentiment,
      sentimentScore,
      sentimentTone,
      sentimentSummary,
      brandFolder,
      tags: derivedTags,
      allAnswers: mergedAnswers as Record<string, string>,
      hidePhoneModel: hidePhoneModelInReview,
      verifiedDevice: detectedSpecs.verifiedBadge,
      privacyProtected: true,
      appVersion: 'v2.4.2 (Build #492)',
      osVersion: detectedSpecs.os || 'Mobile OS',
      defectStatus: 'open',
      cartData: {
        orderId: `ORD-FP-${Date.now().toString().slice(-5)}`,
        productName: `${currentPhone.brand} ${currentPhone.name}`,
        priceNPR: currentPhone.reward * 100,
        priceUSD: Math.round(currentPhone.reward * 0.75) + 399,
        purchaseDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        retailer: 'Verified Retailer',
        invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
        verifiedPurchase: true,
        appVersion: 'v2.4.2 (Build #492)',
        osVersion: detectedSpecs.os || 'Mobile OS',
      },
    };

    try {
      const saved = await onAddReview(newRev);
      const finalRev: FeedbackItem = {
        ...(saved || newRev),
        videoUrl: saved?.videoUrl || uploadedVideoUrl || draftReview?.videoUrl,
        transcriptText: saved?.transcriptText || compiledTranscript,
        allAnswers: (saved?.allAnswers || mergedAnswers) as Record<string, string>,
        productPhotos: saved?.productPhotos || newRev.productPhotos,
      };
      setLastSubmittedReview(finalRev);
      setDraftReview(null);
      setUserAnswers({});
      setShowVideoPreviewModal(false);
      pushConsumerNotification({
        id: `self-sub-${finalRev.id}-${Date.now()}`,
        title: 'Video Feedback Submitted',
        message: `${currentPhone.name} sent for Admin & Company review (+${rs(currentPhone.reward)} pending).`,
        category: 'submission',
        timestamp: Date.now(),
        read: false,
        targetScreen: 'myvideos',
      });
      triggerConfetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      go('success');
    } catch (err: any) {
      setSubmissionError(formatFirestoreErrorMessage(err, 'Could not save feedback to Cloud Firestore. Please try again.'));
    } finally {
      setIsSubmittingReview(false);
      setSubmissionStatusMsg('');
    }
  };

  // Helper to get all question/answer pairs for review or saved videos
  const getStudioQaPairs = () => {
    const lang = (draftReview?.language || selectedLanguage) as any;
    const qs = get10CoreMobileQuestions(currentPhone, lang);
    const merged: Record<number, string> = {
      ...(draftReview?.allAnswers || {}),
      ...(userAnswers || {}),
    };
    return qs.map((q, idx) => ({
      idx,
      k: q.k,
      title: q.title
        .replace(/फोनको/g, `${currentPhone.name} को`)
        .replace(/फोन/g, currentPhone.name)
        .replace(/Phone/gi, currentPhone.name),
      answer: merged[idx] || '',
      options: q.options || [],
    }));
  };

  const renderReview = () => {
    const qaPairs = getStudioQaPairs();
    const answeredTotal = qaPairs.filter((x) => Boolean(x.answer)).length;

    return (
      <div className="fp-screen" style={{ display: 'flex', flexDirection: 'column' }}>
        <TopBar onBack={() => go('record')} title="Check & send" />
        <div className="fp-scroll" style={{ flex: 1, padding: '0 20px 20px' }}>
          {/* Playable Recorded Video Preview */}
          <div
            className="fp-camera-dark-bg"
            style={{
              position: 'relative',
              height: 220,
              borderRadius: 24,
              overflow: 'hidden',
              background: '#000',
            }}
          >
            {draftReview?.videoUrl ? (
              <video
                src={draftReview.videoUrl}
                controls
                playsInline
                preload="metadata"
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              />
            ) : (
              <div
                onClick={() => setShowVideoPreviewModal(true)}
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-white/80 gap-2"
              >
                <div style={{ width: 56, height: 56, borderRadius: 99, background: 'rgba(255,255,255,0.9)', display: 'grid', placeItems: 'center' }}>
                  <Play className="w-6 h-6 text-neutral-900 fill-neutral-900 ml-0.5" />
                </div>
                <span className="text-xs font-bold">
                  {currentPhone.name} · {Math.floor((draftReview?.seconds || 0) / 60)}:{String((draftReview?.seconds || 0) % 60).padStart(2, '0')}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowVideoPreviewModal(true)}
              style={{ position: 'absolute', right: 10, top: 10, background: 'rgba(0,0,0,0.72)', color: '#fff', padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}
              className="cursor-pointer hover:bg-black transition-colors border border-white/20"
            >
              Full Preview ↗
            </button>
          </div>

          {/* Auto-Detected Hardware & Privacy Settings Card */}
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 18, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }} className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Auto-Detected Device Authenticity</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-800 border border-emerald-600/30">
                Verified ✓
              </span>
            </div>

            <div className="font-mono text-xs text-neutral-800 bg-white/80 p-2 rounded-xl border border-emerald-500/20 shadow-xs">
              {detectedSpecs.verifiedBadge}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-600/15 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800 select-none">
                <input
                  type="checkbox"
                  checked={hidePhoneModelInReview}
                  onChange={(e) => setHidePhoneModelInReview(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                />
                <span>Hide phone model in public company review</span>
              </label>
              <button
                type="button"
                onClick={() => setShowVideoPreviewModal(true)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-extrabold underline shrink-0 cursor-pointer"
              >
                Preview Video & All Q&A →
              </button>
            </div>
          </div>

          {/* Captured Product Photos Strip */}
          {draftReview?.productPhotos && draftReview.productPhotos.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 'calc(15px * var(--fs))', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Camera Photos of {currentPhone.name} ({draftReview.productPhotos.length})</span>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {draftReview.productPhotos.map((photoUrl: string, idx: number) => (
                  <img
                    key={idx}
                    src={photoUrl}
                    alt={`Product Shot ${idx + 1}`}
                    style={{ width: 82, height: 82, borderRadius: 14, objectFit: 'cover', border: '1px solid var(--line)', boxShadow: '0 4px 10px rgba(0,0,0,0.06)' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stars Picker */}
          <div style={{ marginTop: 18, fontWeight: 800, fontSize: 'calc(18px * var(--fs))' }}>
            How many stars?
          </div>
          <div style={{ marginTop: 6, marginLeft: -4 }}>
            <StarPicker value={starsRating} onChange={setStarsRating} />
          </div>

          {/* All Questions & Answers Preview with Video */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 'calc(18px * var(--fs))' }}>
                All Questions & Answers Preview
              </div>
              <div style={{ color: 'var(--ink2)', fontSize: 'calc(13.5px * var(--fs))', marginTop: 2 }}>
                {answeredTotal} of {qaPairs.length} questions answered · Tap an answer below to update before sending
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {qaPairs.map((item) => (
              <div
                key={item.k}
                style={{
                  background: '#fff',
                  border: '1px solid var(--line)',
                  borderRadius: 18,
                  padding: '12px 14px',
                  textAlign: 'left',
                }}
              >
                <div className="flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-[11px] shrink-0">
                    Q{item.idx + 1}
                  </span>
                  <div className="font-bold text-xs sm:text-sm text-neutral-900 leading-snug">
                    {item.title}
                  </div>
                </div>

                <div className="mt-2 px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs sm:text-sm font-semibold text-neutral-900">
                  {item.answer ? `“${item.answer}”` : <span className="text-neutral-500 italic">Not selected yet — choose below or answer in video</span>}
                </div>

                {item.options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.options.map((opt) => {
                      const isSel = item.answer === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setUserAnswers((prev) => ({ ...prev, [item.idx]: opt }));
                            setDraftReview((prev: any) =>
                              prev
                                ? {
                                    ...prev,
                                    allAnswers: { ...(prev.allAnswers || {}), [item.idx]: opt },
                                  }
                                : prev
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {submissionError && (
          <div className="mx-5 mb-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{submissionError}</span>
          </div>
        )}

        {micNotice && (
          <div className="mx-5 mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            {micNotice}
          </div>
        )}

        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--line)', background: 'var(--paper)', display: 'flex', gap: 10 }}>
          <button className="fp-btn fp-btn-outline" style={{ flex: '0 0 auto', width: 'auto', padding: '0 18px' }} onClick={() => go('record')}>
            Redo
          </button>
          <button
            className="fp-btn fp-btn-dark flex items-center justify-center gap-2 cursor-pointer"
            disabled={isSubmittingReview}
            onClick={submitCurrentDraftFeedback}
          >
            {isSubmittingReview ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{submissionStatusMsg || 'Saving to Firestore...'}</span>
              </>
            ) : (
              <span>Send & get {rs(currentPhone.reward)}</span>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Shared helper to extract all Question & Answer pairs for submitted feedback
  const parseFeedbackQaList = (item: FeedbackItem) => {
    const p = phoneById(item.phone);
    if (item.allAnswers && Object.keys(item.allAnswers).length > 0) {
      const qs = get10CoreMobileQuestions(p, 'en');
      return Object.entries(item.allAnswers)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([k, val]) => {
          const idx = Number(k);
          const qObj = !Number.isNaN(idx) ? qs[idx] : undefined;
          return {
            tag: !Number.isNaN(idx) ? `Q${idx + 1}` : `Q`,
            question: qObj ? qObj.title.replace(/Phone/gi, p.name) : `Question ${idx + 1}`,
            answer: String(val || '—'),
          };
        });
    }
    if (item.transcriptText && item.transcriptText.trim().length > 0) {
      return item.transcriptText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, i) => {
          const m = line.match(/^(Q\d+)\s*\((.+?)\):\s*(.*)$/);
          if (m) {
            return { tag: m[1], question: m[2], answer: m[3] || '—' };
          }
          const colon = line.indexOf(':');
          return {
            tag: `Q${i + 1}`,
            question: colon > 0 ? line.slice(0, colon) : `Response ${i + 1}`,
            answer: colon > 0 ? line.slice(colon + 1).trim() : line,
          };
        });
    }
    return [
      { tag: 'Q1', question: 'What Was Loved', answer: item.like },
      { tag: 'Q2', question: 'Comfort & Handling', answer: item.comfort },
      { tag: 'Q3', question: 'Reported Friction', answer: item.dislike },
      { tag: 'Q4', question: 'Suggested Improvement', answer: item.improve },
    ].filter((x) => Boolean(x.answer));
  };

  /* =========================================================================
   * SCREEN 6: SUCCESS (MONEY EARNED)
   * ========================================================================= */
  const renderSuccess = () => {
    const submittedQa = lastSubmittedReview ? parseFeedbackQaList(lastSubmittedReview) : [];
    const showSuccessQa = Boolean(lastSubmittedReview && expandedVideoQaId === lastSubmittedReview.id);

    return (
      <div className="fp-screen fp-scroll" style={{ background: '#0F172A', color: '#fff', padding: '24px 20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <div style={{ width: 80, height: 80, borderRadius: 99, background: '#F59E0B', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 20px 40px rgba(0,0,0,.35)' }} className="fp-pop">
            <Clock className="w-10 h-10 stroke-[3]" />
          </div>

          <div style={{ fontFamily: 'var(--display)', fontSize: 'calc(28px * var(--fs))', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 4 }}>
            Review Submitted for<br />Company Moderation!
          </div>

          <p style={{ fontSize: 'calc(14.5px * var(--fs))', lineHeight: 1.4, color: 'rgba(255,255,255,.85)', maxWidth: 290 }}>
            Your video review for <b>{currentPhone.name}</b> has been queued for brand verification.
          </p>

          {/* Payout Pending Card */}
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', borderRadius: 20, padding: '12px 18px', border: '1px solid rgba(245, 158, 11, 0.4)', width: '100%', maxWidth: 340 }}>
            <div style={{ fontSize: 'calc(12px * var(--fs))', color: '#FCD34D', fontWeight: 700 }}>Reward Release on Approval</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 'calc(30px * var(--fs))', fontWeight: 800, marginTop: 2, color: '#FDE68A' }}>
              +{rs(currentPhone.reward)}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>
              Automatically credited to your wallet once approved by brand managers.
            </div>
          </div>

          {/* Submitted Video & All Q&A Preview Actions */}
          {lastSubmittedReview && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.22)', width: '100%', maxWidth: 340, textAlign: 'left' }}>
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-emerald-300">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Submitted Feedback Record</span>
                <span className="bg-emerald-400 text-neutral-950 px-2 py-0.5 rounded-full font-black text-xs shadow-xs tabular-nums">
                  {lastSubmittedReview.sentimentScore ?? 92}%
                </span>
              </div>

              {lastSubmittedReview.videoUrl && (
                <div className="mt-2.5 rounded-xl overflow-hidden bg-black aspect-video border border-white/15">
                  <video
                    src={lastSubmittedReview.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain bg-black"
                  />
                </div>
              )}

              <div className="text-xs font-semibold text-white/95 mt-2 leading-snug">
                "{lastSubmittedReview.sentimentSummary}"
              </div>
              <div className="text-[11px] text-white/75 mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                <span>{lastSubmittedReview.videoUrl ? 'Recorded video saved' : 'Feedback transcript saved'} · {submittedQa.length} Q&A</span>
                <span className="font-mono">{lastSubmittedReview.rating}/5 ★</span>
              </div>

              {showSuccessQa && submittedQa.length > 0 && (
                <div className="mt-2.5 space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {submittedQa.map((qa, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-white/10 border border-white/15 text-xs">
                      <div className="text-white/75 font-semibold">
                        <span className="font-mono font-bold text-emerald-300 mr-1.5">{qa.tag}</span>
                        {qa.question}
                      </div>
                      <div className="text-white font-bold mt-0.5">{qa.answer}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                <button
                  type="button"
                  onClick={() => onOpenVideoModal(lastSubmittedReview, 'summary')}
                  className="py-2 px-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenVideoModal(lastSubmittedReview, 'transcript')}
                  className="py-2 px-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <FileText className="w-3 h-3 text-sky-300" />
                  <span>Full Q&A</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedVideoQaId(showSuccessQa ? null : lastSubmittedReview.id)}
                  className="py-2 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-bold text-[11px] cursor-pointer transition-colors whitespace-nowrap"
                >
                  {showSuccessQa ? 'Hide Q&A' : `Q&A (${submittedQa.length})`}
                </button>
              </div>
            </div>
          )}

          {/* Review Verification Status */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.15)', width: '100%', maxWidth: 340, textAlign: 'left' }}>
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
              Verification Status
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-emerald-300">
                <span className="flex items-center gap-1.5">✓ Questions & Video Completed</span>
                <span className="font-bold">Pass</span>
              </div>
              <div className="flex items-center justify-between text-emerald-300">
                <span className="flex items-center gap-1.5">✓ Hardware Authenticity</span>
                <span className="font-bold">Verified</span>
              </div>
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span className="flex items-center gap-1.5">Brand Content Moderation</span>
                <span className="text-[11px] font-bold text-amber-200">In Queue</span>
              </div>
            </div>
          </div>

          {/* Verified Device & Privacy Status Badge */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.18)', width: '100%', maxWidth: 340, textAlign: 'left' }}>
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-emerald-300">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Device Verified</span>
              <span className="bg-emerald-400 text-neutral-950 px-2 py-0.5 rounded-full font-black text-[10px]">100% Legit</span>
            </div>
            <div className="text-[11px] font-mono text-white/90 mt-1 truncate">
              {detectedSpecs.verifiedBadge}
            </div>
          </div>
        </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="fp-btn fp-btn-light" onClick={() => go('wallet')}>
          <Wallet className="w-5 h-5 text-neutral-900" />
          <span>View my wallet</span>
        </button>

        <button
          className="fp-btn"
          style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}
          onClick={() => go('myvideos')}
        >
          <Video className="w-5 h-5 text-sky-300" />
          <span>My Submitted Videos & Data</span>
        </button>

        <button className="fp-btn fp-btn-ghost-dark" onClick={() => go('home')}>
          Review another phone
        </button>
      </div>
    </div>
    );
  };

  /* =========================================================================
   * SCREEN 7: WALLET
   * ========================================================================= */
  const renderWallet = () => (
    <div className="fp-screen fp-scroll">
      <TopBar title="My wallet" />
      <div style={{ margin: '0 20px', borderRadius: 28, background: 'var(--ink)', color: '#fff', padding: 22 }}>
        <div style={{ fontSize: 'calc(15px * var(--fs))', color: 'rgba(255,255,255,.65)' }}>Money you can withdraw</div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 'calc(44px * var(--fs))', fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4 }}>
          {rs(user.walletBalance)}
        </div>

        <button
          className="fp-btn"
          style={{ marginTop: 16, background: 'var(--money)', color: '#fff' }}
          onClick={() => go('withdraw')}
          disabled={user.walletBalance < 100}
        >
          <Download className="w-5 h-5" /> Take out money
        </button>

        <div style={{ fontSize: 'calc(13px * var(--fs))', color: 'rgba(255,255,255,.55)', marginTop: 10, textAlign: 'center' }}>
          Minimum Rs 100 · 100% No fee for you (Company pays 5% platform cost)
        </div>
      </div>

      <div style={{ padding: '22px 20px 8px', fontWeight: 800, fontSize: 'calc(18px * var(--fs))' }}>
        History
      </div>
      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {walletHistory.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: '18px 14px', textAlign: 'center', color: 'var(--ink2)', fontSize: 'calc(13px * var(--fs))' }}>
            No wallet transactions yet. Record your first smartphone video review to start earning.
          </div>
        ) : (
          walletHistory.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: '12px 14px' }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: 'grid',
                  placeItems: 'center',
                  background: h.kind === 'credited' ? 'var(--moneyTint)' : 'var(--paper2)',
                  color: h.kind === 'credited' ? 'var(--money)' : h.kind === 'pending_credit' ? '#b45309' : 'var(--ink)',
                }}
              >
                {h.kind === 'withdrawal' ? <Download className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 'calc(15px * var(--fs))' }}>{h.title}</div>
                <div style={{ color: 'var(--ink2)', fontSize: 'calc(13px * var(--fs))' }}>{h.when}</div>
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 'calc(16px * var(--fs))',
                  color:
                    h.kind === 'credited'
                      ? 'var(--money)'
                      : h.kind === 'pending_credit'
                      ? '#b45309'
                      : h.kind === 'rejected'
                      ? '#94a3b8'
                      : 'var(--ink)',
                }}
              >
                {h.kind === 'credited'
                  ? `+ ${rs(Math.abs(h.amt))}`
                  : h.kind === 'pending_credit'
                  ? `${rs(Math.abs(h.amt))} pending`
                  : h.kind === 'rejected'
                  ? 'Rs 0'
                  : `− ${rs(Math.abs(h.amt))}`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  /* =========================================================================
   * SCREEN 8: WITHDRAW (TAKE OUT MONEY WITH 5% MATH BREAKDOWN)
   * ========================================================================= */
  const [selectedGateway, setSelectedGateway] = useState<string>('esewa');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const userBalance = user?.walletBalance ?? 0;
  const [withdrawAmount, setWithdrawAmount] = useState<number>(Math.min(100, userBalance));
  const [withdrawDone, setWithdrawDone] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  useEffect(() => {
    if (userBalance > 0 && (withdrawAmount <= 0 || withdrawAmount > userBalance)) {
      setWithdrawAmount(Math.min(100, userBalance));
    } else if (userBalance === 0 && withdrawAmount !== 0) {
      setWithdrawAmount(0);
    }
  }, [userBalance]);

  const gw = GATEWAYS.find((x) => x.id === selectedGateway) || GATEWAYS[0];
  const quickAmounts = [100, 200, 300, userBalance].filter((v, idx, arr) => v > 0 && v <= userBalance && arr.indexOf(v) === idx);
  const company5PercentFee = withdrawAmount * 0.05;
  const totalCompanyCharge = withdrawAmount + company5PercentFee;

  const renderWithdraw = () => {
    if (withdrawDone) {
      return (
        <div className="fp-screen" style={{ background: '#fff', padding: '30px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 99, background: 'var(--moneyTint)', color: 'var(--money)', display: 'grid', placeItems: 'center' }}>
            <Check className="w-10 h-10 stroke-[3.5]" />
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 'calc(28px * var(--fs))', fontWeight: 800, marginTop: 16 }}>
            {rs(withdrawAmount)} Requested!
          </div>
          <p style={{ color: 'var(--ink2)', fontSize: 'calc(16px * var(--fs))', marginTop: 8 }}>
            Withdrawal to your <b>{gw.name}</b> account (<b>{accountNumber}</b>) is saved in Firestore and queued for payout.
          </p>

          <div style={{ width: '100%', background: 'var(--paper)', borderRadius: 18, padding: 16, marginTop: 20, textAlign: 'left', border: '1px solid var(--line)' }}>
            <div className="flex justify-between text-sm py-1"><span>Net amount requested</span><b className="text-emerald-700">{rs(withdrawAmount)}</b></div>
            <div className="flex justify-between text-xs py-1 text-neutral-500"><span>5% processing cost</span><span>{rs(company5PercentFee)} (covered by company)</span></div>
            <div className="flex justify-between text-xs py-1 text-neutral-500"><span>Your deduction</span><span>Rs 0.00</span></div>
          </div>

          <button className="fp-btn fp-btn-dark" style={{ marginTop: 24 }} onClick={() => { setWithdrawDone(false); go('wallet'); }}>
            Back to Wallet
          </button>
        </div>
      );
    }

    return (
      <div className="fp-screen" style={{ display: 'flex', flexDirection: 'column' }}>
        <TopBar title="Take out money" onBack={() => go('wallet')} />
        <div className="fp-scroll" style={{ flex: 1, padding: '0 20px 20px' }}>
          <div style={{ fontWeight: 800, fontSize: 'calc(16px * var(--fs))' }}>
            1. Where should we send it?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            {GATEWAYS.map((x) => (
              <button
                key={x.id}
                onClick={() => {
                  setSelectedGateway(x.id);
                  setWithdrawError(null);
                }}
                className="fp-gw"
                data-on={selectedGateway === x.id}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: x.bg,
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  {x.mark}
                </span>
                <span style={{ textAlign: 'left' }}>
                  <span style={{ display: 'block', fontWeight: 800, fontSize: 'calc(15px * var(--fs))' }}>{x.name}</span>
                  <span style={{ display: 'block', color: 'var(--ink2)', fontSize: 'calc(12px * var(--fs))' }}>{x.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <div style={{ fontWeight: 800, fontSize: 'calc(16px * var(--fs))', marginTop: 20 }}>
            2. {gw.field}
          </div>
          <input
            className="fp-input"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder={gw.val}
          />

          <div style={{ fontWeight: 800, fontSize: 'calc(16px * var(--fs))', marginTop: 20 }}>
            3. How much? (Available: {rs(user.walletBalance)})
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {quickAmounts.map((v) => (
              <button
                key={v}
                className="fp-chip"
                data-on={withdrawAmount === v}
                onClick={() => setWithdrawAmount(v)}
              >
                {v === user.walletBalance ? 'All' : rs(v)}
              </button>
            ))}
          </div>

          {withdrawError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{withdrawError}</span>
            </div>
          )}

          {/* 5% Math Engine Breakdown Box */}
          <div style={{ marginTop: 18, background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 16, fontSize: 'calc(15px * var(--fs))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>You receive net</span>
              <b style={{ color: 'var(--money)', fontSize: 'calc(18px * var(--fs))' }}>{rs(withdrawAmount)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: 'var(--ink2)' }}>
              <span>Service fee (5%)</span>
              <span>{rs(company5PercentFee)} · paid by company</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: 'var(--ink2)', fontSize: 'calc(13px * var(--fs))' }}>
              <span>Total company charge</span>
              <span>{rs(totalCompanyCharge)}</span>
            </div>
            <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--money)', fontWeight: 800 }}>
              <span>Reviewer payout fee</span>
              <span>Rs 0 (Free)</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
          <button
            className="fp-btn fp-btn-dark flex items-center justify-center gap-2"
            disabled={isWithdrawing || !withdrawAmount || withdrawAmount < 100 || withdrawAmount > user.walletBalance || accountNumber.trim().length < 3}
            onClick={async () => {
              if (!auth.currentUser) {
                setWithdrawError('Please sign in with Google first.');
                return;
              }
              setIsWithdrawing(true);
              setWithdrawError(null);
              try {
                const req = await requestRealWithdrawalBatch({
                  uid: auth.currentUser.uid,
                  userName: user.name || 'Reviewer',
                  gateway: gw.name,
                  accountNumber,
                  amountNPR: withdrawAmount,
                });
                const tx: WithdrawalTransaction = {
                  id: req.id,
                  title: `Sent to ${gw.name}`,
                  gateway: gw.name,
                  accountNumber: req.accountNumber,
                  amount: req.amountNPR,
                  companyProcessingFee: req.companyFeeNPR,
                  totalCompanyCharge: req.amountNPR + req.companyFeeNPR,
                  userFee: 0,
                  when: 'Just now',
                  status: 'Pending',
                  referenceId: req.referenceId || '',
                  currency: 'NPR',
                };
                onAddWithdrawal(tx);
                setWithdrawDone(true);
              } catch (err: unknown) {
                setWithdrawError(formatFirestoreErrorMessage(err, 'Unable to process withdrawal request.'));
              } finally {
                setIsWithdrawing(false);
              }
            }}
          >
            {isWithdrawing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Request...</span>
              </>
            ) : (
              <span>Send {rs(withdrawAmount)} to {gw.name}</span>
            )}
          </button>
        </div>
      </div>
    );
  };

  /* =========================================================================
   * SCREEN 9: MY VIDEOS (WITH ALL QUESTIONS & ANSWERS INLINE PREVIEW)
   * ========================================================================= */
  const renderMyVideos = () => (
    <div className="fp-screen fp-scroll">
      <TopBar title="My videos" />
      {myVideosList.length === 0 ? (
        <div style={{ padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, margin: '0 auto', borderRadius: 99, background: 'var(--paper2)', display: 'grid', placeItems: 'center' }}>
            <Video className="w-10 h-10 text-neutral-600" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 'calc(20px * var(--fs))', marginTop: 16 }}>No videos yet</div>
          <div style={{ color: 'var(--ink2)', fontSize: 'calc(15px * var(--fs))', marginTop: 6 }}>
            Pick your phone and record a video review to earn money.
          </div>
          <button className="fp-btn fp-btn-rec" style={{ marginTop: 20 }} onClick={() => go('home')}>
            Record my first video
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myVideosList.map((r, i) => {
            const p = phoneById(r.phone);
            const rewardAmt = r.rewardAmount || p.reward || 150;
            const status = r.moderationStatus || 'approved';
            const qaList = parseFeedbackQaList(r);
            const isQaExpanded = expandedVideoQaId === r.id;

            return (
              <div
                key={r.id || i}
                style={{
                  background: '#fff',
                  border: status === 'rejected' ? '1px solid #FECDD3' : status === 'pending' ? '1px solid #FDE68A' : '1px solid var(--line)',
                  borderRadius: 20,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
                className="hover:shadow-md transition-shadow"
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div
                    onClick={() => onOpenVideoModal(r, 'summary')}
                    className="fp-camera-dark-bg cursor-pointer group overflow-hidden"
                    style={{ width: 68, height: 80, borderRadius: 14, display: 'grid', placeItems: 'center', flexShrink: 0, position: 'relative' }}
                    title="Watch recorded video"
                  >
                    {r.videoUrl && (
                      <video
                        src={`${r.videoUrl}#t=0.2`}
                        muted
                        playsInline
                        preload="metadata"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    <div className="relative z-10 w-8 h-8 rounded-full bg-black/55 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white ml-0.5 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 'calc(16px * var(--fs))', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{r.hidePhoneModel ? `Verified ${p.brand} Phone` : p.name}</span>
                      {r.hidePhoneModel && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                          Model Private
                        </span>
                      )}
                      {r.videoUrl && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                          Video Saved
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <StarPicker value={r.rating} size={15} />
                    </div>
                    <div style={{ color: 'var(--ink2)', fontSize: 'calc(12px * var(--fs))', marginTop: 3 }}>
                      {r.time} · {Math.floor(r.seconds / 60)}:{String(r.seconds % 60).padStart(2, '0')} · {qaList.length} Q&A
                    </div>
                  </div>

                  {/* Status & Payout Column */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontWeight: 800,
                      color: status === 'approved' ? 'var(--money)' : status === 'pending' ? '#D97706' : '#E11D48',
                      fontSize: 'calc(16px * var(--fs))'
                    }}>
                      {status === 'approved' ? `+${rs(rewardAmt)}` : status === 'pending' ? rs(rewardAmt) : 'Withheld'}
                    </div>

                    <div className="mt-1">
                      {status === 'pending' && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          ⏳ In Review
                        </span>
                      )}
                      {status === 'approved' && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Credited
                        </span>
                      )}
                      {status === 'rejected' && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          ✕ Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rejection Details & Re-record Action */}
                {status === 'rejected' && (
                  <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 12, padding: '10px 12px', fontSize: 'calc(12px * var(--fs))' }}>
                    <div className="flex items-center gap-1.5 font-bold text-rose-900">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Company Reason for Rejection:</span>
                    </div>
                    <div className="text-rose-800 mt-1 italic font-medium">
                      "{r.moderationReason || 'Video quality or answers do not meet the minimum clarity guidelines.'}"
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] text-rose-600">
                        {r.moderatedBy ? `Moderated by ${r.moderatedBy}` : 'Please re-record to earn reward'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPhoneId(r.phone);
                          go('record');
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-record Video</span>
                      </button>
                    </div>
                  </div>
                )}

                {status === 'pending' && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '8px 12px', fontSize: 'calc(12px * var(--fs))', color: '#92400E' }} className="flex items-center justify-between">
                    <span>Awaiting brand review. Reward will release to your wallet once approved.</span>
                  </div>
                )}

                {/* Inline Expandable All Questions & Answers Preview */}
                {isQaExpanded && qaList.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-left">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      All Questions & Answers ({qaList.length})
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {qaList.map((qa, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-white border border-slate-200/80 text-xs">
                          <div className="font-semibold text-slate-600">
                            <span className="font-mono font-bold text-indigo-600 mr-1.5">{qa.tag}</span>
                            {qa.question}
                          </div>
                          <div className="font-bold text-slate-900 mt-1">
                            {qa.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Preview Controls: Video, Data & Inline Q&A */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onOpenVideoModal(r, 'summary')}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Preview Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenVideoModal(r, 'transcript')}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>All Q&A Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedVideoQaId(isQaExpanded ? null : r.id)}
                    className="py-2 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
                  >
                    {isQaExpanded ? 'Hide Q&A' : `View ${qaList.length}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* =========================================================================
   * SCREEN 10: ME / SETTINGS (PROFILE & ACCESSIBILITY)
   * ========================================================================= */
  const [showPrivacyNotice, setShowPrivacyNotice] = useState<boolean>(false);

  const renderProfile = () => {
    const profileRows = [
      { 
        id: 'edit_profile', 
        label: 'Edit Photo & Nickname', 
        val: user?.nickname ? `@${user.nickname.replace(/^@/, '')}` : 'Camera / Gallery', 
        action: () => (onOpenProfile ? onOpenProfile() : setShowEditProfileModal(true)) 
      },
      { id: 'text', label: 'Text size', val: textSize, action: onCycleTextSize },
      { id: 'wallet', label: 'Payment account', val: transactions?.[0] ? `${transactions[0].gateway} · ${transactions[0].accountNumber}` : 'Add on withdraw', action: () => go('withdraw') },
      { id: 'google', label: 'Google & Mobile Identity', val: user?.phone ? `+977 ${user.phone}` : (user?.email || 'Not connected'), action: () => onOpenGoogleAuth('profile') },
      { id: 'privacy', label: 'Data Privacy', val: 'Protected & Encrypted', action: () => setShowPrivacyNotice(!showPrivacyNotice) },
      { id: 'logout', label: 'Sign out', val: '', action: () => (onLogout ? onLogout() : go('welcome')) },
    ];

    return (
      <div className="fp-screen fp-scroll">
        <TopBar title="Me" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px 18px' }}>
          <button
            type="button"
            onClick={() => (onOpenProfile ? onOpenProfile() : setShowEditProfileModal(true))}
            className="relative group cursor-pointer shrink-0"
            title="Click to change profile picture via camera or gallery"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name || 'User'}
                style={{ width: 68, height: 68, borderRadius: 99, objectFit: 'cover' }}
                className="ring-2 ring-purple-500/40 group-hover:ring-purple-600 transition-all shadow-md"
              />
            ) : (
              <div
                style={{ width: 68, height: 68, borderRadius: 99, background: 'var(--rec)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26 }}
                className="shadow-md"
              >
                {(user?.name || 'U').charAt(0)}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#17002e] border-2 border-white text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Camera className="w-3.5 h-3.5 text-purple-300" />
            </div>
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div style={{ fontWeight: 800, fontSize: 'calc(19px * var(--fs))' }}>{user?.name || 'Reviewer'}</div>
              {user?.nickname && (
                <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full border border-purple-200">
                  @{user.nickname.replace(/^@/, '')}
                </span>
              )}
            </div>
            <div style={{ color: 'var(--ink2)', fontSize: 'calc(13.5px * var(--fs))' }}>{user?.email || ''}</div>
            
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => (onOpenProfile ? onOpenProfile() : setShowEditProfileModal(true))}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-[#17002e] via-[#350854] to-[#17002e] hover:brightness-110 text-white text-[11px] font-black shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Camera className="w-3 h-3 text-purple-200" />
                <span>Edit Photo & Nickname</span>
              </button>
            </div>
          </div>
        </div>

        {showPrivacyNotice && (
          <div style={{ margin: '0 20px 14px', padding: 14, background: '#E3F3EA', border: '1px solid #C4E6D2', borderRadius: 16, fontSize: 13, color: '#12805C' }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>🔒 Privacy & Biometrics Policy</div>
            Your biometric face and voice recordings are strictly used for verified product feedback. Never sold or shared with third-party advertisers.
          </div>
        )}

        {/* Moderation Payout Status Summary */}
        <div style={{ margin: '0 20px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 18, padding: '14px 16px' }}>
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2.5">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Video Moderation & Payout Tracker</span>
            </span>
            <button
              type="button"
              onClick={() => go('myvideos')}
              className="text-blue-600 font-bold hover:underline cursor-pointer text-xs"
            >
              View My Videos ({myVideosList.length}) →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-500 font-bold">Credited to Wallet</div>
              <div className="text-sm font-black text-emerald-600 mt-0.5">{rs(user?.walletBalance ?? 0)}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">{myVideosList.filter((v) => v.moderationStatus === 'approved').length} Approved</div>
            </div>
            <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
              <div className="text-[10px] text-amber-800 font-bold">In Moderation</div>
              <div className="text-sm font-black text-amber-600 mt-0.5">
                {rs(myVideosList.filter((v) => v.moderationStatus === 'pending').reduce((s, v) => s + (v.rewardAmount || 150), 0))}
              </div>
              <div className="text-[9px] text-amber-700 mt-0.5">Under Company Review</div>
            </div>
            <div className={`p-2.5 rounded-xl border shadow-2xs ${myVideosList.filter((v) => v.moderationStatus === 'rejected').length > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200'}`}>
              <div className="text-[10px] text-slate-500 font-bold">Revision Needed</div>
              <div className={`text-sm font-black mt-0.5 ${myVideosList.filter((v) => v.moderationStatus === 'rejected').length > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {myVideosList.filter((v) => v.moderationStatus === 'rejected').length} {myVideosList.filter((v) => v.moderationStatus === 'rejected').length === 1 ? 'Video' : 'Videos'}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Can Re-record</div>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div style={{ margin: '20px 20px 28px', background: '#fff', border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden' }}>
          {profileRows.map((row, i) => (
            <button
              key={row.id}
              onClick={row.action}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px',
                borderTop: i ? '1px solid var(--line)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 60,
              }}
              className="hover:bg-neutral-50 transition-colors"
            >
              <span style={{ flex: 1, fontWeight: 700, fontSize: 'calc(16px * var(--fs))' }}>{row.label}</span>
              {row.val && <span style={{ color: 'var(--ink2)', fontSize: 'calc(13px * var(--fs))' }}>{row.val}</span>}
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          ))}
        </div>

        {/* Editable Profile Modal */}
        {showEditProfileModal && (
          <Suspense fallback={null}>
            <UserProfileComponent
              user={user}
              onUpdateUser={onUpdateUser}
              isOpen={showEditProfileModal}
              onClose={() => setShowEditProfileModal(false)}
            />
          </Suspense>
        )}
      </div>
    );
  };

  /* =========================================================================
   * SCREEN: USER LEADERBOARD (TOP CONTRIBUTORS OF THE MONTH)
   * ========================================================================= */
  const renderLeaderboard = () => (
    <div className="fp-screen fp-scroll" style={{ padding: '16px 18px 48px' }}>
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => go('home')}
          className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          October 2026 Season
        </span>
      </div>

      <Suspense fallback={<div className="p-6 text-center text-xs font-semibold text-neutral-400">Loading leaderboard...</div>}>
        <UserLeaderboard
          currentUser={user}
          feedbackList={feedbackList}
          registeredUsers={registeredUsers}
          onBack={() => go('home')}
        />
      </Suspense>
    </div>
  );

  // Switcher to render screen component
  const renderCurrentScreen = () => {
    switch (screen) {
      case 'welcome':
        return (
          <div className="fp-screen fp-scroll" style={{ padding: 0 }}>
            <LoginScreen
              onAuthenticated={(profile, preferredDest) => {
                if (onAuthenticated) onAuthenticated(profile, preferredDest);
                setScreen('home');
              }}
              onSwitchView={onNavigateView ? (target) => onNavigateView(target) : undefined}
            />
          </div>
        );
      case 'home':
        return renderHome();
      case 'detail':
        return renderDetail();
      case 'record':
        return renderRecorder();
      case 'review':
        return renderReview();
      case 'success':
        return renderSuccess();
      case 'wallet':
        return renderWallet();
      case 'withdraw':
        return renderWithdraw();
      case 'leaderboard':
        return renderLeaderboard();
      case 'myvideos':
        return renderMyVideos();
      case 'profile':
        return renderProfile();
      case 'company':
        if (onNavigateView) {
          onNavigateView('company');
        }
        return renderHome();
      default:
        return renderHome();
    }
  };

  return (
    <div className="stage">
      {/* Left Column: Simple Unnumbered Consumer Navigation Menu */}
      <nav aria-label="Consumer navigation" className="side" style={{ justifySelf: 'end', minWidth: '240px', maxWidth: '260px' }}>
        <div className="pb-2 mb-2 border-b border-black/10">
          <h3 className="m-0 text-xs font-bold text-neutral-800 tracking-tight">
            Menu
          </h3>
        </div>

        <div className="space-y-1">
          <button
            type="button"
            className="jump w-full text-xs whitespace-nowrap"
            data-on={screen === 'home' || screen === 'detail'}
            onClick={() => go('home')}
          >
            <Home className="w-4 h-4 text-slate-700 shrink-0" />
            <span>Home</span>
          </button>

          <button
            type="button"
            className="jump w-full text-xs whitespace-nowrap"
            data-on={screen === 'record' || screen === 'review'}
            onClick={() => go('record')}
          >
            <Video className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Record</span>
          </button>

          <button
            type="button"
            className="jump w-full text-xs whitespace-nowrap"
            data-on={screen === 'wallet' || screen === 'withdraw' || screen === 'success'}
            onClick={() => go('wallet')}
          >
            <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Wallet</span>
          </button>
        </div>

        <div className="pt-3 mt-2 border-t border-black/10 space-y-1">
          <button
            type="button"
            className="jump w-full text-xs whitespace-nowrap"
            data-on={screen === 'myvideos'}
            onClick={() => go('myvideos')}
          >
            <Play className="w-4 h-4 text-slate-600 shrink-0" />
            <span>My Videos</span>
          </button>

          <button
            type="button"
            className="jump w-full text-xs whitespace-nowrap"
            data-on={screen === 'leaderboard'}
            onClick={() => go('leaderboard')}
          >
            <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Leaderboard</span>
          </button>

          <button
            type="button"
            className="jump w-full text-xs whitespace-nowrap"
            data-on={screen === 'profile'}
            onClick={() => go('profile')}
          >
            <User className="w-4 h-4 text-slate-600 shrink-0" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            className="jump w-full text-xs whitespace-nowrap"
            data-on={!deviceFrameMode}
            onClick={onToggleLarge}
          >
            <Maximize2 className="w-4 h-4 text-slate-600 shrink-0" />
            <span>{deviceFrameMode ? 'Full Width' : 'Phone Frame'}</span>
          </button>

          {(!user?.isLoggedIn || user?.accountMode !== 'customer' || user?.role === 'company_admin') && (
            <>
              <button
                type="button"
                className="jump w-full text-xs whitespace-nowrap"
                data-on={false}
                onClick={() => onNavigateView?.('company')}
              >
                <BarChart3 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Company Dashboard</span>
              </button>
              <button
                type="button"
                className="jump w-full text-xs whitespace-nowrap"
                data-on={false}
                onClick={() => onNavigateView?.('admin')}
              >
                <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0" />
                <span>Admin</span>
              </button>
            </>
          )}

          {!user?.isLoggedIn && (
            <button
              type="button"
              className="jump w-full text-xs whitespace-nowrap"
              data-on={false}
              onClick={() => onNavigateView?.('login')}
            >
              <LogIn className="w-4 h-4 text-slate-700 shrink-0" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </nav>

      {/* Center Device: Realistic Mobile Simulator */}
      <div className={deviceFrameMode ? "device" : "w-full max-w-[420px] h-[820px] rounded-[36px] bg-[#1b1b1d] p-1.5 shadow-2xl relative"}>
        <div className="screen" style={{ position: 'relative' }}>
          {/* Status Bar */}
          <div className={`status ${isDark ? 'dark' : ''}`} style={{ background: statusBg }}>
            <span>9:41</span>
            <span className="island" />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>5G ▮▮▮ 87%</span>
          </div>

          {/* Consumer Real-Time Toast Notification Banner */}
          {activeConsumerToast && user?.isLoggedIn && (
            <div
              role="status"
              aria-live="polite"
              className="absolute top-12 inset-x-3 z-40 animate-in slide-in-from-top-4 fade-in duration-200"
            >
              <div className="bg-slate-950/95 text-white rounded-2xl border border-emerald-500/40 shadow-2xl p-3 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const target = activeConsumerToast.targetScreen;
                    setConsumerAlerts((prev) =>
                      prev.map((a) => (a.id === activeConsumerToast.id ? { ...a, read: true } : a))
                    );
                    setActiveConsumerToast(null);
                    if (target) go(target);
                  }}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <div className="text-xs font-extrabold text-white truncate">
                    {activeConsumerToast.title}
                  </div>
                  <div className="text-[11px] text-slate-300 line-clamp-2 leading-snug mt-0.5">
                    {activeConsumerToast.message}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveConsumerToast(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Consumer Notification Drawer Overlay */}
          {showConsumerNotifDrawer && user?.isLoggedIn && (
            <div className="absolute inset-0 z-40 bg-black/45 backdrop-blur-[1px] flex flex-col justify-start p-3 pt-12 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[75%]">
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-neutral-900">Your Live Notifications</h4>
                    <p className="text-[11px] text-neutral-500">
                      Approvals, company defect fixes & brand activity
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConsumerNotifDrawer(false)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                    aria-label="Close notifications"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto divide-y divide-neutral-100 flex-1">
                  {consumerAlerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-neutral-500 space-y-1">
                      <Bell className="w-6 h-6 mx-auto text-neutral-400" />
                      <p className="font-semibold text-neutral-700">No notifications yet</p>
                      <p className="text-[11px]">
                        Submit feedback or wait for admin/company updates to see live alerts here.
                      </p>
                    </div>
                  ) : (
                    consumerAlerts.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setShowConsumerNotifDrawer(false);
                          if (item.targetScreen) go(item.targetScreen);
                        }}
                        className="w-full p-3 text-left hover:bg-neutral-50 transition-colors flex items-start gap-2.5 cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-neutral-900 truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-mono tabular-nums text-neutral-400 shrink-0">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-600 line-clamp-2 mt-0.5 leading-snug">
                            {item.message}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Screen Content */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {renderCurrentScreen()}
          </div>

          {/* Bottom Tabs */}
          {!NO_TABS.includes(screen) && <TabBar />}

          {/* Homebar */}
          <div
            className={`homebar ${isDark ? 'dark' : ''}`}
            style={{
              background: NO_TABS.includes(screen)
                ? statusBg === 'var(--paper)'
                  ? 'var(--paper)'
                  : statusBg
                : '#fff',
            }}
          >
            <span />
          </div>
        </div>
      </div>

      {/* Phone Selector Modal: All Brand Categories, Apple iPhone 1-18, Samsung, Pixel... */}
      {isPhoneSelectorOpen && (
        <Suspense fallback={null}>
          <PhoneSelectorModal
            isOpen={isPhoneSelectorOpen}
            onClose={() => setIsPhoneSelectorOpen(false)}
            phones={PHONES}
            selectedPhoneId={selectedPhoneId}
            onSelectPhone={(phoneId) => {
              setSelectedPhoneId(phoneId);
              setIsPhoneSelectorOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* =========================================================
          TERMS & CONDITIONS AND VIDEO RECORDING CONSENT MODAL
          Mandatory checkbox flow to unlock video recording
          ========================================================= */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border-2 border-emerald-400/50 rounded-3xl max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden shadow-[0_20px_70px_rgba(16,185,129,0.35)]">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-neutral-950 via-slate-900 to-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-black text-base sm:text-lg leading-tight">
                    Terms & Recording Consent
                  </h3>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    dot Trust & Legal Verification Flow
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Verified Hardware Badge in Modal */}
            <div className="px-4 py-2 bg-black/50 border-b border-white/10 flex items-center justify-between gap-2 text-xs">
              <span className="text-white/60 font-bold flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Device Authenticity:</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {detectedSpecs.verifiedBadge}
              </span>
            </div>

            {/* Scrollable Terms Content */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-left text-xs leading-relaxed text-white/80">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-extrabold text-white text-[13px] flex items-center gap-1.5 text-emerald-300">
                  <span>1. Consent to Record</span>
                </div>
                <p className="text-white/70">
                  You grant dot permission to process your submitted video and audio feedback for product improvement, hardware telemetry, and sponsor company analytics.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-extrabold text-white text-[13px] flex items-center gap-1.5 text-sky-300">
                  <span>2. Device Telemetry & Anti-Fraud</span>
                </div>
                <p className="text-white/70">
                  Only non-identifying technical data (Operating System, Browser Type, Screen Resolution) is gathered automatically via standard browser APIs to verify authentic human device hardware without invasive permissions.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-extrabold text-white text-[13px] flex items-center gap-1.5 text-emerald-400">
                  <span>3. Zero Private Access Guarantee</span>
                </div>
                <p className="text-white/70">
                  We strictly do not read, scan, or store private personal files, photos, camera roll, text messages, phone contacts, or precise GPS coordinates.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-extrabold text-white text-[13px] flex items-center gap-1.5 text-amber-300">
                  <span>4. Monetization & Instant Payouts</span>
                </div>
                <p className="text-white/70">
                  Rewards (Rs {currentPhone.reward}) are credited upon complete video submission and verified device check. Spam, offensive, or bot submissions are subject to reward forfeiture.
                </p>
              </div>
            </div>

            {/* Checkbox Consent & Action Footer */}
            <div className="p-4 border-t border-white/10 bg-neutral-950 space-y-3 text-left">
              <label className="flex items-start gap-2.5 cursor-pointer select-none p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-400/40 hover:bg-emerald-950/60 transition-colors">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => handleToggleTerms(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer mt-0.5 shrink-0"
                />
                <div className="text-xs leading-snug">
                  <span className="font-black text-white">
                    [X] I agree to the Terms & Conditions and Video Recording Guidelines.
                  </span>
                  <p className="text-[10px] text-emerald-300/80 mt-0.5">
                    Required to unlock the camera recorder and earn video feedback rewards.
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!termsAccepted) {
                      handleToggleTerms(true);
                    }
                    setShowTermsModal(false);
                    playAudioEffect('chime');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{termsAccepted ? 'Agreed & Continue' : 'Accept Terms & Continue'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PRIVACY GUARANTEE & SAFETY MODAL
          Clear breakdown explaining zero access to personal files
          ========================================================= */}
      {showPrivacyInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border-2 border-sky-400/50 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden shadow-[0_20px_70px_rgba(56,189,248,0.35)]">
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-neutral-950 to-sky-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                <h3 className="text-white font-black text-base">Privacy & Safety Guarantee</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyInfoModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-left text-xs text-white/80 leading-relaxed flex-1">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-extrabold text-sky-300 flex items-center gap-1.5">
                  <span>🛡️ Zero File / Storage Access</span>
                </div>
                <p className="text-white/70">
                  dot operates completely within the sandboxed browser environment. We never access your internal storage, photos, media files, or private documents.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-extrabold text-emerald-300 flex items-center gap-1.5">
                  <span>📹 Session-Only Camera & Audio</span>
                </div>
                <p className="text-white/70">
                  Camera and microphone sensors are enabled strictly while you are in the review studio. The instant you stop recording or close the screen, hardware streams are terminated.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <span>🔒 Privacy Masking Switch</span>
                </div>
                <p className="text-white/70">
                  If you enable "Hide exact phone model in public reviews", your submission will display as a generic verified user (e.g., "Verified Samsung Flagship User") rather than listing your specific model.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-400/30 text-emerald-200">
                <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-300 mb-1">
                  <span>✓ Live Verified Device Detected:</span>
                </div>
                <div className="font-mono text-[11px] text-white">
                  {detectedSpecs.verifiedBadge}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-white/10 bg-neutral-950 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyInfoModal(false)}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-black text-xs cursor-pointer shadow-md"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          AUTOMATIC VIDEO REVIEW PREVIEW & HARDWARE VERIFICATION MODAL
          Allows users to re-watch or re-record their video before submitting
          ========================================================= */}
      {showVideoPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border-2 border-emerald-400/50 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-[0_20px_70px_rgba(16,185,129,0.35)]">
            {/* Header */}
            <div className="p-3.5 border-b border-white/10 bg-gradient-to-r from-neutral-950 via-slate-900 to-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm sm:text-base leading-tight">
                    Video Review Preview & Verification
                  </h3>
                  <p className="text-[10px] text-emerald-300 font-mono">
                    Inspect Video Before Cash Payout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVideoPreviewModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Real Recorded Video Viewport (with photo fallback only if MediaRecorder unsupported) */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-left">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-2 border-white/20 shadow-xl flex items-center justify-center group">
                {draftReview?.videoUrl ? (
                  <video
                    src={draftReview.videoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <>
                    <img
                      src={reviewerFacePhoto}
                      alt="Reviewer Video Playback"
                      className="w-full h-full object-cover"
                      style={{ filter: computedCameraFilterCss }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 flex flex-col justify-between p-3 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-mono font-black text-[10px] flex items-center gap-1 shadow-sm">
                          <span>PREVIEW SNAPSHOT</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/70 text-amber-300 font-mono text-[10px] border border-white/20">
                          {currentCameraFilter.icon} {currentCameraFilter.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white font-mono font-bold">
                        <span>{customReviewerName || user.name || 'Verified Reviewer'}</span>
                        <span>
                          {Math.floor((draftReview?.seconds || 165) / 60)}:{String((draftReview?.seconds || 165) % 60).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Verified Hardware Badge Card */}
              <div className="p-3 rounded-2xl bg-black/60 border border-emerald-400/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Auto-Hardware Verification:</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    Passed ✓
                  </span>
                </div>
                <div className="font-mono text-[11px] text-white/90 bg-white/5 p-2 rounded-xl border border-white/10">
                  {detectedSpecs.verifiedBadge}
                </div>
              </div>

              {/* Privacy Model Masking Toggle Status */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>📱 Product Model Display:</span>
                  </div>
                  <div className="text-[11px] text-white/70 mt-0.5">
                    {hidePhoneModelInReview ? (
                      <span className="text-amber-300 font-bold">
                        🔒 Masked as "Verified {currentPhone.brand} User" (Privacy Protected)
                      </span>
                    ) : (
                      <span className="text-emerald-300 font-bold">
                        {currentPhone.name} ({currentPhone.brand})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHidePhoneModelInReview(!hidePhoneModelInReview)}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] border border-white/20 transition-all cursor-pointer"
                >
                  {hidePhoneModelInReview ? 'Show Exact Model' : 'Mask Model 🔒'}
                </button>
              </div>

              {/* All Questions & Answers Preview Inside Video Modal */}
              <div className="p-3 rounded-2xl bg-black/60 border border-white/15 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>All Questions & Answers Preview</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 font-bold">
                    {getStudioQaPairs().filter((x) => Boolean(x.answer)).length} / {getStudioQaPairs().length} answered
                  </span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {getStudioQaPairs().map((qa) => (
                    <div key={`modal-qa-${qa.k}`} className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <div className="flex items-start gap-1.5 text-[11px] text-white/80 font-semibold leading-snug">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] shrink-0">
                          Q{qa.idx + 1}
                        </span>
                        <span>{qa.title}</span>
                      </div>
                      <div className="text-xs font-bold text-white pl-1">
                        {qa.answer ? qa.answer : <span className="text-white/45 italic">Answered in video / Not selected</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Answers Count & Cash Incentive */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 to-yellow-500/15 border border-amber-400/40 flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-extrabold text-amber-300">Reward Unlocked:</div>
                  <div className="text-[11px] text-white/70">
                    {getStudioQaPairs().filter((x) => Boolean(x.answer)).length} questions evaluated · Verified device
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-amber-300 font-mono">
                    Rs {currentPhone.reward}
                  </div>
                  <div className="text-[10px] text-white/60">Instant Wallet Credit</div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Re-record vs Review vs Submit Now */}
            <div className="p-4 border-t border-white/10 bg-neutral-950 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setShowVideoPreviewModal(false);
                  setRecState('ready');
                  go('record');
                }}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-white/70" />
                <span>Re-record</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowVideoPreviewModal(false);
                    go('review');
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Edit & Rate
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={submitCurrentDraftFeedback}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingReview ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isSubmittingReview ? 'Submitting...' : `Submit & Claim Rs ${currentPhone.reward}`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Column: Educational Architecture & Design Note */}
      <div className="note">
        <p>
          <b>Only real products & phones.</b> Consumers select their verified phone from authentic high-res photos — avoiding complicated technical jargon.
        </p>
        <p>
          <b>One question at a time.</b> The 2.5-minute conversational recorder prompts questions in your chosen language (Like 👍, Dislike 👎, In-Hand Comfort 🛋️, Phone Snapshot 📸, Final Verdict ⭐) with real human-voice guidance like a phone call.
        </p>
        <p>
          <b>Nepal & Global 5% Math Engine.</b> The user receives the exact full amount (e.g. Rs 100). The company covers the 5% platform fee (Rs 5). User withdrawal is 100% free with instant eSewa, Khalti, ConnectIPS, Top-Up, or Bank transfer.
        </p>
      </div>
    </div>
  );
};
