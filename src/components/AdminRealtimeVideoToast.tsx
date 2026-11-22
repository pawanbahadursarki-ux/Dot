import React, { useEffect, useState } from 'react';
import {
  Play,
  Check,
  X,
  XCircle,
  ArrowUpRight,
  Video,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Smartphone,
  MessageSquare,
  Building2,
  Wallet,
  Wrench,
} from 'lucide-react';
import { FeedbackItem, AdminWithdrawalRequest } from '../types';
import { phoneById } from '../data/initialData';
import { PaymentRecord } from '../services/firebaseService';

export type AdminAlertSource = 'user' | 'company';
export type AdminAlertKind =
  | 'video_upload'
  | 'company_subscription'
  | 'company_defect'
  | 'withdrawal_request';

export interface AdminVideoUploadAlert {
  id: string;
  feedback?: FeedbackItem;
  payment?: PaymentRecord;
  withdrawal?: AdminWithdrawalRequest;
  source?: AdminAlertSource;
  kind?: AdminAlertKind;
  headline?: string;
  subline?: string;
  receivedAt: number;
  read: boolean;
}

interface AdminRealtimeVideoToastProps {
  alerts: AdminVideoUploadAlert[];
  onDismissCurrent: (alertId: string) => void;
  onDismissAll: () => void;
  onWatchAndReview: (item: FeedbackItem, alertId: string) => void;
  onApproveNow: (item: FeedbackItem, alertId: string) => Promise<void>;
  onOpenRejectModal: (item: FeedbackItem, alertId: string) => void;
  onJumpToQueue: (item: FeedbackItem, alertId: string) => void;
  onNavigateSection?: (menu: 'main' | 'crm' | 'catalog' | 'tables' | 'withdrawals' | 'audit' | 'users', alertId: string) => void;
}

const AUTO_DISMISS_MS = 12000;

function formatVideoDuration(seconds?: number): string {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function countAnsweredQuestions(item: FeedbackItem): number {
  if (item.allAnswers && Object.keys(item.allAnswers).length > 0) {
    return Object.values(item.allAnswers).filter((v) => String(v || '').trim().length > 0).length;
  }
  if (item.transcriptText) {
    const matches = item.transcriptText.match(/^Q\d+\s*\(/gim);
    if (matches && matches.length > 0) return matches.length;
  }
  return [item.like, item.dislike, item.comfort, item.improve].filter((v) => String(v || '').trim().length > 0).length;
}

export const AdminRealtimeVideoToast: React.FC<AdminRealtimeVideoToastProps> = ({
  alerts,
  onDismissCurrent,
  onDismissAll,
  onWatchAndReview,
  onApproveNow,
  onOpenRejectModal,
  onJumpToQueue,
  onNavigateSection,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const safeIndex = Math.min(activeIndex, Math.max(0, alerts.length - 1));
  const currentAlert = alerts[safeIndex] || null;

  useEffect(() => {
    setActiveIndex(0);
    setProgress(100);
  }, [alerts.length]);

  useEffect(() => {
    if (!currentAlert) return;
    setProgress(100);

    let remainingMs = AUTO_DISMISS_MS;
    let lastTick = Date.now();

    const interval = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      if (!isPaused) {
        remainingMs = Math.max(0, remainingMs - delta);
        setProgress((remainingMs / AUTO_DISMISS_MS) * 100);
        if (remainingMs <= 0) {
          window.clearInterval(interval);
          onDismissCurrent(currentAlert.id);
        }
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [currentAlert?.id, isPaused, onDismissCurrent]);

  if (!currentAlert) return null;

  const kind: AdminAlertKind = currentAlert.kind || 'video_upload';
  const source: AdminAlertSource =
    currentAlert.source || (kind === 'company_subscription' || kind === 'company_defect' ? 'company' : 'user');
  const receivedTimeLabel = new Date(currentAlert.receivedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const feedback = currentAlert.feedback;
  const payment = currentAlert.payment;
  const withdrawal = currentAlert.withdrawal;
  const isApproving = approvingId === currentAlert.id;

  const renderHeaderBadge = () => {
    if (source === 'company') {
      return (
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
          {kind === 'company_defect' ? <Wrench className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
        </div>
      );
    }
    if (kind === 'withdrawal_request') {
      return (
        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0">
          <Wallet className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-lg bg-[#5542f6]/20 border border-[#5542f6]/40 text-[#8e82ff] flex items-center justify-center shrink-0">
        <Video className="w-4 h-4" />
      </div>
    );
  };

  const titleLabel =
    kind === 'company_subscription'
      ? 'Company Subscription Alert'
      : kind === 'company_defect'
      ? 'Company Defect Resolution'
      : kind === 'withdrawal_request'
      ? 'User Cashout Request'
      : 'New User Video Uploaded';

  const renderBody = () => {
    if (kind === 'company_subscription' && payment) {
      return (
        <>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-white truncate">{payment.payerName}</span>
              <span className="text-xs font-mono tabular-nums font-bold text-emerald-400 shrink-0">
                +${payment.amountUSD.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-amber-300 font-semibold truncate">
              {payment.planName || payment.planId} · {payment.brandCategory === 'all' ? 'All Brands' : payment.brandCategory}
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              Gateway: {payment.gateway} · Ref: {payment.referenceId}
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => onNavigateSection?.('catalog', currentAlert.id)}
              className="flex-1 py-2 px-3 rounded-xl bg-[#5542f6] hover:bg-[#4633e6] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Brand Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection?.('audit', currentAlert.id)}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <span>Audit Log</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      );
    }

    if (kind === 'withdrawal_request' && withdrawal) {
      return (
        <>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-white truncate">{withdrawal.user}</span>
              <span className="text-xs font-mono tabular-nums font-bold text-emerald-400 shrink-0">
                Rs. {withdrawal.amountNPR}
              </span>
            </div>
            <div className="text-xs text-slate-300 font-medium truncate">
              {withdrawal.gateway} · {withdrawal.accountNumber}
            </div>
            <div className="text-[11px] font-mono text-amber-400 capitalize">
              Status: {withdrawal.status}
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => onNavigateSection?.('withdrawals', currentAlert.id)}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Review Cashout</span>
            </button>
          </div>
        </>
      );
    }

    if (!feedback) return null;

    const phone = phoneById(feedback.phone);
    const phoneDisplayName = feedback.phoneName || phone?.name || feedback.phone || 'Smartphone';
    const hasPlayableVideo = Boolean(feedback.videoUrl && feedback.videoUrl.trim().length > 0);
    const answeredCount = countAnsweredQuestions(feedback);
    const summaryQuote =
      kind === 'company_defect'
        ? feedback.defectResolutionNote || `Defect status updated to ${feedback.defectStatus || 'resolved'}.`
        : feedback.like ||
          feedback.dislike ||
          feedback.improve ||
          (feedback.transcriptText ? feedback.transcriptText.split('\n')[0] : '') ||
          'New user video feedback ready for review.';

    return (
      <>
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onWatchAndReview(feedback, currentAlert.id)}
            className="relative w-24 h-16 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5542f6]"
            title="Click to open full video and Q&A review"
          >
            {hasPlayableVideo ? (
              <video
                src={feedback.videoUrl}
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
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                <Smartphone className="w-6 h-6" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="w-7 h-7 rounded-full bg-white/95 text-slate-950 flex items-center justify-center shadow-md">
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </span>
            </div>
            <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[10px] font-mono tabular-nums text-white">
              {formatVideoDuration(feedback.seconds)}
            </span>
          </button>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {feedback.userAvatar ? (
                  <img
                    src={feedback.userAvatar}
                    alt={feedback.user}
                    className="w-5 h-5 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#5542f6] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {(feedback.user || 'R').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-bold text-white truncate">
                  {feedback.user || 'Reviewer'}
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums font-bold text-emerald-400 shrink-0">
                Rs. {feedback.rewardAmount ?? 0}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium truncate">
              <span className="truncate">{phoneDisplayName}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 truncate">{feedback.city || 'Nepal'}</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-slate-400">
              <span>★ {Number(feedback.rating || 5).toFixed(1)}</span>
              {answeredCount > 0 && (
                <span className="inline-flex items-center gap-1 text-slate-300">
                  <MessageSquare className="w-3 h-3 text-[#8e82ff]" />
                  <span>{answeredCount} Q&A</span>
                </span>
              )}
              <span className="text-amber-400 capitalize">
                {kind === 'company_defect'
                  ? `Defect: ${feedback.defectStatus || 'resolved'}`
                  : feedback.moderationStatus || 'pending'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 line-clamp-2 leading-relaxed">
          "{summaryQuote}"
        </p>

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => onWatchAndReview(feedback, currentAlert.id)}
            className="flex-1 py-2 px-3 rounded-xl bg-[#5542f6] hover:bg-[#4633e6] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch & Review</span>
          </button>

          {feedback.moderationStatus !== 'approved' && (
            <button
              type="button"
              onClick={async () => {
                if (isApproving) return;
                setApprovingId(currentAlert.id);
                try {
                  await onApproveNow(feedback, currentAlert.id);
                } finally {
                  setApprovingId(null);
                }
              }}
              disabled={isApproving}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Approve video feedback and credit payout immediately"
            >
              {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Approve</span>
            </button>
          )}

          {feedback.moderationStatus !== 'rejected' && (
            <button
              type="button"
              onClick={() => onOpenRejectModal(feedback, currentAlert.id)}
              className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Disapprove review with quality reason"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Disapprove</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onJumpToQueue(feedback, currentAlert.id)}
            className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            title="Open item in Moderation Queue"
          >
            <span>Queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </>
    );
  };

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="fixed top-18 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[440px] animate-in slide-in-from-right-8 fade-in duration-200"
    >
      <div className="bg-slate-950 text-slate-100 rounded-2xl border border-slate-700/90 shadow-2xl overflow-hidden">
        <div className="h-1 w-full bg-slate-800">
          <div
            className={`h-full transition-[width] duration-75 ${
              source === 'company' ? 'bg-amber-400' : 'bg-[#5542f6]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {renderHeaderBadge()}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-white tracking-tight truncate">
                    {titleLabel}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                      source === 'company'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {source === 'company' ? 'Company' : 'User'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{receivedTimeLabel}</span>
                  {isPaused && <span className="text-amber-400">· Paused</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {alerts.length > 1 && (
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg px-1 py-0.5 mr-1">
                  <button
                    type="button"
                    onClick={() => setActiveIndex((prev) => (prev - 1 + alerts.length) % alerts.length)}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Previous alert"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono tabular-nums text-slate-300 px-1">
                    {safeIndex + 1}/{alerts.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((prev) => (prev + 1) % alerts.length)}
                    className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Next alert"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {alerts.length > 1 && (
                <button
                  type="button"
                  onClick={onDismissAll}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                >
                  Clear all
                </button>
              )}

              <button
                type="button"
                onClick={() => onDismissCurrent(currentAlert.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {renderBody()}
        </div>
      </div>
    </div>
  );
};
