import { UserProfile, SubscriptionTier, FeedbackItem } from '../types';
import { phoneById } from '../data/initialData';

export interface BrandFolderMeta {
  id: string;
  name: string;
  icon: string;
  brandKey: string;
  monthlyUSD: number;
  yearlyUSD: number;
  sampleModels: string;
}

export const BRAND_FOLDER_DEFINITIONS: BrandFolderMeta[] = [
  {
    id: 'Samsung Galaxy (S1 to S25)',
    name: 'Samsung Galaxy (S1 to S25)',
    icon: '🌌',
    brandKey: 'samsung',
    monthlyUSD: 15.99,
    yearlyUSD: 149,
    sampleModels: 'S25 Ultra, S24 Ultra, S23, A55, Z Fold 6, Z Flip 6',
  },
  {
    id: 'iPhone (Models 1 to 18)',
    name: 'iPhone (Models 1 to 18)',
    icon: '🍏',
    brandKey: 'apple',
    monthlyUSD: 15.99,
    yearlyUSD: 149,
    sampleModels: 'iPhone 18 Pro Max, 17 Pro, 16 Pro, 15, 14, 13',
  },
  {
    id: 'Google Pixel',
    name: 'Google Pixel (Pixel 1 to 9)',
    icon: '🔍',
    brandKey: 'google',
    monthlyUSD: 13.99,
    yearlyUSD: 129,
    sampleModels: 'Pixel 9 Pro XL, Pixel 8 Pro, Pixel 7a, Pixel Fold',
  },
  {
    id: 'Xiaomi / Redmi / POCO',
    name: 'Xiaomi / Redmi / POCO',
    icon: '🟠',
    brandKey: 'xiaomi',
    monthlyUSD: 13.99,
    yearlyUSD: 129,
    sampleModels: 'Redmi Note 14 Pro+, Note 13 Pro, Xiaomi 14 Ultra, POCO F6',
  },
  {
    id: 'OnePlus',
    name: 'OnePlus (One to 13)',
    icon: '⚡',
    brandKey: 'oneplus',
    monthlyUSD: 13.99,
    yearlyUSD: 129,
    sampleModels: 'OnePlus 13, 12, Open, Nord 4, 11R',
  },
  {
    id: 'Vivo & iQOO',
    name: 'Vivo & iQOO',
    icon: '📸',
    brandKey: 'vivo',
    monthlyUSD: 13.99,
    yearlyUSD: 129,
    sampleModels: 'Vivo X100 Pro, V40 Pro, V30, iQOO 12',
  },
  {
    id: 'OPPO & Realme',
    name: 'OPPO & Realme',
    icon: '🟢',
    brandKey: 'oppo',
    monthlyUSD: 13.99,
    yearlyUSD: 129,
    sampleModels: 'Find X7 Ultra, Reno 12, Realme GT 6',
  },
  {
    id: 'Nothing Phone',
    name: 'Nothing Phone',
    icon: '⚪',
    brandKey: 'nothing',
    monthlyUSD: 11.99,
    yearlyUSD: 99,
    sampleModels: 'Nothing Phone 2, Phone 2a, CMF Phone 1',
  },
];

/**
 * Normalizes any phone id, brand name, or folder string into standard brand folder name
 */
export function normalizeBrandFolder(brandOrPhone: string): string {
  const b = (brandOrPhone || '').toLowerCase().trim();
  if (b.includes('apple') || b.includes('iphone')) return 'iPhone (Models 1 to 18)';
  if (b.includes('samsung') || b.includes('galaxy')) return 'Samsung Galaxy (S1 to S25)';
  if (b.includes('google') || b.includes('pixel')) return 'Google Pixel';
  if (b.includes('oneplus')) return 'OnePlus';
  if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco')) return 'Xiaomi / Redmi / POCO';
  if (b.includes('vivo') || b.includes('iqoo')) return 'Vivo & iQOO';
  if (b.includes('oppo') || b.includes('realme')) return 'OPPO & Realme';
  if (b.includes('nothing')) return 'Nothing Phone';
  return brandOrPhone || 'Samsung Galaxy (S1 to S25)';
}

/**
 * Resolves the strictly ONE active brand folder unlocked by the user's current subscription.
 * Policy: One subscription = One brand at a time. Switching to another brand requires purchasing again.
 */
export function getSingleActiveBrandFolder(
  user?: UserProfile,
  activePlan?: SubscriptionTier
): string | null {
  const candidates: string[] = [];

  if (activePlan?.targetCategory && activePlan.targetCategory.toLowerCase() !== 'all') {
    candidates.push(activePlan.targetCategory);
  }
  if (Array.isArray(activePlan?.unlockedCategories)) {
    activePlan.unlockedCategories.forEach((b) => {
      if (b && b.toLowerCase() !== 'all') candidates.push(b);
    });
  }
  if (Array.isArray(user?.unlockedBrandFolders)) {
    user.unlockedBrandFolders.forEach((b) => {
      if (b && b.toLowerCase() !== 'all') candidates.push(b);
    });
  }

  const first = candidates.find((c) => Boolean(c && c.trim() && c.trim().toLowerCase() !== 'all'));
  return first ? normalizeBrandFolder(first) : null;
}

/**
 * Determines whether the given brand or mobile phone review is unlocked for the current subscriber.
 * Enforces strict single-brand gating: only the 1 currently subscribed brand is unlocked.
 */
export function isBrandUnlocked(
  brandOrFolderOrPhoneId: string,
  userOrPlan?: UserProfile | SubscriptionTier,
  planOrUser?: SubscriptionTier | UserProfile
): boolean {
  let user: UserProfile | undefined;
  let activePlan: SubscriptionTier | undefined;

  if (userOrPlan && 'email' in userOrPlan) {
    user = userOrPlan as UserProfile;
    activePlan = (planOrUser && 'priceUSD' in planOrUser) ? (planOrUser as SubscriptionTier) : undefined;
  } else if (userOrPlan && ('priceUSD' in userOrPlan || 'planType' in userOrPlan)) {
    activePlan = userOrPlan as SubscriptionTier;
    user = (planOrUser && 'email' in planOrUser) ? (planOrUser as UserProfile) : undefined;
  } else {
    user = (planOrUser && 'email' in planOrUser) ? (planOrUser as UserProfile) : undefined;
    activePlan = (planOrUser && 'priceUSD' in planOrUser) ? (planOrUser as SubscriptionTier) : undefined;
  }

  const targetRaw = (brandOrFolderOrPhoneId || '').trim();
  const targetLower = targetRaw.toLowerCase();
  if (!targetRaw || targetLower === 'all') {
    return false;
  }

  const activeSingleFolder = getSingleActiveBrandFolder(user, activePlan);
  if (!activeSingleFolder) {
    return false;
  }

  const targetFolder = normalizeBrandFolder(targetRaw).toLowerCase();
  const activeLower = activeSingleFolder.toLowerCase();

  if (activeLower === targetFolder) return true;
  if (targetLower.includes('samsung') && (activeLower.includes('samsung') || activeLower.includes('galaxy'))) return true;
  if ((targetLower.includes('apple') || targetLower.includes('iphone')) && (activeLower.includes('apple') || activeLower.includes('iphone'))) return true;
  if (targetLower.includes('pixel') && (activeLower.includes('pixel') || activeLower.includes('google'))) return true;
  if (targetLower.includes('xiaomi') && (activeLower.includes('xiaomi') || activeLower.includes('redmi'))) return true;
  if (targetLower.includes('vivo') && (activeLower.includes('vivo') || activeLower.includes('iqoo'))) return true;
  if (targetLower.includes('oneplus') && activeLower.includes('oneplus')) return true;
  if (targetLower.includes('oppo') && (activeLower.includes('oppo') || activeLower.includes('realme'))) return true;
  if (targetLower.includes('nothing') && activeLower.includes('nothing')) return true;
  return false;
}

/**
 * Checks if a specific FeedbackItem review is unlocked
 */
export function isFeedbackItemUnlocked(
  feedback: FeedbackItem,
  user?: UserProfile,
  activePlan?: SubscriptionTier
): boolean {
  const p = phoneById(feedback.phone);
  const brandIdentifier = feedback.brandFolder || p.brand || p.name;
  return isBrandUnlocked(brandIdentifier, user, activePlan);
}

/**
 * Returns brand metadata by brand name/folder
 */
export function getBrandMeta(brandOrFolder: string): BrandFolderMeta {
  const norm = normalizeBrandFolder(brandOrFolder);
  const found = BRAND_FOLDER_DEFINITIONS.find((b) => b.id === norm || b.name === norm);
  return found || BRAND_FOLDER_DEFINITIONS[0];
}
