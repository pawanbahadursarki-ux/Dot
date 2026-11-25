/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { Loader2, X } from 'lucide-react';
import { auth, formatFirestoreErrorMessage } from './firebase';
import {
  ActiveSubscriptionDoc,
  BOOTSTRAPPED_ADMIN_EMAIL,
  consumeGoogleRedirectAuth,
  DEFAULT_KHALTI_QR_SETTINGS,
  ensureUserDocsInFirestore,
  fetchAllRegisteredUsersForAdmin,
  isBootstrappedAdminUser,
  PaymentRecord,
  setPendingAuthAccountMode,
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
import { AuthErrorNotice } from './components/AuthErrorNotice';

const ConsumerView = lazy(() =>
  import('./components/ConsumerView').then((m) => ({ default: m.ConsumerView }))
);
const CompanyView = lazy(() =>
  import('./components/CompanyView').then((m) => ({ default: m.CompanyView }))
);
const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel }))
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
  const [verifiedSession, setVerifiedSession] = useState<{ uid: string; isAdmin: boolean } | null>(null);

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

  // Handle optional ?admin=1 secret entry query param cleanly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      setView('admin');
      params.delete('admin');
      const nextSearch = params.toString();
      const cleanUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || ''}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Primary Firebase Auth & ID Token Listener (handles initial load, sign-in, sign-out, and emailVerified token refresh)
  useEffect(() => {
    let active = true;

    // Never let slow/restricted mobile networks stall forever on the initial loading screen
    const authBootTimeout = window.setTimeout(() => {
      if (active) setAuthReady(true);
    }, 2000);

    // Handle returning from mobile signInWithRedirect seamlessly without racing auth listener
    const redirectPromise = consumeGoogleRedirectAuth()
      .then(async (redirectRes) => {
        if (!redirectRes || !active) return null;
        await ensureUserDocsInFirestore(redirectRes.user, redirectRes.preferredMode || 'company');
        setPendingAuthAccountMode(null);
        setView(redirectRes.preferredMode || 'company');
        return redirectRes;
      })
      .catch((err: unknown) => {
        if (active) {
          setAuthBannerError(formatFirestoreErrorMessage(err, 'Google sign-in redirect failed. Please try again.'));
        }
        return null;
      });

    const unsubAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      await redirectPromise;
      if (!active) return;
      window.clearTimeout(authBootTimeout);

      if (!firebaseUser) {
        setVerifiedSession(null);
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

      // Hold off Firestore reads/writes and portal entry until Gmail verification completes
      if (!firebaseUser.emailVerified) {
        setVerifiedSession(null);
        setUser(EMPTY_USER);
        setActiveSubscription(null);
        setIsAdminUnlocked(false);
        setSubLoading(false);
        setAuthReady(true);
        return;
      }

      try {
        const profile = await ensureUserDocsInFirestore(firebaseUser);
        if (!active) return;
        setPendingAuthAccountMode(null);

        if (profile.status === 'banned') {
          await signOutFirebase();
          setVerifiedSession(null);
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
        setVerifiedSession((prev) =>
          prev && prev.uid === firebaseUser.uid && prev.isAdmin === isAdmin
            ? prev
            : { uid: firebaseUser.uid, isAdmin }
        );

        // Land directly on dashboard after sign-in or session restore from login screen
        setView((prev) => (prev === 'login' ? 'company' : prev));
      } catch (err: unknown) {
        if (active) {
          setAuthBannerError(formatFirestoreErrorMessage(err, 'Unable to sync your profile with Cloud Firestore.'));
          setSubLoading(false);
        }
      } finally {
        if (active) setAuthReady(true);
      }
    });

    return () => {
      active = false;
      window.clearTimeout(authBootTimeout);
      unsubAuth();
    };
  }, []);

  // Attach live Cloud Firestore subscriptions whenever a verified session becomes active
  useEffect(() => {
    if (!verifiedSession?.uid) {
      return;
    }

    const { uid, isAdmin } = verifiedSession;
    setSubLoading(true);

    const unsubWallet = subscribeUserPrivateWallet(uid, (patch) => {
      setUser((prev) => ({
        ...prev,
        ...patch,
      }));
    });

    const unsubSub = subscribeUserSubscription(uid, (sub) => {
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

    const unsubFeedback = subscribeCompanyFeedback(isAdmin, (items) => {
      setFeedbackList(items);
    });

    const unsubMyFeedback = subscribeMyFeedback(uid, (items) => {
      setMyFeedbackList(items);
    });

    const unsubWithdrawals = subscribeWithdrawals(uid, isAdmin, (adminList, txList) => {
      setAdminWithdrawals(adminList);
      setTransactions(txList);
    });

    const unsubPayments = subscribePayments(uid, isAdmin, (items) => {
      setPayments(items);
    });

    const unsubPaymentOrders = subscribePaymentOrders(uid, isAdmin, (orders) => {
      setPaymentOrders(orders);
    });

    const unsubKhaltiQr = subscribeKhaltiQrSettings((settings) => {
      setKhaltiQrSettings(settings);
    });

    if (isAdmin) {
      fetchAllRegisteredUsersForAdmin()
        .then((list) => setRegisteredUsers(list))
        .catch(() => {});
    }

    return () => {
      unsubWallet();
      unsubSub();
      unsubFeedback();
      unsubMyFeedback();
      unsubWithdrawals();
      unsubPayments();
      unsubPaymentOrders();
      unsubKhaltiQr();
    };
  }, [verifiedSession]);

  const handleNavigate = (target: {
    view: 'customer' | 'company' | 'login' | 'admin' | 'dual';
    screen?: string;
    allowAdminEntry?: boolean;
  }) => {
    setAuthBannerError(null);
    if (user.isLoggedIn && target.view === 'login') {
      setView('company');
      return;
    }

    if (target.view === 'admin' && !isAdminUnlocked && !isBootstrappedAdminUser(auth.currentUser) && !target.allowAdminEntry) {
      return;
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
    preferredDestination: 'customer' | 'company' = 'company'
  ) => {
    const firebaseUser = auth.currentUser;
    const isAdmin = Boolean(firebaseUser && isBootstrappedAdminUser(firebaseUser));
    setAuthBannerError(null);

    setUser((prev) => ({
      ...prev,
      ...profile,
      isLoggedIn: true,
    }));

    if (firebaseUser && firebaseUser.emailVerified) {
      setVerifiedSession((prev) =>
        prev && prev.uid === firebaseUser.uid && prev.isAdmin === isAdmin
          ? prev
          : { uid: firebaseUser.uid, isAdmin }
      );
    }

    if (isAdmin) {
      setIsAdminUnlocked(true);
      refreshAdminUsers();
    }

    setView(preferredDestination);
  };

  const handleLogout = async () => {
    try {
      await signOutFirebase();
    } catch {
      // Ignore sign-out errors and reset UI
    }
    setVerifiedSession(null);
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
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-2">
            <AuthErrorNotice message={authBannerError} variant="light" className="flex-1" />
            <button
              type="button"
              onClick={() => setAuthBannerError(null)}
              className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 cursor-pointer shrink-0"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0">
        {!authReady ? (
          <ViewLoadingFallback label="Starting Dot..." />
        ) : view === 'admin' ? (
          <Suspense fallback={<ViewLoadingFallback />}>
            {!isAdminUnlocked || !isBootstrappedAdminUser(auth.currentUser) ? (
              <AdminSecurityGate
                currentUser={user}
                onUnlockSuccess={(adminProfile) => {
                  const fbUser = auth.currentUser;
                  if (adminProfile) {
                    setUser((prev) => ({ ...prev, ...adminProfile, isLoggedIn: true }));
                  }
                  if (isBootstrappedAdminUser(fbUser) || adminProfile?.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL) {
                    setIsAdminUnlocked(true);
                    if (fbUser?.uid) {
                      setVerifiedSession({ uid: fbUser.uid, isAdmin: true });
                    }
                    refreshAdminUsers();
                  }
                }}
                onCancel={() => handleNavigate({ view: user.isLoggedIn ? 'company' : 'login' })}
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
            )}
          </Suspense>
        ) : !user.isLoggedIn || view === 'login' ? (
          <LoginScreen
            onAuthenticated={handleAuthenticated}
            onSwitchView={(target) =>
              handleNavigate({ view: target, allowAdminEntry: target === 'admin' })
            }
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
                onNavigateView={(target) =>
                  handleNavigate({ view: target, allowAdminEntry: target === 'admin' })
                }
                onToggleLarge={() => setDeviceFrameMode(!deviceFrameMode)}
                isAdminUnlocked={isAdminUnlocked}
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
                onNavigateHome={() => handleNavigate({ view: 'customer' })}
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
            isCompanyContext={view === 'company'}
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
