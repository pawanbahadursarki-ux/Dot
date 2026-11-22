export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  emoji: string;
  description: string;
  photo?: string;
  badge?: string;
  phoneCount?: number;
  priceRange?: string;
}

export interface MobileQuestion {
  k: string;
  title: string;
  subtitle?: string;
  hint: string;
  color: string;
  tint: string;
  icon: string;
  emoji: string;
  companyFocus?: string;
  categoryGroup?: 'camera_display' | 'battery_performance' | 'hardware_build' | 'software_ecosystem' | 'value_service';
}

export interface PhoneProduct {
  id: string;
  brand: string;
  name: string;
  spec: string;
  img: string;
  reward: number; // in NPR (e.g. 150)
  reviews: number;
  category?: string;
  description?: string;
  priceNPR?: number;
  releaseYear?: number;
  brandFolder?: string;
}

export interface CartData {
  orderId: string;
  productName: string;
  priceNPR: number;
  priceUSD: number;
  purchaseDate: string;
  retailer: string;
  invoiceNumber: string;
  verifiedPurchase: boolean;
  appVersion?: string;
  osVersion?: string;
}

export interface ReviewAnswerMap {
  like: string;
  dislike: string;
  comfort: string;
  improve: string;
}

export type FeedbackCategory = 'Bug Report' | 'Feature Request' | 'Compliment';

export interface FeedbackItem {
  id: string;
  user: string;
  userEmail?: string;
  userAvatar?: string;
  age: number;
  city: string;
  phone: string; // phone id e.g. 'ip16p'
  phoneName?: string;
  phoneBrand?: string;
  rating: number; // 1-5
  time: string;
  createdAt?: string;
  like: string;
  dislike: string;
  comfort: string;
  improve: string;
  seconds: number;
  videoDuration?: string;
  views?: number;
  likesCount?: number;
  sentiment?: 'positive' | 'neutral' | 'mixed' | 'negative';
  sentimentScore?: number; // 0 to 100 Gemini API sentiment score (e.g. 92% satisfied)
  sentimentSummary?: string; // AI generated 1-sentence sentiment summary
  sentimentTone?: string; // e.g. "Delighted & Satisfied", "Positive & Constructive"
  feedbackCategory?: FeedbackCategory; // Gemini AI auto-classification: 'Bug Report' | 'Feature Request' | 'Compliment'
  brandFolder?: string;
  fresh?: boolean;
  status?: string;
  cartData?: CartData;
  tags?: string[]; // Gemini AI generated descriptive tags e.g. ['Pricing', 'UX', 'Support', 'Camera', 'Battery']
  productPhotos?: string[];
  allAnswers?: Record<string, string>;
  hidePhoneModel?: boolean;
  verifiedDevice?: string;
  privacyProtected?: boolean;
  rewardAmount?: number;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  moderatedAt?: string;
  moderatedBy?: string;
  payoutStatus?: 'pending' | 'credited' | 'rejected';
  videoUrl?: string;
  transcriptText?: string;
  isBlocked?: boolean;
  blockReason?: string;
  aiSummary?: AiFeedbackSummary;
  appVersion?: string;
  osVersion?: string;
  defectStatus?: 'open' | 'investigating' | 'fixing' | 'resolved';
  defectResolutionNote?: string;
  defectFixedInVersion?: string;
}

export interface AiFeedbackSummary {
  mainTopics: string[];
  overallSentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // 0 to 100
  sentimentExplanation: string;
  improvementSuggestions: string[];
  summary: string;
  generatedAt: string;
  isAiGenerated?: boolean;
}

export interface WithdrawalTransaction {
  id: string;
  title: string;
  gateway: string;
  accountNumber: string;
  amount: number; // Base user payout (e.g. 100)
  companyProcessingFee: number; // 5% fee (e.g. 5)
  totalCompanyCharge: number; // Base + 5% (e.g. 105)
  userFee: number; // 0 for reviewer!
  when: string;
  status: 'Completed' | 'Pending' | 'Processing';
  referenceId: string;
  transferReference?: string;
  receiptNote?: string;
  paidByAdminId?: string;
  paidByAdminName?: string;
  paidAt?: string;
  currency: string;
}

export interface Gateway {
  id: string;
  name: string;
  sub: string;
  mark: string;
  bg: string;
  field: string;
  val: string;
  isNepal: boolean;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  priceUSD: number;
  priceYearlyUSD?: number;
  reviewQuota: number;
  popular?: boolean;
  features: string[];
  planType?: 'single_category' | 'durable_limited' | 'unlimited';
  targetCategory?: string; // e.g. 'samsung', 'apple', 'all'
  categoryName?: string;
  unlockedCategories?: string[]; // IDs of unlocked brand categories e.g. ['samsung'] or ['all']
}

export interface BrandCategoryPass {
  id: string;
  brandId: string;
  brandName: string;
  iconEmoji: string;
  priceUSD: number;
  priceYearlyUSD?: number;
  description: string;
  modelsIncluded: string;
}

export interface AiVoiceTone {
  id: string;
  name: string;
  emoji: string;
  pitch: number;
  rate: number;
  description: string;
  samplePhrase: string;
  badge: string;
}

export interface UserProfile {
  name: string;
  nickname?: string;
  email: string;
  phone?: string;
  password?: string;
  city?: string;
  avatar: string;
  role: 'consumer' | 'company_admin';
  accountMode?: 'customer' | 'company';
  isGoogleVerified: boolean;
  googleId: string;
  walletBalance: number;
  totalEarned: number;
  isLoggedIn?: boolean;
  gender?: 'male' | 'female' | 'other';
  title?: 'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.';
  preferredVoiceTone?: string;
  achievements?: string[];
  unlockedBrandFolders?: string[]; // e.g. ['Samsung Galaxy (S1 to S25)'] or ['all']
  subscriptionBillingCycle?: 'monthly' | 'yearly';
}

export interface RegisteredUser {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  phone: string;
  password: string;
  city: string;
  role: 'consumer' | 'company_admin';
  accountMode?: 'customer' | 'company';
  avatar: string;
  isGoogleVerified: boolean;
  googleId: string;
  walletBalance: number;
  totalEarned: number;
  createdAt: string;
  gender?: 'male' | 'female' | 'other';
  title?: 'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.';
  preferredVoiceTone?: string;
  achievements?: string[];
  unlockedBrandFolders?: string[];
  subscriptionBillingCycle?: 'monthly' | 'yearly';
  isBlocked?: boolean;
  status?: 'active' | 'banned' | 'suspended';
  banReason?: string;
  bannedAt?: string;
}

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type AchievementCategory = 'milestone' | 'quality' | 'influence' | 'consistency' | 'mastery';

export interface Achievement {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: AchievementCategory;
  iconEmoji: string;
  tier: AchievementTier;
  points: number;
  rewardNPR?: number;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
  requirementHint: string;
  badgeGradient: string;
  glowColor: string;
}

export interface ReviewerLevelInfo {
  level: number;
  title: string;
  name?: string;
  currentXP: number;
  nextLevelXP: number;
  progressPercent: number;
  tierEmoji: string;
  icon?: string;
}

export interface AdminAuditLog {
  id: string;
  type: 'review_submitted' | 'review_approved' | 'review_rejected' | 'withdrawal_requested' | 'withdrawal_approved' | 'withdrawal_rejected' | 'user_registered' | 'subscription_purchased' | 'alert_triggered' | 'user_blocked' | 'user_unblocked' | 'idea_blocked' | 'idea_unblocked';
  title: string;
  description: string;
  actor: string;
  actorEmail?: string;
  actorAvatar?: string;
  targetId?: string;
  badge?: string;
  severity?: 'normal' | 'success' | 'warning' | 'danger';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AdminWithdrawalRequest {
  id: string;
  user: string;
  userEmail: string;
  userAvatar?: string;
  gateway: string;
  accountNumber: string;
  amountNPR: number;
  companyFeeNPR: number;
  netPayoutNPR: number;
  status: 'pending' | 'approved' | 'rejected';
  referenceId?: string;
  transferReference?: string;
  receiptNote?: string;
  paidByAdminId?: string;
  paidByAdminName?: string;
  paidAt?: string;
  rejectionReason?: string;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface AdminBrandMetric {
  brand: string;
  folder: string;
  icon: string;
  totalReviews: number;
  approvedCount: number;
  pendingCount: number;
  avgRating: number;
  avgSentiment: number;
  subscribersCount: number;
}

export interface KhaltiQrSettings {
  enabled: boolean;
  qrImagePath: string;
  accountHolderName: string;
  khaltiNumber?: string;
  stage1Notice?: string;
  khaltiMode?: 'test' | 'live';
  updatedBy: string;
  updatedAt: string;
}

export interface PaymentOrderRecord {
  id: string;
  purchaseOrderId: string;
  uid: string;
  companyName: string;
  companyEmail?: string;
  planId: string;
  planName: string;
  planType: 'single_category' | 'durable_limited' | 'unlimited';
  billingCycle: 'monthly' | 'yearly';
  brandCategory: string;
  categoryName: string;
  reviewQuota: number;
  amountUSD: number;
  amountNPR: number;
  amountPaisa: number;
  stage: 'stage1_manual_qr' | 'stage2_khalti_api';
  paymentMethod: 'khalti_qr' | 'khalti_api';
  status:
    | 'initiated'
    | 'pending'
    | 'completed'
    | 'verified'
    | 'rejected'
    | 'failed'
    | 'cancelled'
    | 'refunded'
    | 'mismatch_error';
  receiverKhaltiNumber?: string;
  receiverAccountName: string;
  payerAccountOrBank?: string;
  submittedAmountNPR?: number;
  transactionReference?: string;
  screenshotUrl?: string;
  pidx?: string;
  khaltiTransactionId?: string;
  errorReason?: string;
  verifiedByAdminId?: string;
  verifiedByAdminName?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  paymentRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EarningsLedgerEntry {
  id: string;
  uid: string;
  entryType: 'feedback_reward' | 'withdrawal_debit' | 'withdrawal_refund';
  sourceId: string;
  amountNPR: number;
  description: string;
  status: 'credited' | 'debited' | 'refunded';
  approvedByAdminId?: string;
  createdAt: string;
}

