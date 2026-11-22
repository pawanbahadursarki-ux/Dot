import React, { useState, useMemo } from 'react';
import { 
  Users, ShoppingBag, ArrowUpRight, ChevronDown, MoreHorizontal, 
  Search, Bell, Download, Play, CheckCircle2, ShieldCheck,
  TrendingUp, CreditCard, Sparkles, Filter, Wrench, AlertCircle,
  Check, X, Smartphone, Cpu, RefreshCw, Send, PlusCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { FeedbackItem, SubscriptionTier, UserProfile } from '../types';
import {
  computeChartMetricsFromFeedback,
  CartOrderRecord,
} from '../utils/cartAndChartEngine';
import { updateFeedbackDefectInFirestore } from '../services/firebaseService';
import { formatFirestoreErrorMessage } from '../firebase';

interface CompanyBoardAnalyticsProps {
  feedbackList: FeedbackItem[];
  activePlan?: SubscriptionTier;
  user?: UserProfile;
  currentBrandName?: string;
  onOpenVideoModal?: (item: FeedbackItem) => void;
  onOpenCartModal?: (item: FeedbackItem) => void;
  onFeedbackUpdated?: (updated: FeedbackItem) => void;
}

export const CompanyBoardAnalytics: React.FC<CompanyBoardAnalyticsProps> = ({
  feedbackList,
  activePlan,
  user,
  currentBrandName = 'All Brands',
  onOpenVideoModal,
  onOpenCartModal,
  onFeedbackUpdated,
}) => {
  const [timeRange, setTimeRange] = useState<'30 days' | '7 days' | '90 days'>('30 days');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'errors' | 'fixed'>('all');
  
  // Interactive "Fix Their Error" modal state
  const [fixingOrder, setFixingOrder] = useState<CartOrderRecord | null>(null);
  const [patchNote, setPatchNote] = useState<string>('');
  const [targetFixVersion, setTargetFixVersion] = useState<string>('v2.5.0-hotfix1');
  const [defectResolutionState, setDefectResolutionState] = useState<'investigating' | 'fixing' | 'resolved'>('resolved');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavingFix, setIsSavingFix] = useState<boolean>(false);
  const [fixError, setFixError] = useState<string>('');

  // DYNAMIC COMPUTATION: Convert all feedback into cart items & compute chart metrics in real time
  const metrics = useMemo(() => {
    return computeChartMetricsFromFeedback(feedbackList, currentBrandName);
  }, [feedbackList, currentBrandName]);

  // Filtered Cart Orders
  const filteredOrders = useMemo(() => {
    return metrics.recentOrders.filter(ord => {
      // Status filter
      if (orderStatusFilter === 'errors') {
        if (ord.defectStatus === 'resolved') return false;
      } else if (orderStatusFilter === 'fixed') {
        if (ord.defectStatus !== 'resolved') return false;
      }

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        ord.customer.toLowerCase().includes(q) ||
        ord.product.toLowerCase().includes(q) ||
        ord.orderId.toLowerCase().includes(q) ||
        ord.appVersion.toLowerCase().includes(q) ||
        ord.osVersion.toLowerCase().includes(q) ||
        ord.reportedError.toLowerCase().includes(q)
      );
    });
  }, [metrics.recentOrders, orderStatusFilter, searchQuery]);

  // Handle "Fix Their Error" opening
  const handleOpenFixModal = (ord: CartOrderRecord) => {
    setFixError('');
    setFixingOrder(ord);
    setPatchNote(ord.defectResolutionNote || '');
    setTargetFixVersion(ord.defectFixedInVersion || 'v2.5.0-hotfix1');
    setDefectResolutionState(ord.defectStatus === 'resolved' ? 'resolved' : 'resolved');
  };

  // Submit fix for the user's error directly to Firestore
  const handleSaveFix = async () => {
    if (!fixingOrder) return;
    if (fixingOrder.defectStatus === 'resolved' && user?.role !== 'company_admin') {
      setFixError('This defect is already resolved and locked against non-admin updates.');
      return;
    }

    setIsSavingFix(true);
    setFixError('');
    try {
      await updateFeedbackDefectInFirestore({
        feedbackId: fixingOrder.feedbackItem.id,
        defectStatus: defectResolutionState,
        defectResolutionNote: patchNote.trim(),
        defectFixedInVersion: targetFixVersion.trim(),
      });

      const updatedFeedbackItem: FeedbackItem = {
        ...fixingOrder.feedbackItem,
        defectStatus: defectResolutionState,
        defectFixedInVersion: targetFixVersion.trim(),
        defectResolutionNote: patchNote.trim(),
        status: defectResolutionState === 'resolved' ? 'Defect Resolved in ' + targetFixVersion : 'Error Investigating',
      };

      onFeedbackUpdated?.(updatedFeedbackItem);
      setToastMessage(`✓ Error resolved for ${fixingOrder.customer} (${fixingOrder.product}) in ${targetFixVersion}!`);
      setTimeout(() => setToastMessage(null), 3500);
      setFixingOrder(null);
    } catch (err) {
      setFixError(formatFirestoreErrorMessage(err, 'Unable to save defect fix to Firestore.'));
    } finally {
      setIsSavingFix(false);
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] text-slate-900 rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-4 sm:p-6 space-y-5">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3 bg-slate-900 text-white rounded-2xl border border-emerald-500/40 shadow-lg flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ====================================================================
          DASHBOARD HEADER: MATCHING images.jpeg EXACTLY
          "Dashboard - Last 30 days" | Search | Dark toggle | Profile JD
          PLUS: 1-Click "⚡ + Simulate New Feedback" to test automatic cart/chart conversion!
          ==================================================================== */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-100">
        
        {/* Left: Title & Timeframe Selector */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Dashboard
          </h3>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
            <span>Last 30 days</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            {currentBrandName} Analytics
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Feedback → Cart Sync Active
          </span>
        </div>

        {/* Right: Search & Real Profile Initial */}
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter orders & versions..."
              className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-36 lg:w-44"
            />
          </div>

          <div className="flex items-center gap-1 pl-1">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-purple-200 shadow-2xs" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#f0edff] text-[#5542f6] font-black text-xs flex items-center justify-center border border-purple-200 shadow-2xs">
                {(user?.name || 'C').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ====================================================================
          ROW 1: 4 WHITE KPI METRIC CARDS MATCHING images.jpeg
          (Dynamically updated from feedback list: Total Revenue, New Users, Orders, Conversion)
          ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 1. Total Revenue Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between hover:shadow-xs transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">Total Revenue</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.totalRevenue}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{metrics.revenueGrowth}</span>
              <span className="text-[10px] text-slate-400 font-normal hidden xl:inline">vs last month</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#f0edff] text-[#5542f6] font-black text-base flex items-center justify-center shrink-0 shadow-2xs">
            $
          </div>
        </div>

        {/* 2. New Users Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between hover:shadow-xs transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">New Users</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.newUsers}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{metrics.userGrowth}</span>
              <span className="text-[10px] text-slate-400 font-normal hidden xl:inline">active reviewers</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#e6fbf2] text-[#10b981] flex items-center justify-center shrink-0 shadow-2xs">
            <Users className="w-5 h-5 text-[#10b981]" />
          </div>
        </div>

        {/* 3. Orders Card (Dynamically converted from feedback cart items) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between hover:shadow-xs transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">Orders</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.orders}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{metrics.ordersGrowth}</span>
              <span className="text-[10px] text-slate-400 font-normal hidden xl:inline">cart orders</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#fff7ec] text-[#f59e0b] flex items-center justify-center shrink-0 shadow-2xs">
            <ShoppingBag className="w-5 h-5 text-[#f59e0b]" />
          </div>
        </div>

        {/* 4. Conversion Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between hover:shadow-xs transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">Conversion</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.conversion}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{metrics.conversionGrowth}</span>
              <span className="text-[10px] text-slate-400 font-normal hidden xl:inline">video to cart</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#fdf2f4] text-[#ec4899] font-black text-base flex items-center justify-center shrink-0 shadow-2xs">
            %
          </div>
        </div>

      </div>

      {/* ====================================================================
          ROW 2: CHARTS ROW 1
          - Left (8 cols): Weekly Revenue Rounded Purple Bar Chart (Mon–Sun, dynamically driven)
          - Right (4 cols): Devices Donut Chart (Mobile, Desktop, Tablet, dynamically calculated)
          ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Weekly Revenue Bar Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                Weekly Revenue
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                Customer video reviews & mobile order volume ({metrics.recentOrders.length} converted cart orders)
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              {metrics.orders} converted {Number(metrics.orders) === 1 ? 'order' : 'orders'}
            </span>
          </div>

          {/* High-Fidelity SVG Bar Chart */}
          <div className="w-full overflow-x-auto">
            <svg className="w-full h-48 sm:h-56" viewBox="0 0 600 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="companyBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6754f9" />
                  <stop offset="100%" stopColor="#5542f6" />
                </linearGradient>
                <linearGradient id="activeCompanyBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5542f6" />
                  <stop offset="100%" stopColor="#4532ea" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {[
                { label: '6,000', y: 20 },
                { label: '5,000', y: 50 },
                { label: '4,000', y: 80 },
                { label: '3,000', y: 110 },
                { label: '2,000', y: 140 },
                { label: '1,000', y: 170 },
                { label: '0', y: 200 },
              ].map((grid, idx) => (
                <g key={idx}>
                  <text x="40" y={grid.y + 4} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                    {grid.label}
                  </text>
                  <line x1="50" y1={grid.y} x2="580" y2={grid.y} stroke="rgba(226, 232, 240, 0.6)" strokeWidth="1" strokeDasharray="2 2" />
                </g>
              ))}

              {/* 7 Vertical Rounded Purple Bars dynamically calculated */}
              {metrics.weeklyBars.map((bar, idx) => (
                <g key={idx} className="cursor-pointer group">
                  <title>{`${bar.day}: ${bar.val} (${bar.count} feedback orders)`}</title>
                  <rect
                    x={bar.x}
                    y={bar.y}
                    width="34"
                    height={bar.height}
                    rx="8"
                    fill="url(#companyBarGrad)"
                    className="transition-all duration-300 group-hover:fill-[url(#activeCompanyBarGrad)] opacity-95 group-hover:opacity-100"
                  />
                  <text x={bar.x + 17} y="215" textAnchor="middle" className="text-[10px] font-semibold fill-slate-500">
                    {bar.day}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Devices Donut Chart */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
              Devices
            </h4>
            <button type="button" className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* SVG Donut Ring dynamically calculated from feedback devices */}
          <div className="flex items-center justify-center my-2">
            <svg className="w-40 h-40" viewBox="0 0 200 200">
              {/* Segment 1: Mobile (Cyan/Light Blue) */}
              <circle
                cx="100"
                cy="100"
                r="68"
                fill="none"
                stroke="#00c9e6"
                strokeWidth="24"
                strokeDasharray={metrics.devices.mobileDash}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
              {/* Segment 2: Desktop / Pro (Royal Purple) */}
              <circle
                cx="100"
                cy="100"
                r="68"
                fill="none"
                stroke="#5542f6"
                strokeWidth="24"
                strokeDasharray={metrics.devices.desktopDash}
                strokeDashoffset="-112"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
              {/* Segment 3: Tablet / Foldables (Orange/Yellow) */}
              <circle
                cx="100"
                cy="100"
                r="68"
                fill="none"
                stroke="#ffb020"
                strokeWidth="24"
                strokeDasharray={metrics.devices.tabletDash}
                strokeDashoffset="-352"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
          </div>

          {/* Donut Legend with colored dots & real percentages */}
          <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00c9e6]" />
              <span>Mobile ({metrics.devices.mobilePct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5542f6]" />
              <span>Desktop ({metrics.devices.desktopPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffb020]" />
              <span>Tablet ({metrics.devices.tabletPct}%)</span>
            </div>
          </div>
        </div>

      </div>

      {/* ====================================================================
          ROW 3: CHARTS ROW 2
          - Left (8 cols): Recharts 30-Day Feedback Volume Line Chart
          - Right (4 cols): Active Reviewers Card with Quota & Defect Metrics
          ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Recharts 30-Day Feedback Volume Line Chart */}
        {(() => {
          const total30d = metrics.dailyVolume30d.reduce((sum, pt) => sum + pt.count, 0);
          const peakDayCount = Math.max(0, ...metrics.dailyVolume30d.map((pt) => pt.count));
          const dailyAvg = (total30d / 30).toFixed(1);

          return (
            <div className="lg:col-span-8 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                    Feedback Volume Trend (Last 30 Days)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Daily customer video submissions synced live from Cloud Firestore
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">30d Total</span>
                    <strong className="text-slate-900 font-black">{total30d}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Peak Day</span>
                    <strong className="text-indigo-600 font-black">{peakDayCount}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Daily Avg</span>
                    <strong className="text-slate-700 font-bold">{dailyAvg}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs font-medium pt-0.5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5542f6]" />
                    <span>Total Feedback</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Resolved Defects</span>
                  </div>
                </div>
                {total30d === 0 && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Awaiting customer submissions in the last 30 days
                  </span>
                )}
              </div>

              <div className="w-full h-56 sm:h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={metrics.dailyVolume30d}
                    margin={{ top: 10, right: 14, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      interval={4}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, (dataMax: number) => Math.max(4, dataMax + 1)]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                      labelStyle={{ fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Feedback Volume"
                      stroke="#5542f6"
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: '#5542f6', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#5542f6', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      name="Resolved Defects"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* Active Users Card */}
        {(() => {
          const totalOrdersCount = metrics.recentOrders.length;
          const resolvedCount = metrics.recentOrders.filter(o => o.defectStatus === 'resolved').length;
          const openDefectsCount = totalOrdersCount - resolvedCount;
          const quotaTotal = activePlan?.reviewQuota && activePlan.reviewQuota < 99999 ? activePlan.reviewQuota : 0;
          const quotaPct = quotaTotal > 0 ? Math.min(100, Math.round((totalOrdersCount / quotaTotal) * 100)) : 0;
          const avgSecs = feedbackList.length > 0
            ? Math.round(feedbackList.reduce((acc, f) => acc + (Number(f.seconds) || 0), 0) / feedbackList.length)
            : 0;
          const avgMinStr = `${Math.floor(avgSecs / 60)}m ${avgSecs % 60}s`;

          return (
            <div className="lg:col-span-4 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-medium text-slate-500 block">Active reviewers</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">
                    {metrics.activeUsers}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#e6fbf2] text-[#10b981] font-bold text-xs">
                    {metrics.activeUsersGrowth}
                  </span>
                </div>
              </div>

              {/* Quota Usage Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Plan Quota Usage</span>
                  <span className="text-[#5542f6]">{quotaPct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#5542f6] rounded-full transition-all" style={{ width: `${quotaPct}%` }} />
                </div>
              </div>

              {/* Real Breakdown Statistics */}
              <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Resolved Defects</span>
                  <strong className="text-slate-800 font-bold block mt-0.5">
                    {resolvedCount}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Open Defects</span>
                  <strong className="text-slate-800 font-bold block mt-0.5">
                    {openDefectsCount}
                  </strong>
                </div>
                <div className="col-span-2 pt-1 flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Avg Video Duration</span>
                  <strong className="text-slate-700 font-bold">{avgMinStr}</strong>
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* ====================================================================
          ROW 4: ALL FEEDBACK CONVERTED INTO CART ORDERS WITH USER VERSION & FIX THEIR ERROR
          "Now convert the feedback data into cart all of this"
          "and also show version which get come from users fix their error and complicated the task"
          ==================================================================== */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
        
        {/* Table Header & Filters */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                All Feedback Converted Into Cart Orders ({filteredOrders.length})
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Auto-Synced with Reviews
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Each user feedback is converted into an audited cart order with their client OS version and reported defects.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setOrderStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                orderStatusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Cart Orders ({metrics.recentOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setOrderStatusFilter('errors')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                orderStatusFilter === 'errors'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>Needs Fix ({metrics.recentOrders.filter(o => o.defectStatus !== 'resolved').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderStatusFilter('fixed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                orderStatusFilter === 'fixed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Fixed Errors ({metrics.recentOrders.filter(o => o.defectStatus === 'resolved').length})</span>
            </button>
          </div>
        </div>

        {/* Dynamic Orders Table with User Version & "Fix Their Error" Button */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-2.5">Customer & Cart ID</th>
                <th className="pb-2.5">Phone Product</th>
                <th className="pb-2.5">User OS & App Version</th>
                <th className="pb-2.5">Reported Error / Defect</th>
                <th className="pb-2.5">Amount</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Fix Error & Cart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customer cart orders recorded yet. Verified customer reviews automatically populate here.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* 1. Customer & Cart Order ID */}
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={ord.avatar}
                          alt={ord.customer}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1">
                            <span>{ord.customer}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({ord.city})</span>
                          </div>
                          <div className="text-[10px] text-indigo-600 font-mono font-semibold">
                            {ord.orderId} · {ord.date}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Product Name */}
                    <td className="py-2.5 font-bold text-slate-800">
                      <div className="max-w-[150px] truncate" title={ord.product}>
                        {ord.product}
                      </div>
                    </td>

                    {/* 3. User Version: OS Version & App Version that came from users */}
                    <td className="py-2.5">
                      <div className="space-y-0.5">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[10px] font-bold">
                          <Cpu className="w-2.5 h-2.5" />
                          <span>{ord.osVersion}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono block pl-0.5">
                          App {ord.appVersion}
                        </div>
                      </div>
                    </td>

                    {/* 4. Reported Error / Defect */}
                    <td className="py-2.5 max-w-[200px]">
                      <div className="text-[11px] text-slate-700 line-clamp-1" title={ord.reportedError}>
                        {ord.reportedError}
                      </div>
                      {ord.defectFixedInVersion && (
                        <div className="text-[9px] font-mono text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                          <Check className="w-2.5 h-2.5" /> Patched in {ord.defectFixedInVersion}
                        </div>
                      )}
                    </td>

                    {/* 5. Amount */}
                    <td className="py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {ord.amount}
                    </td>

                    {/* 6. Status Badge */}
                    <td className="py-2.5 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${ord.statusColor}`}>
                        {ord.status}
                      </span>
                    </td>

                    {/* 7. Action: "Fix Their Error" + Open Cart */}
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* FIX THEIR ERROR BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleOpenFixModal(ord)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                            ord.defectStatus === 'resolved'
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black border border-amber-600'
                          }`}
                          title={`Fix reported error from ${ord.customer} on ${ord.osVersion}`}
                        >
                          <Wrench className="w-3 h-3" />
                          <span>{ord.defectStatus === 'resolved' ? 'Fixed ✓' : 'Fix Error'}</span>
                        </button>

                        {/* Open Cart Details */}
                        {onOpenCartModal && (
                          <button
                            type="button"
                            onClick={() => onOpenCartModal(ord.feedbackItem)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all border border-slate-200 cursor-pointer"
                            title="Inspect Buyer Cart Invoice Proof"
                          >
                            <ShoppingBag className="w-3 h-3 text-slate-600" />
                          </button>
                        )}

                        {/* Watch User Video */}
                        {onOpenVideoModal && (
                          <button
                            type="button"
                            onClick={() => onOpenVideoModal(ord.feedbackItem)}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 cursor-pointer"
                            title="Watch User Video Audition"
                          >
                            <Play className="w-3 h-3 text-rose-500 fill-rose-500" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================================
          "FIX THEIR ERROR" INTERACTIVE MODAL
          Allows company engineers to review the user's reported bug, see their OS version,
          write a patch note, choose target release version, and mark as resolved!
          ==================================================================== */}
      {fixingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
            
            <button
              type="button"
              onClick={() => setFixingOrder(null)}
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
                  Fix Customer Error & Defect
                </h3>
                <p className="text-xs text-slate-500">
                  Engineering bug remediation for {fixingOrder.customer}'s device
                </p>
              </div>
            </div>

            {/* Error & Device Context Card */}
            <div className="my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-200/80">
                <span>Customer: <strong className="text-slate-900">{fixingOrder.customer}</strong> ({fixingOrder.city})</span>
                <span className="font-mono text-indigo-700 font-bold">{fixingOrder.orderId}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500">Hardware:</span>
                <span className="font-bold text-slate-900">{fixingOrder.product}</span>
              </div>

              {/* User OS & App Version */}
              <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">User Client OS Version:</span>
                  <span className="font-mono font-bold text-xs text-purple-950">{fixingOrder.osVersion}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">App Build:</span>
                  <span className="font-mono font-bold text-xs text-purple-950">{fixingOrder.appVersion}</span>
                </div>
              </div>

              {/* Reported User Bug */}
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
                <div className="flex items-center gap-1 font-bold text-rose-800 text-[11px] mb-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Reported Defect:</span>
                </div>
                <p className="text-xs leading-relaxed italic">
                  "{fixingOrder.reportedError}"
                </p>
              </div>
            </div>

            {/* Fix Configuration Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveFix();
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
                      onClick={() => setDefectResolutionState(st.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        defectResolutionState === st.id
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
                  value={targetFixVersion}
                  onChange={(e) => setTargetFixVersion(e.target.value)}
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
                  value={patchNote}
                  onChange={(e) => setPatchNote(e.target.value)}
                  rows={2}
                  placeholder="Explain how this defect was patched in code..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {fixError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {fixError}
                </div>
              )}

              {fixingOrder.defectStatus === 'resolved' && user?.role !== 'company_admin' && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  ✓ This defect is already resolved and locked against non-admin updates.
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFixingOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFix || (fixingOrder.defectStatus === 'resolved' && user?.role !== 'company_admin')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSavingFix ? 'Saving...' : 'Save Fix & Update Cart Data'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
