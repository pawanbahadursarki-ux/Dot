import { Achievement, ReviewerLevelInfo, UserProfile, FeedbackItem } from '../types';

export const BASE_ACHIEVEMENTS_TEMPLATE: Omit<Achievement, 'progress' | 'unlocked' | 'unlockedAt'>[] = [
  {
    id: 'first_video',
    title: 'First Video Feedback',
    subtitle: 'Pioneer Reviewer',
    description: 'Recorded and published your very first verified smartphone video feedback in the studio.',
    category: 'milestone',
    iconEmoji: '🎬',
    tier: 'bronze',
    points: 75,
    rewardNPR: 50,
    maxProgress: 1,
    requirementHint: 'Complete 1 video recording session with camera on.',
    badgeGradient: 'from-amber-600 via-amber-700 to-amber-900',
    glowColor: 'rgba(217, 119, 6, 0.4)',
  },
  {
    id: 'ten_positive_reviews',
    title: '10 Positive Reviews',
    subtitle: 'Positivity Champion',
    description: 'Published 10 constructive, high-satisfaction phone reviews with high sentiment scores.',
    category: 'quality',
    iconEmoji: '⭐',
    tier: 'gold',
    points: 250,
    rewardNPR: 150,
    maxProgress: 10,
    requirementHint: 'Publish 10 reviews rated 4 or 5 stars with positive AI sentiment.',
    badgeGradient: 'from-amber-400 via-yellow-500 to-amber-600',
    glowColor: 'rgba(245, 158, 11, 0.5)',
  },
  {
    id: 'most_helpful',
    title: 'Most Helpful Reviewer',
    subtitle: 'Community Influencer',
    description: 'Received 100+ helpful upvotes & buyer view endorsements across mobile brands.',
    category: 'influence',
    iconEmoji: '🏆',
    tier: 'gold',
    points: 200,
    rewardNPR: 100,
    maxProgress: 100,
    requirementHint: 'Accumulate 100+ helpful votes from real smartphone buyers.',
    badgeGradient: 'from-blue-500 via-indigo-600 to-violet-700',
    glowColor: 'rgba(79, 70, 229, 0.45)',
  },
  {
    id: 'weekly_streak',
    title: 'Consistent Weekly Feedback',
    subtitle: 'Weekly Streaker',
    description: 'Maintained active review consistency across 4 consecutive calendar weeks.',
    category: 'consistency',
    iconEmoji: '📅',
    tier: 'silver',
    points: 150,
    rewardNPR: 75,
    maxProgress: 4,
    requirementHint: 'Submit at least 1 verified feedback every week for 4 weeks.',
    badgeGradient: 'from-slate-400 via-slate-500 to-slate-700',
    glowColor: 'rgba(148, 163, 184, 0.4)',
  },
  {
    id: 'twenty_questions_ace',
    title: '20-Questions Ace',
    subtitle: 'Deep Tech Inspector',
    description: 'Completed all 20 comprehensive hardware, camera, gaming & potential questions in an AI call.',
    category: 'mastery',
    iconEmoji: '🧠',
    tier: 'silver',
    points: 120,
    rewardNPR: 50,
    maxProgress: 20,
    requirementHint: 'Answer all 20 interactive quiz criteria during a review call.',
    badgeGradient: 'from-teal-400 via-emerald-600 to-green-700',
    glowColor: 'rgba(16, 185, 129, 0.45)',
  },
  {
    id: 'flagship_expert',
    title: 'Flagship Connoisseur',
    subtitle: 'Pro Gadget Critic',
    description: 'Tested and reviewed 3 or more premium flagship smartphones (iPhone Pro, Galaxy Ultra, Pixel Pro).',
    category: 'mastery',
    iconEmoji: '👑',
    tier: 'diamond',
    points: 300,
    rewardNPR: 200,
    maxProgress: 3,
    requirementHint: 'Publish reviews for 3 flagship tier phones.',
    badgeGradient: 'from-cyan-400 via-blue-500 to-fuchsia-600',
    glowColor: 'rgba(6, 182, 212, 0.5)',
  },
  {
    id: 'cash_milestone',
    title: 'Wallet Pioneer',
    subtitle: 'High Earner',
    description: 'Crossed NPR 500+ in legitimate verified cash payouts to digital wallet.',
    category: 'milestone',
    iconEmoji: '💰',
    tier: 'silver',
    points: 100,
    rewardNPR: 50,
    maxProgress: 500,
    requirementHint: 'Accumulate total wallet earnings of NPR 500 or more.',
    badgeGradient: 'from-emerald-500 via-green-600 to-emerald-800',
    glowColor: 'rgba(34, 197, 94, 0.45)',
  },
  {
    id: 'polyglot_critic',
    title: 'Multilingual Voice',
    subtitle: 'Inclusive Reviewer',
    description: 'Recorded verified feedback in multiple languages (Nepali, English, or Hindi).',
    category: 'quality',
    iconEmoji: '🌐',
    tier: 'bronze',
    points: 80,
    rewardNPR: 40,
    maxProgress: 2,
    requirementHint: 'Record reviews using 2 different regional languages.',
    badgeGradient: 'from-violet-500 via-purple-600 to-fuchsia-700',
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
];

/**
 * Calculates current user achievement progress, unlocked state, and level info.
 */
export function calculateUserAchievements(
  user: UserProfile,
  allUserFeedback: FeedbackItem[] = []
): {
  achievements: Achievement[];
  levelInfo: ReviewerLevelInfo;
  totalUnlocked: number;
  totalXP: number;
  unlockedList: Achievement[];
  inProgressList: Achievement[];
} {
  // Normalize user identification
  const userNameClean = (user?.name || '').toLowerCase().trim();
  const userEmailClean = (user?.email || '').toLowerCase().trim();

  // Filter feedback submitted by this user (fallback to mock data count if new session)
  const myReviews = allUserFeedback.filter((fb) => {
    const fbUser = (fb.user || '').toLowerCase().trim();
    const fbEmail = (fb.userEmail || '').toLowerCase().trim();
    return (
      (userEmailClean && fbEmail === userEmailClean) ||
      (userNameClean && fbUser.includes(userNameClean)) ||
      (userNameClean && userNameClean.includes(fbUser))
    );
  });

  // Effective review count (seeded default for demo reviewers like Pawan)
  const isPawan = userNameClean.includes('pawan');
  const isSita = userNameClean.includes('sita');
  const baseCount = isPawan ? 6 : isSita ? 4 : 0;
  const effectiveReviewCount = Math.max(myReviews.length, baseCount);

  // 1. Positive reviews count (4-5 stars or positive sentiment)
  const positiveCountFromReviews = myReviews.filter(
    (fb) => fb.rating >= 4 || fb.sentiment === 'positive' || (fb.sentimentScore && fb.sentimentScore >= 70)
  ).length;
  const positiveReviewsCount = Math.max(positiveCountFromReviews, isPawan ? 5 : isSita ? 4 : 0);

  // 2. Helpful votes count
  const helpfulVotesFromReviews = myReviews.reduce((sum, fb) => sum + (fb.likesCount || 0) + Math.floor((fb.views || 0) / 4), 0);
  const totalHelpfulVotes = Math.max(helpfulVotesFromReviews, isPawan ? 124 : isSita ? 86 : 15);

  // 3. Weekly consistency (weeks active)
  const weeklyStreakWeeks = Math.min(4, Math.max(1, isPawan ? 4 : isSita ? 3 : Math.ceil(effectiveReviewCount / 2)));

  // 4. 20-Questions Ace (questions completed in full interview)
  const maxAnswersCount = myReviews.reduce((max, fb) => {
    const count = fb.allAnswers ? Object.keys(fb.allAnswers).length : 0;
    return Math.max(max, count);
  }, 0);
  const questionsAnsweredAce = Math.max(maxAnswersCount, isPawan || isSita ? 20 : 0);

  // 5. Flagship models count
  const flagshipKeywords = ['pro max', 'ultra', 'fold', 'pro', 'pixel 9', 's25', 's24', '16 pro'];
  const flagshipsReviewed = myReviews.filter((fb) => {
    const p = (fb.phone || '').toLowerCase();
    return flagshipKeywords.some((k) => p.includes(k));
  }).length;
  const effectiveFlagships = Math.max(flagshipsReviewed, isPawan ? 3 : isSita ? 2 : 0);

  // 6. Total wallet earnings
  const effectiveEarnings = Math.max(user?.totalEarned || 0, user?.walletBalance || 0, isPawan ? 550 : isSita ? 450 : 0);

  // 7. Languages count
  const languagesCount = isPawan ? 2 : isSita ? 2 : Math.min(2, Math.max(1, myReviews.length));

  // Build full achievements with real progress
  const achievements: Achievement[] = BASE_ACHIEVEMENTS_TEMPLATE.map((tpl) => {
    let progress = 0;
    let unlocked = false;
    let unlockedAt: string | undefined = undefined;

    switch (tpl.id) {
      case 'first_video':
        progress = effectiveReviewCount >= 1 ? 1 : 0;
        unlocked = progress >= tpl.maxProgress;
        if (unlocked) unlockedAt = 'Oct 12, 2026';
        break;

      case 'ten_positive_reviews':
        progress = Math.min(tpl.maxProgress, positiveReviewsCount);
        unlocked = progress >= tpl.maxProgress;
        if (unlocked) unlockedAt = 'Oct 19, 2026';
        break;

      case 'most_helpful':
        progress = Math.min(tpl.maxProgress, totalHelpfulVotes);
        unlocked = progress >= tpl.maxProgress;
        if (unlocked) unlockedAt = 'Oct 16, 2026';
        break;

      case 'weekly_streak':
        progress = Math.min(tpl.maxProgress, weeklyStreakWeeks);
        unlocked = progress >= tpl.maxProgress;
        if (unlocked) unlockedAt = 'Oct 18, 2026';
        break;

      case 'twenty_questions_ace':
        progress = Math.min(tpl.maxProgress, questionsAnsweredAce);
        unlocked = progress >= tpl.maxProgress;
        if (unlocked) unlockedAt = 'Oct 15, 2026';
        break;

      case 'flagship_expert':
        progress = Math.min(tpl.maxProgress, effectiveFlagships);
        unlocked = progress >= tpl.maxProgress;
        if (unlocked) unlockedAt = 'Oct 17, 2026';
        break;

      case 'cash_milestone':
        progress = Math.min(tpl.maxProgress, effectiveEarnings);
        unlocked = progress >= tpl.maxProgress;
        if (unlocked) unlockedAt = 'Oct 14, 2026';
        break;

      case 'polyglot_critic':
        progress = Math.min(tpl.maxProgress, languagesCount);
        unlocked = progress >= tpl.maxProgress;
        if (unlocked) unlockedAt = 'Oct 13, 2026';
        break;

      default:
        progress = 0;
        unlocked = false;
    }

    return {
      ...tpl,
      progress,
      unlocked,
      unlockedAt: unlocked ? (tpl.id === 'first_video' ? 'Oct 12, 2026' : unlockedAt || 'Recent') : undefined,
    };
  });

  const unlockedList = achievements.filter((a) => a.unlocked);
  const inProgressList = achievements.filter((a) => !a.unlocked);
  const totalUnlocked = unlockedList.length;

  // Calculate XP & Level
  const totalXP = unlockedList.reduce((sum, a) => sum + a.points, 0);

  // Level Progression:
  // Level 1: 0 - 150 XP
  // Level 2: 150 - 350 XP
  // Level 3: 350 - 650 XP
  // Level 4: 650 - 1000 XP
  // Level 5: 1000+ XP
  let level = 1;
  let title = 'Novice Reviewer';
  let tierEmoji = '🌱';
  let nextLevelXP = 150;
  let levelBaseXP = 0;

  if (totalXP >= 1000) {
    level = 5;
    title = 'Smartphone Monarchy Elite';
    tierEmoji = '👑';
    nextLevelXP = 1500;
    levelBaseXP = 1000;
  } else if (totalXP >= 650) {
    level = 4;
    title = 'Lead Hardware Analyst';
    tierEmoji = '💎';
    nextLevelXP = 1000;
    levelBaseXP = 650;
  } else if (totalXP >= 350) {
    level = 3;
    title = 'Master Tech Critic';
    tierEmoji = '⭐';
    nextLevelXP = 650;
    levelBaseXP = 350;
  } else if (totalXP >= 150) {
    level = 2;
    title = 'Verified Gadget Scout';
    tierEmoji = '🚀';
    nextLevelXP = 350;
    levelBaseXP = 150;
  }

  const range = nextLevelXP - levelBaseXP;
  const currentInRange = Math.max(0, totalXP - levelBaseXP);
  const progressPercent = Math.min(100, Math.round((currentInRange / range) * 100));

  const levelInfo: ReviewerLevelInfo = {
    level,
    title,
    name: title,
    currentXP: totalXP,
    nextLevelXP,
    progressPercent,
    tierEmoji,
    icon: tierEmoji,
  };

  return {
    achievements,
    levelInfo,
    totalUnlocked,
    totalXP,
    unlockedList,
    inProgressList,
  };
}
