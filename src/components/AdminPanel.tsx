import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Clock, Search, 
  Filter, RefreshCw, Sparkles, Smartphone, Users, Wallet, CreditCard, 
  ArrowUpRight, AlertTriangle, Play, Check, X, Building2, TrendingUp, 
  Eye, FileText, Activity, MessageSquare, ChevronDown, Award, Star,
  SlidersHorizontal, Zap, Download, FileSpreadsheet, Settings, Menu,
  Moon, Sun, Bell, Mail, Globe, ChevronRight, Share2, DollarSign,
  Layers, Database, LogOut, Lock, Ban, UserX, UserCheck, ThumbsUp,
  ThumbsDown, Bot, Laptop, LayoutGrid, Receipt, AlertCircle,
  PieChart, BarChart2, ShoppingBag, ShoppingCart, Briefcase, Percent,
  TrendingDown, PenTool, Video, Volume2, VolumeX, RotateCcw, QrCode
} from 'lucide-react';
import { 
  FeedbackItem, UserProfile, RegisteredUser, AdminAuditLog, 
  AdminWithdrawalRequest, WithdrawalTransaction, KhaltiQrSettings, PaymentOrderRecord
} from '../types';
import { auth } from '../firebase';
import { phoneById } from '../data/initialData';
import { 
  exportFeedbackToCsv, 
  exportTransactionsToCsv, 
  exportCombinedAuditCsv 
} from '../utils/csvExporter';
import {
  PaymentRecord,
  DEFAULT_KHALTI_QR_SETTINGS,
  moderateFeedbackInFirestore,
  bulkApprovePendingFeedbackInFirestore,
  approveWithdrawalInFirestore,
  rejectWithdrawalAndRefundBatch,
  toggleUserStatusInFirestore,
  resetAllPlatformDataInFirestore,
  saveKhaltiQrSettings,
  approveStage1KhaltiOrderBatch,
  rejectStage1KhaltiOrderInFirestore,
} from '../services/firebaseService';
import {
  AdminRealtimeVideoToast,
  AdminVideoUploadAlert,
} from './AdminRealtimeVideoToast';
import { PrivatePaymentScreenshot } from './PrivatePaymentScreenshot';
import { resolveAssetUrl } from '../utils/assetUrl';

const ADMIN_DISMISSED_TOASTS_KEY = 'fp_admin_dismissed_toasts';

function isVideoFeedbackUpload(item: FeedbackItem): boolean {
  return Boolean(
    (item.videoUrl && item.videoUrl.trim().length > 0) ||
      (typeof item.seconds === 'number' && item.seconds > 0) ||
      (item.videoDuration && item.videoDuration !== '0:00') ||
      (item.allAnswers && Object.keys(item.allAnswers).length > 0)
  );
}

function getAlertIdentity(alert: AdminVideoUploadAlert): string {
  return (
    alert.feedback?.id ||
    alert.payment?.id ||
    alert.withdrawal?.id ||
    alert.id
  );
}

function getDismissedToastIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(ADMIN_DISMISSED_TOASTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function markToastIdDismissed(targetId: string): void {
  if (!targetId) return;
  try {
    const existing = getDismissedToastIds();
    existing.add(targetId);
    const trimmed = Array.from(existing).slice(-120);
    sessionStorage.setItem(ADMIN_DISMISSED_TOASTS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage restrictions
  }
}

function playUploadNotificationChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(660, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.11);
    gain2.gain.setValueAtTime(0.08, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.11);
    osc2.stop(now + 0.34);

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 450);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

interface AdminPanelProps {
  currentUser: UserProfile;
  feedbackList: FeedbackItem[];
  transactions?: WithdrawalTransaction[];
  adminWithdrawals?: AdminWithdrawalRequest[];
  payments?: PaymentRecord[];
  paymentOrders?: PaymentOrderRecord[];
  khaltiQrSettings?: KhaltiQrSettings;
  registeredUsers?: RegisteredUser[];
  onRefreshUsers?: () => Promise<void> | void;
  onOpenVideoModal: (item: FeedbackItem) => void;
  onUpdateFeedbackItem?: (updated: FeedbackItem) => void;
  onSwitchToView?: (view: 'customer' | 'company' | 'login' | 'dual' | 'admin') => void;
  onLockAdminSession?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  feedbackList,
  transactions = [],
  adminWithdrawals = [],
  payments = [],
  paymentOrders = [],
  khaltiQrSettings = DEFAULT_KHALTI_QR_SETTINGS,
  registeredUsers = [],
  onRefreshUsers,
  onOpenVideoModal,
  onUpdateFeedbackItem,
  onSwitchToView,
  onLockAdminSession,
}) => {
  // Navigation & Layout State (Responsive Mobile Drawer + Desktop Collapse)
  const [activeMenu, setActiveMenu] = useState<'main' | 'crm' | 'catalog' | 'tables' | 'withdrawals' | 'export' | 'audit' | 'users'>('main');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Loading & refresh state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Moderation state
  const [moderationFilter, setModerationFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View mode & source options
  const [feedbackDisplayMode, setFeedbackDisplayMode] = useState<'both' | 'computer_card' | 'moderation_table'>('both');
  const [feedbackSourceFilter, setFeedbackSourceFilter] = useState<'all' | 'customer' | 'company'>('all');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<'all' | 'video' | 'text'>('all');

  // Bulk approve confirmation modal
  const [showBulkApproveConfirm, setShowBulkApproveConfirm] = useState<boolean>(false);

  // Ban User Modal state
  const [banUserModal, setBanUserModal] = useState<any | null>(null);
  const [banReasonText, setBanReasonText] = useState<string>('Repeated submission of invalid or promotional video content.');

  // Block Idea Modal state
  const [blockIdeaModal, setBlockIdeaModal] = useState<any | null>(null);
  const [blockIdeaReasonText, setBlockIdeaReasonText] = useState<string>('Inappropriate review content, irrelevant audio or spam submission.');

  // Disapproval modal state
  const [rejectModalVideo, setRejectModalVideo] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Camera lens was obstructed or audio speech was unclear.');
  const [customRejectionText, setCustomRejectionText] = useState<string>('');

  // Withdrawal approval & disapproval modal state
  const [approveModalWithdrawal, setApproveModalWithdrawal] = useState<(AdminWithdrawalRequest & { uid?: string }) | null>(null);
  const [withdrawalTransferRef, setWithdrawalTransferRef] = useState<string>('');
  const [withdrawalReceiptNote, setWithdrawalReceiptNote] = useState<string>('');
  const [isApprovingWithdrawal, setIsApprovingWithdrawal] = useState<boolean>(false);

  const [rejectModalWithdrawal, setRejectModalWithdrawal] = useState<(AdminWithdrawalRequest & { uid?: string }) | null>(null);
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState<string>('Account details mismatch or incomplete KYC verification.');

  // Admin Khalti QR Settings & Manual Payment Verification state
  const [qrSettingsDraft, setQrSettingsDraft] = useState<KhaltiQrSettings>(khaltiQrSettings);
  const [showQrSettingsPanel, setShowQrSettingsPanel] = useState<boolean>(false);
  const [isSavingQrSettings, setIsSavingQrSettings] = useState<boolean>(false);
  const [paymentOrderFilter, setPaymentOrderFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'history'>('all');
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);
  const [verifyOrderModal, setVerifyOrderModal] = useState<PaymentOrderRecord | null>(null);
  const [verifyKhaltiTxnId, setVerifyKhaltiTxnId] = useState<string>('');
  const [verifyAmountNPR, setVerifyAmountNPR] = useState<string>('');
  const [verifyNotes, setVerifyNotes] = useState<string>('Confirmed payment arrived in Khalti account.');
  const [isVerifyingOrder, setIsVerifyingOrder] = useState<boolean>(false);
  const [rejectOrderModal, setRejectOrderModal] = useState<PaymentOrderRecord | null>(null);
  const [rejectOrderReason, setRejectOrderReason] = useState<string>('Transaction ID not found in Khalti account history.');
  const [isRejectingOrder, setIsRejectingOrder] = useState<boolean>(false);

  useEffect(() => {
    setQrSettingsDraft(khaltiQrSettings);
  }, [khaltiQrSettings]);

  // Audit logs & withdrawals filters
  const [auditFilter] = useState<string>('all');
  const [auditSearch] = useState<string>('');
  const [withdrawalStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // CSV Export Modal state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Full Platform Data Reset Modal state
  const [showResetDataConfirm, setShowResetDataConfirm] = useState<boolean>(false);
  const [isResettingData, setIsResettingData] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Real-Time Video Upload Toast & Notification Center State (Users + Company)
  const [toastQueue, setToastQueue] = useState<AdminVideoUploadAlert[]>([]);
  const [liveUploadHistory, setLiveUploadHistory] = useState<AdminVideoUploadAlert[]>([]);
  const [bellDropdownOpen, setBellDropdownOpen] = useState<boolean>(false);
  const [bellSourceFilter, setBellSourceFilter] = useState<'all' | 'user' | 'company'>('all');
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(true);
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null);
  const [approvingFeedbackId, setApprovingFeedbackId] = useState<string | null>(null);

  const bellPopoverRef = useRef<HTMLDivElement | null>(null);
  const mountTimeRef = useRef<number>(Date.now());
  const seenFeedbackIdsRef = useRef<Set<string>>(new Set(feedbackList.map((f) => f.id)));
  const previousCountRef = useRef<number>(feedbackList.length);
  const prevDefectMapRef = useRef<Map<string, string>>(
    new Map(feedbackList.map((f) => [f.id, `${f.defectStatus || ''}|${f.defectResolutionNote || ''}`]))
  );
  const seenPaymentIdsRef = useRef<Set<string>>(new Set(payments.map((p) => p.id)));
  const prevPaymentCountRef = useRef<number>(payments.length);
  const seenWithdrawalIdsRef = useRef<Set<string>>(new Set(adminWithdrawals.map((w) => w.id)));
  const prevWithdrawalCountRef = useRef<number>(adminWithdrawals.length);

  // Quick preset rejection options
  const PRESET_REASONS = [
    'Camera lens was covered or obstructed during recording.',
    'Microphone audio was silent, muffled, or inaudible.',
    'Review duration is under 20 seconds; please provide at least 1 minute of feedback.',
    'Device shown does not match the selected smartphone model.',
    'Content contains unrelated speech, background TV noise, or promotional spam.',
  ];

  const withdrawals = adminWithdrawals;

  // Refresh users directory from Firestore
  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      if (onRefreshUsers) {
        await onRefreshUsers();
      }
      setLastRefreshedAt(new Date().toLocaleTimeString());
      showToast('✓ Synced live Firestore records.');
    } catch (err) {
      console.warn('Failed to refresh admin records:', err);
      showToast('Failed to refresh Firestore records.');
    } finally {
      setIsLoading(false);
    }
  };

  // Display ephemeral feedback toast
  const showToast = useCallback((msg: string) => {
    setActionSuccessMsg(msg);
    window.setTimeout(() => setActionSuccessMsg(null), 4500);
  }, []);

  // Close Notification Bell popover on outside click
  useEffect(() => {
    if (!bellDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (bellPopoverRef.current && !bellPopoverRef.current.contains(e.target as Node)) {
        setBellDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [bellDropdownOpen]);

  // Seed initial recent User & Company alerts once on mount (without spamming old history)
  useEffect(() => {
    const now = Date.now();
    const dismissed = getDismissedToastIds();

    const recentPendingVideos = feedbackList
      .filter((f) => (f.moderationStatus || 'pending') === 'pending')
      .slice(0, 6);

    const recentPayments = payments.slice(0, 4);
    const recentWithdrawals = adminWithdrawals.filter((w) => w.status === 'pending').slice(0, 4);

    const initialHistory: AdminVideoUploadAlert[] = [
      ...recentPendingVideos.map((f) => {
        const ts = f.createdAt ? new Date(f.createdAt).getTime() : now;
        const isFresh = !dismissed.has(f.id) && ts > 0 && now - ts < 60_000;
        return {
          id: `hist-fb-${f.id}`,
          source: 'user' as const,
          kind: 'video_upload' as const,
          feedback: f,
          receivedAt: ts || now,
          read: !isFresh,
        };
      }),
      ...recentPayments.map((p) => {
        const ts = p.createdAt ? new Date(p.createdAt).getTime() : now;
        const isFresh = !dismissed.has(p.id) && ts > 0 && now - ts < 60_000;
        return {
          id: `hist-pay-${p.id}`,
          source: 'company' as const,
          kind: 'company_subscription' as const,
          payment: p,
          receivedAt: ts || now,
          read: !isFresh,
        };
      }),
      ...recentWithdrawals.map((w) => {
        const ts = w.requestedAt ? new Date(w.requestedAt).getTime() : now;
        const isFresh = !dismissed.has(w.id) && ts > 0 && now - ts < 60_000;
        return {
          id: `hist-wd-${w.id}`,
          source: 'user' as const,
          kind: 'withdrawal_request' as const,
          withdrawal: w,
          receivedAt: ts || now,
          read: !isFresh,
        };
      }),
    ]
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .slice(0, 15);

    if (initialHistory.length > 0) {
      setLiveUploadHistory(initialHistory);
      const freshToasts = initialHistory.filter((item) => !item.read).slice(0, 3);
      if (freshToasts.length > 0) {
        setToastQueue(freshToasts);
      }
    }
    // Run only on initial mount snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time Firestore watcher for newly submitted User feedback AND Company defect updates
  useEffect(() => {
    const prevIds = seenFeedbackIdsRef.current;
    const prevCount = previousCountRef.current;
    const prevDefects = prevDefectMapRef.current;
    const addedItems = feedbackList.filter((f) => !prevIds.has(f.id));

    seenFeedbackIdsRef.current = new Set(feedbackList.map((f) => f.id));
    previousCountRef.current = feedbackList.length;

    // Detect Company defect resolution changes on existing items
    const companyDefectUpdates: FeedbackItem[] = [];
    const nextDefectMap = new Map<string, string>();
    feedbackList.forEach((f) => {
      const sig = `${f.defectStatus || ''}|${f.defectResolutionNote || ''}`;
      nextDefectMap.set(f.id, sig);
      const prevSig = prevDefects.get(f.id);
      if (prevSig !== undefined && prevSig !== sig && f.defectStatus && f.defectStatus !== 'open') {
        companyDefectUpdates.push(f);
      }
    });
    prevDefectMapRef.current = nextDefectMap;

    // Keep queued/history feedback alerts synchronized with latest Firestore status
    setToastQueue((prev) =>
      prev
        .map((alert) => {
          if (!alert.feedback) return alert;
          const latest = feedbackList.find((f) => f.id === alert.feedback!.id);
          return latest ? { ...alert, feedback: latest } : alert;
        })
        .filter((alert) => {
          if (alert.kind === 'video_upload' && alert.feedback) {
            return (alert.feedback.moderationStatus || 'pending') === 'pending';
          }
          return true;
        })
    );

    setLiveUploadHistory((prev) =>
      prev.map((alert) => {
        if (!alert.feedback) return alert;
        const latest = feedbackList.find((f) => f.id === alert.feedback!.id);
        return latest ? { ...alert, feedback: latest } : alert;
      })
    );

    const now = Date.now();
    const dismissed = getDismissedToastIds();
    const incomingAlerts: AdminVideoUploadAlert[] = [];

    if (addedItems.length > 0) {
      const newUserSubmissions = addedItems.filter((item) => {
        if (dismissed.has(item.id)) return false;
        if (!isVideoFeedbackUpload(item) && !item.like && !item.dislike && !item.improve) return false;
        if (prevCount === 0) {
          const createdMs = item.createdAt ? new Date(item.createdAt).getTime() : 0;
          const isRecent = createdMs > 0 && now - createdMs < 90_000;
          const arrivedAfterHydration = now - mountTimeRef.current > 2500;
          return isRecent || arrivedAfterHydration;
        }
        return true;
      });

      newUserSubmissions.forEach((item) => {
        incomingAlerts.push({
          id: `live-fb-${item.id}-${now}`,
          source: 'user',
          kind: 'video_upload',
          feedback: item,
          receivedAt: item.createdAt ? new Date(item.createdAt).getTime() || now : now,
          read: false,
        });
      });
    }

    companyDefectUpdates.forEach((item) => {
      const defectAlertKey = `defect-${item.id}-${item.defectStatus}`;
      if (!dismissed.has(defectAlertKey)) {
        incomingAlerts.push({
          id: `live-defect-${item.id}-${now}`,
          source: 'company',
          kind: 'company_defect',
          feedback: item,
          receivedAt: now,
          read: false,
        });
      }
    });

    if (incomingAlerts.length === 0) return;

    setToastQueue((prev) => {
      const existingIds = new Set(prev.map(getAlertIdentity));
      const uniqueIncoming = incomingAlerts.filter((a) => !existingIds.has(getAlertIdentity(a)));
      return [...uniqueIncoming, ...prev].slice(0, 10);
    });

    setLiveUploadHistory((prev) => {
      const existingKeys = new Set(prev.map((a) => `${a.kind || 'video_upload'}-${getAlertIdentity(a)}`));
      const uniqueIncoming = incomingAlerts.filter(
        (a) => !existingKeys.has(`${a.kind || 'video_upload'}-${getAlertIdentity(a)}`)
      );
      return [...uniqueIncoming, ...prev].slice(0, 30);
    });

    if (soundAlertsEnabled) {
      playUploadNotificationChime();
    }
  }, [feedbackList, soundAlertsEnabled]);

  // Real-time watcher for Company Subscription Payments
  useEffect(() => {
    const prevIds = seenPaymentIdsRef.current;
    const prevCount = prevPaymentCountRef.current;
    const addedPayments = payments.filter((p) => !prevIds.has(p.id));

    seenPaymentIdsRef.current = new Set(payments.map((p) => p.id));
    prevPaymentCountRef.current = payments.length;

    if (addedPayments.length === 0) return;

    const now = Date.now();
    const dismissed = getDismissedToastIds();
    const freshPayments = addedPayments.filter((p) => {
      if (dismissed.has(p.id)) return false;
      if (prevCount === 0) {
        const createdMs = p.createdAt ? new Date(p.createdAt).getTime() : 0;
        return (createdMs > 0 && now - createdMs < 90_000) || now - mountTimeRef.current > 2500;
      }
      return true;
    });

    if (freshPayments.length === 0) return;

    const companyAlerts: AdminVideoUploadAlert[] = freshPayments.map((p) => ({
      id: `live-pay-${p.id}-${now}`,
      source: 'company',
      kind: 'company_subscription',
      payment: p,
      receivedAt: p.createdAt ? new Date(p.createdAt).getTime() || now : now,
      read: false,
    }));

    setToastQueue((prev) => [...companyAlerts, ...prev].slice(0, 10));
    setLiveUploadHistory((prev) => [...companyAlerts, ...prev].slice(0, 30));

    if (soundAlertsEnabled) {
      playUploadNotificationChime();
    }
  }, [payments, soundAlertsEnabled]);

  // Real-time watcher for User Withdrawal / Cashout Requests
  useEffect(() => {
    const prevIds = seenWithdrawalIdsRef.current;
    const prevCount = prevWithdrawalCountRef.current;
    const addedWithdrawals = adminWithdrawals.filter((w) => !prevIds.has(w.id));

    seenWithdrawalIdsRef.current = new Set(adminWithdrawals.map((w) => w.id));
    prevWithdrawalCountRef.current = adminWithdrawals.length;

    if (addedWithdrawals.length === 0) return;

    const now = Date.now();
    const dismissed = getDismissedToastIds();
    const freshWithdrawals = addedWithdrawals.filter((w) => {
      if (dismissed.has(w.id)) return false;
      if (prevCount === 0) {
        const createdMs = w.requestedAt ? new Date(w.requestedAt).getTime() : 0;
        return (createdMs > 0 && now - createdMs < 90_000) || now - mountTimeRef.current > 2500;
      }
      return true;
    });

    if (freshWithdrawals.length === 0) return;

    const wdAlerts: AdminVideoUploadAlert[] = freshWithdrawals.map((w) => ({
      id: `live-wd-${w.id}-${now}`,
      source: 'user',
      kind: 'withdrawal_request',
      withdrawal: w,
      receivedAt: w.requestedAt ? new Date(w.requestedAt).getTime() || now : now,
      read: false,
    }));

    setToastQueue((prev) => [...wdAlerts, ...prev].slice(0, 10));
    setLiveUploadHistory((prev) => [...wdAlerts, ...prev].slice(0, 30));

    if (soundAlertsEnabled) {
      playUploadNotificationChime();
    }
  }, [adminWithdrawals, soundAlertsEnabled]);

  // Prune stale alert entries automatically whenever backing collections are reset to 0
  useEffect(() => {
    const noFeedback = feedbackList.length === 0;
    const noPayments = payments.length === 0;
    const noWithdrawals = adminWithdrawals.length === 0;
    if (!noFeedback && !noPayments && !noWithdrawals) return;

    const shouldKeep = (a: AdminVideoUploadAlert) => {
      if (noFeedback && (a.kind === 'video_upload' || a.kind === 'company_defect' || !a.kind)) return false;
      if (noPayments && a.kind === 'company_subscription') return false;
      if (noWithdrawals && a.kind === 'withdrawal_request') return false;
      return true;
    };

    setToastQueue((prev) => prev.filter(shouldKeep));
    setLiveUploadHistory((prev) => prev.filter(shouldKeep));
  }, [feedbackList.length, payments.length, adminWithdrawals.length]);

  const handleDismissToast = useCallback((alertId: string) => {
    setToastQueue((prev) => {
      const target = prev.find((a) => a.id === alertId);
      if (target) {
        markToastIdDismissed(getAlertIdentity(target));
      }
      return prev.filter((a) => a.id !== alertId);
    });
  }, []);

  const handleDismissAllToasts = useCallback(() => {
    setToastQueue((prev) => {
      prev.forEach((a) => markToastIdDismissed(getAlertIdentity(a)));
      return [];
    });
  }, []);

  const markAlertReadByFeedbackId = useCallback((feedbackId: string) => {
    markToastIdDismissed(feedbackId);
    setLiveUploadHistory((prev) =>
      prev.map((a) => (a.feedback?.id === feedbackId ? { ...a, read: true } : a))
    );
    setToastQueue((prev) => prev.filter((a) => a.feedback?.id !== feedbackId));
  }, []);

  const markAlertReadById = useCallback((alert: AdminVideoUploadAlert) => {
    markToastIdDismissed(getAlertIdentity(alert));
    setLiveUploadHistory((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, read: true } : a))
    );
    setToastQueue((prev) => prev.filter((a) => a.id !== alert.id));
  }, []);

  const handleJumpToFeedbackInQueue = useCallback((item: FeedbackItem, alertId?: string) => {
    if (alertId) {
      handleDismissToast(alertId);
    }
    markAlertReadByFeedbackId(item.id);
    setBellDropdownOpen(false);
    setActiveMenu('crm');
    setFeedbackDisplayMode('both');
    setFeedbackSourceFilter('all');
    setFeedbackTypeFilter('all');
    setBrandFilter('all');
    setSearchQuery('');
    setModerationFilter(
      item.moderationStatus === 'approved' || item.moderationStatus === 'rejected'
        ? item.moderationStatus
        : 'pending'
    );
    setHighlightedFeedbackId(item.id);

    window.setTimeout(() => {
      const el =
        document.getElementById(`admin-feedback-card-${item.id}`) ||
        document.getElementById(`admin-feedback-row-${item.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    window.setTimeout(() => {
      setHighlightedFeedbackId((cur) => (cur === item.id ? null : cur));
    }, 6000);
  }, [handleDismissToast, markAlertReadByFeedbackId]);

  // CSV Export Handlers
  const handleExportFeedback = () => {
    const result = exportFeedbackToCsv(feedbackList);
    showToast(`✓ Exported ${result.rowCount} feedback reviews to ${result.filename}`);
  };

  const handleExportTransactions = () => {
    const result = exportTransactionsToCsv(transactions, withdrawals);
    showToast(`✓ Exported ${result.rowCount} financial transactions to ${result.filename}`);
  };

  const handleExportCombined = () => {
    const result = exportCombinedAuditCsv(feedbackList, transactions, withdrawals, registeredUsers);
    showToast(`✓ Exported full audit file (${result.rowCount} records) to ${result.filename}`);
  };

  // Helper to resolve Firestore user UID from either RegisteredUser or FeedbackItem
  const resolveTargetUid = (target: any): string => {
    if (!target) return '';
    if (typeof target.uid === 'string' && target.uid.trim()) return target.uid.trim();
    if (typeof target.googleId === 'string' && target.googleId.trim()) return target.googleId.trim();
    if (typeof target.id === 'string' && registeredUsers.some((u) => u.id === target.id)) {
      return target.id;
    }
    const emailCandidate = String(target.email || target.userEmail || '').toLowerCase();
    if (emailCandidate) {
      const byEmail = registeredUsers.find((u) => u.email.toLowerCase() === emailCandidate);
      if (byEmail) return byEmail.id;
      if (emailCandidate.endsWith('@verified')) {
        const prefix = emailCandidate.replace('@verified', '');
        const byPrefix = registeredUsers.find((u) => u.id.startsWith(prefix));
        if (byPrefix) return byPrefix.id;
      }
    }
    const nameCandidate = String(target.name || target.user || '').toLowerCase();
    if (nameCandidate) {
      const byName = registeredUsers.find((u) => u.name.toLowerCase() === nameCandidate);
      if (byName) return byName.id;
    }
    return '';
  };

  // One-click Approve Video Review (Firestore)
  const handleApproveVideo = async (video: any) => {
    setApprovingFeedbackId(video.id);
    try {
      await moderateFeedbackInFirestore({
        feedbackId: video.id,
        moderationStatus: 'approved',
        payoutStatus: 'credited',
        visibility: 'company_portal',
      });
      markAlertReadByFeedbackId(video.id);
      showToast(`✓ Approved! Rs. ${video.rewardAmount ?? 0} credited to ${video.user}`);
      if (onUpdateFeedbackItem) {
        onUpdateFeedbackItem({ ...video, moderationStatus: 'approved', payoutStatus: 'credited' });
      }
    } catch (err) {
      console.error('Approve failed:', err);
      showToast('Failed to approve review in Firestore.');
    } finally {
      setApprovingFeedbackId(null);
    }
  };

  // Disapprove Video Review (Firestore)
  const handleConfirmDisapproveVideo = async () => {
    if (!rejectModalVideo) return;
    const finalReason = customRejectionText.trim() || rejectionReason;
    try {
      await moderateFeedbackInFirestore({
        feedbackId: rejectModalVideo.id,
        moderationStatus: 'rejected',
        payoutStatus: 'rejected',
        defectResolutionNote: finalReason,
      });
      showToast(`✕ Disapproved ${rejectModalVideo.phoneName}. Reason saved.`);
      if (onUpdateFeedbackItem) {
        onUpdateFeedbackItem({
          ...rejectModalVideo,
          moderationStatus: 'rejected',
          payoutStatus: 'rejected',
          moderationReason: finalReason,
        });
      }
      setRejectModalVideo(null);
      setCustomRejectionText('');
    } catch (err) {
      console.error('Reject failed:', err);
      showToast('Failed to disapprove review in Firestore.');
    }
  };

  // Ban or Unban User Account (Firestore)
  const handleToggleBanUser = async (userToBan: any, shouldBlock: boolean) => {
    const targetUid = resolveTargetUid(userToBan);
    if (!targetUid) {
      showToast('Cannot locate Firestore user account to update status.');
      return;
    }
    try {
      await toggleUserStatusInFirestore(targetUid, shouldBlock ? 'banned' : 'active');
      showToast(
        shouldBlock
          ? `🚫 User ${userToBan.name || userToBan.user || targetUid} has been banned.`
          : `✓ User ${userToBan.name || userToBan.user || targetUid} has been reinstated.`
      );
      setBanUserModal(null);
      if (onRefreshUsers) {
        await onRefreshUsers();
      }
    } catch (err) {
      console.error('Ban user failed:', err);
      showToast('Failed to update user status in Firestore.');
    }
  };

  // Block or Unblock Specific Feedback Idea (Firestore)
  const handleToggleBlockFeedback = async (item: any, shouldBlock: boolean, customReason?: string) => {
    const finalReason = customReason || blockIdeaReasonText;
    try {
      await moderateFeedbackInFirestore({
        feedbackId: item.id,
        moderationStatus: shouldBlock ? 'rejected' : 'pending',
        payoutStatus: shouldBlock ? 'rejected' : 'pending',
        visibility: shouldBlock ? 'private' : 'company_portal',
        defectResolutionNote: shouldBlock ? finalReason : '',
      });
      showToast(
        shouldBlock
          ? `🚫 Feedback #${item.id} (${item.phoneName || item.phone}) has been blocked.`
          : `✓ Feedback #${item.id} has been restored.`
      );
      if (onUpdateFeedbackItem) {
        onUpdateFeedbackItem({
          ...item,
          isBlocked: shouldBlock,
          blockReason: shouldBlock ? finalReason : undefined,
          moderationStatus: shouldBlock ? 'rejected' : 'pending',
          payoutStatus: shouldBlock ? 'rejected' : 'pending',
        });
      }
      setBlockIdeaModal(null);
    } catch (err) {
      console.error('Block feedback failed:', err);
      showToast('Failed to update feedback visibility in Firestore.');
    }
  };

  // Bulk Approve All Pending Videos (Firestore Batch)
  const handleBulkApprove = () => {
    const pendingCount = allFeedbackItems.filter((v) => v.moderationStatus === 'pending').length;
    if (pendingCount === 0) {
      showToast('No pending reviews in queue.');
      return;
    }
    setShowBulkApproveConfirm(true);
  };

  const handleConfirmBulkApprove = async () => {
    const pendingIds = allFeedbackItems
      .filter((v) => v.moderationStatus === 'pending')
      .map((v) => v.id);
    setShowBulkApproveConfirm(false);
    if (pendingIds.length === 0) return;
    try {
      const count = await bulkApprovePendingFeedbackInFirestore(pendingIds);
      showToast(`✓ Bulk Approved ${count} pending reviews in Firestore.`);
    } catch (err) {
      console.error('Bulk approve error:', err);
      showToast('Failed to bulk approve pending reviews.');
    }
  };

  // Full Platform Data Reset (Firestore collections + wallet balances + Express cache)
  const handleConfirmResetAllData = async () => {
    if (isResettingData) return;
    setIsResettingData(true);
    setResetError(null);
    try {
      const summary = await resetAllPlatformDataInFirestore();
      try {
        sessionStorage.removeItem(ADMIN_DISMISSED_TOASTS_KEY);
      } catch {
        // Ignore storage errors
      }
      setToastQueue([]);
      setLiveUploadHistory([]);
      setHighlightedFeedbackId(null);
      seenFeedbackIdsRef.current = new Set();
      previousCountRef.current = 0;
      prevDefectMapRef.current = new Map();
      seenPaymentIdsRef.current = new Set();
      prevPaymentCountRef.current = 0;
      seenWithdrawalIdsRef.current = new Set();
      prevWithdrawalCountRef.current = 0;

      if (onRefreshUsers) {
        await onRefreshUsers();
      }
      setShowResetDataConfirm(false);
      setLastRefreshedAt(new Date().toLocaleTimeString());
      showToast(
        `✓ Reset complete: ${summary.deletedFeedback} feedback, ${summary.deletedPayments} payments, ${summary.deletedSubscriptions} subscriptions, ${summary.deletedWithdrawals} withdrawals cleared & ${summary.resetWallets} wallets zeroed.`
      );
    } catch (err: any) {
      console.error('Platform data reset failed:', err);
      setResetError(err?.message || 'Failed to reset platform data. Please try again.');
      showToast('Failed to reset platform data.');
    } finally {
      setIsResettingData(false);
    }
  };

  // Approve Creator Withdrawal with Real Transfer Reference & Receipt (Firestore)
  const handleOpenApproveWithdrawal = (w: AdminWithdrawalRequest & { uid?: string }) => {
    setApproveModalWithdrawal(w);
    setWithdrawalTransferRef('');
    setWithdrawalReceiptNote(`Paid manually via ${w.gateway} to ${w.accountNumber}`);
  };

  const handleConfirmApproveWithdrawal = async () => {
    if (!approveModalWithdrawal) return;
    const cleanRef = withdrawalTransferRef.trim();
    if (cleanRef.length < 3) {
      showToast('Enter the real payout transfer reference ID (minimum 3 characters).');
      return;
    }
    setIsApprovingWithdrawal(true);
    try {
      await approveWithdrawalInFirestore({
        withdrawalId: approveModalWithdrawal.id,
        uid: approveModalWithdrawal.uid || '',
        amountNPR: approveModalWithdrawal.amountNPR,
        gateway: approveModalWithdrawal.gateway,
        transferReference: cleanRef,
        receiptNote: withdrawalReceiptNote.trim(),
        adminId: currentUser.googleId || auth.currentUser?.uid || 'admin',
        adminName: currentUser.name || 'Admin',
      });
      showToast(`✓ Payout of Rs. ${approveModalWithdrawal.amountNPR} settled (Ref: ${cleanRef})!`);
      setApproveModalWithdrawal(null);
      setWithdrawalTransferRef('');
    } catch (err: unknown) {
      console.error('Approve withdrawal failed:', err);
      showToast(err instanceof Error ? err.message : 'Failed to approve withdrawal in Firestore.');
    } finally {
      setIsApprovingWithdrawal(false);
    }
  };

  // Admin: Save Manual Khalti QR Settings (never stores/exposes private phone or bank numbers)
  const handleSaveQrSettings = async () => {
    setIsSavingQrSettings(true);
    try {
      await saveKhaltiQrSettings({
        enabled: qrSettingsDraft.enabled,
        qrImagePath: qrSettingsDraft.qrImagePath,
        accountHolderName: qrSettingsDraft.accountHolderName,
        stage1Notice: qrSettingsDraft.stage1Notice || '',
        updatedByEmail: currentUser.email || 'pawanbahadursarki@gmail.com',
      });
      showToast('✓ Khalti QR settings updated.');
      setShowQrSettingsPanel(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save Khalti QR settings.');
    } finally {
      setIsSavingQrSettings(false);
    }
  };

  // Admin: Approve Manual Khalti QR Order after confirming money arrived & Activate Single-Brand Subscription
  const handleConfirmVerifyStage1Order = async () => {
    if (!verifyOrderModal) return;
    const cleanTxn = verifyKhaltiTxnId.trim();
    if (cleanTxn.length < 4) {
      showToast('Enter the real Khalti Transaction ID from your statement (min 4 characters).');
      return;
    }
    setIsVerifyingOrder(true);
    try {
      await approveStage1KhaltiOrderBatch({
        order: verifyOrderModal,
        khaltiTransactionId: cleanTxn,
        verifiedAmountNPR: Number(verifyAmountNPR || verifyOrderModal.amountNPR),
        verificationNotes: verifyNotes,
        adminId: currentUser.googleId || auth.currentUser?.uid || 'admin',
        adminName: currentUser.name || 'Admin',
      });
      showToast(`✓ Order ${verifyOrderModal.purchaseOrderId} approved & ${verifyOrderModal.categoryName} subscription activated!`);
      setVerifyOrderModal(null);
      setVerifyKhaltiTxnId('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to approve Khalti QR order.');
    } finally {
      setIsVerifyingOrder(false);
    }
  };

  // Admin: Reject unverified Manual Khalti QR Order
  const handleConfirmRejectStage1Order = async () => {
    if (!rejectOrderModal) return;
    setIsRejectingOrder(true);
    try {
      await rejectStage1KhaltiOrderInFirestore({
        orderId: rejectOrderModal.id,
        reason: rejectOrderReason,
        adminId: currentUser.googleId || auth.currentUser?.uid || 'admin',
        adminName: currentUser.name || 'Admin',
      });
      showToast(`✕ Order ${rejectOrderModal.purchaseOrderId} rejected.`);
      setRejectOrderModal(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to reject order.');
    } finally {
      setIsRejectingOrder(false);
    }
  };

  // Disapprove / Reject Creator Withdrawal & Refund Balance (Firestore Batch)
  const handleConfirmDisapproveWithdrawal = async () => {
    if (!rejectModalWithdrawal) return;
    const targetUid = rejectModalWithdrawal.uid || '';
    if (!targetUid) {
      showToast('Cannot process refund: withdrawal is missing user UID.');
      return;
    }
    try {
      await rejectWithdrawalAndRefundBatch({
        withdrawalId: rejectModalWithdrawal.id,
        uid: targetUid,
        amountNPR: rejectModalWithdrawal.amountNPR,
        reason: withdrawalRejectReason,
      });
      showToast(`✕ Withdrawal rejected. Rs. ${rejectModalWithdrawal.amountNPR} refunded to ${rejectModalWithdrawal.user}'s wallet.`);
      setRejectModalWithdrawal(null);
    } catch (err) {
      console.error('Disapprove withdrawal failed:', err);
      showToast('Failed to reject withdrawal in Firestore.');
    }
  };

  // Unified Inbound Reviews from live Firestore feedbackList
  const allFeedbackItems = useMemo(() => {
    return feedbackList.map((f) => {
      const p = phoneById(f.phone);
      const rating = Number(f.rating ?? 0);
      const computedScore = typeof f.sentimentScore === 'number' ? f.sentimentScore : 0;
      return {
        ...f,
        phoneName: f.phoneName || p?.name || f.phone,
        phoneBrand: f.phoneBrand || p?.brand || 'Smartphone',
        brandFolder: f.brandFolder || p?.brand || 'Smartphone',
        moderationStatus: f.moderationStatus || 'pending',
        payoutStatus: f.payoutStatus || 'pending',
        rewardAmount: typeof f.rewardAmount === 'number' ? f.rewardAmount : 0,
        userAvatar: f.userAvatar || '',
        city: f.city || 'Nepal',
        sentimentScore: computedScore,
        sentimentTone: f.sentimentTone || (rating >= 4 ? 'Constructive' : rating > 0 ? 'Critical' : 'Pending'),
        feedbackCategory: f.feedbackCategory || (f.dislike && !f.like ? 'Bug Report' : f.like ? 'Compliment' : 'Feature Request'),
        isBlocked: !!f.isBlocked,
        blockReason: f.blockReason,
      };
    });
  }, [feedbackList]);

  // Derived real-time revenue, charts, brand breakdown & audit stream
  const totalRevenueUSD = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'completed' || p.status === 'verified')
        .reduce((sum, p) => sum + Number(p.amountUSD || 0), 0),
    [payments]
  );

  const weeklyRevenueBars = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const totals = [0, 0, 0, 0, 0, 0, 0];
    payments.forEach((p) => {
      if (p.status !== 'completed' && p.status !== 'verified') return;
      const d = new Date(p.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const jsDay = d.getDay(); // 0=Sun..6=Sat
      const idx = jsDay === 0 ? 6 : jsDay - 1;
      totals[idx] += Number(p.amountUSD || 0);
    });
    const maxVal = Math.max(100, ...totals);
    const xPositions = [95, 165, 235, 305, 375, 445, 515];
    return {
      maxVal,
      bars: days.map((day, i) => {
        const amount = totals[i];
        const height = amount > 0 ? Math.max(10, Math.round((amount / maxVal) * 170)) : 4;
        const y = 200 - height;
        return {
          day,
          x: xPositions[i],
          amount,
          height,
          y,
          isEmpty: amount === 0,
          val: `$${amount.toFixed(2)}`,
        };
      }),
    };
  }, [payments]);

  const weeklyFeedbackTrend = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    allFeedbackItems.forEach((item) => {
      const d = new Date(item.createdAt || '');
      if (Number.isNaN(d.getTime())) return;
      const jsDay = d.getDay();
      const idx = jsDay === 0 ? 6 : jsDay - 1;
      counts[idx] += 1;
    });
    const maxCount = Math.max(5, ...counts);
    const xPositions = [85, 162, 238, 315, 392, 468, 545];
    const points = days.map((day, i) => {
      const count = counts[i];
      const cy = 200 - Math.round((count / maxCount) * 165);
      return { day, count, cx: xPositions[i], cy };
    });
    const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.cx},${pt.cy}`).join(' ');
    return { maxCount, points, pathD };
  }, [allFeedbackItems]);

  const brandBreakdown = useMemo(() => {
    const grouped = new Map<string, { brand: string; totalReviews: number; approvedCount: number; ratingSum: number; sentimentSum: number; subscribersCount: number }>();
    allFeedbackItems.forEach((item) => {
      const b = item.phoneBrand || item.brandFolder || 'Smartphone';
      const cur = grouped.get(b) || { brand: b, totalReviews: 0, approvedCount: 0, ratingSum: 0, sentimentSum: 0, subscribersCount: 0 };
      cur.totalReviews += 1;
      if (item.moderationStatus === 'approved') cur.approvedCount += 1;
      cur.ratingSum += Number(item.rating || 0);
      cur.sentimentSum += Number(item.sentimentScore || 0);
      grouped.set(b, cur);
    });
    payments.forEach((p) => {
      if (p.status !== 'completed' && p.status !== 'verified') return;
      const key = p.brandCategory === 'all' ? 'All Brands' : p.brandCategory || 'General';
      const existing = Array.from(grouped.values()).find((g) => g.brand.toLowerCase() === key.toLowerCase());
      if (existing) {
        existing.subscribersCount += 1;
      } else {
        grouped.set(key, {
          brand: key,
          totalReviews: 0,
          approvedCount: 0,
          ratingSum: 0,
          sentimentSum: 0,
          subscribersCount: 1,
        });
      }
    });
    return Array.from(grouped.values()).map((g) => ({
      brand: g.brand,
      totalReviews: g.totalReviews,
      approvedCount: g.approvedCount,
      subscribersCount: g.subscribersCount,
      avgRating: g.totalReviews > 0 ? (g.ratingSum / g.totalReviews).toFixed(1) : '0.0',
      avgSentiment: g.totalReviews > 0 ? Math.round(g.sentimentSum / g.totalReviews) : 0,
    }));
  }, [allFeedbackItems, payments]);

  const auditLogs: AdminAuditLog[] = useMemo(() => {
    const entries: AdminAuditLog[] = [];
    allFeedbackItems.forEach((f) => {
      entries.push({
        id: `aud-fb-${f.id}`,
        type: f.moderationStatus === 'approved' ? 'review_approved' : f.moderationStatus === 'rejected' ? 'review_rejected' : 'review_submitted',
        title: `${f.phoneName} review (${f.moderationStatus})`,
        description: f.like || f.dislike || f.improve || 'Submitted video review',
        actor: f.user,
        badge: `Rs. ${f.rewardAmount ?? 0}`,
        timestamp: f.createdAt || new Date().toISOString(),
      });
    });
    withdrawals.forEach((w) => {
      entries.push({
        id: `aud-wd-${w.id}`,
        type: w.status === 'approved' ? 'withdrawal_approved' : w.status === 'rejected' ? 'withdrawal_rejected' : 'withdrawal_requested',
        title: `Cashout via ${w.gateway} (${w.status})`,
        description: `Account ${w.accountNumber} • Net Rs. ${w.netPayoutNPR}`,
        actor: w.user,
        badge: `Rs. ${w.amountNPR}`,
        timestamp: w.decidedAt || w.requestedAt || new Date().toISOString(),
      });
    });
    payments.forEach((p) => {
      entries.push({
        id: `aud-pay-${p.id}`,
        type: 'subscription_purchased',
        title: `Subscription: ${p.planName || p.planId}`,
        description: `Gateway: ${p.gateway} • Ref: ${p.referenceId}`,
        actor: p.payerName,
        badge: `$${p.amountUSD.toFixed(2)}`,
        timestamp: p.createdAt || new Date().toISOString(),
      });
    });
    registeredUsers.forEach((u) => {
      entries.push({
        id: `aud-usr-${u.id}`,
        type: u.isBlocked || u.status === 'banned' ? 'user_blocked' : 'user_registered',
        title: u.isBlocked || u.status === 'banned' ? `Account banned: ${u.name}` : `User registered: ${u.name}`,
        description: `${u.email || 'Verified Google Account'} • Role: ${u.role}`,
        actor: u.name,
        badge: u.role,
        timestamp: u.createdAt || new Date().toISOString(),
      });
    });
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allFeedbackItems, withdrawals, payments, registeredUsers]);

  // Exact counts for "how many feedback come both useusers or company"
  const feedbackMetrics = useMemo(() => {
    const total = allFeedbackItems.length;
    // Videos: items with seconds, duration, videoUrl, or video answers
    const videos = allFeedbackItems.filter((f) => (f.seconds && f.seconds > 0) || f.videoUrl || f.videoDuration || f.allAnswers).length;
    // Written quotes/MCQs
    const written = allFeedbackItems.filter((f) => f.like || f.dislike || f.improve).length;
    // Both Used: items that have BOTH authentic video review and written feedback answers
    const bothUsed = allFeedbackItems.filter((f) => ((f.seconds && f.seconds > 0) || f.videoUrl || f.allAnswers) && (f.like || f.dislike || f.improve)).length;
    // Source breakdown: Customer Reviewers vs Company portal
    const customerCount = allFeedbackItems.filter((f) => !(f as any).isCompanyItem).length;
    const companyCount = allFeedbackItems.filter((f) => !!(f as any).isCompanyItem).length;

    // Status counts
    const pending = allFeedbackItems.filter((f) => f.moderationStatus === 'pending').length;
    const approved = allFeedbackItems.filter((f) => f.moderationStatus === 'approved').length;
    const rejected = allFeedbackItems.filter((f) => f.moderationStatus === 'rejected').length;
    const blockedIdeas = allFeedbackItems.filter((f) => f.isBlocked).length;
    const bannedUsers = registeredUsers.filter((u) => u.isBlocked || u.status === 'banned').length;

    // Categories
    const praise = allFeedbackItems.filter((f) => f.feedbackCategory === 'Compliment' || (!f.feedbackCategory && f.rating >= 4)).length;
    const bugs = allFeedbackItems.filter((f) => f.feedbackCategory === 'Bug Report' || (f.dislike && f.rating <= 3)).length;
    const wishes = allFeedbackItems.filter((f) => f.feedbackCategory === 'Feature Request').length;

    return {
      total,
      videos,
      written,
      bothUsed,
      customerCount,
      companyCount,
      pending,
      approved,
      rejected,
      blockedIdeas,
      bannedUsers,
      praise,
      bugs,
      wishes,
    };
  }, [allFeedbackItems, registeredUsers]);

  // Filtered Moderation Reviews
  const filteredVideos = useMemo(() => {
    return allFeedbackItems.filter((v) => {
      if (moderationFilter !== 'all' && v.moderationStatus !== moderationFilter) {
        return false;
      }
      if (brandFilter !== 'all') {
        const b = brandFilter.toLowerCase();
        const brandMatch =
          (v.brandFolder && v.brandFolder.toLowerCase().includes(b)) ||
          (v.phoneBrand && v.phoneBrand.toLowerCase().includes(b)) ||
          (v.phoneName && v.phoneName.toLowerCase().includes(b));
        if (!brandMatch) return false;
      }
      if (feedbackSourceFilter === 'customer' && (v as any).isCompanyItem) return false;
      if (feedbackSourceFilter === 'company' && !(v as any).isCompanyItem) return false;

      if (feedbackTypeFilter === 'video' && !((v.seconds && v.seconds > 0) || v.videoUrl || v.allAnswers)) return false;
      if (feedbackTypeFilter === 'text' && !(v.like || v.dislike || v.improve)) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          v.user.toLowerCase().includes(q) ||
          (v.phoneName && v.phoneName.toLowerCase().includes(q)) ||
          (v.userEmail && v.userEmail.toLowerCase().includes(q)) ||
          (v.like && v.like.toLowerCase().includes(q)) ||
          (v.dislike && v.dislike.toLowerCase().includes(q)) ||
          (v.city && v.city.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allFeedbackItems, moderationFilter, brandFilter, feedbackSourceFilter, feedbackTypeFilter, searchQuery]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditFilter !== 'all' && log.type !== auditFilter) {
        return false;
      }
      if (auditSearch) {
        const q = auditSearch.toLowerCase();
        return (
          log.title.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q) ||
          log.actor.toLowerCase().includes(q) ||
          (log.badge && log.badge.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [auditLogs, auditFilter, auditSearch]);

  // Filtered Withdrawals
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      if (withdrawalStatusFilter !== 'all' && w.status !== withdrawalStatusFilter) {
        return false;
      }
      return true;
    });
  }, [withdrawals, withdrawalStatusFilter]);

  // Counts for pills
  const pendingVideosCount = feedbackMetrics.pending;
  const approvedVideosCount = feedbackMetrics.approved;
  const rejectedVideosCount = feedbackMetrics.rejected;
  const pendingWithdrawalsCount = useMemo(() => withdrawals.filter((w) => w.status === 'pending').length, [withdrawals]);
  const pendingOrdersCount = useMemo(() => paymentOrders.filter((o) => o.status === 'pending').length, [paymentOrders]);

  // Handle Menu Navigation (auto close drawer on mobile)
  const handleSelectNav = (menu: typeof activeMenu) => {
    setActiveMenu(menu);
    setMobileDrawerOpen(false);
  };

  // Unread live upload & platform notifications count
  const unreadAlertsCount = useMemo(
    () => liveUploadHistory.filter((a) => !a.read).length,
    [liveUploadHistory]
  );

  // Active section header title
  const headerSectionTitle = useMemo(() => {
    switch (activeMenu) {
      case 'crm':
        return 'Video Moderation Queue';
      case 'tables':
        return 'Feedback Database';
      case 'withdrawals':
        return 'Orders & Cashouts';
      case 'catalog':
        return 'Brand Analytics';
      case 'users':
        return 'User Provisions';
      case 'audit':
        return 'Platform Audit Log';
      case 'export':
        return 'Exports & Settings';
      default:
        return 'Admin Dashboard';
    }
  }, [activeMenu]);

  return (
    <div className={`relative flex h-full w-full min-h-screen overflow-x-hidden font-sans ${isDarkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-[#f1f2f7] text-slate-800'}`}>
      
      {/* Real-Time Users + Company Toast Notification System */}
      <AdminRealtimeVideoToast
        alerts={toastQueue}
        onDismissCurrent={handleDismissToast}
        onDismissAll={handleDismissAllToasts}
        onWatchAndReview={(item, alertId) => {
          handleDismissToast(alertId);
          markAlertReadByFeedbackId(item.id);
          onOpenVideoModal(item);
        }}
        onApproveNow={async (item, alertId) => {
          await handleApproveVideo(item);
          handleDismissToast(alertId);
        }}
        onOpenRejectModal={(item, alertId) => {
          handleDismissToast(alertId);
          markAlertReadByFeedbackId(item.id);
          setRejectModalVideo(item);
        }}
        onJumpToQueue={(item, alertId) => {
          handleJumpToFeedbackInQueue(item, alertId);
        }}
        onNavigateSection={(menu, alertId) => {
          const target = toastQueue.find((a) => a.id === alertId);
          if (target) {
            markAlertReadById(target);
          } else {
            handleDismissToast(alertId);
          }
          setBellDropdownOpen(false);
          setActiveMenu(menu);
        }}
      />

      {/* Ephemeral Action Confirmation Toast */}
      {actionSuccessMsg && (
        <div
          className={`fixed right-4 sm:right-6 z-50 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-emerald-400/50 animate-in fade-in slide-in-from-top-2 ${
            toastQueue.length > 0 ? 'bottom-5 top-auto' : 'top-18'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span className="text-xs sm:text-sm">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* ====================================================================
          RESPONSIVE SIDEBAR:
          - On Mobile: Off-canvas drawer (slide-in from left when toggled)
          - On Desktop/Laptop: Collapsible icon rail (w-16) or comfortable w-60
          ==================================================================== */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${mobileDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-64'}
          w-72 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex flex-col shrink-0 transition-all duration-300 border-r border-slate-100 dark:border-slate-800
        `}
      >
        {/* Brand Header: "Board" with pen icon */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-[#5542f6] tracking-tight">Board</span>
            <span className="w-5 h-5 rounded-md bg-[#f0edff] text-[#5542f6] flex items-center justify-center text-xs shadow-2xs font-bold">
              ✎
            </span>
          </div>

          {/* Close button on Mobile Drawer */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-5 px-3.5 space-y-1.5 text-sm font-medium">
          
          {/* 1. Dashboard (Active Purple Pill) */}
          <button
            type="button"
            onClick={() => handleSelectNav('main')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
              activeMenu === 'main'
                ? 'bg-[#f0edff] text-[#5542f6] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Dashboard Overview"
          >
            <LayoutGrid className={`w-4 h-4 shrink-0 ${activeMenu === 'main' ? 'text-[#5542f6]' : 'text-slate-400'}`} />
            {(!sidebarCollapsed || mobileDrawerOpen) && <span>Dashboard</span>}
          </button>

          {/* 2. Analytics */}
          <button
            type="button"
            onClick={() => handleSelectNav('catalog')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
              activeMenu === 'catalog'
                ? 'bg-[#f0edff] text-[#5542f6] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Analytics"
          >
            <PieChart className={`w-4 h-4 shrink-0 ${activeMenu === 'catalog' ? 'text-[#5542f6]' : 'text-slate-400'}`} />
            {(!sidebarCollapsed || mobileDrawerOpen) && <span>Analytics</span>}
          </button>

          {/* 3. Users */}
          <button
            type="button"
            onClick={() => handleSelectNav('users')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
              activeMenu === 'users'
                ? 'bg-[#f0edff] text-[#5542f6] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Users Directory"
          >
            <Users className={`w-4 h-4 shrink-0 ${activeMenu === 'users' ? 'text-[#5542f6]' : 'text-slate-400'}`} />
            {(!sidebarCollapsed || mobileDrawerOpen) && <span>User Provisions ({registeredUsers.length})</span>}
          </button>

          {/* 4. Orders / Cashouts */}
          <button
            type="button"
            onClick={() => handleSelectNav('withdrawals')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
              activeMenu === 'withdrawals'
                ? 'bg-[#f0edff] text-[#5542f6] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Orders & Payouts"
          >
            <div className="flex items-center gap-3.5 truncate">
              <ShoppingCart className={`w-4 h-4 shrink-0 ${activeMenu === 'withdrawals' ? 'text-[#5542f6]' : 'text-slate-400'}`} />
              {(!sidebarCollapsed || mobileDrawerOpen) && <span>Orders</span>}
            </div>
            {(pendingWithdrawalsCount + pendingOrdersCount) > 0 && (!sidebarCollapsed || mobileDrawerOpen) && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                {pendingWithdrawalsCount + pendingOrdersCount}
              </span>
            )}
          </button>

          {/* 5. Messages (CRM / Moderation Queue with Badge 12) */}
          <button
            type="button"
            onClick={() => handleSelectNav('crm')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
              activeMenu === 'crm'
                ? 'bg-[#f0edff] text-[#5542f6] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Messages & Video Moderation"
          >
            <div className="flex items-center gap-3.5 truncate">
              <Mail className={`w-4 h-4 shrink-0 ${activeMenu === 'crm' ? 'text-[#5542f6]' : 'text-slate-400'}`} />
              {(!sidebarCollapsed || mobileDrawerOpen) && <span>Messages</span>}
            </div>
            {(!sidebarCollapsed || mobileDrawerOpen) && pendingVideosCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#fff0f0] text-[#ff5c5c] font-bold text-[11px]">
                {pendingVideosCount}
              </span>
            )}
          </button>

          {/* 6. Settings / Export */}
          <button
            type="button"
            onClick={() => {
              handleSelectNav('export');
              setShowExportModal(true);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
              activeMenu === 'export'
                ? 'bg-[#f0edff] text-[#5542f6] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Settings & CSV Exporter"
          >
            <Settings className={`w-4 h-4 shrink-0 ${activeMenu === 'export' ? 'text-[#5542f6]' : 'text-slate-400'}`} />
            {(!sidebarCollapsed || mobileDrawerOpen) && <span>Settings</span>}
          </button>

          {/* Direct Tables & Moderation Link */}
          <button
            type="button"
            onClick={() => handleSelectNav('tables')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
              activeMenu === 'tables'
                ? 'bg-[#f0edff] text-[#5542f6] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Review Moderation Database"
          >
            <Layers className={`w-4 h-4 shrink-0 ${activeMenu === 'tables' ? 'text-[#5542f6]' : 'text-slate-400'}`} />
            {(!sidebarCollapsed || mobileDrawerOpen) && <span>Feedback Database</span>}
          </button>

          {/* Audit Log */}
          <button
            type="button"
            onClick={() => handleSelectNav('audit')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
              activeMenu === 'audit'
                ? 'bg-[#f0edff] text-[#5542f6] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Live Platform Audit Log"
          >
            <Activity className={`w-4 h-4 shrink-0 ${activeMenu === 'audit' ? 'text-[#5542f6]' : 'text-slate-400'}`} />
            {(!sidebarCollapsed || mobileDrawerOpen) && <span>Audit Log</span>}
          </button>

        </nav>

        {/* Sidebar Footer: Live Connection & Security Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 shrink-0 text-xs">
          {(!sidebarCollapsed || mobileDrawerOpen) && (
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-600 dark:text-slate-300">Live Sync</span>
              </div>
              <span className="font-mono tabular-nums text-[11px] text-slate-400">{allFeedbackItems.length} reviews</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-1.5 pt-1">
            {onLockAdminSession && (
              <button
                type="button"
                onClick={onLockAdminSession}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Lock Session"
              >
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                {(!sidebarCollapsed || mobileDrawerOpen) && <span>Lock</span>}
              </button>
            )}
            {onSwitchToView && (
              <button
                type="button"
                onClick={() => onSwitchToView('company')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Company Portal"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                {(!sidebarCollapsed || mobileDrawerOpen) && <span>Portal</span>}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ====================================================================
          MAIN DASHBOARD BODY AREA (Clean Modern Board Layout)
          ==================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-y-auto bg-[#f8f9fd] dark:bg-slate-950">
        
        {/* Top Header Bar: Clean White with "Dashboard", "Last 30 days", search, dark mode & JD avatar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-20 shadow-2xs">
          
          {/* Left: Hamburger + Dashboard Title + Date Range Selector */}
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileDrawerOpen(!mobileDrawerOpen);
                } else {
                  setSidebarCollapsed(!sidebarCollapsed);
                }
              }}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
              {headerSectionTitle}
            </h1>

            {/* "Last 30 days" selector */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs rounded-full font-medium">
              <span>Last 30 days</span>
            </div>

            {/* Quick Switch to Both Dashboards, Users App, or Company */}
            {onSwitchToView && (
              <div className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => onSwitchToView('dual')}
                  className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs cursor-pointer transition-all whitespace-nowrap shrink-0"
                  title="View Both Dashboards Side-by-Side"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Both Dashboards</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchToView('customer')}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0"
                  title="Go to Consumer App"
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                  <span>Consumer App</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchToView('company')}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0"
                  title="Go to Company Portal & Chart"
                >
                  <Building2 className="w-3.5 h-3.5 text-purple-500" />
                  <span>Company</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Search, Sound Toggle, Refresh, Dark Mode, Live Upload Notification Bell, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            
            {/* Search Input */}
            <div className="relative hidden md:block w-44 lg:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border-0 rounded-full text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5542f6]"
              />
            </div>

            {/* Refresh Sync Button */}
            <button
              type="button"
              onClick={handleRefreshData}
              disabled={isLoading}
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={`Last synced ${lastRefreshedAt}`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#5542f6]' : ''}`} />
            </button>

            {/* Admin Full Data Reset Button */}
            <button
              type="button"
              onClick={() => {
                setResetError(null);
                setShowResetDataConfirm(true);
              }}
              className="px-2.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              title="Reset all feedback, payments, subscriptions, withdrawals, and wallet balances to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset All Data</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Real-Time Video Upload Notification Bell & Dropdown */}
            <div className="relative" ref={bellPopoverRef}>
              <button
                type="button"
                onClick={() => setBellDropdownOpen((prev) => !prev)}
                className="p-2 relative rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={`${pendingVideosCount} Pending Video Reviews`}
                aria-label="Open live video upload notifications"
              >
                <Bell className="w-4 h-4" />
                {(unreadAlertsCount > 0 || pendingVideosCount > 0) && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-mono tabular-nums font-bold text-[10px] flex items-center justify-center">
                    {unreadAlertsCount > 0 ? unreadAlertsCount : pendingVideosCount}
                  </span>
                )}
              </button>

              {bellDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Users & Company Alerts
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {pendingVideosCount} pending review · {unreadAlertsCount} unread
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSoundAlertsEnabled((prev) => !prev)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        title={soundAlertsEnabled ? 'Mute alert chime' : 'Unmute alert chime'}
                      >
                        {soundAlertsEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#5542f6]" /> : <VolumeX className="w-3.5 h-3.5" />}
                      </button>
                      {unreadAlertsCount > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setLiveUploadHistory((prev) => prev.map((a) => ({ ...a, read: true })))
                          }
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#5542f6] hover:bg-[#f0edff] dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Source Filter Tabs: All / Users / Company */}
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'user', label: 'Users' },
                        { id: 'company', label: 'Company' },
                      ] as const
                    ).map((tab) => {
                      const active = bellSourceFilter === tab.id;
                      const tabCount =
                        tab.id === 'all'
                          ? liveUploadHistory.length
                          : liveUploadHistory.filter(
                              (a) =>
                                (a.source ||
                                  (a.kind === 'company_subscription' || a.kind === 'company_defect'
                                    ? 'company'
                                    : 'user')) === tab.id
                            ).length;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setBellSourceFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap ${
                            active
                              ? 'bg-[#5542f6] text-white'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className="font-mono tabular-nums text-[10px] opacity-80">{tabCount}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {(() => {
                      const visibleAlerts = liveUploadHistory.filter((a) => {
                        const src =
                          a.source ||
                          (a.kind === 'company_subscription' || a.kind === 'company_defect'
                            ? 'company'
                            : 'user');
                        return bellSourceFilter === 'all' || src === bellSourceFilter;
                      });
                      if (visibleAlerts.length === 0) {
                        return (
                          <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                            <Bell className="w-6 h-6 mx-auto text-slate-400" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300">
                              No {bellSourceFilter === 'all' ? 'recent' : bellSourceFilter} alerts yet
                            </p>
                            <p className="text-[11px]">
                              New user uploads, cashouts, and company subscriptions or defect fixes appear here live.
                            </p>
                          </div>
                        );
                      }

                      return visibleAlerts.slice(0, 12).map((alertItem) => {
                        const kind = alertItem.kind || 'video_upload';
                        const src =
                          alertItem.source ||
                          (kind === 'company_subscription' || kind === 'company_defect'
                            ? 'company'
                            : 'user');

                        if (kind === 'company_subscription' && alertItem.payment) {
                          const pay = alertItem.payment;
                          return (
                            <div
                              key={alertItem.id}
                              className={`p-3 space-y-2 transition-colors ${
                                !alertItem.read
                                  ? 'bg-amber-50/70 dark:bg-slate-800/60'
                                  : 'bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase">
                                      Company
                                    </span>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {pay.payerName}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    Subscribed: {pay.planName || pay.planId} ({pay.brandCategory}) · +${pay.amountUSD.toFixed(2)}
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                                  {new Date(alertItem.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    markAlertReadById(alertItem);
                                    setBellDropdownOpen(false);
                                    setActiveMenu('catalog');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#5542f6] text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
                                >
                                  Brand Analytics
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    markAlertReadById(alertItem);
                                    setBellDropdownOpen(false);
                                    setActiveMenu('audit');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  Audit Log
                                </button>
                              </div>
                            </div>
                          );
                        }

                        if (kind === 'withdrawal_request' && alertItem.withdrawal) {
                          const wd = alertItem.withdrawal;
                          return (
                            <div
                              key={alertItem.id}
                              className={`p-3 space-y-2 transition-colors ${
                                !alertItem.read
                                  ? 'bg-emerald-50/60 dark:bg-slate-800/60'
                                  : 'bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold uppercase">
                                      User
                                    </span>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {wd.user}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    Cashout {wd.gateway} · Rs. {wd.amountNPR}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 capitalize shrink-0">
                                  {wd.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    markAlertReadById(alertItem);
                                    setBellDropdownOpen(false);
                                    setActiveMenu('withdrawals');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
                                >
                                  Review Cashout
                                </button>
                              </div>
                            </div>
                          );
                        }

                        const fb = alertItem.feedback;
                        if (!fb) return null;
                        const status = fb.moderationStatus || 'pending';
                        const isApprovingThis = approvingFeedbackId === fb.id;
                        return (
                          <div
                            key={alertItem.id}
                            className={`p-3 space-y-2 transition-colors ${
                              !alertItem.read
                                ? 'bg-[#f8f7ff] dark:bg-slate-800/60'
                                : 'bg-white dark:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                      src === 'company'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-indigo-100 text-indigo-800'
                                    }`}
                                  >
                                    {src === 'company' ? 'Company' : 'User'}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {fb.user}
                                  </span>
                                  <span className="text-[10px] font-mono tabular-nums text-slate-400">
                                    · {new Date(alertItem.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {kind === 'company_defect'
                                    ? `Defect marked ${fb.defectStatus} · ${fb.phoneName || phoneById(fb.phone).name}`
                                    : `${fb.phoneName || phoneById(fb.phone).name} · Rs. ${fb.rewardAmount ?? 0}`}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize shrink-0 ${
                                  status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : status === 'rejected'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {status}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  markAlertReadById(alertItem);
                                  setBellDropdownOpen(false);
                                  onOpenVideoModal(fb);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-[#5542f6] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Watch</span>
                              </button>

                              {status !== 'approved' && (
                                <button
                                  type="button"
                                  disabled={isApprovingThis}
                                  onClick={() => handleApproveVideo(fb)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{isApprovingThis ? 'Saving...' : 'Approve'}</span>
                                </button>
                              )}

                              {status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    markAlertReadById(alertItem);
                                    setBellDropdownOpen(false);
                                    setRejectModalVideo(fb);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                                >
                                  Disapprove
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleJumpToFeedbackInQueue(fb, alertItem.id)}
                                className="ml-auto px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
                              >
                                Locate →
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setBellDropdownOpen(false);
                        setActiveMenu('crm');
                        setModerationFilter('pending');
                      }}
                      className="w-full py-1.5 rounded-xl bg-[#5542f6] hover:bg-[#4633e6] text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      Open Video Moderation Queue ({pendingVideosCount})
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Current Admin Profile Avatar */}
            <div className="flex items-center gap-1.5 pl-1" title={currentUser.email || currentUser.name}>
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name || 'Admin'}
                  className="w-8 h-8 rounded-full object-cover border border-purple-200 shadow-2xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#f0edff] text-[#5542f6] font-extrabold text-xs flex items-center justify-center border border-purple-200 shadow-2xs">
                  {(currentUser.name || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </div>

          </div>
        </header>

        {/* Scrollable Dashboard Canvas */}
        <main className="p-4 sm:p-7 space-y-6 max-w-7xl w-full mx-auto">
          
          {activeMenu === 'main' && (
            <>
              {/* ROW 1: 4 REAL-TIME FIRESTORE KPI METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            
            {/* 1. Total Revenue Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 block">Total Revenue</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  ${totalRevenueUSD.toLocaleString(undefined, { minimumFractionDigits: totalRevenueUSD % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{payments.length} {payments.length === 1 ? 'payment' : 'payments'}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#f0edff] text-[#5542f6] font-black text-lg flex items-center justify-center shrink-0">
                $
              </div>
            </div>

            {/* 2. Registered Users Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 block">Registered Users</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {registeredUsers.length.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{registeredUsers.filter((u) => !u.isBlocked && u.status !== 'banned').length} active</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#e6fbf2] text-[#10b981] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-[#10b981]" />
              </div>
            </div>

            {/* 3. Orders & Cashouts Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 block">Orders & Cashouts</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {(payments.length + withdrawals.length).toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <span>{pendingWithdrawalsCount} pending cashouts</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#fff7ec] text-[#f59e0b] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-[#f59e0b]" />
              </div>
            </div>

            {/* 4. Approval Rate Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400 block">Approval Rate</span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {allFeedbackItems.length > 0
                    ? `${Math.round((feedbackMetrics.approved / allFeedbackItems.length) * 100)}%`
                    : '0%'}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{feedbackMetrics.approved}/{allFeedbackItems.length} approved</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#fdf2f4] text-[#ec4899] font-black text-lg flex items-center justify-center shrink-0">
                %
              </div>
            </div>

          </div>

          {/* ROW 2: REAL-DATA CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Weekly Revenue Bar Chart (Real Subscription Payments) */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                  Weekly Revenue
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  ${totalRevenueUSD.toFixed(2)} live total
                </span>
              </div>

              <div className="w-full overflow-x-auto">
                <svg className="w-full h-56 sm:h-64" viewBox="0 0 600 240" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="purpleBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6754f9" />
                      <stop offset="100%" stopColor="#5542f6" />
                    </linearGradient>
                  </defs>

                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = Math.round(200 - ratio * 170);
                    const val = Math.round(weeklyRevenueBars.maxVal * ratio);
                    return (
                      <g key={idx}>
                        <text x="45" y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-sans">
                          ${val}
                        </text>
                        <line x1="60" y1={y} x2="580" y2={y} stroke="rgba(226, 232, 240, 0.6)" strokeWidth="1" strokeDasharray="2 2" />
                      </g>
                    );
                  })}

                  {weeklyRevenueBars.bars.map((bar, idx) => (
                    <g key={idx} className="cursor-pointer group">
                      <title>{`${bar.day}: ${bar.val}`}</title>
                      <rect
                        x={bar.x}
                        y={bar.y}
                        width="36"
                        height={bar.height}
                        rx="4"
                        fill={bar.isEmpty ? '#e2e8f0' : 'url(#purpleBarGrad)'}
                        className="transition-all duration-200 opacity-90 group-hover:opacity-100"
                      />
                      <text x={bar.x + 18} y="222" textAnchor="middle" className="text-[11px] font-semibold fill-slate-500 dark:fill-slate-400">
                        {bar.day}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Channels / Submissions Donut Chart (Real Firestore Proportions) */}
            {(() => {
              const videoCnt = feedbackMetrics.videos;
              const textOnlyCnt = Math.max(0, feedbackMetrics.total - videoCnt);
              const cashoutCnt = withdrawals.length;
              const totalSeg = videoCnt + textOnlyCnt + cashoutCnt;
              const circ = 427;
              const s1 = totalSeg > 0 ? Math.round((videoCnt / totalSeg) * circ) : 0;
              const s2 = totalSeg > 0 ? Math.round((textOnlyCnt / totalSeg) * circ) : 0;
              const s3 = totalSeg > 0 ? Math.max(0, circ - s1 - s2) : 0;
              return (
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                      Platform Activity
                    </h3>
                    <span className="text-xs font-mono text-slate-400">{totalSeg} events</span>
                  </div>

                  <div className="flex items-center justify-center my-3 relative">
                    <svg className="w-44 h-44" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="68" fill="none" stroke="#e2e8f0" strokeWidth="22" />
                      {totalSeg > 0 && s1 > 0 && (
                        <circle
                          cx="100"
                          cy="100"
                          r="68"
                          fill="none"
                          stroke="#00c9e6"
                          strokeWidth="24"
                          strokeDasharray={`${s1} ${circ}`}
                          strokeDashoffset="0"
                        />
                      )}
                      {totalSeg > 0 && s2 > 0 && (
                        <circle
                          cx="100"
                          cy="100"
                          r="68"
                          fill="none"
                          stroke="#5542f6"
                          strokeWidth="24"
                          strokeDasharray={`${s2} ${circ}`}
                          strokeDashoffset={-s1}
                        />
                      )}
                      {totalSeg > 0 && s3 > 0 && (
                        <circle
                          cx="100"
                          cy="100"
                          r="68"
                          fill="none"
                          stroke="#ffb020"
                          strokeWidth="24"
                          strokeDasharray={`${s3} ${circ}`}
                          strokeDashoffset={-(s1 + s2)}
                        />
                      )}
                      <text x="100" y="97" textAnchor="middle" className="text-2xl font-black fill-slate-800 dark:fill-white">
                        {totalSeg}
                      </text>
                      <text x="100" y="116" textAnchor="middle" className="text-[10px] font-semibold fill-slate-400">
                        {totalSeg === 0 ? 'No Activity' : 'Total Events'}
                      </text>
                    </svg>
                  </div>

                  <div className="flex items-center justify-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-50 dark:border-slate-800/60 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00c9e6]" />
                      <span>Videos ({videoCnt})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#5542f6]" />
                      <span>Text ({textOnlyCnt})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ffb020]" />
                      <span>Cashouts ({cashoutCnt})</span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* ROW 3: FEEDBACK TREND & ACTIVE USERS CARD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Feedback Submissions Trend Line Chart */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                  Feedback Trend
                </h3>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-[#5542f6]" />
                    <span>Live Submissions ({allFeedbackItems.length})</span>
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <svg className="w-full h-56 sm:h-64" viewBox="0 0 600 240" preserveAspectRatio="none">
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = Math.round(200 - ratio * 165);
                    const label = Math.round(weeklyFeedbackTrend.maxCount * ratio);
                    return (
                      <g key={idx}>
                        <text x="35" y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-sans">
                          {label}
                        </text>
                        <line x1="45" y1={y} x2="580" y2={y} stroke="rgba(226, 232, 240, 0.5)" strokeWidth="1" />
                      </g>
                    );
                  })}

                  <path
                    d={weeklyFeedbackTrend.pathD}
                    fill="none"
                    stroke="#5542f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {weeklyFeedbackTrend.points.map((pt, idx) => (
                    <g key={idx}>
                      <title>{`${pt.day}: ${pt.count} submissions`}</title>
                      <circle cx={pt.cx} cy={pt.cy} r="4.5" fill="#5542f6" stroke="#ffffff" strokeWidth="2.5" />
                      <text x={pt.cx} y="222" textAnchor="middle" className="text-[11px] font-semibold fill-slate-500 dark:fill-slate-400">
                        {pt.day}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Active Users Card (Real Firestore Users & Video Durations) */}
            {(() => {
              const totalRegistered = registeredUsers.length;
              const activeCount = registeredUsers.filter((u) => !u.isBlocked && u.status !== 'banned').length;
              const bannedCount = totalRegistered - activeCount;
              const activePct = totalRegistered > 0 ? Math.round((activeCount / totalRegistered) * 100) : 0;
              const consumersCount = registeredUsers.filter((u) => u.role === 'consumer').length;
              const adminsCount = registeredUsers.filter((u) => u.role === 'company_admin').length;
              const totalSec = allFeedbackItems.reduce((acc, f) => acc + Number(f.seconds || 0), 0);
              const avgSec = allFeedbackItems.length > 0 ? Math.round(totalSec / allFeedbackItems.length) : 0;
              const avgDurStr = `${Math.floor(avgSec / 60)}m ${avgSec % 60}s`;
              return (
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-medium text-slate-400 block">Active users</span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        {activeCount}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#e6fbf2] text-[#10b981] font-bold text-xs">
                        {bannedCount > 0 ? `${bannedCount} banned` : 'Live'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Active Standing</span>
                      <span className="text-[#5542f6]">{activePct}%</span>
                    </div>
                    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <rect x="0" y="0" width={activePct} height="10" rx="5" fill="#5542f6" />
                    </svg>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Consumers</span>
                      <strong className="text-slate-800 dark:text-white font-bold block mt-0.5">
                        {consumersCount}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Company Admins</span>
                      <strong className="text-slate-800 dark:text-white font-bold block mt-0.5">
                        {adminsCount}
                      </strong>
                    </div>
                    <div className="col-span-2 pt-1 flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Avg Video Duration</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-bold">{avgDurStr}</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* ====================================================================
              ROW 4: QUICK ACTION TOOLBAR (CSV EXPORTS & SYSTEM CONTROLS)
              ==================================================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  Corporate CSV Record Keeping & Direct Payouts
                </h4>
                <p className="text-[11px] text-slate-400">
                  Export verified smartphone feedback audits and financial transaction logs (RFC-4180 standard)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportFeedback}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-200 hover:text-emerald-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export Feedback CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Reviews CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportTransactions}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 text-slate-700 dark:text-slate-200 hover:text-amber-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export Transactions CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Transactions CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportCombined}
                className="px-3.5 py-1.5 rounded-lg bg-[#5542f6] hover:bg-[#4532ea] text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Export Full Master Audit CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Master Audit</span>
              </button>
            </div>
          </div>
            </>
          )}

          {/* ====================================================================
              ROW 4: MAIN / CRM / TABLES: FEEDBACK & VIDEO INTELLIGENCE ENGINE
              - EXACT SAME AS COMPUTER / COMPANY VIEW
              - DUAL MODES: SEE FEEDBACK CARDS & VIDEO MODERATION TABLE
              - INTAKE METRICS: HOW MANY FEEDBACK CAME (BOTH USERS & COMPANY)
              ==================================================================== */}
          {(activeMenu === 'main' || activeMenu === 'crm' || activeMenu === 'tables') && (
            <div className="space-y-4">

              {/* 1. COMPREHENSIVE INTAKE ANALYTICS: HOW MANY FEEDBACK COME (BOTH USERS & COMPANY) */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      Feedback & Video Intake Intelligence ({feedbackMetrics.total} Total Inbound)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span>Firestore Stream Active</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                </div>

                {/* 6 Responsive Real-Time Stat Blocks */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
                  {/* Stat 1: Total Feedback */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
                      <span>Total Inbound</span>
                      <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {feedbackMetrics.total}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Both users & company
                    </div>
                  </div>

                  {/* Stat 2: Video Reviews */}
                  <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60">
                    <div className="flex items-center justify-between text-purple-600 dark:text-purple-300 text-[10px] font-bold uppercase">
                      <span>Video Reviews</span>
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-purple-900 dark:text-purple-100 mt-1">
                      {feedbackMetrics.videos}
                    </div>
                    <div className="text-[10px] text-purple-700 dark:text-purple-300 mt-0.5">
                      Playable 1-min speaking
                    </div>
                  </div>

                  {/* Stat 3: Feedback Details */}
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-300 text-[10px] font-bold uppercase">
                      <span>Feedback Details</span>
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">
                      {feedbackMetrics.written}
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Likes, bugs & wishes
                    </div>
                  </div>

                  {/* Stat 4: Both Used (Dual) */}
                  <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60">
                    <div className="flex items-center justify-between text-sky-600 dark:text-sky-300 text-[10px] font-bold uppercase">
                      <span>Both Used</span>
                      <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-sky-900 dark:text-sky-100 mt-1">
                      {feedbackMetrics.bothUsed}
                    </div>
                    <div className="text-[10px] text-sky-700 dark:text-sky-300 mt-0.5">
                      Video + MCQ answers
                    </div>
                  </div>

                  {/* Stat 5: Pending Queue */}
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-300 text-[10px] font-bold uppercase">
                      <span>Pending Queue</span>
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">
                      {feedbackMetrics.pending}
                    </div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                      Needs approval
                    </div>
                  </div>

                  {/* Stat 6: Blocked / Banned */}
                  <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60">
                    <div className="flex items-center justify-between text-rose-600 dark:text-rose-300 text-[10px] font-bold uppercase">
                      <span>Blocked / Banned</span>
                      <Ban className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100 mt-1">
                      {feedbackMetrics.blockedIdeas + feedbackMetrics.bannedUsers}
                    </div>
                    <div className="text-[10px] text-rose-700 dark:text-rose-300 mt-0.5">
                      {feedbackMetrics.blockedIdeas} ideas • {feedbackMetrics.bannedUsers} users
                    </div>
                  </div>
                </div>

                {/* Sub-bar: Users vs Company Source ratio & Breakdown */}
                <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-purple-500" />
                      <span>Customer Reviewers: <strong>{feedbackMetrics.customerCount}</strong></span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Company Portal: <strong>{feedbackMetrics.companyCount}</strong></span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold text-[10px]">
                      👍 {feedbackMetrics.praise} Praise
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 font-bold text-[10px]">
                      🚨 {feedbackMetrics.bugs} Bugs
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-bold text-[10px]">
                      💡 {feedbackMetrics.wishes} Wishes
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. TOOLBAR: VIEW MODE (COMPUTER CARDS vs VIDEO TABLE vs BOTH) & FILTERS */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  
                  {/* Left: View Mode Switcher ("see video or feedback exactly same of computer") */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFeedbackDisplayMode('both')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        feedbackDisplayMode === 'both'
                          ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Show both Computer Cards & Video Table"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Both Views</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeedbackDisplayMode('computer_card')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        feedbackDisplayMode === 'computer_card'
                          ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="See Feedback & Video Cards exactly same of computer (Company View)"
                    >
                      <Laptop className="w-3.5 h-3.5 text-amber-500" />
                      <span>Computer Card View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFeedbackDisplayMode('moderation_table')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        feedbackDisplayMode === 'moderation_table'
                          ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Video Moderation Table View"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Video Table View</span>
                    </button>
                  </div>

                  {/* Right: Moderation Actions & Bulk Approve */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status filter pills */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs">
                      {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setModerationFilter(st)}
                          className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                            moderationFilter === st
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {st === 'pending' && `Pending (${feedbackMetrics.pending})`}
                          {st === 'approved' && `Approved (${feedbackMetrics.approved})`}
                          {st === 'rejected' && `Disapproved (${feedbackMetrics.rejected})`}
                          {st === 'all' && `All (${feedbackMetrics.total})`}
                        </button>
                      ))}
                    </div>

                    {/* Bulk Approve Button */}
                    {pendingVideosCount > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkApprove}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Approve All ({pendingVideosCount})</span>
                      </button>
                    )}
                  </div>

                </div>

                {/* Sub-Filters: Source Filter, Type Filter, Brand & Search */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Source filter */}
                    <select
                      value={feedbackSourceFilter}
                      onChange={(e) => setFeedbackSourceFilter(e.target.value as any)}
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                    >
                      <option value="all">All Sources ({feedbackMetrics.total})</option>
                      <option value="customer">Customer Reviewer App ({feedbackMetrics.customerCount})</option>
                      <option value="company">Company Portal ({feedbackMetrics.companyCount})</option>
                    </select>

                    {/* Format filter */}
                    <select
                      value={feedbackTypeFilter}
                      onChange={(e) => setFeedbackTypeFilter(e.target.value as any)}
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                    >
                      <option value="all">All Formats</option>
                      <option value="video">🎥 1-Min Video Reviews ({feedbackMetrics.videos})</option>
                      <option value="text">💬 Written Feedback ({feedbackMetrics.written})</option>
                    </select>

                    {/* Smartphone Brand filter */}
                    <select
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                    >
                      <option value="all">All Smartphone Brands</option>
                      <option value="samsung">Samsung</option>
                      <option value="apple">Apple iPhone</option>
                      <option value="google">Google Pixel</option>
                      <option value="xiaomi">Xiaomi / Redmi</option>
                      <option value="oneplus">OnePlus</option>
                      <option value="vivo">Vivo & iQOO</option>
                    </select>
                  </div>

                  {/* Search Query Input */}
                  <div className="relative min-w-[220px] flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by user, phone model, city, defect quote..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. SECTION A: EXACT SAME AS COMPUTER / COMPANY VIEW CARDS */}
              {(feedbackDisplayMode === 'computer_card' || feedbackDisplayMode === 'both') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-indigo-500" />
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Customer Video Reviews & Feedback Cards ({filteredVideos.length})
                      </h4>
                      <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                        Computer View
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Showing authentic reviews with playback & one-tap actions
                    </span>
                  </div>

                  {filteredVideos.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <Smartphone className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Feedback Items Match</h5>
                      <p className="text-xs text-slate-500 mt-1">Try clearing filters or search query.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredVideos.map((rev) => {
                        const matchedUser = registeredUsers.find(
                          (u) =>
                            ((rev as any).uid && u.id === (rev as any).uid) ||
                            (rev.userEmail && u.email.toLowerCase() === rev.userEmail.toLowerCase()) ||
                            (rev.userEmail?.endsWith('@verified') && u.id.startsWith(rev.userEmail.replace('@verified', '')))
                        );
                        const isBanned = !!(rev as any).userBlocked || matchedUser?.isBlocked || matchedUser?.status === 'banned';
                        const isBlockedIdea = rev.isBlocked;

                        const isHighlighted = highlightedFeedbackId === rev.id;
                        const hasRealVideo = Boolean(rev.videoUrl && rev.videoUrl.trim().length > 0);
                        const qaCount = rev.allAnswers
                          ? Object.values(rev.allAnswers).filter((v) => String(v || '').trim().length > 0).length
                          : 0;

                        return (
                          <div
                            id={`admin-feedback-card-${rev.id}`}
                            key={rev.id}
                            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-950 border transition-all shadow-xs space-y-3 ${
                              isHighlighted
                                ? 'border-[#5542f6] ring-2 ring-[#5542f6]/30 bg-indigo-50/30 dark:bg-indigo-950/20'
                                : isBlockedIdea || isBanned
                                ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                                : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                            }`}
                          >
                            {/* Card Top Header: Reviewer, Phone Model, Category, Stars, Sentiment */}
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3">
                                {rev.userAvatar ? (
                                  <img
                                    src={rev.userAvatar}
                                    alt={rev.user}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                                    {(rev.user || 'R').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                      {rev.user}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium">· {rev.city || 'Nepal'}</span>
                                    <span className="text-[10px] text-slate-400">({rev.time || 'Today'})</span>
                                    
                                    <span className="text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono font-bold px-1.5 py-0.2 rounded border border-purple-200/60 dark:border-purple-800/60">
                                      Verified Reviewer
                                    </span>

                                    {rev.userEmail && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ({rev.userEmail})
                                      </span>
                                    )}

                                    {isBanned && (
                                      <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.2 rounded-full uppercase">
                                        🚫 Account Banned
                                      </span>
                                    )}
                                    {isBlockedIdea && (
                                      <span className="text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold px-2 py-0.2 rounded-full">
                                        🚫 Idea Blocked
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-semibold flex-wrap">
                                    <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{rev.phoneName}</span>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">{rev.brandFolder || rev.phoneBrand}</span>
                                    <span className="text-slate-400">·</span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                        rev.feedbackCategory === 'Bug Report'
                                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                          : rev.feedbackCategory === 'Feature Request'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      }`}
                                    >
                                      {rev.feedbackCategory || 'Compliment'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Rating Stars & Sentiment Score */}
                              <div className="text-right">
                                <div className="text-amber-500 font-black text-xs sm:text-sm">
                                  {'★'.repeat(Math.max(1, Math.round(rev.rating || 0)))}
                                </div>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                    (rev.sentimentScore ?? 0) >= 80
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                      : (rev.sentimentScore ?? 0) >= 60
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                                >
                                  {rev.sentimentScore ?? 0}% · {(rev.sentimentTone || 'Pending').split(' ')[0]}
                                </span>
                              </div>
                            </div>

                            {/* Feedback Highlights + Hover Video Preview */}
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                              {hasRealVideo && (
                                <button
                                  type="button"
                                  onClick={() => onOpenVideoModal(rev)}
                                  className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 group cursor-pointer"
                                  title="Hover to preview · Click to open full video & all Q&A"
                                >
                                  <video
                                    src={rev.videoUrl}
                                    preload="metadata"
                                    muted
                                    playsInline
                                    onMouseEnter={(e) => {
                                      e.currentTarget.play().catch(() => {});
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.pause();
                                      e.currentTarget.currentTime = 0;
                                    }}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                                    <span className="w-9 h-9 rounded-full bg-white/95 text-slate-950 flex items-center justify-center shadow-md">
                                      <Play className="w-4 h-4 fill-current ml-0.5" />
                                    </span>
                                  </div>
                                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/75 text-white font-mono tabular-nums text-[10px]">
                                    {Math.floor((rev.seconds || 0) / 60)}:{String(Math.max(0, (rev.seconds || 0) % 60)).padStart(2, '0')}
                                  </div>
                                  {qaCount > 0 && (
                                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-white font-mono tabular-nums text-[10px]">
                                      {qaCount} Q&A
                                    </div>
                                  )}
                                </button>
                              )}

                              <div className="flex-1 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                                {rev.like && (
                                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                                    <b className="text-emerald-700 dark:text-emerald-400 font-black">Liked Features (+): </b>
                                    <span>{rev.like}</span>
                                  </p>
                                )}
                                {(rev.dislike || rev.improve) && (
                                  <p className="text-rose-900 dark:text-rose-300 leading-relaxed font-medium">
                                    <b className="text-rose-700 dark:text-rose-400 font-black">Fix Needed / Issues (-): </b>
                                    <span>{rev.dislike || rev.improve}</span>
                                  </p>
                                )}
                                {rev.aiSummary?.summary && (
                                  <div className="mt-1 pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-indigo-900 dark:text-indigo-300 font-medium flex items-start gap-1">
                                    <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                    <span>
                                      <b>AI Synthesis:</b> "{rev.aiSummary.summary}"
                                    </span>
                                  </div>
                                )}
                                {rev.blockReason && (
                                  <div className="mt-1 p-2 rounded-lg bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-[11px]">
                                    <strong>Reason for Flag / Block:</strong> {rev.blockReason}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Footer Actions: Play Video, Approve, Disapprove, Block Idea, Ban User */}
                            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                {/* Primary Video Player Button */}
                                <button
                                  type="button"
                                  onClick={() => onOpenVideoModal(rev)}
                                  className="py-1.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all transform active:scale-95"
                                  title="Watch Full 1-Min Speaking Video"
                                >
                                  <Play className="w-3.5 h-3.5 fill-white" />
                                  <span>▶ Watch Video</span>
                                </button>

                                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  Reward: Rs. {rev.rewardAmount ?? 0}
                                </span>

                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  rev.moderationStatus === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : rev.moderationStatus === 'rejected'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                                }`}>
                                  {rev.moderationStatus === 'approved' ? '✓ Approved' : rev.moderationStatus === 'rejected' ? '✕ Disapproved' : '⏳ Pending'}
                                </span>
                              </div>

                              {/* Moderation Controls: Approve, Disapprove, Block Idea, Ban User */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Approve */}
                                {rev.moderationStatus !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveVideo(rev)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                                    title="Approve and Credit Reward"
                                  >
                                    <Check className="w-3 h-3" /> Approve & Pay
                                  </button>
                                )}

                                {/* Disapprove */}
                                {rev.moderationStatus !== 'rejected' && (
                                  <button
                                    type="button"
                                    onClick={() => setRejectModalVideo(rev)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                                    title="Disapprove Review with Reason"
                                  >
                                    <X className="w-3 h-3" /> Disapprove
                                  </button>
                                )}

                                {/* Block / Ban Idea */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (rev.isBlocked) {
                                      handleToggleBlockFeedback(rev, false);
                                    } else {
                                      setBlockIdeaModal(rev);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 border ${
                                    rev.isBlocked
                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                  }`}
                                  title={rev.isBlocked ? "Unblock Feedback Idea" : "Block & Ban This Idea"}
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>{rev.isBlocked ? 'Restore Idea' : 'Block Idea'}</span>
                                </button>

                                {/* Ban User Account */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isBanned) {
                                      handleToggleBanUser(rev, false);
                                    } else {
                                      setBanUserModal(rev);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 border ${
                                    isBanned
                                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                                      : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                  }`}
                                  title={isBanned ? "Reinstate Banned User" : "Ban User From Submitting"}
                                >
                                  {isBanned ? <UserCheck className="w-3 h-3 text-amber-700" /> : <UserX className="w-3 h-3 text-rose-600" />}
                                  <span>{isBanned ? 'Unban User' : 'Ban User'}</span>
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 4. SECTION B: VIDEO MODERATION AUDIT TABLE VIEW */}
              {(feedbackDisplayMode === 'moderation_table' || feedbackDisplayMode === 'both') && (
                <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Video Moderation Audit Table ({filteredVideos.length} Rows)
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Fast 1-click decision engine
                    </span>
                  </div>

                  {/* Table Data */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Reviewer</th>
                          <th className="py-3 px-4">Smartphone Model</th>
                          <th className="py-3 px-4">Rating & Tone</th>
                          <th className="py-3 px-4">Feedback Summary</th>
                          <th className="py-3 px-4">Reward</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Moderation Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredVideos.map((rev) => {
                          const matchedUser = registeredUsers.find(
                            (u) =>
                              ((rev as any).uid && u.id === (rev as any).uid) ||
                              (rev.userEmail && u.email.toLowerCase() === rev.userEmail.toLowerCase()) ||
                              (rev.userEmail?.endsWith('@verified') && u.id.startsWith(rev.userEmail.replace('@verified', '')))
                          );
                          const isBanned = !!(rev as any).userBlocked || matchedUser?.isBlocked || matchedUser?.status === 'banned';
                          const isBlockedIdea = rev.isBlocked;

                          return (
                            <tr
                              id={`admin-feedback-row-${rev.id}`}
                              key={rev.id}
                              className={`transition-colors ${
                                highlightedFeedbackId === rev.id
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                              }`}
                            >
                              
                              {/* Reviewer */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  {rev.userAvatar ? (
                                    <img
                                      src={rev.userAvatar}
                                      alt={rev.user}
                                      className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                                      {(rev.user || 'R').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900 dark:text-white block">
                                        {rev.user}
                                      </span>
                                      {isBanned && (
                                        <span className="text-[9px] font-mono bg-rose-500 text-white px-1 rounded-xs font-bold">
                                          BANNED
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {rev.city || 'Nepal'} • {rev.time || 'Today'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Smartphone */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {rev.phoneName}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {rev.brandFolder || rev.phoneBrand}
                                </span>
                              </td>

                              {/* Rating & Sentiment */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-amber-500 font-bold">
                                  <span>★ {rev.rating}</span>
                                  <span className="text-slate-300">/5</span>
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                  {rev.sentimentTone || 'Pending'} ({rev.sentimentScore ?? 0}%)
                                </span>
                              </td>

                              {/* Quotes */}
                              <td className="py-3 px-4 max-w-xs">
                                <div className="space-y-0.5">
                                  {rev.like && (
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                                      <strong>+</strong> {rev.like}
                                    </p>
                                  )}
                                  {rev.dislike && (
                                    <p className="text-[11px] text-rose-600 dark:text-rose-400 truncate">
                                      <strong>-</strong> {rev.dislike}
                                    </p>
                                  )}
                                  {isBlockedIdea && (
                                    <span className="text-[9px] text-rose-600 font-bold block">
                                      🚫 Blocked: {rev.blockReason || 'Flagged by Admin'}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Reward */}
                              <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                Rs. {rev.rewardAmount ?? 0}
                              </td>

                              {/* Status */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                {rev.moderationStatus === 'approved' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1 w-max">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Approved
                                  </span>
                                ) : rev.moderationStatus === 'rejected' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px] flex items-center gap-1 w-max">
                                    <XCircle className="w-3 h-3 text-rose-500 shrink-0" /> Disapproved
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1 w-max">
                                    <Clock className="w-3 h-3 text-amber-500 shrink-0" /> Pending Review
                                  </span>
                                )}
                              </td>

                              {/* Actions: Watch + Instant Approve / Disapprove / Block + Ban User */}
                              <td className="py-3 px-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Play Video */}
                                  <button
                                    type="button"
                                    onClick={() => onOpenVideoModal(rev)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0"
                                    title="Play Review Video"
                                  >
                                    <Play className="w-3 h-3 fill-current shrink-0" />
                                    <span>Play</span>
                                  </button>

                                  {/* Approve */}
                                  <button
                                    type="button"
                                    disabled={rev.moderationStatus === 'approved' || approvingFeedbackId === rev.id}
                                    onClick={() => handleApproveVideo(rev)}
                                    className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 whitespace-nowrap shrink-0 ${
                                      rev.moderationStatus === 'approved'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-default opacity-75'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-2xs disabled:opacity-60'
                                    }`}
                                    title="Approve and Credit Reward"
                                  >
                                    <Check className="w-3 h-3 shrink-0" />
                                    <span>
                                      {approvingFeedbackId === rev.id
                                        ? 'Saving...'
                                        : rev.moderationStatus === 'approved'
                                        ? 'Approved'
                                        : 'Approve'}
                                    </span>
                                  </button>

                                  {/* Disapprove */}
                                  <button
                                    type="button"
                                    disabled={rev.moderationStatus === 'rejected'}
                                    onClick={() => setRejectModalVideo(rev)}
                                    className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 whitespace-nowrap shrink-0 ${
                                      rev.moderationStatus === 'rejected'
                                        ? 'bg-rose-50 text-rose-400 dark:bg-rose-950/40 dark:text-rose-400 cursor-default opacity-75'
                                        : 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 cursor-pointer'
                                    }`}
                                    title="Disapprove Review"
                                  >
                                    <X className="w-3 h-3 shrink-0" />
                                    <span>{rev.moderationStatus === 'rejected' ? 'Disapproved' : 'Disapprove'}</span>
                                  </button>

                                  {/* Block / Unblock */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (rev.isBlocked) {
                                        handleToggleBlockFeedback(rev, false);
                                      } else {
                                        setBlockIdeaModal(rev);
                                      }
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg border font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                                      rev.isBlocked
                                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                                    }`}
                                    title={rev.isBlocked ? 'Unblock Feedback' : 'Block Feedback'}
                                  >
                                    <Ban className="w-3 h-3 shrink-0" />
                                    <span>{rev.isBlocked ? 'Unblock' : 'Block'}</span>
                                  </button>

                                  {/* Ban User */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isBanned) {
                                        handleToggleBanUser(rev, false);
                                      } else {
                                        setBanUserModal(rev);
                                      }
                                    }}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                      isBanned
                                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                                        : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                                    }`}
                                    title={isBanned ? "Unban User" : "Ban User Account"}
                                  >
                                    {isBanned ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* WITHDRAWALS & KHALTI SUBSCRIPTION ORDERS QUEUE TAB */}
          {activeMenu === 'withdrawals' && (
            <div className="space-y-5">
              {/* SECTION 1: MANUAL KHALTI QR PAYMENT VERIFICATION & SUBSCRIPTION HISTORY */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span>Manual Khalti QR Payments & Subscription History</span>
                        {pendingOrdersCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                            {pendingOrdersCount} PENDING VERIFICATION
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Subscriptions stay Pending Verification until you confirm the exact funds arrived in your Khalti account. Duplicate Transaction IDs are blocked automatically.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrSettingsPanel((v) => !v)}
                    className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{showQrSettingsPanel ? 'Hide QR Settings' : 'Manage Khalti QR Display'}</span>
                  </button>
                </div>

                {/* Admin-Managed Khalti QR Display Settings Panel (Privacy-Clean: No Phone/Bank Numbers) */}
                {showQrSettingsPanel && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="flex flex-col items-center p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400 mb-2">Live QR Preview</span>
                        <img
                          src={resolveAssetUrl(qrSettingsDraft.qrImagePath)}
                          alt="Admin Khalti QR"
                          className="w-36 h-auto rounded-lg border border-slate-200 object-contain"
                        />
                      </div>

                      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Khalti Account Display Name
                          </label>
                          <input
                            type="text"
                            value={qrSettingsDraft.accountHolderName}
                            onChange={(e) => setQrSettingsDraft((p) => ({ ...p, accountHolderName: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Official Khalti QR Image Path
                          </label>
                          <input
                            type="text"
                            value={qrSettingsDraft.qrImagePath}
                            onChange={(e) => setQrSettingsDraft((p) => ({ ...p, qrImagePath: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Checkout Payment Instructions Notice
                          </label>
                          <input
                            type="text"
                            value={qrSettingsDraft.stage1Notice || ''}
                            onChange={(e) => setQrSettingsDraft((p) => ({ ...p, stage1Notice: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-between gap-3 pt-1">
                          <label className="flex items-center gap-2 font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={qrSettingsDraft.enabled}
                              onChange={(e) => setQrSettingsDraft((p) => ({ ...p, enabled: e.target.checked }))}
                            />
                            <span>Enable &ldquo;Pay with Khalti QR&rdquo; Option at Checkout</span>
                          </label>
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-black text-[10px]">
                            MANUAL QR ONLY
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveQrSettings}
                        disabled={isSavingQrSettings}
                        className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isSavingQrSettings ? 'Saving...' : 'Save Khalti QR Settings'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Filter Tabs: Pending / Approved / Rejected / All Submissions / Subscription History */}
                {(() => {
                  const pendingList = paymentOrders.filter((o) => o.status === 'pending');
                  const approvedList = paymentOrders.filter((o) => o.status === 'verified' || o.status === 'completed');
                  const rejectedList = paymentOrders.filter(
                    (o) => o.status === 'rejected' || o.status === 'failed' || o.status === 'cancelled'
                  );
                  const visibleOrders =
                    paymentOrderFilter === 'pending'
                      ? pendingList
                      : paymentOrderFilter === 'approved'
                      ? approvedList
                      : paymentOrderFilter === 'rejected'
                      ? rejectedList
                      : paymentOrders;

                  return (
                    <>
                      <div className="flex items-center gap-1.5 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-3">
                        {[
                          { id: 'all' as const, label: `All Submissions (${paymentOrders.length})` },
                          { id: 'pending' as const, label: `Pending Verification (${pendingList.length})` },
                          { id: 'approved' as const, label: `Approved (${approvedList.length})` },
                          { id: 'rejected' as const, label: `Rejected (${rejectedList.length})` },
                          { id: 'history' as const, label: `Subscription History (${payments.length})` },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setPaymentOrderFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                              paymentOrderFilter === tab.id
                                ? 'bg-purple-700 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {paymentOrderFilter === 'history' ? (
                        <div className="overflow-x-auto">
                          {payments.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-500">
                              No activated subscription records yet.
                            </div>
                          ) : (
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                                  <th className="py-3 px-3">Receipt / Order</th>
                                  <th className="py-3 px-3">Customer & Plan</th>
                                  <th className="py-3 px-3">Price</th>
                                  <th className="py-3 px-3">Khalti Txn ID / Ref</th>
                                  <th className="py-3 px-3">Verification Date & Admin Decision</th>
                                  <th className="py-3 px-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {payments.map((p) => (
                                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                      <div>{p.purchaseOrderId || p.id}</div>
                                      <div className="text-[10px] text-slate-400 font-normal">{p.id}</div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="font-bold text-slate-900 dark:text-white">{p.payerName}</div>
                                      <div className="text-[11px] text-slate-500">
                                        {p.planName} · <b>{p.brandCategory}</b> ({p.billingCycle})
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 font-mono">
                                      <div className="font-bold text-emerald-700 dark:text-emerald-400">
                                        NPR {Number(p.amountNPR || 0).toLocaleString('en-IN')}
                                      </div>
                                      <div className="text-[10px] text-slate-400">${p.amountUSD}</div>
                                    </td>
                                    <td className="py-3 px-3 font-mono text-[11px]">
                                      <div className="font-bold text-purple-700 dark:text-purple-400">
                                        {p.khaltiTxnId || p.referenceId}
                                      </div>
                                      <div className="text-[10px] text-slate-400">{p.gateway}</div>
                                    </td>
                                    <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                                      <div>{p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : new Date(p.createdAt).toLocaleString()}</div>
                                      {p.verifiedByAdminName && (
                                        <div className="text-[10px] text-slate-400">
                                          Approved by {p.verifiedByAdminName}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                                        ACTIVE
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          {visibleOrders.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-500">
                              No Khalti QR payment submissions in this view.
                            </div>
                          ) : (
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                                  <th className="py-3 px-3">Reference / Order ID</th>
                                  <th className="py-3 px-3">Customer & Plan</th>
                                  <th className="py-3 px-3">Price</th>
                                  <th className="py-3 px-3">Khalti Txn ID & Dates</th>
                                  <th className="py-3 px-3">Screenshot</th>
                                  <th className="py-3 px-3">Status</th>
                                  <th className="py-3 px-3 text-right">Admin Decision</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {visibleOrders.map((ord) => {
                                  const isApproved = ord.status === 'verified' || ord.status === 'completed';
                                  const isRejected =
                                    ord.status === 'rejected' || ord.status === 'failed' || ord.status === 'cancelled';
                                  return (
                                    <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                        <div>{ord.purchaseOrderId}</div>
                                        <div className="text-[10px] text-slate-400 font-normal">UID: {ord.uid.slice(0, 10)}...</div>
                                      </td>
                                      <td className="py-3 px-3">
                                        <div className="font-bold text-slate-900 dark:text-white">{ord.companyName}</div>
                                        <div className="text-[11px] text-slate-500">
                                          {ord.planName} · <b>{ord.categoryName}</b>
                                        </div>
                                      </td>
                                      <td className="py-3 px-3 font-mono">
                                        <div className="font-bold text-emerald-700 dark:text-emerald-400">
                                          NPR {ord.amountNPR.toLocaleString('en-IN')}
                                        </div>
                                        <div className="text-[10px] text-slate-400">${ord.amountUSD}</div>
                                      </td>
                                      <td className="py-3 px-3 text-[11px]">
                                        <div className="font-mono font-bold text-purple-700 dark:text-purple-400">
                                          {ord.transactionReference || ord.khaltiTransactionId || '—'}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          Submitted: {new Date(ord.createdAt).toLocaleString()}
                                        </div>
                                        {ord.verifiedAt && (
                                          <div className="text-[10px] text-slate-400">
                                            Reviewed: {new Date(ord.verifiedAt).toLocaleString()}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3 px-3">
                                        {ord.screenshotUrl ? (
                                          <PrivatePaymentScreenshot
                                            src={ord.screenshotUrl}
                                            className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                                            onPreview={(url) => setPreviewScreenshotUrl(url)}
                                          />
                                        ) : (
                                          <span className="text-[11px] text-slate-400">None</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3">
                                        <span
                                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap ${
                                            isApproved
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : isRejected
                                              ? 'bg-rose-100 text-rose-800'
                                              : 'bg-amber-100 text-amber-900'
                                          }`}
                                        >
                                          {isApproved
                                            ? 'APPROVED'
                                            : isRejected
                                            ? 'REJECTED'
                                            : 'PENDING VERIFICATION'}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        {ord.status === 'pending' ? (
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setVerifyOrderModal(ord);
                                                setVerifyKhaltiTxnId(ord.transactionReference || '');
                                                setVerifyAmountNPR(String(ord.amountNPR));
                                                setVerifyNotes('Confirmed money arrived in Khalti account.');
                                              }}
                                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-2xs"
                                            >
                                              Approve & Activate
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setRejectOrderModal(ord);
                                                setRejectOrderReason('Transaction ID not found in Khalti account history.');
                                              }}
                                              className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs cursor-pointer"
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="text-[11px] text-slate-500">
                                            {ord.khaltiTransactionId && (
                                              <div className="font-mono text-slate-700 dark:text-slate-300">
                                                Txn: {ord.khaltiTransactionId}
                                              </div>
                                            )}
                                            {ord.verifiedByAdminName && (
                                              <div className="text-[10px] text-slate-400">
                                                By {ord.verifiedByAdminName}
                                              </div>
                                            )}
                                            {ord.errorReason && (
                                              <div className="text-[10px] text-rose-600">{ord.errorReason}</div>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* SECTION 2: CREATOR CASHOUT & WITHDRAWAL MANAGEMENT (EXISTING UI PRESERVED) */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      Creator Cashout & Withdrawal Management
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportTransactions}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Download Ledger CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {filteredWithdrawals.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500">
                      No withdrawal requests recorded in Firestore yet.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                          <th className="py-3 px-4">User</th>
                          <th className="py-3 px-4">Payment Gateway</th>
                          <th className="py-3 px-4">Account / Number</th>
                          <th className="py-3 px-4">Gross Payout</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredWithdrawals.map((w) => (
                          <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {w.user}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                              {w.gateway}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500">
                              {w.accountNumber}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Rs. {w.amountNPR}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                w.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                w.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                              }`}>
                                {w.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {w.status === 'pending' && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenApproveWithdrawal(w)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-2xs"
                                  >
                                    Approve Payout
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRejectModalWithdrawal(w)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                              {w.status === 'approved' && (
                                <div className="text-[11px] text-slate-500">
                                  <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    Ref: {w.transferReference || w.referenceId || 'VERIFIED'}
                                  </div>
                                  {w.receiptNote && (
                                    <div className="text-[10px] text-slate-400">{w.receiptNote}</div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BRAND BREAKDOWN CATALOG TAB */}
          {activeMenu === 'catalog' && (
            brandBreakdown.length === 0 ? (
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-500">
                No smartphone brand analytics recorded in Firestore yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {brandBreakdown.map((item) => (
                  <div key={item.brand} className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <Smartphone className="w-5 h-5 text-[#5542f6]" />
                      <span className="text-xs bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full font-bold">
                        {item.subscribersCount} Subscriptions
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {item.brand}
                    </h4>
                    <div className="flex items-baseline justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>{item.totalReviews} Total Reviews</span>
                      <span className="text-emerald-500 font-bold">{item.avgRating}★ ({item.avgSentiment}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* LIVE AUDIT STREAM TAB */}
          {activeMenu === 'audit' && (
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  Live Platform Audit Event Stream
                </h3>
                <button
                  type="button"
                  onClick={handleExportCombined}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Full Audit CSV</span>
                </button>
              </div>

              {filteredAuditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No audit events recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAuditLogs.map((log) => (
                    <div key={log.id} className="py-3 flex items-start gap-3 text-xs">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        ⚡
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {log.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                          {log.description}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                          <span>Actor: {log.actor}</span>
                          {log.badge && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-semibold text-slate-600 dark:text-slate-300">
                              {log.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* USER ACCOUNTS DIRECTORY TAB */}
          {activeMenu === 'users' && (
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Registered User Directory ({registeredUsers.length} Users)
                </h3>
                <button
                  type="button"
                  onClick={handleRefreshData}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Sync Users</span>
                </button>
              </div>
              {registeredUsers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No registered users synced yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {registeredUsers.map((u) => {
                    const isUserBanned = u.isBlocked || u.status === 'banned';

                    return (
                      <div
                        key={u.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                          isUserBanned
                            ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black text-sm flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0">
                              {(u.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {u.name}
                              </span>
                              {isUserBanned ? (
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-black bg-rose-600 text-white shrink-0">
                                  BANNED
                                </span>
                              ) : (
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {u.email || `UID: ${u.id.slice(0, 10)}...`}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                                {u.role}
                              </span>
                              <span className="text-[10px] font-mono text-emerald-600 font-bold">
                                Wallet: Rs. {u.walletBalance || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Ban / Unban User Button */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-mono text-[10px]">
                            {u.city || 'Nepal'} • {u.phone ? `+977 ${u.phone.slice(-4)}` : 'Verified'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isUserBanned) {
                                handleToggleBanUser(u, false);
                              } else {
                                setBanUserModal(u);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                              isUserBanned
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                                : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {isUserBanned ? <UserCheck className="w-3 h-3 text-amber-800" /> : <UserX className="w-3 h-3 text-rose-600" />}
                            <span>{isUserBanned ? 'Unban Account' : 'Ban Account'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ====================================================================
          CSV EXPORT MODAL FOR MANUAL RECORD KEEPING
          ==================================================================== */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Export Data as CSV
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    For manual corporate record keeping, audit verification & tax compliance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2">
                <div>
                  <b className="text-slate-900 dark:text-white block font-bold">1. Verified Smartphone Reviews CSV</b>
                  <span className="text-slate-500 text-[11px]">All video auditions, star ratings, quotes, sentiment & tags</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportFeedback();
                    setShowExportModal(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-2xs shrink-0"
                >
                  Download
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2">
                <div>
                  <b className="text-slate-900 dark:text-white block font-bold">2. Financial Transactions & Cashouts CSV</b>
                  <span className="text-slate-500 text-[11px]">eSewa, Khalti, ConnectIPS payouts, fees & reference UTRs</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportTransactions();
                    setShowExportModal(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer transition-all shadow-2xs shrink-0"
                >
                  Download
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between gap-2">
                <div>
                  <b className="text-emerald-900 dark:text-emerald-200 block font-bold">3. Master Corporate Combined Archive</b>
                  <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">Executive overview + all feedback + all transactions</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportCombined();
                    setShowExportModal(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold cursor-pointer transition-all shadow-md shrink-0"
                >
                  Download Master
                </button>
              </div>
              <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30 flex items-center justify-between gap-2">
                <div>
                  <b className="text-rose-900 dark:text-rose-200 block font-bold">Danger Zone: Reset All Platform Data</b>
                  <span className="text-rose-700 dark:text-rose-400 text-[11px]">Wipe all feedback, payments, subscriptions, withdrawals & reset wallets to 0</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowExportModal(false);
                    setResetError(null);
                    setShowResetDataConfirm(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold cursor-pointer transition-all shadow-xs shrink-0 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Data</span>
                </button>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 text-center font-mono">
              Encoding: UTF-8 with BOM • RFC 4180 standard compatible with MS Excel & Apple Numbers
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: DISAPPROVE VIDEO REVIEW WITH QUALITY REASON
          ==================================================================== */}
      {rejectModalVideo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Disapprove Review: {rejectModalVideo.phoneName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reviewer: <strong>{rejectModalVideo.user}</strong> • Payout: Rs. {rejectModalVideo.rewardAmount ?? 0}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalVideo(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Select Quality Rejection Reason (Sent to Reviewer):
              </label>
              <div className="space-y-1.5">
                {PRESET_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      rejectionReason === r
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="presetReason"
                      checked={rejectionReason === r}
                      onChange={() => setRejectionReason(r)}
                      className="mt-0.5 text-rose-500 focus:ring-rose-400 shrink-0"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Or Custom Rejection Feedback (Optional):
                </label>
                <textarea
                  rows={2}
                  value={customRejectionText}
                  onChange={(e) => setCustomRejectionText(e.target.value)}
                  placeholder="Explain exactly what the creator needs to fix in their re-recording..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalVideo(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisapproveVideo}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold cursor-pointer shadow-md"
              >
                Confirm Disapproval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: APPROVE WITHDRAWAL WITH REAL TRANSFER REFERENCE & RECEIPT
          ==================================================================== */}
      {approveModalWithdrawal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Settle Creator Payout: Rs. {approveModalWithdrawal.amountNPR}
            </h3>
            <p className="text-xs text-slate-500">
              Recipient: <strong>{approveModalWithdrawal.user}</strong> · {approveModalWithdrawal.gateway} ({approveModalWithdrawal.accountNumber})
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Real Transfer Reference / UTR ID *
              </label>
              <input
                type="text"
                placeholder="e.g. ESW-948120 or KHL-882103"
                value={withdrawalTransferRef}
                onChange={(e) => setWithdrawalTransferRef(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Payout Receipt Note:
              </label>
              <textarea
                rows={2}
                value={withdrawalReceiptNote}
                onChange={(e) => setWithdrawalReceiptNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApproveModalWithdrawal(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isApprovingWithdrawal}
                onClick={handleConfirmApproveWithdrawal}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs cursor-pointer shadow-md disabled:opacity-50"
              >
                {isApprovingWithdrawal ? 'Saving Receipt...' : 'Confirm Paid & Record Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: APPROVE MANUAL KHALTI QR PAYMENT
          ==================================================================== */}
      {verifyOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-purple-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Approve Khalti QR Payment: {verifyOrderModal.purchaseOrderId}
            </h3>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              Confirm that <b>NPR {verifyOrderModal.amountNPR.toLocaleString('en-IN')}</b> arrived in Khalti account <b>{verifyOrderModal.receiverAccountName}</b> before activating <b>{verifyOrderModal.categoryName}</b> for <b>{verifyOrderModal.companyName}</b>. Screenshots and Transaction IDs are supporting evidence only.
            </div>

            {verifyOrderModal.screenshotUrl && (
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Submitted Screenshot Evidence:</span>
                <PrivatePaymentScreenshot
                  src={verifyOrderModal.screenshotUrl}
                  className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                  onPreview={(url) => setPreviewScreenshotUrl(url)}
                />
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Confirmed Khalti Transaction ID *
                </label>
                <input
                  type="text"
                  value={verifyKhaltiTxnId}
                  onChange={(e) => setVerifyKhaltiTxnId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Verified Amount Received (NPR) *
                </label>
                <input
                  type="number"
                  value={verifyAmountNPR}
                  onChange={(e) => setVerifyAmountNPR(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Admin Decision Notes:
                </label>
                <textarea
                  rows={2}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyOrderModal(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isVerifyingOrder}
                onClick={handleConfirmVerifyStage1Order}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs cursor-pointer shadow-md disabled:opacity-50"
              >
                {isVerifyingOrder ? 'Approving...' : 'Approve & Activate Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: REJECT MANUAL KHALTI QR ORDER
          ==================================================================== */}
      {rejectOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Reject Payment Order: {rejectOrderModal.purchaseOrderId}
            </h3>
            <p className="text-xs text-slate-500">
              Customer: <strong>{rejectOrderModal.companyName}</strong> · Submitted Txn ID: <span className="font-mono">{rejectOrderModal.transactionReference}</span>
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Rejection Reason:
              </label>
              <textarea
                rows={3}
                value={rejectOrderReason}
                onChange={(e) => setRejectOrderReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectOrderModal(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejectingOrder}
                onClick={handleConfirmRejectStage1Order}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs cursor-pointer shadow-md disabled:opacity-50"
              >
                {isRejectingOrder ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: PREVIEW PRIVATE PAYMENT SCREENSHOT
          ==================================================================== */}
      {previewScreenshotUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewScreenshotUrl(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-4 space-y-3 shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Payment Screenshot Supporting Evidence
              </h4>
              <button
                type="button"
                onClick={() => setPreviewScreenshotUrl(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewScreenshotUrl}
              alt="Customer payment screenshot"
              className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: REJECT WITHDRAWAL
          ==================================================================== */}
      {rejectModalWithdrawal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Reject Creator Cashout: Rs. {rejectModalWithdrawal.amountNPR}
            </h3>
            <p className="text-xs text-slate-500">
              User: <strong>{rejectModalWithdrawal.user}</strong> ({rejectModalWithdrawal.gateway}). The funds will be refunded back to their in-app wallet.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Reason for Rejection:
              </label>
              <textarea
                rows={3}
                value={withdrawalRejectReason}
                onChange={(e) => setWithdrawalRejectReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalWithdrawal(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisapproveWithdrawal}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs cursor-pointer shadow-md"
              >
                Confirm Rejection & Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: BAN USER ACCOUNT (BAND THE USERS)
          ==================================================================== */}
      {banUserModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-rose-300 dark:border-rose-900 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Ban & Suspend User Account
                  </h3>
                  <p className="text-xs text-slate-500">
                    User: <strong>{banUserModal.name || banUserModal.user}</strong> ({banUserModal.email || banUserModal.userEmail})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBanUserModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
              Banning this user will block them from submitting new video reviews, prevent automatic cashout disbursements, and flag their contributions across the platform.
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Select Violation Reason:
              </label>
              {[
                'Repeated submission of invalid or promotional video content.',
                'Submitting reviews with blocked or covered camera lens.',
                'Spamming fake smartphone issues and multiple account abuse.',
                'Fraudulent KYC or mismatching withdrawal payment requests.',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                    banReasonText === reason
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="banUserPreset"
                    checked={banReasonText === reason}
                    onChange={() => setBanReasonText(reason)}
                    className="mt-0.5 text-rose-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              <div className="pt-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Custom Ban Reason Note:
                </label>
                <input
                  type="text"
                  value={banReasonText}
                  onChange={(e) => setBanReasonText(e.target.value)}
                  placeholder="Specify custom violation reason..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBanUserModal(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleBanUser(banUserModal, true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <UserX className="w-4 h-4" />
                <span>Confirm Ban Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: BLOCK / BAN SPECIFIC FEEDBACK IDEA
          ==================================================================== */}
      {blockIdeaModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-rose-300 dark:border-rose-900 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Block & Ban Feedback Idea #{blockIdeaModal.id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phone: <strong>{blockIdeaModal.phoneName || blockIdeaModal.phone}</strong> by {blockIdeaModal.user}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlockIdeaModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
              Blocking this feedback idea will immediately reject it, hide it from public company reels, and penalize abusive or trolling feedback submissions.
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Select Reason for Blocking:
              </label>
              {[
                'Irrelevant review content, background noise or promotional spam.',
                'Disrespectful language, abusive feedback or false claims.',
                'Duplicate bot submission or test feedback.',
                'Violates brand review terms and safety policy.',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                    blockIdeaReasonText === reason
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="blockIdeaPreset"
                    checked={blockIdeaReasonText === reason}
                    onChange={() => setBlockIdeaReasonText(reason)}
                    className="mt-0.5 text-rose-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              <div className="pt-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Custom Reason Note:
                </label>
                <input
                  type="text"
                  value={blockIdeaReasonText}
                  onChange={(e) => setBlockIdeaReasonText(e.target.value)}
                  placeholder="Specify custom violation reason..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBlockIdeaModal(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleBlockFeedback(blockIdeaModal, true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                <span>Confirm Block Idea</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: CONFIRM BULK APPROVE ALL PENDING REVIEWS
          ==================================================================== */}
      {showBulkApproveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-800 p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Approve All Pending Reviews?
                  </h3>
                  <p className="text-xs text-slate-500">
                    {pendingVideosCount} pending reviews will be marked approved & credited in Firestore.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkApproveConfirm(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkApproveConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkApprove}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer shadow-md"
              >
                Approve All ({pendingVideosCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: CONFIRM RESET ALL PLATFORM DATA TO ZERO
          ==================================================================== */}
      {showResetDataConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl border border-rose-300 dark:border-rose-800 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Reset All Platform Data?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Starts the platform fresh with 0 stats until new customer feedback arrives.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isResettingData}
                onClick={() => setShowResetDataConfirm(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-1.5">
              <p className="font-bold">This action permanently clears:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>All customer video & text feedback items ({feedbackList.length})</li>
                <li>All company subscription records & payments ({payments.length})</li>
                <li>All withdrawal requests ({adminWithdrawals.length}) & resets user wallets to Rs. 0</li>
                <li>Server notification caches & uploaded video files</li>
              </ul>
            </div>

            {resetError && (
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-semibold">
                {resetError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isResettingData}
                onClick={() => setShowResetDataConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResettingData}
                onClick={handleConfirmResetAllData}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-60"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResettingData ? 'animate-spin' : ''}`} />
                <span>{isResettingData ? 'Resetting Everything...' : 'Yes, Reset All Data to 0'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
