import React, { useState, useMemo } from 'react';
import { triggerConfetti } from '../utils/confettiEffect';
import {
  Trophy, ThumbsUp, ShieldCheck, PartyPopper, Users
} from 'lucide-react';
import { FeedbackItem, RegisteredUser, UserProfile } from '../types';
import { rs } from '../data/initialData';

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  city: string;
  reviewCount: number;
  helpfulVotes: number;
  totalEarned: number;
  badgeName: string;
  badgeEmoji: string;
  isCurrentUser?: boolean;
}

interface UserLeaderboardProps {
  currentUser?: UserProfile;
  feedbackList?: FeedbackItem[];
  registeredUsers?: RegisteredUser[];
  onSelectUserReview?: (userName: string) => void;
  onBack?: () => void;
  className?: string;
}

export const UserLeaderboard: React.FC<UserLeaderboardProps> = ({
  currentUser,
  feedbackList = [],
  registeredUsers = [],
  className = '',
}) => {
  const [period, setPeriod] = useState<'month' | 'all_time'>('all_time');

  const leaderboard = useMemo<LeaderboardUser[]>(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const filteredFeedback = period === 'month'
      ? feedbackList.filter((f) => {
          if (!f.createdAt) return true;
          const t = new Date(f.createdAt).getTime();
          return !Number.isNaN(t) && now - t <= thirtyDaysMs;
        })
      : feedbackList;

    const map = new Map<string, LeaderboardUser>();

    filteredFeedback.forEach((item) => {
      const nameKey = (item.user || 'Reviewer').trim();
      const key = nameKey.toLowerCase();
      const existing = map.get(key);
      const bounty = item.rewardAmount ?? 150;
      const likes = item.likesCount ?? 0;

      if (existing) {
        existing.reviewCount += 1;
        existing.helpfulVotes += likes;
        existing.totalEarned += bounty;
        if (!existing.avatar && item.userAvatar) existing.avatar = item.userAvatar;
      } else {
        map.set(key, {
          id: item.id,
          rank: 0,
          name: nameKey,
          avatar: item.userAvatar || '',
          city: item.city || 'Nepal',
          reviewCount: 1,
          helpfulVotes: likes,
          totalEarned: bounty,
          badgeName: 'Verified Reviewer',
          badgeEmoji: '🌟',
          isCurrentUser: Boolean(
            currentUser?.isLoggedIn &&
            currentUser.name &&
            currentUser.name.toLowerCase() === key
          ),
        });
      }
    });

    if (period === 'all_time') {
      registeredUsers.forEach((ru) => {
        const key = (ru.name || '').trim().toLowerCase();
        if (key && !map.has(key) && ru.totalEarned > 0) {
          map.set(key, {
            id: ru.id,
            rank: 0,
            name: ru.name,
            avatar: ru.avatar || '',
            city: ru.city || 'Nepal',
            reviewCount: 0,
            helpfulVotes: 0,
            totalEarned: ru.totalEarned,
            badgeName: 'Member',
            badgeEmoji: '⭐',
            isCurrentUser: Boolean(
              currentUser?.isLoggedIn &&
              currentUser.email &&
              ru.email.toLowerCase() === currentUser.email.toLowerCase()
            ),
          });
        }
      });
    }

    const sorted = Array.from(map.values()).sort((a, b) => {
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return b.totalEarned - a.totalEarned;
    });

    return sorted.map((entry, idx) => {
      let badgeName = 'Contributor';
      let badgeEmoji = '⭐';
      if (idx === 0) {
        badgeName = 'Top Contributor';
        badgeEmoji = '👑';
      } else if (idx === 1) {
        badgeName = 'Silver Reviewer';
        badgeEmoji = '🥈';
      } else if (idx === 2) {
        badgeName = 'Bronze Reviewer';
        badgeEmoji = '🥉';
      }
      return { ...entry, rank: idx + 1, badgeName, badgeEmoji };
    });
  }, [feedbackList, registeredUsers, currentUser, period]);

  const triggerTop3Confetti = () => {
    triggerConfetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
      disableForReducedMotion: true,
    });
  };

  const top3 = leaderboard.slice(0, 3);
  const runnersUp = leaderboard.slice(3);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-indigo-950/80 border border-amber-400/30 text-white shadow-xl backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black border border-amber-400/30 mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>VERIFIED REVIEWER LEADERBOARD</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Live Contributor Rankings
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              Calculated live from real video feedback records stored in Cloud Firestore.
            </p>
          </div>

          {leaderboard.length > 0 && (
            <button
              type="button"
              onClick={triggerTop3Confetti}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <PartyPopper className="w-4 h-4 text-slate-950" />
              <span>Celebrate Leaders</span>
            </button>
          )}
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-white/10 flex-wrap">
          {[
            { id: 'month', label: 'Last 30 Days' },
            { id: 'all_time', label: 'All-Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id as 'month' | 'all_time')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                period === tab.id
                  ? 'bg-white text-slate-950 shadow-md font-extrabold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-white/10 text-center text-white space-y-2">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="font-bold text-sm">No Ranked Contributors Yet</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Submit a verified 1-minute video review to appear on the real-time contributor leaderboard.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-3xl bg-slate-900/90 border border-amber-400/30 text-white flex flex-col justify-between shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center font-mono">
                    #{entry.rank}
                  </span>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-amber-200 text-[10px] font-extrabold">
                    <span>{entry.badgeEmoji}</span>
                    <span>{entry.badgeName}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center my-3">
                  {entry.avatar ? (
                    <img
                      src={entry.avatar}
                      alt={entry.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-400 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center ring-2 ring-amber-400">
                      {entry.name.charAt(0)}
                    </div>
                  )}
                  <div className="font-extrabold text-sm text-white mt-2 truncate w-full flex items-center justify-center gap-1">
                    <span>{entry.name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <div className="text-[11px] text-slate-400">{entry.city}</div>
                </div>

                <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <div className="text-xs font-black text-white">{entry.reviewCount}</div>
                    <div className="text-[10px] text-slate-400">Reviews</div>
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-400">{rs(entry.totalEarned)}</div>
                    <div className="text-[10px] text-slate-400">Earned</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {runnersUp.length > 0 && (
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 shadow-xl space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                <span>Contributors Ranking</span>
                <span className="font-mono text-emerald-400">Live Firestore Totals</span>
              </div>
              <div className="space-y-1.5">
                {runnersUp.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      entry.isCurrentUser
                        ? 'bg-blue-600/20 border-blue-400/50'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-black text-slate-400 text-sm w-6 text-center">
                        #{entry.rank}
                      </span>
                      {entry.avatar ? (
                        <img src={entry.avatar} alt={entry.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                          {entry.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate">{entry.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {entry.city} • {entry.reviewCount} reviews
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-xs text-emerald-400">
                        {rs(entry.totalEarned)}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                        <ThumbsUp className="w-3 h-3 text-amber-400" />
                        <span>{entry.helpfulVotes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
