import React, { useState, useMemo } from 'react';
import { 
  Film, Play, Search, Filter, ShieldCheck, CheckCircle2, 
  ExternalLink, MessageSquare, ShoppingBag, Star, Sparkles, 
  ChevronRight, Unlock, Smartphone, ArrowUpDown, Download,
  Check, Gift, Bot, Lightbulb, Loader2, Tag, RefreshCw, Zap,
  TrendingUp, TrendingDown, Minus, ArrowRight, X
} from 'lucide-react';
import { FeedbackItem, SubscriptionTier, PhoneProduct, AiFeedbackSummary, UserProfile } from '../types';
import { PHONES, phoneById, rs } from '../data/initialData';
import { getSentimentScore, getFeedbackCategory, getBrandFolder } from './CompanyView';
import { isBrandUnlocked, getSingleActiveBrandFolder, normalizeBrandFolder, BRAND_FOLDER_DEFINITIONS } from '../utils/brandAccess';

interface ModelVideoLibraryTableProps {
  feedbackList: FeedbackItem[];
  activePlan: SubscriptionTier;
  user?: UserProfile;
  onOpenVideoModal: (item: FeedbackItem) => void;
  onOpenChatModal: (item: FeedbackItem) => void;
  onOpenCartModal: (item: FeedbackItem) => void;
  onOpenSubscriptionModal: (targetBrand?: string) => void;
  onFeedbackUpdated?: (updated: FeedbackItem) => void;
  onOpenChatGPTWithSummary?: (item: FeedbackItem, customPrompt?: string) => void;
}

export const ModelVideoLibraryTable: React.FC<ModelVideoLibraryTableProps> = ({
  feedbackList,
  activePlan,
  user,
  onOpenVideoModal,
  onOpenChatModal,
  onOpenCartModal,
  onOpenSubscriptionModal,
  onFeedbackUpdated,
  onOpenChatGPTWithSummary,
}) => {
  const [selectedBrandFolder, setSelectedBrandFolder] = useState<string>(() => {
    return getSingleActiveBrandFolder(user, activePlan) || 'Samsung Galaxy (S1 to S25)';
  });

  React.useEffect(() => {
    const activeSingle = getSingleActiveBrandFolder(user, activePlan);
    if (activeSingle) {
      setSelectedBrandFolder(activeSingle);
    }
  }, [user, activePlan]);

  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'video_only' | 'verified_cart'>('video_only');
  
  // AI Video Feedback Summarizer states
  const [selectedSummaryFeedback, setSelectedSummaryFeedback] = useState<FeedbackItem | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isBatchSummarizing, setIsBatchSummarizing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Generate or regenerate deterministic client-side AI Summary for a single video feedback item
  const handleGenerateSummary = async (item: FeedbackItem) => {
    try {
      setGeneratingId(item.id);
      const phone = phoneById(item.phone);
      const sentimentScore = getSentimentScore(item);
      const overallSentiment: 'positive' | 'neutral' | 'negative' =
        sentimentScore >= 75 ? 'positive' : sentimentScore >= 55 ? 'neutral' : 'negative';

      const topics: string[] = [];
      const combined = `${item.like || ''} ${item.dislike || ''} ${item.improve || ''} ${item.comfort || ''}`.toLowerCase();
      if (combined.includes('camera') || combined.includes('zoom') || combined.includes('4k')) topics.push('Camera & Video');
      if (combined.includes('battery') || combined.includes('drain') || combined.includes('charge')) topics.push('Battery Life');
      if (combined.includes('heat') || combined.includes('warm') || combined.includes('thermal')) topics.push('Thermal Control');
      if (combined.includes('display') || combined.includes('screen') || combined.includes('amoled')) topics.push('Display Quality');
      if (topics.length === 0 && item.tags && item.tags.length > 0) {
        topics.push(...item.tags.slice(0, 3));
      }
      if (topics.length === 0) topics.push(phone.brand || 'Hardware');

      const suggestions: string[] = [];
      if (item.improve?.trim()) suggestions.push(item.improve.trim());
      if (item.dislike?.trim() && item.dislike.trim() !== item.improve?.trim()) {
        suggestions.push(`Address reported issue: ${item.dislike.trim()}`);
      }
      if (suggestions.length === 0) {
        suggestions.push(`Maintain ${phone.name} quality standards verified by ${item.user}.`);
      }

      const data: AiFeedbackSummary = {
        summary: `${item.user} (${item.city}) rated ${phone.name} ${item.rating}/5. Highlighted: "${item.like || 'Solid experience'}".${item.dislike ? ` Flagged: "${item.dislike}".` : ''}`,
        mainTopics: topics,
        overallSentiment,
        sentimentScore,
        sentimentExplanation: `${sentimentScore}% satisfaction derived from ${item.rating}/5 rating and customer review notes.`,
        improvementSuggestions: suggestions,
        generatedAt: new Date().toISOString(),
      };

      const updatedItem: FeedbackItem = {
        ...item,
        aiSummary: data,
      };

      onFeedbackUpdated?.(updatedItem);

      if (selectedSummaryFeedback?.id === item.id) {
        setSelectedSummaryFeedback(updatedItem);
      }
    } finally {
      setGeneratingId(null);
    }
  };

  // Auto-Summarize All Unsummarized Videos in this view
  const handleBatchSummarize = async () => {
    const unsummarized = filteredRows.filter((item) => !item.aiSummary);
    const targetItems = unsummarized.length > 0 ? unsummarized : filteredRows;
    if (targetItems.length === 0) return;

    setIsBatchSummarizing(true);
    setBatchProgress({ current: 0, total: targetItems.length });

    for (let i = 0; i < targetItems.length; i++) {
      const item = targetItems[i];
      setBatchProgress({ current: i + 1, total: targetItems.length });
      await handleGenerateSummary(item);
      // brief pause to allow UI update
      await new Promise((r) => setTimeout(r, 150));
    }

    setIsBatchSummarizing(false);
    setBatchProgress(null);
  };

  // Filter feedback items strictly for the active subscribed brand
  const availableBrandItems = useMemo(() => {
    if (!isBrandUnlocked(selectedBrandFolder, user, activePlan)) return [];
    return feedbackList.filter((item) => {
      const folder = getBrandFolder(item.phone, item.brandFolder);
      return folder === selectedBrandFolder;
    });
  }, [feedbackList, selectedBrandFolder, user, activePlan]);

  // Models available under this brand
  const modelOptions = useMemo(() => {
    const phoneSet = new Set<string>();
    availableBrandItems.forEach((item) => {
      phoneSet.add(item.phone);
    });
    return Array.from(phoneSet).map((id) => phoneById(id));
  }, [availableBrandItems]);

  // Filtered rows for the manager table
  const filteredRows = useMemo(() => {
    return availableBrandItems.filter((item) => {
      // Model filter
      if (selectedModelFilter !== 'all' && item.phone !== selectedModelFilter) {
        return false;
      }
      // Verified cart
      if (filterType === 'verified_cart' && !item.cartData?.verifiedPurchase) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = phoneById(item.phone);
        const match = 
          item.user.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (item.like || '').toLowerCase().includes(q) ||
          (item.dislike || '').toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [availableBrandItems, selectedModelFilter, filterType, searchQuery]);

  // Statistics for this unlocked model set
  const totalAuditions = availableBrandItems.length;
  const filteredCount = filteredRows.length;
  const avgSentiment = filteredCount > 0
    ? Math.round(filteredRows.reduce((acc, curr) => acc + getSentimentScore(curr), 0) / filteredCount)
    : 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Unlocked Plan & Audition Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1">
                <Unlock className="w-3.5 h-3.5" />
                <span>Active Plan: {activePlan?.name || 'No Active Plan'}</span>
              </span>
              <span className="text-xs text-slate-300">
                • <b>{totalAuditions} Video Auditions Available</b>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Audition Video Feedback Manager</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Watch authentic 1-minute video reviews where real consumers talk about hardware, camera quality, battery life, and software quirks for each specific model.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenSubscriptionModal()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Change / Upgrade Plan</span>
            </button>
          </div>
        </div>

        {/* Brand Switcher Pills with Per-Brand Subscription Status */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-black uppercase text-indigo-300 shrink-0">Brand Library:</span>
          {[
            { id: 'Samsung Galaxy (S1 to S25)', name: 'Samsung Galaxy (S1–S25)', icon: '🌌' },
            { id: 'iPhone (Models 1 to 18)', name: 'Apple iPhone (1–18)', icon: '🍏' },
            { id: 'Xiaomi / Redmi / POCO', name: 'Xiaomi / Redmi / POCO', icon: '🟠' },
            { id: 'Google Pixel', name: 'Google Pixel (1–9)', icon: '🔍' },
            { id: 'OnePlus', name: 'OnePlus Series', icon: '⚡' },
            { id: 'Vivo & iQOO', name: 'Vivo & iQOO', icon: '📸' },
            { id: 'OPPO & Realme', name: 'OPPO & Realme', icon: '🟢' },
            { id: 'Nothing Phone', name: 'Nothing Phone', icon: '⚪' },
          ].map((b) => {
            const isUnlocked = isBrandUnlocked(b.id, user, activePlan);
            const isSelected = selectedBrandFolder === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedBrandFolder(b.id);
                  setSelectedModelFilter('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-md font-black'
                    : isUnlocked
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-amber-500/30'
                }`}
              >
                <span>{b.icon}</span>
                <span>{b.name}</span>
                {!isUnlocked && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold flex items-center gap-0.5">
                    🔒 $15.99
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Category Mobile Selection Buy & Benefits Box */}
        <div className="relative z-10 mt-4 pt-3.5 border-t border-white/10 bg-white/5 rounded-2xl p-3.5 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-200">
                Active Plan: <b className="text-white">{activePlan?.name || 'No Active Plan'}</b> ({activePlan?.priceUSD ? `$${activePlan.priceUSD}/mo` : 'Unsubscribed'})
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-amber-300 font-mono font-bold">
                Remaining Quota: {activePlan?.reviewQuota && activePlan.reviewQuota >= 99999 ? 'Unlimited' : `${Math.max(0, (activePlan?.reviewQuota ?? 0) - totalAuditions)} video reviews left`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onOpenSubscriptionModal(selectedBrandFolder)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Upgrade Plan for {selectedBrandFolder.split(' ')[0]}</span>
            </button>
          </div>

          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto text-[11px] text-slate-300">
            <span className="text-[10px] font-black uppercase text-amber-300 shrink-0 flex items-center gap-1">
              <Gift className="w-3 h-3" />
              <span>Single-Brand Plans:</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0 font-medium">
              Starter ($15.99): 1 Brand + 150 reviews/mo
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 font-bold">
              Pro ($25.99): 1 Brand + 500 reviews/mo + AI Insights
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 font-bold">
              Unlimited ($35.99): 1 Brand Unlimited + 1-on-1 Chat
            </span>
          </div>
        </div>
      </div>

      {/* Locked Brand Category Gate */}
      {!isBrandUnlocked(selectedBrandFolder, user, activePlan) ? (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-8 sm:p-12 text-center text-white shadow-2xl relative overflow-hidden animate-in fade-in">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mx-auto flex items-center justify-center text-3xl shadow-lg">
              🔒
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              One Time • One Brand Subscription
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {selectedBrandFolder} is Locked
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your active brand subscription:{' '}
              <span className="font-bold text-amber-300">
                {getSingleActiveBrandFolder(user, activePlan) || 'None (Subscription Required)'}
              </span>.
              <br />
              Under our <b>one time, one subscription</b> rule, each subscription unlocks strictly <b>one</b> mobile brand. To inspect <b>{selectedBrandFolder}</b> feedback, purchase a subscription for this brand.
            </p>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-md mx-auto text-left space-y-2">
              <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span>Subscription for {selectedBrandFolder.split(' ')[0]}:</span>
                <span className="text-amber-300 font-mono font-black">$15.99/mo</span>
              </div>
              <div className="text-[11px] text-slate-400">
                ✓ Unlocks all verified customer videos for {selectedBrandFolder}
                <br />
                ✓ AI Sentiment summaries & hardware improvement suggestions
                <br />
                ✓ Note: Purchasing switches your single active subscription to this brand
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => onOpenSubscriptionModal(selectedBrandFolder)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 transform hover:scale-105"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Buy {selectedBrandFolder.split(' ')[0]} Subscription ($15.99/mo)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
      <>
      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Specific Model Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Model Version:</span>
            <select
              value={selectedModelFilter}
              onChange={(e) => setSelectedModelFilter(e.target.value)}
              className="bg-transparent font-black text-slate-900 outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">All Models ({availableBrandItems.length})</option>
              {modelOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Type Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'
              }`}
            >
              All Auditions
            </button>
            <button
              type="button"
              onClick={() => setFilterType('video_only')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'video_only' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'
              }`}
            >
              Speaking Video Reel
            </button>
            <button
              type="button"
              onClick={() => setFilterType('verified_cart')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'verified_cart' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'
              }`}
            >
              Verified Orders
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reviewer, phone, quote..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Model Video Audition Manager Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-rose-500" />
            <h3 className="font-black text-sm text-slate-900">
              {selectedBrandFolder} · {filteredCount} Video Audition Records
            </h3>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs text-slate-500 font-mono">
              Avg Sentiment: <b className="text-emerald-700">{avgSentiment}%</b>
            </div>

            {/* AI Summarizer Stats & Batch Action */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                {filteredRows.filter((r) => r.aiSummary).length}/{filteredCount} Summarized
              </span>

              <button
                type="button"
                onClick={handleBatchSummarize}
                disabled={isBatchSummarizing || filteredCount === 0}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Automatically generate text summaries with topics, sentiment, and improvement suggestions for all videos"
              >
                {isBatchSummarizing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Summarizing ({batchProgress?.current}/{batchProgress?.total})...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-indigo-200" />
                    <span>⚡ Auto-Summarize All (AI Assistant)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Smartphone Model</th>
                <th className="py-3 px-4">Speaking Video Reel</th>
                <th className="py-3 px-4">Reviewer Details</th>
                <th className="py-3 px-4">Sentiment & Category</th>
                <th className="py-3 px-4">AI Summary, Topics & Improvements</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No video auditions found for this model filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((item) => {
                  const phone = phoneById(item.phone);
                  const sentimentScore = getSentimentScore(item);
                  const category = getFeedbackCategory(item);
                  const isGenerating = generatingId === item.id;
                  const summary = item.aiSummary;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Phone Model */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={phone.img}
                            alt={phone.name}
                            className="w-10 h-10 rounded-xl object-contain bg-slate-50 p-1 border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-black text-slate-900 leading-tight">{phone.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{phone.brand}</span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Video Audition Preview */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onOpenVideoModal(item)}
                          className="group relative w-24 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-300 shadow-2xs block cursor-pointer"
                          title="Click to play 1-minute speaking audition review"
                        >
                          <img
                            src={phone.img}
                            alt="Video Thumbnail"
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </div>
                          </div>
                          <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/80 text-white text-[9px] rounded font-mono">
                            0:58
                          </span>
                        </button>
                      </td>

                      {/* 3. Reviewer */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <span>{item.user}</span>
                            {item.cartData?.verifiedPurchase && (
                              <span title="Verified Customer">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.city} · {item.age}y
                          </div>
                        </div>
                      </td>

                      {/* 4. Sentiment & Category */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-500 font-black flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{item.rating}</span>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono font-bold text-emerald-700">
                              {sentimentScore}% Score
                            </span>
                          </div>
                          <div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              category === 'Bug Report'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : category === 'Feature Request'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 5. AI Text Summary & Improvements */}
                      <td className="py-3.5 px-4 max-w-sm">
                        {summary ? (
                          <div className="space-y-1.5">
                            {/* Topics & Sentiment */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                                summary.overallSentiment === 'positive'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : summary.overallSentiment === 'negative'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {summary.overallSentiment} ({summary.sentimentScore}%)
                              </span>
                              {summary.mainTopics.slice(0, 2).map((t, idx) => (
                                <span key={idx} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono truncate max-w-[120px]">
                                  #{t}
                                </span>
                              ))}
                            </div>

                            {/* Summary Text Snippet */}
                            <p className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed">
                              {summary.summary}
                            </p>

                            {/* Improvement Suggestion Highlight */}
                            {summary.improvementSuggestions && summary.improvementSuggestions.length > 0 && (
                              <div className="flex items-start gap-1 text-[10px] text-indigo-700 font-medium bg-indigo-50/70 p-1 rounded-md border border-indigo-100">
                                <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">
                                  <b>Fix:</b> {summary.improvementSuggestions[0]}
                                </span>
                              </div>
                            )}

                            {/* Expand Summary Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedSummaryFeedback(item)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Bot className="w-3 h-3" />
                              <span>View Full AI Summary & Suggestions →</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs text-slate-500 italic line-clamp-1">
                              {item.like ? `"${item.like}"` : item.dislike ? `"${item.dislike}"` : 'Video feedback recorded'}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleGenerateSummary(item)}
                              disabled={isGenerating}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Generating Summary...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-indigo-500" />
                                  <span>Generate AI Summary</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {summary && (
                            <button
                              type="button"
                              onClick={() => setSelectedSummaryFeedback(item)}
                              className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 cursor-pointer transition-colors"
                              title="Open AI Feedback Summary Assistant"
                            >
                              <Bot className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenVideoModal(item)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer transition-colors"
                            title="Play Video Audition"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenChatModal(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                            title="Direct Message Reviewer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenCartModal(item)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer transition-colors"
                            title="View Verified Order Slip"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* AI Feedback Summary Inspector Modal */}
      {selectedSummaryFeedback && (() => {
        const item = selectedSummaryFeedback;
        const phone = phoneById(item.phone);
        const summary = item.aiSummary;
        const isGenerating = generatingId === item.id;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <Bot className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/30">
                        AI Video Feedback Summary Assistant
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Gemini 3.8 Flash</span>
                    </div>
                    <h3 className="text-lg font-black text-white mt-0.5">
                      {phone.name} · {item.user}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSummaryFeedback(null)}
                  className="p-2 rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
                {/* Reviewer & Device Header Strip */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    {item.userAvatar ? (
                      <img src={item.userAvatar} alt={item.user} className="w-8 h-8 rounded-full object-cover border border-slate-300" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                        {item.user.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-extrabold text-slate-900 flex items-center gap-1">
                        <span>{item.user}</span>
                        {item.cartData?.verifiedPurchase && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.city} · {item.age} yrs · {item.time}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-amber-500 flex items-center justify-end gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{item.rating}.0 / 5.0</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Customer Rating</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSummaryFeedback(null);
                        onOpenVideoModal(item);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Watch Video</span>
                    </button>
                  </div>
                </div>

                {summary ? (
                  <>
                    {/* 1. Executive Text Summary */}
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-1.5">
                      <div className="font-black text-indigo-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-indigo-600" />
                        <span>Executive Video Feedback Summary</span>
                      </div>
                      <p className="text-slate-800 text-xs sm:text-sm leading-relaxed font-medium">
                        "{summary.summary}"
                      </p>
                    </div>

                    {/* 2. Main Topics Discussed */}
                    <div className="space-y-2">
                      <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Main Topics Discussed in Video</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {summary.mainTopics.map((topic, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <span className="text-indigo-600 font-bold">#</span>
                            <span>{topic}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 3. Overall Sentiment & Breakdown */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          {summary.overallSentiment === 'positive' ? (
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                          ) : summary.overallSentiment === 'negative' ? (
                            <TrendingDown className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Minus className="w-4 h-4 text-amber-600" />
                          )}
                          <span>Overall Sentiment:</span>
                          <span className={`px-2 py-0.5 rounded-full font-black capitalize ${
                            summary.overallSentiment === 'positive'
                              ? 'bg-emerald-100 text-emerald-800'
                              : summary.overallSentiment === 'negative'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {summary.overallSentiment} ({summary.sentimentScore}% Satisfaction)
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            summary.overallSentiment === 'positive'
                              ? 'bg-emerald-500'
                              : summary.overallSentiment === 'negative'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${summary.sentimentScore}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-600 italic">
                        {summary.sentimentExplanation}
                      </p>
                    </div>

                    {/* 4. Specific Product Improvement Suggestions */}
                    <div className="space-y-2">
                      <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span>Specific Product Improvement Suggestions Mentioned</span>
                      </div>
                      <div className="space-y-2">
                        {summary.improvementSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-2.5 text-slate-900 font-medium"
                          >
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-2xs">
                              {idx + 1}
                            </span>
                            <span className="text-xs leading-relaxed">{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 5. Assistant to Main ChatGPT-Style Agent Connection */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span className="font-black text-xs">Assistant to Main ChatGPT Agent</span>
                        </div>
                        <span className="text-[10px] text-indigo-300 font-mono">1-Click Hand-Off</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Send this video summary, sentiment metrics, and product improvement suggestions directly into the main ChatGPT-style strategy agent to develop actionable engineering steps.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const prompt = `I need engineering and UX product recommendations for ${phone.name} based on ${item.user}'s video feedback.
The AI Feedback Assistant summarized:
- Main Topics: ${summary.mainTopics.join(', ')}
- Overall Sentiment: ${summary.overallSentiment} (${summary.sentimentScore}%)
- Improvement Suggestions:
${summary.improvementSuggestions.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n')}

Executive Summary: "${summary.summary}"

What specific product roadmap and manufacturing actions should our team prioritize to address these suggestions?`;
                          
                          setSelectedSummaryFeedback(null);
                          onOpenChatGPTWithSummary?.(item, prompt);
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Bot className="w-4 h-4" />
                        <span>Ask Main ChatGPT Agent About This Feedback →</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-slate-500">No AI summary generated for this video review yet.</p>
                    <button
                      type="button"
                      onClick={() => handleGenerateSummary(item)}
                      disabled={isGenerating}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-2 mx-auto cursor-pointer"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>Generate AI Summary Now</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleGenerateSummary(item)}
                  disabled={isGenerating}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Re-run Gemini 3.8 Flash summary generation"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Re-analyzing...' : 'Re-generate Summary'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSummaryFeedback(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

