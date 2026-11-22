import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Sparkles,
  MessageSquare,
  Send,
  ShieldCheck,
  Heart,
  Bot,
  Lightbulb,
  Loader2,
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ArrowRight,
  Search,
  FileText,
  Smartphone,
  Video as VideoIcon,
  CheckCircle2,
  Lock,
  CreditCard,
} from 'lucide-react';
import { FeedbackItem, AiFeedbackSummary, UserProfile, SubscriptionTier } from '../types';
import { phoneById, rs } from '../data/initialData';
import { get10CoreMobileQuestions } from '../data/interviewQuestions';
import { getSingleActiveBrandFolder, isFeedbackItemUnlocked } from '../utils/brandAccess';

interface VideoModalProps {
  feedback: FeedbackItem | null;
  initialTab?: 'summary' | 'transcript' | 'ai_summary';
  onClose: () => void;
  onFeedbackUpdated?: (updated: FeedbackItem) => void;
  onOpenChatGPTWithSummary?: (item: FeedbackItem, customPrompt?: string) => void;
  user?: UserProfile;
  activePlan?: SubscriptionTier;
  onOpenSubscriptionModal?: (brand?: string) => void;
}

interface TranscriptEntry {
  id: string;
  speaker: string;
  topic: string;
  questionTitle?: string;
  timecode: string;
  text: string;
  tone: 'positive' | 'negative' | 'neutral';
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  feedback,
  initialTab = 'summary',
  onClose,
  onFeedbackUpdated,
  onOpenChatGPTWithSummary,
  user,
  activePlan,
  onOpenSubscriptionModal,
}) => {
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackItem | null>(feedback);
  const [activeLeftTab, setActiveLeftTab] = useState<'summary' | 'transcript' | 'ai_summary'>(initialTab);
  const [rightBreakdownTab, setRightBreakdownTab] = useState<'topics' | 'details' | 'device'>('topics');
  const [transcriptSearch, setTranscriptSearch] = useState<string>('');

  // Real video player state
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [mediaDuration, setMediaDuration] = useState<number>(feedback?.seconds || 60);

  // Engagement & comments
  const [likes, setLikes] = useState<number>(feedback?.likesCount ?? 0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [comments, setComments] = useState<
    Array<{ id: string; sender: string; text: string; time: string; isCompany?: boolean }>
  >([]);

  const phone = currentFeedback ? phoneById(currentFeedback.phone) : null;
  const hasRealVideo = Boolean(currentFeedback?.videoUrl && currentFeedback.videoUrl.trim().length > 0);

  useEffect(() => {
    setCurrentFeedback(feedback);
    setActiveLeftTab(initialTab);
    setRightBreakdownTab('topics');
    setTranscriptSearch('');
    setCurrentTime(0);
    setMediaDuration(feedback?.seconds || 60);
    setIsPlaying(Boolean(feedback?.videoUrl));
    setIsMuted(false);
    setPlaybackRate(1);
    setLikes(feedback?.likesCount ?? 0);
    setHasLiked(false);
    setComments(
      feedback?.defectResolutionNote
        ? [
            {
              id: 'note-init',
              sender: 'Product Team',
              text: feedback.defectResolutionNote,
              time: feedback.time || 'Verified',
              isCompany: true,
            },
          ]
        : []
    );
  }, [feedback, initialTab]);

  // Sync HTML5 video element rate/mute when playing real video
  useEffect(() => {
    const vid = videoElRef.current;
    if (!vid || !hasRealVideo) return;
    vid.muted = isMuted;
    vid.playbackRate = playbackRate;
  }, [isMuted, playbackRate, hasRealVideo]);

  // Fallback timer simulation ONLY when an older Firestore record has no real videoUrl file attached
  useEffect(() => {
    if (!currentFeedback || hasRealVideo || !isPlaying) return;
    const total = Math.max(10, currentFeedback.seconds || 60);
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + playbackRate;
        if (next >= total) {
          setIsPlaying(false);
          return total;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentFeedback?.id, hasRealVideo, isPlaying, playbackRate]);

  // Build structured Q&A transcript entries (parses all questions & answers cleanly)
  const transcriptEntries = useMemo<TranscriptEntry[]>(() => {
    if (!currentFeedback) return [];
    const entries: TranscriptEntry[] = [];
    const reviewer = currentFeedback.user || 'Verified Reviewer';
    const totalSecs = Math.max(30, currentFeedback.seconds || 120);
    const activePhone = phoneById(currentFeedback.phone);
    const coreQuestions = get10CoreMobileQuestions(activePhone, 'en');

    // Prefer structured allAnswers when available in-session so every question has exact title + answer
    if (currentFeedback.allAnswers && Object.keys(currentFeedback.allAnswers).length > 0) {
      const pairs = Object.entries(currentFeedback.allAnswers).sort(
        ([a], [b]) => Number(a) - Number(b)
      );
      pairs.forEach(([key, val], idx) => {
        if (!val) return;
        const qNum = Number(key);
        const matchedQ = !Number.isNaN(qNum) ? coreQuestions[qNum] : undefined;
        const cleanTitle = matchedQ
          ? matchedQ.title.replace(/Phone/gi, activePhone.name)
          : `Question ${!Number.isNaN(qNum) ? qNum + 1 : key}`;
        const stamp = formatClock(Math.round((idx / Math.max(1, pairs.length)) * totalSecs));
        entries.push({
          id: `ans-${key}`,
          speaker: reviewer,
          topic: !Number.isNaN(qNum) ? `Q${qNum + 1}` : `Q${idx + 1}`,
          questionTitle: cleanTitle,
          timecode: stamp,
          text: String(val),
          tone:
            cleanTitle.toLowerCase().includes('issue') ||
            cleanTitle.toLowerCase().includes('heat') ||
            cleanTitle.toLowerCase().includes('dislike')
              ? 'negative'
              : 'positive',
        });
      });
      if (entries.length > 0) return entries;
    }

    if (currentFeedback.transcriptText && currentFeedback.transcriptText.trim().length > 0) {
      const lines = currentFeedback.transcriptText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      lines.forEach((line, idx) => {
        const qaMatch = line.match(/^(Q\d+)\s*\((.+?)\):\s*(.*)$/);
        if (qaMatch) {
          const [, qTag, qPrompt, ansText] = qaMatch;
          const stamp = formatClock(Math.round((idx / Math.max(1, lines.length)) * totalSecs));
          entries.push({
            id: `tr-${idx}`,
            speaker: reviewer,
            topic: qTag,
            questionTitle: qPrompt,
            timecode: stamp,
            text: ansText || '—',
            tone:
              qPrompt.toLowerCase().includes('issue') ||
              qPrompt.toLowerCase().includes('dislike') ||
              qPrompt.toLowerCase().includes('heat')
                ? 'negative'
                : 'positive',
          });
          return;
        }

        const colonIdx = line.indexOf(':');
        const label = colonIdx > 0 && colonIdx < 120 ? line.slice(0, colonIdx) : `Response ${idx + 1}`;
        const body = colonIdx > 0 && colonIdx < 120 ? line.slice(colonIdx + 1).trim() : line;
        const stamp = formatClock(Math.round((idx / Math.max(1, lines.length)) * totalSecs));
        entries.push({
          id: `tr-${idx}`,
          speaker: reviewer,
          topic: `Q${idx + 1}`,
          questionTitle: label,
          timecode: stamp,
          text: body,
          tone:
            label.toLowerCase().includes('issue') ||
            label.toLowerCase().includes('dislike') ||
            label.toLowerCase().includes('heat')
              ? 'negative'
              : 'positive',
        });
      });
      return entries;
    }

    // Fallback to the 4 core review pillars
    if (currentFeedback.like) {
      entries.push({
        id: 'p-like',
        speaker: reviewer,
        topic: 'Liked',
        questionTitle: 'What Was Loved',
        timecode: '00:05',
        text: currentFeedback.like,
        tone: 'positive',
      });
    }
    if (currentFeedback.comfort) {
      entries.push({
        id: 'p-comfort',
        speaker: reviewer,
        topic: 'Comfort',
        questionTitle: 'Comfort & Handling',
        timecode: formatClock(Math.round(totalSecs * 0.35)),
        text: currentFeedback.comfort,
        tone: 'positive',
      });
    }
    if (currentFeedback.dislike) {
      entries.push({
        id: 'p-dislike',
        speaker: reviewer,
        topic: 'Friction',
        questionTitle: 'Reported Issue / Friction',
        timecode: formatClock(Math.round(totalSecs * 0.65)),
        text: currentFeedback.dislike,
        tone: 'negative',
      });
    }
    if (currentFeedback.improve) {
      entries.push({
        id: 'p-improve',
        speaker: reviewer,
        topic: 'Improve',
        questionTitle: 'Improvement Request',
        timecode: formatClock(Math.round(totalSecs * 0.85)),
        text: currentFeedback.improve,
        tone: 'neutral',
      });
    }
    return entries;
  }, [currentFeedback]);

  const filteredTranscriptEntries = useMemo(() => {
    const q = transcriptSearch.trim().toLowerCase();
    if (!q) return transcriptEntries;
    return transcriptEntries.filter(
      (e) =>
        e.text.toLowerCase().includes(q) ||
        e.topic.toLowerCase().includes(q) ||
        e.speaker.toLowerCase().includes(q)
    );
  }, [transcriptEntries, transcriptSearch]);

  // Topic breakdown metrics for bottom-right table
  const topicBreakdown = useMemo(() => {
    if (!currentFeedback) return [];
    const blob = `${currentFeedback.like} ${currentFeedback.dislike} ${currentFeedback.comfort} ${currentFeedback.improve} ${currentFeedback.transcriptText || ''}`.toLowerCase();
    const raw = [
      {
        name: 'Camera & Video',
        role: 'Optical Quality',
        pct: blob.includes('camera') || blob.includes('photo') || blob.includes('zoom') ? 38 : 24,
        color: 'bg-indigo-600',
      },
      {
        name: 'Battery & Thermals',
        role: 'Endurance',
        pct: blob.includes('battery') || blob.includes('charg') || blob.includes('heat') ? 34 : 26,
        color: 'bg-emerald-500',
      },
      {
        name: 'Display & Ergonomics',
        role: 'Daily Usability',
        pct: blob.includes('display') || blob.includes('screen') || blob.includes('light') ? 28 : 25,
        color: 'bg-amber-500',
      },
    ];
    return raw;
  }, [currentFeedback]);

  if (!currentFeedback || !phone) return null;

  const isCompanyLocked = Boolean(
    user?.accountMode === 'company' &&
      user?.role !== 'company_admin' &&
      !isFeedbackItemUnlocked(currentFeedback, user, activePlan)
  );

  if (isCompanyLocked) {
    const activeBrand = getSingleActiveBrandFolder(user, activePlan);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {phone.brand} Feedback is Locked
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            One time, one subscription used: {activeBrand ? `your account is currently subscribed to ${activeBrand}.` : 'you do not have an active subscription for this brand.'} Purchase a subscription for <b>{phone.brand}</b> to watch this video and inspect its Q&amp;A data.
          </p>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSubscriptionModal?.(phone.brand);
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buy {phone.brand} Subscription</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalDuration = Math.max(1, Math.round(mediaDuration || currentFeedback.seconds || 60));
  const progressPct = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));

  const handleTogglePlay = () => {
    const vid = videoElRef.current;
    if (hasRealVideo && vid) {
      if (vid.paused) {
        vid.play().catch(() => {});
        setIsPlaying(true);
      } else {
        vid.pause();
        setIsPlaying(false);
      }
      return;
    }
    if (currentTime >= totalDuration) {
      setCurrentTime(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleSeekBy = (deltaSeconds: number) => {
    const next = Math.max(0, Math.min(totalDuration, currentTime + deltaSeconds));
    setCurrentTime(next);
    if (hasRealVideo && videoElRef.current) {
      videoElRef.current.currentTime = next;
    }
  };

  const handleSeekToRatio = (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const target = clamped * totalDuration;
    setCurrentTime(target);
    if (hasRealVideo && videoElRef.current) {
      videoElRef.current.currentTime = target;
    }
  };

  const handleReplay = () => {
    setCurrentTime(0);
    if (hasRealVideo && videoElRef.current) {
      videoElRef.current.currentTime = 0;
      videoElRef.current.play().catch(() => {});
    }
    setIsPlaying(true);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
  };

  const handleGenerateSummary = async () => {
    if (isGeneratingAi) return;
    try {
      setIsGeneratingAi(true);
      const score =
        currentFeedback.sentimentScore ?? Math.min(100, Math.max(20, currentFeedback.rating * 19 + 5));
      const overallSentiment: AiFeedbackSummary['overallSentiment'] =
        score >= 70 ? 'positive' : score >= 45 ? 'neutral' : 'negative';
      const derivedTopics =
        currentFeedback.tags && currentFeedback.tags.length > 0
          ? currentFeedback.tags
          : [phone.brand, currentFeedback.feedbackCategory || 'User Experience', `${currentFeedback.rating} Star Review`];
      const suggestions = [
        currentFeedback.improve,
        currentFeedback.dislike ? `Address reported friction: ${currentFeedback.dislike}` : '',
      ].filter((s): s is string => Boolean(s && s.trim().length > 0));

      const data: AiFeedbackSummary = {
        mainTopics: derivedTopics,
        overallSentiment,
        sentimentScore: score,
        sentimentExplanation:
          currentFeedback.sentimentTone ||
          `${currentFeedback.user} rated ${phone.name} ${currentFeedback.rating}/5 stars with ${score}% sentiment score.`,
        improvementSuggestions:
          suggestions.length > 0 ? suggestions : ['No defects or fixes requested in this review.'],
        summary:
          currentFeedback.sentimentSummary ||
          `${currentFeedback.user} (${currentFeedback.city}) reviewed ${phone.name}: Liked "${currentFeedback.like}". ${
            currentFeedback.dislike ? `Noted issue: "${currentFeedback.dislike}". ` : ''
          }${currentFeedback.improve ? `Suggested fix: "${currentFeedback.improve}".` : ''}`.trim(),
        generatedAt: new Date().toISOString(),
        isAiGenerated: false,
      };

      const updated: FeedbackItem = {
        ...currentFeedback,
        aiSummary: data,
      };
      setCurrentFeedback(updated);
      onFeedbackUpdated?.(updated);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleLike = () => {
    if (!hasLiked) {
      setLikes(likes + 1);
      setHasLiked(true);
    } else {
      setLikes(Math.max(0, likes - 1));
      setHasLiked(false);
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        sender: 'Product Reviewer',
        text: commentText.trim(),
        time: 'Just now',
        isCompany: true,
      },
    ]);
    setCommentText('');
  };

  const ratingLabel = `${currentFeedback.rating}/5`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 rounded-3xl max-w-5xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Top Workspace Header */}
        <header className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 p-1 flex items-center justify-center shrink-0">
              <img src={phone.img} alt={phone.name} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {currentFeedback.hidePhoneModel ? `Verified ${phone.brand} Review` : phone.name}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
                  {phone.brand}
                </span>
                {hasRealVideo && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-semibold flex items-center gap-1">
                    <VideoIcon className="w-3 h-3" />
                    <span>Recorded Video</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {currentFeedback.user} · {currentFeedback.city} · {currentFeedback.time || 'Verified'} ·{' '}
                <span className="font-mono tabular-nums">{formatClock(totalDuration)}</span> · {ratingLabel} Stars
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLike}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                hasLiked
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="tabular-nums">{likes}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close video and feedback viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Split-Pane Review Body (Left: Data/Transcript/Summary | Right: Video Player + Controls + Breakdown) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* LEFT PANE: Summary | Transcript & Data | AI Summary */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-white overflow-hidden">
            {/* Segmented Tab Bar */}
            <div className="px-4 sm:px-6 pt-3 pb-2.5 border-b border-slate-100 flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveLeftTab('summary')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                  activeLeftTab === 'summary'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Summary & Pillars</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLeftTab('transcript')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                  activeLeftTab === 'transcript'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Transcript & Data ({transcriptEntries.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLeftTab('ai_summary')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                  activeLeftTab === 'ai_summary'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Summary</span>
                {currentFeedback.aiSummary && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
            </div>

            {/* Left Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              {activeLeftTab === 'transcript' && (
                <div className="space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                      placeholder="Search answers, camera, battery, or keywords..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>

                  {/* Timestamped Q&A Transcript Rows */}
                  {filteredTranscriptEntries.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                      No matching transcript entries found for "{transcriptSearch}".
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredTranscriptEntries.map((entry) => (
                        <div key={entry.id} className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                  entry.tone === 'negative'
                                    ? 'bg-rose-100 text-rose-700'
                                    : entry.tone === 'neutral'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {entry.topic}
                              </span>
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {entry.questionTitle || entry.topic}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                              {entry.timecode}
                            </span>
                          </div>
                          {entry.questionTitle && (
                            <p className="text-[11px] font-medium text-slate-500 leading-snug">
                              {entry.questionTitle}
                            </p>
                          )}
                          <p className="text-xs font-semibold text-slate-900 bg-white rounded-xl px-3 py-2 border border-slate-200/80 leading-relaxed">
                            {entry.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Verified Data Card (Device & Order Metadata) */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Submitted Feedback Metadata</span>
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        {currentFeedback.moderationStatus || 'pending'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block">Reviewer Reward</span>
                        <strong className="text-slate-900 font-mono tabular-nums">
                          {rs(currentFeedback.rewardAmount ?? phone.reward)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Order Reference</span>
                        <strong className="text-slate-900 font-mono">
                          {currentFeedback.cartData?.orderId || 'Verified'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Hardware Stamp</span>
                        <strong className="text-slate-900 truncate block">
                          {currentFeedback.verifiedDevice || currentFeedback.osVersion || 'Verified Smartphone'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Privacy Mode</span>
                        <strong className="text-slate-900">
                          {currentFeedback.hidePhoneModel ? 'Model Masked' : 'Standard Verified'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeLeftTab === 'summary' && (
                <div className="space-y-4">
                  {/* Reviewer Hero Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {currentFeedback.userAvatar ? (
                        <img
                          src={currentFeedback.userAvatar}
                          alt={currentFeedback.user}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {currentFeedback.user.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">{currentFeedback.user}</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {currentFeedback.city} · {currentFeedback.sentimentSummary || `${currentFeedback.rating}/5 Verified Review`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-amber-500 text-xs font-bold block">{'★'.repeat(currentFeedback.rating)}</span>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 tabular-nums">
                        {rs(currentFeedback.rewardAmount ?? phone.reward)}
                      </span>
                    </div>
                  </div>

                  {/* Quick link to AI Summary if generated */}
                  {currentFeedback.aiSummary && (
                    <button
                      type="button"
                      onClick={() => setActiveLeftTab('ai_summary')}
                      className="w-full p-2.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs cursor-pointer transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="text-slate-700 truncate">
                          <b>AI Topics:</b> {currentFeedback.aiSummary.mainTopics.slice(0, 3).join(', ')}
                        </span>
                      </div>
                      <span className="text-[11px] text-indigo-700 font-semibold shrink-0 flex items-center gap-0.5">
                        <span>View Summary</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  )}

                  {/* 4 Feedback Pillars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                      <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1 text-[11px]">
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>What Was Loved</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{currentFeedback.like || 'Smooth performance and display.'}</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                      <div className="font-bold text-rose-800 flex items-center gap-1.5 mb-1 text-[11px]">
                        <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
                        <span>Reported Friction</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{currentFeedback.dislike || 'No major defects noted.'}</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                      <div className="font-bold text-amber-800 flex items-center gap-1.5 mb-1 text-[11px]">
                        <Smile className="w-3.5 h-3.5 text-amber-600" />
                        <span>Comfort & Usability</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{currentFeedback.comfort || 'Comfortable daily handling.'}</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200/80">
                      <div className="font-bold text-sky-800 flex items-center gap-1.5 mb-1 text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        <span>Suggested Improvement</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{currentFeedback.improve || 'Continue battery optimization updates.'}</p>
                    </div>
                  </div>

                  {/* All Questions & Answers Preview directly alongside Video */}
                  {transcriptEntries.length > 0 && (
                    <div className="pt-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>All Questions & Answers ({transcriptEntries.length})</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => setActiveLeftTab('transcript')}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          Search Q&A →
                        </button>
                      </div>
                      <div className="space-y-2">
                        {transcriptEntries.map((entry) => (
                          <div
                            key={`sum-${entry.id}`}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                          >
                            <div className="flex items-start gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px] shrink-0">
                                {entry.topic}
                              </span>
                              <span className="font-semibold text-slate-700 leading-snug">
                                {entry.questionTitle || entry.topic}
                              </span>
                            </div>
                            <div className="mt-1.5 pl-1 text-slate-900 font-semibold leading-snug">
                              {entry.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments & Company Replies */}
                  <div className="pt-1">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Notes & Company Replies ({comments.length})</span>
                    </h4>
                    {comments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No team notes added yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                        {comments.map((c) => (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/70 text-xs text-slate-800"
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold mb-0.5">
                              <span className="text-indigo-700">{c.sender}</span>
                              <span className="text-slate-400 font-normal">{c.time}</span>
                            </div>
                            <p>{c.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeLeftTab === 'ai_summary' && (
                <div className="space-y-4 text-xs text-slate-700">
                  {currentFeedback.aiSummary ? (
                    <>
                      <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5" />
                            <span>Executive Summary</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">AI Insights</span>
                        </div>
                        <p className="text-slate-900 text-xs leading-relaxed font-medium">
                          "{currentFeedback.aiSummary.summary}"
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                          <Tag className="w-3 h-3 text-indigo-600" />
                          <span>Topics Discussed</span>
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {currentFeedback.aiSummary.mainTopics.map((topic, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium"
                            >
                              #{topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            {currentFeedback.aiSummary.overallSentiment === 'positive' ? (
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : currentFeedback.aiSummary.overallSentiment === 'negative' ? (
                              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                            ) : (
                              <Minus className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            <span>Sentiment:</span>
                            <b className="capitalize">{currentFeedback.aiSummary.overallSentiment}</b>
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {currentFeedback.aiSummary.sentimentScore}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              currentFeedback.aiSummary.overallSentiment === 'positive'
                                ? 'bg-emerald-500'
                                : currentFeedback.aiSummary.overallSentiment === 'negative'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${currentFeedback.aiSummary.sentimentScore}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">{currentFeedback.aiSummary.sentimentExplanation}</p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider flex items-center gap-1">
                          <Lightbulb className="w-3 h-3 text-amber-600" />
                          <span>Improvement Recommendations</span>
                        </span>
                        <div className="space-y-1.5">
                          {currentFeedback.aiSummary.improvementSuggestions.map((sug, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-slate-800"
                            >
                              <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="text-xs leading-relaxed">{sug}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleGenerateSummary}
                          disabled={isGeneratingAi}
                          className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                          <span>{isGeneratingAi ? 'Updating...' : 'Refresh Summary'}</span>
                        </button>

                        {onOpenChatGPTWithSummary && (
                          <button
                            type="button"
                            onClick={() => {
                              const prompt = `Summarize engineering fixes for ${phone.name} based on ${currentFeedback.user}'s review: "${currentFeedback.aiSummary?.summary}"`;
                              onClose();
                              onOpenChatGPTWithSummary(currentFeedback, prompt);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Bot className="w-3.5 h-3.5" />
                            <span>Open Strategy Copilot</span>
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="py-10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-200">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Generate Feedback Summary</h4>
                        <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                          Extract structured topics, sentiment score, and action items from this user's submission.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingAi}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 mx-auto cursor-pointer"
                      >
                        {isGeneratingAi ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Generate Summary</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reply / Note Input Footer */}
            <form
              onSubmit={handlePostComment}
              className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50/70 flex gap-2 shrink-0"
            >
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a team note or company response..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>

          {/* RIGHT PANE: Video Player Viewport + Scrubber + Transport Controls + Topic/Details Table */}
          <div className="lg:col-span-5 bg-slate-50/90 border-t lg:border-t-0 lg:border-l border-slate-200 p-4 sm:p-5 flex flex-col gap-3.5 overflow-y-auto">
            {/* Crisp Video Viewport */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-sm group">
              {hasRealVideo ? (
                <video
                  ref={videoElRef}
                  src={currentFeedback.videoUrl}
                  playsInline
                  autoPlay
                  preload="metadata"
                  onClick={handleTogglePlay}
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (Number.isFinite(dur) && dur > 0) {
                      setMediaDuration(dur);
                    }
                  }}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-contain bg-black cursor-pointer"
                />
              ) : (
                <div
                  onClick={handleTogglePlay}
                  className="w-full h-full flex flex-col items-center justify-center p-5 text-center cursor-pointer relative bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950"
                >
                  <div className="w-16 h-20 rounded-xl bg-white/10 border border-white/15 p-2 flex items-center justify-center mb-2">
                    <img src={phone.img} alt={phone.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="text-white font-semibold text-xs">
                    {currentFeedback.hidePhoneModel ? `Verified ${phone.brand} Review` : phone.name}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Submitted data record ({transcriptEntries.length} verified entries)
                  </p>
                </div>
              )}

              {/* Subtle Top-Left Live Label */}
              <div className="absolute top-2.5 left-2.5 pointer-events-none flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{currentFeedback.user}</span>
                </span>
              </div>
            </div>

            {/* Segmented Color Timeline Scrubber + Timecode */}
            <div className="space-y-1.5">
              <div
                className="relative h-2.5 rounded-full bg-slate-200 overflow-hidden cursor-pointer flex"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  handleSeekToRatio((e.clientX - rect.left) / rect.width);
                }}
                title="Click anywhere to seek"
              >
                <div className="h-full bg-indigo-400/40" style={{ width: '36%' }} />
                <div className="h-full bg-emerald-400/40" style={{ width: '34%' }} />
                <div className="h-full bg-amber-400/40" style={{ width: '30%' }} />
                <div
                  className="absolute inset-y-0 left-0 bg-indigo-600/85 pointer-events-none transition-all duration-100"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 tabular-nums">
                <span>{formatClock(currentTime)}</span>
                <span>{formatClock(totalDuration)}</span>
              </div>
            </div>

            {/* Transport Controls Row (Mute, Rate, -15s, Play/Pause, +15s, Replay) */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={cyclePlaybackRate}
                className="px-2.5 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold font-mono cursor-pointer transition-colors"
                title="Cycle playback speed"
              >
                {playbackRate}x
              </button>

              <button
                type="button"
                onClick={() => handleSeekBy(-15)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Rewind 15s"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 cursor-pointer transition-all active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleSeekBy(15)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Forward 15s"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleReplay}
                className="px-2.5 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Restart video"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Replay</span>
              </button>
            </div>

            {/* Bottom Segmented Breakdown Card (Topics | Details | Device) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3">
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRightBreakdownTab('topics')}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                    rightBreakdownTab === 'topics'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Topics
                </button>
                <button
                  type="button"
                  onClick={() => setRightBreakdownTab('details')}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                    rightBreakdownTab === 'details'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setRightBreakdownTab('device')}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                    rightBreakdownTab === 'device'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Device
                </button>
              </div>

              {rightBreakdownTab === 'topics' && (
                <div className="space-y-2.5">
                  {topicBreakdown.map((row) => (
                    <div key={row.name} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 truncate">{row.name}</div>
                        <div className="text-[10px] text-slate-400">{row.role}</div>
                      </div>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct * 2}%` }} />
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-slate-700 tabular-nums w-9 text-right">
                        {row.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {rightBreakdownTab === 'details' && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Reviewer Bounty</span>
                    <strong className="font-mono text-emerald-700 tabular-nums">
                      {rs(currentFeedback.rewardAmount ?? phone.reward)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Category</span>
                    <strong className="text-slate-800">{currentFeedback.feedbackCategory || 'Verified Review'}</strong>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Order Ref</span>
                    <strong className="font-mono text-slate-800">
                      {currentFeedback.cartData?.orderId || 'ORD-VERIFIED'}
                    </strong>
                  </div>
                </div>
              )}

              {rightBreakdownTab === 'device' && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-semibold truncate">
                      {currentFeedback.verifiedDevice || phone.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>OS: {currentFeedback.osVersion || 'Mobile OS'}</span>
                    <span className="font-mono">{currentFeedback.appVersion || 'v2.4.2'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
