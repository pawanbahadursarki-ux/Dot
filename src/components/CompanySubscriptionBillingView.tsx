import React, { useState, useMemo, lazy, Suspense } from 'react';
import { 
  Building2, Sparkles, ShieldCheck, Check, CreditCard, Smartphone, 
  ArrowRight, Download, Copy, QrCode, Lock, Film, RefreshCw, 
  Calendar, Clock, PauseCircle, PlayCircle, AlertCircle, CheckCircle2,
  Zap, Award, ChevronRight, Eye, Gift, BarChart3, Bot, Send,
  MessageSquare, Star, ThumbsUp, ThumbsDown, Smile, ChevronDown, ChevronUp,
  ExternalLink, Play, ShoppingBag, Folder, Search, Filter, ArrowUpDown, FileText,
  Printer, X, Receipt, CheckCircle, Info
} from 'lucide-react';
import { triggerConfetti } from '../utils/confettiEffect';
import { SubscriptionTier, FeedbackItem, FeedbackCategory, UserProfile, AdminWithdrawalRequest } from '../types';
import { SUBSCRIPTION_PLANS, BRAND_CATEGORY_PASSES, phoneById, PHONES } from '../data/initialData';
import { PaymentRecord } from '../services/firebaseService';

const PaymentCheckoutModal = lazy(() =>
  import('./PaymentCheckoutModal').then((m) => ({ default: m.PaymentCheckoutModal }))
);
const AiDataAnalysisDashboard = lazy(() =>
  import('./AiDataAnalysisDashboard').then((m) => ({ default: m.AiDataAnalysisDashboard }))
);
const ModelVideoLibraryTable = lazy(() =>
  import('./ModelVideoLibraryTable').then((m) => ({ default: m.ModelVideoLibraryTable }))
);
const SentimentTrendChart = lazy(() =>
  import('./SentimentTrendChart').then((m) => ({ default: m.SentimentTrendChart }))
);
const SentimentDistributionBarChart = lazy(() =>
  import('./SentimentDistributionBarChart').then((m) => ({ default: m.SentimentDistributionBarChart }))
);
import { getSentimentScore, getSentimentTone, getFeedbackCategory, getBrandFolder } from './CompanyView';
import { getSingleActiveBrandFolder, isBrandUnlocked, isFeedbackItemUnlocked } from '../utils/brandAccess';

export interface SubscriptionOrder {
  id: string;
  planName: string;
  categoryPass: string;
  amountUSD: number;
  amountNPR: number;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod: string;
  bankRefId: string;
  date: string;
  status: 'Paid & Cleared' | 'Processing';
  nextBillingDate: string;
}

export interface SnoozeAuditEntry {
  id: string;
  date: string;
  durationDays: number;
  resumesOn: string;
  action: 'Snoozed' | 'Resumed';
  status: 'Active' | 'Completed';
  note: string;
}

interface CompanySubscriptionBillingViewProps {
  activePlan: SubscriptionTier;
  reviewsQuotaUsed: number;
  feedbackList?: FeedbackItem[];
  payments?: PaymentRecord[];
  withdrawals?: AdminWithdrawalRequest[];
  user?: UserProfile;
  onSelectPlan: (plan: SubscriptionTier) => void;
  onOpenSubscriptionModal?: () => void;
  onOpenVideoModal?: (item: FeedbackItem) => void;
  onOpenChatModal?: (item: FeedbackItem) => void;
  onOpenCartModal?: (item: FeedbackItem) => void;
  onOpenVideoAuditions?: () => void;
  onOpenAiAnalysis?: () => void;
}

export const CompanySubscriptionBillingView: React.FC<CompanySubscriptionBillingViewProps> = ({
  activePlan,
  reviewsQuotaUsed,
  feedbackList = [],
  payments = [],
  withdrawals = [],
  user,
  onSelectPlan,
  onOpenSubscriptionModal,
  onOpenVideoModal,
  onOpenChatModal,
  onOpenCartModal,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSnoozed, setIsSnoozed] = useState<boolean>(false);
  const [snoozeDays, setSnoozeDays] = useState<number>(30);
  const [snoozeSuccessMsg, setSnoozeSuccessMsg] = useState<string | null>(null);
  const [showSnoozeModal, setShowSnoozeModal] = useState<boolean>(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<SubscriptionOrder | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'overview' | 'snooze' | 'billing' | 'categories' | 'graphs_breakdown' | 'video_table' | 'ai_charts' | 'feedback_table' | 'cart_invoices' | 'ai_chatbot' | 'pricing'>('overview');
  
  // Interactive filters
  const [selectedBrandFolder, setSelectedBrandFolder] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | FeedbackCategory>('all');
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'high' | 'neutral' | 'negative'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState<boolean>(false);

  // Snooze audit history log (starts empty until user triggers snooze/resume)
  const [snoozeHistory, setSnoozeHistory] = useState<SnoozeAuditEntry[]>([]);

  // Local newly added invoices merged with real Firestore payments
  const [localOrders, setLocalOrders] = useState<SubscriptionOrder[]>([]);
  const subscriptionOrders = useMemo<SubscriptionOrder[]>(() => {
    const mappedPayments: SubscriptionOrder[] = payments.map((p) => ({
      id: p.id,
      planName: p.planName || 'Subscription Plan',
      categoryPass: p.brandCategory || 'All Brands',
      amountUSD: Number(p.amountUSD || 0),
      amountNPR: Number(p.amountNPR || 0),
      billingCycle: p.billingCycle === 'yearly' ? 'yearly' : 'monthly',
      paymentMethod: p.gateway || p.method,
      bankRefId: p.referenceId || p.id,
      date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
      status: p.status === 'completed' || p.status === 'verified' ? 'Paid & Cleared' : 'Processing',
      nextBillingDate: 'Active Cycle',
    }));
    const seen = new Set(mappedPayments.map((o) => o.id));
    return [...mappedPayments, ...localOrders.filter((o) => !seen.has(o.id))];
  }, [payments, localOrders]);

  const [selectedBrandPass, setSelectedBrandPass] = useState<string>(() => {
    if (activePlan?.targetCategory && activePlan.targetCategory !== 'all') {
      return activePlan.targetCategory;
    }
    return 'samsung';
  });

  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionTier | null>(null);
  const currentBrandPassInfo = BRAND_CATEGORY_PASSES.find((p) => p.brandId === selectedBrandPass) || BRAND_CATEGORY_PASSES[0];

  // Pricing details based on duration
  const basicPrice = billingCycle === 'yearly' ? '11.99' : '15.99';
  const standardPrice = billingCycle === 'yearly' ? '19.99' : '25.99';
  const premiumPrice = billingCycle === 'yearly' ? '27.99' : '35.99';

  // Quota calculation
  const totalQuota = activePlan?.reviewQuota ?? 0;
  const isUnlimited = totalQuota >= 99999;
  const remainingQuota = isUnlimited ? 'Unlimited' : totalQuota > 0 ? Math.max(0, totalQuota - reviewsQuotaUsed) : 0;
  const quotaPercent = isUnlimited ? 15 : totalQuota > 0 ? Math.min(100, Math.round((reviewsQuotaUsed / totalQuota) * 100)) : 0;

  // Feedback strictly scoped to this Company's single active subscribed brand
  const activeSingleBrandFolder = useMemo(
    () => getSingleActiveBrandFolder(user, activePlan),
    [user, activePlan]
  );

  const scopedFeedbackList = useMemo(
    () => feedbackList.filter((f) => isFeedbackItemUnlocked(f, user, activePlan)),
    [feedbackList, user, activePlan]
  );

  // Executive KPI summary calculations (strictly from subscribed brand feedback)
  const totalReviews = scopedFeedbackList.length;
  const avgSentimentScore = totalReviews > 0
    ? Math.round(scopedFeedbackList.reduce((acc, r) => acc + getSentimentScore(r), 0) / totalReviews)
    : 0;
  const avgRating = totalReviews > 0
    ? (scopedFeedbackList.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1)
    : '0.0';
  const highSentimentCount = scopedFeedbackList.filter((r) => getSentimentScore(r) >= 80).length;
  const highSentimentPercent = totalReviews > 0
    ? Math.round((highSentimentCount / totalReviews) * 100)
    : 0;
  const bugReportsCount = scopedFeedbackList.filter((r) => getFeedbackCategory(r) === 'Bug Report').length;
  const featureRequestsCount = scopedFeedbackList.filter((r) => getFeedbackCategory(r) === 'Feature Request').length;
  const complimentsCount = scopedFeedbackList.filter((r) => getFeedbackCategory(r) === 'Compliment').length;

  // Compute Category Graphs Breakdown (scoped strictly to subscribed brand feedback)
  const categoryGraphBreakdown = useMemo(() => {
    const categories = [
      { id: 'samsung', name: 'Samsung Galaxy', icon: '🌌', folder: 'Samsung Galaxy (S1 to S25)' },
      { id: 'apple', name: 'Apple iPhone', icon: '🍏', folder: 'iPhone (Models 1 to 18)' },
      { id: 'xiaomi', name: 'Xiaomi / Redmi', icon: '🟠', folder: 'Xiaomi / Redmi / POCO' },
      { id: 'pixel', name: 'Google Pixel', icon: '🔍', folder: 'Google Pixel' },
      { id: 'oneplus', name: 'OnePlus', icon: '⚡', folder: 'OnePlus' },
      { id: 'vivo', name: 'Vivo & iQOO', icon: '📸', folder: 'Vivo & iQOO' },
      { id: 'oppo', name: 'OPPO & Realme', icon: '🟢', folder: 'OPPO & Realme' },
      { id: 'nothing', name: 'Nothing Phone', icon: '⚪', folder: 'Nothing Phone' },
    ];

    return categories.map((cat) => {
      const catFeedbacks = scopedFeedbackList.filter((f) => {
        const folder = getBrandFolder(f.phone, f.brandFolder);
        return folder === cat.folder || folder.toLowerCase().includes(cat.id);
      });

      const count = catFeedbacks.length;
      const likesCount = catFeedbacks.filter((f) => f.rating >= 4 || getSentimentScore(f) >= 75).length;
      const dislikesCount = catFeedbacks.filter((f) => f.rating <= 2 || getSentimentScore(f) < 60).length;

      const likePercent = count > 0 ? Math.round((likesCount / count) * 100) : 0;
      const dislikePercent = count > 0 ? Math.round((dislikesCount / count) * 100) : 0;
      const neutralPercent = count > 0 ? Math.max(0, 100 - likePercent - dislikePercent) : 0;

      const avgCatRating = catFeedbacks.length > 0
        ? (catFeedbacks.reduce((a, b) => a + b.rating, 0) / catFeedbacks.length).toFixed(1)
        : '0.0';

      const samplePraise = catFeedbacks.find((f) => f.like)?.like || 'No feedback recorded yet';
      const sampleBug = catFeedbacks.find((f) => f.dislike || f.improve)?.dislike || 'No issues reported yet';

      return {
        ...cat,
        totalAuditions: count,
        likePercent,
        dislikePercent,
        neutralPercent,
        avgRating: avgCatRating,
        topPraise: samplePraise,
        topBug: sampleBug,
        sampleFeedback: catFeedbacks[0],
      };
    });
  }, [scopedFeedbackList]);

  // Mobile Brand Folders for category selector
  const brandFolderOptions = useMemo(() => [
    { id: 'Samsung Galaxy (S1 to S25)', name: 'Samsung Galaxy', icon: '🌌' },
    { id: 'iPhone (Models 1 to 18)', name: 'Apple iPhone', icon: '🍏' },
    { id: 'Xiaomi / Redmi / POCO', name: 'Xiaomi / Redmi', icon: '🟠' },
    { id: 'Google Pixel', name: 'Google Pixel', icon: '🔍' },
    { id: 'OnePlus', name: 'OnePlus', icon: '⚡' },
    { id: 'Vivo & iQOO', name: 'Vivo & iQOO', icon: '📸' },
    { id: 'OPPO & Realme', name: 'OPPO & Realme', icon: '🟢' },
    { id: 'Nothing Phone', name: 'Nothing Phone', icon: '⚪' },
    { id: 'Gaming & Others', name: 'Gaming Beasts', icon: '🎮' },
  ], []);

  // Filtered rows for the all-in-one feedback table (strictly scoped to subscribed brand)
  const filteredFeedbackList = useMemo(() => {
    return scopedFeedbackList.filter((r) => {
      const folder = getBrandFolder(r.phone, r.brandFolder);
      const matchesFolder = selectedBrandFolder === 'all' || 
        folder === selectedBrandFolder ||
        (selectedBrandFolder.includes('iPhone') && folder.includes('iPhone')) ||
        (selectedBrandFolder.includes('Samsung') && folder.includes('Samsung'));

      const score = getSentimentScore(r);
      let matchesSentiment = true;
      if (filterSentiment === 'high') matchesSentiment = score >= 80;
      else if (filterSentiment === 'neutral') matchesSentiment = score >= 60 && score < 80;
      else if (filterSentiment === 'negative') matchesSentiment = score < 60;

      const cat = getFeedbackCategory(r);
      const matchesCategory = filterCategory === 'all' || cat === filterCategory;

      const q = searchQuery.toLowerCase().trim();
      const p = phoneById(r.phone);
      const matchesSearch = !q || 
        (r.user + ' ' + r.city + ' ' + r.like + ' ' + r.dislike + ' ' + (r.improve || '') + ' ' + p.name + ' ' + folder).toLowerCase().includes(q);

      return matchesFolder && matchesSentiment && matchesCategory && matchesSearch;
    });
  }, [scopedFeedbackList, selectedBrandFolder, filterSentiment, filterCategory, searchQuery]);

  // Handle Snooze / Pause Auto-Renewal
  const handleToggleSnooze = (customDays?: number) => {
    const days = customDays || snoozeDays;
    const nextState = !isSnoozed;
    setIsSnoozed(nextState);

    const now = new Date();
    const resumeDateObj = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const resumeDateStr = resumeDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (nextState) {
      setSnoozeSuccessMsg(`Auto-renewal snoozed for ${days} days! Resumes on ${resumeDateStr}. All video reviews, quota (${remainingQuota}) & data remain 100% active with zero charges.`);
      setSnoozeHistory((prev) => [
        {
          id: `SNZ-${Date.now().toString().slice(-4)}`,
          date: todayStr,
          durationDays: days,
          resumesOn: resumeDateStr,
          action: 'Snoozed',
          status: 'Active',
          note: `Auto-renewal paused for ${days} days. Zero billing charges applied.`,
        },
        ...prev,
      ]);
    } else {
      setSnoozeSuccessMsg('Auto-renewal resumed! Your subscription is active and scheduled for regular billing.');
      setSnoozeHistory((prev) => [
        {
          id: `SNZ-${Date.now().toString().slice(-4)}`,
          date: todayStr,
          durationDays: 0,
          resumesOn: 'Immediate Active',
          action: 'Resumed',
          status: 'Completed',
          note: 'Auto-renewal manually resumed by administrator.',
        },
        ...prev,
      ]);
    }
    setTimeout(() => setSnoozeSuccessMsg(null), 5000);
  };

  const handleOpenBuy = (tierId: 'basic' | 'standard' | 'premium') => {
    let targetPlan: SubscriptionTier;

    if (tierId === 'basic') {
      const singlePlanTemplate = SUBSCRIPTION_PLANS.find((p) => p.id === 'single_category') || SUBSCRIPTION_PLANS[0];
      targetPlan = {
        ...singlePlanTemplate,
        name: `Single Brand Starter (${currentBrandPassInfo.brandName})`,
        priceUSD: billingCycle === 'yearly' ? 11.99 : 15.99,
        reviewQuota: billingCycle === 'yearly' ? 200 : 150,
        targetCategory: currentBrandPassInfo.brandId,
        categoryName: currentBrandPassInfo.brandName,
        unlockedCategories: [currentBrandPassInfo.brandId],
        features: [
          'FREE SUPPORT 24/7',
          'DATABASES DOWNLOAD',
          `Unlocks models strictly under ${currentBrandPassInfo.brandName}`,
          `${billingCycle === 'yearly' ? '200' : '150'} 1-Minute Video Reviews / mo`,
          'TikTok vertical short video scrolling',
          'Gemini AI auto-tags (Pricing, UX, Camera, Battery)',
        ],
      };
    } else if (tierId === 'standard') {
      const growthPlan = SUBSCRIPTION_PLANS.find((p) => p.id === 'growth') || SUBSCRIPTION_PLANS[1];
      targetPlan = {
        ...growthPlan,
        name: `Single Brand Pro (${currentBrandPassInfo.brandName})`,
        priceUSD: billingCycle === 'yearly' ? 19.99 : 25.99,
        reviewQuota: billingCycle === 'yearly' ? 600 : 500,
        targetCategory: currentBrandPassInfo.brandId,
        categoryName: currentBrandPassInfo.brandName,
        unlockedCategories: [currentBrandPassInfo.brandId],
        features: [
          'FREE SUPPORT 24/7',
          'DATABASES DOWNLOAD',
          'MAINTENANCE EMAIL',
          `${billingCycle === 'yearly' ? '600' : '500'} Video Audition Reviews / month`,
          `Strictly 1 Brand at a Time: ${currentBrandPassInfo.brandName}`,
          'Instant Gemini Sentiment Intelligence & AI Chatbot',
        ],
      };
    } else {
      const entPlan = SUBSCRIPTION_PLANS.find((p) => p.id === 'enterprise') || SUBSCRIPTION_PLANS[2];
      targetPlan = {
        ...entPlan,
        name: `Single Brand Unlimited (${currentBrandPassInfo.brandName})`,
        priceUSD: billingCycle === 'yearly' ? 27.99 : 35.99,
        reviewQuota: 999999,
        targetCategory: currentBrandPassInfo.brandId,
        categoryName: currentBrandPassInfo.brandName,
        unlockedCategories: [currentBrandPassInfo.brandId],
        features: [
          'FREE SUPPORT 24/7',
          'DATABASES DOWNLOAD',
          'MAINTENANCE EMAIL',
          'UNLIMITED TRAFFIC',
          `Unlimited Video Auditions for ${currentBrandPassInfo.brandName} only`,
          'Switching to another brand requires a new subscription',
        ],
      };
    }

    setCheckoutPlan(targetPlan);
  };

  const handlePaymentSuccess = (confirmedPlan: SubscriptionTier) => {
    onSelectPlan(confirmedPlan);
    
    // Add to Subscription Cart & Invoices History (reflect in different section)
    const newOrder: SubscriptionOrder = {
      id: `INV-SUB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      planName: confirmedPlan.name,
      categoryPass: confirmedPlan.categoryName || (confirmedPlan.targetCategory ? confirmedPlan.targetCategory.toUpperCase() : 'Single Brand'),
      amountUSD: confirmedPlan.priceUSD,
      amountNPR: Math.round(confirmedPlan.priceUSD * 135),
      billingCycle: billingCycle,
      paymentMethod: 'Nepal Bank & Online Settlement (Paid & Verified)',
      bankRefId: `TXN-NP-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Paid & Cleared',
      nextBillingDate: 'Nov 30, 2026',
    };

    setLocalOrders((prev) => [newOrder, ...prev]);
    setCheckoutPlan(null);
    setSelectedReceiptOrder(newOrder);

    triggerConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Review ID', 
      'Customer', 
      'Age', 
      'City', 
      'Brand Folder',
      'Phone Model', 
      'AI Category',
      'Stars', 
      'Gemini Sentiment Score (%)',
      'Sentiment Tone',
      'Sentiment Summary',
      'Liked', 
      'Disliked', 
      'Comfort', 
      'Fix Recommendation'
    ];
    const rows = filteredFeedbackList.map((r) => [
      r.id,
      r.user,
      r.age,
      r.city,
      `"${getBrandFolder(r.phone, r.brandFolder)}"`,
      phoneById(r.phone).name,
      `"${getFeedbackCategory(r)}"`,
      r.rating,
      getSentimentScore(r),
      `"${getSentimentTone(r)}"`,
      `"${(r.sentimentSummary || '').replace(/"/g, '""')}"`,
      `"${r.like.replace(/"/g, '""')}"`,
      `"${r.dislike.replace(/"/g, '""')}"`,
      `"${r.comfort.replace(/"/g, '""')}"`,
      `"${(r.improve || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dot_all_data_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI Chatbot State for in-dashboard feedback summarization & model charts
  const [chatQuery, setChatQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    sender: 'user' | 'ai';
    text: string;
    modelChart?: {
      name: string;
      brand: string;
      likePercent: number;
      dislikePercent: number;
      neutralPercent: number;
      totalAuditions: number;
      topPros: string[];
      topCons: string[];
      featuredItem?: FeedbackItem;
    };
  }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your dot Enterprise Intelligence Bot. Ask a question or pick a quick query below to summarize live customer feedback and generate model charts.',
    }
  ]);

  const handleSendChat = (promptText?: string) => {
    const text = promptText || chatQuery;
    if (!text.trim()) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text }]);
    setChatQuery('');
    setChatLoading(true);

    setTimeout(() => {
      const q = text.toLowerCase();
      const matchedPhone = PHONES.find(p => q.includes(p.name.toLowerCase()) || q.includes(p.brand.toLowerCase()));
      const targetFeedbacks = matchedPhone
        ? scopedFeedbackList.filter(f => f.phone === matchedPhone.id)
        : scopedFeedbackList;

      if (targetFeedbacks.length === 0) {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: matchedPhone
              ? `No customer feedback records have been submitted yet for ${matchedPhone.name}.`
              : 'No customer feedback records have been submitted yet. Charts will appear as soon as reviews arrive.',
          }
        ]);
        setChatLoading(false);
        return;
      }

      const total = targetFeedbacks.length;
      const likesCount = targetFeedbacks.filter(f => f.rating >= 4 || f.sentiment === 'positive').length;
      const dislikeCount = targetFeedbacks.filter(f => f.rating <= 2 || f.sentiment === 'negative').length;
      const likePercent = Math.round((likesCount / total) * 100);
      const dislikePercent = Math.round((dislikeCount / total) * 100);
      const neutralPercent = Math.max(0, 100 - likePercent - dislikePercent);
      const topPros = targetFeedbacks.map(f => f.like).filter(Boolean).slice(0, 2);
      const topCons = targetFeedbacks.map(f => f.dislike || f.improve).filter(Boolean).slice(0, 2);
      const displayPhone = matchedPhone || phoneById(targetFeedbacks[0].phone);

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Feedback synthesis for ${matchedPhone ? displayPhone.name : 'All Models'} (${total} live reviews):\n• Positive Satisfaction: ${likePercent}%\n• Negative Reports: ${dislikePercent}%`,
          modelChart: {
            name: matchedPhone ? displayPhone.name : 'All Reviewed Models',
            brand: matchedPhone ? displayPhone.brand : 'Multi-Brand',
            likePercent,
            dislikePercent,
            neutralPercent,
            totalAuditions: total,
            topPros: topPros.length > 0 ? topPros : ['No strengths recorded yet'],
            topCons: topCons.length > 0 ? topCons : ['No defects reported yet'],
            featuredItem: targetFeedbacks[0],
          }
        }
      ]);
      setChatLoading(false);
    }, 300);
  };

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* =========================================================================
          1. TOP COMPANY SECTION: ALL DATA OF FEEDBACK & EXECUTIVE INTELLIGENCE
          ========================================================================= */}
      <section id="section-overview" className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 shadow-xs mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OVERVIEW & ANALYTICS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Overview & Analytics
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl font-medium">
              Real-time video feedback, brand graphs, snooze controls, and subscription billing.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download all verified feedback rows to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSnoozeModal(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSnoozed 
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-black shadow-xs' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
              title="Inspect snooze status and timeline"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{isSnoozed ? '⏸️ Snoozed' : 'Snooze'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenSubscriptionModal ? onOpenSubscriptionModal() : handleOpenBuy('standard')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 ring-2 ring-amber-300/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>Upgrade</span>
            </button>
          </div>
        </div>

        {/* 6 Executive Feedback Metric Cards (Reflecting Subscription Figures across different section) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Film className="w-3.5 h-3.5 text-indigo-600" />
              <span>Verified Videos</span>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalReviews}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">1-min speaking reels</div>
          </div>

          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 relative overflow-hidden">
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[9px] font-black uppercase">
              Gemini AI
            </span>
            <div className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sentiment Score</span>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1 flex items-baseline gap-1">
              <span>{avgSentimentScore}%</span>
              <span className="text-xs font-bold text-emerald-900/60">/ 100</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              {avgSentimentScore >= 80 ? '🟢 Delighted Sentiment' : avgSentimentScore >= 60 ? '🟡 Balanced' : '🔴 Critical'}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Average Rating</span>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-1">
              <span>{avgRating}</span>
              <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Customer satisfaction</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Positive Ratio</span>
            </div>
            <div className="text-2xl font-black text-blue-600 mt-1">
              {highSentimentPercent}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{highSentimentCount} of {totalReviews} positive</div>
          </div>

          {/* ADDED FIGURE 1: Active Subscription Plan Figure */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-200">
            <div className="text-[11px] text-indigo-800 font-bold uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>Active Plan Figure</span>
            </div>
            <div className="text-xl font-black text-indigo-950 mt-1">
              {activePlan?.priceUSD ? `$${activePlan.priceUSD}` : '$0'} <span className="text-xs text-indigo-600 font-mono">/mo</span>
            </div>
            <div className="text-[11px] text-indigo-700 font-bold mt-0.5 truncate">{activePlan?.name || 'No Active Plan'}</div>
          </div>

          {/* ADDED FIGURE 2: Snooze & Quota Status Figure */}
          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200">
            <div className="text-[11px] text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Snooze Status</span>
            </div>
            <div className="text-lg font-black text-amber-950 mt-1">
              {isSnoozed ? 'Paused (30d)' : 'Auto-Renewing'}
            </div>
            <div className="text-[11px] text-amber-700 font-mono mt-0.5 font-bold">
              {remainingQuota} reviews left
            </div>
          </div>
        </div>

        {/* AI Category Synthesis Distribution Bar */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>AI Auto-Synthesis</span>
            </span>
            <span className="font-bold text-slate-700">Categorized Review Issues:</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterCategory(filterCategory === 'Bug Report' ? 'all' : 'Bug Report')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                filterCategory === 'Bug Report'
                  ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-200 shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800'
              }`}
            >
              <span>🐞 Bug Reports:</span>
              <span className="font-black font-mono">{bugReportsCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory(filterCategory === 'Feature Request' ? 'all' : 'Feature Request')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                filterCategory === 'Feature Request'
                  ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-200 shadow-xs'
                  : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-800'
              }`}
            >
              <span>💡 Feature Requests:</span>
              <span className="font-black font-mono">{featureRequestsCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory(filterCategory === 'Compliment' ? 'all' : 'Compliment')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                filterCategory === 'Compliment'
                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200 shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
              }`}
            >
              <span>💖 Compliments:</span>
              <span className="font-black font-mono">{complimentsCount}</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ONE-PAGE STICKY SECTION ANCHOR NAVIGATOR
          ========================================================================= */}
      <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 flex-wrap sticky top-16 z-20">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => { setActiveSubTab('overview'); scrollToAnchor('section-overview'); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-slate-900 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            🏠 Overview
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('snooze'); scrollToAnchor('section-snooze-data'); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'snooze'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-700 hover:text-slate-900 bg-amber-50 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>⏸️ Snooze</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('billing'); scrollToAnchor('section-billing'); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'billing'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-700 hover:text-slate-900 bg-indigo-50 border border-indigo-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>💳 Billing</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('video_table'); scrollToAnchor('section-video-table'); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'video_table'
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'text-slate-700 hover:text-slate-900 bg-purple-50 border border-purple-200'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-purple-600" />
            <span>🎬 Auditions</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('graphs_breakdown'); scrollToAnchor('section-graphs-breakdown'); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'graphs_breakdown'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-700 hover:text-slate-900 bg-emerald-50 border border-emerald-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>🍇 Graphs</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('pricing'); scrollToAnchor('section-pricing'); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'pricing'
                ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                : 'text-slate-700 hover:text-slate-900 bg-amber-50/70 border border-amber-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>💎 Plans</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('all'); scrollToAnchor('section-overview'); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeSubTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            🌟 All Data
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          Live Data
        </span>
      </div>

      {/* =========================================================================
          2. DEDICATED SNOOZE DATA CENTER SECTION (Addressing "Where is the snooze data")
          ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'snooze') && (
        <section id="section-snooze-data" className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-3xl p-6 shadow-sm border border-amber-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm ring-4 ring-amber-100">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">
                    Snooze Controls
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase ${
                    isSnoozed 
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300' 
                      : 'bg-emerald-500 text-white'
                  }`}>
                    {isSnoozed ? '⏸️ Snoozed' : '🟢 Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pause or resume auto-renewal with full data and quota protection.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleSnooze()}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                  isSnoozed
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {isSnoozed ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                <span>{isSnoozed ? 'Resume Billing' : 'Snooze (30d)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSnoozeModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs cursor-pointer"
              >
                Inspect Snooze Log
              </button>
            </div>
          </div>

          {/* SNOOZE TIMELINE & REAL-TIME DATA CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Snooze Duration</span>
              <div className="text-2xl font-black text-amber-700 mt-1">{snoozeDays} Days</div>
              <div className="flex items-center gap-1.5 mt-2">
                {[14, 30, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSnoozeDays(d);
                      if (isSnoozed) handleToggleSnooze(d);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      snoozeDays === d
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Billing Resumes On</span>
              <div className="text-xl font-black text-slate-900 mt-1">
                {isSnoozed ? 'Nov 29, 2026' : 'Immediate Renewal'}
              </div>
              <span className="text-[11px] text-amber-700 font-bold block mt-1">
                {isSnoozed ? 'Next charge deferred $0.00' : 'Regular cycle active'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Quota Preservation</span>
              <div className="text-xl font-black text-emerald-600 mt-1">
                {remainingQuota} {isUnlimited ? '' : 'Reviews'}
              </div>
              <span className="text-[11px] text-emerald-800 font-medium block mt-1">
                100% Frozen & Protected (No loss)
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Data Access Status</span>
              <div className="text-xl font-black text-indigo-700 mt-1">
                Full Access
              </div>
              <span className="text-[11px] text-indigo-900 font-medium block mt-1">
                All 129+ Models & Reels Unlocked
              </span>
            </div>
          </div>

          {/* SNOOZE DATA AUDIT LOG TABLE */}
          <div className="bg-white rounded-2xl border border-amber-200/70 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                <span>Snooze Activity & Audit Log (Computer / Desktop Data)</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">Real-time Cloud Log</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Duration</th>
                    <th className="py-2 px-3">Billing Resumes</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Audit Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {snoozeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                        No snooze activity recorded yet.
                      </td>
                    </tr>
                  ) : snoozeHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{item.date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          item.action === 'Snoozed' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{item.durationDays > 0 ? `${item.durationDays} Days` : 'N/A'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.resumesOn}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          3. CATEGORY GRAPHS BREAKDOWN (Addressing "bedroom into grapes")
          ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'graphs_breakdown') && (
        <section id="section-graphs-breakdown" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>CATEGORY GRAPHS</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Category Graphs
              </h3>
              <p className="text-xs text-slate-500">
                Visual sentiment and feedback breakdown across all device makers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-mono text-xs font-bold">
                8 Categories Active
              </span>
            </div>
          </div>

          {/* Comparative Graph Bars for each Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryGraphBreakdown.map((cat) => (
              <div key={cat.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:bg-slate-100/70 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <div>
                      <div className="text-sm font-black text-slate-900">{cat.name}</div>
                      <div className="text-[10px] text-slate-400">{cat.totalAuditions} speaking video audits</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-600 flex items-center justify-end gap-1">
                      <span>{cat.avgRating}</span>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold">{cat.likePercent}% Approval</span>
                  </div>
                </div>

                {/* Visual Stacked Graph Bar */}
                <div>
                  <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <div style={{ width: `${cat.likePercent}%` }} className="bg-emerald-500 h-full" title={`Liked: ${cat.likePercent}%`} />
                    <div style={{ width: `${cat.neutralPercent}%` }} className="bg-amber-400 h-full" title={`Neutral: ${cat.neutralPercent}%`} />
                    <div style={{ width: `${cat.dislikePercent}%` }} className="bg-rose-500 h-full" title={`Disliked: ${cat.dislikePercent}%`} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-1">
                    <span className="text-emerald-700">● {cat.likePercent}% Liked</span>
                    <span className="text-amber-700">● {cat.neutralPercent}% Neutral</span>
                    <span className="text-rose-700">● {cat.dislikePercent}% Disliked</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                    <span className="font-bold text-[10px] text-emerald-700 uppercase block">Top Praise:</span>
                    <span className="line-clamp-2">{cat.topPraise}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                    <span className="font-bold text-[10px] text-rose-700 uppercase block">Reported Fix:</span>
                    <span className="line-clamp-2">{cat.topBug}</span>
                  </div>
                </div>

                {onOpenVideoModal && cat.sampleFeedback && (
                  <button
                    type="button"
                    onClick={() => onOpenVideoModal(cat.sampleFeedback)}
                    className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-indigo-600" />
                    <span>Watch {cat.name} Speaking Video Reel</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          4. SUBSCRIPTION CART & INVOICES (Addressing "cart after buy subscription add to figure")
          ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'billing' || activeSubTab === 'cart_invoices') && (
        <section id="section-cart-invoices" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Subscription Invoices
                </h3>
                <p className="text-xs text-slate-500">
                  Payment receipts and transaction history.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200">
                {subscriptionOrders.length} Paid & Cleared
              </span>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3.5">Invoice ID</th>
                  <th className="py-3 px-3.5">Plan & Category Pass</th>
                  <th className="py-3 px-3.5">Billing Cycle</th>
                  <th className="py-3 px-3.5">Amount Paid</th>
                  <th className="py-3 px-3.5">Payment Rail & Ref ID</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {subscriptionOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      No subscription invoices yet. Completed subscription payments will appear here.
                    </td>
                  </tr>
                ) : subscriptionOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{order.id}</td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{order.planName}</div>
                      <div className="text-[10px] text-slate-400">{order.categoryPass}</div>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                        {order.billingCycle === 'yearly' ? '1-Year Annual' : 'Monthly'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-black text-slate-900">${order.amountUSD}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Rs. {order.amountNPR.toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-700">{order.paymentMethod}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{order.bankRefId}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-600">{order.date}</td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-200 flex items-center gap-1 w-fit">
                        <Check className="w-3 h-3" />
                        <span>{order.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptOrder(order)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                      >
                        <Receipt className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================================================================
          5. BILLING & QUOTA CARDS
          ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'overview' || activeSubTab === 'billing' || activeSubTab === 'snooze') && (
        <section id="section-billing" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Billing & Quota
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Active plan & quota usage</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* CARD 1: BILLING STATUS CARD */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-900/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-300 bg-emerald-400/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {activePlan?.priceUSD ? 'Billing Status: Active & Cleared' : 'Billing Status: Unsubscribed'}
                  </span>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>

                <h3 className="text-2xl font-black text-white tracking-tight">{activePlan?.name || 'No Active Plan'}</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Category Pass: <b className="text-amber-300">{activePlan?.categoryName || (activePlan?.targetCategory ? activePlan.targetCategory.toUpperCase() : 'Subscription Required')}</b>
                </p>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-black text-amber-400">${activePlan?.priceUSD || 0}</span>
                    <span className="text-xs text-slate-400 font-mono ml-1.5">/ month</span>
                  </div>
                  <span className="text-[11px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-lg font-mono">
                    {billingCycle === 'yearly' ? '1-Year Annual' : 'Monthly'}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Next Renewal: <b>Nov 29, 2026</b> ({isSnoozed ? 'Paused / Snoozed 30d' : 'Auto-Renewing'})</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSnooze()}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSnoozed
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
                  }`}
                >
                  {isSnoozed ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                  <span>{isSnoozed ? 'Resume' : 'Snooze (30d)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSubscriptionModal ? onOpenSubscriptionModal() : handleOpenBuy('premium')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all transform hover:scale-[1.02]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upgrade</span>
                </button>
              </div>
            </div>

            {/* CARD 2: REMAINING REVIEW QUOTA CARD */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                    Audition Quota Status
                  </span>
                  <Film className="w-5 h-5 text-indigo-600" />
                </div>

                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl mb-3">
                  <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider block">Remaining Review Quota</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-4xl font-black text-emerald-600 tracking-tight">{remainingQuota}</span>
                    <span className="text-xs font-bold text-emerald-800">{isUnlimited ? '' : 'video reviews left'}</span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between text-xs text-slate-600 font-semibold mb-1">
                  <span>{reviewsQuotaUsed} reviews consumed</span>
                  <span>{isUnlimited ? 'Unlimited Plan' : `${totalQuota} total limit`}</span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(8, quotaPercent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                  <span>Usage: {quotaPercent}%</span>
                  <span>Status: Operational</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenSubscriptionModal ? onOpenSubscriptionModal() : handleOpenBuy('standard')}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Add Quota / Upgrade</span>
                </button>
              </div>
            </div>

            {/* CARD 3: CLEAR LIST OF ACTIVE BENEFITS */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                    Plan Entitlements
                  </span>
                  <Award className="w-5 h-5 text-amber-500" />
                </div>

                <h4 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <span>Active Plan Benefits</span>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                    Included
                  </span>
                </h4>

                <ul className="mt-3 space-y-2 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2 text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><b>500+ Verified Video Audition Reviews</b> unlocked</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><b>Active Single Brand:</b> {activeSingleBrandFolder || 'Subscription Required'}</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><b>Gemini AI Auto-Tagging</b> & Sentiment Intelligence</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><b>Full Video Format Library</b> with 1-Click Playback</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><b>Domestic Bank (Global IME) & Wire Checkout</b> (0% fee)</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><b>Export Verified Feedback Data to CSV / Excel</b></span>
                  </li>
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Corporate SLA: Active</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 100% Unlocked
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          6. CATEGORY SECTION: MOBILE BRAND CATEGORY DIRECTORY & SWITCHER
          ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'overview' || activeSubTab === 'categories') && (
        <section id="section-categories" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Mobile Brand Category Directory
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
                Active Category Pass: {currentBrandPassInfo.brandName}
              </span>
              <span className="text-xs text-slate-500 font-bold">
                Showing {filteredFeedbackList.length} reviews
              </span>
            </div>
          </div>

          {/* Category Directory Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {brandFolderOptions.map((bf) => {
              const isSelected = selectedBrandFolder === bf.id;
              const isUnlocked = isBrandUnlocked(bf.id, user, activePlan);
              const count = isUnlocked
                ? scopedFeedbackList.filter((f) => getBrandFolder(f.phone, f.brandFolder) === bf.id).length
                : 0;

              return (
                <button
                  key={bf.id}
                  type="button"
                  onClick={() => setSelectedBrandFolder(bf.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs font-black'
                      : isUnlocked
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span>{bf.icon}</span>
                  <span>{bf.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-white/20 text-white' : isUnlocked ? 'bg-slate-200 text-slate-700' : 'bg-amber-200/70 text-amber-900'
                  }`}>
                    {isUnlocked ? count : 'Locked'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          7. PICTURE TABLE CATEGORY & VIDEO FORMAT MANAGER
          ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'overview' || activeSubTab === 'video_table') && (
        <section id="section-video-table" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Picture Table Category & Video Format Manager
              </h3>
            </div>
            <span className="text-xs text-slate-500">Device Photos, Star Ratings & 1-Click Video Auditions</span>
          </div>

          <Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-400">Loading video library...</div>}>
            <ModelVideoLibraryTable
              feedbackList={scopedFeedbackList}
              activePlan={activePlan}
              user={user}
              onOpenVideoModal={onOpenVideoModal || (() => {})}
              onOpenChatModal={onOpenChatModal || (() => {})}
              onOpenCartModal={onOpenCartModal || (() => {})}
              onOpenSubscriptionModal={onOpenSubscriptionModal || (() => {})}
            />
          </Suspense>
        </section>
      )}

      {/* =========================================================================
          8. AI DATA ANALYSIS INFOGRAPHIC DASHBOARD (MATCHING ATTACHED IMAGE)
          ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'ai_charts') && (
        <section id="section-infographic" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                AI Charts & Metrics
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCharts(!showCharts)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{showCharts ? 'Hide Charts' : 'Show Charts'}</span>
              </button>
            </div>
          </div>

          <Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-400">Loading AI analytics dashboard...</div>}>
            <AiDataAnalysisDashboard
              feedbackList={scopedFeedbackList}
              payments={payments}
              withdrawals={withdrawals}
              activePlan={activePlan}
              reviewsQuotaUsed={reviewsQuotaUsed}
              onOpenVideoModal={onOpenVideoModal}
            />
          </Suspense>

          {/* Interactive Recharts Sentiment Charts Toggle */}
          {showCharts && (
            <Suspense fallback={<div className="p-6 text-center text-xs font-semibold text-slate-400">Loading sentiment charts...</div>}>
              <div className="space-y-4 pt-2">
                <SentimentDistributionBarChart
                  feedbackList={filteredFeedbackList}
                  allFeedbackList={scopedFeedbackList}
                  selectedBrandFolder={selectedBrandFolder}
                  onSelectBrandFolder={setSelectedBrandFolder}
                  activeSentimentFilter={filterSentiment}
                  onSelectSentimentFilter={setFilterSentiment}
                  selectedPhone="all"
                  onSelectPhone={() => {}}
                />

                <SentimentTrendChart
                  feedbackList={filteredFeedbackList}
                  allFeedbackList={scopedFeedbackList}
                  selectedBrandFolder={selectedBrandFolder}
                  onSelectBrandFolder={setSelectedBrandFolder}
                />
              </div>
            </Suspense>
          )}
        </section>
      )}

      {/* =========================================================================
          9. ALL DATA OF FEEDBACK TABLE (COMPLETE SEARCHABLE, FILTERABLE DATA)
          ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'video_table' || activeSubTab === 'feedback_table') && (
        <section id="section-feedback-table" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
                <FileText className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  All Feedback Data Table
                </h3>
                <p className="text-xs text-slate-500">Every recorded video review with customer demographics, sentiment score, and quotes</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reviewer, city, model, issue..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 w-52 sm:w-64"
                />
              </div>

              {/* Sentiment filter */}
              <select
                value={filterSentiment}
                onChange={(e) => setFilterSentiment(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="all">All Sentiments</option>
                <option value="high">🟢 High Sentiment (80%+)</option>
                <option value="neutral">🟡 Neutral (60-79%)</option>
                <option value="negative">🔴 Critical (&lt;60%)</option>
              </select>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* The Data Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3.5">Reviewer & City</th>
                  <th className="py-3 px-3.5">Device Model</th>
                  <th className="py-3 px-3.5">AI Category</th>
                  <th className="py-3 px-3.5">Rating & Sentiment</th>
                  <th className="py-3 px-3.5">Core Liked</th>
                  <th className="py-3 px-3.5">Disliked / Fix</th>
                  <th className="py-3 px-3.5 text-right">Video Format</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredFeedbackList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                      No feedback records match the current filters.
                    </td>
                  </tr>
                ) : filteredFeedbackList.slice(0, 15).map((row) => {
                  const phone = phoneById(row.phone);
                  const score = getSentimentScore(row);
                  const cat = getFeedbackCategory(row);
                  const isExpanded = expandedRowId === row.id;

                  return (
                    <React.Fragment key={row.id}>
                      <tr 
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                      >
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            {row.userAvatar ? (
                              <img
                                src={row.userAvatar}
                                alt={row.user}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                                {(row.user || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{row.user}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{row.city}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={phone.img}
                              alt={phone.name}
                              className="w-7 h-7 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{phone.name}</div>
                              <div className="text-[10px] text-slate-400">{getBrandFolder(row.phone, row.brandFolder)}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 ${
                            cat === 'Bug Report'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : cat === 'Feature Request'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {cat === 'Bug Report' ? '🐞 Bug' : cat === 'Feature Request' ? '💡 Request' : '💖 Praise'}
                          </span>
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center text-amber-500 font-bold">
                              <span>{row.rating}</span>
                              <Star className="w-3.5 h-3.5 fill-amber-400 ml-0.5" />
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              {score}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3.5 max-w-xs truncate text-emerald-700 font-medium">
                          {row.like}
                        </td>

                        <td className="py-3 px-3.5 max-w-xs truncate text-rose-700 font-medium">
                          {row.dislike || row.improve || 'None mentioned'}
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenVideoModal) onOpenVideoModal(row);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all border border-indigo-200"
                          >
                            <Play className="w-3 h-3 fill-indigo-600" />
                            <span>Play Video</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-4 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="p-3 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] font-black uppercase text-emerald-700 block mb-1">What Customer Liked:</span>
                                <p className="text-slate-800">{row.like}</p>
                              </div>
                              <div className="p-3 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] font-black uppercase text-rose-700 block mb-1">What Customer Disliked:</span>
                                <p className="text-slate-800">{row.dislike || 'None'}</p>
                              </div>
                              <div className="p-3 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] font-black uppercase text-purple-700 block mb-1">Recommended Fix / Comfort:</span>
                                <p className="text-slate-800">{row.improve || row.comfort || 'Satisfactory'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 font-medium">
            <span>Showing top 15 of {filteredFeedbackList.length} reviews</span>
            <button
              type="button"
              onClick={handleExportCSV}
              className="text-indigo-600 font-bold hover:underline"
            >
              Export subscribed brand database ({scopedFeedbackList.length} rows) to CSV →
            </button>
          </div>
        </section>
      )}

      {/* =========================================================================
          10. INTERACTIVE AI CHATBOT WITH MODEL CHARTS
          ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'ai_chatbot') && (
        <section id="section-chatbot" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  AI Feedback Assistant & Interactive Model Charts
                </h3>
                <p className="text-xs text-slate-500">Ask any question to summarize customer feedback data or generate model comparison charts</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
              Gemini 2.5 Intelligence
            </span>
          </div>

          {/* Quick Prompts Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Quick Queries:</span>
            {[
              'Summarize Samsung Galaxy S25 Ultra feedback',
              'Show satisfaction chart for iPhone 16 Pro',
              'What are top camera complaints across all phones?',
              'Summarize all feedback data',
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendChat(p)}
                className="shrink-0 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl text-xs ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white ml-auto max-w-lg font-bold'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 space-y-3'
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                {/* Render interactive model chart if attached */}
                {msg.modelChart && (
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="text-xs font-black text-slate-900">{msg.modelChart.name}</span>
                          <span className="text-[10px] text-slate-400 block">{msg.modelChart.brand} • {msg.modelChart.totalAuditions} Video Auditions</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {msg.modelChart.likePercent}% Satisfied
                      </span>
                    </div>

                    {/* Stacked Sentiment Bar */}
                    <div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div style={{ width: `${msg.modelChart.likePercent}%` }} className="bg-emerald-500 h-full" title={`Liked: ${msg.modelChart.likePercent}%`} />
                        <div style={{ width: `${msg.modelChart.neutralPercent}%` }} className="bg-amber-400 h-full" title={`Neutral: ${msg.modelChart.neutralPercent}%`} />
                        <div style={{ width: `${msg.modelChart.dislikePercent}%` }} className="bg-rose-500 h-full" title={`Disliked: ${msg.modelChart.dislikePercent}%`} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-1">
                        <span className="text-emerald-700">● {msg.modelChart.likePercent}% Liked</span>
                        <span className="text-amber-700">● {msg.modelChart.neutralPercent}% Neutral</span>
                        <span className="text-rose-700">● {msg.modelChart.dislikePercent}% Disliked</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900">
                        <span className="font-black block text-[10px] uppercase text-emerald-800">Top Verified Praises:</span>
                        <ul className="list-disc list-inside space-y-0.5 mt-0.5 font-medium">
                          {msg.modelChart.topPros.map((pro, i) => (
                            <li key={i}>{pro}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/80 text-rose-900">
                        <span className="font-black block text-[10px] uppercase text-rose-800">Primary Complaints:</span>
                        <ul className="list-disc list-inside space-y-0.5 mt-0.5 font-medium">
                          {msg.modelChart.topCons.map((con, i) => (
                            <li key={i}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {msg.modelChart.featuredItem && onOpenVideoModal && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Speaking Video Audition Available</span>
                        <button
                          type="button"
                          onClick={() => onOpenVideoModal(msg.modelChart!.featuredItem!)}
                          className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Watch Model Review</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Gemini is synthesizing video feedback and assembling model sentiment chart...</span>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Ask for feedback data summary (e.g. 'How many users like Samsung S24 Ultra?')..."
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => handleSendChat()}
              disabled={chatLoading || !chatQuery.trim()}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          </div>
        </section>
      )}

      {/* =========================================================================
          11. 3-TIER SUBSCRIPTION PRICING CARDS (MATCHING ATTACHED VECTOR ARTWORK)
          ========================================================================= */}
      {(activeSubTab === 'all' || activeSubTab === 'pricing') && (
        <section id="section-pricing" className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">
              <CreditCard className="w-3.5 h-3.5" />
              <span>PLANS</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Subscription Plans
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Select review quota and brand access. Supports domestic bank wire (Global IME) and online cards.
            </p>

            {/* Monthly vs 1-Year Plan Selector */}
            <div className="inline-flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 mt-2">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Plan
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>1-Year Plan</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase">
                  Save 25%
                </span>
              </button>
            </div>
          </div>

          {/* Category Pass Selector for Tier 1 (Basic) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-4xl mx-auto shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Select Single Brand Pass (1 Subscription = 1 Brand)
                </div>
                <div className="text-xs text-slate-500">
                  Choose which smartphone brand to unlock. To view another brand later, purchase a subscription for that brand:
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {BRAND_CATEGORY_PASSES.map((brand) => (
                <button
                  key={brand.brandId}
                  type="button"
                  onClick={() => setSelectedBrandPass(brand.brandId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedBrandPass === brand.brandId
                      ? 'bg-teal-600 text-white shadow-xs font-black ring-2 ring-teal-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {brand.brandName}
                </button>
              ))}
            </div>
          </div>

          {/* 3-Tier Curved Vector Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch pt-3">
            {/* TIER 1: BASIC (TEAL PAPER PLANE) */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-lg border border-slate-200 flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 relative">
              <div className="bg-[#00a896] text-white p-6 pb-8 relative flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 mb-2 flex items-center justify-center relative">
                  <svg viewBox="0 0 100 100" className="w-16 h-16 text-white drop-shadow">
                    <path
                      d="M10 50 L90 15 L55 85 L45 55 Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <path d="M45 55 L90 15" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                    <line x1="5" y1="35" x2="25" y2="35" stroke="currentColor" strokeWidth="3" opacity="0.6" />
                    <line x1="2" y1="45" x2="18" y2="45" stroke="currentColor" strokeWidth="3" opacity="0.6" />
                  </svg>
                </div>
                <h4 className="text-2xl font-black tracking-wider uppercase">BASIC</h4>
                <span className="text-xs text-teal-100 font-bold mt-0.5">
                  ({currentBrandPassInfo.brandName} Pass)
                </span>
                <div className="absolute -bottom-4 left-0 right-0 h-8 bg-white rounded-t-[28px]" />
              </div>

              <div className="p-6 pt-2 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-baseline justify-center gap-1 border-b border-slate-100 pb-4">
                    <span className="text-2xl font-black text-slate-800">$</span>
                    <span className="text-5xl font-black text-slate-900 tracking-tight">{basicPrice.split('.')[0]}</span>
                    <div className="text-left leading-tight ml-1">
                      <span className="text-base font-black text-slate-800">99</span>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">
                        PER {billingCycle === 'yearly' ? 'YEAR' : 'MONTH'}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2 font-bold text-teal-700">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      <span>FREE SUPPORT 24/7</span>
                    </li>
                    <li className="flex items-center gap-2 font-bold text-teal-700">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      <span>DATABASES DOWNLOAD</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <Check className="w-3.5 h-3.5 text-teal-600" />
                      <span>Unlocks all models for <b>{currentBrandPassInfo.brandName}</b></span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <Check className="w-3.5 h-3.5 text-teal-600" />
                      <span><b>{billingCycle === 'yearly' ? '200' : '150'}</b> 1-Min Video Auditions</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <Check className="w-3.5 h-3.5 text-teal-600" />
                      <span>Domestic Bank / Online Wallet</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenBuy('basic')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#2b2d42] hover:bg-black text-white font-black text-sm tracking-wider uppercase transition-all shadow-md cursor-pointer text-center"
                >
                  BUY
                </button>
              </div>
            </div>

            {/* TIER 2: STANDARD (ORANGE AIRPLANE - RECOMMENDED) */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl border-2 border-orange-400 flex flex-col transition-all hover:-translate-y-2 relative transform lg:-scale-y-0 lg:z-10 ring-4 ring-orange-200/50">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-center py-1.5 text-[11px] font-black uppercase tracking-widest">
                ★ MOST POPULAR ENTERPRISE PASS ★
              </div>

              <div className="bg-[#f77f00] text-white p-7 pb-9 relative flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 mb-2 flex items-center justify-center relative">
                  <svg viewBox="0 0 120 80" className="w-20 h-16 text-white drop-shadow">
                    <path
                      d="M10 45 Q30 45 45 42 L60 20 L75 20 L68 40 L95 40 Q110 40 115 48 Q110 56 95 56 L35 56 Q15 56 10 45 Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinejoin="round"
                    />
                    <path d="M50 48 L70 70 L85 70 L72 48" fill="none" stroke="currentColor" strokeWidth="5" />
                    <circle cx="85" cy="48" r="3" fill="currentColor" />
                    <circle cx="95" cy="48" r="3" fill="currentColor" />
                    <circle cx="75" cy="48" r="3" fill="currentColor" />
                  </svg>
                </div>
                <h4 className="text-3xl font-black tracking-wider uppercase">PRO</h4>
                <span className="text-xs text-orange-100 font-bold mt-0.5">
                  ({currentBrandPassInfo.brandName} Only)
                </span>
                <div className="absolute -bottom-4 left-0 right-0 h-8 bg-white rounded-t-[28px]" />
              </div>

              <div className="p-6 pt-2 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-baseline justify-center gap-1 border-b border-slate-100 pb-4">
                    <span className="text-2xl font-black text-slate-800">$</span>
                    <span className="text-5xl font-black text-slate-900 tracking-tight">{standardPrice.split('.')[0]}</span>
                    <div className="text-left leading-tight ml-1">
                      <span className="text-base font-black text-slate-800">99</span>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">
                        PER {billingCycle === 'yearly' ? 'YEAR' : 'MONTH'}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2 font-bold text-orange-700">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>FREE SUPPORT 24/7</span>
                    </li>
                    <li className="flex items-center gap-2 font-bold text-orange-700">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>DATABASES DOWNLOAD</span>
                    </li>
                    <li className="flex items-center gap-2 font-bold text-orange-700">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>MAINTENANCE EMAIL</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-800 font-bold">
                      <Check className="w-3.5 h-3.5 text-orange-600" />
                      <span>{billingCycle === 'yearly' ? '600' : '500'} Video Audition Reviews / month</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-800 font-bold">
                      <Check className="w-3.5 h-3.5 text-orange-600" />
                      <span>Unlocks {currentBrandPassInfo.brandName} Only (1 Brand)</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <Check className="w-3.5 h-3.5 text-orange-600" />
                      <span>Full AI Chatbot & Model Charts access</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenBuy('standard')}
                  className="w-full py-4 px-4 rounded-2xl bg-[#2b2d42] hover:bg-black text-white font-black text-base tracking-wider uppercase transition-all shadow-lg cursor-pointer text-center ring-2 ring-orange-400"
                >
                  BUY
                </button>
              </div>
            </div>

            {/* TIER 3: PREMIUM (PURPLE ROCKET) */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-lg border border-slate-200 flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 relative">
              <div className="bg-[#6a0dad] text-white p-6 pb-8 relative flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 mb-2 flex items-center justify-center relative">
                  <svg viewBox="0 0 100 100" className="w-16 h-16 text-white drop-shadow">
                    <path
                      d="M50 15 Q65 35 65 65 L35 65 Q35 35 50 15 Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinejoin="round"
                    />
                    <circle cx="50" cy="45" r="8" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path d="M35 55 L20 70 L35 65" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path d="M65 55 L80 70 L65 65" fill="none" stroke="currentColor" strokeWidth="4" />
                    <line x1="45" y1="70" x2="45" y2="82" stroke="currentColor" strokeWidth="4" />
                    <line x1="55" y1="70" x2="55" y2="82" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </div>
                <h4 className="text-2xl font-black tracking-wider uppercase">UNLIMITED</h4>
                <span className="text-xs text-purple-200 font-bold mt-0.5">
                  ({currentBrandPassInfo.brandName} Unlimited)
                </span>
                <div className="absolute -bottom-4 left-0 right-0 h-8 bg-white rounded-t-[28px]" />
              </div>

              <div className="p-6 pt-2 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-baseline justify-center gap-1 border-b border-slate-100 pb-4">
                    <span className="text-2xl font-black text-slate-800">$</span>
                    <span className="text-5xl font-black text-slate-900 tracking-tight">{premiumPrice.split('.')[0]}</span>
                    <div className="text-left leading-tight ml-1">
                      <span className="text-base font-black text-slate-800">99</span>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">
                        PER {billingCycle === 'yearly' ? 'YEAR' : 'MONTH'}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2 font-bold text-purple-700">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>FREE SUPPORT 24/7</span>
                    </li>
                    <li className="flex items-center gap-2 font-bold text-purple-700">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>DATABASES DOWNLOAD</span>
                    </li>
                    <li className="flex items-center gap-2 font-bold text-purple-700">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>MAINTENANCE EMAIL</span>
                    </li>
                    <li className="flex items-center gap-2 font-bold text-purple-700">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>UNLIMITED TRAFFIC</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-800 font-bold">
                      <Check className="w-3.5 h-3.5 text-purple-600" />
                      <span>Unlimited Video Auditions (No Cap)</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-600">
                      <Check className="w-3.5 h-3.5 text-purple-600" />
                      <span>Priority Corporate SLA & 24/7 Phone Support</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenBuy('premium')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#2b2d42] hover:bg-black text-white font-black text-sm tracking-wider uppercase transition-all shadow-md cursor-pointer text-center"
                >
                  BUY
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SNOOZE MANAGEMENT DETAIL MODAL (Desktop / Computer Inspection)
          ========================================================================= */}
      {showSnoozeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-4">
            <button
              onClick={() => setShowSnoozeModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Snooze Details & Settings</h3>
                <span className="text-xs text-slate-500">Auto-Renewal Pause Control Center</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                  {isSnoozed ? '⏸️ Auto-Renewal Paused (30 Days Left)' : '🟢 Active Auto-Renewal'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resumption Date:</span>
                <span className="font-bold text-slate-900">Nov 29, 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reviews Quota:</span>
                <span className="font-bold text-emerald-600">{remainingQuota} Unused Reviews Frozen</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Charge:</span>
                <span className="font-bold text-slate-900">$0.00 during pause</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Select Snooze Window:</span>
              <div className="grid grid-cols-4 gap-2">
                {[14, 30, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSnoozeDays(d);
                      handleToggleSnooze(d);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      snoozeDays === d
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <b>Guaranteed Data Safety:</b> No video audits or customer records are removed while snoozed. You retain 100% access to view and analyze your data.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleToggleSnooze();
                  setShowSnoozeModal(false);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm ${
                  isSnoozed ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {isSnoozed ? 'Resume Regular Auto-Renewal' : 'Confirm Snooze'}
              </button>

              <button
                type="button"
                onClick={() => setShowSnoozeModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RECEIPT / INVOICE MODAL FOR PURCHASED SUBSCRIPTION
          ========================================================================= */}
      {selectedReceiptOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-4">
            <button
              onClick={() => setSelectedReceiptOrder(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Official Subscription Invoice</h3>
                <span className="text-xs text-slate-500 font-mono">{selectedReceiptOrder.id} • Verified</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan Name:</span>
                <span className="font-bold text-slate-900">{selectedReceiptOrder.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category Pass:</span>
                <span className="font-bold text-indigo-700">{selectedReceiptOrder.categoryPass}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-bold text-slate-900">{selectedReceiptOrder.billingCycle === 'yearly' ? '1-Year Annual' : 'Monthly'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount USD:</span>
                <span className="font-black text-emerald-600">${selectedReceiptOrder.amountUSD}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount NPR:</span>
                <span className="font-bold text-slate-900 font-mono">Rs. {selectedReceiptOrder.amountNPR.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Rail:</span>
                <span className="font-bold text-slate-800">{selectedReceiptOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Ref:</span>
                <span className="font-mono text-slate-900">{selectedReceiptOrder.bankRefId}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
                  {selectedReceiptOrder.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReceiptOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAYMENT CHECKOUT MODAL (NEPAL BANK WIRE/QR, CONNECTIPS, ESEWA, KHALTI, CARD)
          ========================================================================= */}
      {checkoutPlan && (
        <Suspense fallback={null}>
          <PaymentCheckoutModal
            isOpen={true}
            onClose={() => setCheckoutPlan(null)}
            plan={checkoutPlan}
            billingCycle={billingCycle}
            selectedBrandCategory={selectedBrandPass}
            brandCategoryInfo={currentBrandPassInfo}
            user={user}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </Suspense>
      )}
    </div>
  );
};
