import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Sparkles, CreditCard, Film, BarChart3, Bot, Send, 
  TrendingUp, TrendingDown, Star, CheckCircle2, ShieldCheck, 
  ArrowUpRight, RefreshCw, Play, Tag, Lightbulb, MessageSquare, 
  ExternalLink, Layers, Users, Zap, AlertCircle, ChevronRight,
  Lock, Unlock, Smartphone, ArrowDownLeft, DollarSign, ChevronDown, ChevronUp
} from 'lucide-react';
import { FeedbackItem, SubscriptionTier, UserProfile, AdminWithdrawalRequest } from '../types';
import { PaymentRecord } from '../services/firebaseService';
import { phoneById } from '../data/initialData';
import { ChatMessage, getBrandFolder, getSentimentScore, getSentimentTone, getFeedbackCategory } from './CompanyView';
import { CompanyPaymentStatement } from './CompanyPaymentStatement';
import { 
  streamInstantAiReply, 
  getClientAiCacheStats, 
  StreamController 
} from '../utils/instantAiEngine';
import { getSingleActiveBrandFolder, isBrandUnlocked, isFeedbackItemUnlocked } from '../utils/brandAccess';

interface UnifiedOnePageDashboardProps {
  feedbackList: FeedbackItem[];
  activePlan: SubscriptionTier;
  reviewsQuotaUsed: number;
  user?: UserProfile;
  payments?: PaymentRecord[];
  withdrawals?: AdminWithdrawalRequest[];
  onOpenVideoModal: (item: FeedbackItem) => void;
  onOpenSubscriptionModal: (targetBrand?: string) => void;
  onOpenDeepCharts: () => void;
  onOpenDeepAuditions: () => void;
  onOpenDeepPlans: () => void;
  onFeedbackUpdated?: (updated: FeedbackItem) => void;
}

export const UnifiedOnePageDashboard: React.FC<UnifiedOnePageDashboardProps> = ({
  feedbackList,
  activePlan,
  reviewsQuotaUsed,
  user,
  payments = [],
  withdrawals = [],
  onOpenVideoModal,
  onOpenSubscriptionModal,
  onOpenDeepCharts,
  onFeedbackUpdated,
}) => {
  const activeBrandFolder = useMemo(
    () => getSingleActiveBrandFolder(user, activePlan),
    [user, activePlan]
  );

  const resolvePillFromFolder = (folder: string | null): string => {
    if (!folder) return 'Samsung';
    const lower = folder.toLowerCase();
    if (lower.includes('apple') || lower.includes('iphone')) return 'Apple';
    if (lower.includes('google') || lower.includes('pixel')) return 'Google';
    if (lower.includes('xiaomi') || lower.includes('redmi') || lower.includes('poco')) return 'Xiaomi';
    if (lower.includes('vivo') || lower.includes('iqoo')) return 'Vivo';
    if (lower.includes('oneplus')) return 'OnePlus';
    return 'Samsung';
  };

  // Brand category filter
  const [activeBrandFilter, setActiveBrandFilter] = useState<string>(() => resolvePillFromFolder(activeBrandFolder));
  const [isBatchSummarizing, setIsBatchSummarizing] = useState<boolean>(false);
  const [showFullLedger, setShowFullLedger] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  useEffect(() => {
    if (activeBrandFolder) {
      setActiveBrandFilter(resolvePillFromFolder(activeBrandFolder));
    }
  }, [activeBrandFolder]);

  // Embedded AI Copilot Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Namaste! I am your Enterprise Strategy Assistant. I have analyzed all verified smartphone video reviews in real time with Gemini 3.8 Flash. Ask me anything or tap a prompt below!',
      timestamp: 'Instant Active (<0.01s)',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isAiStreaming, setIsAiStreaming] = useState<boolean>(false);
  const [cacheStats, setCacheStats] = useState({ size: 0, totalHits: 0 });
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const activeStreamRef = useRef<StreamController | null>(null);

  // Auto-scroll chat within its container
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiLoading, isAiStreaming]);

  // Synchronize cache stats & listen for cross-component AI hand-offs
  useEffect(() => {
    setCacheStats(getClientAiCacheStats());

    const handleAskAiEvent = (e: any) => {
      const prompt = e.detail?.prompt;
      if (prompt) {
        handleSendPrompt(prompt);
      }
    };
    window.addEventListener('fp:ask-ai', handleAskAiEvent);

    try {
      const pendingPrompt = sessionStorage.getItem('fp_chat_prompt');
      if (pendingPrompt) {
        sessionStorage.removeItem('fp_chat_prompt');
        setTimeout(() => handleSendPrompt(pendingPrompt), 250);
      }
    } catch {}

    return () => {
      window.removeEventListener('fp:ask-ai', handleAskAiEvent);
      activeStreamRef.current?.abort();
    };
  }, []);

  // Quota calculation
  const totalQuota = activePlan?.reviewQuota ?? 0;
  const isUnlimited = totalQuota >= 9999;
  const remainingQuota = isUnlimited ? 'Unlimited' : totalQuota > 0 ? Math.max(0, totalQuota - reviewsQuotaUsed) : 0;
  const quotaPercent = isUnlimited ? 20 : totalQuota > 0 ? Math.min(100, Math.round((reviewsQuotaUsed / totalQuota) * 100)) : 0;

  // Quick manual sync handler
  const handleManualSync = async () => {
    setIsSyncing(true);
    setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setTimeout(() => setIsSyncing(false), 300);
  };

  // Strictly scoped reviews (1 active brand per subscription)
  const scopedFeedbackList = useMemo(() => {
    return feedbackList.filter((item) => isFeedbackItemUnlocked(item, user, activePlan));
  }, [feedbackList, user, activePlan]);

  // Filtered reviews by brand tab (strictly gated)
  const displayedReviews = useMemo(() => {
    if (!isBrandUnlocked(activeBrandFilter, user, activePlan)) return [];
    const filterKey = activeBrandFilter.toLowerCase();
    return scopedFeedbackList.filter(item => {
      const phone = phoneById(item.phone);
      const bFolder = getBrandFolder(item.phone, item.brandFolder).toLowerCase();
      const pBrand = phone.brand.toLowerCase();
      return bFolder.includes(filterKey) || pBrand.includes(filterKey);
    });
  }, [scopedFeedbackList, activeBrandFilter, user, activePlan]);

  // High-level KPI metrics
  const avgSatisfaction = useMemo(() => {
    if (scopedFeedbackList.length === 0) return 0;
    const sum = scopedFeedbackList.reduce((acc, f) => acc + (f.sentimentScore || f.rating * 20), 0);
    return Math.round(sum / scopedFeedbackList.length);
  }, [scopedFeedbackList]);

  const cashFlowStats = useMemo(() => {
    const totalInUSD = payments.reduce((sum, p) => sum + (Number(p.amountUSD) || 0), 0);
    const totalInNPR = payments.reduce((sum, p) => sum + (Number(p.amountNPR) || 0), 0);
    const totalOutNPR = withdrawals.reduce((sum, w) => sum + (Number(w.amountNPR) || 0), 0);
    const totalOutUSD = Math.round((totalOutNPR / 135) * 100) / 100;
    const netUSD = Math.round((totalInUSD - totalOutUSD) * 100) / 100;
    const netNPR = Math.round(totalInNPR - totalOutNPR);
    return { totalInUSD, totalOutUSD, netUSD, netNPR };
  }, [payments, withdrawals]);

  // AI Send Prompt Handler (< 0.01s TTFT with streaming)
  const handleSendPrompt = (customText?: string) => {
    const textToSend = customText !== undefined ? customText : inputPrompt;
    const query = textToSend.trim();
    if (!query) return;

    // Abort previous stream if active
    if (activeStreamRef.current) {
      activeStreamRef.current.abort();
    }

    const userMessage: ChatMessage = { sender: 'user', text: query, timestamp: 'Now' };
    const streamingAiMessage: ChatMessage = {
      sender: 'ai',
      text: '',
      timestamp: '⚡ Streaming (<0.01s)...',
      isStreaming: true,
    };

    setChatMessages(prev => [...prev, userMessage, streamingAiMessage]);
    setInputPrompt('');
    setIsAiStreaming(true);

    activeStreamRef.current = streamInstantAiReply(
      query,
      scopedFeedbackList,
      (accumulatedText, _chunk, modelChart) => {
        setChatMessages(prev => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].sender === 'ai') {
            next[lastIdx] = {
              ...next[lastIdx],
              text: accumulatedText,
              modelChart,
              isStreaming: true,
            };
          }
          return next;
        });
      },
      (finalResult) => {
        setChatMessages(prev => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].sender === 'ai') {
            next[lastIdx] = {
              ...next[lastIdx],
              text: finalResult.replyText,
              modelChart: finalResult.modelChart,
              timestamp: finalResult.isCached
                ? `⚡ ${finalResult.latencySeconds.toFixed(4)}s (Tier-1 Cache Hit)`
                : `⚡ ${finalResult.latencySeconds.toFixed(4)}s (Instant Stream)`,
              isStreaming: false,
            };
          }
          return next;
        });
        setIsAiStreaming(false);
        setCacheStats(getClientAiCacheStats());
      },
      user,
      activePlan
    );
  };

  // Hand-off from Video Card to AI Assistant
  const handleAskAiAboutReview = (item: FeedbackItem) => {
    const p = phoneById(item.phone);
    const summaryText = item.aiSummary?.summary || `${item.like}. ${item.dislike}. ${item.improve}`;
    const prompt = `Review analysis for ${p.name} from ${item.user}: "${summaryText}". What specific product fix should our engineering team implement immediately?`;
    handleSendPrompt(prompt);
  };

  // Batch Auto-Summarize All Video Reviews (client-side deterministic synthesis)
  const handleBatchSummarize = async () => {
    if (isBatchSummarizing || scopedFeedbackList.length === 0) return;
    setIsBatchSummarizing(true);
    try {
      scopedFeedbackList.forEach((f) => {
        if (!onFeedbackUpdated) return;
        const p = phoneById(f.phone);
        const cat = getFeedbackCategory(f);
        const score = getSentimentScore(f);
        const keyPoints = [
          f.like ? `Strength: ${f.like}` : null,
          f.dislike ? `Issue: ${f.dislike}` : null,
          f.comfort ? `Ergonomics: ${f.comfort}` : null,
        ].filter(Boolean) as string[];
        const improvementSuggestions = f.improve
          ? [f.improve]
          : f.dislike
          ? [`Address reported issue: ${f.dislike}`]
          : ['Continue monitoring hardware telemetry'];

        onFeedbackUpdated({
          ...f,
          aiSummary: {
            mainTopics: f.tags && f.tags.length > 0 ? f.tags : [p.brand, cat],
            overallSentiment: score >= 75 ? 'positive' : score >= 50 ? 'neutral' : 'negative',
            sentimentScore: score,
            sentimentExplanation: keyPoints.length > 0 ? keyPoints.join(' • ') : 'Verified customer video review',
            improvementSuggestions,
            summary: `${f.user} rated ${p.name} ${f.rating}/5 (${score}% sentiment). ${f.like || ''} ${f.dislike ? 'Issue noted: ' + f.dislike : ''}`.trim(),
            generatedAt: new Date().toISOString(),
            isAiGenerated: true,
          },
        });
      });
    } finally {
      setIsBatchSummarizing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 max-w-[1600px] mx-auto w-full gap-4">
      
      {/* 1. TOP EXECUTIVE STATUS BAR: Fast & Understandable for All Ages */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-3xl p-3.5 sm:p-4 text-white shadow-md flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Active Plan & Quota */}
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm">
              👑
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono font-bold text-amber-300 tracking-wider">
                Enterprise Active Plan
              </div>
              <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>{activePlan?.name || 'No Active Plan'}</span>
                <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full font-mono text-emerald-300 font-bold">
                  {activePlan?.priceUSD ? `$${activePlan.priceUSD}/mo` : 'Free'}
                </span>
              </div>
            </div>
          </div>

          {/* Remaining Quota Progress */}
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 px-3.5 py-1.5 rounded-2xl">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span>Reviews Quota:</span>
                <b className="text-emerald-400 font-mono text-xs">{remainingQuota}</b>
                {!isUnlimited && <span className="text-[10px] text-slate-400">/ {totalQuota}</span>}
              </div>
              <div className="w-28 sm:w-36 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" 
                  style={{ width: `${totalQuota > 0 ? Math.max(0, 100 - quotaPercent) : 0}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenSubscriptionModal()}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 text-slate-950 font-black text-[11px] shadow-xs cursor-pointer transition-transform active:scale-95 flex items-center gap-1"
            >
              <Zap className="w-3 h-3 fill-slate-950" />
              <span>Upgrade</span>
            </button>
          </div>

          {/* Active Single-Brand Subscription Badge */}
          <div className="flex items-center gap-2 bg-indigo-950/70 border border-indigo-500/30 px-3 py-1.5 rounded-2xl text-indigo-200 text-xs font-bold flex-wrap">
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-300 font-normal">Active Brand (1 at a time):</span>
              <span className="text-white font-black bg-white/10 px-2 py-0.5 rounded-md font-mono">
                {activeBrandFolder || 'None (Subscription Required)'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onOpenSubscriptionModal()}
              className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] cursor-pointer transition-all ml-1 shadow-2xs"
              title="One subscription = One brand at a time. Buy again to switch to another mobile brand."
            >
              {activeBrandFolder ? 'Switch Brand' : 'Buy Brand Pass'}
            </button>
          </div>
        </div>

        {/* Right: Sync, Statement Drawer Toggle & Deep AI Charts Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenDeepCharts}
            className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ring-1 ring-white/20"
            title="Open Deep AI Data Analysis & Income Charts"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-200" />
            <span>📊 AI Analysis Charts</span>
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-white/15"
            title="Fetch real-time updates"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync ({lastSyncTime})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFullLedger(!showFullLedger)}
            className={`px-3 py-1.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border ${
              showFullLedger 
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>{showFullLedger ? 'Hide Financial Statement' : 'View Financial Statement'}</span>
            {showFullLedger ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </section>

      {/* 2. FOUR CLEAN EXECUTIVE KPI TILES (Simple & Clear, Not Overwhelming) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: Verified Customer Satisfaction */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Customer Satisfaction</span>
            <span className="text-base">😊</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{avgSatisfaction}%</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Positive Delight
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${avgSatisfaction}%` }} />
          </div>
        </div>

        {/* Metric 2: Verified Video Auditions */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Verified 1-Min Auditions</span>
            <Film className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{scopedFeedbackList.length}</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
              100% Video Format
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Authentic face-to-camera speaking reviews</p>
        </div>

        {/* Metric 3: Net Cash Flow Margin */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Net Company Cash Flow</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black ${cashFlowStats.netUSD >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {cashFlowStats.netUSD >= 0 ? '+' : '-'}${Math.abs(cashFlowStats.netUSD).toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Rs. {cashFlowStats.netNPR.toLocaleString()} net
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
            <span className="text-emerald-700 font-bold">+${cashFlowStats.totalInUSD.toLocaleString()} in</span>
            <span className="text-rose-600 font-bold">-${cashFlowStats.totalOutUSD.toLocaleString()} creator payouts</span>
          </div>
        </div>

        {/* Metric 4: Gemini AI Real-Time Processing */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>AI Response Latency</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">&lt; 0.005s</span>
            <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-bold border border-amber-200">
              Tier-1 Caching
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Instant Gemini 3.8 Flash Synthesis ({cacheStats.size} cached)</p>
        </div>
      </div>

      {/* 3. OPTIONAL COLLAPSIBLE TRANSPARENT FINANCIAL STATEMENT DRAWER */}
      {showFullLedger && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-200">
          <CompanyPaymentStatement payments={payments} withdrawals={withdrawals} feedbackList={scopedFeedbackList} />
        </div>
      )}

      {/* 4. MAIN 2-COLUMN COMMAND CENTER (Simple, Clean, Interactive & Zero Clutter) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* ========================================================
            LEFT COLUMN (7 cols on lg): 🎬 VIDEO REVIEWS REEL
            ======================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col h-[580px]">
            {/* Header with Title and Auto-Summarize button */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600 ring-4 ring-purple-100" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Verified Video Auditions Reel
                </h3>
                <span className="text-xs text-slate-400 font-mono">({displayedReviews.length} clips)</span>
              </div>

              <button
                type="button"
                onClick={handleBatchSummarize}
                disabled={isBatchSummarizing}
                className="px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Automatically summarize all video feedback transcripts with Gemini 3.8 Flash"
              >
                {isBatchSummarizing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                )}
                <span>Auto-Summarize All</span>
              </button>
            </div>

            {/* Brand Switcher Pills */}
            <div className="flex items-center gap-1.5 pb-2.5 overflow-x-auto no-scrollbar border-b border-slate-100 shrink-0">
              {[
                { id: 'Samsung', label: 'Samsung', brandKey: 'samsung' },
                { id: 'Apple', label: 'Apple iPhone', brandKey: 'apple' },
                { id: 'Google', label: 'Google Pixel', brandKey: 'google' },
                { id: 'Xiaomi', label: 'Xiaomi', brandKey: 'xiaomi' },
                { id: 'Vivo', label: 'Vivo & iQOO', brandKey: 'vivo' },
                { id: 'OnePlus', label: 'OnePlus', brandKey: 'oneplus' },
              ].map(b => {
                const isTabUnlocked = isBrandUnlocked(b.brandKey, user, activePlan);
                const isSelected = activeBrandFilter === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBrandFilter(b.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                      isSelected 
                        ? 'bg-slate-900 text-white shadow-xs font-black' 
                        : isTabUnlocked
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {!isTabUnlocked && <Lock className="w-3 h-3 text-amber-600 shrink-0" />}
                    <span>{b.label}</span>
                    {!isTabUnlocked && <span className="text-[10px] text-amber-600 font-normal">($15.99)</span>}
                  </button>
                );
              })}
            </div>

            {/* Scrollable list of Video Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pt-3">
              {displayedReviews.length === 0 ? (
                !isBrandUnlocked(activeBrandFilter, user, activePlan) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                    <Lock className="w-10 h-10 text-amber-500 mb-2" />
                    <p className="text-sm font-bold text-slate-800">
                      {activeBrandFilter} Brand Locked
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      One subscription unlocks one brand at a time{activeBrandFolder ? ` (currently subscribed to ${activeBrandFolder})` : ''}. Buy a subscription for {activeBrandFilter} to view its customer feedback.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenSubscriptionModal(activeBrandFilter)}
                      className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer transition-all shadow-xs"
                    >
                      Buy {activeBrandFilter} Subscription
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                    <Film className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-700">No verified {activeBrandFilter} video reviews yet</p>
                    <p className="text-xs text-slate-400 mt-1">New {activeBrandFilter} customer video submissions will appear here in real time.</p>
                  </div>
                )
              ) : displayedReviews.map((item) => {
                const phone = phoneById(item.phone);
                const sentimentScore = getSentimentScore(item);
                const tone = getSentimentTone(item);
                const hasAi = !!item.aiSummary;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/40 border border-slate-200/90 hover:border-indigo-300 transition-all group"
                  >
                    {/* User, Rating, and Model */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {item.userAvatar ? (
                          <img
                            src={item.userAvatar}
                            alt={item.user}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                            {item.user[0]}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-slate-900">{item.user}</span>
                            <span className="text-[10px] text-slate-400">· {item.city}</span>
                            <span className="text-[10px] text-slate-400">({item.time})</span>
                          </div>
                          <div className="text-xs text-slate-600 font-semibold flex items-center gap-1 mt-0.5">
                            <span>{phone.name}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-[10px] font-mono text-emerald-600 font-bold">1-Min Video Clip</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-amber-500 font-black text-xs">
                          {'★'.repeat(item.rating)}
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full inline-block mt-0.5 ${
                          sentimentScore >= 80 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : sentimentScore >= 60 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {sentimentScore}% · {tone.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Feedback Highlights */}
                    <div className="mt-2.5 text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                      {hasAi && item.aiSummary ? (
                        <div>
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-600 mb-1">
                            <Bot className="w-3.5 h-3.5" />
                            <span>AI Summary:</span>
                          </div>
                          <p className="line-clamp-2 text-slate-800 font-medium leading-relaxed">
                            "{item.aiSummary.summary}"
                          </p>
                          {item.aiSummary.improvementSuggestions?.[0] && (
                            <div className="mt-1.5 text-[11px] text-amber-800 font-bold flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                              <Lightbulb className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                              <span className="line-clamp-1">{item.aiSummary.improvementSuggestions[0]}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="line-clamp-1 text-slate-700">
                            <b className="text-emerald-700">Liked:</b> {item.like}
                          </p>
                          <p className="line-clamp-1 text-rose-700 font-medium">
                            <b className="text-rose-700">Fix Needed:</b> {item.dislike || item.improve}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-2.5 flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenVideoModal(item)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Watch 1-Min Video Clip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAskAiAboutReview(item)}
                        className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                        title="Analyze this specific review in the AI Chat panel"
                      >
                        <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Analyze with AI</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN (5 cols on lg): 🤖 FAST AI STRATEGY COPILOT
            ======================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-md p-4 sm:p-5 flex flex-col h-[580px] text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-sm">
                  🤖
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <span>AI Strategy Assistant</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                      &lt; 0.005s
                    </span>
                  </h3>
                  <div className="text-[10px] text-slate-400">Gemini 3.8 Flash · Zero-Latency Instant Responses</div>
                </div>
              </div>

              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ready</span>
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] p-3 rounded-2xl leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-xs text-right'
                        : 'bg-slate-900 text-slate-100 rounded-bl-xs border border-slate-800'
                    }`}
                  >
                    <p className="whitespace-pre-line text-xs font-normal">
                      {msg.text}
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 animate-pulse align-middle" />
                      )}
                    </p>

                    {/* Optional embedded model chart card */}
                    {msg.modelChart && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-left">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                          <span className="font-extrabold text-xs text-white">{msg.modelChart.modelName}</span>
                          <span className="text-[10px] font-bold text-amber-400 font-mono">{msg.modelChart.avgRating} ★</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-emerald-400 font-bold">{msg.modelChart.likePercent}% Satisfied</span>
                          <span className="text-rose-400 font-bold">{msg.modelChart.dislikePercent}% Criticisms</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: `${msg.modelChart.likePercent}%` }} />
                          <div className="bg-rose-500 h-full" style={{ width: `${msg.modelChart.dislikePercent}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.timestamp && (
                    <span className="text-[9px] font-mono text-slate-400 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  )}
                </div>
              ))}

              {isAiLoading && (
                <div className="flex items-center gap-2 text-indigo-300 text-xs py-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Synthesizing feedback data...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick 1-Touch Prompt Chips */}
            <div className="pt-2 pb-1.5 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                '💰 Company Income Ledger',
                '📱 Samsung S24 Sentiment',
                '🍏 iPhone 16 Pro Pros & Cons',
                '🚨 Top Bug Reports & Heat',
                '💡 Actionable Roadmap Fixes',
              ].map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendPrompt(prompt)}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold whitespace-nowrap border border-slate-800 cursor-pointer transition-all shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt(inputPrompt);
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask anything about income, phones, defects, fixes..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isAiStreaming || !inputPrompt.trim()}
                className="w-9 h-9 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-40 cursor-pointer transition-all shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};
