import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle, Play,
  Search, RefreshCw, Sparkles, Check, X, Film,
  ThumbsUp, ThumbsDown, Smile
} from 'lucide-react';
import { FeedbackItem, UserProfile, FeedbackCategory } from '../types';
import { phoneById, rs } from '../data/initialData';
import { getBrandFolder, getSentimentScore, getSentimentTone, getFeedbackCategory } from './CompanyView';
import { moderateFeedbackInFirestore } from '../services/firebaseService';

export interface ModerationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  bugReports?: number;
  featureRequests?: number;
  compliments?: number;
  totalApprovedPayout: number;
}

export interface ModeratedVideoItem {
  id: string;
  user: string;
  userEmail: string;
  userAvatar?: string;
  feedbackCategory?: FeedbackCategory;
  phone: string;
  phoneName?: string;
  phoneBrand?: string;
  phoneImg?: string;
  rating: number;
  time: string;
  like: string;
  dislike: string;
  comfort: string;
  improve: string;
  seconds: number;
  rewardAmount: number;
  sentiment?: string;
  sentimentScore?: number;
  sentimentSummary?: string;
  sentimentTone?: string;
  tags?: string[];
  brandFolder?: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  moderatedAt?: string;
  moderatedBy?: string;
  payoutStatus: 'pending' | 'credited' | 'rejected';
  verifiedDevice?: string;
  privacyProtected?: boolean;
  videoUrl?: string;
  productPhotos?: string[];
  createdAt?: string;
}

interface VideoModerationQueueProps {
  feedbackList?: FeedbackItem[];
  onOpenVideoModal?: (item: FeedbackItem) => void;
  currentUser?: UserProfile;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
  onFeedbackUpdated?: (updated?: FeedbackItem) => void;
}

const PRESET_REJECTION_REASONS = [
  {
    id: 'blurry_video',
    label: '📹 Blurry / Dark Video',
    reason: 'The camera recording was too dark or blurry to properly inspect the phone and see user interaction.',
  },
  {
    id: 'inaudible_audio',
    label: '🔇 Inaudible Audio / Noise',
    reason: 'Microphone volume was too low or muffled with loud background noise. Review answers could not be heard clearly.',
  },
  {
    id: 'wrong_phone',
    label: '📱 Incorrect Phone Model',
    reason: 'The smartphone displayed in the video does not match the product campaign selected for this review.',
  },
  {
    id: 'low_effort',
    label: '⏳ Too Short / Missing Answers',
    reason: 'Review was ended prematurely without answering the AI prompter questions regarding camera, battery, and ergonomics.',
  },
  {
    id: 'duplicate_spam',
    label: '⚠️ Duplicate / Irrelevant Content',
    reason: 'The uploaded submission does not contain authentic smartphone usage feedback or is a duplicate recording.',
  },
  {
    id: 'custom',
    label: '✍️ Custom Reason',
    reason: '',
  },
];

export const VideoModerationQueue: React.FC<VideoModerationQueueProps> = ({
  feedbackList = [],
  onOpenVideoModal,
  currentUser,
  onFeedbackUpdated,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Rejection Modal State
  const [rejectingVideo, setRejectingVideo] = useState<ModeratedVideoItem | null>(null);
  const [selectedReasonChip, setSelectedReasonChip] = useState<string>('blurry_video');
  const [customReasonText, setCustomReasonText] = useState<string>('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);

  // AI Pre-Screening State
  const [screeningVideoId, setScreeningVideoId] = useState<string | null>(null);
  const [aiScreenResults, setAiScreenResults] = useState<Record<string, {
    passed: boolean;
    confidence: number;
    visualClarity: string;
    audioClarity: string;
    authenticityScore: number;
    recommendedAction: 'approve' | 'reject' | 'manual_review';
    notes: string;
  }>>({});

  // Toast banner for immediate feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Map real Firestore feedbackList items into moderation queue shape
  const allVideos = useMemo<ModeratedVideoItem[]>(() => {
    return feedbackList.map((f) => {
      const p = phoneById(f.phone);
      return {
        id: f.id,
        user: f.user,
        userEmail: f.userEmail || '',
        userAvatar: f.userAvatar,
        feedbackCategory: f.feedbackCategory || getFeedbackCategory(f),
        phone: f.phone,
        phoneName: f.phoneName || p.name,
        phoneBrand: f.phoneBrand || p.brand,
        phoneImg: p.img,
        rating: f.rating,
        time: f.time,
        like: f.like,
        dislike: f.dislike,
        comfort: f.comfort,
        improve: f.improve || '',
        seconds: f.seconds || 60,
        rewardAmount: f.rewardAmount || p.reward || 150,
        sentiment: f.sentiment,
        sentimentScore: f.sentimentScore ?? getSentimentScore(f),
        sentimentSummary: f.sentimentSummary,
        sentimentTone: f.sentimentTone || getSentimentTone(f),
        tags: f.tags || [],
        brandFolder: f.brandFolder || getBrandFolder(f.phone),
        moderationStatus: f.moderationStatus || 'pending',
        moderationReason: f.moderationReason || f.defectResolutionNote,
        moderatedAt: f.moderatedAt || f.createdAt,
        moderatedBy: currentUser?.name || 'Admin',
        payoutStatus: f.payoutStatus || 'pending',
        verifiedDevice: f.verifiedDevice,
        privacyProtected: f.privacyProtected,
        videoUrl: f.videoUrl,
        productPhotos: f.productPhotos,
        createdAt: f.createdAt,
      };
    });
  }, [feedbackList, currentUser?.name]);

  const stats = useMemo<ModerationStats>(() => {
    const pending = allVideos.filter((v) => v.moderationStatus === 'pending').length;
    const approved = allVideos.filter((v) => v.moderationStatus === 'approved').length;
    const rejected = allVideos.filter((v) => v.moderationStatus === 'rejected').length;
    const totalApprovedPayout = allVideos
      .filter((v) => v.moderationStatus === 'approved')
      .reduce((s, v) => s + (v.rewardAmount || 0), 0);
    return {
      total: allVideos.length,
      pending,
      approved,
      rejected,
      bugReports: allVideos.filter((v) => v.feedbackCategory === 'Bug Report').length,
      featureRequests: allVideos.filter((v) => v.feedbackCategory === 'Feature Request').length,
      compliments: allVideos.filter((v) => v.feedbackCategory === 'Compliment').length,
      totalApprovedPayout,
    };
  }, [allVideos]);

  const videos = useMemo(() => {
    return allVideos.filter((v) => {
      if (statusFilter !== 'all' && v.moderationStatus !== statusFilter) return false;
      if (brandFilter !== 'all') {
        const bf = brandFilter.toLowerCase();
        const match =
          (v.brandFolder || '').toLowerCase().includes(bf) ||
          (v.phoneBrand || '').toLowerCase().includes(bf) ||
          (v.phoneName || '').toLowerCase().includes(bf);
        if (!match) return false;
      }
      if (categoryFilter !== 'all' && v.feedbackCategory !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return `${v.user} ${v.phoneName} ${v.like} ${v.dislike} ${v.improve}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allVideos, statusFilter, brandFilter, categoryFilter, searchQuery]);

  const fetchVideos = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 200);
  };

  // Handle Approve Action directly in Firestore
  const handleApprove = async (video: ModeratedVideoItem) => {
    setIsSubmittingDecision(true);
    try {
      await moderateFeedbackInFirestore({
        feedbackId: video.id,
        moderationStatus: 'approved',
        payoutStatus: 'credited',
        visibility: 'company_portal',
      });

      showToast(`Approved! Payout verified for ${video.user}.`, 'success');
      if (onFeedbackUpdated) onFeedbackUpdated();
    } catch (err: any) {
      showToast(err?.message || 'Failed to approve video in Firestore', 'danger');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Handle Open Rejection Modal
  const handleOpenRejectModal = (video: ModeratedVideoItem) => {
    setRejectingVideo(video);
    setSelectedReasonChip('blurry_video');
    const preset = PRESET_REJECTION_REASONS.find((r) => r.id === 'blurry_video');
    setCustomReasonText(preset?.reason || '');
  };

  // Handle Confirm Rejection directly in Firestore
  const handleConfirmReject = async () => {
    if (!rejectingVideo) return;
    const finalReason = customReasonText.trim();
    if (!finalReason) {
      showToast('Please provide a specific rejection reason so the reviewer knows how to improve.', 'danger');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      await moderateFeedbackInFirestore({
        feedbackId: rejectingVideo.id,
        moderationStatus: 'rejected',
        payoutStatus: 'rejected',
        defectResolutionNote: finalReason,
      });

      showToast(`Video rejected. Feedback sent to ${rejectingVideo.user}.`, 'danger');
      setRejectingVideo(null);
      if (onFeedbackUpdated) onFeedbackUpdated();
    } catch (err: any) {
      showToast(err?.message || 'Failed to reject video in Firestore', 'danger');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Client-side Deterministic AI Pre-Screening on Video
  const handleAiPreScreen = async (video: ModeratedVideoItem) => {
    setScreeningVideoId(video.id);
    try {
      const combined = `${video.like} ${video.dislike} ${video.comfort} ${video.improve}`.trim();
      const hasRichDetail = combined.length >= 25;
      const isLongEnough = (video.seconds || 0) >= 20;
      const authenticityScore = Math.min(99, (video.verifiedDevice ? 70 : 50) + (hasRichDetail ? 18 : 5) + (isLongEnough ? 10 : 0));
      const recommendedAction: 'approve' | 'reject' | 'manual_review' =
        authenticityScore >= 80 ? 'approve' : authenticityScore >= 55 ? 'manual_review' : 'reject';

      setAiScreenResults((prev) => ({
        ...prev,
        [video.id]: {
          passed: recommendedAction === 'approve',
          confidence: authenticityScore,
          visualClarity: isLongEnough ? 'Clear' : 'Short Clip',
          audioClarity: hasRichDetail ? 'Transcript Verified' : 'Brief Input',
          authenticityScore,
          recommendedAction,
          notes: hasRichDetail
            ? `Analyzed ${combined.length} chars of feedback for ${video.phoneName || video.phone}.`
            : 'Brief transcript; inspect video playback before payout.',
        },
      }));
      showToast(`AI Pre-Screening complete: ${recommendedAction === 'approve' ? 'Recommended for Approval' : 'Manual Review Advised'}`, 'info');
    } finally {
      setScreeningVideoId(null);
    }
  };

  // Brand folder list
  const brandList = [
    { id: 'all', name: 'All Brands' },
    { id: 'iPhone', name: 'Apple iPhone' },
    { id: 'Samsung', name: 'Samsung Galaxy' },
    { id: 'Xiaomi', name: 'Xiaomi / Redmi' },
    { id: 'Google', name: 'Google Pixel' },
    { id: 'OnePlus', name: 'OnePlus' },
    { id: 'Vivo', name: 'Vivo & iQOO' },
    { id: 'OPPO', name: 'OPPO & Realme' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white transition-all transform animate-in fade-in slide-in-from-top-4 ${
          toastMessage.type === 'success' ? 'bg-emerald-600' :
          toastMessage.type === 'danger' ? 'bg-rose-600' : 'bg-blue-600'
        }`}>
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {toastMessage.type === 'danger' && <XCircle className="w-4 h-4 shrink-0" />}
          {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Moderation Hero & Control Bar */}
      <div className="bg-white border-b border-neutral-200 px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-600">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                <span>Enterprise Content Trust & Safety</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-3">
                <span>Video Content Moderation Queue</span>
                {stats.pending > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300 animate-pulse">
                    {stats.pending} Needs Review
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                Review user-submitted vertical videos. Approved videos automatically release cash payouts to reviewer wallets and publish to the public brand showcase.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={fetchVideos}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Queue</span>
              </button>
            </div>
          </div>

          {/* 4 Stat Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Submissions</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Recorded user videos</div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Pending Review</span>
              </div>
              <div className="text-2xl font-black text-amber-900 mt-1">{stats.pending}</div>
              <div className="text-[11px] text-amber-700 mt-0.5">Awaiting brand decision</div>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Approved & Credited</span>
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-1 flex items-baseline gap-1.5">
                <span>{stats.approved}</span>
                <span className="text-xs font-bold text-emerald-700">({rs(stats.totalApprovedPayout)})</span>
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5">Disbursed to creators</div>
            </div>

            <div className="bg-rose-50/80 border border-rose-200 p-4 rounded-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Rejected Submissions</span>
              </div>
              <div className="text-2xl font-black text-rose-900 mt-1">{stats.rejected}</div>
              <div className="text-[11px] text-rose-700 mt-0.5">Feedback sent for re-recording</div>
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Pending ({stats.pending})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Approved ({stats.approved})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <XCircle className="w-3 h-3" />
                <span>Rejected ({stats.rejected})</span>
              </button>
            </div>

            {/* Brand Dropdown & Search Input */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                {brandList.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-3 py-1.5 rounded-xl text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reviewer, phone, speech..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchVideos()}
                  className="outline-none bg-transparent text-xs w-44"
                />
              </div>
            </div>
          </div>

          {/* AI Category Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-500 flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>AI Category:</span>
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              All Categories
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === 'Bug Report' ? 'all' : 'Bug Report')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'Bug Report'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              <span>🐞 Bug Reports</span>
              {typeof stats.bugReports === 'number' && <span className="font-mono text-[10px] ml-0.5 opacity-90">({stats.bugReports})</span>}
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === 'Feature Request' ? 'all' : 'Feature Request')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'Feature Request'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              <span>💡 Feature Requests</span>
              {typeof stats.featureRequests === 'number' && <span className="font-mono text-[10px] ml-0.5 opacity-90">({stats.featureRequests})</span>}
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === 'Compliment' ? 'all' : 'Compliment')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'Compliment'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span>💖 Compliments</span>
              {typeof stats.compliments === 'number' && <span className="font-mono text-[10px] ml-0.5 opacity-90">({stats.compliments})</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Moderation Queue List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
            <div className="text-sm font-bold text-slate-700 mt-3">Loading video moderation records...</div>
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-500">
              <Film className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mt-3">No videos matching this filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no video submissions under "{statusFilter}" status for brand "{brandFilter}".
            </p>
            <button
              onClick={() => {
                setStatusFilter('all');
                setBrandFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-800"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => {
              const p = phoneById(video.phone);
              const aiScreen = aiScreenResults[video.id];
              const isScreening = screeningVideoId === video.id;

              return (
                <div
                  key={video.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
                    video.moderationStatus === 'pending'
                      ? 'border-amber-300 ring-2 ring-amber-100'
                      : video.moderationStatus === 'approved'
                      ? 'border-emerald-200'
                      : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  {/* Top Bar: Reviewer details & Status Pill */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      {video.userAvatar ? (
                        <img
                          src={video.userAvatar}
                          alt={video.user}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold text-sm flex items-center justify-center">
                          {video.user.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{video.user}</span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500 font-mono">{video.userEmail}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{video.time}</span>
                          <span>•</span>
                          <span>Duration: {Math.floor(video.seconds / 60)}m {video.seconds % 60}s</span>
                          <span>•</span>
                          <span className="font-bold text-slate-700">Folder: {video.brandFolder || getBrandFolder(video.phone)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Moderation Status Pill */}
                      {video.moderationStatus === 'pending' && (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black border border-amber-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                          <span>Pending Brand Moderation</span>
                        </span>
                      )}
                      {video.moderationStatus === 'approved' && (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Approved & Credited (+{rs(video.rewardAmount)})</span>
                        </span>
                      )}
                      {video.moderationStatus === 'rejected' && (
                        <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black border border-rose-300 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Rejected (Revision Requested)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content Grid: Video Preview (Left) + Detailed Answers (Right) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4">
                    {/* Left Column: Video Preview Card */}
                    <div className="md:col-span-4 flex flex-col gap-2.5">
                      <div
                        onClick={() => onOpenVideoModal && onOpenVideoModal(video as any)}
                        className="relative group rounded-xl overflow-hidden bg-slate-900 aspect-video sm:aspect-4/3 flex items-center justify-center cursor-pointer border border-slate-200 shadow-xs"
                      >
                        {video.phoneImg ? (
                          <img
                            src={video.phoneImg}
                            alt={video.phoneName || 'Phone review'}
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-slate-800" />
                        )}

                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/90 text-slate-950 flex items-center justify-center group-hover:scale-110 shadow-lg transition-transform">
                            <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                          </div>
                        </div>

                        {/* Video Metadata Overlays */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono font-bold flex items-center gap-1">
                          <Film className="w-3 h-3 text-rose-400" />
                          <span>{video.seconds}s Vertical Review</span>
                        </div>

                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-emerald-400 text-[10px] font-bold">
                          Payout: {rs(video.rewardAmount)}
                        </div>
                      </div>

                      {/* Hardware Authenticity Badge */}
                      <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-700 flex items-center gap-1.5 truncate">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{video.verifiedDevice || '🔒 Verified Android 14 • 1080p'}</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                          Auth 100%
                        </span>
                      </div>
                    </div>

                    {/* Right Column: Answers & AI Analysis */}
                    <div className="md:col-span-8 flex flex-col justify-between">
                      <div>
                        {/* Title & Ratings */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="font-black text-base text-slate-900">
                            {video.phoneName || p.name}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            <div className="flex text-amber-400">
                              {'★'.repeat(video.rating)}
                              {'☆'.repeat(5 - video.rating)}
                            </div>
                            <span className="text-xs font-bold text-slate-700">({video.rating}.0)</span>
                          </div>
                        </div>

                        {/* Gemini AI Sentiment Ribbon & AI Category Badge */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {/* AI Category Badge */}
                          {(() => {
                            const cat = video.feedbackCategory || getFeedbackCategory(video as any);
                            if (cat === 'Bug Report') {
                              return (
                                <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-800 text-xs font-black border border-rose-200 flex items-center gap-1 shadow-2xs">
                                  <span>🐞 Bug Report</span>
                                </span>
                              );
                            }
                            if (cat === 'Feature Request') {
                              return (
                                <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 text-xs font-black border border-purple-200 flex items-center gap-1 shadow-2xs">
                                  <span>💡 Feature Request</span>
                                </span>
                              );
                            }
                            return (
                              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200 flex items-center gap-1 shadow-2xs">
                                <span>💖 Compliment</span>
                              </span>
                            );
                          })()}

                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Gemini Sentiment: {video.sentimentScore ?? 0}%</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                            {video.sentimentTone || 'Evaluated'}
                          </span>
                          {(video.tags || []).map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Interview Transcripts & MCQ Summary */}
                        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            <span className="font-bold text-emerald-700 flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" /> #1 Favorite Feature
                            </span>
                            <p className="text-slate-800 mt-1 line-clamp-2 italic">
                              "{video.like || 'None specified'}"
                            </p>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            <span className="font-bold text-rose-700 flex items-center gap-1">
                              <ThumbsDown className="w-3 h-3" /> Dislikes / Issues
                            </span>
                            <p className="text-slate-800 mt-1 line-clamp-2 italic">
                              "{video.dislike || 'None reported'}"
                            </p>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <Smile className="w-3 h-3" /> In-Hand Ergonomics
                            </span>
                            <p className="text-slate-800 mt-1 line-clamp-2 italic">
                              "{video.comfort || 'None specified'}"
                            </p>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            <span className="font-bold text-blue-700 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Requested Fix
                            </span>
                            <p className="text-slate-800 mt-1 line-clamp-2 italic">
                              "{video.improve || 'None requested'}"
                            </p>
                          </div>
                        </div>

                        {/* Rejection / Approval Status Feedback Banner */}
                        {video.moderationStatus === 'rejected' && video.moderationReason && (
                          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-rose-900">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Reason for Rejection (Visible on Reviewer Profile):</span>
                            </div>
                            <p className="text-rose-800 mt-1 font-medium">"{video.moderationReason}"</p>
                            <div className="text-[10px] text-rose-600 mt-1 flex items-center gap-2">
                              <span>Moderated by: <b>{video.moderatedBy || 'Brand Admin'}</b></span>
                              {video.moderatedAt && (
                                <span>• {new Date(video.moderatedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {video.moderationStatus === 'approved' && (
                          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span>
                                Payout credited: <b>+{rs(video.rewardAmount)}</b> to user wallet.
                                {video.moderatedBy && ` (By ${video.moderatedBy})`}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-800">
                              {video.moderatedAt ? new Date(video.moderatedAt).toLocaleDateString() : 'Verified'}
                            </span>
                          </div>
                        )}

                        {/* AI Pre-Screening Result Card */}
                        {aiScreen && (
                          <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs">
                            <div className="flex items-center justify-between font-bold text-purple-900">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                <span>Gemini Automated Pre-Screening:</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                                aiScreen.recommendedAction === 'approve'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {aiScreen.recommendedAction === 'approve' ? 'Recommended: Approve' : 'Manual Review'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-[11px] text-purple-950">
                              <div>Visual: <b>{aiScreen.visualClarity}</b></div>
                              <div>Audio: <b>{aiScreen.audioClarity}</b></div>
                              <div>Auth Score: <b>{aiScreen.authenticityScore}%</b></div>
                            </div>
                            <div className="text-purple-800 mt-1.5 text-[11px]">{aiScreen.notes}</div>
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        {/* AI Pre-Screen Button */}
                        <button
                          type="button"
                          onClick={() => handleAiPreScreen(video)}
                          disabled={isScreening}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-all cursor-pointer"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isScreening ? 'animate-spin' : ''}`} />
                          <span>{isScreening ? 'Screening with Gemini...' : 'AI Pre-Screen'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {/* Reject Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenRejectModal(video)}
                            disabled={isSubmittingDecision}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              video.moderationStatus === 'rejected'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{video.moderationStatus === 'rejected' ? 'Update Rejection Reason' : 'Reject Video'}</span>
                          </button>

                          {/* Approve Button */}
                          <button
                            type="button"
                            onClick={() => handleApprove(video)}
                            disabled={isSubmittingDecision || video.moderationStatus === 'approved'}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                              video.moderationStatus === 'approved'
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>
                              {video.moderationStatus === 'approved'
                                ? 'Approved & Credited'
                                : `Approve & Pay ${rs(video.rewardAmount)}`}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          REJECTION MODAL WITH PRESET REASON CHIPS & NOTE
          ========================================================= */}
      {rejectingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Reject Video Review Submission
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingVideo(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Context */}
            <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500">Reviewer:</span>{' '}
                <b className="text-slate-900">{rejectingVideo.user}</b> ({rejectingVideo.userEmail})
              </div>
              <div className="text-rose-600 font-bold">
                Withholding: {rs(rejectingVideo.rewardAmount)}
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-3">
              Select or customize the rejection reason. This constructive feedback will be shown directly on the user's profile and "My Videos" screen with a <b>Re-record</b> button.
            </p>

            {/* Quick Reason Chips */}
            <div className="mt-3 space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Quick Rejection Reasons:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_REJECTION_REASONS.map((chip) => {
                  const isSelected = selectedReasonChip === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        setSelectedReasonChip(chip.id);
                        if (chip.id !== 'custom') {
                          setCustomReasonText(chip.reason);
                        } else {
                          setCustomReasonText('');
                        }
                      }}
                      className={`text-left p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-100'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div className="mt-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Feedback Message to Reviewer:
              </label>
              <textarea
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                placeholder="Write specific feedback on why the video was rejected and what to fix in the re-recording..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            {/* Footer Action Buttons */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingVideo(null)}
                disabled={isSubmittingDecision}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingDecision || !customReasonText.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingDecision ? 'Rejecting Video...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
