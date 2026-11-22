import React, { useEffect, useState } from 'react';
import { 
  Play, ShoppingBag, Wrench, X, Sparkles, CheckCircle2, 
  AlertCircle, Cpu, Bell, Volume2, ShieldCheck, ArrowRight
} from 'lucide-react';
import { FeedbackItem } from '../types';
import { phoneById, rs } from '../data/initialData';
import { getPhoneOS } from '../utils/cartAndChartEngine';

export interface VideoAlertNotification {
  id: string;
  feedback: FeedbackItem;
  timestamp: string;
  read: boolean;
  cartAmountUSD: number;
}

interface RealTimeVideoToastProps {
  currentAlert: VideoAlertNotification | null;
  onDismiss: () => void;
  onWatchVideo: (item: FeedbackItem) => void;
  onFixError: (item: FeedbackItem) => void;
  onOpenCart: (item: FeedbackItem) => void;
}

export const RealTimeVideoToast: React.FC<RealTimeVideoToastProps> = ({
  currentAlert,
  onDismiss,
  onWatchVideo,
  onFixError,
  onOpenCart,
}) => {
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    if (!currentAlert) return;
    setProgress(100);

    const startTime = Date.now();
    const duration = 9000; // 9 seconds visible

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentAlert?.id, onDismiss]);

  if (!currentAlert) return null;

  const { feedback, cartAmountUSD } = currentAlert;
  const phone = phoneById(feedback.phone);
  const osVer = feedback.osVersion || getPhoneOS(feedback.phone);
  const appVer = feedback.appVersion || 'v2.4.2 (Build #492)';
  const bug = feedback.dislike || feedback.improve || 'Thermal warmth during 4K video recording';

  return (
    <div className="fixed top-16 right-3 sm:right-6 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-right-8 duration-300">
      <div className="bg-slate-950/95 text-white backdrop-blur-md rounded-3xl p-4 sm:p-5 shadow-2xl border border-indigo-500/40 relative overflow-hidden ring-1 ring-white/10">
        
        {/* Progress bar countdown */}
        <div 
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />

        {/* Top bar with alert badge & close button */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" />
              <span>Real-Time Video Alert</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer & Device Information */}
        <div className="flex items-start gap-3">
          {feedback.userAvatar ? (
            <img
              src={feedback.userAvatar}
              alt={feedback.user}
              className="w-11 h-11 rounded-2xl object-cover border border-indigo-400/30 shadow-md shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0">
              {feedback.user[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="font-extrabold text-sm text-white truncate">
                {feedback.user}
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {currentAlert.timestamp}
              </span>
            </div>

            <div className="text-xs font-bold text-indigo-300 truncate">
              {phone.name} · {feedback.city}
            </div>

            {/* Version info badge */}
            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/70 border border-purple-500/30 text-[10px] font-mono text-purple-300">
              <Cpu className="w-3 h-3" />
              <span>{osVer}</span>
              <span className="text-purple-400">· {appVer}</span>
            </div>
          </div>
        </div>

        {/* Reported Bug Callout */}
        <div className="mt-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span className="font-bold text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>Reported Problem:</span>
            </span>
            <span className="text-amber-400 font-mono font-bold">
              ★ {feedback.rating}.0 ({feedback.sentimentScore || 85}% satisfaction)
            </span>
          </div>
          <p className="text-slate-300 italic line-clamp-2 text-[11px] leading-snug">
            "{bug}"
          </p>
        </div>

        {/* Converted to Cart & Chart status */}
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-emerald-400 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-500/20">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Auto-Converted to Cart (+${cartAmountUSD})</span>
          </span>
          <span className="font-bold text-indigo-300">
            Board Chart Updated ✓
          </span>
        </div>

        {/* Action Buttons: Watch Video, Fix Defect, Inspect Cart */}
        <div className="mt-3 flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              onWatchVideo(feedback);
              onDismiss();
            }}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Watch Video</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onFixError(feedback);
              onDismiss();
            }}
            className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
          >
            <Wrench className="w-3 h-3" />
            <span>Fix Problem</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenCart(feedback);
              onDismiss();
            }}
            className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
            title="Inspect Cart Invoice"
          >
            <ShoppingBag className="w-3 h-3 text-emerald-400" />
            <span>Cart</span>
          </button>
        </div>

      </div>
    </div>
  );
};
