import React, { useState } from 'react';
import { Play, Pause, ExternalLink, Sparkles, Smile, Heart, X, Maximize2, RotateCcw, ShieldCheck } from 'lucide-react';
import { resolveAssetUrl } from '../utils/assetUrl';

interface HappyFacesMotionProps {
  variant?: 'hero' | 'compact' | 'modal';
  onCloseModal?: () => void;
}

export const HappyFacesMotion: React.FC<HappyFacesMotionProps> = ({
  variant = 'hero',
  onCloseModal
}) => {
  const [isPlayingMotion, setIsPlayingMotion] = useState<boolean>(false);
  const [showFullModal, setShowFullModal] = useState<boolean>(variant === 'modal');
  const [currentReaction, setCurrentReaction] = useState<string>('😄');

  const REACTIONS = ['😄', '🥳', '😍', '💛', '🔥', '✨', '👏'];

  const jitterUrl = 'https://jitter.video/file/?id=gqKIPtnq1KRyUdF7VTXNUhIG';

  return (
    <>
      {/* Hero Showcase Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-indigo-950/70 to-slate-900/90 border border-indigo-400/30 p-4 sm:p-5 shadow-2xl backdrop-blur-xl mb-4 group">
        {/* Glow Effects */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none fp-lobby-aurora-2" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-amber-500/15 blur-2xl pointer-events-none fp-lobby-aurora-1" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
          {/* Animated Happy Face Graphic Container */}
          <div className="relative shrink-0 flex items-center justify-center">
            {/* Rotating Colorful Gradient Ring */}
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 opacity-60 blur-xs fp-spin-slow" />
            
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-xl bg-slate-950">
              <img
                src={resolveAssetUrl('/assets/jitter_preview.png')}
                alt="Happy Faces Landing Page Motion Animation"
                className="w-full h-full object-cover fp-happy-face"
              />
              
              {/* Play / Motion Badge Overlay */}
              <button
                type="button"
                onClick={() => setShowFullModal(true)}
                title="Play Jitter Motion Animation"
                className="absolute inset-0 bg-slate-950/30 hover:bg-slate-950/10 flex items-center justify-center transition-all group-hover:scale-105"
              >
                <div className="w-10 h-10 rounded-full bg-white/90 text-slate-950 flex items-center justify-center shadow-lg group-hover:bg-amber-400 group-hover:scale-110 transition-all">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </button>
            </div>

            {/* Floating Reaction Emojis (Animated bobbing from Jitter) */}
            <div className="absolute -top-3 -right-2 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold shadow-lg fp-emoji-bob-1 flex items-center gap-1">
              <span>{currentReaction}</span>
              <span className="text-[10px] text-amber-300 font-mono">100%</span>
            </div>

            <div className="absolute -bottom-2 -left-2 px-2 py-0.5 rounded-full bg-emerald-500/30 backdrop-blur-md border border-emerald-400/40 text-[10px] text-emerald-300 font-bold shadow-lg fp-emoji-bob-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Happy Faces</span>
            </div>
          </div>

          {/* Details & Actions */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400/20 to-rose-400/20 border border-amber-400/30 text-amber-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Smile className="w-3 h-3 text-amber-400" />
                Jitter Motion Animation
              </span>
              <span className="text-[10px] text-white/50 font-mono">
                Happy Faces: Landing Page
              </span>
            </div>

            <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight mb-1">
              Real Joy. Real Consumers.
            </h3>
            <p className="text-xs text-white/75 leading-relaxed mb-3">
              Experience the animated landing page motion from Jitter — celebrating approachable personality and authentic customer joy.
            </p>

            {/* Interactive Emoji Selector */}
            <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-3 flex-wrap">
              <span className="text-[10px] text-white/50 font-semibold mr-1">React:</span>
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCurrentReaction(emoji)}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                    currentReaction === emoji 
                      ? 'bg-white/30 scale-110 ring-1 ring-amber-400' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowFullModal(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all hover:scale-102"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Watch Animation</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPlayingMotion(!isPlayingMotion)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-300" />
                <span>{isPlayingMotion ? 'Hide Player' : 'Inline Player'}</span>
              </button>

              <a
                href={jitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-bold text-xs flex items-center gap-1 transition-all"
                title="Open directly in Jitter"
              >
                <span>Jitter</span>
                <ExternalLink className="w-3 h-3 text-white/50" />
              </a>
            </div>
          </div>
        </div>

        {/* Inline Expandable Jitter Player */}
        {isPlayingMotion && (
          <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white/90">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Jitter Interactive Motion Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPlayingMotion(false)}
                className="text-xs text-white/60 hover:text-white flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Close
              </button>
            </div>

            <div className="relative w-full rounded-2xl overflow-hidden border border-white/20 bg-slate-950 shadow-inner" style={{ height: '320px' }}>
              <iframe
                src={jitterUrl}
                title="Jitter Happy Faces Animation"
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>

      {/* Full Modal Viewer */}
      {showFullModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-500 text-slate-950 flex items-center justify-center font-bold">
                  <Smile className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Happy Faces: Landing Page Animation
                  </h3>
                  <p className="text-[11px] text-white/60">
                    Interactive motion design powered by Jitter
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={jitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white transition-all"
                  title="Open source in Jitter"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setShowFullModal(false);
                    if (onCloseModal) onCloseModal();
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Player Container */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-white/15 bg-black my-4 flex-1 min-h-[340px] sm:min-h-[420px]">
              <iframe
                src={jitterUrl}
                title="Happy Faces Landing Page Animation by Jitter"
                className="w-full h-full border-0 absolute inset-0"
                allow="autoplay; fullscreen"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Motion design: Approachable & joyful personality</span>
              </div>
              <a
                href={jitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>Edit in Jitter</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
