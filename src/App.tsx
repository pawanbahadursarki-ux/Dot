/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { auth, db, formatFirestoreErrorMessage } from './firebase';
import {
  ActiveSubscriptionDoc,
  BOOTSTRAPPED_ADMIN_EMAIL,
  consumeGoogleRedirectAuth,
  DEFAULT_KHALTI_QR_SETTINGS,
  ensureUserDocsInFirestore,
  fetchAllRegisteredUsersForAdmin,
  isBootstrappedAdminUser,
  PaymentRecord,
  signOutFirebase,
  submitRealFeedbackBatch,
  subscribeCompanyFeedback,
  subscribeKhaltiQrSettings,
  subscribeMyFeedback,
  subscribePaymentOrders,
  subscribePayments,
  subscribeUserPrivateWallet,
  subscribeUserSubscription,
  subscribeWithdrawals,
  updateUserProfileInFirestore,
} from './services/firebaseService';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';

const ConsumerView = lazy(() =>
  import('./components/ConsumerView').then((m) => ({ default: m.ConsumerView }))
);
const CompanyView = lazy(() =>
  import('./components/CompanyView').then((m) => ({ default: m.CompanyView }))
);
const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel }))
);
const CompanyLoginGate = lazy(() =>
  import('./components/CompanyLoginGate').then((m) => ({ default: m.CompanyLoginGate }))
);
const AdminSecurityGate = lazy(() =>
  import('./components/AdminSecurityGate').then((m) => ({ default: m.AdminSecurityGate }))
);
const GoogleAuthModal = lazy(() =>
  import('./components/GoogleAuthModal').then((m) => ({ default: m.GoogleAuthModal }))
);
const SubscriptionModal = lazy(() =>
  import('./components/SubscriptionModal').then((m) => ({ default: m.SubscriptionModal }))
);
const CartModal = lazy(() =>
  import('./components/CartModal').then((m) => ({ default: m.CartModal }))
);
const DirectChatModal = lazy(() =>
  import('./components/DirectChatModal').then((m) => ({ default: m.DirectChatModal }))
);
const VideoModal = lazy(() =>
  import('./components/VideoModal').then((m) => ({ default: m.VideoModal }))
);
const UserProfileComponent = lazy(() =>
  import('./components/UserProfile').then((m) => ({ default: m.UserProfileComponent }))
);

const ViewLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Loading workspace...' }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-xs font-semibold gap-2.5">
    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
    <span>{label}</span>
  </div>
);
import {
  AdminWithdrawalRequest,
  FeedbackItem,
  KhaltiQrSettings,
  PaymentOrderRecord,
  RegisteredUser,
  SubscriptionTier,
  UserProfile,
  WithdrawalTransaction,
} from './types';
import { isFeedbackItemUnlocked, normalizeBrandFolder } from './utils/brandAccess';

const EMPTY_USER: UserProfile = {
  name: '',
  nickname: '',
  email: '',
  phone: '',
  city: 'Kathmandu',
  avatar: '',
  role: 'consumer',
  isGoogleVerified: false,
  googleId: '',
  walletBalance: 0,
  totalEarned: 0,
  isLoggedIn: false,
  unlockedBrandFolders: [],
};

const EMPTY_PLAN: SubscriptionTier = {
  id: 'none',
  name: 'No Active Plan',
  priceUSD: 0,
  reviewQuota: 0,
  planType: 'single_category',
  targetCategory: '',
  categoryName: '',
  unlockedCategories: [],
  features: [],
};

function mapSubscriptionDocToTier(sub: ActiveSubscriptionDoc | null): SubscriptionTier {
  if (!sub || sub.status !== 'active') {
    return EMPTY_PLAN;
  }
  return {
    id: sub.planId || 'single_category',
    name: sub.planName || 'Active Plan',
    priceUSD: sub.priceUSD || 15.99,
    reviewQuota: sub.reviewQuota || 150,
    planType: sub.planType || 'single_category',
    targetCategory: sub.targetCategory || '',
    categoryName: sub.categoryName || '',
    unlockedCategories: sub.unlockedBrands?.length ? sub.unlockedBrands : [],
    features: [],
  };
}

export default function App() {
  const [view, setView] = useState<'customer' | 'company' | 'login' | 'admin' | 'dual'>('login');
  const [consumerScreen, setConsumerScreen] = useState<string>('home');

  const [user, setUser] = useState<UserProfile>(EMPTY_USER);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authBannerError, setAuthBannerError] = useState<string | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);

  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscriptionDoc | null>(null);
  const [subLoading, setSubLoading] = useState<boolean>(false);

  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [myFeedbackList, setMyFeedbackList] = useState<FeedbackItem[]>([]);
  const [transactions, setTransactions] = useState<WithdrawalTransaction[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrderRecord[]>([]);
  const [khaltiQrSettings, setKhaltiQrSettings] = useState<KhaltiQrSettings>(DEFAULT_KHALTI_QR_SETTINGS);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);

  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(true);
  const [textSize, setTextSize] = useState<string>('Normal');

  const [isGoogleAuthOpen, setIsGoogleAuthOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [targetBrandForSubscription, setTargetBrandForSubscription] = useState<string | undefined>(undefined);
  const [selectedCartFeedback, setSelectedCartFeedback] = useState<FeedbackItem | null>(null);
  const [selectedChatFeedback, setSelectedChatFeedback] = useState<FeedbackItem | null>(null);
  const [selectedVideoFeedback, setSelectedVideoFeedback] = useState<FeedbackItem | null>(null);
  const [selectedVideoInitialTab, setSelectedVideoInitialTab] = useState<'summary' | 'transcript' | 'ai_summary'>('summary');

  const openVideoModal = (item: FeedbackItem, initialTab: 'summary' | 'transcript' | 'ai_summary' = 'summary') => {
    setSelectedVideoInitialTab(initialTab);
    setSelectedVideoFeedback(item);
  };

  const hasActiveSubscription = Boolean(activeSubscription && activeSubscription.status === 'active');
  const activePlan: SubscriptionTier = mapSubscriptionDocToTier(activeSubscription);

  const refreshAdminUsers = useCallback(async () => {
    if (!isBootstrappedAdminUser(auth.currentUser)) return;
    try {
      const users = await fetchAllRegisteredUsersForAdmin();
      setRegisteredUsers(users);
    } catch (err: unknown) {
      setAuthBannerError(formatFirestoreErrorMessage(err, 'Failed to load user directory from Firestore.'));
    }
  }, []);

  // Font size scaling (in-memory only)
  useEffect(() => {
    const scaleMap: Record<string, string> = {
      Normal: '1',
      Large: '1.14',
      'Extra large': '1.26',
    };
    document.documentElement.style.setProperty('--fs', scaleMap[textSize] || '1');
  }, [textSize]);

  // Primary Firebase Auth & Firestore Subscriptions
  useEffect(() => {
    let unsubWallet: (() => void) | undefined;
    let unsubSub: (() => void) | undefined;
    let unsubFeedback: (() => void) | undefined;
    let unsubMyFeedback: (() => void) | undefined;
    let unsubWithdrawals: (() => void) | undefined;
    let unsubPayments: (() => void) | undefined;
    let unsubPaymentOrders: (() => void) | undefined;
    let unsubKhaltiQr: (() => void) | undefined;

    const cleanupListeners = () => {
      unsubWallet?.();
      unsubSub?.();
      unsubFeedback?.();
      unsubMyFeedback?.();
      unsubWithdrawals?.();
      unsubPayments?.();
      unsubPaymentOrders?.();
      unsubKhaltiQr?.();
      unsubWallet = undefined;
      unsubSub = undefined;
      unsubFeedback = undefined;
      unsubMyFeedback = undefined;
      unsubWithdrawals = undefined;
      unsubPayments = undefined;
      unsubPaymentOrders = undefined;
      unsubKhaltiQr = undefined;
    };

    // Never let slow/restricted mobile networks stall forever on the initial loading screen
    const authBootTimeout = window.setTimeout(() => {
      setAuthReady(true);
    }, 2000);

    // Handle returning from mobile signInWithRedirect seamlessly
    consumeGoogleRedirectAuth()
      .then(async (redirectRes) => {
        if (!redirectRes) return;
        const profile = await ensureUserDocsInFirestore(redirectRes.user, redirectRes.preferredMode);
        if (!isBootstrappedAdminUser(redirectRes.user) && profile.accountMode) {
          setView(profile.accountMode);
        } else if (redirectRes.preferredMode) {
          setView(redirectRes.preferredMode);
        }
      })
      .catch((err: unknown) => {
        setAuthBannerError(formatFirestoreErrorMessage(err, 'Google sign-in redirect failed. Please try again.'));
      });

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      window.clearTimeout(authBootTimeout);
      cleanupListeners();

      if (!firebaseUser) {
        setUser(EMPTY_USER);
        setActiveSubscription(null);
        setFeedbackList([]);
        setMyFeedbackList([]);
        setTransactions([]);
        setAdminWithdrawals([]);
        setPayments([]);
        setPaymentOrders([]);
        setKhaltiQrSettings(DEFAULT_KHALTI_QR_SETTINGS);
        setRegisteredUsers([]);
        setIsAdminUnlocked(false);
        setSubLoading(false);
        setAuthReady(true);
        return;
      }

      setSubLoading(true);
      try {
        const profile = await ensureUserDocsInFirestore(firebaseUser);
        if (profile.status === 'banned') {
          await signOutFirebase();
          setAuthBannerError('Your account has been suspended by an administrator.');
          setView('login');
          setSubLoading(false);
          setAuthReady(true);
          return;
        }

        const isAdmin = isBootstrappedAdminUser(firebaseUser);
        setIsAdminUnlocked(isAdmin);
        setUser({
          ...profile,
          isLoggedIn: true,
        });

        // Enforce 1 Google Account = 1 Portal Access immediately upon session restore
        if (!isAdmin && profile.accountMode) {
          const lockedTarget = profile.accountMode;
          setView((prev) => (prev === 'login' || prev !== lockedTarget ? lockedTarget : prev));
        }

        unsubWallet = subscribeUserPrivateWallet(firebaseUser.uid, (patch) => {
          setUser((prev) => ({
            ...prev,
            ...patch,
          }));
        });

        unsubSub = subscribeUserSubscription(firebaseUser.uid, (sub) => {
          setActiveSubscription(sub);
          setSubLoading(false);
          const rawSingleBrand =
            sub && sub.status === 'active'
              ? (sub.targetCategory && sub.targetCategory.toLowerCase() !== 'all'
                  ? sub.targetCategory
                  : (sub.unlockedBrands || []).find((b) => b && b.toLowerCase() !== 'all')) || ''
              : '';
          setUser((prev) => ({
            ...prev,
            unlockedBrandFolders: rawSingleBrand ? [normalizeBrandFolder(rawSingleBrand)] : [],
            subscriptionBillingCycle: sub?.billingCycle,
          }));
        });

        unsubFeedback = subscribeCompanyFeedback(isAdmin, (items) => {
          setFeedbackList(items);
        });

        unsubMyFeedback = subscribeMyFeedback(firebaseUser.uid, (items) => {
          setMyFeedbackList(items);
        });

        unsubWithdrawals = subscribeWithdrawals(firebaseUser.uid, isAdmin, (adminList, txList) => {
          setAdminWithdrawals(adminList);
          setTransactions(txList);
        });

        unsubPayments = subscribePayments(firebaseUser.uid, isAdmin, (items) => {
          setPayments(items);
        });

        unsubPaymentOrders = subscribePaymentOrders(firebaseUser.uid, isAdmin, (orders) => {
          setPaymentOrders(orders);
        });

        unsubKhaltiQr = subscribeKhaltiQrSettings((settings) => {
          setKhaltiQrSettings(settings);
        });

        if (isAdmin) {
          fetchAllRegisteredUsersForAdmin()
            .then((list) => setRegisteredUsers(list))
            .catch(() => {});
        }
      } catch (err: unknown) {
        setAuthBannerError(formatFirestoreErrorMessage(err, 'Unable to sync your profile with Cloud Firestore.'));
        setSubLoading(false);
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      window.clearTimeout(authBootTimeout);
      cleanupListeners();
      unsubAuth();
    };
  }, []);

  // Automatically show SubscriptionModal whenever a signed-in user enters Company Dashboard without an active plan
  useEffect(() => {
    if (view === 'company' && user.isLoggedIn && !subLoading && !hasActiveSubscription) {
      setIsSubscriptionOpen(true);
    }
  }, [view, user.isLoggedIn, subLoading, hasActiveSubscription]);

  const handleNavigate = (target: { view: 'customer' | 'company' | 'login' | 'admin' | 'dual'; screen?: string }) => {
    const isAdmin = isBootstrappedAdminUser(auth.currentUser);
    if (user.isLoggedIn && !isAdmin && user.accountMode) {
      if (target.view !== user.accountMode && target.view !== 'login') {
        const currentLabel = user.accountMode === 'company' ? 'Company Portal' : 'Customer App';
        const attemptedLabel =
          target.view === 'company'
            ? 'Company Portal'
            : target.view === 'admin'
            ? 'Admin Panel'
            : 'Customer App';
        setAuthBannerError(
          `1 Google Account = 1 Access: ${user.email} is locked to ${currentLabel}. Sign out to use a separate Gmail for ${attemptedLabel}.`
        );
        setView(user.accountMode);
        return;
      }
      if (target.view === 'login') {
        setView(user.accountMode);
        return;
      }
    }

    if (target.view) {
      setView(target.view);
    }
    if (target.screen) {
      setConsumerScreen(target.screen);
    }
  };

  const cycleTextSize = () => {
    const sizes = ['Normal', 'Large', 'Extra large'];
    const nextIdx = (sizes.indexOf(textSize) + 1) % sizes.length;
    setTextSize(sizes[nextIdx]);
  };

  const handleUpdateUser = async (updated: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updated }));
    if (auth.currentUser) {
      try {
        await updateUserProfileInFirestore(auth.currentUser.uid, updated);
      } catch (err: unknown) {
        setAuthBannerError(formatFirestoreErrorMessage(err, 'Could not save profile changes to Firestore.'));
      }
    }
  };

  const handleAuthenticated = async (
    profile: UserProfile,
    preferredDestination: 'customer' | 'company' = 'customer'
  ) => {
    const isAdmin = Boolean(auth.currentUser && isBootstrappedAdminUser(auth.currentUser));
    const effectiveDestination: 'customer' | 'company' = isAdmin
      ? preferredDestination
      : profile.accountMode || preferredDestination;

    if (!isAdmin && profile.accountMode && profile.accountMode !== preferredDestination) {
      const boundLabel = profile.accountMode === 'company' ? 'Company Portal' : 'Customer App';
      const requestedLabel = preferredDestination === 'company' ? 'Company Portal' : 'Customer App';
      setAuthBannerError(
        `1 Google Account = 1 Access: ${profile.email} is locked to ${boundLabel} and cannot enter ${requestedLabel}. Sign out to use a different Gmail.`
      );
    } else {
      setAuthBannerError(null);
    }

    setUser((prev) => ({
      ...prev,
      ...profile,
      isLoggedIn: true,
    }));

    if (isAdmin) {
      setIsAdminUnlocked(true);
      refreshAdminUsers();
    }

    if (effectiveDestination === 'company') {
      const uid = auth.currentUser?.uid || profile.googleId;
      if (uid) {
        try {
          const subSnap = await getDoc(doc(db, 'subscriptions', uid));
          const subActive = subSnap.exists() && subSnap.data()?.status === 'active';
          if (!subActive) {
            setView('company');
            setIsSubscriptionOpen(true);
            return;
          }
        } catch {
          setView('company');
          setIsSubscriptionOpen(true);
          return;
        }
      }
      setView('company');
      return;
    }

    setView('customer');
  };

  const handleLogout = async () => {
    try {
      await signOutFirebase();
    } catch {
      // Ignore sign-out errors and reset UI
    }
    setUser(EMPTY_USER);
    setActiveSubscription(null);
    setIsAdminUnlocked(false);
    setView('login');
  };

  const handleAddReview = async (newReview: FeedbackItem): Promise<FeedbackItem> => {
    if (!auth.currentUser) {
      setView('login');
      throw new Error('Please sign in with Google before submitting real feedback.');
    }

    const saved = await submitRealFeedbackBatch({
      uid: auth.currentUser.uid,
      user,
      feedback: newReview,
    });

    // Keep customer-locked accounts isolated to Consumer App; only company/admin accounts open Subscription Modal
    if (!hasActiveSubscription && (isBootstrappedAdminUser(auth.currentUser) || user.accountMode === 'company')) {
      setView('company');
      setIsSubscriptionOpen(true);
    }

    return saved;
  };

  const handleUpdateFeedback = (updated?: FeedbackItem) => {
    if (updated && updated.id) {
      setFeedbackList((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
      setMyFeedbackList((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
      if (selectedVideoFeedback?.id === updated.id) {
        setSelectedVideoFeedback((prev) => (prev ? { ...prev, ...updated } : null));
      }
      if (selectedCartFeedback?.id === updated.id) {
        setSelectedCartFeedback((prev) => (prev ? { ...prev, ...updated } : null));
      }
    }
  };

  const handleOpenChatGPTFromVideo = (_item: FeedbackItem, customPrompt?: string) => {
    if (customPrompt) {
      try {
        sessionStorage.setItem('fp_chat_prompt', customPrompt);
      } catch {
        // Ignore storage restrictions
      }
    }
    handleNavigate({ view: 'company' });
  };

  const handleAddWithdrawal = (_newTx: WithdrawalTransaction) => {
    // Transactions & wallet balance are synchronized live from Firestore via subscribeWithdrawals & subscribeUserPrivateWallet
  };

  const handleSelectPlan = (plan: SubscriptionTier) => {
    const rawSingle =
      (plan.targetCategory && plan.targetCategory.toLowerCase() !== 'all'
        ? plan.targetCategory
        : (plan.unlockedCategories || []).find((b) => b && b.toLowerCase() !== 'all')) ||
      (plan.categoryName && !plan.categoryName.toLowerCase().includes('all') ? plan.categoryName : '') ||
      '';
    const normalized = rawSingle ? normalizeBrandFolder(rawSingle) : '';
    setUser((prev) => ({
      ...prev,
      unlockedBrandFolders: normalized ? [normalized] : [],
    }));
  };

  return (
    <div className="shell">
      <Header
        currentView={view}
        currentScreen={consumerScreen}
        onSwitchView={(target) => handleNavigate({ view: target })}
        onNavigateScreen={setConsumerScreen}
        onNavigate={handleNavigate}
        user={user}
        onOpenAuth={() => {
          if (user.isLoggedIn) {
            setIsProfileModalOpen(true);
          } else {
            handleNavigate({ view: 'login' });
          }
        }}
        onOpenRegister={() => {
          handleNavigate({ view: 'login' });
        }}
        onLogout={handleLogout}
        onOpenWallet={() => {
          handleNavigate({ view: 'customer', screen: 'wallet' });
        }}
        deviceFrameMode={deviceFrameMode}
        onToggleDeviceFrame={() => setDeviceFrameMode(!deviceFrameMode)}
        textSize={textSize}
        onCycleTextSize={cycleTextSize}
        onOpenSubscriptionModal={() => setIsSubscriptionOpen(true)}
        isAdminUnlocked={isAdminUnlocked}
      />

      {authBannerError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{authBannerError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuthBannerError(null)}
            className="p-1 rounded-full hover:bg-rose-100 text-rose-600 cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0">
        {!authReady ? (
          <ViewLoadingFallback label="Starting Dot..." />
        ) : view === 'login' ? (
          <LoginScreen
            onAuthenticated={handleAuthenticated}
            onSwitchView={(target) => handleNavigate({ view: target })}
          />
        ) : (
          <Suspense fallback={<ViewLoadingFallback />}>
            {view === 'customer' ? (
              <ConsumerView
                user={user}
                onUpdateUser={handleUpdateUser}
                onAddReview={handleAddReview}
                onAddWithdrawal={handleAddWithdrawal}
                transactions={transactions}
                myVideosList={myFeedbackList}
                feedbackList={feedbackList}
                deviceFrameMode={deviceFrameMode}
                onOpenGoogleAuth={() => setIsGoogleAuthOpen(true)}
                onLogout={handleLogout}
                onOpenVideoModal={openVideoModal}
                textSize={textSize}
                onCycleTextSize={cycleTextSize}
                registeredUsers={registeredUsers}
                onAuthenticated={handleAuthenticated}
                activePlan={activePlan}
                reviewsQuotaUsed={feedbackList.length}
                onOpenSubscriptionModal={(brand) => {
                  setTargetBrandForSubscription(brand);
                  setIsSubscriptionOpen(true);
                }}
                currentScreen={consumerScreen}
                onNavigateScreen={setConsumerScreen}
                onNavigateView={(target) => handleNavigate({ view: target })}
                onToggleLarge={() => setDeviceFrameMode(!deviceFrameMode)}
              />
            ) : view === 'admin' ? (
              !isAdminUnlocked || !isBootstrappedAdminUser(auth.currentUser) ? (
                <AdminSecurityGate
                  currentUser={user}
                  onUnlockSuccess={(adminProfile) => {
                    if (adminProfile) {
                      setUser((prev) => ({ ...prev, ...adminProfile, isLoggedIn: true }));
                    }
                    if (isBootstrappedAdminUser(auth.currentUser) || adminProfile?.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL) {
                      setIsAdminUnlocked(true);
                      refreshAdminUsers();
                    }
                  }}
                  onCancel={() => handleNavigate({ view: user.accountMode || 'company' })}
                />
              ) : (
                <AdminPanel
                  currentUser={user}
                  feedbackList={feedbackList}
                  transactions={transactions}
                  adminWithdrawals={adminWithdrawals}
                  payments={payments}
                  paymentOrders={paymentOrders}
                  khaltiQrSettings={khaltiQrSettings}
                  registeredUsers={registeredUsers}
                  onRefreshUsers={refreshAdminUsers}
                  onOpenVideoModal={openVideoModal}
                  onUpdateFeedbackItem={handleUpdateFeedback}
                  onSwitchToView={(target) => handleNavigate({ view: target })}
                  onLockAdminSession={() => setIsAdminUnlocked(false)}
                />
              )
            ) : !user.isLoggedIn ? (
              <CompanyLoginGate
                onAuthenticated={(profile) => handleAuthenticated(profile, 'company')}
                onSwitchToCustomer={() => handleNavigate({ view: 'customer' })}
              />
            ) : (
              <CompanyView
                feedbackList={feedbackList}
                payments={payments}
                paymentOrders={paymentOrders}
                withdrawals={adminWithdrawals}
                onOpenVideoModal={openVideoModal}
                onOpenCartModal={(item) => setSelectedCartFeedback(item)}
                onOpenChatModal={(item) => setSelectedChatFeedback(item)}
                onOpenSubscriptionModal={(brand) => {
                  setTargetBrandForSubscription(brand);
                  setIsSubscriptionOpen(true);
                }}
                activePlan={activePlan}
                reviewsQuotaUsed={feedbackList.filter((f) => isFeedbackItemUnlocked(f, user, activePlan)).length}
                user={user}
                onSelectPlan={handleSelectPlan}
                onOpenAuth={() => setIsGoogleAuthOpen(true)}
                onUpdateUser={handleUpdateUser}
                onFeedbackUpdated={handleUpdateFeedback}
                onAddFeedback={handleAddReview}
                onNavigateHome={
                  isAdminUnlocked || user.accountMode !== 'company'
                    ? () => handleNavigate({ view: 'customer' })
                    : undefined
                }
                onNavigateView={(target) => handleNavigate({ view: target })}
                onLogout={handleLogout}
              />
            )}
          </Suspense>
        )}
      </main>

      {isGoogleAuthOpen && (
        <Suspense fallback={null}>
          <GoogleAuthModal
            isOpen={isGoogleAuthOpen}
            onClose={() => setIsGoogleAuthOpen(false)}
            user={user}
            preferredAccountMode={view === 'company' ? 'company' : 'customer'}
            onUpdateUser={handleUpdateUser}
            onAuthenticated={(profile) => handleAuthenticated(profile, view === 'company' ? 'company' : 'customer')}
            onLogout={handleLogout}
          />
        </Suspense>
      )}

      {isSubscriptionOpen && (
        <Suspense fallback={null}>
          <SubscriptionModal
            isOpen={isSubscriptionOpen}
            onClose={() => setIsSubscriptionOpen(false)}
            activePlan={activePlan}
            onSelectPlan={handleSelectPlan}
            initialBrandTarget={targetBrandForSubscription}
            user={user}
            paymentOrders={paymentOrders}
          />
        </Suspense>
      )}

      {selectedCartFeedback && (
        <Suspense fallback={null}>
          <CartModal
            feedback={selectedCartFeedback}
            onClose={() => setSelectedCartFeedback(null)}
            onFeedbackUpdated={handleUpdateFeedback}
          />
        </Suspense>
      )}

      {selectedChatFeedback && (
        <Suspense fallback={null}>
          <DirectChatModal
            feedback={selectedChatFeedback}
            onClose={() => setSelectedChatFeedback(null)}
          />
        </Suspense>
      )}

      {selectedVideoFeedback && (
        <Suspense fallback={null}>
          <VideoModal
            feedback={selectedVideoFeedback}
            initialTab={selectedVideoInitialTab}
            onClose={() => setSelectedVideoFeedback(null)}
            onFeedbackUpdated={handleUpdateFeedback}
            onOpenChatGPTWithSummary={handleOpenChatGPTFromVideo}
            user={user}
            activePlan={activePlan}
            onOpenSubscriptionModal={(brand) => {
              setTargetBrandForSubscription(brand);
              setIsSubscriptionOpen(true);
            }}
          />
        </Suspense>
      )}

      {isProfileModalOpen && (
        <Suspense fallback={null}>
          <UserProfileComponent
            user={user}
            onUpdateUser={handleUpdateUser}
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
