import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  Sparkles,
  TrendingUp,
  Smile,
  Meh,
  Frown,
  Smartphone,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ArrowUpDown,
  Percent,
  Hash,
} from 'lucide-react';
import { FeedbackItem } from '../types';
import { phoneById } from '../data/initialData';
import { getSentimentScore, getBrandFolder } from './CompanyView';

interface SentimentDistributionBarChartProps {
  feedbackList: FeedbackItem[];
  allFeedbackList?: FeedbackItem[];
  selectedBrandFolder?: string;
  onSelectBrandFolder?: (folder: string) => void;
  activeSentimentFilter: 'all' | 'high' | 'neutral' | 'negative';
  onSelectSentimentFilter: (sentiment: 'all' | 'high' | 'neutral' | 'negative') => void;
  selectedPhone?: string;
  onSelectPhone?: (phoneId: string) => void;
}

export interface SentimentBucketData {
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  key: 'high' | 'neutral' | 'negative';
  count: number;
  percentage: number;
  avgScore: number;
  avgStars: number;
  color: string;
  gradientId: string;
  iconEmoji: string;
  sampleQuote?: string;
  sampleUser?: string;
  sampleProduct?: string;
}

export interface ProductSentimentBreakdown {
  phoneId: string;
  productName: string;
  shortName: string;
  brand: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  avgSentimentScore: number;
  avgRating: number;
}

export const SentimentDistributionBarChart: React.FC<SentimentDistributionBarChartProps> = ({
  feedbackList,
  allFeedbackList,
  selectedBrandFolder = 'all',
  onSelectBrandFolder,
  activeSentimentFilter,
  onSelectSentimentFilter,
  selectedPhone = 'all',
  onSelectPhone,
}) => {
  // Chart Display Mode: 'overview' (3 sentiment buckets) vs 'by-product' (breakdown across product models)
  const [chartMode, setChartMode] = useState<'overview' | 'by-product'>('overview');
  // Metric Mode: Count (#) vs Percentage (%)
  const [metricUnit, setMetricUnit] = useState<'count' | 'percentage'>('count');
  // In product view: 'grouped' vs 'stacked'
  const [productBarLayout, setProductBarLayout] = useState<'grouped' | 'stacked'>('grouped');

  // Compute sentiment bucket for any review
  const getReviewBucket = (r: FeedbackItem): 'positive' | 'neutral' | 'negative' => {
    const score = getSentimentScore(r);
    if (score >= 80) return 'positive';
    if (score >= 60) return 'neutral';
    return 'negative';
  };

  // Base list of reviews for the active product range
  const reviewsToAnalyze = useMemo(() => {
    // If brand or phone filter is active, respect it; fallback to feedbackList
    return feedbackList && feedbackList.length > 0 ? feedbackList : (allFeedbackList || []);
  }, [feedbackList, allFeedbackList]);

  const totalReviews = reviewsToAnalyze.length;

  // 1. Compute Sentiment Overview Distribution (Positive, Neutral, Negative)
  const distributionData: SentimentBucketData[] = useMemo(() => {
    const posList = reviewsToAnalyze.filter((r) => getReviewBucket(r) === 'positive');
    const neuList = reviewsToAnalyze.filter((r) => getReviewBucket(r) === 'neutral');
    const negList = reviewsToAnalyze.filter((r) => getReviewBucket(r) === 'negative');

    const computeAvg = (list: FeedbackItem[]) => {
      if (list.length === 0) return { score: 0, stars: 0 };
      const totalScore = list.reduce((sum, r) => sum + getSentimentScore(r), 0);
      const totalStars = list.reduce((sum, r) => sum + r.rating, 0);
      return {
        score: Math.round(totalScore / list.length),
        stars: Number((totalStars / list.length).toFixed(1)),
      };
    };

    const posStats = computeAvg(posList);
    const neuStats = computeAvg(neuList);
    const negStats = computeAvg(negList);

    const posPct = totalReviews > 0 ? Math.round((posList.length / totalReviews) * 100) : 0;
    const neuPct = totalReviews > 0 ? Math.round((neuList.length / totalReviews) * 100) : 0;
    const negPct = totalReviews > 0 ? Math.round((negList.length / totalReviews) * 100) : 0;

    const samplePos = posList[0];
    const sampleNeu = neuList[0];
    const sampleNeg = negList[0];

    return [
      {
        sentiment: 'Positive',
        key: 'high',
        count: posList.length,
        percentage: posPct,
        avgScore: posStats.score,
        avgStars: posStats.stars,
        color: '#10B981', // Emerald
        gradientId: 'positiveBarGrad',
        iconEmoji: '🟢',
        sampleQuote: samplePos?.like || 'Superb camera sharpness, smooth display, and high satisfaction.',
        sampleUser: samplePos?.user || 'Verified Reviewer',
        sampleProduct: samplePos ? phoneById(samplePos.phone).name : 'Smartphone',
      },
      {
        sentiment: 'Neutral',
        key: 'neutral',
        count: neuList.length,
        percentage: neuPct,
        avgScore: neuStats.score,
        avgStars: neuStats.stars,
        color: '#F59E0B', // Amber
        gradientId: 'neutralBarGrad',
        iconEmoji: '🟡',
        sampleQuote: sampleNeu?.like || sampleNeu?.dislike || 'Solid performance but has minor ergonomic stiffness or warm areas.',
        sampleUser: sampleNeu?.user || 'Verified Reviewer',
        sampleProduct: sampleNeu ? phoneById(sampleNeu.phone).name : 'Smartphone',
      },
      {
        sentiment: 'Negative',
        key: 'negative',
        count: negList.length,
        percentage: negPct,
        avgScore: negStats.score,
        avgStars: negStats.stars,
        color: '#EF4444', // Rose
        gradientId: 'negativeBarGrad',
        iconEmoji: '🔴',
        sampleQuote: sampleNeg?.dislike || sampleNeg?.improve || 'Thermal throttling, low duration, or missing in-box charger.',
        sampleUser: sampleNeg?.user || 'Verified Reviewer',
        sampleProduct: sampleNeg ? phoneById(sampleNeg.phone).name : 'Smartphone',
      },
    ];
  }, [reviewsToAnalyze, totalReviews]);

  // 2. Compute Product-Level Breakdown for current product range
  const productBreakdownData: ProductSentimentBreakdown[] = useMemo(() => {
    const productMap = new Map<string, FeedbackItem[]>();

    reviewsToAnalyze.forEach((r) => {
      const pid = r.phone;
      if (!productMap.has(pid)) {
        productMap.set(pid, []);
      }
      productMap.get(pid)!.push(r);
    });

    const results: ProductSentimentBreakdown[] = [];

    productMap.forEach((items, pid) => {
      const p = phoneById(pid);
      const pos = items.filter((r) => getReviewBucket(r) === 'positive').length;
      const neu = items.filter((r) => getReviewBucket(r) === 'neutral').length;
      const neg = items.filter((r) => getReviewBucket(r) === 'negative').length;
      const count = items.length;

      const totalScore = items.reduce((sum, r) => sum + getSentimentScore(r), 0);
      const totalStars = items.reduce((sum, r) => sum + r.rating, 0);

      // Compact short name for clean chart axis labels
      const shortName = p.name
        .replace(/Samsung Galaxy /i, 'Galaxy ')
        .replace(/Apple iPhone /i, 'iPhone ')
        .replace(/Xiaomi Redmi /i, 'Redmi ')
        .replace(/Google Pixel /i, 'Pixel ')
        .replace(/Pro Max/i, 'PM')
        .replace(/Ultra/i, 'U');

      results.push({
        phoneId: pid,
        productName: p.name,
        shortName,
        brand: p.brand || 'Mobile',
        total: count,
        positive: pos,
        neutral: neu,
        negative: neg,
        positivePct: count > 0 ? Math.round((pos / count) * 100) : 0,
        neutralPct: count > 0 ? Math.round((neu / count) * 100) : 0,
        negativePct: count > 0 ? Math.round((neg / count) * 100) : 0,
        avgSentimentScore: count > 0 ? Math.round(totalScore / count) : 0,
        avgRating: count > 0 ? Number((totalStars / count).toFixed(1)) : 0,
      });
    });

    // Sort by total reviews descending
    return results.sort((a, b) => b.total - a.total);
  }, [reviewsToAnalyze]);

  // Net Sentiment Score (NSS = % Positive - % Negative)
  const netSentimentScore = useMemo(() => {
    if (distributionData.length < 3 || totalReviews === 0) return 0;
    return distributionData[0].percentage - distributionData[2].percentage;
  }, [distributionData, totalReviews]);

  // Custom Recharts Tooltip for Sentiment Overview Mode
  const CustomOverviewTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data: SentimentBucketData = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs max-w-xs space-y-1.5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="font-extrabold text-sm flex items-center gap-1.5" style={{ color: data.color }}>
              <span>{data.iconEmoji}</span>
              <span>{data.sentiment} Sentiment</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white">
              {data.percentage}% Share
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 py-1 text-[11px]">
            <div>
              <span className="text-slate-400">Total Videos:</span>
              <div className="font-black text-sm text-white">{data.count} reviews</div>
            </div>
            <div>
              <span className="text-slate-400">Avg AI Score:</span>
              <div className="font-black text-sm" style={{ color: data.color }}>
                {data.avgScore}% / 100
              </div>
            </div>
            <div>
              <span className="text-slate-400">Average Rating:</span>
              <div className="font-bold text-amber-400">{data.avgStars} ★</div>
            </div>
            <div>
              <span className="text-slate-400">Classification:</span>
              <div className="font-semibold text-slate-300">
                {data.key === 'high' ? 'Delighted (≥80%)' : data.key === 'neutral' ? 'Balanced (60–79%)' : 'Needs Fix (<60%)'}
              </div>
            </div>
          </div>

          {data.sampleQuote && (
            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-300 italic">
              <span className="font-bold text-slate-400 not-italic block mb-0.5">
                💬 Sample Review ({data.sampleProduct}):
              </span>
              "{data.sampleQuote.slice(0, 95)}..."
            </div>
          )}

          <div className="pt-1 text-[9px] text-slate-400 text-center font-medium">
            💡 Click this bar to filter feedback table
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for By-Product Breakdown Mode
  const CustomProductTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data: ProductSentimentBreakdown = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs max-w-xs space-y-2 backdrop-blur-md">
          <div className="border-b border-slate-800 pb-2">
            <div className="font-black text-sm text-white">{data.productName}</div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between mt-0.5">
              <span>Brand: {data.brand}</span>
              <span className="font-mono font-bold text-emerald-400">{data.total} Verified Videos</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span>🟢 Positive:</span>
              </span>
              <span className="font-mono font-black text-white">
                {data.positive} ({data.positivePct}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span>🟡 Neutral:</span>
              </span>
              <span className="font-mono font-black text-white">
                {data.neutral} ({data.neutralPct}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <span>🔴 Negative:</span>
              </span>
              <span className="font-mono font-black text-white">
                {data.negative} ({data.negativePct}%)
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Mean AI Sentiment:</span>
            <span className="font-black text-emerald-400">{data.avgSentimentScore}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Handle bar click to filter table
  const handleBarClick = (data: SentimentBucketData) => {
    if (activeSentimentFilter === data.key) {
      onSelectSentimentFilter('all');
    } else {
      onSelectSentimentFilter(data.key);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-6 shadow-xs mt-4 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-emerald-100/50 to-purple-100/40 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 relative z-10">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h3 className="font-black text-base text-neutral-900 tracking-tight">
              Sentiment Distribution Analysis
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              Recharts Dynamic Bar
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>Gemini 3.8 Flash</span>
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Visualizing the distribution of Positive (≥80%), Neutral (60–79%), and Negative (&lt;60%) sentiments across {totalReviews} video reviews for the current product range.
          </p>
        </div>

        {/* View Switchers (Overview vs By-Product Range) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Chart Mode Toggle */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartMode('overview')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                chartMode === 'overview'
                  ? 'bg-white text-neutral-950 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Overall Distribution</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('by-product')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                chartMode === 'by-product'
                  ? 'bg-white text-neutral-950 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
              <span>By Product Range ({productBreakdownData.length})</span>
            </button>
          </div>

          {/* Metric Toggle: Count vs Percentage */}
          <button
            type="button"
            onClick={() => setMetricUnit(metricUnit === 'count' ? 'percentage' : 'count')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 shadow-2xs transition-all cursor-pointer"
            title="Toggle between review counts and percentage shares"
          >
            {metricUnit === 'count' ? <Hash className="w-3.5 h-3.5 text-blue-600" /> : <Percent className="w-3.5 h-3.5 text-purple-600" />}
            <span>{metricUnit === 'count' ? 'Count (#)' : 'Percentage (%)'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 relative z-10">
        {/* Positive Sentiment KPI */}
        <button
          type="button"
          onClick={() => onSelectSentimentFilter(activeSentimentFilter === 'high' ? 'all' : 'high')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeSentimentFilter === 'high'
              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-300 shadow-xs'
              : 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-emerald-600" />
              <span>Positive (≥80%)</span>
            </span>
            <span className="text-xs font-mono font-black text-emerald-700">
              {distributionData[0]?.percentage}%
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {distributionData[0]?.count}
            <span className="text-xs font-normal text-emerald-600 ml-1">videos</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
            Avg Score: <b>{distributionData[0]?.avgScore}%</b> · {distributionData[0]?.avgStars}★
          </div>
        </button>

        {/* Neutral Sentiment KPI */}
        <button
          type="button"
          onClick={() => onSelectSentimentFilter(activeSentimentFilter === 'neutral' ? 'all' : 'neutral')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeSentimentFilter === 'neutral'
              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300 shadow-xs'
              : 'bg-amber-50/40 border-amber-200 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Meh className="w-3.5 h-3.5 text-amber-600" />
              <span>Neutral (60-79%)</span>
            </span>
            <span className="text-xs font-mono font-black text-amber-700">
              {distributionData[1]?.percentage}%
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {distributionData[1]?.count}
            <span className="text-xs font-normal text-amber-600 ml-1">videos</span>
          </div>
          <div className="text-[10px] text-amber-600 font-medium mt-0.5">
            Avg Score: <b>{distributionData[1]?.avgScore}%</b> · {distributionData[1]?.avgStars}★
          </div>
        </button>

        {/* Negative Sentiment KPI */}
        <button
          type="button"
          onClick={() => onSelectSentimentFilter(activeSentimentFilter === 'negative' ? 'all' : 'negative')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeSentimentFilter === 'negative'
              ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-300 shadow-xs'
              : 'bg-rose-50/40 border-rose-200 hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
              <Frown className="w-3.5 h-3.5 text-rose-600" />
              <span>Negative (&lt;60%)</span>
            </span>
            <span className="text-xs font-mono font-black text-rose-700">
              {distributionData[2]?.percentage}%
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">
            {distributionData[2]?.count}
            <span className="text-xs font-normal text-rose-600 ml-1">videos</span>
          </div>
          <div className="text-[10px] text-rose-600 font-medium mt-0.5">
            Avg Score: <b>{distributionData[2]?.avgScore}%</b> · {distributionData[2]?.avgStars}★
          </div>
        </button>

        {/* Net Sentiment Score (NSS / CSAT Benchmark) */}
        <div className="p-3.5 rounded-2xl bg-neutral-900 text-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Net Sentiment
            </span>
            <span className="text-[10px] font-mono font-bold bg-white/10 px-1.5 py-0.2 rounded text-emerald-400">
              NSS Index
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-1">
            <span className={netSentimentScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {netSentimentScore >= 0 ? `+${netSentimentScore}` : netSentimentScore}
            </span>
            <span className="text-xs text-neutral-400">pts</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            {netSentimentScore >= 50
              ? '🟢 Exceptional brand loyalty'
              : netSentimentScore >= 20
              ? '🟡 Healthy customer approval'
              : '🔴 Requires operational attention'}
          </div>
        </div>
      </div>

      {/* =========================================================
          RECHARTS DYNAMIC BAR CHART CANVAS
          ========================================================= */}
      <div className="h-64 sm:h-72 w-full mt-2 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'overview' ? (
            /* ================= VIEW 1: SENTIMENT OVERVIEW BAR CHART ================= */
            <BarChart
              data={distributionData}
              margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
            >
              <defs>
                {/* Positive Emerald Gradient */}
                <linearGradient id="positiveBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                </linearGradient>

                {/* Neutral Amber Gradient */}
                <linearGradient id="neutralBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#D97706" stopOpacity={0.8} />
                </linearGradient>

                {/* Negative Rose Gradient */}
                <linearGradient id="negativeBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0.8} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="sentiment"
                tick={{ fontSize: 12, fontWeight: 700, fill: '#334155' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                unit={metricUnit === 'percentage' ? '%' : ''}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomOverviewTooltip />} />

              <Bar
                dataKey={metricUnit === 'percentage' ? 'percentage' : 'count'}
                radius={[12, 12, 0, 0]}
                onClick={(entry: any) => handleBarClick(entry)}
                cursor="pointer"
              >
                {distributionData.map((entry, index) => {
                  const isSelected = activeSentimentFilter === entry.key;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#${entry.gradientId})`}
                      stroke={isSelected ? '#0F172A' : entry.color}
                      strokeWidth={isSelected ? 3 : 1}
                      className="transition-all hover:opacity-90"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          ) : (
            /* ================= VIEW 2: PRODUCT RANGE BREAKDOWN BAR CHART ================= */
            <BarChart
              data={productBreakdownData}
              margin={{ top: 15, right: 20, left: -10, bottom: 25 }}
            >
              <defs>
                <linearGradient id="pPosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <linearGradient id="pNeuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
                <linearGradient id="pNegGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#B91C1C" />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 11, fontWeight: 700, fill: '#1E293B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={40}
              />
              <YAxis
                unit={metricUnit === 'percentage' ? '%' : ''}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomProductTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }}
              />

              <Bar
                name="Positive"
                dataKey={metricUnit === 'percentage' ? 'positivePct' : 'positive'}
                fill="url(#pPosGrad)"
                stackId={productBarLayout === 'stacked' ? 'a' : undefined}
                radius={productBarLayout === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
              />
              <Bar
                name="Neutral"
                dataKey={metricUnit === 'percentage' ? 'neutralPct' : 'neutral'}
                fill="url(#pNeuGrad)"
                stackId={productBarLayout === 'stacked' ? 'a' : undefined}
                radius={productBarLayout === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
              />
              <Bar
                name="Negative"
                dataKey={metricUnit === 'percentage' ? 'negativePct' : 'negative'}
                fill="url(#pNegGrad)"
                stackId={productBarLayout === 'stacked' ? 'a' : undefined}
                radius={productBarLayout === 'stacked' ? [6, 6, 0, 0] : [6, 6, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Bottom Interactive Filter & Legend Bar */}
      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-neutral-100 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-neutral-500 text-[11px] uppercase tracking-wider">
            Quick Sentiment Filter:
          </span>
          <button
            type="button"
            onClick={() => onSelectSentimentFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSentimentFilter === 'all'
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All Sentiments ({totalReviews})
          </button>
          <button
            type="button"
            onClick={() => onSelectSentimentFilter('high')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeSentimentFilter === 'high'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>🟢 Positive ({distributionData[0]?.count})</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectSentimentFilter('neutral')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeSentimentFilter === 'neutral'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span>🟡 Neutral ({distributionData[1]?.count})</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectSentimentFilter('negative')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeSentimentFilter === 'negative'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span>🔴 Negative ({distributionData[2]?.count})</span>
          </button>
        </div>

        {/* In product mode: layout toggle */}
        {chartMode === 'by-product' && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-600">
            <span>Bar Layout:</span>
            <button
              type="button"
              onClick={() => setProductBarLayout('grouped')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                productBarLayout === 'grouped' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'
              }`}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setProductBarLayout('stacked')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                productBarLayout === 'stacked' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'
              }`}
            >
              Stacked
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
