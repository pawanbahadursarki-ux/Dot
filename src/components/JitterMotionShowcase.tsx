import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, ChevronLeft, ChevronRight, Maximize2, 
  Sparkles, ExternalLink, RefreshCw, X, Eye, 
  RotateCw, Layers, Film, Compass
} from 'lucide-react';

interface JitterMotionShowcaseProps {
  className?: string;
  defaultMode?: 'orbit' | 'track';
  onClose?: () => void;
  isModal?: boolean;
}

export const JitterMotionShowcase: React.FC<JitterMotionShowcaseProps> = ({
  className = '',
  defaultMode = 'orbit',
  onClose,
  isModal = false,
}) => {
  const [activeMode, setActiveMode] = useState<'orbit' | 'track'>(defaultMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLiveEmbed, setShowLiveEmbed] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // --- ORBIT CARDS STATE ---
  const [orbitAngle, setOrbitAngle] = useState(0);
  const [isOrbitPlaying, setIsOrbitPlaying] = useState(true);
  const [selectedOrbitCard, setSelectedOrbitCard] = useState<number>(0);

  // --- TRACK SLIDESHOW STATE ---
  const [trackIndex, setTrackIndex] = useState(0);
  const [isTrackPlaying, setIsTrackPlaying] = useState(true);
  const [trackProgress, setTrackProgress] = useState(0);

  const orbitCards = [
    {
      id: 0,
      title: 'Galaxy S24 Ultra',
      badge: '200MP Quad Camera',
      color: 'from-blue-600 via-indigo-600 to-violet-800',
      accent: '#3b82f6',
      icon: '📸',
      quote: '“Night zoom camera captured lunar details with zero blur!”',
      reviewer: 'Pawan Bahadur · Top Reviewer',
      rating: '5.0 ★'
    },
    {
      id: 1,
      title: 'iPhone 16 Pro',
      badge: 'A18 Pro & Titanium',
      color: 'from-amber-600 via-orange-600 to-rose-700',
      accent: '#f59e0b',
      icon: '💎',
      quote: '“Camera Control button changes mobile street photography completely.”',
      reviewer: 'Maya Sharma · Verified Creator',
      rating: '4.9 ★'
    },
    {
      id: 2,
      title: 'Galaxy Z Fold 6',
      badge: 'Dual Screen Flex',
      color: 'from-emerald-600 via-teal-600 to-cyan-800',
      accent: '#10b981',
      icon: '🔄',
      quote: '“Hands-free recording in Flex mode is an absolute game changer.”',
      reviewer: 'Rohan KC · Tech Enthusiast',
      rating: '4.8 ★'
    },
    {
      id: 3,
      title: 'ROG Phone 8 Pro',
      badge: '165Hz Vapor Chamber',
      color: 'from-rose-600 via-red-600 to-amber-700',
      accent: '#f43f5e',
      icon: '🎮',
      quote: '“Rock-solid 120 FPS in PUBG without any thermal throttling.”',
      reviewer: 'Bibek Tamang · Esports Pro',
      rating: '5.0 ★'
    },
    {
      id: 4,
      title: 'Redmi Note 13 Pro+',
      badge: '120W HyperCharge',
      color: 'from-purple-600 via-fuchsia-600 to-pink-700',
      accent: '#a855f7',
      icon: '⚡',
      quote: '“Zero to 100% in under 20 minutes before heading to work.”',
      reviewer: 'Suman Thapa · Daily Reviewer',
      rating: '4.9 ★'
    }
  ];

  const trackSlides = [
    {
      id: '01',
      title: 'Studio Portrait & Low-Light Night Master',
      subtitle: 'Real 4K 60fps ISP Sensor Evaluation',
      highlight: 'Aura Light Ring + Optical Image Stabilization (OIS)',
      bg: 'from-slate-900 via-blue-950 to-slate-900',
      borderAccent: 'border-blue-500/30',
      textAccent: 'text-blue-400',
      specs: ['50MP Sony IMX920', '4K 60fps HDR', 'Studio Bokeh', 'Zero Shutter Lag'],
      tag: 'Camera Criterion'
    },
    {
      id: '02',
      title: '120W Extreme HyperCharge & 2-Day Battery',
      subtitle: 'Screen-On Time & Real Thermal Monitoring',
      highlight: '0 to 100% in 19 Minutes with Dual Vapor Chamber',
      bg: 'from-slate-900 via-emerald-950 to-slate-900',
      borderAccent: 'border-emerald-500/30',
      textAccent: 'text-emerald-400',
      specs: ['5400mAh Battery', '100W Wireless', 'Smart Bypass Charging', 'Battery Health 99%'],
      tag: 'Endurance Criterion'
    },
    {
      id: '03',
      title: '165Hz Fluid ProXDR & Direct Sunlight Visibility',
      subtitle: '4500 Nits Peak Outdoor Readability',
      highlight: 'Zero Reflection Gorilla Armor with PWM Eye Protection',
      bg: 'from-slate-900 via-amber-950 to-slate-900',
      borderAccent: 'border-amber-500/30',
      textAccent: 'text-amber-400',
      specs: ['1.5K 120Hz LTPO', '4500 nits Peak', '2160Hz PWM Dimming', 'Dolby Vision HDR'],
      tag: 'Display Criterion'
    },
    {
      id: '04',
      title: 'Dual Ultrasonic Triggers & Sustained Peak FPS',
      subtitle: 'Esports Gaming Without Thermal Throttling',
      highlight: 'LiquidCool Technology 4.0 Active Vapor Dissipation',
      bg: 'from-slate-900 via-purple-950 to-slate-900',
      borderAccent: 'border-purple-500/30',
      textAccent: 'text-purple-400',
      specs: ['Snapdragon 8 Gen 3', '24GB LPDDR5X', '165Hz Touch Sampling', 'Sub-40°C Peak'],
      tag: 'Performance Criterion'
    },
    {
      id: '05',
      title: 'Instant Nepal & Global Reviewer Payouts',
      subtitle: 'Direct Deposit to eSewa, Khalti & ConnectIPS',
      highlight: '100% Verified Customer Community with Fast Rewarding',
      bg: 'from-slate-900 via-teal-950 to-slate-900',
      borderAccent: 'border-teal-500/30',
      textAccent: 'text-teal-400',
      specs: ['Zero User Fee', 'Instant eSewa & Khalti', 'Verified Buyer Badge', 'Leaderboard Rewards'],
      tag: 'Community Trust'
    }
  ];

  // Orbit rotation animation loop
  useEffect(() => {
    if (!isOrbitPlaying || activeMode !== 'orbit' || showLiveEmbed) return;
    const interval = setInterval(() => {
      setOrbitAngle((prev) => (prev + 0.6) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isOrbitPlaying, activeMode, showLiveEmbed]);

  // Track slideshow progress loop
  useEffect(() => {
    if (!isTrackPlaying || activeMode !== 'track' || showLiveEmbed) return;
    const step = 2; // progress step
    const interval = setInterval(() => {
      setTrackProgress((prev) => {
        if (prev >= 100) {
          setTrackIndex((curr) => (curr + 1) % trackSlides.length);
          return 0;
        }
        return prev + step;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [isTrackPlaying, activeMode, showLiveEmbed, trackSlides.length]);

  const liveUrl = activeMode === 'orbit' 
    ? 'https://jitter.video/template/orbit-cards/'
    : 'https://jitter.video/template/the-track-slideshow/';

  const renderContent = () => (
    <div className="relative w-full overflow-hidden flex flex-col bg-slate-950 text-white rounded-3xl border border-white/15 shadow-2xl">
      {/* Top Controller Bar */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              setActiveMode('orbit');
              setShowLiveEmbed(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeMode === 'orbit'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>🪐 Orbit Cards Motion</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('track');
              setShowLiveEmbed(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeMode === 'track'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>🎞️ The Track Slideshow</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowLiveEmbed(!showLiveEmbed)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1.5 ${
              showLiveEmbed
                ? 'bg-blue-500/25 text-blue-300 border-blue-400/50'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showLiveEmbed ? 'Native Animation' : 'Jitter Web View'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
            title="Expand Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {(isModal || onClose) && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative min-h-[340px] sm:min-h-[400px] flex items-center justify-center overflow-hidden">
        {showLiveEmbed ? (
          <div className="relative w-full h-[380px] sm:h-[460px] bg-black">
            {isIframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 z-10 text-white text-xs">
                <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                <span>Loading Jitter template player...</span>
              </div>
            )}
            <iframe
              src={liveUrl}
              title={activeMode === 'orbit' ? 'Orbit Cards Animation' : 'The Track Slideshow'}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen"
              onLoad={() => setIsIframeLoading(false)}
            />
          </div>
        ) : activeMode === 'orbit' ? (
          // ======================== ORBIT CARDS 3D MOTION ========================
          <div className="relative w-full h-[380px] sm:h-[420px] flex items-center justify-center p-4 select-none overflow-hidden">
            {/* Ambient Background Aura */}
            <div className="absolute w-96 h-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
            <div className="absolute w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

            {/* Orbit Elliptical Rings */}
            <div 
              className="absolute w-[320px] sm:w-[460px] h-[160px] sm:h-[220px] rounded-full border border-blue-400/20 pointer-events-none"
              style={{
                transform: 'rotateX(60deg) rotateZ(-12deg)',
                boxShadow: '0 0 40px rgba(59, 130, 246, 0.1) inset'
              }}
            />
            <div 
              className="absolute w-[240px] sm:w-[360px] h-[120px] sm:h-[170px] rounded-full border border-dashed border-emerald-400/25 pointer-events-none"
              style={{
                transform: 'rotateX(60deg) rotateZ(18deg)'
              }}
            />

            {/* Orbital Center Sun / Core Badge */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center p-3 rounded-full bg-slate-900/90 border border-blue-400/40 backdrop-blur-xl shadow-2xl w-28 h-28 sm:w-32 sm:h-32">
              <span className="text-2xl animate-bounce">📱</span>
              <span className="text-[10px] font-mono text-emerald-400 font-extrabold uppercase tracking-wider mt-1">
                dot
              </span>
              <span className="text-[11px] font-black text-white leading-tight">
                Orbit Lab
              </span>
            </div>

            {/* Orbiting Cards in 3D Space */}
            {orbitCards.map((card, idx) => {
              // Calculate 3D circular position on orbital path
              const cardAngleRad = ((orbitAngle + (idx * (360 / orbitCards.length))) * Math.PI) / 180;
              const radiusX = typeof window !== 'undefined' && window.innerWidth < 640 ? 130 : 190;
              const radiusY = typeof window !== 'undefined' && window.innerWidth < 640 ? 65 : 90;
              
              const posX = Math.cos(cardAngleRad) * radiusX;
              const posY = Math.sin(cardAngleRad) * radiusY;
              
              // Z-depth calculation (front cards are scaled up and sharp, back cards are smaller and dimmed)
              const depth = (Math.sin(cardAngleRad) + 1) / 2; // 0 to 1
              const scale = 0.75 + (depth * 0.4); // 0.75 to 1.15
              const opacity = 0.5 + (depth * 0.5); // 0.5 to 1.0
              const zIndex = Math.round(depth * 30);

              const isFocused = selectedOrbitCard === idx;

              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedOrbitCard(idx)}
                  className="absolute cursor-pointer transition-transform duration-100 ease-out"
                  style={{
                    transform: `translate3d(${posX}px, ${posY}px, 0) scale(${scale})`,
                    zIndex: isFocused ? 40 : zIndex,
                    opacity: opacity,
                  }}
                >
                  <div className={`w-40 sm:w-48 p-3 rounded-2xl bg-gradient-to-br ${card.color} border ${
                    isFocused ? 'ring-4 ring-white border-white' : 'border-white/20'
                  } shadow-2xl backdrop-blur-xl text-left transform hover:-translate-y-1 transition-all`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">{card.icon}</span>
                      <span className="text-[9px] font-mono bg-black/40 text-white font-bold px-1.5 py-0.5 rounded-full border border-white/10">
                        {card.rating}
                      </span>
                    </div>

                    <div className="font-black text-xs text-white leading-tight truncate">
                      {card.title}
                    </div>

                    <div className="text-[9px] font-bold text-white/80 uppercase tracking-wide mt-0.5 truncate">
                      {card.badge}
                    </div>

                    <div className="text-[10px] text-white/90 font-medium italic mt-2 line-clamp-2 leading-snug">
                      {card.quote}
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-white/20 flex items-center justify-between text-[8px] text-white/70">
                      <span className="truncate">{card.reviewer.split('·')[0]}</span>
                      <span className="font-mono text-emerald-300 font-bold">Verified</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Orbit Controls Overlay Bottom */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-30 pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsOrbitPlaying(!isOrbitPlaying)}
                className="px-2.5 py-1 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white flex items-center gap-1.5 transition-colors"
              >
                {isOrbitPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-white" />}
                <span>{isOrbitPlaying ? 'Pause Orbit' : 'Auto Rotate'}</span>
              </button>

              <div className="flex items-center gap-1">
                {orbitCards.map((c, idx) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedOrbitCard(idx);
                      // set orbit angle so this card faces front
                      setOrbitAngle(360 - (idx * (360 / orbitCards.length)) + 90);
                    }}
                    className={`h-2 rounded-full transition-all ${
                      selectedOrbitCard === idx ? 'w-6 bg-blue-400' : 'w-2 bg-white/30'
                    }`}
                    title={c.title}
                  />
                ))}
              </div>

              <span className="text-[10px] font-mono text-slate-400 bg-black/50 px-2 py-0.5 rounded-md border border-white/10 hidden sm:inline-block">
                3D Kinetic Orbit
              </span>
            </div>
          </div>
        ) : (
          // ======================== THE TRACK SLIDESHOW ========================
          <div className="relative w-full h-[380px] sm:h-[420px] flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
            {/* Background Kinetic Lines */}
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <div className="w-full h-full" style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.05) 40px, rgba(255,255,255,0.05) 41px)'
              }} />
            </div>

            {/* Top Slide Meta Track */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-black text-emerald-400 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                  TRACK {trackSlides[trackIndex].id} / 0{trackSlides.length}
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {trackSlides[trackIndex].tag}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTrackIndex((prev) => (prev - 1 + trackSlides.length) % trackSlides.length);
                    setTrackProgress(0);
                  }}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsTrackPlaying(!isTrackPlaying)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                >
                  {isTrackPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrackIndex((prev) => (prev + 1) % trackSlides.length);
                    setTrackProgress(0);
                  }}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Track Slide Content with Kinetic Transition */}
            <div className="relative z-10 my-auto py-2">
              <div className="inline-block px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-xs font-mono font-bold text-emerald-300 mb-2.5">
                ★ {trackSlides[trackIndex].highlight}
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {trackSlides[trackIndex].title}
              </h2>

              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                {trackSlides[trackIndex].subtitle}
              </p>

              {/* Spec Chips Track */}
              <div className="flex flex-wrap gap-2 mt-4">
                {trackSlides[trackIndex].specs.map((spec, sIdx) => (
                  <span
                    key={sIdx}
                    className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 backdrop-blur-md"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{spec}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Kinetic Rail Progress Bar */}
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Momentum Slide Track</span>
                <span>{Math.round(trackProgress)}%</span>
              </div>

              {/* Segmented Track Progress */}
              <div className="grid grid-cols-5 gap-2">
                {trackSlides.map((slide, sIdx) => {
                  const isActive = trackIndex === sIdx;
                  const isPassed = trackIndex > sIdx;
                  return (
                    <div
                      key={slide.id}
                      onClick={() => {
                        setTrackIndex(sIdx);
                        setTrackProgress(0);
                      }}
                      className="cursor-pointer space-y-1 group"
                    >
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-100 rounded-full"
                          style={{
                            width: isActive ? `${trackProgress}%` : isPassed ? '100%' : '0%'
                          }}
                        />
                      </div>
                      <div className={`text-[10px] font-mono transition-colors truncate ${
                        isActive ? 'text-emerald-400 font-bold' : 'text-slate-500 group-hover:text-slate-300'
                      }`}>
                        {slide.id}. {slide.title.split(' ')[0]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">
            {activeMode === 'orbit' ? 'Orbit Cards Kinetic Showcase' : 'The Track Continuous Motion Reel'}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Jitter Motion Templates</span>
        </div>

        <a
          href={liveUrl}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
        >
          <span>Open on Jitter.video</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-fadeIn">
        <div className="relative w-full max-w-5xl max-h-[94vh] overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    );
  }

  return <div className={className}>{renderContent()}</div>;
};
