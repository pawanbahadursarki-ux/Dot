import { User, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  AdminWithdrawalRequest,
  FeedbackItem,
  KhaltiQrSettings,
  PaymentOrderRecord,
  RegisteredUser,
  SubscriptionTier,
  UserProfile,
  WithdrawalTransaction,
} from '../types';
import { validateKhaltiNumericTxnId } from '../utils/khaltiReceiptScanner';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'pawanbahadursarki@gmail.com';

export const DEFAULT_KHALTI_QR_SETTINGS: KhaltiQrSettings = {
  enabled: true,
  qrImagePath: './assets/aistudio/IMG_20261118_155031_5b173d2b.jpg',
  accountHolderName: 'Sudip Damai',
  stage1Notice:
    'Manual Khalti QR Payment: Scan the QR code for Sudip Damai, enter the exact subscription NPR amount, and submit your Khalti Transaction ID. Subscriptions stay Pending Verification until Admin confirms payment arrived.',
  updatedBy: BOOTSTRAPPED_ADMIN_EMAIL,
  updatedAt: new Date().toISOString(),
};

export interface PaymentRecord {
  id: string;
  uid: string;
  payerName: string;
  planId: string;
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  brandCategory: string;
  amountUSD: number;
  amountNPR: number;
  method: 'bank' | 'online' | 'card' | 'khalti_qr' | 'khalti_api';
  gateway: string;
  referenceId: string;
  orderId?: string;
  purchaseOrderId?: string;
  khaltiPidx?: string;
  khaltiTxnId?: string;
  stage?: 'stage1_manual_qr' | 'stage2_khalti_api' | 'direct';
  payerAccountOrBank?: string;
  verifiedByAdminId?: string;
  verifiedByAdminName?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  status: 'completed' | 'verified';
  createdAt: string;
}

export async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in with Google before continuing.');
  }
  return user.getIdToken();
}

export function isStaticHostMissingApi(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = (err as { status?: number }).status;
  const code = (err as { code?: string }).code;
  return status === 404 || status === 405 || code === 'STATIC_HOST_NO_API';
}

export async function authedFetch<T = Record<string, any>>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getFirebaseIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const resp = await fetch(url, { ...options, headers });
  const contentType = (resp.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html') && !contentType.includes('application/json')) {
    const err = new Error(`Backend endpoint unavailable on static host (${resp.status})`) as Error & {
      code?: string;
      status?: number;
    };
    err.code = 'STATIC_HOST_NO_API';
    err.status = 404;
    throw err;
  }
  const data = (await resp.json().catch(() => ({}))) as Record<string, any>;
  if (!resp.ok) {
    const err = new Error(data?.error || `Request failed (${resp.status})`) as Error & {
      code?: string;
      status?: number;
      payload?: Record<string, any>;
    };
    err.code = data?.code;
    err.status = resp.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

export interface ActiveSubscriptionDoc {
  uid: string;
  planId: string;
  planName: string;
  planType: 'single_category' | 'durable_limited' | 'unlimited';
  billingCycle: 'monthly' | 'yearly';
  priceUSD: number;
  targetCategory: string;
  categoryName: string;
  unlockedBrands: string[];
  reviewQuota: number;
  status: 'active' | 'expired';
  paymentRef: string;
  createdAt: string;
  updatedAt: string;
}

export function isValidFirestoreId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
}

export function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function sanitizeAvatarUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.length > 500) return '';
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return '';
}

function tsToIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function formatRelativeTime(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  if (Number.isNaN(ms) || ms < 60_000) return 'Just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function isBootstrappedAdminUser(firebaseUser: User | null | undefined): boolean {
  return (
    Boolean(firebaseUser?.emailVerified) &&
    firebaseUser?.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );
}

const PENDING_AUTH_MODE_KEY = 'fp_pending_auth_mode';

function readStoredPendingAuthMode(): 'customer' | 'company' | null {
  try {
    const val = sessionStorage.getItem(PENDING_AUTH_MODE_KEY);
    return val === 'customer' || val === 'company' ? val : null;
  } catch {
    return null;
  }
}

let pendingAuthAccountMode: 'customer' | 'company' | null = readStoredPendingAuthMode();

export function setPendingAuthAccountMode(mode: 'customer' | 'company' | null): void {
  pendingAuthAccountMode = mode;
  try {
    if (mode) {
      sessionStorage.setItem(PENDING_AUTH_MODE_KEY, mode);
    } else {
      sessionStorage.removeItem(PENDING_AUTH_MODE_KEY);
    }
  } catch {
    // Ignore storage restrictions
  }
}

export interface AuthorizedDomainsStatus {
  projectId: string;
  projectNumber: string;
  currentHost: string;
  authorizedDomains: string[];
  isCurrentDomainAuthorized: boolean;
  authorizedAppUrl: string | null;
}

export function isHostInAuthorizedDomains(hostname: string, domains: string[]): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') return true;
  return domains.some((d) => {
    const clean = d.trim().toLowerCase();
    return clean === host || host.endsWith(`.${clean}`);
  });
}

export async function fetchAuthorizedFirebaseDomains(): Promise<AuthorizedDomainsStatus> {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const resp = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${encodeURIComponent(firebaseConfig.apiKey)}`
  );
  if (!resp.ok) {
    throw new Error(`Unable to check Firebase Authentication domains (HTTP ${resp.status}).`);
  }
  const data = (await resp.json()) as {
    projectId?: string;
    authorizedDomains?: string[];
  };
  const authorizedDomains = Array.isArray(data.authorizedDomains) ? data.authorizedDomains : [];
  const preHost =
    authorizedDomains.find((d) => d.startsWith('ais-pre-') && d.endsWith('.run.app')) ||
    authorizedDomains.find((d) => d.startsWith('ais-dev-') && d.endsWith('.run.app')) ||
    null;

  return {
    projectId: firebaseConfig.projectId,
    projectNumber: String(data.projectId || ''),
    currentHost,
    authorizedDomains,
    isCurrentDomainAuthorized: isHostInAuthorizedDomains(currentHost, authorizedDomains),
    authorizedAppUrl: preHost ? `https://${preHost}` : null,
  };
}

function formatGoogleAuthError(err: unknown): Error {
  const code = (err as { code?: string })?.code || '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (code === 'auth/unauthorized-domain') {
    const targetHost = hostname || 'pawanbahadursarki-ux.github.io';
    return new Error(
      `This domain (${targetHost}) is not yet authorized in Firebase Authentication for project "${firebaseConfig.projectId}". Add "${targetHost}" under Firebase Console → Authentication → Settings → Authorized domains (https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings).`
    );
  }
  if (code === 'auth/popup-closed-by-user') {
    return new Error('Google Sign-In window was closed before completing sign-in.');
  }
  if (code === 'auth/network-request-failed') {
    return new Error('Network error while connecting to Google Sign-In. Check your internet connection and try again.');
  }
  if (err instanceof Error) return err;
  return new Error('Google Sign-In failed. Please try again.');
}

export async function signInWithGooglePopup(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    if (!cred.user.emailVerified) {
      throw new Error('Google email verification is required to access dot.');
    }
    return cred.user;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const shouldFallbackToRedirect =
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment';

    if (shouldFallbackToRedirect) {
      try {
        await signInWithRedirect(auth, googleProvider);
        // Browser will navigate away to Google Sign-In; keep pending until redirect returns
        return await new Promise<User>(() => {});
      } catch (redirectErr: unknown) {
        throw formatGoogleAuthError(redirectErr);
      }
    }

    throw formatGoogleAuthError(err);
  }
}

export async function consumeGoogleRedirectAuth(): Promise<{
  user: User;
  preferredMode: 'customer' | 'company' | undefined;
} | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) return null;
    if (!result.user.emailVerified) {
      setPendingAuthAccountMode(null);
      throw new Error('Google email verification is required to access dot.');
    }
    const preferredMode = pendingAuthAccountMode || readStoredPendingAuthMode() || undefined;
    return { user: result.user, preferredMode };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/no-auth-event' || code === 'auth/null-user') {
      return null;
    }
    setPendingAuthAccountMode(null);
    throw formatGoogleAuthError(err);
  }
}

export async function signOutFirebase(): Promise<void> {
  setPendingAuthAccountMode(null);
  await signOut(auth);
}

const ensureUserInFlight = new Map<
  string,
  Promise<UserProfile & { status: 'active' | 'banned' | 'suspended' }>
>();

export async function ensureUserDocsInFirestore(
  firebaseUser: User,
  preferredAccountMode?: 'customer' | 'company'
): Promise<UserProfile & { status: 'active' | 'banned' | 'suspended' }> {
  const uid = firebaseUser.uid;
  const existingPromise = ensureUserInFlight.get(uid);
  if (existingPromise) {
    return existingPromise;
  }

  const chosenMode =
    preferredAccountMode || pendingAuthAccountMode || readStoredPendingAuthMode() || undefined;

  const workPromise = (async (): Promise<UserProfile & { status: 'active' | 'banned' | 'suspended' }> => {
    const userRef = doc(db, 'users', uid);
    const privateRef = doc(db, 'users', uid, 'private', 'info');

    let userSnap;
    let privateSnap;

    try {
      [userSnap, privateSnap] = await Promise.all([getDoc(userRef), getDoc(privateRef)]);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }

    const email = (firebaseUser.email || '').trim().toLowerCase();
    const cleanDisplayName = (firebaseUser.displayName || '').trim();
    const displayName = (cleanDisplayName || email.split('@')[0] || 'Reviewer').slice(0, 100);
    const safeAvatar = sanitizeAvatarUrl(firebaseUser.photoURL);
    const defaultNickname = (email.split('@')[0] || 'reviewer').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40);

    if (!userSnap.exists() || !privateSnap.exists()) {
      const batch = writeBatch(db);

      if (!userSnap.exists()) {
        batch.set(userRef, {
          uid,
          displayName,
          nickname: defaultNickname,
          ...(safeAvatar ? { avatar: safeAvatar } : {}),
          city: 'Kathmandu',
          role: 'consumer',
          accountMode: chosenMode || 'customer',
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (!privateSnap.exists()) {
        batch.set(privateRef, {
          uid,
          email: email || `${uid}@users.dot.app`,
          walletBalance: 0,
          totalEarned: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
        [userSnap, privateSnap] = await Promise.all([getDoc(userRef), getDoc(privateRef)]);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }
    }

    let pub = userSnap.data() || {};
    const priv = privateSnap.data() || {};
    const isAdmin = isBootstrappedAdminUser(firebaseUser);

    // If an older user doc was created before accountMode existed, bind it once to chosenMode
    if (
      userSnap.exists() &&
      pub.accountMode !== 'customer' &&
      pub.accountMode !== 'company' &&
      chosenMode &&
      !isAdmin
    ) {
      try {
        await updateDoc(userRef, {
          accountMode: chosenMode,
          updatedAt: serverTimestamp(),
        });
        pub = { ...pub, accountMode: chosenMode };
      } catch {
        // Legacy docs created prior to strict schema rules may contain extra keys; keep chosenMode in session without blocking sign-in
        pub = { ...pub, accountMode: chosenMode };
      }
    }

    const resolvedAccountMode: 'customer' | 'company' | undefined =
      pub.accountMode === 'company' || pub.accountMode === 'customer'
        ? pub.accountMode
        : chosenMode;

    return {
      name: String(pub.displayName || displayName),
      nickname: typeof pub.nickname === 'string' ? pub.nickname : defaultNickname,
      email: String(priv.email || email),
      phone: typeof priv.phone === 'string' ? priv.phone : '',
      city: typeof pub.city === 'string' ? pub.city : 'Kathmandu',
      avatar: sanitizeAvatarUrl(pub.avatar) || safeAvatar,
      role: isAdmin ? 'company_admin' : 'consumer',
      accountMode: isAdmin ? undefined : resolvedAccountMode,
      isGoogleVerified: Boolean(firebaseUser.emailVerified),
      googleId: uid,
      walletBalance: typeof priv.walletBalance === 'number' ? priv.walletBalance : 0,
      totalEarned: typeof priv.totalEarned === 'number' ? priv.totalEarned : 0,
      isLoggedIn: true,
      gender: priv.gender,
      title: priv.title,
      preferredVoiceTone: priv.preferredVoiceTone,
      unlockedBrandFolders: [],
      status: pub.status || 'active',
    };
  })();

  ensureUserInFlight.set(uid, workPromise);
  try {
    return await workPromise;
  } finally {
    ensureUserInFlight.delete(uid);
    pendingAuthAccountMode = null;
  }
}

export async function updateUserProfileInFirestore(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const publicPatch: Record<string, unknown> = {};
  const privatePrefPatch: Record<string, unknown> = {};

  if (typeof updates.name === 'string' && updates.name.trim().length > 0) {
    publicPatch.displayName = updates.name.trim().slice(0, 100);
  }
  if (typeof updates.nickname === 'string') {
    publicPatch.nickname = updates.nickname.trim().slice(0, 60);
  }
  if (typeof updates.city === 'string') {
    publicPatch.city = updates.city.trim().slice(0, 80);
  }
  if (typeof updates.avatar === 'string') {
    const safe = sanitizeAvatarUrl(updates.avatar);
    if (safe) {
      publicPatch.avatar = safe;
    }
  }

  if (typeof updates.phone === 'string') {
    privatePrefPatch.phone = updates.phone.trim().slice(0, 30);
  }
  if (typeof updates.preferredVoiceTone === 'string') {
    privatePrefPatch.preferredVoiceTone = updates.preferredVoiceTone.trim().slice(0, 40);
  }
  if (updates.gender === 'male' || updates.gender === 'female' || updates.gender === 'other') {
    privatePrefPatch.gender = updates.gender;
  }
  if (typeof updates.title === 'string') {
    privatePrefPatch.title = updates.title.trim().slice(0, 20);
  }

  if (Object.keys(publicPatch).length > 0) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...publicPatch,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  }

  if (Object.keys(privatePrefPatch).length > 0) {
    try {
      await updateDoc(doc(db, 'users', uid, 'private', 'info'), {
        ...privatePrefPatch,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/private/info`);
    }
  }
}

export async function submitRealFeedbackBatch(params: {
  uid: string;
  user: UserProfile;
  feedback: FeedbackItem;
}): Promise<FeedbackItem> {
  const { uid, user, feedback } = params;
  const { phoneById } = await import('../data/initialData');
  const phone = phoneById(feedback.phone);
  const feedbackId = isValidFirestoreId(feedback.id) ? feedback.id : makeSafeId('fb');

  const safeRating = Math.min(5, Math.max(1, Math.round(Number(feedback.rating) || 4)));
  const safeSeconds = Math.min(600, Math.max(1, Math.round(Number(feedback.seconds) || 60)));
  const rewardAmount = Math.min(250, Math.max(0, Math.round(Number(feedback.rewardAmount ?? phone.reward ?? 150))));
  const safeAvatar = sanitizeAvatarUrl(feedback.userAvatar || user.avatar);
  const cartOrderId = (feedback.cartData?.orderId || `ORD-FP-${Date.now().toString().slice(-6)}`).slice(0, 80);
  const cartPriceUSD = Math.min(10000, Math.max(0, Math.round(Number(feedback.cartData?.priceUSD || (phone.reward * 0.75 + 399)))));
  const safeTags = (feedback.tags || [])
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim().slice(0, 40))
    .slice(0, 8);

  if (auth.currentUser) {
    try {
      const privSnap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
      if (!privSnap.exists()) {
        await ensureUserDocsInFirestore(auth.currentUser, user.accountMode);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`);
    }
  }

  const brandKey = (phone.brand || 'smartphone').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64) || 'smartphone';

  const docPayload: Record<string, unknown> = {
    id: feedbackId,
    uid,
    authorName: ((user.name || '').trim() || (feedback.user || '').trim() || 'Verified Reviewer').slice(0, 100),
    ...(safeAvatar ? { authorAvatar: safeAvatar } : {}),
    city: (feedback.city || user.city || 'Kathmandu').slice(0, 80),
    phoneId: (phone.id || feedback.phone || 's24u').slice(0, 64),
    phoneName: (phone.name || feedback.phoneName || 'Smartphone').slice(0, 120),
    phoneBrand: (phone.brand || feedback.phoneBrand || 'Brand').slice(0, 64),
    brandKey,
    brandFolder: (feedback.brandFolder || phone.brand || 'General').slice(0, 120),
    rating: safeRating,
    like: (feedback.like || '').slice(0, 1200),
    dislike: (feedback.dislike || '').slice(0, 1200),
    comfort: (feedback.comfort || '').slice(0, 1200),
    improve: (feedback.improve || '').slice(0, 1200),
    seconds: safeSeconds,
    ...(typeof feedback.sentimentScore === 'number'
      ? { sentimentScore: Math.min(100, Math.max(0, Math.round(feedback.sentimentScore))) }
      : {}),
    ...(feedback.sentimentSummary ? { sentimentSummary: feedback.sentimentSummary.slice(0, 600) } : {}),
    ...(feedback.sentimentTone ? { sentimentTone: feedback.sentimentTone.slice(0, 80) } : {}),
    ...(feedback.feedbackCategory ? { feedbackCategory: feedback.feedbackCategory } : {}),
    tags: safeTags,
    ...(feedback.osVersion ? { osVersion: feedback.osVersion.slice(0, 120) } : {}),
    ...(feedback.appVersion ? { appVersion: feedback.appVersion.slice(0, 80) } : {}),
    ...(feedback.videoUrl ? { videoUrl: feedback.videoUrl.slice(0, 500) } : {}),
    ...(feedback.transcriptText ? { transcriptText: feedback.transcriptText.slice(0, 2500) } : {}),
    rewardAmount,
    cartOrderId,
    cartPriceUSD,
    defectStatus: 'open',
    moderationStatus: 'pending',
    payoutStatus: 'pending',
    visibility: 'company_portal',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Security Policy: User earnings are NEVER credited on submission.
  // Wallet credit happens strictly inside Admin approval (moderateFeedbackInFirestore).
  const batch = writeBatch(db);
  batch.set(doc(db, 'feedback', feedbackId), docPayload);

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `feedback/${feedbackId}`);
  }

  return {
    ...feedback,
    id: feedbackId,
    user: String(docPayload.authorName),
    userAvatar: safeAvatar || feedback.userAvatar,
    phone: String(docPayload.phoneId),
    phoneName: String(docPayload.phoneName),
    phoneBrand: String(docPayload.phoneBrand),
    rating: safeRating,
    seconds: safeSeconds,
    rewardAmount,
    ...(feedback.videoUrl ? { videoUrl: feedback.videoUrl.slice(0, 500) } : {}),
    ...(feedback.transcriptText ? { transcriptText: feedback.transcriptText.slice(0, 2500) } : {}),
    moderationStatus: 'pending',
    payoutStatus: 'pending',
    defectStatus: 'open',
    time: 'Just now',
    createdAt: new Date().toISOString(),
  };
}

export async function requestRealWithdrawalBatch(params: {
  uid: string;
  userName: string;
  gateway: string;
  accountNumber: string;
  amountNPR: number;
}): Promise<AdminWithdrawalRequest> {
  const { uid, userName, gateway, accountNumber, amountNPR } = params;
  const cleanAccount = accountNumber.trim().slice(0, 120);
  const roundedAmount = Math.round(amountNPR);

  if (roundedAmount < 100 || roundedAmount > 50000) {
    throw new Error('Withdrawal amount must be between Rs 100 and Rs 50,000.');
  }
  if (cleanAccount.length < 3) {
    throw new Error('Enter a valid payout account number or mobile wallet.');
  }

  const privateRef = doc(db, 'users', uid, 'private', 'info');
  let privSnap;
  try {
    privSnap = await getDoc(privateRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`);
  }

  if (!privSnap.exists()) {
    throw new Error('Wallet profile not found. Please sign in again.');
  }

  // Prevent duplicate pending withdrawal requests by the same user
  try {
    const existingWdSnap = await getDocs(query(collection(db, 'withdrawals'), where('uid', '==', uid)));
    const hasPending = existingWdSnap.docs.some((d) => d.data()?.status === 'pending');
    if (hasPending) {
      throw new Error(
        'You already have a pending withdrawal request awaiting Admin payout. Wait for it to settle before requesting another.'
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('already have a pending withdrawal')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.LIST, 'withdrawals');
  }

  const priv = privSnap.data();
  const currentBalance = Number(priv.walletBalance ?? 0);

  if (roundedAmount > currentBalance) {
    throw new Error(`Insufficient wallet balance (Available: Rs ${currentBalance}).`);
  }

  const withdrawalId = makeSafeId('wd');
  const ledgerId = makeSafeId('led');
  const referenceId = `WDL-${Date.now().toString().slice(-6)}`;
  const companyFeeNPR = Math.round(roundedAmount * 0.05 * 100) / 100;

  const batch = writeBatch(db);
  batch.set(doc(db, 'withdrawals', withdrawalId), {
    id: withdrawalId,
    uid,
    userName: (userName || 'Reviewer').slice(0, 100),
    gateway: gateway.slice(0, 80),
    accountNumber: cleanAccount,
    amountNPR: roundedAmount,
    companyFeeNPR,
    netPayoutNPR: roundedAmount,
    status: 'pending',
    referenceId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Strict rules allow updating only ['walletBalance', 'lastWithdrawalRef', 'updatedAt'] atomically with withdrawal doc
  batch.update(privateRef, {
    walletBalance: currentBalance - roundedAmount,
    lastWithdrawalRef: withdrawalId,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'earnings_ledger', ledgerId), {
    id: ledgerId,
    uid,
    entryType: 'withdrawal_debit',
    sourceId: withdrawalId,
    amountNPR: -roundedAmount,
    description: `Withdrawal request via ${gateway} (${cleanAccount})`.slice(0, 300),
    status: 'debited',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `withdrawals/${withdrawalId}`);
  }

  try {
    await authedFetch('/api/ledger/record-event', {
      method: 'POST',
      body: JSON.stringify({
        entryType: 'withdrawal_debit',
        sourceId: withdrawalId,
        uid,
        amountNPR: -roundedAmount,
        description: `Withdrawal request via ${gateway} (${cleanAccount})`,
      }),
    });
  } catch {
    // Non-fatal mirror to backend ledger
  }

  return {
    id: withdrawalId,
    user: userName,
    userEmail: String(priv.email || ''),
    gateway,
    accountNumber: cleanAccount,
    amountNPR: roundedAmount,
    companyFeeNPR,
    netPayoutNPR: roundedAmount,
    status: 'pending',
    referenceId,
    requestedAt: new Date().toISOString(),
  };
}

export async function completeSubscriptionPaymentBatch(params: {
  uid: string;
  payerName: string;
  plan: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  brandCategory: string;
  unlockedBrands: string[];
  amountUSD: number;
  amountNPR: number;
  method: 'bank' | 'online' | 'card';
  gateway: string;
  referenceId: string;
}): Promise<{ payment: PaymentRecord; subscription: ActiveSubscriptionDoc }> {
  const {
    uid,
    payerName,
    plan,
    billingCycle,
    brandCategory,
    unlockedBrands,
    amountUSD,
    amountNPR,
    method,
    gateway,
    referenceId,
  } = params;

  const paymentId = makeSafeId('pay');
  const resolvedBrand =
    [
      brandCategory,
      plan.targetCategory,
      ...(Array.isArray(unlockedBrands) ? unlockedBrands : []),
    ]
      .map((b) => String(b || '').trim())
      .find((b) => b.length > 0 && b.toLowerCase() !== 'all') || 'samsung';
  const cleanBrands = [resolvedBrand.slice(0, 64)];

  const subRef = doc(db, 'subscriptions', uid);
  let subExists = false;
  let existingCreatedAtIso = new Date().toISOString();
  try {
    const existingSub = await getDoc(subRef);
    if (existingSub.exists()) {
      subExists = true;
      existingCreatedAtIso = tsToIso(existingSub.data()?.createdAt);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `subscriptions/${uid}`);
  }

  const safePriceUSD = Math.min(5000, Math.max(0.01, Number(amountUSD) || 15.99));
  const safeAmountUSD = Math.min(10000, Math.max(0.01, Number(amountUSD) || 15.99));
  const safeAmountNPR = Math.min(2000000, Math.max(1, Math.round(Number(amountNPR) || safeAmountUSD * 134)));
  const planType = plan.planType || 'single_category';
  const targetCategory = resolvedBrand.slice(0, 64);
  const categoryName = (plan.categoryName && !plan.categoryName.toLowerCase().includes('all brand')
    ? plan.categoryName
    : resolvedBrand
  ).slice(0, 120);

  const batch = writeBatch(db);
  batch.set(doc(db, 'payments', paymentId), {
    id: paymentId,
    uid,
    payerName: (payerName || 'Company Subscriber').slice(0, 120),
    planId: (plan.id || 'single_category').slice(0, 64),
    planName: (plan.name || 'Subscription Plan').slice(0, 120),
    billingCycle,
    brandCategory: targetCategory,
    amountUSD: safeAmountUSD,
    amountNPR: safeAmountNPR,
    method,
    gateway: gateway.slice(0, 80),
    referenceId: referenceId.slice(0, 120),
    status: 'completed',
    createdAt: serverTimestamp(),
  });

  const subUpdateFields = {
    planId: (plan.id || 'single_category').slice(0, 64),
    planName: (plan.name || 'Subscription Plan').slice(0, 120),
    planType,
    billingCycle,
    priceUSD: safePriceUSD,
    targetCategory,
    categoryName,
    unlockedBrands: cleanBrands,
    reviewQuota: Math.min(1000000, Math.max(1, Math.round(Number(plan.reviewQuota || 150)))),
    status: 'active',
    paymentRef: paymentId,
    updatedAt: serverTimestamp(),
  };

  if (subExists) {
    batch.update(subRef, subUpdateFields);
  } else {
    batch.set(subRef, {
      uid,
      ...subUpdateFields,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `subscriptions/${uid}`);
  }

  const nowIso = new Date().toISOString();
  return {
    payment: {
      id: paymentId,
      uid,
      payerName,
      planId: plan.id,
      planName: plan.name,
      billingCycle,
      brandCategory: targetCategory,
      amountUSD: safeAmountUSD,
      amountNPR: safeAmountNPR,
      method,
      gateway,
      referenceId,
      status: 'completed',
      createdAt: nowIso,
    },
    subscription: {
      uid,
      planId: plan.id,
      planName: plan.name,
      planType,
      billingCycle,
      priceUSD: safePriceUSD,
      targetCategory,
      categoryName,
      unlockedBrands: cleanBrands,
      reviewQuota: plan.reviewQuota || 150,
      status: 'active',
      paymentRef: paymentId,
      createdAt: existingCreatedAtIso,
      updatedAt: nowIso,
    },
  };
}

export async function updateFeedbackDefectInFirestore(params: {
  feedbackId: string;
  defectStatus: 'open' | 'investigating' | 'fixing' | 'resolved';
  defectResolutionNote?: string;
  defectFixedInVersion?: string;
}): Promise<void> {
  const { feedbackId, defectStatus, defectResolutionNote, defectFixedInVersion } = params;
  try {
    await updateDoc(doc(db, 'feedback', feedbackId), {
      defectStatus,
      defectResolutionNote: (defectResolutionNote || '').slice(0, 1000),
      defectFixedInVersion: (defectFixedInVersion || '').slice(0, 80),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `feedback/${feedbackId}`);
  }
}

export async function moderateFeedbackInFirestore(params: {
  feedbackId: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  payoutStatus: 'pending' | 'credited' | 'rejected';
  visibility?: 'company_portal' | 'private';
  defectResolutionNote?: string;
}): Promise<{ creditedAmountNPR: number }> {
  const { feedbackId, moderationStatus, payoutStatus, visibility, defectResolutionNote } = params;
  const fbRef = doc(db, 'feedback', feedbackId);

  let fbSnap;
  try {
    fbSnap = await getDoc(fbRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `feedback/${feedbackId}`);
  }

  if (!fbSnap.exists()) {
    throw new Error('Feedback record not found in Firestore.');
  }

  const fbData = fbSnap.data();
  const patch: Record<string, unknown> = {
    moderationStatus,
    payoutStatus,
    updatedAt: serverTimestamp(),
  };
  if (visibility) patch.visibility = visibility;
  if (typeof defectResolutionNote === 'string') {
    patch.defectResolutionNote = defectResolutionNote.slice(0, 1000);
  }

  const shouldCreditReward =
    moderationStatus === 'approved' &&
    payoutStatus === 'credited' &&
    fbData.payoutStatus !== 'credited' &&
    Number(fbData.rewardAmount || 0) > 0 &&
    typeof fbData.uid === 'string' &&
    fbData.uid.length > 0;

  const rewardAmount = shouldCreditReward ? Math.round(Number(fbData.rewardAmount || 0)) : 0;
  const batch = writeBatch(db);
  batch.update(fbRef, patch);

  if (shouldCreditReward && rewardAmount > 0) {
    const fbUid = String(fbData.uid);
    const privateRef = doc(db, 'users', fbUid, 'private', 'info');
    let privSnap;
    try {
      privSnap = await getDoc(privateRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${fbUid}/private/info`);
    }

    if (privSnap.exists()) {
      const priv = privSnap.data();
      batch.update(privateRef, {
        walletBalance: Number(priv.walletBalance ?? 0) + rewardAmount,
        totalEarned: Number(priv.totalEarned ?? 0) + rewardAmount,
        updatedAt: serverTimestamp(),
      });
    }

    const ledgerId = makeSafeId('led');
    batch.set(doc(db, 'earnings_ledger', ledgerId), {
      id: ledgerId,
      uid: fbUid,
      entryType: 'feedback_reward',
      sourceId: feedbackId,
      amountNPR: rewardAmount,
      description: `Approved video feedback reward (${String(fbData.phoneName || fbData.phoneId || 'Smartphone')})`.slice(0, 300),
      status: 'credited',
      approvedByAdminId: (auth.currentUser?.uid || 'admin').slice(0, 128),
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `feedback/${feedbackId}`);
  }

  if (shouldCreditReward && rewardAmount > 0) {
    try {
      await authedFetch('/api/ledger/record-event', {
        method: 'POST',
        body: JSON.stringify({
          entryType: 'feedback_reward',
          sourceId: feedbackId,
          uid: String(fbData.uid),
          amountNPR: rewardAmount,
          description: `Approved video feedback reward (${String(fbData.phoneName || fbData.phoneId || 'Smartphone')})`,
        }),
      });
    } catch {
      // Non-fatal mirror to backend ledger
    }
  }

  return { creditedAmountNPR: rewardAmount };
}

export async function bulkApprovePendingFeedbackInFirestore(pendingIds: string[]): Promise<number> {
  if (pendingIds.length === 0) return 0;
  const targetIds = pendingIds.slice(0, 120);

  const fbSnaps = await Promise.all(targetIds.map((id) => getDoc(doc(db, 'feedback', id))));
  const creditsByUid = new Map<string, number>();
  const ledgerEntries: Array<{ id: string; uid: string; sourceId: string; amountNPR: number; phoneName: string }> = [];
  const validFeedbackIds: string[] = [];

  fbSnaps.forEach((snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    const fid = String(d.id || snap.id);
    validFeedbackIds.push(fid);
    if (d.payoutStatus !== 'credited' && Number(d.rewardAmount || 0) > 0 && typeof d.uid === 'string' && d.uid) {
      const amt = Math.round(Number(d.rewardAmount || 0));
      const fUid = String(d.uid);
      creditsByUid.set(fUid, (creditsByUid.get(fUid) || 0) + amt);
      ledgerEntries.push({
        id: makeSafeId('led'),
        uid: fUid,
        sourceId: fid,
        amountNPR: amt,
        phoneName: String(d.phoneName || d.phoneId || 'Smartphone'),
      });
    }
  });

  const uidList = Array.from(creditsByUid.keys());
  const privSnaps = await Promise.all(uidList.map((u) => getDoc(doc(db, 'users', u, 'private', 'info'))));
  const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  validFeedbackIds.forEach((id) => {
    ops.push((batch) =>
      batch.update(doc(db, 'feedback', id), {
        moderationStatus: 'approved',
        payoutStatus: 'credited',
        updatedAt: serverTimestamp(),
      })
    );
  });

  uidList.forEach((u, idx) => {
    const privSnap = privSnaps[idx];
    const addAmt = creditsByUid.get(u) || 0;
    if (privSnap?.exists() && addAmt > 0) {
      const priv = privSnap.data();
      ops.push((batch) =>
        batch.update(doc(db, 'users', u, 'private', 'info'), {
          walletBalance: Number(priv.walletBalance ?? 0) + addAmt,
          totalEarned: Number(priv.totalEarned ?? 0) + addAmt,
          updatedAt: serverTimestamp(),
        })
      );
    }
  });

  ledgerEntries.forEach((entry) => {
    ops.push((batch) =>
      batch.set(doc(db, 'earnings_ledger', entry.id), {
        id: entry.id,
        uid: entry.uid,
        entryType: 'feedback_reward',
        sourceId: entry.sourceId,
        amountNPR: entry.amountNPR,
        description: `Bulk approved video reward (${entry.phoneName})`.slice(0, 300),
        status: 'credited',
        approvedByAdminId: (auth.currentUser?.uid || 'admin').slice(0, 128),
        createdAt: serverTimestamp(),
      })
    );
  });

  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach((fn) => fn(batch));
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'feedback');
    }
  }

  for (const entry of ledgerEntries) {
    try {
      await authedFetch('/api/ledger/record-event', {
        method: 'POST',
        body: JSON.stringify({
          entryType: 'feedback_reward',
          sourceId: entry.sourceId,
          uid: entry.uid,
          amountNPR: entry.amountNPR,
          description: `Bulk approved video reward (${entry.phoneName})`,
        }),
      });
    } catch {
      // Non-fatal
    }
  }

  return validFeedbackIds.length;
}

export async function approveWithdrawalInFirestore(params: {
  withdrawalId: string;
  uid?: string;
  amountNPR?: number;
  gateway?: string;
  transferReference: string;
  receiptNote?: string;
  adminId: string;
  adminName: string;
}): Promise<void> {
  const { withdrawalId, uid, amountNPR, gateway, transferReference, receiptNote, adminId, adminName } = params;
  const cleanRef = transferReference.trim().slice(0, 120);
  if (cleanRef.length < 3) {
    throw new Error('Enter the real payout transfer reference ID (minimum 3 characters).');
  }
  const cleanNote = (receiptNote || `Settled manually via ${gateway || 'payout channel'}`).trim().slice(0, 400);

  try {
    await updateDoc(doc(db, 'withdrawals', withdrawalId), {
      status: 'approved',
      referenceId: cleanRef,
      transferReference: cleanRef,
      receiptNote: cleanNote,
      paidByAdminId: adminId.slice(0, 128),
      paidByAdminName: adminName.slice(0, 120),
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${withdrawalId}`);
  }

  try {
    await authedFetch('/api/ledger/record-event', {
      method: 'POST',
      body: JSON.stringify({
        entryType: 'withdrawal_paid',
        sourceId: withdrawalId,
        uid: uid || '',
        amountNPR: Number(amountNPR || 0),
        description: `Payout settled via ${gateway || 'wallet'} (Ref: ${cleanRef})`,
        transferReference: cleanRef,
        receiptNote: cleanNote,
      }),
    });
  } catch {
    // Non-fatal mirror to backend ledger
  }
}

export async function rejectWithdrawalAndRefundBatch(params: {
  withdrawalId: string;
  uid: string;
  amountNPR: number;
  reason: string;
}): Promise<void> {
  const { withdrawalId, uid, amountNPR, reason } = params;
  const privateRef = doc(db, 'users', uid, 'private', 'info');
  let privSnap;
  try {
    privSnap = await getDoc(privateRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`);
  }

  const refundAmt = Math.round(amountNPR);
  const ledgerId = makeSafeId('led');

  const batch = writeBatch(db);
  batch.update(doc(db, 'withdrawals', withdrawalId), {
    status: 'rejected',
    rejectionReason: reason.slice(0, 400),
    updatedAt: serverTimestamp(),
  });

  if (privSnap.exists()) {
    const priv = privSnap.data();
    batch.update(privateRef, {
      walletBalance: Number(priv.walletBalance ?? 0) + refundAmt,
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'earnings_ledger', ledgerId), {
    id: ledgerId,
    uid,
    entryType: 'withdrawal_refund',
    sourceId: withdrawalId,
    amountNPR: refundAmt,
    description: `Refunded rejected withdrawal: ${reason}`.slice(0, 300),
    status: 'refunded',
    approvedByAdminId: (auth.currentUser?.uid || 'admin').slice(0, 128),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `withdrawals/${withdrawalId}`);
  }

  try {
    await authedFetch('/api/ledger/record-event', {
      method: 'POST',
      body: JSON.stringify({
        entryType: 'withdrawal_refund',
        sourceId: withdrawalId,
        uid,
        amountNPR: refundAmt,
        description: `Refunded rejected withdrawal: ${reason}`,
      }),
    });
  } catch {
    // Non-fatal
  }
}

export async function toggleUserStatusInFirestore(
  uid: string,
  status: 'active' | 'banned' | 'suspended'
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

function mapFeedbackDoc(data: Record<string, any>): FeedbackItem {
  const createdAtIso = tsToIso(data.createdAt);
  const phoneId = String(data.phoneId || 's24u');
  const fallbackBrand = phoneId.startsWith('ip')
    ? 'Apple'
    : phoneId.startsWith('op')
    ? 'OnePlus'
    : phoneId.startsWith('xi') || phoneId.startsWith('rm')
    ? 'Xiaomi'
    : phoneId.startsWith('vv') || phoneId.startsWith('iq')
    ? 'vivo'
    : phoneId.startsWith('px')
    ? 'Google'
    : 'Samsung';
  const fallbackName = String(data.phoneName || phoneId.toUpperCase());
  const resolvedBrand = String(data.phoneBrand || fallbackBrand);
  const rating = Number(data.rating || 4);
  const score = typeof data.sentimentScore === 'number' ? data.sentimentScore : Math.min(100, Math.max(20, rating * 19 + 5));
  const isBlocked = data.moderationStatus === 'rejected' && data.visibility === 'private';

  return {
    id: String(data.id || ''),
    user: String(data.authorName || 'Reviewer'),
    userEmail: data.uid ? `${String(data.uid).slice(0, 8)}@verified` : undefined,
    userAvatar: sanitizeAvatarUrl(data.authorAvatar),
    age: 26,
    city: String(data.city || 'Nepal'),
    phone: phoneId,
    phoneName: fallbackName,
    phoneBrand: resolvedBrand,
    rating,
    time: formatRelativeTime(createdAtIso),
    createdAt: createdAtIso,
    like: String(data.like || ''),
    dislike: String(data.dislike || ''),
    comfort: String(data.comfort || ''),
    improve: String(data.improve || ''),
    seconds: Number(data.seconds || 60),
    sentiment: score >= 75 ? 'positive' : score >= 50 ? 'neutral' : 'negative',
    sentimentScore: score,
    sentimentSummary: data.sentimentSummary ? String(data.sentimentSummary) : undefined,
    sentimentTone: data.sentimentTone ? String(data.sentimentTone) : undefined,
    feedbackCategory: data.feedbackCategory || 'Compliment',
    brandFolder: data.brandFolder ? String(data.brandFolder) : resolvedBrand,
    tags: Array.isArray(data.tags) ? data.tags : [],
    osVersion: data.osVersion ? String(data.osVersion) : undefined,
    appVersion: data.appVersion ? String(data.appVersion) : undefined,
    rewardAmount: Number(data.rewardAmount || 150),
    moderationStatus: data.moderationStatus || 'pending',
    payoutStatus: data.payoutStatus || 'pending',
    defectStatus: data.defectStatus || 'open',
    defectResolutionNote: data.defectResolutionNote ? String(data.defectResolutionNote) : undefined,
    defectFixedInVersion: data.defectFixedInVersion ? String(data.defectFixedInVersion) : undefined,
    ...(data.videoUrl ? { videoUrl: String(data.videoUrl) } : {}),
    ...(data.transcriptText ? { transcriptText: String(data.transcriptText) } : {}),
    isBlocked,
    blockReason: isBlocked && data.defectResolutionNote ? String(data.defectResolutionNote) : undefined,
    moderationReason: data.moderationStatus === 'rejected' && data.defectResolutionNote ? String(data.defectResolutionNote) : undefined,
    cartData: {
      orderId: String(data.cartOrderId || `ORD-${phoneId.toUpperCase()}`),
      productName: `${resolvedBrand} ${fallbackName}`,
      priceNPR: Math.round(Number(data.cartPriceUSD || 499) * 134),
      priceUSD: Number(data.cartPriceUSD || 499),
      purchaseDate: new Date(createdAtIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      retailer: 'Verified Retailer',
      invoiceNumber: `INV-${String(data.cartOrderId || '').slice(-5) || '00001'}`,
      verifiedPurchase: true,
      appVersion: data.appVersion ? String(data.appVersion) : undefined,
      osVersion: data.osVersion ? String(data.osVersion) : undefined,
    },
    ...(data.uid ? { uid: String(data.uid) } : {}),
  } as FeedbackItem & { uid?: string };
}

export function subscribeUserPrivateWallet(
  uid: string,
  onData: (patch: Partial<UserProfile>) => void
): Unsubscribe {
  const path = `users/${uid}/private/info`;
  return onSnapshot(
    doc(db, 'users', uid, 'private', 'info'),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onData({
        walletBalance: Number(d.walletBalance ?? 0),
        totalEarned: Number(d.totalEarned ?? 0),
        phone: typeof d.phone === 'string' ? d.phone : '',
        preferredVoiceTone: d.preferredVoiceTone,
        gender: d.gender,
        title: d.title,
      });
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeUserSubscription(
  uid: string,
  onData: (sub: ActiveSubscriptionDoc | null) => void
): Unsubscribe {
  const path = `subscriptions/${uid}`;
  return onSnapshot(
    doc(db, 'subscriptions', uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const d = snap.data();
      onData({
        uid: String(d.uid || uid),
        planId: String(d.planId || 'single_category'),
        planName: String(d.planName || ''),
        planType: d.planType || 'single_category',
        billingCycle: d.billingCycle || 'monthly',
        priceUSD: Number(d.priceUSD || 15.99),
        targetCategory: String(d.targetCategory || ''),
        categoryName: String(d.categoryName || ''),
        unlockedBrands: Array.isArray(d.unlockedBrands) ? d.unlockedBrands : [],
        reviewQuota: Number(d.reviewQuota || 150),
        status: d.status || 'active',
        paymentRef: String(d.paymentRef || ''),
        createdAt: tsToIso(d.createdAt),
        updatedAt: tsToIso(d.updatedAt),
      });
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeCompanyFeedback(
  isAdmin: boolean,
  onData: (items: (FeedbackItem & { uid?: string })[]) => void
): Unsubscribe {
  const path = 'feedback';
  const q = isAdmin
    ? query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))
    : query(collection(db, 'feedback'), where('visibility', '==', 'company_portal'));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => mapFeedbackDoc(d.data()))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeMyFeedback(
  uid: string,
  onData: (items: FeedbackItem[]) => void
): Unsubscribe {
  const path = 'feedback';
  const q = query(collection(db, 'feedback'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => mapFeedbackDoc(d.data()))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeWithdrawals(
  uid: string,
  isAdmin: boolean,
  onData: (items: (AdminWithdrawalRequest & { uid?: string })[], txList: WithdrawalTransaction[]) => void
): Unsubscribe {
  const path = 'withdrawals';
  const q = isAdmin
    ? query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'))
    : query(collection(db, 'withdrawals'), where('uid', '==', uid));

  return onSnapshot(
    q,
    (snap) => {
      const adminList: (AdminWithdrawalRequest & { uid?: string })[] = [];
      const txList: WithdrawalTransaction[] = [];

      const sortedDocs = [...snap.docs].sort(
        (a, b) => new Date(tsToIso(b.data().createdAt)).getTime() - new Date(tsToIso(a.data().createdAt)).getTime()
      );

      sortedDocs.forEach((docSnap) => {
        const d = docSnap.data();
        const createdIso = tsToIso(d.createdAt);
        const amountNPR = Number(d.amountNPR || 0);
        const companyFeeNPR = Number(d.companyFeeNPR || 0);

        adminList.push({
          id: String(d.id || docSnap.id),
          uid: String(d.uid || ''),
          user: String(d.userName || 'Reviewer'),
          userEmail: '',
          gateway: String(d.gateway || 'eSewa'),
          accountNumber: String(d.accountNumber || ''),
          amountNPR,
          companyFeeNPR,
          netPayoutNPR: Number(d.netPayoutNPR || amountNPR),
          status: d.status || 'pending',
          referenceId: String(d.referenceId || ''),
          transferReference: d.transferReference ? String(d.transferReference) : undefined,
          receiptNote: d.receiptNote ? String(d.receiptNote) : undefined,
          paidByAdminId: d.paidByAdminId ? String(d.paidByAdminId) : undefined,
          paidByAdminName: d.paidByAdminName ? String(d.paidByAdminName) : undefined,
          paidAt: d.paidAt ? tsToIso(d.paidAt) : undefined,
          rejectionReason: d.rejectionReason ? String(d.rejectionReason) : undefined,
          requestedAt: createdIso,
          decidedAt: d.status !== 'pending' ? tsToIso(d.updatedAt) : undefined,
        });

        txList.push({
          id: String(d.id || docSnap.id),
          title: `Sent to ${d.gateway || 'Wallet'}`,
          gateway: String(d.gateway || 'eSewa'),
          accountNumber: String(d.accountNumber || ''),
          amount: amountNPR,
          companyProcessingFee: companyFeeNPR,
          totalCompanyCharge: amountNPR + companyFeeNPR,
          userFee: 0,
          when: formatRelativeTime(createdIso),
          status: d.status === 'approved' ? 'Completed' : d.status === 'rejected' ? 'Processing' : 'Pending',
          referenceId: String(d.referenceId || ''),
          transferReference: d.transferReference ? String(d.transferReference) : undefined,
          receiptNote: d.receiptNote ? String(d.receiptNote) : undefined,
          paidByAdminId: d.paidByAdminId ? String(d.paidByAdminId) : undefined,
          paidByAdminName: d.paidByAdminName ? String(d.paidByAdminName) : undefined,
          paidAt: d.paidAt ? tsToIso(d.paidAt) : undefined,
          currency: 'NPR',
        });
      });

      onData(adminList, txList);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribePayments(
  uid: string,
  isAdmin: boolean,
  onData: (items: PaymentRecord[]) => void
): Unsubscribe {
  const path = 'payments';
  const q = isAdmin
    ? query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
    : query(collection(db, 'payments'), where('uid', '==', uid));

  return onSnapshot(
    q,
    (snap) => {
      const list: PaymentRecord[] = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: String(d.id || docSnap.id),
            uid: String(d.uid || ''),
            payerName: String(d.payerName || 'Subscriber'),
            planId: String(d.planId || ''),
            planName: String(d.planName || ''),
            billingCycle: d.billingCycle || 'monthly',
            brandCategory: String(d.brandCategory || 'all'),
            amountUSD: Number(d.amountUSD || 0),
            amountNPR: Number(d.amountNPR || 0),
            method: d.method || 'online',
            gateway: String(d.gateway || 'Card'),
            referenceId: String(d.referenceId || ''),
            ...(d.orderId ? { orderId: String(d.orderId) } : {}),
            ...(d.purchaseOrderId ? { purchaseOrderId: String(d.purchaseOrderId) } : {}),
            ...(d.khaltiPidx ? { khaltiPidx: String(d.khaltiPidx) } : {}),
            ...(d.khaltiTxnId ? { khaltiTxnId: String(d.khaltiTxnId) } : {}),
            ...(d.stage ? { stage: d.stage } : {}),
            ...(d.payerAccountOrBank ? { payerAccountOrBank: String(d.payerAccountOrBank) } : {}),
            ...(d.verifiedByAdminId ? { verifiedByAdminId: String(d.verifiedByAdminId) } : {}),
            ...(d.verifiedByAdminName ? { verifiedByAdminName: String(d.verifiedByAdminName) } : {}),
            ...(d.verifiedAt ? { verifiedAt: String(d.verifiedAt) } : {}),
            ...(d.verificationNotes ? { verificationNotes: String(d.verificationNotes) } : {}),
            status: d.status || 'completed',
            createdAt: tsToIso(d.createdAt),
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function fetchAllRegisteredUsersForAdmin(): Promise<RegisteredUser[]> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    const results: RegisteredUser[] = [];
    for (const d of snap.docs) {
      const pub = d.data();
      let priv: Record<string, any> = {};
      try {
        const privSnap = await getDoc(doc(db, 'users', d.id, 'private', 'info'));
        if (privSnap.exists()) priv = privSnap.data();
      } catch {
        // Ignore if private subdoc hasn't been created yet
      }
      results.push({
        id: d.id,
        name: String(pub.displayName || 'Reviewer'),
        nickname: pub.nickname,
        email: String(priv.email || ''),
        phone: String(priv.phone || ''),
        password: '',
        city: String(pub.city || 'Nepal'),
        role: pub.role === 'company_admin' ? 'company_admin' : 'consumer',
        accountMode: pub.accountMode === 'company' || pub.accountMode === 'customer' ? pub.accountMode : undefined,
        avatar: sanitizeAvatarUrl(pub.avatar),
        isGoogleVerified: true,
        googleId: d.id,
        walletBalance: Number(priv.walletBalance ?? 0),
        totalEarned: Number(priv.totalEarned ?? 0),
        createdAt: tsToIso(pub.createdAt),
        status: pub.status || 'active',
        isBlocked: pub.status === 'banned',
      });
    }
    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

export interface PlatformResetSummary {
  deletedFeedback: number;
  deletedPayments: number;
  deletedSubscriptions: number;
  deletedWithdrawals: number;
  resetWallets: number;
}

/**
 * Admin-only full platform data reset:
 * Deletes all feedback, payments, subscriptions, and withdrawals in Cloud Firestore,
 * resets every user's walletBalance & totalEarned to 0, and clears server-side caches/videos.
 */
export async function resetAllPlatformDataInFirestore(): Promise<PlatformResetSummary> {
  const collectionNames = [
    'feedback',
    'payments',
    'subscriptions',
    'withdrawals',
    'payment_orders',
    'earnings_ledger',
  ] as const;
  const counts: Record<(typeof collectionNames)[number], number> = {
    feedback: 0,
    payments: 0,
    subscriptions: 0,
    withdrawals: 0,
    payment_orders: 0,
    earnings_ledger: 0,
  };

  type BatchOp = (batch: ReturnType<typeof writeBatch>) => void;
  const ops: BatchOp[] = [];

  for (const colName of collectionNames) {
    try {
      const snap = await getDocs(collection(db, colName));
      counts[colName] = snap.size;
      snap.docs.forEach((d) => {
        ops.push((batch) => batch.delete(d.ref));
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colName);
    }
  }

  let resetWallets = 0;
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const uDoc of usersSnap.docs) {
      const privRef = doc(db, 'users', uDoc.id, 'private', 'info');
      try {
        const privSnap = await getDoc(privRef);
        if (privSnap.exists()) {
          resetWallets += 1;
          ops.push((batch) =>
            batch.update(privRef, {
              walletBalance: 0,
              totalEarned: 0,
              updatedAt: serverTimestamp(),
            })
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${uDoc.id}/private/info`);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }

  for (let i = 0; i < ops.length; i += 400) {
    const chunk = ops.slice(i, i + 400);
    const batch = writeBatch(db);
    chunk.forEach((apply) => apply(batch));
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'platform_reset_batch');
    }
  }

  try {
    await fetch('/api/admin/reset-all', { method: 'POST' });
  } catch {
    // Non-fatal if local Express cache cleanup fails while offline
  }

  return {
    deletedFeedback: counts.feedback,
    deletedPayments: counts.payments,
    deletedSubscriptions: counts.subscriptions,
    deletedWithdrawals: counts.withdrawals,
    resetWallets,
  };
}

// ============================================================================
// MANUAL KHALTI QR PAYMENT INTEGRATION (PENDING -> ADMIN VERIFY)
// ============================================================================

function mapPaymentOrderDoc(d: Record<string, any>, fallbackId = ''): PaymentOrderRecord {
  return {
    id: String(d.id || fallbackId),
    purchaseOrderId: String(d.purchaseOrderId || ''),
    uid: String(d.uid || ''),
    companyName: String(d.companyName || 'Company'),
    companyEmail: d.companyEmail ? String(d.companyEmail) : undefined,
    planId: String(d.planId || 'single_category'),
    planName: String(d.planName || 'Subscription Plan'),
    planType: d.planType || 'single_category',
    billingCycle: d.billingCycle === 'yearly' ? 'yearly' : 'monthly',
    brandCategory: String(d.brandCategory || 'samsung'),
    categoryName: String(d.categoryName || 'Samsung'),
    reviewQuota: Number(d.reviewQuota || 150),
    amountUSD: Number(d.amountUSD || 0),
    amountNPR: Number(d.amountNPR || 0),
    amountPaisa: Number(d.amountPaisa || 0),
    stage: d.stage === 'stage2_khalti_api' ? 'stage2_khalti_api' : 'stage1_manual_qr',
    paymentMethod: d.paymentMethod === 'khalti_api' ? 'khalti_api' : 'khalti_qr',
    status: d.status || 'pending',
    receiverAccountName: String(d.receiverAccountName || DEFAULT_KHALTI_QR_SETTINGS.accountHolderName),
    submittedAmountNPR: typeof d.submittedAmountNPR === 'number' ? d.submittedAmountNPR : undefined,
    transactionReference: d.transactionReference ? String(d.transactionReference) : undefined,
    screenshotUrl: d.screenshotUrl ? String(d.screenshotUrl) : undefined,
    pidx: d.pidx ? String(d.pidx) : undefined,
    khaltiTransactionId: d.khaltiTransactionId ? String(d.khaltiTransactionId) : undefined,
    errorReason: d.errorReason ? String(d.errorReason) : undefined,
    verifiedByAdminId: d.verifiedByAdminId ? String(d.verifiedByAdminId) : undefined,
    verifiedByAdminName: d.verifiedByAdminName ? String(d.verifiedByAdminName) : undefined,
    verifiedAt: d.verifiedAt ? String(d.verifiedAt) : undefined,
    verificationNotes: d.verificationNotes ? String(d.verificationNotes) : undefined,
    paymentRecordId: d.paymentRecordId ? String(d.paymentRecordId) : undefined,
    createdAt: tsToIso(d.createdAt),
    updatedAt: tsToIso(d.updatedAt),
  };
}

export async function fetchKhaltiGatewayConfig(): Promise<{
  stage1Enabled: boolean;
  qrSettings: KhaltiQrSettings;
}> {
  let fsQr: Partial<KhaltiQrSettings> | null = null;
  try {
    const snap = await getDoc(doc(db, 'app_settings', 'khalti_qr'));
    if (snap.exists()) {
      const d = snap.data();
      fsQr = {
        enabled: typeof d.enabled === 'boolean' ? d.enabled : true,
        qrImagePath: String(d.qrImagePath || DEFAULT_KHALTI_QR_SETTINGS.qrImagePath),
        accountHolderName: String(d.accountHolderName || DEFAULT_KHALTI_QR_SETTINGS.accountHolderName),
        stage1Notice: d.stage1Notice ? String(d.stage1Notice) : DEFAULT_KHALTI_QR_SETTINGS.stage1Notice,
        updatedBy: String(d.updatedBy || BOOTSTRAPPED_ADMIN_EMAIL),
        updatedAt: tsToIso(d.updatedAt),
      };
    }
  } catch {
    // Non-fatal fallback
  }

  try {
    const res = await authedFetch<{
      stage1Enabled: boolean;
      qrSettings: KhaltiQrSettings;
    }>('/api/payments/khalti/config-status');
    const merged: KhaltiQrSettings = {
      ...DEFAULT_KHALTI_QR_SETTINGS,
      ...res.qrSettings,
      ...(fsQr || {}),
    };
    return {
      stage1Enabled: Boolean(merged.enabled),
      qrSettings: merged,
    };
  } catch {
    const merged: KhaltiQrSettings = {
      ...DEFAULT_KHALTI_QR_SETTINGS,
      ...(fsQr || {}),
    };
    return {
      stage1Enabled: Boolean(merged.enabled),
      qrSettings: merged,
    };
  }
}

export async function saveKhaltiQrSettings(params: {
  enabled: boolean;
  qrImagePath: string;
  accountHolderName: string;
  stage1Notice: string;
  updatedByEmail: string;
}): Promise<KhaltiQrSettings> {
  const cleanHolder = params.accountHolderName.trim();
  if (!cleanHolder) {
    throw new Error('Receiver account display name is required.');
  }

  let saved: KhaltiQrSettings = {
    enabled: params.enabled,
    qrImagePath: params.qrImagePath.trim() || DEFAULT_KHALTI_QR_SETTINGS.qrImagePath,
    accountHolderName: cleanHolder,
    stage1Notice: params.stage1Notice.trim() || DEFAULT_KHALTI_QR_SETTINGS.stage1Notice,
    updatedBy: params.updatedByEmail || BOOTSTRAPPED_ADMIN_EMAIL,
    updatedAt: new Date().toISOString(),
  };

  try {
    const serverRes = await authedFetch<{ qrSettings: KhaltiQrSettings }>('/api/payments/khalti/qr-settings', {
      method: 'POST',
      body: JSON.stringify({
        enabled: params.enabled,
        qrImagePath: params.qrImagePath.trim(),
        accountHolderName: cleanHolder,
        stage1Notice: params.stage1Notice.trim(),
      }),
    });
    if (serverRes?.qrSettings) {
      saved = serverRes.qrSettings;
    }
  } catch (err) {
    if (!isStaticHostMissingApi(err)) {
      throw err;
    }
  }

  try {
    await setDoc(doc(db, 'app_settings', 'khalti_qr'), {
      enabled: Boolean(saved.enabled),
      qrImagePath: saved.qrImagePath.slice(0, 500),
      accountHolderName: saved.accountHolderName.slice(0, 120),
      stage1Notice: (saved.stage1Notice || '').slice(0, 400),
      updatedBy: (params.updatedByEmail || BOOTSTRAPPED_ADMIN_EMAIL).slice(0, 128),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'app_settings/khalti_qr');
  }

  return saved;
}

export function subscribeKhaltiQrSettings(
  onData: (settings: KhaltiQrSettings) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'app_settings', 'khalti_qr'),
    (snap) => {
      if (!snap.exists()) {
        onData(DEFAULT_KHALTI_QR_SETTINGS);
        return;
      }
      const d = snap.data();
      onData({
        enabled: typeof d.enabled === 'boolean' ? d.enabled : true,
        qrImagePath: String(d.qrImagePath || DEFAULT_KHALTI_QR_SETTINGS.qrImagePath),
        accountHolderName: String(d.accountHolderName || DEFAULT_KHALTI_QR_SETTINGS.accountHolderName),
        stage1Notice: d.stage1Notice ? String(d.stage1Notice) : DEFAULT_KHALTI_QR_SETTINGS.stage1Notice,
        updatedBy: String(d.updatedBy || BOOTSTRAPPED_ADMIN_EMAIL),
        updatedAt: tsToIso(d.updatedAt),
      });
    },
    () => {
      onData(DEFAULT_KHALTI_QR_SETTINGS);
    }
  );
}

export function subscribePaymentOrders(
  uid: string,
  isAdmin: boolean,
  onData: (orders: PaymentOrderRecord[]) => void
): Unsubscribe {
  const path = 'payment_orders';
  const q = isAdmin
    ? query(collection(db, path), orderBy('createdAt', 'desc'))
    : query(collection(db, path), where('uid', '==', uid));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => mapPaymentOrderDoc(d.data(), d.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

async function compressScreenshotToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file (PNG, JPG, or WebP).');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Image file is too large (max 12 MB).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read the selected screenshot file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a valid image.'));
      img.onload = () => {
        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser canvas unavailable for image upload.'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadKhaltiPaymentScreenshot(file: File): Promise<string> {
  const imageDataUrl = await compressScreenshotToDataUrl(file);
  try {
    const res = await authedFetch<{ screenshotUrl: string }>('/api/payments/stage1/screenshot', {
      method: 'POST',
      body: JSON.stringify({ imageDataUrl }),
    });
    if (!res.screenshotUrl) {
      throw new Error('Screenshot upload did not return a valid URL.');
    }
    return res.screenshotUrl;
  } catch (err) {
    if (isStaticHostMissingApi(err)) {
      // Static GitHub Pages hosting does not run the Express screenshot file store;
      // local OCR receipt scanning still works in-browser without blocking submission.
      return '';
    }
    throw err;
  }
}

export async function submitStage1KhaltiQrOrder(params: {
  uid: string;
  orderId: string;
  purchaseOrderId: string;
  companyName: string;
  companyEmail?: string;
  plan: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  brandCategory: string;
  amountUSD: number;
  amountNPR: number;
  submittedAmountNPR?: number;
  transactionReference: string;
  screenshotUrl?: string;
}): Promise<PaymentOrderRecord> {
  const {
    uid,
    orderId,
    purchaseOrderId,
    companyName,
    companyEmail,
    plan,
    billingCycle,
    brandCategory,
    amountUSD,
    amountNPR,
    submittedAmountNPR,
    transactionReference,
    screenshotUrl,
  } = params;

  const resolvedBrand =
    (brandCategory && brandCategory.toLowerCase() !== 'all' ? brandCategory : '') ||
    (plan.targetCategory && plan.targetCategory.toLowerCase() !== 'all' ? plan.targetCategory : '') ||
    'samsung';
  const categoryName = (plan.categoryName || resolvedBrand).slice(0, 120);
  const planType = plan.planType || 'single_category';
  const reviewQuota = Math.min(1000000, Math.max(1, Math.round(Number(plan.reviewQuota || 150))));

  let ord: PaymentOrderRecord | null = null;
  try {
    const serverRes = await authedFetch<{ order: PaymentOrderRecord }>('/api/payments/stage1/submit', {
      method: 'POST',
      body: JSON.stringify({
        orderId,
        purchaseOrderId,
        companyName,
        planId: plan.id || 'single_category',
        planName: plan.name || 'Subscription Plan',
        planType,
        billingCycle,
        brandCategory: resolvedBrand,
        categoryName,
        reviewQuota,
        amountUSD,
        expectedAmountNPR: amountNPR,
        submittedAmountNPR: submittedAmountNPR ?? amountNPR,
        transactionReference,
        ...(screenshotUrl ? { screenshotUrl } : {}),
      }),
    });
    ord = serverRes.order;
  } catch (err) {
    if (!isStaticHostMissingApi(err)) {
      throw err;
    }

    // Static GitHub Pages fallback: enforce numeric Khalti format, exact amount, and duplicate guards before Firestore write
    const txnCheck = validateKhaltiNumericTxnId(transactionReference);
    if (!txnCheck.valid) {
      throw new Error(txnCheck.reason || 'Invalid numeric Khalti Transaction ID.');
    }
    const cleanExpectedNPR = Math.round(Number(amountNPR || 0));
    const cleanSubmittedNPR = Math.round(Number(submittedAmountNPR ?? amountNPR));
    if (cleanExpectedNPR <= 0 || cleanSubmittedNPR !== cleanExpectedNPR) {
      throw new Error(
        `Amount mismatch: entered NPR ${cleanSubmittedNPR.toLocaleString('en-IN')} does not match required NPR ${cleanExpectedNPR.toLocaleString('en-IN')}.`
      );
    }

    const nowIso = new Date().toISOString();
    ord = {
      id: orderId,
      purchaseOrderId,
      uid,
      companyName: companyName.slice(0, 120),
      ...(companyEmail ? { companyEmail: companyEmail.slice(0, 200) } : {}),
      planId: (plan.id || 'single_category').slice(0, 64),
      planName: (plan.name || 'Subscription Plan').slice(0, 120),
      planType,
      billingCycle,
      brandCategory: resolvedBrand.slice(0, 64),
      categoryName,
      reviewQuota,
      amountUSD,
      amountNPR: cleanExpectedNPR,
      amountPaisa: cleanExpectedNPR * 100,
      stage: 'stage1_manual_qr',
      paymentMethod: 'khalti_qr',
      status: 'pending',
      receiverAccountName: DEFAULT_KHALTI_QR_SETTINGS.accountHolderName,
      submittedAmountNPR: cleanSubmittedNPR,
      transactionReference: txnCheck.normalized,
      ...(screenshotUrl ? { screenshotUrl } : {}),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  if (!ord) {
    throw new Error('Could not create Khalti payment order.');
  }
  // Save ONLY to payment_orders with status 'pending' (Pending Verification). NEVER touch payments or subscriptions!
  try {
    await setDoc(doc(db, 'payment_orders', ord.id), {
      id: ord.id,
      purchaseOrderId: ord.purchaseOrderId,
      uid,
      companyName: ord.companyName.slice(0, 120),
      ...(companyEmail ? { companyEmail: companyEmail.slice(0, 200) } : {}),
      planId: ord.planId.slice(0, 64),
      planName: ord.planName.slice(0, 120),
      planType: ord.planType,
      billingCycle: ord.billingCycle,
      brandCategory: ord.brandCategory.slice(0, 64),
      categoryName: ord.categoryName.slice(0, 120),
      reviewQuota: ord.reviewQuota,
      amountUSD: ord.amountUSD,
      amountNPR: ord.amountNPR,
      amountPaisa: ord.amountPaisa,
      stage: 'stage1_manual_qr',
      paymentMethod: 'khalti_qr',
      status: 'pending',
      receiverAccountName: ord.receiverAccountName,
      submittedAmountNPR: Number(ord.submittedAmountNPR ?? submittedAmountNPR ?? amountNPR),
      transactionReference: (ord.transactionReference || transactionReference).slice(0, 120),
      ...(ord.screenshotUrl ? { screenshotUrl: ord.screenshotUrl.slice(0, 500) } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `payment_orders/${ord.id}`);
  }

  return ord;
}

export async function approveStage1KhaltiOrderBatch(params: {
  order: PaymentOrderRecord;
  khaltiTransactionId: string;
  verifiedAmountNPR: number;
  verificationNotes: string;
  adminId: string;
  adminName: string;
}): Promise<{ paymentId: string; verifiedAt: string }> {
  const { order, khaltiTransactionId, verifiedAmountNPR, verificationNotes, adminId, adminName } = params;
  const cleanTxnId = khaltiTransactionId.trim();
  if (cleanTxnId.length < 4) {
    throw new Error('Enter the verified Khalti Transaction ID from your Khalti statement (min 4 characters).');
  }
  if (order.status === 'verified' || order.status === 'completed') {
    throw new Error('This payment order is already verified and activated.');
  }

  const normalizedTxn = cleanTxnId.toUpperCase();

  // Check Firestore payments & payment_orders to prevent duplicate Transaction IDs across server restarts
  try {
    const [existingPaymentsSnap, existingOrdersSnap] = await Promise.all([
      getDocs(collection(db, 'payments')),
      getDocs(collection(db, 'payment_orders')),
    ]);
    const duplicateInPayments = existingPaymentsSnap.docs.some((pDoc) => {
      const d = pDoc.data();
      const ref = String(d.referenceId || '').trim().toUpperCase();
      const khTxn = String(d.khaltiTxnId || '').trim().toUpperCase();
      return ref === normalizedTxn || khTxn === normalizedTxn;
    });
    const duplicateInOrders = existingOrdersSnap.docs.some((oDoc) => {
      if (oDoc.id === order.id) return false;
      const d = oDoc.data();
      const st = String(d.status || '');
      if (st !== 'verified' && st !== 'completed') return false;
      const ref = String(d.transactionReference || '').trim().toUpperCase();
      const khTxn = String(d.khaltiTransactionId || '').trim().toUpperCase();
      return ref === normalizedTxn || khTxn === normalizedTxn;
    });
    if (duplicateInPayments || duplicateInOrders) {
      throw new Error(
        `Duplicate Transaction ID blocked: "${cleanTxnId}" has already been approved for another subscription.`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Duplicate Transaction ID blocked')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.LIST, 'payment_orders');
  }

  let verifiedAtIso = new Date().toISOString();
  try {
    const serverVerify = await authedFetch<{ verifiedAt: string }>('/api/payments/stage1/verify', {
      method: 'POST',
      body: JSON.stringify({
        orderId: order.id,
        khaltiTransactionId: cleanTxnId,
        verifiedAmountNPR: Math.round(verifiedAmountNPR),
        verificationNotes: verificationNotes.trim(),
      }),
    });
    if (serverVerify?.verifiedAt) {
      verifiedAtIso = serverVerify.verifiedAt;
    }
  } catch (err) {
    if (!isStaticHostMissingApi(err)) {
      throw err;
    }
  }
  const paymentId = makeSafeId('pay');
  const subRef = doc(db, 'subscriptions', order.uid);
  let subExists = false;
  try {
    const existingSub = await getDoc(subRef);
    subExists = existingSub.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `subscriptions/${order.uid}`);
  }

  const batch = writeBatch(db);

  batch.set(doc(db, 'payments', paymentId), {
    id: paymentId,
    uid: order.uid,
    payerName: (order.companyName || 'Company Subscriber').slice(0, 120),
    planId: (order.planId || 'single_category').slice(0, 64),
    planName: (order.planName || 'Subscription Plan').slice(0, 120),
    billingCycle: order.billingCycle,
    brandCategory: (order.brandCategory || 'samsung').slice(0, 64),
    amountUSD: Math.max(0.01, Number(order.amountUSD || 15.99)),
    amountNPR: Math.max(1, Math.round(Number(verifiedAmountNPR || order.amountNPR))),
    method: 'khalti_qr',
    gateway: 'Khalti Manual QR (Admin Verified)',
    referenceId: cleanTxnId.slice(0, 120),
    orderId: order.id,
    purchaseOrderId: order.purchaseOrderId,
    khaltiTxnId: cleanTxnId.slice(0, 128),
    stage: 'stage1_manual_qr',
    verifiedByAdminId: adminId.slice(0, 128),
    verifiedByAdminName: adminName.slice(0, 120),
    verifiedAt: verifiedAtIso,
    verificationNotes: (verificationNotes || 'Approved after confirming funds arrived in Khalti account').slice(0, 400),
    status: 'verified',
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'payment_orders', order.id), {
    status: 'verified',
    khaltiTransactionId: cleanTxnId.slice(0, 128),
    verifiedByAdminId: adminId.slice(0, 128),
    verifiedByAdminName: adminName.slice(0, 120),
    verifiedAt: verifiedAtIso,
    verificationNotes: (verificationNotes || 'Approved after confirming funds arrived in Khalti account').slice(0, 400),
    paymentRecordId: paymentId,
    updatedAt: serverTimestamp(),
  });

  const subUpdateFields = {
    planId: (order.planId || 'single_category').slice(0, 64),
    planName: (order.planName || 'Subscription Plan').slice(0, 120),
    planType: order.planType || 'single_category',
    billingCycle: order.billingCycle,
    priceUSD: Math.max(0.01, Number(order.amountUSD || 15.99)),
    targetCategory: (order.brandCategory || 'samsung').slice(0, 64),
    categoryName: (order.categoryName || order.brandCategory || 'Samsung').slice(0, 120),
    unlockedBrands: [order.brandCategory || 'samsung'],
    reviewQuota: Math.max(1, Number(order.reviewQuota || 150)),
    status: 'active',
    paymentRef: paymentId,
    updatedAt: serverTimestamp(),
  };

  if (subExists) {
    batch.update(subRef, subUpdateFields);
  } else {
    batch.set(subRef, {
      uid: order.uid,
      ...subUpdateFields,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `payment_orders/${order.id}`);
  }

  return { paymentId, verifiedAt: verifiedAtIso };
}

export async function rejectStage1KhaltiOrderInFirestore(params: {
  orderId: string;
  reason: string;
  adminId: string;
  adminName: string;
}): Promise<void> {
  const { orderId, reason, adminId, adminName } = params;
  const cleanReason = (reason.trim() || 'Transaction ID could not be verified in Khalti account.').slice(0, 400);

  let verifiedAtIso = new Date().toISOString();
  try {
    const serverRes = await authedFetch<{ verifiedAt?: string }>('/api/payments/stage1/reject', {
      method: 'POST',
      body: JSON.stringify({ orderId, reason: cleanReason }),
    });
    if (serverRes.verifiedAt) {
      verifiedAtIso = serverRes.verifiedAt;
    }
  } catch {
    // Proceed to persist Admin decision in Firestore
  }

  try {
    await updateDoc(doc(db, 'payment_orders', orderId), {
      status: 'rejected',
      errorReason: cleanReason,
      verificationNotes: cleanReason,
      verifiedByAdminId: adminId.slice(0, 128),
      verifiedByAdminName: adminName.slice(0, 120),
      verifiedAt: verifiedAtIso,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `payment_orders/${orderId}`);
  }
}


