import React, { useState } from 'react';
import { 
  Award, Trophy, Star, CheckCircle2, Lock, Sparkles, 
  ChevronRight, X, Flame, Zap, ShieldCheck, ArrowUpRight,
  TrendingUp, Calendar, Heart, Gift
} from 'lucide-react';
import { triggerConfetti } from '../utils/confettiEffect';
import { Achievement, ReviewerLevelInfo } from '../types';
import { rs } from '../data/initialData';

interface AchievementsSectionProps {
  achievements: Achievement[];
  levelInfo: ReviewerLevelInfo;
  totalUnlocked: number;
  totalXP: number;
  compact?: boolean;
  onViewAll?: () => void;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements,
  levelInfo,
  totalUnlocked,
  totalXP,
  compact = false,
  onViewAll,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'progress'>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'progress') return !a.unlocked;
    return true;
  });

  const handleCardClick = (ach: Achievement) => {
    setSelectedAchievement(ach);
    if (ach.unlocked) {
      try {
        triggerConfetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899'],
        });
      } catch {}
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'diamond':
        return { label: 'Diamond', bg: 'bg-cyan-500/10 text-cyan-600 border-cyan-300', dot: 'bg-cyan-500' };
      case 'gold':
        return { label: 'Gold', bg: 'bg-amber-500/10 text-amber-700 border-amber-300', dot: 'bg-amber-500' };
      case 'silver':
        return { label: 'Silver', bg: 'bg-slate-500/10 text-slate-700 border-slate-300', dot: 'bg-slate-400' };
      default:
        return { label: 'Bronze', bg: 'bg-amber-800/10 text-amber-900 border-amber-800/30', dot: 'bg-amber-800' };
    }
  };

  // Compact Mode (for quick profile previews or headers)
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-2xl p-4 border border-white/10 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{levelInfo.tierEmoji}</span>
            <div>
              <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Level {levelInfo.level} · {levelInfo.title}
              </div>
              <div className="text-[11px] text-white/60">
                {totalXP} XP · {totalUnlocked}/{achievements.length} Badges Unlocked
              </div>
            </div>
          </div>
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Small Horizontal Badges Preview */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {achievements.map((ach) => (
            <button
              key={ach.id}
              type="button"
              onClick={() => handleCardClick(ach)}
              className={`relative flex items-center justify-center w-11 h-11 rounded-xl shrink-0 border transition-all transform active:scale-95 ${
                ach.unlocked
                  ? 'bg-neutral-800 border-amber-400/50 shadow-md ring-1 ring-amber-400/30'
                  : 'bg-neutral-900/60 border-white/10 opacity-45 grayscale'
              }`}
              title={`${ach.title} (${ach.unlocked ? 'Unlocked' : `${ach.progress}/${ach.maxProgress}`})`}
            >
              <span className="text-xl">{ach.iconEmoji}</span>
              {ach.unlocked && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-neutral-950 flex items-center justify-center text-[8px] text-white font-black">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Full Screen / Expanded Profile View
  return (
    <div className="space-y-4">
      {/* 1. Reviewer Level & XP Progress Card */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 rounded-3xl p-5 border border-white/15 text-white shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-amber-500/20 to-purple-500/0 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl shadow-lg ring-4 ring-white/10">
                {levelInfo.tierEmoji}
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-neutral-950 text-[10px] font-black text-amber-400 border border-amber-400/50 shadow-xs">
                Lv.{levelInfo.level}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-black tracking-widest text-amber-400">
                  Reviewer Standing
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-white/10 text-white/80 border border-white/15">
                  Verified Identity
                </span>
              </div>
              <h3 className="text-lg font-black text-white leading-tight">
                {levelInfo.title}
              </h3>
              <p className="text-xs text-white/60">
                Unlocked {totalUnlocked} of {achievements.length} community milestones
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 bg-neutral-950/70 border border-white/10 rounded-2xl p-2.5 sm:self-center">
            <div className="px-3 text-center border-r border-white/10">
              <div className="text-[10px] font-bold text-white/50 uppercase">Total XP</div>
              <div className="text-base font-black text-amber-300 font-mono">{totalXP}</div>
            </div>
            <div className="px-3 text-center">
              <div className="text-[10px] font-bold text-white/50 uppercase">Badges</div>
              <div className="text-base font-black text-emerald-400 font-mono">
                {totalUnlocked}/{achievements.length}
              </div>
            </div>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-white/70">
            <span>Level {levelInfo.level} Progress</span>
            <span className="font-mono text-amber-300">{levelInfo.currentXP} / {levelInfo.nextLevelXP} XP ({levelInfo.progressPercent}%)</span>
          </div>
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-white/50 text-right">
            Earn {levelInfo.nextLevelXP - levelInfo.currentXP} more XP to reach Level {levelInfo.level + 1}
          </div>
        </div>
      </div>

      {/* 2. Filter Navigation Pills */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-2xl border border-neutral-200">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              filter === 'all'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All Badges ({achievements.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unlocked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
              filter === 'unlocked'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span>Unlocked</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
              {totalUnlocked}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
              filter === 'progress'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span>In Progress</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
              {achievements.length - totalUnlocked}
            </span>
          </button>
        </div>

        <span className="text-xs text-neutral-500 font-bold hidden sm:inline">
          Tap any badge for milestone details
        </span>
      </div>

      {/* 3. Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredAchievements.map((ach) => {
          const tier = getTierBadge(ach.tier);
          const percent = Math.min(100, Math.round((ach.progress / ach.maxProgress) * 100));

          return (
            <button
              key={ach.id}
              type="button"
              onClick={() => handleCardClick(ach)}
              className={`p-4 rounded-3xl border text-left transition-all transform active:scale-[0.99] cursor-pointer relative overflow-hidden flex flex-col justify-between group shadow-xs hover:shadow-md ${
                ach.unlocked
                  ? 'bg-white hover:bg-neutral-50/80 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-white/80 hover:bg-white border-neutral-200 opacity-90'
              }`}
            >
              {/* Unlocked Watermark Glow */}
              {ach.unlocked && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              )}

              {/* Top Row: Icon, Titles & Status */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Badge Icon with Tier Background */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm border transition-transform group-hover:scale-105 ${
                        ach.unlocked
                          ? 'bg-gradient-to-br from-amber-100 to-amber-200 border-amber-300 ring-2 ring-amber-400/20'
                          : 'bg-neutral-100 border-neutral-300 text-neutral-400'
                      }`}
                    >
                      {ach.iconEmoji}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-neutral-900 truncate">
                          {ach.title}
                        </span>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-extrabold border ${tier.bg}`}>
                          {tier.label}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-neutral-500 truncate">
                        {ach.subtitle}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  {ach.unlocked ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center gap-1 shrink-0 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-bold text-[10px] flex items-center gap-1 shrink-0 border border-neutral-200">
                      <Lock className="w-3 h-3 text-neutral-400" />
                      <span>{percent}%</span>
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-600 mt-2.5 leading-relaxed line-clamp-2">
                  {ach.description}
                </p>
              </div>

              {/* Bottom: Progress Bar & Rewards */}
              <div className="mt-3.5 pt-2.5 border-t border-neutral-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-neutral-500">Progress</span>
                  <span className={`font-mono ${ach.unlocked ? 'text-emerald-700 font-black' : 'text-neutral-700'}`}>
                    {ach.progress} / {ach.maxProgress} {ach.unlocked ? 'Completed' : ''}
                  </span>
                </div>

                <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      ach.unlocked
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-amber-500 to-orange-400'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] pt-0.5">
                  <span className="font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span>+{ach.points} XP</span>
                  </span>

                  {ach.rewardNPR && (
                    <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Gift className="w-3 h-3 text-emerald-600" />
                      <span>+{rs(ach.rewardNPR)} Bonus</span>
                    </span>
                  )}

                  {ach.unlockedAt && (
                    <span className="text-neutral-400 font-mono text-[9px]">
                      {ach.unlockedAt}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. Achievement Detail Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-6 shadow-2xl border border-neutral-200 relative overflow-hidden animate-in zoom-in-95 duration-200 space-y-4">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedAchievement(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center pt-2">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-300 flex items-center justify-center text-4xl mx-auto shadow-md ring-4 ring-amber-400/20">
                {selectedAchievement.iconEmoji}
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getTierBadge(selectedAchievement.tier).bg}`}>
                  {getTierBadge(selectedAchievement.tier).label} Tier
                </span>
                {selectedAchievement.unlocked ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Achievement Unlocked</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold border border-neutral-300 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>In Progress</span>
                  </span>
                )}
              </div>

              <h3 className="text-xl font-black text-neutral-900 mt-2">
                {selectedAchievement.title}
              </h3>
              <p className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">
                {selectedAchievement.subtitle}
              </p>
            </div>

            {/* Description & Requirements */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div>
                <span className="font-black text-neutral-800 block mb-0.5">About this Achievement:</span>
                <p className="text-neutral-600 leading-relaxed">
                  {selectedAchievement.description}
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-200">
                <span className="font-black text-neutral-800 block mb-0.5">How to Unlock:</span>
                <p className="text-neutral-600 leading-relaxed">
                  {selectedAchievement.requirementHint}
                </p>
              </div>

              {selectedAchievement.unlockedAt && (
                <div className="pt-2 border-t border-neutral-200 text-emerald-700 font-bold flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Awarded on {selectedAchievement.unlockedAt}</span>
                </div>
              )}
            </div>

            {/* Progress Meter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                <span>Milestone Progress</span>
                <span className="font-mono text-emerald-600">
                  {selectedAchievement.progress} / {selectedAchievement.maxProgress}
                </span>
              </div>
              <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    selectedAchievement.unlocked
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : 'bg-gradient-to-r from-amber-500 to-orange-400'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((selectedAchievement.progress / selectedAchievement.maxProgress) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Rewards */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Reviewer XP</div>
                <div className="text-sm font-black font-mono">+{selectedAchievement.points} XP</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Cash Reward</div>
                <div className="text-sm font-black font-mono">
                  {selectedAchievement.rewardNPR ? `+${rs(selectedAchievement.rewardNPR)}` : 'Honorary Badge'}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedAchievement(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs transition-colors"
            >
              Close Milestone
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
