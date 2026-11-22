import React, { useState, useMemo } from 'react';
import { 
  Calendar, ChevronDown, Clock, PieChart, User, 
  Smartphone, Monitor, ArrowUpRight, Check, Eye, 
  Sparkles, RefreshCw, ChevronRight
} from 'lucide-react';
import { FeedbackItem, SubscriptionTier, AdminWithdrawalRequest } from '../types';
import { PaymentRecord } from '../services/firebaseService';
import { CompanyPaymentStatement } from './CompanyPaymentStatement';

interface AiDataAnalysisDashboardProps {
  feedbackList?: FeedbackItem[];
  payments?: PaymentRecord[];
  withdrawals?: AdminWithdrawalRequest[];
  onOpenVideoModal?: (item: FeedbackItem) => void;
  activePlan?: SubscriptionTier;
  reviewsQuotaUsed?: number;
  onSyncData?: () => Promise<void> | void;
}

interface IncomeDataPoint {
  date: string;
  dayLabel: string;
  amount: number;
  orders: number;
  isPeak?: boolean;
}

interface CustomerRecord {
  id: string;
  name: string;
  phoneMasked: string;
  channel: string;
  dateRange: string;
  times: number;
  ratingScore: string;
  amountSpent: number;
  spendBracket: '0-10' | '10-20' | '20-50' | '50-100' | '100+';
  avatar: string;
  city: string;
  lastPurchaseItem: string;
}

export const AiDataAnalysisDashboard: React.FC<AiDataAnalysisDashboardProps> = ({
  feedbackList = [],
  payments = [],
  withdrawals = [],
  activePlan,
  reviewsQuotaUsed = 0,
  onSyncData,
}) => {
  // Real-time synchronization state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [liveSyncDetails, setLiveSyncDetails] = useState<{
    timestamp?: string;
    reviewsCount?: number;
    quotaRemaining?: number | string;
    planName?: string;
  } | null>(null);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      if (onSyncData) {
        await onSyncData();
      }
      const totalQuota = activePlan?.reviewQuota ?? 0;
      const quotaRem = totalQuota >= 9999 ? 'Unlimited' : totalQuota > 0 ? Math.max(0, totalQuota - reviewsQuotaUsed) : 0;
      setLiveSyncDetails({
        timestamp: new Date().toISOString(),
        reviewsCount: feedbackList.length,
        quotaRemaining: quotaRem,
        planName: activePlan?.name || 'No Active Plan',
      });

      const now = new Date();
      setLastSyncedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSyncMessage('Live Firestore metrics, payments, and feedback counts synchronized.');
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err) {
      console.error('Real-time sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const [layoutMode, setLayoutMode] = useState<'responsive' | 'dual_device'>('responsive');
  const [timeframe, setTimeframe] = useState<'1 week' | '30 days' | '60 days' | '90 days'>('1 week');
  const [paymentChannel, setPaymentChannel] = useState<'All' | 'Card' | 'Online' | 'Bank'>('All');
  const [channelDropdownOpen, setChannelDropdownOpen] = useState<boolean>(false);
  const [hoveredBar, setHoveredBar] = useState<number>(-1);
  const [activeSpendBracket, setActiveSpendBracket] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [showOriginalMockup, setShowOriginalMockup] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'Now' | 'Statistics' | 'Mind'>('Statistics');

  const timeframeDays = timeframe === '30 days' ? 30 : timeframe === '60 days' ? 60 : timeframe === '90 days' ? 90 : 7;

  // Filter payments by timeframe and channel
  const scopedPayments = useMemo(() => {
    const cutoff = Date.now() - timeframeDays * 24 * 60 * 60 * 1000;
    return payments.filter((p) => {
      const ts = new Date(p.createdAt).getTime();
      const inWindow = isNaN(ts) || ts >= cutoff;
      if (!inWindow) return false;
      if (paymentChannel === 'All') return true;
      if (paymentChannel === 'Card') return p.method === 'card' || p.gateway.toLowerCase().includes('card');
      if (paymentChannel === 'Bank') return p.method === 'bank' || p.gateway.toLowerCase().includes('bank');
      return p.method === 'online';
    });
  }, [payments, timeframeDays, paymentChannel]);

  // Real 7-bucket income bars ending today
  const activeIncomeData: IncomeDataPoint[] = useMemo(() => {
    const today = new Date();
    const bucketDays = 7;
    const stepDays = Math.max(1, Math.round(timeframeDays / bucketDays));
    const buckets: IncomeDataPoint[] = [];

    for (let i = bucketDays - 1; i >= 0; i--) {
      const end = new Date(today.getTime() - i * stepDays * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - stepDays * 24 * 60 * 60 * 1000);
      const matching = scopedPayments.filter((p) => {
        const t = new Date(p.createdAt).getTime();
        return !isNaN(t) && t > start.getTime() && t <= end.getTime();
      });
      const amount = Math.round(matching.reduce((s, p) => s + (Number(p.amountUSD) || 0), 0) * 100) / 100;
      const mm = String(end.getMonth() + 1).padStart(2, '0');
      const dd = String(end.getDate()).padStart(2, '0');
      const dayLabel = end.toLocaleDateString('en-US', { weekday: 'short' });
      buckets.push({
        date: `${mm}/${dd}`,
        dayLabel,
        amount,
        orders: matching.length,
      });
    }

    const maxAmt = Math.max(0, ...buckets.map((b) => b.amount));
    if (maxAmt > 0) {
      const peakIdx = buckets.findIndex((b) => b.amount === maxAmt);
      if (peakIdx >= 0) buckets[peakIdx].isPeak = true;
    }
    return buckets;
  }, [scopedPayments, timeframeDays]);

  // Real Contract Merchant metrics
  const merchantMetrics = useMemo(() => {
    const amount = Math.round(scopedPayments.reduce((s, p) => s + (Number(p.amountUSD) || 0), 0) * 100) / 100;
    const list = scopedPayments.length;
    const uniquePayers = new Set(scopedPayments.map((p) => p.uid || p.payerName)).size;
    const average = list > 0 ? Math.round((amount / list) * 100) / 100 : 0;
    const totalOutUSD = withdrawals.reduce((s, w) => s + (Number(w.amountNPR) || 0) / 135, 0);
    const marginPct = amount > 0 ? Math.round(((amount - totalOutUSD) / amount) * 1000) / 10 : 0;
    return {
      amount,
      list,
      payer: uniquePayers,
      average,
      growth: `${list} orders`,
      marginPct,
    };
  }, [scopedPayments, withdrawals]);

  // Real Donut distribution breakdown percentages by ticket size
  const distributionTiers = useMemo(() => {
    const defs = [
      { label: '0-10' as const, color: '#00C48C', min: 0, max: 10, desc: 'Micro transactions' },
      { label: '10-20' as const, color: '#2F80ED', min: 10, max: 20, desc: 'Entry passes' },
      { label: '20-50' as const, color: '#7B61FF', min: 20, max: 50, desc: 'Standard plans' },
      { label: '50-100' as const, color: '#FF9500', min: 50, max: 100, desc: 'Multi-month packs' },
      { label: '100+' as const, color: '#FF5B5B', min: 100, max: Infinity, desc: 'Annual enterprise' },
    ];
    const total = scopedPayments.length;
    const counts = defs.map((d) =>
      scopedPayments.filter((p) => p.amountUSD >= d.min && p.amountUSD < d.max).length
    );
    const maxCount = Math.max(0, ...counts);
    const circumference = 2 * Math.PI * 34; // ~213.63
    let cumulativeLen = 0;

    return defs.map((d, idx) => {
      const count = counts[idx];
      const pctNum = total > 0 ? Math.round((count / total) * 10000) / 100 : 0;
      const segLen = total > 0 ? (count / total) * circumference : 0;
      const offset = -cumulativeLen;
      cumulativeLen += segLen;
      return {
        label: d.label,
        percent: `${pctNum.toFixed(total > 0 ? 2 : 0)}%`,
        percentNum: pctNum,
        color: d.color,
        count,
        desc: d.desc,
        isHighlight: maxCount > 0 && count === maxCount,
        dashArray: `${segLen.toFixed(2)} ${circumference.toFixed(2)}`,
        dashOffset: offset.toFixed(2),
      };
    });
  }, [scopedPayments]);

  const mainDistributionTier = useMemo(() => {
    return distributionTiers.find((t) => t.isHighlight) || { label: 'None', percent: '0%' };
  }, [distributionTiers]);

  // Real Customer Records aggregated from scopedPayments + feedbackList
  const loyalCustomers: CustomerRecord[] = useMemo(() => {
    const byKey = new Map<string, {
      id: string;
      name: string;
      channel: string;
      times: number;
      amountSpent: number;
      lastDate: string;
      lastPurchaseItem: string;
    }>();

    scopedPayments.forEach((p) => {
      const key = p.uid || p.payerName || p.id;
      const existing = byKey.get(key);
      const dStr = p.createdAt
        ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'Recent';
      if (existing) {
        existing.times += 1;
        existing.amountSpent = Math.round((existing.amountSpent + (Number(p.amountUSD) || 0)) * 100) / 100;
        existing.lastDate = dStr;
        existing.lastPurchaseItem = p.planName || existing.lastPurchaseItem;
      } else {
        byKey.set(key, {
          id: key,
          name: p.payerName || 'Verified Subscriber',
          channel: p.gateway || 'Card',
          times: 1,
          amountSpent: Math.round((Number(p.amountUSD) || 0) * 100) / 100,
          lastDate: dStr,
          lastPurchaseItem: p.planName || 'Subscription Pass',
        });
      }
    });

    const avgAllRating = feedbackList.length > 0
      ? (feedbackList.reduce((s, f) => s + (f.rating || 0), 0) / feedbackList.length).toFixed(1)
      : '0.0';

    return Array.from(byKey.values()).map((c) => {
      const spendBracket: CustomerRecord['spendBracket'] =
        c.amountSpent < 10 ? '0-10' :
        c.amountSpent < 20 ? '10-20' :
        c.amountSpent < 50 ? '20-50' :
        c.amountSpent < 100 ? '50-100' : '100+';
      const matchedFb = feedbackList.find((f) => (f as any).uid === c.id || f.user === c.name);
      const ratingScore = matchedFb ? `${matchedFb.rating}.0` : avgAllRating;
      return {
        id: c.id,
        name: c.name,
        phoneMasked: 'Verified Account',
        channel: c.channel,
        dateRange: c.lastDate,
        times: c.times,
        ratingScore,
        amountSpent: c.amountSpent,
        spendBracket,
        avatar: matchedFb?.userAvatar || '',
        city: matchedFb?.city || 'Verified',
        lastPurchaseItem: c.lastPurchaseItem,
      };
    });
  }, [scopedPayments, feedbackList]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return loyalCustomers.filter((c) => {
      const matchBracket = !activeSpendBracket || c.spendBracket === activeSpendBracket;
      return matchBracket;
    });
  }, [loyalCustomers, activeSpendBracket]);

  // Max value for bar chart height normalization
  const maxBarValue = useMemo(() => {
    const m = Math.max(0, ...activeIncomeData.map((d) => d.amount));
    return m > 0 ? m * 1.15 : 100;
  }, [activeIncomeData]);

  // Total income for active period
  const totalIncomeSum = useMemo(() => {
    return Math.round(activeIncomeData.reduce((acc, curr) => acc + curr.amount, 0) * 100) / 100;
  }, [activeIncomeData]);

  const peakBucket = useMemo(() => {
    return activeIncomeData.find((d) => d.isPeak && d.amount > 0) || null;
  }, [activeIncomeData]);

  const avgCustomerRating = useMemo(() => {
    if (feedbackList.length === 0) return '0.0';
    return (feedbackList.reduce((s, f) => s + (f.rating || 0), 0) / feedbackList.length).toFixed(1);
  }, [feedbackList]);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      
      {/* =========================================================================
          TOP RESPONSIVE HEADER BAR (FITS LAPTOP, PC, TABLET, AND MOBILE)
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200/60 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>EXACT MOBILE & WEB DATA ANALYSIS DASHBOARD</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Data Analysis
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl font-medium">
            Full-width analytics fitting laptops, desktop PCs, tablets, and phones. Displays Amount of Income, Contract Merchant KPIs, Donut Distributions, and Loyal Customer transactions.
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Switcher: Full Web Grid vs Mobile Phone Simulator */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLayoutMode('responsive')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                layoutMode === 'responsive'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Full width grid fitting your laptop, PC or monitor window"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-600" />
              <span>Full PC / Web View</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('dual_device')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                layoutMode === 'dual_device'
                  ? 'bg-blue-600 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Side-by-side iOS phone mockups matching the screenshot"
            >
              <Smartphone className="w-3.5 h-3.5 text-white" />
              <span>Mobile Phone Mockup</span>
            </button>
          </div>

          {/* Reference Image Inspector Toggle */}
          <button
            type="button"
            onClick={() => setShowOriginalMockup(!showOriginalMockup)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>{showOriginalMockup ? 'Hide Mockup' : 'Reference Asset'}</span>
          </button>

          {/* Real-time Sync Now Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                isSyncing
                  ? 'bg-blue-100 text-blue-700 border border-blue-300 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-500/20 active:scale-95'
              }`}
              title="Manually re-fetch latest subscription and feedback data in real-time"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
            <div className="text-[10px] text-slate-400 font-medium hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Synced {lastSyncedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Notification Banner */}
      {syncMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Real-Time Live
          </span>
        </div>
      )}

      {/* Live Synced Platform Metadata Bar */}
      {liveSyncDetails && (
        <div className="bg-slate-900 text-white rounded-2xl px-4 py-2 border border-slate-800 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-extrabold">Active Platform Sync:</span>
            <span className="text-slate-300 font-mono">{liveSyncDetails.planName || activePlan?.name || 'No Active Plan'}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-300">
            <span>Remaining Quota: <b className="text-emerald-400 font-mono">{liveSyncDetails.quotaRemaining ?? (activePlan?.reviewQuota ? Math.max(0, activePlan.reviewQuota - (reviewsQuotaUsed || 0)) : 0)}</b></span>
            <span>Verified Auditions: <b className="text-white font-mono">{liveSyncDetails.reviewsCount ?? feedbackList.length}</b></span>
            <span className="text-slate-400 font-mono hidden md:inline">Last Check: {new Date(liveSyncDetails.timestamp || Date.now()).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* Reference Asset Inspection Drawer */}
      {showOriginalMockup && (
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-700 text-white space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Uploaded Reference Mockup: /public/assets/aistudio/original-d4e074664ecfd4588c826795434c0fd6_619c5a05.png
            </span>
            <button
              type="button"
              onClick={() => setShowOriginalMockup(false)}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Close ✕
            </button>
          </div>
          <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden border border-slate-700 shadow-xl bg-black/40">
            <img
              src="./assets/aistudio/original-d4e074664ecfd4588c826795434c0fd6_619c5a05.png"
              alt="Data analysis reference mockup"
              className="w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Calendar Date-Range Picker Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h4 className="text-base font-black text-slate-900">Select Date Range</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {(['1 week', '30 days', '60 days', '90 days'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setTimeframe(r);
                    setShowCalendarModal(false);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    timeframe === r
                      ? 'bg-blue-600 text-white border-blue-600 font-black shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div>Active Window: <b className="text-slate-800">Last {timeframe}</b></div>
              <div>
                Peak Day:{' '}
                <b className="text-emerald-700">
                  {peakBucket ? `${peakBucket.date} ($${peakBucket.amount.toFixed(2)})` : 'No transactions recorded'}
                </b>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCalendarModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                {selectedCustomer.avatar ? (
                  <img
                    src={selectedCustomer.avatar}
                    alt={selectedCustomer.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-base">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-base font-black text-slate-900">{selectedCustomer.name}</h4>
                  <span className="text-xs text-slate-400 font-mono">{selectedCustomer.phoneMasked} • {selectedCustomer.city}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spent</span>
                <span className="text-xl font-black text-[#FF5B5B] font-mono mt-0.5 block">
                  ${selectedCustomer.amountSpent.toFixed(2)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Frequency & Channel</span>
                <span className="text-sm font-black text-slate-900 mt-1 block">
                  {selectedCustomer.times} times ({selectedCustomer.channel})
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-900 block">Last Verified Activity</span>
              <p className="font-semibold text-slate-900">{selectedCustomer.lastPurchaseItem}</p>
              <div className="text-[11px] text-blue-800">
                Satisfaction Rating: <b>{selectedCustomer.ratingScore} / 6.0</b> • Date Range: {selectedCustomer.dateRange}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 1: FULL RESPONSIVE PC / LAPTOP / WEB GRID
          (Natively fills the window area on all screens: PC, Laptop, Tablet, Mobile)
          ========================================================================= */}
      {layoutMode === 'responsive' && (
        <div className="space-y-6 w-full">
          
          {/* Top Bar: Timeframe Selector + Payment Channel + Calendar Trigger */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Timeframe Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              <span className="text-xs font-black uppercase text-slate-400 mr-1 hidden md:inline">Timeframe:</span>
              {(['1 week', '30 days', '60 days', '90 days'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTimeframe(tab)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    timeframe === tab
                      ? 'bg-[#2F80ED] text-white shadow-md shadow-blue-500/25 font-black'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Right: Payment channel dropdown + Calendar trigger */}
            <div className="flex items-center gap-3">
              {/* Payment Filter */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setChannelDropdownOpen(!channelDropdownOpen)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                >
                  <span>Channel: <b>{paymentChannel}</b></span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>
                {channelDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs font-bold">
                    {(['All', 'Card', 'Online', 'Bank'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setPaymentChannel(opt);
                          setChannelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                          paymentChannel === opt ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                        }`}
                      >
                        <span>{opt}</span>
                        {paymentChannel === opt && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Calendar Trigger */}
              <button
                type="button"
                onClick={() => setShowCalendarModal(true)}
                className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer border border-blue-200/60"
                title="Select Date Range"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Revenue Architecture Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-indigo-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono">
                  Company Monetization & Income Inflow Model
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                How dot Gets Income & Balances Creator Payouts
              </h3>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Companies pay subscriptions for verified video review intelligence. Creators earn full reward payouts with zero fee deductions.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-300">Net Platform Margin</div>
                <div className="text-lg font-black text-emerald-400 font-mono">{merchantMetrics.marginPct}%</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-300">Creator Net Payout</div>
                <div className="text-lg font-black text-amber-300 font-mono">100% Net</div>
              </div>
            </div>
          </div>

          {/* 4-Card Responsive Grid fitting PC, Laptop, and Tablet screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            
            {/* ===================================================================
                CARD 1: AMOUNT OF INCOME (FULL RESPONSIVE BAR CHART)
                =================================================================== */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/90 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#2F80ED] ring-4 ring-blue-100" />
                    <div>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight">
                        Amount of income
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">Daily income distribution and peak revenue tracker</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Volume</span>
                    <span className="text-xl font-black text-[#2F80ED] font-mono">
                      ${totalIncomeSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* The Responsive Bar Chart Canvas */}
                <div className="pt-8 pb-4">
                  <div className="relative flex items-end justify-between h-56 border-b border-slate-100 px-3">
                    {/* Horizontal Y-Axis Guideline Labels */}
                    <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[11px] font-mono font-bold text-slate-400 pointer-events-none -translate-x-2">
                      <span>${Math.round(maxBarValue)}</span>
                      <span>${Math.round(maxBarValue * 0.75)}</span>
                      <span>${Math.round(maxBarValue * 0.5)}</span>
                      <span>${Math.round(maxBarValue * 0.25)}</span>
                      <span>$0</span>
                    </div>

                    {/* Bars Grid Container */}
                    <div className="flex items-end justify-between w-full pl-10 pr-2 h-full">
                      {activeIncomeData.map((d, idx) => {
                        const heightPct = d.amount > 0 ? Math.min(100, Math.max(8, (d.amount / maxBarValue) * 100)) : 2;
                        const isHovered = hoveredBar === idx;
                        const isPeak = Boolean(d.isPeak && d.amount > 0);

                        return (
                          <div
                            key={d.date}
                            className="flex flex-col items-center relative group cursor-pointer flex-1 px-1 sm:px-2"
                            onMouseEnter={() => setHoveredBar(idx)}
                            onClick={() => setHoveredBar(idx)}
                          >
                            {/* Floating Tooltip Badge */}
                            {(isPeak || (isHovered && d.amount > 0)) && (
                              <div className="absolute -top-11 z-20 transition-all duration-200">
                                <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[#FF5B5B] to-[#FF7070] text-white text-xs font-black shadow-lg shadow-rose-500/30 whitespace-nowrap flex items-center gap-1">
                                  <span>${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            )}

                            {/* Bar Column */}
                            <div className="w-full max-w-[42px] h-48 flex items-end justify-center">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full rounded-t-xl transition-all duration-300 ${
                                  d.amount === 0
                                    ? 'bg-slate-200'
                                    : isPeak
                                    ? 'bg-[#2F80ED] shadow-md shadow-blue-500/30'
                                    : isHovered
                                    ? 'bg-blue-400 shadow-sm'
                                    : 'bg-gradient-to-t from-blue-200/50 via-blue-300/70 to-blue-400/90'
                                }`}
                              />
                            </div>

                            {/* Date Label */}
                            <div className="text-center mt-2.5">
                              <span className={`text-xs font-mono block ${
                                isPeak ? 'font-black text-slate-900 underline decoration-blue-500 decoration-2' : 'font-bold text-slate-500'
                              }`}>
                                {d.date}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {d.dayLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Insight Footer */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span className={`w-2 h-2 rounded-full ${peakBucket ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {peakBucket ? `Peak Period: ${peakBucket.date} ($${peakBucket.amount.toFixed(2)})` : 'No payments recorded in window'}
                </span>
                <span className="font-mono text-slate-500">
                  Channel: {paymentChannel}
                </span>
              </div>
            </div>

            {/* ===================================================================
                CARD 2: DONUT DISTRIBUTION (SVG DONUT + PERCENTAGE LEGEND)
                =================================================================== */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/90 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#7B61FF] ring-4 ring-purple-100" />
                    <div>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight">
                        Donut Distribution
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">Transaction volume by ticket size brackets</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200/60">
                    {scopedPayments.length} Orders
                  </span>
                </div>

                {/* SVG Donut Ring */}
                <div className="flex items-center justify-center pt-2 pb-4">
                  <div className="relative w-52 h-52 sm:w-60 sm:h-60">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="34" fill="none" stroke="#e2e8f0" strokeWidth="14" />
                      {scopedPayments.length > 0 && distributionTiers.map((tier) => (
                        tier.count > 0 && (
                          <circle
                            key={tier.label}
                            cx="50"
                            cy="50"
                            r="34"
                            fill="none"
                            stroke={tier.color}
                            strokeWidth={tier.isHighlight ? '15' : '14'}
                            strokeDasharray={tier.dashArray}
                            strokeDashoffset={tier.dashOffset}
                            className="transition-all cursor-pointer"
                            onClick={() => setActiveSpendBracket(activeSpendBracket === tier.label ? null : tier.label)}
                          />
                        )
                      ))}
                    </svg>

                    {/* Inner Cutout */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white shadow-inner flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-400">Main Share</span>
                        <span className="text-xl sm:text-2xl font-black text-[#7B61FF] font-mono">{mainDistributionTier.percent}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {mainDistributionTier.label === 'None' ? 'No orders' : `${mainDistributionTier.label} bracket`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5-Tier Percentage Legend */}
                <div className="grid grid-cols-5 gap-2 pt-2 text-center">
                  {distributionTiers.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setActiveSpendBracket(activeSpendBracket === t.label ? null : t.label)}
                      className={`p-2 rounded-2xl transition-all cursor-pointer border ${
                        activeSpendBracket === t.label
                          ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/40 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="text-xs font-bold text-slate-600">
                          {t.label}
                        </span>
                      </div>
                      <div className={`text-xs sm:text-sm font-mono font-black ${
                        t.isHighlight ? 'text-[#7B61FF]' : 'text-slate-900'
                      }`}>
                        {t.percent}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend Note */}
              <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs text-purple-900 flex items-center justify-between">
                <span>
                  {scopedPayments.length > 0
                    ? <>Top bracket: <b>{mainDistributionTier.label} ({mainDistributionTier.percent})</b></>
                    : 'No subscription orders recorded yet'}
                </span>
                <span className="font-mono text-[11px] text-purple-700">Click any bracket to filter</span>
              </div>
            </div>

            {/* ===================================================================
                CARD 3: CONTRACT MERCHANT (4 STAT TILES + SEMICIRCLE ARC GAUGE)
                =================================================================== */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/90 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#00C48C] ring-4 ring-emerald-100" />
                    <div>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight">
                        Contract merchant
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">Settlement volume, partner lists, and average ticket</span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/60">
                    {merchantMetrics.growth}
                  </span>
                </div>

                {/* 4 Metric Tiles Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
                    <div className="text-2xl font-black text-[#00C48C] tracking-tight font-mono">
                      {merchantMetrics.amount}
                    </div>
                    <div className="text-xs font-bold text-slate-500 mt-1">
                      Amount($)
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-center">
                    <div className="text-2xl font-black text-[#2F80ED] tracking-tight font-mono">
                      {merchantMetrics.list}
                    </div>
                    <div className="text-xs font-bold text-slate-500 mt-1">
                      List
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 text-center">
                    <div className="text-2xl font-black text-[#FF9500] tracking-tight font-mono">
                      {merchantMetrics.payer}
                    </div>
                    <div className="text-xs font-bold text-slate-500 mt-1">
                      Payer
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-center">
                    <div className="text-2xl font-black text-[#FF5B5B] tracking-tight font-mono">
                      {merchantMetrics.average}
                    </div>
                    <div className="text-xs font-bold text-slate-500 mt-1">
                      Average($)
                    </div>
                  </div>
                </div>

                {/* Semicircle Gauge */}
                <div className="pt-6 flex flex-col items-center justify-center">
                  <div className="relative w-64 h-32 overflow-hidden">
                    <svg viewBox="0 0 100 50" className="w-full h-full">
                      <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="14"
                        strokeLinecap="round"
                      />
                      {merchantMetrics.list > 0 && (
                        <>
                          <path d="M 10 50 A 40 40 0 0 1 25 21" fill="none" stroke="#00C48C" strokeWidth="14" strokeLinecap="round" />
                          <path d="M 27 19 A 40 40 0 0 1 45 11" fill="none" stroke="#2F80ED" strokeWidth="14" />
                          <path d="M 48 10 A 40 40 0 0 1 72 16" fill="none" stroke="#FF9500" strokeWidth="14" />
                          <path d="M 74 18 A 40 40 0 0 1 90 50" fill="none" stroke="#FF5B5B" strokeWidth="14" strokeLinecap="round" />
                        </>
                      )}
                    </svg>
                  </div>
                  <span className="text-xs text-slate-400 font-mono mt-2">
                    {merchantMetrics.list > 0 ? 'Settlement Tier Distribution Gauge' : 'Awaiting first settlement'}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Active Subscribers: <b>{merchantMetrics.payer} verified accounts</b></span>
                <span className="font-bold text-emerald-600">{merchantMetrics.list > 0 ? 'Operational: 100%' : 'No settlements yet'}</span>
              </div>
            </div>

            {/* ===================================================================
                CARD 4: LOYAL CUSTOMER (TRANSACTION LIST & DETAIL CARDS)
                =================================================================== */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/90 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#FF5B5B] ring-4 ring-rose-100" />
                    <div>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight">
                        Loyal customer
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">Top frequent buyers and spend history</span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                    {loyalCustomers.length} records
                  </span>
                </div>

                {/* Customer List Rows */}
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <p className="text-sm font-bold text-slate-700">No customer payment records yet</p>
                      <p className="text-xs text-slate-400 mt-1">Completed subscriptions will automatically populate here.</p>
                    </div>
                  ) : filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomer(cust)}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        {cust.avatar ? (
                          <img
                            src={cust.avatar}
                            alt={cust.name}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            <span>{cust.name}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white text-slate-500 border border-slate-200">
                              {cust.channel}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {cust.phoneMasked}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {cust.channel} | {cust.dateRange} | {cust.times} times | {cust.ratingScore}★
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-[#FF5B5B] font-mono">
                          ${cust.amountSpent.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-blue-600 font-bold hover:underline flex items-center justify-end gap-0.5 mt-0.5">
                          <span>Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Showing {filteredCustomers.length} of {loyalCustomers.length} records</span>
                <span className="font-bold text-slate-800">Average Rating: {avgCustomerRating} / 5.0</span>
              </div>
            </div>

          </div>

          {/* Transparent Company Payment Statement Section */}
          <CompanyPaymentStatement payments={payments} withdrawals={withdrawals} feedbackList={feedbackList} />
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: DUAL MOBILE DEVICE SIMULATOR (MATCHING ATTACHED SCREENSHOT)
          ========================================================================= */}
      {layoutMode === 'dual_device' && (
        <div className="p-4 sm:p-8 rounded-[48px] bg-gradient-to-br from-[#4085FA]/25 via-[#EDF4FF] to-[#DCE9FF] border border-blue-200/60 shadow-inner flex items-center justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl w-full items-start justify-center">

            {/* SCREEN 1: LEFT PHONE */}
            <div className="w-full max-w-[390px] mx-auto bg-[#F6F8FC] rounded-[48px] overflow-hidden shadow-[0_25px_60px_rgba(47,128,237,0.18)] border-4 border-white flex flex-col min-h-[780px]">
              {/* Status Bar */}
              <div className="px-7 pt-3.5 pb-2 flex items-center justify-between text-xs font-black text-slate-800 tracking-tight">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-end gap-0.5 h-3">
                    <div className="w-0.5 h-1 bg-slate-800 rounded-xs" />
                    <div className="w-0.5 h-1.5 bg-slate-800 rounded-xs" />
                    <div className="w-0.5 h-2 bg-slate-800 rounded-xs" />
                    <div className="w-0.5 h-2.5 bg-slate-800 rounded-xs" />
                  </div>
                  <svg className="w-3.5 h-3.5 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4zm0 2.22c3.96 0 7.54 1.54 10.24 4.07L12 18.57 1.76 10.29C4.46 7.76 8.04 6.22 12 6.22z"/>
                  </svg>
                  <div className="w-5 h-2.5 rounded-sm border border-slate-800 p-0.5 flex items-center">
                    <div className="w-3 h-full bg-slate-800 rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* Header */}
              <div className="px-6 pt-3 pb-2 flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Data analysis
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(true)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </div>

              {/* Timeframe Pills */}
              <div className="px-6 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
                {(['1 week', '30 days', '60 days', '90 days'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTimeframe(tab)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      timeframe === tab
                        ? 'bg-[#2F80ED] text-white shadow-md shadow-blue-500/25 font-black'
                        : 'bg-white text-slate-600 hover:text-slate-900 shadow-2xs'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="px-5 py-3 space-y-4 flex-1">
                {/* Amount of income */}
                <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2F80ED] ring-4 ring-blue-100" />
                      <h4 className="text-sm font-black text-slate-900">
                        Amount of income
                      </h4>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setChannelDropdownOpen(!channelDropdownOpen)}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <span>{paymentChannel}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Vertical Bar Chart */}
                  <div className="pt-6 pb-2">
                    <div className="relative flex items-end justify-between h-44 border-b border-slate-100 px-2">
                      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] font-mono font-bold text-slate-300 pointer-events-none -translate-x-1">
                        <span>${Math.round(maxBarValue)}</span>
                        <span>${Math.round(maxBarValue * 0.5)}</span>
                        <span>$0</span>
                      </div>

                      <div className="flex items-end justify-between w-full pl-8 pr-2 h-full">
                        {activeIncomeData.map((d, idx) => {
                          const heightPct = d.amount > 0 ? Math.min(100, Math.max(10, (d.amount / maxBarValue) * 100)) : 2;
                          const isHovered = hoveredBar === idx;
                          const isPeak = Boolean(d.isPeak && d.amount > 0);

                          return (
                            <div
                              key={d.date}
                              className="flex flex-col items-center relative group cursor-pointer"
                              onMouseEnter={() => setHoveredBar(idx)}
                              onClick={() => setHoveredBar(idx)}
                            >
                              {(isPeak || (isHovered && d.amount > 0)) && (
                                <div className="absolute -top-10 z-10 duration-300">
                                  <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#FF5B5B] to-[#FF7070] text-white text-[11px] font-black shadow-md shadow-rose-500/30 whitespace-nowrap">
                                    ${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                              )}

                              <div className="w-4 sm:w-5 h-36 flex items-end justify-center">
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-full rounded-t-lg transition-all duration-300 ${
                                    d.amount === 0
                                      ? 'bg-slate-200'
                                      : isPeak
                                      ? 'bg-[#2F80ED] shadow-sm shadow-blue-500/20'
                                      : isHovered
                                      ? 'bg-blue-400'
                                      : 'bg-gradient-to-t from-blue-300/40 via-blue-300/60 to-blue-400/80'
                                  }`}
                                />
                              </div>

                              <span className={`text-[10px] mt-2 font-mono ${
                                isPeak ? 'font-black text-slate-900' : 'font-bold text-slate-400'
                              }`}>
                                {d.date}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contract merchant */}
                <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2F80ED] ring-4 ring-blue-100" />
                    <h4 className="text-sm font-black text-slate-900">
                      Contract merchant
                    </h4>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-2xl bg-emerald-50/50 border border-emerald-100/60 text-center">
                      <div className="text-base font-black text-[#00C48C] tracking-tight">
                        {merchantMetrics.amount}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Amount($)
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-blue-50/50 border border-blue-100/60 text-center">
                      <div className="text-base font-black text-[#2F80ED] tracking-tight">
                        {merchantMetrics.list}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                        List
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-orange-50/50 border border-orange-100/60 text-center">
                      <div className="text-base font-black text-[#FF9500] tracking-tight">
                        {merchantMetrics.payer}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Payer
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-rose-50/50 border border-rose-100/60 text-center">
                      <div className="text-base font-black text-[#FF5B5B] tracking-tight">
                        {merchantMetrics.average}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Average($)
                      </div>
                    </div>
                  </div>

                  {/* Semicircle Gauge */}
                  <div className="pt-2 flex flex-col items-center justify-center">
                    <div className="relative w-48 h-24 overflow-hidden">
                      <svg viewBox="0 0 100 50" className="w-full h-full">
                        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
                        {merchantMetrics.list > 0 && (
                          <>
                            <path d="M 10 50 A 40 40 0 0 1 25 21" fill="none" stroke="#00C48C" strokeWidth="14" strokeLinecap="round" />
                            <path d="M 27 19 A 40 40 0 0 1 45 11" fill="none" stroke="#2F80ED" strokeWidth="14" />
                            <path d="M 48 10 A 40 40 0 0 1 72 16" fill="none" stroke="#FF9500" strokeWidth="14" />
                            <path d="M 74 18 A 40 40 0 0 1 90 50" fill="none" stroke="#FF5B5B" strokeWidth="14" strokeLinecap="round" />
                          </>
                        )}
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-around text-[10px] font-black">
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('Now')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    activeBottomTab === 'Now' ? 'text-[#2F80ED]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('Statistics')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    activeBottomTab === 'Statistics' ? 'text-[#2F80ED]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <PieChart className="w-4 h-4" />
                  <span>Statistics</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('Mind')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    activeBottomTab === 'Mind' ? 'text-[#2F80ED]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Mind</span>
                </button>
              </div>
            </div>

            {/* SCREEN 2: RIGHT PHONE */}
            <div className="w-full max-w-[390px] mx-auto bg-[#F6F8FC] rounded-[48px] overflow-hidden shadow-[0_25px_60px_rgba(47,128,237,0.18)] border-4 border-white flex flex-col min-h-[780px]">
              {/* Status Bar */}
              <div className="px-7 pt-3.5 pb-2 flex items-center justify-between text-xs font-black text-slate-800 tracking-tight">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-end gap-0.5 h-3">
                    <div className="w-0.5 h-1 bg-slate-800 rounded-xs" />
                    <div className="w-0.5 h-1.5 bg-slate-800 rounded-xs" />
                    <div className="w-0.5 h-2 bg-slate-800 rounded-xs" />
                    <div className="w-0.5 h-2.5 bg-slate-800 rounded-xs" />
                  </div>
                  <svg className="w-3.5 h-3.5 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4zm0 2.22c3.96 0 7.54 1.54 10.24 4.07L12 18.57 1.76 10.29C4.46 7.76 8.04 6.22 12 6.22z"/>
                  </svg>
                  <div className="w-5 h-2.5 rounded-sm border border-slate-800 p-0.5 flex items-center">
                    <div className="w-3 h-full bg-slate-800 rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* Header */}
              <div className="px-6 pt-3 pb-2 flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Data analysis
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(true)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </div>

              {/* Timeframe Pills */}
              <div className="px-6 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
                {(['1 week', '30 days', '60 days', '90 days'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTimeframe(tab)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      timeframe === tab
                        ? 'bg-[#2F80ED] text-white shadow-md shadow-blue-500/25 font-black'
                        : 'bg-white text-slate-600 hover:text-slate-900 shadow-2xs'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="px-5 py-3 space-y-4 flex-1">
                {/* Donut distribution */}
                <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 space-y-3">
                  <div className="flex items-center justify-center pt-2">
                    <div className="relative w-44 h-44">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="34" fill="none" stroke="#e2e8f0" strokeWidth="14" />
                        {scopedPayments.length > 0 && distributionTiers.map((tier) => (
                          tier.count > 0 && (
                            <circle
                              key={tier.label}
                              cx="50"
                              cy="50"
                              r="34"
                              fill="none"
                              stroke={tier.color}
                              strokeWidth="14"
                              strokeDasharray={tier.dashArray}
                              strokeDashoffset={tier.dashOffset}
                            />
                          )
                        ))}
                      </svg>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-white shadow-inner flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-slate-400">Main</span>
                          <span className="text-sm font-black text-[#7B61FF]">{mainDistributionTier.percent}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1 pt-2 text-center">
                    {distributionTiers.map((t) => (
                      <div key={t.label} className="space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className="w-2 h-2 rounded-xs"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="text-[10px] font-bold text-slate-500">
                            {t.label}
                          </span>
                        </div>
                        <div className={`text-[11px] font-mono font-black ${
                          t.isHighlight ? 'text-[#7B61FF]' : 'text-slate-800'
                        }`}>
                          {t.percent}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Loyal customer */}
                <div className="bg-white rounded-[28px] p-5 shadow-sm border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2F80ED] ring-4 ring-blue-100" />
                      <h4 className="text-sm font-black text-slate-900">
                        Loyal customer
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {loyalCustomers.length} records
                    </span>
                  </div>

                  <div className="space-y-3">
                    {filteredCustomers.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No payment records yet
                      </div>
                    ) : filteredCustomers.slice(0, 3).map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => setSelectedCustomer(cust)}
                        className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {cust.avatar ? (
                            <img
                              src={cust.avatar}
                              alt={cust.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {cust.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-black text-slate-900">
                              {cust.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {cust.phoneMasked}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {cust.channel} | {cust.dateRange} | {cust.times} times | {cust.ratingScore}★
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-[#FF5B5B] font-mono">
                            ${cust.amountSpent.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-around text-[10px] font-black">
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('Now')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    activeBottomTab === 'Now' ? 'text-[#2F80ED]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('Statistics')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    activeBottomTab === 'Statistics' ? 'text-[#2F80ED]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <PieChart className="w-4 h-4" />
                  <span>Statistics</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBottomTab('Mind')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                    activeBottomTab === 'Mind' ? 'text-[#2F80ED]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Mind</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
