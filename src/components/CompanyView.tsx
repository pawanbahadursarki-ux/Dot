import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { 
  Building2, Sparkles, ShoppingBag, MessageSquare, Play, 
  Send, RefreshCw, Download, ShieldCheck, CheckCircle2, TrendingUp, 
  Search, ExternalLink, Zap, Users, ThumbsUp, ThumbsDown, 
  ChevronDown, ChevronUp, ChevronRight, Lock, Unlock, BarChart3, CreditCard, 
  Smartphone, DollarSign, Check, Eye, HelpCircle, X, Film, AlertCircle, Bot, Tag,
  Wrench, Cpu, Home, Bell, User, Camera, Copy, Volume2, VolumeX, LogOut,
  Clock, XCircle, QrCode
} from 'lucide-react';
import { FeedbackItem, SubscriptionTier, UserProfile, FeedbackCategory, AdminWithdrawalRequest, PaymentOrderRecord } from '../types';
import { phoneById, rs, PHONES } from '../data/initialData';
import { getSingleActiveBrandFolder, isBrandUnlocked, isFeedbackItemUnlocked } from '../utils/brandAccess';
import { streamInstantAiReply } from '../utils/instantAiEngine';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { getPhoneOS, computeChartMetricsFromFeedback } from '../utils/cartAndChartEngine';
import type { VideoAlertNotification } from './RealTimeVideoToast';

const UserProfileComponent = lazy(() =>
  import('./UserProfile').then((m) => ({ default: m.UserProfileComponent }))
);
const CompanyBoardAnalytics = lazy(() =>
  import('./CompanyBoardAnalytics').then((m) => ({ default: m.CompanyBoardAnalytics }))
);
const RealTimeVideoToast = lazy(() =>
  import('./RealTimeVideoToast').then((m) => ({ default: m.RealTimeVideoToast }))
);
import { PaymentRecord, updateFeedbackDefectInFirestore } from '../services/firebaseService';
import { formatFirestoreErrorMessage } from '../firebase';
import { PrivatePaymentScreenshot } from './PrivatePaymentScreenshot';

export interface ChatModelChart {
  modelName: string;
  brand: string;
  img: string;
  likePercent: number;
  dislikePercent: number;
  neutralPercent: number;
  avgRating: number;
  totalAuditions: number;
  topLikes: string[];
  topDislikes: string[];
  featuredFeedbackItem?: FeedbackItem;
}

export interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp?: string;
  modelChart?: ChatModelChart;
  isStreaming?: boolean;
}

// Brand Folder Helper
export const getBrandFolder = (phoneId: string, itemFolder?: string): string => {
  if (itemFolder) {
    if (itemFolder.includes('Apple') || itemFolder.includes('iPhone')) return 'iPhone (Models 1 to 18)';
    return itemFolder;
  }
  const p = phoneById(phoneId);
  const brand = (p.brand || '').toLowerCase();
  const name = (p.name || '').toLowerCase();

  if (brand === 'apple' || name.includes('iphone')) return 'iPhone (Models 1 to 18)';
  if (brand === 'samsung' || name.includes('galaxy')) return 'Samsung Galaxy (S1 to S25)';
  if (brand === 'google' || name.includes('pixel')) return 'Google Pixel';
  if (brand === 'oneplus') return 'OnePlus';
  if (['xiaomi', 'poco', 'redmi'].includes(brand) || name.includes('redmi') || name.includes('poco')) return 'Xiaomi / Redmi / POCO';
  if (['vivo', 'iqoo'].includes(brand)) return 'Vivo & iQOO';
  if (['oppo', 'realme'].includes(brand)) return 'OPPO & Realme';
  return 'Gaming & Others';
};

// Sentiment Score Helper
export const getSentimentScore = (r: FeedbackItem): number => {
  if (typeof r.sentimentScore === 'number') return r.sentimentScore;
  return Math.min(100, Math.max(20, r.rating * 19 + 5));
};

// Sentiment Tone Helper
export const getSentimentTone = (r: FeedbackItem): string => {
  if (r.sentimentTone) return r.sentimentTone;
  const score = getSentimentScore(r);
  if (score >= 90) return 'Delighted & Satisfied';
  if (score >= 75) return 'Positive & Constructive';
  if (score >= 55) return 'Balanced & Neutral';
  return 'Critical & Needs Improvement';
};

// Feedback Category Helper
export const getFeedbackCategory = (r: FeedbackItem): FeedbackCategory => {
  if (r.feedbackCategory) return r.feedbackCategory;
  const text = `${r.dislike || ''} ${r.like || ''} ${r.improve || ''} ${(r.tags || []).join(' ')}`.toLowerCase();
  const rating = typeof r.rating === 'number' ? r.rating : 4;

  if (rating <= 2 || text.includes('bug') || text.includes('crash') || text.includes('heat') || text.includes('drain')) {
    return 'Bug Report';
  }
  if (text.includes('wish') || text.includes('improve') || text.includes('feature') || text.includes('should have')) {
    return 'Feature Request';
  }
  return 'Compliment';
};

interface HoverVideoThumbnailProps {
  item: FeedbackItem;
  onOpen: () => void;
  heightClass?: string;
}

const HoverVideoThumbnail: React.FC<HoverVideoThumbnailProps> = ({
  item,
  onOpen,
  heightClass = 'h-40',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMutedPreview, setIsMutedPreview] = useState(true);
  const [progressPct, setProgressPct] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [hasError, setHasError] = useState(false);

  const totalSeconds = item.seconds || 60;
  const formatDur = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

  const handleStartPreview = () => {
    setIsHovering(true);
    const vid = videoRef.current;
    if (vid && !hasError) {
      vid.muted = isMutedPreview;
      vid.play().catch(() => {});
    }
  };

  const handleStopPreview = () => {
    setIsHovering(false);
    setProgressPct(0);
    setCurrentSec(0);
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
      try {
        vid.currentTime = 0.2;
      } catch {
        // Ignore seek errors before metadata loads
      }
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMutedPreview;
    setIsMutedPreview(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const quotePreview = item.dislike || item.like || item.improve || item.transcriptText || '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={handleStartPreview}
      onMouseLeave={handleStopPreview}
      onFocus={handleStartPreview}
      onBlur={handleStopPreview}
      className={`relative ${heightClass} rounded-xl overflow-hidden bg-slate-950 border border-slate-200 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
      title="Hover to preview video · Click to open full review modal"
    >
      {hasError || !item.videoUrl ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-300 px-4 text-center">
          <Film className="w-6 h-6 text-slate-400 mb-1.5" />
          <span className="text-xs font-semibold text-slate-200 truncate max-w-full">
            {phoneById(item.phone).name}
          </span>
          <span className="text-[11px] text-slate-400">Click to open review</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={`${item.videoUrl}#t=0.2`}
          muted={isMutedPreview}
          playsInline
          loop
          preload="metadata"
          onTimeUpdate={(e) => {
            const vid = e.currentTarget;
            if (vid.duration && Number.isFinite(vid.duration)) {
              setProgressPct(Math.min(100, Math.max(0, (vid.currentTime / vid.duration) * 100)));
              setCurrentSec(vid.currentTime);
            }
          }}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-transform duration-200 ${
            isHovering ? 'scale-[1.03]' : 'scale-100'
          }`}
        />
      )}

      {/* Contrast Scrim */}
      <div
        className={`absolute inset-0 transition-opacity duration-200 pointer-events-none ${
          isHovering
            ? 'bg-gradient-to-t from-black/85 via-black/15 to-black/35'
            : 'bg-gradient-to-t from-black/75 via-black/15 to-transparent'
        }`}
      />

      {/* Top Overlay: Preview Label & Audio Toggle */}
      <div className="absolute top-2 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
        <span className="text-[11px] font-medium text-white/95 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
          {isHovering ? 'Hover preview' : 'Recorded video'}
        </span>

        {isHovering && !hasError && (
          <button
            type="button"
            onClick={handleToggleMute}
            className="w-7 h-7 rounded-md bg-black/65 hover:bg-black/85 text-white flex items-center justify-center transition-colors cursor-pointer"
            title={isMutedPreview ? 'Unmute preview' : 'Mute preview'}
            aria-label={isMutedPreview ? 'Unmute preview' : 'Mute preview'}
          >
            {isMutedPreview ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Resting Center Play Button (fades out on hover so video frame is unobstructed) */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
          isHovering ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg">
          <Play className="w-4 h-4 fill-slate-900 ml-0.5" />
        </div>
      </div>

      {/* Bottom Metadata & Hover Quote / Scrub Progress */}
      <div className="absolute bottom-0 inset-x-0 px-2.5 pb-2 pt-4 pointer-events-none">
        {isHovering && quotePreview && (
          <p className="text-[11px] text-white/90 line-clamp-1 mb-1 font-medium">
            “{quotePreview}”
          </p>
        )}
        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-white/95">
          <span>{isHovering ? 'Click for full modal' : item.user}</span>
          <span>
            {isHovering ? `${formatDur(currentSec)} / ${formatDur(totalSeconds)}` : formatDur(totalSeconds)}
          </span>
        </div>
        <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden mt-1.5">
          <div
            className="h-full bg-indigo-400 transition-all duration-100"
            style={{ width: `${isHovering ? progressPct : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

interface CompanyViewProps {
  feedbackList: FeedbackItem[];
  payments?: PaymentRecord[];
  paymentOrders?: PaymentOrderRecord[];
  withdrawals?: AdminWithdrawalRequest[];
  onOpenVideoModal: (item: FeedbackItem, initialTab?: 'summary' | 'transcript' | 'ai_summary') => void;
  onOpenCartModal: (item: FeedbackItem) => void;
  onOpenChatModal: (item: FeedbackItem) => void;
  onOpenSubscriptionModal: (targetBrand?: string) => void;
  activePlan: SubscriptionTier;
  reviewsQuotaUsed: number;
  user?: UserProfile;
  onSelectPlan?: (plan: SubscriptionTier) => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
  onFeedbackUpdated?: (updated?: FeedbackItem) => void;
  onAddFeedback?: (newFeedback: FeedbackItem) => Promise<FeedbackItem> | void;
  onNavigateHome?: () => void;
  onNavigateView?: (view: 'customer' | 'company' | 'admin' | 'login' | 'dual') => void;
  onLogout?: () => void;
}

export const CompanyView: React.FC<CompanyViewProps> = ({
  feedbackList,
  paymentOrders = [],
  onOpenVideoModal,
  onOpenCartModal,
  onOpenChatModal,
  onOpenSubscriptionModal,
  activePlan,
  reviewsQuotaUsed,
  user,
  onOpenAuth,
  onUpdateUser,
  onFeedbackUpdated,
  onNavigateHome,
  onLogout,
}) => {
  const ownPaymentOrders = useMemo(
    () => paymentOrders.filter((o) => !user?.googleId || o.uid === user.googleId),
    [paymentOrders, user?.googleId]
  );
  const pendingOwnOrdersCount = ownPaymentOrders.filter((o) => o.status === 'pending').length;
  // Mobile Brand Category Selector (auto-syncs to active subscribed brand)
  const [selectedBrandCategory, setSelectedBrandCategory] = useState<string>('samsung');

  useEffect(() => {
    const activeSingle = getSingleActiveBrandFolder(user, activePlan);
    if (!activeSingle) return;
    const low = activeSingle.toLowerCase();
    if (low.includes('apple') || low.includes('iphone')) setSelectedBrandCategory('apple');
    else if (low.includes('samsung') || low.includes('galaxy')) setSelectedBrandCategory('samsung');
    else if (low.includes('pixel') || low.includes('google')) setSelectedBrandCategory('google');
    else if (low.includes('xiaomi') || low.includes('redmi') || low.includes('poco')) setSelectedBrandCategory('xiaomi');
    else if (low.includes('oneplus')) setSelectedBrandCategory('oneplus');
    else if (low.includes('vivo') || low.includes('iqoo')) setSelectedBrandCategory('vivo');
  }, [user, activePlan]);

  // Tab Switcher: 'chart' | 'insights' | 'videos' | 'cart' | 'analysis' | 'profile'
  const [activeTab, setActiveTab] = useState<'chart' | 'insights' | 'videos' | 'cart' | 'analysis' | 'profile'>('chart');
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [showCompanyPrivacyNotice, setShowCompanyPrivacyNotice] = useState<boolean>(false);
  
  // Filter for video reviews
  const [filterType, setFilterType] = useState<'all' | 'Compliment' | 'Bug Report' | 'Feature Request'>('all');
  const [onlyWithVideo, setOnlyWithVideo] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Feedback scoped exclusively to this Company's active brand subscription(s)
  const subscribedFeedback = useMemo(
    () => feedbackList.filter((f) => isFeedbackItemUnlocked(f, user, activePlan)),
    [feedbackList, user, activePlan]
  );

  // Real-Time Video Alert Toast & Notification Drawer state (strictly from subscribed brand feedback)
  const [activeAlert, setActiveAlert] = useState<VideoAlertNotification | null>(null);
  const [alertHistory, setAlertHistory] = useState<VideoAlertNotification[]>(() => {
    return subscribedFeedback.slice(0, 6).map((f) => ({
      id: `init-${f.id}`,
      feedback: f,
      timestamp: f.time || 'Recorded',
      read: true,
      cartAmountUSD: f.cartData?.priceUSD || 0,
    }));
  });
  const [showNotificationDrawer, setShowNotificationDrawer] = useState<boolean>(false);

  // Fix Problem Modal State
  const [fixingProblemItem, setFixingProblemItem] = useState<FeedbackItem | null>(null);
  const [problemPatchNote, setProblemPatchNote] = useState<string>('');
  const [problemTargetVersion, setProblemTargetVersion] = useState<string>('v2.5.0-hotfix1');
  const [problemResolutionState, setProblemResolutionState] = useState<'investigating' | 'fixing' | 'resolved'>('resolved');
  const [isSavingFix, setIsSavingFix] = useState<boolean>(false);
  const [fixError, setFixError] = useState<string>('');

  // Listen for newly added consumer feedback matching the Company's subscribed brand(s)
  const mountTimeRef = useRef<number>(Date.now());
  const prevSubscribedIdsRef = useRef<Set<string>>(new Set(subscribedFeedback.map((f) => f.id)));
  const prevPlanSignatureRef = useRef<string>(
    `${activePlan?.id || ''}|${activePlan?.targetCategory || ''}|${(user?.unlockedBrandFolders || []).join(',')}`
  );

  useEffect(() => {
    const planSig = `${activePlan?.id || ''}|${activePlan?.targetCategory || ''}|${(user?.unlockedBrandFolders || []).join(',')}`;
    const planChanged = prevPlanSignatureRef.current !== planSig;
    prevPlanSignatureRef.current = planSig;

    if (subscribedFeedback.length === 0) {
      prevSubscribedIdsRef.current = new Set();
      setActiveAlert(null);
      setAlertHistory([]);
      return;
    }

    if (planChanged) {
      prevSubscribedIdsRef.current = new Set(subscribedFeedback.map((f) => f.id));
      setActiveAlert(null);
      setAlertHistory(
        subscribedFeedback.slice(0, 8).map((f) => ({
          id: `init-${f.id}`,
          feedback: f,
          timestamp: f.time || 'Recorded',
          read: true,
          cartAmountUSD: f.cartData?.priceUSD || 0,
        }))
      );
      return;
    }

    const prevIds = prevSubscribedIdsRef.current;
    const newItems = subscribedFeedback.filter((f) => !prevIds.has(f.id));
    prevSubscribedIdsRef.current = new Set(subscribedFeedback.map((f) => f.id));

    if (newItems.length === 0) return;

    const now = Date.now();
    const shouldToast = newItems.filter((item) => {
      if (prevIds.size > 0) return true;
      const createdMs = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      return (createdMs > 0 && now - createdMs < 90_000) || now - mountTimeRef.current > 2500;
    });

    if (shouldToast.length > 0) {
      const newest = shouldToast[0];
      const newAlert: VideoAlertNotification = {
        id: `alert-${newest.id}-${now}`,
        feedback: newest,
        timestamp: 'Just now',
        read: false,
        cartAmountUSD: newest.cartData?.priceUSD || 0,
      };
      setActiveAlert(newAlert);
      setAlertHistory((prev) => [newAlert, ...prev.slice(0, 14)]);
    } else if (prevIds.size === 0) {
      setAlertHistory(
        subscribedFeedback.slice(0, 6).map((f) => ({
          id: `init-${f.id}`,
          feedback: f,
          timestamp: f.time || 'Recorded',
          read: true,
          cartAmountUSD: f.cartData?.priceUSD || 0,
        }))
      );
    }
  }, [subscribedFeedback, activePlan?.id, activePlan?.targetCategory, user?.unlockedBrandFolders]);

  const handleOpenFixProblem = (item: FeedbackItem) => {
    if (!isFeedbackItemUnlocked(item, user, activePlan)) {
      onOpenSubscriptionModal(selectedBrandCategory);
      return;
    }
    setFixError('');
    setFixingProblemItem(item);
    setProblemPatchNote(item.defectResolutionNote || '');
    setProblemTargetVersion(item.defectFixedInVersion || 'v2.5.0-hotfix1');
    setProblemResolutionState(
      item.defectStatus === 'investigating' || item.defectStatus === 'fixing' || item.defectStatus === 'resolved'
        ? item.defectStatus
        : 'resolved'
    );
  };

  const handleSaveProblemFix = async () => {
    if (!fixingProblemItem) return;
    if (fixingProblemItem.defectStatus === 'resolved' && user?.role !== 'company_admin') {
      setFixError('This defect is already marked resolved and locked against non-admin edits.');
      return;
    }
    setIsSavingFix(true);
    setFixError('');
    try {
      await updateFeedbackDefectInFirestore({
        feedbackId: fixingProblemItem.id,
        defectStatus: problemResolutionState,
        defectResolutionNote: problemPatchNote.trim(),
        defectFixedInVersion: problemTargetVersion.trim(),
      });
      const updated: FeedbackItem = {
        ...fixingProblemItem,
        defectStatus: problemResolutionState,
        defectFixedInVersion: problemTargetVersion.trim(),
        defectResolutionNote: problemPatchNote.trim(),
        status: problemResolutionState === 'resolved' ? `Defect Resolved (${problemTargetVersion})` : 'Investigating',
      };
      onFeedbackUpdated?.(updated);
      setFixingProblemItem(null);
    } catch (err) {
      setFixError(formatFirestoreErrorMessage(err, 'Unable to save defect resolution to Firestore.'));
    } finally {
      setIsSavingFix(false);
    }
  };

  // Available Brand Categories (1 subscription = 1 brand at a time)
  const brandCategories = useMemo(() => [
    { id: 'samsung', label: 'Samsung Galaxy', icon: '🌌', folderName: 'Samsung Galaxy (S1 to S25)' },
    { id: 'apple', label: 'Apple iPhone', icon: '🍏', folderName: 'iPhone (Models 1 to 18)' },
    { id: 'google', label: 'Google Pixel', icon: '🔍', folderName: 'Google Pixel' },
    { id: 'xiaomi', label: 'Xiaomi / Redmi', icon: '🟠', folderName: 'Xiaomi / Redmi / POCO' },
    { id: 'oneplus', label: 'OnePlus', icon: '⚡', folderName: 'OnePlus' },
    { id: 'vivo', label: 'Vivo & iQOO', icon: '📸', folderName: 'Vivo & iQOO' },
  ], []);

  // Determine whether the selected brand matches the single active subscription
  const isSelectedBrandUnlocked = useMemo(() => {
    const currentCategoryObj = brandCategories.find(b => b.id === selectedBrandCategory);
    return isBrandUnlocked(currentCategoryObj?.folderName || selectedBrandCategory, user, activePlan);
  }, [selectedBrandCategory, user, activePlan, brandCategories]);

  // Human-readable active single brand
  const unlockedBrandNames = useMemo(() => {
    return getSingleActiveBrandFolder(user, activePlan) || 'None (Subscription Required)';
  }, [user, activePlan]);

  // Quota metrics
  const totalReviewsQuota = activePlan?.reviewQuota ?? 0;
  const isUnlimitedPlan = totalReviewsQuota >= 99999;
  const remainingReviewsQuota = isUnlimitedPlan ? 'Unlimited' : Math.max(0, totalReviewsQuota - reviewsQuotaUsed);

  // Filter reviews strictly within the single subscribed brand
  const filteredReviews = useMemo(() => {
    if (!isSelectedBrandUnlocked) return [];
    return subscribedFeedback.filter((r) => {
      const folder = getBrandFolder(r.phone, r.brandFolder).toLowerCase();
      const phone = phoneById(r.phone);
      const brand = phone.brand.toLowerCase();

      // Brand match
      const key = selectedBrandCategory.toLowerCase();
      const matchesBrand = folder.includes(key) || brand.includes(key);

      // Type match
      const cat = getFeedbackCategory(r);
      const matchesType = filterType === 'all' || cat === filterType;

      // Real video match
      const matchesVideo = !onlyWithVideo || Boolean(r.videoUrl);

      // Text search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (r.user + ' ' + r.city + ' ' + r.like + ' ' + r.dislike + ' ' + r.improve + ' ' + (r.transcriptText || '') + ' ' + phone.name).toLowerCase().includes(q);

      return matchesBrand && matchesType && matchesVideo && matchesSearch;
    });
  }, [subscribedFeedback, isSelectedBrandUnlocked, selectedBrandCategory, filterType, onlyWithVideo, searchQuery]);

  // Model-specific reviews for the currently selected brand
  const activeBrandName = useMemo(() => {
    return brandCategories.find(b => b.id === selectedBrandCategory)?.label || 'Samsung Galaxy';
  }, [selectedBrandCategory, brandCategories]);

  // Representative Model for the currently selected brand
  const currentModelPhone = useMemo(() => {
    if (selectedBrandCategory === 'apple') return phoneById('ip16pro') || phoneById('ip16') || PHONES[1];
    if (selectedBrandCategory === 'google') return phoneById('px9p') || phoneById('px9') || PHONES[2];
    if (selectedBrandCategory === 'xiaomi') return phoneById('xm14u') || phoneById('rn14p') || PHONES[3];
    if (selectedBrandCategory === 'oneplus') return phoneById('op12') || PHONES[4];
    if (selectedBrandCategory === 'vivo') return phoneById('vx100p') || PHONES[5];
    return phoneById('s24u') || phoneById('s24') || PHONES[0];
  }, [selectedBrandCategory]);

  // AI Chatbot state inside Model Data Analysis
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: `Hello! I am your AI Model Copilot for ${activeBrandName}. Ask me anything about ${currentModelPhone.name} hardware defects, 4K camera feedback, battery life, or customer purchase intentions!`,
      timestamp: 'Instant (<0.005s)',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Update greeting when brand changes
  useEffect(() => {
    setChatMessages([
      {
        sender: 'ai',
        text: `Switched to ${activeBrandName} Intelligence. Ask me anything about ${currentModelPhone.name} defects, camera zoom, battery, or customer preorder demand!`,
        timestamp: 'Active (<0.005s)',
      },
    ]);
  }, [selectedBrandCategory, activeBrandName, currentModelPhone.name]);

  // Auto-scroll chat box when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAiLoading]);

  // AI Chat prompt dispatcher
  const handleSendPrompt = (promptText?: string) => {
    const text = (promptText !== undefined ? promptText : inputPrompt).trim();
    if (!text) return;

    const userMsg: ChatMessage = { sender: 'user', text, timestamp: 'Now' };
    const loadingAiMsg: ChatMessage = {
      sender: 'ai',
      text: '',
      timestamp: '⚡ Synthesizing verified videos (<0.005s)...',
      isStreaming: true,
    };

    setChatMessages(prev => [...prev, userMsg, loadingAiMsg]);
    setInputPrompt('');
    setIsAiLoading(true);

    streamInstantAiReply(
      `${text} (Focus specifically on ${currentModelPhone.name} - ${activeBrandName})`,
      subscribedFeedback,
      (partial) => {
        setChatMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.sender === 'ai') {
            next[next.length - 1] = { ...last, text: partial };
          }
          return next;
        });
      },
      (final) => {
        setChatMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.sender === 'ai') {
            next[next.length - 1] = {
              ...last,
              text: final.replyText,
              modelChart: final.modelChart,
              timestamp: `⚡ ${final.latencySeconds.toFixed(4)}s (Verified)`,
              isStreaming: false,
            };
          }
          return next;
        });
        setIsAiLoading(false);
      },
      user,
      activePlan
    );
  };

  // Representative feedback item for the selected brand (null if empty)
  const representativeItem = useMemo(() => {
    return filteredReviews.find(r => r.phone === currentModelPhone.id) || filteredReviews[0] || null;
  }, [filteredReviews, currentModelPhone.id]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!isSelectedBrandUnlocked) {
      onOpenSubscriptionModal(selectedBrandCategory);
      return;
    }
    const headers = ['Review ID', 'Reviewer', 'City', 'Phone Model', 'Category', 'Rating', 'Sentiment', 'Liked', 'Defects'];
    const rows = filteredReviews.map((r) => [
      r.id,
      r.user,
      r.city,
      `"${phoneById(r.phone).name}"`,
      `"${getFeedbackCategory(r)}"`,
      r.rating,
      getSentimentScore(r),
      `"${(r.like || '').replace(/"/g, '""')}"`,
      `"${(r.dislike || r.improve || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `feedback_pulse_${selectedBrandCategory}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen text-slate-900 pb-12">
      {/* ========================================================
          CLEAN SINGLE TOP NAVIGATION & ACTION BAR
          ======================================================== */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-3 sm:px-6 py-1.5 sticky top-12 sm:top-13 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          {/* Primary Section Tabs (Single Source of Truth) */}
          <nav className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
            {[
              { id: 'chart' as const, label: 'Dashboard' },
              { id: 'videos' as const, label: `Videos (${filteredReviews.length})` },
              { id: 'cart' as const, label: 'Orders' },
              { id: 'analysis' as const, label: 'AI Analysis' },
              { id: 'insights' as const, label: 'Insights' },
              { id: 'profile' as const, label: pendingOwnOrdersCount > 0 ? `Profile (${pendingOwnOrdersCount})` : 'Profile' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Compact Utility Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotificationDrawer(!showNotificationDrawer);
                  if (!showNotificationDrawer) {
                    setAlertHistory(prev => prev.map(a => ({ ...a, read: true })));
                  }
                }}
                className="relative p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Video Review Alerts"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {alertHistory.some(a => !a.read) && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center font-mono tabular-nums">
                    {alertHistory.filter(a => !a.read).length}
                  </span>
                )}
              </button>

              {showNotificationDrawer && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-xs text-slate-900">Recent Video Alerts</h4>
                    <button
                      type="button"
                      onClick={() => setShowNotificationDrawer(false)}
                      className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 mt-2">
                    {alertHistory.length === 0 ? (
                      <div className="py-5 px-3 text-center text-xs text-slate-400">
                        {unlockedBrandNames.startsWith('None')
                          ? 'Subscribe to a brand plan to receive live alerts.'
                          : `No new alerts for ${unlockedBrandNames}.`}
                      </div>
                    ) : (
                      alertHistory.map((alert) => {
                        const p = phoneById(alert.feedback.phone);
                        const isFixed = alert.feedback.defectStatus === 'resolved';
                        return (
                          <div
                            key={alert.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{alert.feedback.user}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
                            </div>
                            <div className="text-[11px] text-indigo-700 font-medium">{p.name}</div>
                            <div className="flex items-center justify-between pt-1 gap-2">
                              <span className={`text-[10px] font-semibold ${isFixed ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {isFixed ? 'Fixed' : 'Open Issue'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenVideoModal(alert.feedback);
                                  setShowNotificationDrawer(false);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-semibold cursor-pointer"
                              >
                                Watch
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenSubscriptionModal(selectedBrandCategory)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                isSelectedBrandUnlocked
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isSelectedBrandUnlocked ? 'Upgrade Plan' : 'Buy Subscription'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 space-y-3 w-full">
        {/* Compact Single-Row Brand Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 px-2.5 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {brandCategories.map((brand) => {
            const isSelected = selectedBrandCategory === brand.id;
            const isUnlocked = isBrandUnlocked(brand.folderName, user, activePlan);

            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => setSelectedBrandCategory(brand.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : isUnlocked
                    ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{brand.icon}</span>
                <span>{brand.label}</span>
                {isUnlocked ? (
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-emerald-600'}`} />
                ) : (
                  <Lock className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================
            CONTENT WORKSPACE
            ======================================================== */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {activeTab === 'videos' && isSelectedBrandUnlocked && (
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, device, issue..."
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'Compliment', 'Bug Report', 'Feature Request'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                      filterType === t
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {t === 'all' ? 'All' : t === 'Compliment' ? 'Praise' : t === 'Bug Report' ? 'Bugs' : 'Requests'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setOnlyWithVideo((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap ${
                    onlyWithVideo
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Film className="w-3 h-3" />
                  <span>Video Only</span>
                </button>
              </div>
            </div>
          )}

          {/* Locked Brand Gate (Profile remains accessible) */}
          {!isSelectedBrandUnlocked && activeTab !== 'profile' ? (
            <div className="p-7 sm:p-8 text-center bg-slate-50/60">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2.5">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">
                {activeBrandName} is Locked
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3.5">
                Subscribe to unlock verified {activeBrandName} customer videos, feedback insights, and orders.
              </p>
              <button
                type="button"
                onClick={() => onOpenSubscriptionModal(selectedBrandCategory)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Buy {activeBrandName} Subscription</span>
              </button>
            </div>
          ) : (
            <>
              {/* TAB CONTENT 0: BOARD CHART & METRICS */}
              {activeTab === 'chart' && (
                <div className="p-3 sm:p-4">
                  <Suspense fallback={<div className="p-6 text-center text-xs font-semibold text-slate-400">Loading analytics dashboard...</div>}>
                    <CompanyBoardAnalytics
                      feedbackList={subscribedFeedback}
                      activePlan={activePlan}
                      user={user}
                      currentBrandName={activeBrandName}
                      onOpenVideoModal={onOpenVideoModal}
                      onOpenCartModal={onOpenCartModal}
                      onFeedbackUpdated={onFeedbackUpdated}
                    />
                  </Suspense>
                </div>
              )}

              {/* DEDICATED INSIGHTS TAB: 30-DAY FEEDBACK VOLUME RECHARTS LINE CHART */}
              {activeTab === 'insights' && (() => {
                const scopeLabel = activeBrandName;
                const insightsMetrics = computeChartMetricsFromFeedback(subscribedFeedback, scopeLabel);
                const series = insightsMetrics.dailyVolume30d;
                const total30d = series.reduce((sum, d) => sum + d.count, 0);
                const resolved30d = series.reduce((sum, d) => sum + d.resolved, 0);
                const open30d = series.reduce((sum, d) => sum + d.open, 0);
                const peakDay = series.reduce(
                  (best, cur) => (cur.count > best.count ? cur : best),
                  series[0] || { label: '-', count: 0 }
                );
                const last7Count = series.slice(-7).reduce((sum, d) => sum + d.count, 0);
                const prev7Count = series.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
                const activeDays = series.filter((d) => d.count > 0);

                return (
                  <div className="p-4 sm:p-6 space-y-5 bg-slate-50/40">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                          Feedback Volume Insights (Last 30 Days)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Daily submission volume and defect resolution trend for {scopeLabel}
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold self-start sm:self-auto">
                        {activeBrandName} Only
                      </span>
                    </div>

                    {/* 4 Tabular KPI Summary Cells */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <span className="text-xs text-slate-500 block">30-Day Submissions</span>
                        <strong className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                          {total30d}
                        </strong>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <span className="text-xs text-slate-500 block">Last 7 Days vs Prior 7d</span>
                        <strong className="text-2xl font-bold text-indigo-600 font-mono tabular-nums mt-1 block">
                          {last7Count} <span className="text-xs font-normal text-slate-400">/ {prev7Count}</span>
                        </strong>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <span className="text-xs text-slate-500 block">Peak Day ({peakDay.label})</span>
                        <strong className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                          {peakDay.count}
                        </strong>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <span className="text-xs text-slate-500 block">Resolved / Open</span>
                        <strong className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1 block">
                          {resolved30d} <span className="text-xs font-normal text-amber-600">/ {open30d} open</span>
                        </strong>
                      </div>
                    </div>

                    {/* Primary Recharts 30-Day LineChart */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 bg-indigo-600 inline-block" />
                            <span>Daily Feedback Volume</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
                            <span>Resolved Defects</span>
                          </span>
                        </div>
                        {total30d === 0 && (
                          <span className="text-xs text-slate-400">
                            No submissions recorded in the past 30 days for {scopeLabel}
                          </span>
                        )}
                      </div>

                      <div className="w-full h-72 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={series} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              tickLine={false}
                              axisLine={{ stroke: '#cbd5e1' }}
                              interval={4}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              tickLine={false}
                              axisLine={false}
                              domain={[0, (max: number) => Math.max(4, max + 1)]}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '10px',
                                fontSize: '12px',
                                color: '#f8fafc',
                              }}
                              labelStyle={{ fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="count"
                              name="Feedback Volume"
                              stroke="#4f46e5"
                              strokeWidth={2.5}
                              dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
                              activeDot={{ r: 5, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="resolved"
                              name="Resolved Defects"
                              stroke="#16a34a"
                              strokeWidth={2}
                              strokeDasharray="4 4"
                              dot={false}
                              activeDot={{ r: 4, fill: '#16a34a', stroke: '#ffffff', strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Active Days Breakdown Table */}
                    {activeDays.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900">Active Submission Days</h4>
                          <span className="text-xs text-slate-500 font-mono tabular-nums">
                            {activeDays.length} active {activeDays.length === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-4 font-semibold">Date</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Submissions</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Open Defects</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Resolved</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                              {[...activeDays].reverse().slice(0, 10).map((d) => (
                                <tr key={d.dateKey} className="hover:bg-slate-50/80">
                                  <td className="py-2.5 px-4 font-sans font-medium text-slate-800">{d.label} ({d.dateKey})</td>
                                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">{d.count}</td>
                                  <td className="py-2.5 px-4 text-right text-amber-600 font-semibold">{d.open}</td>
                                  <td className="py-2.5 px-4 text-right text-emerald-600 font-semibold">{d.resolved}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB CONTENT 1: CLEAN CUSTOMER VIDEOS */}
              {activeTab === 'videos' && (
                <div className="p-4 sm:p-5">
                  {filteredReviews.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
                      <Film className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                      <h4 className="font-bold text-xs text-slate-800">No Video Reviews Yet</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Clear your search filter or await new submissions for {activeBrandName}.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredReviews.map((item) => {
                        const phone = phoneById(item.phone);
                        const isResolved = item.defectStatus === 'resolved';
                        const summaryLine = item.dislike || item.improve || item.like || 'Verified customer review';

                        return (
                          <div
                            key={item.id}
                            className="p-4 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200 transition-colors flex flex-col justify-between space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {item.userAvatar ? (
                                  <img src={item.userAvatar} alt={item.user} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                    {item.user[0]}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-slate-900 truncate">
                                    {item.user} <span className="font-normal text-slate-400">· {item.city}</span>
                                  </div>
                                  <div className="text-[11px] font-medium text-indigo-700 truncate">
                                    {phone.name} · ★ {item.rating}.0
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                                  isResolved
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {isResolved ? 'Fixed' : 'Open Issue'}
                              </span>
                            </div>

                            {item.videoUrl && (
                              <HoverVideoThumbnail
                                item={item}
                                onOpen={() => onOpenVideoModal(item, 'summary')}
                              />
                            )}

                            <p className="text-xs text-slate-600 line-clamp-2">{summaryLine}</p>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onOpenVideoModal(item, 'summary')}
                                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>{item.videoUrl ? 'Watch Video' : 'Open Review'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT 2: CLEAN FEEDBACK & ORDERS LIST */}
              {activeTab === 'cart' && (
                <div className="divide-y divide-slate-100">
                  <div className="px-4 py-3 flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900">
                      Orders &amp; Feedback ({filteredReviews.length})
                    </h4>
                  </div>

                  {filteredReviews.length === 0 ? (
                    <div className="text-center py-8 px-4 text-xs text-slate-400">
                      No orders or customer feedback recorded for {activeBrandName} yet.
                    </div>
                  ) : (
                    filteredReviews.map((r) => {
                      const p = phoneById(r.phone);
                      const reportedIssue = r.dislike || r.improve || r.like || 'No issues reported';
                      const isFixed = r.defectStatus === 'resolved';

                      return (
                        <div
                          key={r.id}
                          className="px-4 py-2.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0 sm:w-[30%]">
                            {r.userAvatar ? (
                              <img src={r.userAvatar} alt={r.user} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {r.user[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-900 truncate">
                                {r.user} <span className="font-normal text-slate-400">· {r.city}</span>
                              </div>
                              <div className="text-[11px] font-medium text-indigo-700 truncate">
                                {p.name}{' '}
                                <span className="text-slate-400 font-mono">
                                  · {r.cartData?.priceUSD ? `$${r.cartData.priceUSD}` : rs(p.reward * 100)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-700 truncate" title={reportedIssue}>
                              {reportedIssue}
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                isFixed
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {isFixed ? 'Fixed' : 'Open Issue'}
                            </span>

                            <button
                              type="button"
                              onClick={() => (isFixed ? onOpenCartModal(r) : handleOpenFixProblem(r))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                isFixed
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white'
                              }`}
                            >
                              {isFixed ? 'View Order' : 'Fix Issue'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB CONTENT 3: MODEL DATA ANALYSIS WITH AI CART & AI CHATBOT (VISIBLE WHEN UNLOCKED) */}
              {activeTab === 'analysis' && (() => {
                const count = filteredReviews.length;
                const avgSentiment = count > 0
                  ? Math.round(filteredReviews.reduce((s, r) => s + getSentimentScore(r), 0) / count)
                  : 0;
                const defectCount = filteredReviews.filter(r => Boolean((r.dislike || r.improve || '').trim())).length;
                const defectPct = count > 0 ? Math.round((defectCount / count) * 100) : 0;
                const praisedPct = count > 0 ? Math.max(0, 100 - defectPct) : 0;
                const topPraise = representativeItem?.like || 'No customer praises recorded yet';
                const topDefect = representativeItem?.dislike || representativeItem?.improve || 'No defects reported';

                return (
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Model Header & Stats Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
                        Active Model Intelligence
                      </span>
                      <h4 className="font-black text-base sm:text-lg text-white">
                        {currentModelPhone.name} ({activeBrandName})
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Real customer video sentiment synthesis, AI defect pinpointing & customer cart
                      </p>
                    </div>

                    {representativeItem && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenCartModal(representativeItem)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Open AI Cart ({currentModelPhone.name})</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {!representativeItem ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
                      <BarChart3 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <h4 className="font-black text-sm text-slate-800">No Verified Feedback Data for {activeBrandName}</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Once customers submit video reviews for {activeBrandName}, real sentiment scores, praises, defects, and buyer cart metrics will appear here.
                      </p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    
                    {/* LEFT: AI Cart & Order Data for this specific model */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                            <ShoppingBag className="w-4 h-4 text-emerald-600" />
                            <span>AI Cart: Verified Purchase Data</span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {count} Verified {count === 1 ? 'Order' : 'Orders'}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Target Model:</span>
                            <span className="font-black text-slate-900">{phoneById(representativeItem.phone).name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Cart Order Value:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {representativeItem.cartData?.priceUSD ? `$${representativeItem.cartData.priceUSD}` : rs(phoneById(representativeItem.phone).reward * 100)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Verified Buyer Demand:</span>
                            <span className="font-bold text-emerald-700">{count} Cart {count === 1 ? 'Record' : 'Records'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Retail Invoice Proof:</span>
                            <span className="font-mono text-slate-600">{representativeItem.cartData?.invoiceNumber || representativeItem.id}</span>
                          </div>
                        </div>

                        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                          <p>
                            Verified customer <b>{representativeItem.user}</b> ({representativeItem.city}) recorded a real video feedback session.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenCartModal(representativeItem)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View Buyer Cart & Invoice Proof</span>
                      </button>
                    </div>

                    {/* RIGHT: Model Defect & Satisfaction Breakdown */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-indigo-600" />
                            <span>Defect & Satisfaction Metrics</span>
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                            {avgSentiment}% Positive
                          </span>
                        </div>

                        {/* Likes vs Defects Bar */}
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-emerald-700 flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3 text-emerald-600" />
                              <span>{praisedPct}% Clean Praise</span>
                            </span>
                            <span className="text-rose-600 flex items-center gap-1">
                              <ThumbsDown className="w-3 h-3 text-rose-500" />
                              <span>{defectPct}% Reported Defects</span>
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                            <div className="bg-emerald-500 h-full" style={{ width: `${praisedPct}%` }} />
                            <div className="bg-rose-500 h-full" style={{ width: `${defectPct}%` }} />
                          </div>
                        </div>

                        <div className="mt-3 space-y-2 text-xs">
                          <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                            <b className="text-emerald-800 block text-[10px] uppercase">Latest Customer Praise:</b>
                            <span className="text-emerald-950 text-xs">{topPraise}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-100">
                            <b className="text-rose-800 block text-[10px] uppercase">Latest Reported Defect:</b>
                            <span className="text-rose-950 text-xs">{topDefect}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenVideoModal(representativeItem)}
                        className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-indigo-200"
                      >
                        <Play className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                        <span>Watch Customer Video for {phoneById(representativeItem.phone).name}</span>
                      </button>
                    </div>

                  </div>
                  )}

                  {/* ========================================================
                      EMBEDDED AI CHATBOT ("AI cahtboth which help any specific modal data information")
                      ======================================================== */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-md space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5">
                            <span>AI Model Copilot: {currentModelPhone.name}</span>
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              Instant (&lt;0.005s)
                            </span>
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Ask any question about {activeBrandName} hardware defects, user praises, battery or purchase orders
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        ● Online & Ready
                      </span>
                    </div>

                    {/* Quick 1-Touch Model Query Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {[
                        `🔍 Camera quality & zoom on ${currentModelPhone.name}?`,
                        `🚨 What are the reported thermal & 4K video defects?`,
                        `🔋 Real battery drain & 5G performance?`,
                        `💡 What features do users wish were improved?`,
                        `🛒 Customer purchase demand and cart intent?`,
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendPrompt(chip)}
                          className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold whitespace-nowrap border border-slate-800 cursor-pointer transition-all shrink-0 hover:border-slate-700 active:scale-95"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* Chat Messages Log */}
                    <div
                      ref={chatScrollRef}
                      className="max-h-56 overflow-y-auto space-y-2.5 bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs"
                    >
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[94%] p-2.5 rounded-xl leading-relaxed ${
                              msg.sender === 'user'
                                ? 'bg-indigo-600 text-white font-medium text-right'
                                : 'bg-slate-950 text-slate-100 border border-slate-800'
                            }`}
                          >
                            <p className="whitespace-pre-line text-xs">
                              {msg.text}
                              {msg.isStreaming && (
                                <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 animate-pulse align-middle" />
                              )}
                            </p>
                          </div>
                          {msg.timestamp && (
                            <span className="text-[9px] font-mono text-slate-500 mt-0.5 px-1">
                              {msg.timestamp}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Input Form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendPrompt();
                      }}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        placeholder={`Ask anything about ${currentModelPhone.name} reviews, defects, or cart demand...`}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={isAiLoading || !inputPrompt.trim()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Ask Copilot</span>
                      </button>
                    </form>
                  </div>

                </div>
                );
              })()}

              {/* TAB CONTENT 4: COMPANY PROFILE & ACCOUNT ID DASHBOARD (MATCHING CONSUMER PROFILE DASHBOARD) */}
              {activeTab === 'profile' && (() => {
                const accountId = user?.googleId || 'Not signed in';
                const totalReviewsCount = subscribedFeedback.length;
                const resolvedCount = subscribedFeedback.filter((f) => f.defectStatus === 'resolved').length;
                const openCount = Math.max(0, totalReviewsCount - resolvedCount);
                const videoCount = subscribedFeedback.filter((f) => Boolean(f.videoUrl)).length;

                const handleCopyAccountId = () => {
                  if (!user?.googleId) return;
                  navigator.clipboard?.writeText(user.googleId);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 1800);
                };

                const companyProfileRows = [
                  {
                    id: 'edit_profile',
                    label: 'Edit Photo & Nickname',
                    val: user?.nickname ? `@${user.nickname.replace(/^@/, '')}` : 'Camera / Gallery',
                    action: () => setShowProfileModal(true),
                  },
                  {
                    id: 'account_id',
                    label: 'Account ID (Google UID)',
                    val: copiedId ? 'Copied to clipboard' : accountId,
                    mono: true,
                    action: handleCopyAccountId,
                  },
                  {
                    id: 'google',
                    label: 'Google & Mobile Identity',
                    val: user?.phone ? `+977 ${user.phone}` : (user?.email || 'Not connected'),
                    action: () => (onOpenAuth ? onOpenAuth('login') : setShowProfileModal(true)),
                  },
                  {
                    id: 'subscription',
                    label: 'Subscription & Brand Pass',
                    val: activePlan?.priceUSD ? `${activePlan.name} ($${activePlan.priceUSD})` : 'No Active Plan',
                    action: () => onOpenSubscriptionModal(selectedBrandCategory),
                  },
                  {
                    id: 'privacy',
                    label: 'Data Privacy',
                    val: 'Protected & Encrypted',
                    action: () => setShowCompanyPrivacyNotice((prev) => !prev),
                  },
                  ...(onLogout
                    ? [
                        {
                          id: 'logout',
                          label: 'Sign out',
                          val: '',
                          action: onLogout,
                        },
                      ]
                    : []),
                ];

                return (
                  <div className="p-4 sm:p-6 bg-slate-50/40">
                    <div className="max-w-2xl mx-auto space-y-5">
                      {/* Identity & Avatar Header (same structure as ConsumerView Profile Dashboard) */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowProfileModal(true)}
                          className="relative group cursor-pointer shrink-0 self-start sm:self-auto"
                          title="Click to change profile picture via camera or gallery"
                        >
                          {user?.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user?.name || 'Company User'}
                              className="w-[68px] h-[68px] rounded-full object-cover ring-2 ring-purple-500/40 group-hover:ring-purple-600 transition-all shadow-sm"
                            />
                          ) : (
                            <div className="w-[68px] h-[68px] rounded-full bg-slate-900 text-white grid place-items-center font-bold text-2xl shadow-sm">
                              {(user?.name || 'C').charAt(0)}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#17002e] border-2 border-white text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                            <Camera className="w-3.5 h-3.5 text-purple-300" />
                          </div>
                        </button>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-extrabold text-slate-900 truncate">
                              {user?.name || 'Company Manager'}
                            </h3>
                            {user?.nickname && (
                              <span className="text-xs font-mono font-semibold text-purple-700">
                                @{user.nickname.replace(/^@/, '')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                            <span>{user?.email || 'Not signed in'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{user?.city || 'Kathmandu'}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-slate-800">
                              {user?.role === 'company_admin' ? 'Platform Admin' : 'Company Portal'}
                            </span>
                          </div>
                          <div className="pt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                              ID: <strong className="text-slate-900">{accountId}</strong>
                            </span>
                            {user?.googleId && (
                              <button
                                type="button"
                                onClick={handleCopyAccountId}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              >
                                {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowProfileModal(true)}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                        >
                          <Camera className="w-3.5 h-3.5 text-purple-300" />
                          <span>Edit Photo & Nickname</span>
                        </button>
                      </div>

                      {showCompanyPrivacyNotice && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                          <div className="font-bold mb-1">Privacy & Access Lock</div>
                          Your Google account is verified and bound to one portal session (`1 Google Account = 1 Portal Access`). Private account fields are strictly isolated to your owner UID in Cloud Firestore.
                        </div>
                      )}

                      {/* Account & Subscription Summary Card (matching ConsumerView Tracker Card) */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                            <span>Company Identity & Portal Status</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('videos')}
                            className="text-blue-600 font-bold hover:underline cursor-pointer text-xs"
                          >
                            View Customer Videos ({videoCount}) →
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="text-[11px] text-slate-500 font-semibold">Active Plan</div>
                            <div className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
                              {activePlan?.priceUSD ? activePlan.name : 'Free Preview'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {unlockedBrandNames}
                            </div>
                          </div>
                          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                            <div className="text-[11px] text-emerald-800 font-semibold">Defects Resolved</div>
                            <div className="text-sm font-extrabold text-emerald-700 mt-0.5 tabular-nums">
                              {resolvedCount} Fixed
                            </div>
                            <div className="text-[11px] text-emerald-700/80 mt-0.5 tabular-nums">
                              {openCount} Open in Queue
                            </div>
                          </div>
                          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200">
                            <div className="text-[11px] text-indigo-900 font-semibold">Verified Google ID</div>
                            <div className="text-sm font-extrabold text-indigo-700 mt-0.5 font-mono truncate">
                              {user?.googleId ? `${user.googleId.slice(0, 12)}...` : 'Guest'}
                            </div>
                            <div className="text-[11px] text-indigo-700/80 mt-0.5">
                              {user?.isGoogleVerified ? 'Email Verified' : 'Sign-in Required'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4-Stat Grid (matching ConsumerView's 2x2 Stat Grid) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200">
                          <div className="text-xs font-semibold text-slate-500">Customer Videos</div>
                          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                            {videoCount}
                          </div>
                        </div>
                        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-emerald-900">
                          <div className="text-xs font-semibold text-emerald-700">Reviews Quota Left</div>
                          <div className="text-2xl font-extrabold mt-1 tabular-nums">
                            {remainingReviewsQuota}
                          </div>
                        </div>
                        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-amber-900">
                          <div className="text-xs font-semibold text-amber-800">Total Live Reviews</div>
                          <div className="text-2xl font-extrabold mt-1 tabular-nums">
                            {totalReviewsCount}
                          </div>
                        </div>
                        <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 text-purple-900">
                          <div className="text-xs font-semibold text-purple-800">Portal Access Mode</div>
                          <div className="text-lg font-extrabold mt-1 truncate">
                            {user?.role === 'company_admin' ? 'Admin Full' : 'Company Only'}
                          </div>
                        </div>
                      </div>

                      {/* Own Khalti QR Subscription Payment Records (Private to This Customer) */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-purple-700" />
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-900">
                                My Khalti QR Payment Records
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Private to your account only. Subscriptions activate after Admin confirms payment arrival.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenSubscriptionModal(selectedBrandCategory)}
                            className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold cursor-pointer"
                          >
                            + Pay with Khalti QR
                          </button>
                        </div>

                        {ownPaymentOrders.length === 0 ? (
                          <div className="text-center py-5 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                            No Khalti QR payment submissions on your account yet.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {ownPaymentOrders.map((ord) => {
                              const isApproved = ord.status === 'verified' || ord.status === 'completed';
                              const isRejected = ord.status === 'rejected' || ord.status === 'failed';
                              return (
                                <div
                                  key={ord.id}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                >
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-bold text-slate-900">{ord.purchaseOrderId}</span>
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          isApproved
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : isRejected
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-amber-100 text-amber-900'
                                        }`}
                                      >
                                        {isApproved ? (
                                          <>
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>Approved & Active</span>
                                          </>
                                        ) : isRejected ? (
                                          <>
                                            <XCircle className="w-3 h-3" />
                                            <span>Rejected</span>
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="w-3 h-3" />
                                            <span>Pending Verification</span>
                                          </>
                                        )}
                                      </span>
                                    </div>
                                    <div className="text-slate-700">
                                      <b>{ord.planName}</b> · {ord.categoryName} ·{' '}
                                      <span className="font-bold text-emerald-700">
                                        NPR {ord.amountNPR.toLocaleString('en-IN')} (${ord.amountUSD})
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                      <span>
                                        Khalti Txn ID: <strong className="font-mono text-slate-800">{ord.transactionReference || ord.khaltiTransactionId || '—'}</strong>
                                      </span>
                                      <span>·</span>
                                      <span>Submitted: {new Date(ord.createdAt).toLocaleString()}</span>
                                      {ord.verifiedAt && (
                                        <>
                                          <span>·</span>
                                          <span>Reviewed: {new Date(ord.verifiedAt).toLocaleString()}</span>
                                        </>
                                      )}
                                    </div>
                                    {(ord.errorReason || ord.verificationNotes) && (
                                      <div className={`text-[11px] ${isRejected ? 'text-rose-700 font-semibold' : 'text-slate-600'}`}>
                                        Note: {ord.errorReason || ord.verificationNotes}
                                      </div>
                                    )}
                                  </div>

                                  {ord.screenshotUrl && (
                                    <div className="shrink-0">
                                      <PrivatePaymentScreenshot
                                        src={ord.screenshotUrl}
                                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Settings List (matching ConsumerView Settings List) */}
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                        {companyProfileRows.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={row.action}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <span className={`flex-1 font-bold text-sm ${row.id === 'logout' ? 'text-rose-600' : 'text-slate-900'}`}>
                              {row.label}
                            </span>
                            {row.val && (
                              <span className={`text-xs text-slate-500 truncate max-w-[220px] ${row.mono ? 'font-mono' : ''}`}>
                                {row.val}
                              </span>
                            )}
                            {row.id === 'logout' ? (
                              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

        </section>

      </main>

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <Suspense fallback={null}>
          <UserProfileComponent
            user={user}
            onUpdateUser={onUpdateUser}
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            title="Company Profile & Brand Identity"
          />
        </Suspense>
      )}

      {/* Real-Time Video Alert Floating Toast */}
      {activeAlert && (
        <Suspense fallback={null}>
          <RealTimeVideoToast
            currentAlert={activeAlert}
            onDismiss={() => setActiveAlert(null)}
            onWatchVideo={(item) => onOpenVideoModal(item)}
            onFixError={(item) => handleOpenFixProblem(item)}
            onOpenCart={(item) => onOpenCartModal(item)}
          />
        </Suspense>
      )}

      {/* Interactive Fix Defect / Problem Resolution Modal */}
      {fixingProblemItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
            <button
              type="button"
              onClick={() => setFixingProblemItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 leading-tight">
                  Fix Customer Problem & Defect
                </h3>
                <p className="text-xs text-slate-500">
                  Engineering bug remediation for {fixingProblemItem.user}'s {phoneById(fixingProblemItem.phone).name}
                </p>
              </div>
            </div>

            {/* Device & Reported Defect Context */}
            <div className="my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-200/80">
                <span>Customer: <strong className="text-slate-900">{fixingProblemItem.user}</strong> ({fixingProblemItem.city})</span>
                <span className="font-mono text-indigo-700 font-bold">{fixingProblemItem.cartData?.orderId || `ORD-${fixingProblemItem.id.toUpperCase()}`}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Device Hardware:</span>
                <span className="font-bold text-slate-900">{phoneById(fixingProblemItem.phone).name}</span>
              </div>

              {/* User OS & App Version */}
              <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">User Client OS Version:</span>
                  <span className="font-mono font-bold text-xs text-purple-950">
                    {fixingProblemItem.osVersion || getPhoneOS(fixingProblemItem.phone)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">App Build:</span>
                  <span className="font-mono font-bold text-xs text-purple-950">
                    {fixingProblemItem.appVersion || 'v2.4.2 (Build #492)'}
                  </span>
                </div>
              </div>

              {/* Reported User Bug */}
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
                <div className="flex items-center gap-1 font-bold text-rose-800 text-[11px] mb-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Reported Defect:</span>
                </div>
                <p className="text-xs leading-relaxed italic">
                  "{fixingProblemItem.dislike || fixingProblemItem.improve || 'Thermal throttle in continuous 4K video recording'}"
                </p>
              </div>
            </div>

            {/* Fix Configuration Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProblemFix();
              }}
              className="space-y-3"
            >
              {/* Fix Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Defect Resolution Status:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'investigating', label: '🔍 Investigating', color: 'border-amber-400 bg-amber-50 text-amber-900' },
                    { id: 'fixing', label: '⚙️ In Progress', color: 'border-blue-400 bg-blue-50 text-blue-900' },
                    { id: 'resolved', label: '✓ Fixed & Deployed', color: 'border-emerald-500 bg-emerald-50 text-emerald-950 font-black' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setProblemResolutionState(st.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        problemResolutionState === st.id
                          ? `${st.color} ring-2 ring-indigo-500 shadow-2xs`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Fix Version */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Patch / Release Version:
                </label>
                <select
                  value={problemTargetVersion}
                  onChange={(e) => setProblemTargetVersion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="v2.5.0-hotfix1">v2.5.0-hotfix1 (Immediate OTA Patch)</option>
                  <option value="v2.5.1-stable">v2.5.1-stable (Scheduled Monthly Release)</option>
                  <option value="One UI 6.1.1 Maintenance Drop">One UI 6.1.1 Maintenance Drop</option>
                  <option value="Firmware Build #498">Firmware Build #498</option>
                </select>
              </div>

              {/* Engineering Resolution Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Engineering Fix Notes & Solution:
                </label>
                <textarea
                  value={problemPatchNote}
                  onChange={(e) => setProblemPatchNote(e.target.value)}
                  rows={2}
                  placeholder="Explain how this problem was fixed in firmware or code..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {fixError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {fixError}
                </div>
              )}

              {fixingProblemItem.defectStatus === 'resolved' && user?.role !== 'company_admin' && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  ✓ This defect is already resolved and locked in Firestore. Only an Admin can modify resolved records.
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFixingProblemItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFix || (fixingProblemItem.defectStatus === 'resolved' && user?.role !== 'company_admin')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSavingFix ? 'Saving to Firestore...' : 'Deploy Fix & Resolve Problem'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
