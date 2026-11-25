import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Loader2,
  User as UserIcon,
  Lock,
  Mail,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  signInWithGooglePopup,
  signInWithEmailAndPasswordVerified,
  signUpWithEmailAndSendVerification,
  resendVerificationEmailForCurrentUser,
  verifyGmailCodeOrRefreshStatus,
  sendPasswordResetForEmail,
  ensureUserDocsInFirestore,
  setPendingAuthAccountMode,
  fetchAuthorizedFirebaseDomains,
  signOutFirebase,
} from '../services/firebaseService';
import { auth, formatFirestoreErrorMessage } from '../firebase';
import { DotLogo } from './DotLogo';
import { AuthErrorNotice } from './AuthErrorNotice';

interface LoginScreenProps {
  onAuthenticated: (profile: UserProfile, preferredDestination?: 'customer' | 'company') => void;
  onSwitchView?: (view: 'customer' | 'company' | 'admin') => void;
}

type AuthScreenMode = 'signin' | 'signup' | 'verify' | 'forgot';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onAuthenticated,
  onSwitchView,
}) => {
  const [mode, setMode] = useState<AuthScreenMode>('signin');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);
  const [termsModalOpen, setTermsModalOpen] = useState<boolean>(false);

  const [verificationCode, setVerificationCode] = useState<string>('');
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const onAuthenticatedRef = useRef(onAuthenticated);
  onAuthenticatedRef.current = onAuthenticated;
  const silentVerifyInFlightRef = useRef(false);
  const logoTapCountRef = useRef(0);
  const logoTapTimerRef = useRef<number | null>(null);

  const handleSecretAdminTap = () => {
    if (!onSwitchView) return;
    logoTapCountRef.current += 1;
    if (logoTapTimerRef.current) {
      window.clearTimeout(logoTapTimerRef.current);
    }
    if (logoTapCountRef.current >= 5) {
      logoTapCountRef.current = 0;
      onSwitchView('admin');
      return;
    }
    logoTapTimerRef.current = window.setTimeout(() => {
      logoTapCountRef.current = 0;
    }, 2200);
  };

  // Check Authorized Domain, resume pending Gmail verification, & auto-process incoming Firebase link (?mode=verifyEmail&oobCode=...)
  useEffect(() => {
    let active = true;
    fetchAuthorizedFirebaseDomains()
      .then((status) => {
        if (!active) return;
        if (!status.isCurrentDomainAuthorized && status.currentHost) {
          setErrorMsg(
            `This domain (${status.currentHost}) is not yet authorized in Firebase Authentication for project "${status.projectId}". Add "${status.currentHost}" under Firebase Console → Authentication → Settings → Authorized domains.`
          );
        }
      })
      .catch(() => {});

    const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlMode = search?.get('mode');
    const oobCode = search?.get('oobCode');

    if (urlMode === 'verifyEmail' && oobCode) {
      setIsLoading(true);
      verifyGmailCodeOrRefreshStatus(oobCode)
        .then(async (verifiedUser) => {
          if (!active) return;
          const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
          window.history.replaceState({}, document.title, cleanUrl);
          if (verifiedUser) {
            setPendingAuthAccountMode('company');
            const profile = await ensureUserDocsInFirestore(verifiedUser, 'company');
            setSuccessMsg(`Gmail verified (${profile.email}). Opening dashboard...`);
            onAuthenticatedRef.current(profile, 'company');
          } else {
            setSuccessMsg('Gmail verified! Sign in with your email and password to continue.');
            setMode('signin');
          }
        })
        .catch((err: unknown) => {
          if (!active) return;
          setErrorMsg(formatFirestoreErrorMessage(err, 'Verification link expired or invalid.'));
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    } else if (auth.currentUser && !auth.currentUser.emailVerified && auth.currentUser.email) {
      setPendingVerifyEmail(auth.currentUser.email);
      setEmail(auth.currentUser.email);
      setMode('verify');
    }

    return () => {
      active = false;
    };
  }, []);

  // Auto-detect when user clicks the Gmail verification link in another tab/app
  useEffect(() => {
    if (mode !== 'verify') return;
    let active = true;

    const runSilentCheck = async () => {
      if (!active || silentVerifyInFlightRef.current || !auth.currentUser) return;
      silentVerifyInFlightRef.current = true;
      try {
        const verifiedUser = await verifyGmailCodeOrRefreshStatus();
        if (verifiedUser && active) {
          setPendingAuthAccountMode('company');
          const profile = await ensureUserDocsInFirestore(verifiedUser, 'company');
          if (!active) return;
          setSuccessMsg(`Verified ${profile.email}! Opening Users & Company dashboard...`);
          onAuthenticatedRef.current(profile, 'company');
        }
      } catch {
        // Ignore transient network errors while polling quietly
      } finally {
        silentVerifyInFlightRef.current = false;
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void runSilentCheck();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void runSilentCheck();
      }
    }, 3500);

    return () => {
      active = false;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.clearInterval(pollInterval);
    };
  }, [mode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your Gmail address and password.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setPendingAuthAccountMode('company');
      const res = await signInWithEmailAndPasswordVerified({
        email,
        password,
        rememberMe,
      });
      if (res.status === 'needs_verification') {
        setPendingVerifyEmail(res.user.email || email.trim());
        setMode('verify');
        setResendCooldown(30);
        setSuccessMsg(
          `Gmail verification link/code sent to ${res.user.email || email.trim()}. Check your Gmail inbox (and Spam folder), then verify below.`
        );
        return;
      }
      const profile = await ensureUserDocsInFirestore(res.user, 'company');
      setSuccessMsg(`Signed in as ${profile.email}`);
      onAuthenticated(profile, 'company');
    } catch (err: unknown) {
      setPendingAuthAccountMode(null);
      setErrorMsg(formatFirestoreErrorMessage(err, 'Sign-in failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setErrorMsg('Please accept Privacy & Terms to continue.');
      return;
    }
    if (!email.trim() || password.length < 6) {
      setErrorMsg('Enter a valid Gmail address and a password of at least 6 characters.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setPendingAuthAccountMode('company');
      const createdUser = await signUpWithEmailAndSendVerification({
        name: fullName,
        email,
        password,
        rememberMe,
      });
      setPendingVerifyEmail(createdUser.email || email.trim());
      setMode('verify');
      setResendCooldown(30);
      setSuccessMsg(
        `Verification email sent to ${createdUser.email || email.trim()}. Open your Gmail, click the verification link or paste the code below.`
      );
    } catch (err: unknown) {
      setPendingAuthAccountMode(null);
      setErrorMsg(formatFirestoreErrorMessage(err, 'Could not create account. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyGmail = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const verifiedUser = await verifyGmailCodeOrRefreshStatus(verificationCode);
      if (!verifiedUser) {
        setErrorMsg(
          'Your Gmail is not verified yet. Open the verification email in your Gmail inbox and click the link (or paste the verification code / URL above), then tap Continue.'
        );
        return;
      }
      setPendingAuthAccountMode('company');
      const profile = await ensureUserDocsInFirestore(verifiedUser, 'company');
      setSuccessMsg(`Verified ${profile.email}! Opening Users & Company dashboard...`);
      onAuthenticated(profile, 'company');
    } catch (err: unknown) {
      setErrorMsg(formatFirestoreErrorMessage(err, 'Gmail verification check failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await resendVerificationEmailForCurrentUser();
      setResendCooldown(30);
      setSuccessMsg(`Fresh verification email sent to ${pendingVerifyEmail || email}.`);
    } catch (err: unknown) {
      setErrorMsg(formatFirestoreErrorMessage(err, 'Could not resend verification email.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Enter your Gmail address to receive a password reset link.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await sendPasswordResetForEmail(email);
      setSuccessMsg(`Password reset email sent to ${email.trim()}. Check your Gmail inbox.`);
    } catch (err: unknown) {
      setErrorMsg(formatFirestoreErrorMessage(err, 'Could not send reset email.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!agreeTerms && mode === 'signup') {
      setErrorMsg('Please agree to Privacy & Terms to continue.');
      return;
    }
    setIsGoogleLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setPendingAuthAccountMode('company');
      const firebaseUser = await signInWithGooglePopup(rememberMe);
      const profile = await ensureUserDocsInFirestore(firebaseUser, 'company');
      setSuccessMsg(`Signed in as ${profile.email}`);
      onAuthenticated(profile, 'company');
    } catch (err: unknown) {
      setPendingAuthAccountMode(null);
      setErrorMsg(formatFirestoreErrorMessage(err, 'Google sign-in failed. Please try again.'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full min-h-full bg-gradient-to-br from-[#0077e6] via-[#0058c6] to-[#003b94] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      {/* Main Responsive Split Card */}
      <div className="w-full max-w-[860px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 my-auto">
        {/* LEFT PANEL: Welcome Blue Banner with 3D Spheres */}
        <div className="md:col-span-5 lg:col-span-6 relative bg-gradient-to-br from-[#0078eb] via-[#0056c2] to-[#00378c] text-white px-5 py-4 sm:px-7 sm:py-6 md:p-8 lg:p-10 flex flex-col justify-between overflow-hidden md:min-h-[430px]">
          {/* Decorative 3D-shaded spheres matching banner aesthetic */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -right-12 w-44 sm:w-56 h-44 sm:h-56 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle at 30% 30%, #6ec3ff, #003587 75%)' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -left-14 w-40 sm:w-52 h-40 sm:h-52 rounded-full opacity-90 shadow-2xl"
            style={{ background: 'radial-gradient(circle at 35% 30%, #2492ff, #003b99 75%)' }}
          />
          <div
            aria-hidden="true"
            className="hidden md:block pointer-events-none absolute bottom-10 -right-8 w-36 h-36 rounded-full opacity-95 shadow-2xl"
            style={{ background: 'radial-gradient(circle at 32% 28%, #3ca1ff, #003388 78%)' }}
          />

          {/* Top Brand */}
          <div
            onClick={handleSecretAdminTap}
            className="relative z-10 flex items-center gap-2.5 select-none w-fit"
          >
            <DotLogo size="md" variant="gradient" className="ring-2 ring-white/30" />
            <span className="font-black text-base sm:text-lg tracking-tight text-white">Dot</span>
          </div>

          {/* Center Welcome Copy */}
          <div className="relative z-10 my-2.5 md:my-auto space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase leading-none">
              Welcome
            </h2>
            <p className="text-[11px] sm:text-sm font-bold tracking-wide text-sky-100 uppercase">
              Users &amp; Company Portal
            </p>
            <p className="hidden sm:block text-xs sm:text-[13px] text-sky-100/90 leading-relaxed max-w-xs">
              Verify your Gmail once to access both Users video rewards and Company insights from one account.
            </p>
          </div>

          {/* Bottom note */}
          <div className="relative z-10 hidden md:flex items-center gap-2 text-[11px] font-medium text-sky-100/80">
            <ShieldCheck className="w-4 h-4 text-sky-200 shrink-0" />
            <span>Protected by Firebase Gmail Verification</span>
          </div>
        </div>

        {/* RIGHT PANEL: Clean Sign In / Sign Up / Verification Form */}
        <div className="md:col-span-7 lg:col-span-6 p-4 sm:p-7 lg:p-9 flex flex-col justify-center bg-white relative">
          {/* Decorative corner blue accent matching bottom-right sphere */}
          <div
            aria-hidden="true"
            className="hidden sm:block pointer-events-none absolute -bottom-10 -right-10 w-24 h-24 rounded-full opacity-90"
            style={{ background: 'radial-gradient(circle at 35% 35%, #2492ff, #0042a8 80%)' }}
          />

          <div className="relative z-10 w-full max-w-sm mx-auto space-y-3.5">
            {/* Form Heading */}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {mode === 'signin'
                  ? 'Sign in'
                  : mode === 'signup'
                  ? 'Create Account'
                  : mode === 'verify'
                  ? 'Gmail Verification'
                  : 'Reset Password'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {mode === 'signin' && 'Sign in with Google or your verified Gmail account.'}
                {mode === 'signup' && 'Verify your Gmail once to unlock both Users and Company.'}
                {mode === 'verify' && `Tap the Gmail verification link sent to ${pendingVerifyEmail || email} (or paste the link below).`}
                {mode === 'forgot' && 'Enter your Gmail address to receive a password reset link.'}
              </p>
            </div>

            {/* Instant 1-Click Verified Google Login */}
            {(mode === 'signin' || mode === 'signup') && (
              <>
                <button
                  type="button"
                  disabled={isLoading || isGoogleLoading}
                  onClick={handleGoogleAuth}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#0058c6]/40 text-slate-800 font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0b3b75]" />
                      <span>Connecting Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Continue with Google (Instant Verified)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Or use Email &amp; Password</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              </>
            )}

            {/* Alerts */}
            {errorMsg && (
              <AuthErrorNotice
                message={errorMsg}
                variant="light"
                onDomainAuthorized={() => setErrorMsg(null)}
              />
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* MODE 1: SIGN IN */}
            {mode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-3">
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Gmail / Email address"
                    className="w-full rounded-xl bg-slate-100 border border-slate-200/80 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0058c6]/30 focus:border-[#0058c6] focus:bg-white transition-all"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-xl bg-slate-100 border border-slate-200/80 pl-10 pr-16 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0058c6]/30 focus:border-[#0058c6] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-[#0b3b75] hover:text-[#0058c6] uppercase tracking-wider cursor-pointer"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#0b3b75] focus:ring-[#0b3b75] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setMode('forgot');
                    }}
                    className="font-semibold text-[#0b3b75] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full min-h-[44px] py-2.5 px-5 rounded-xl bg-[#0b3b75] hover:bg-[#082d5c] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </form>
            )}

            {/* MODE 2: SIGN UP */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3">
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name / Company Name"
                    className="w-full rounded-xl bg-slate-100 border border-slate-200/80 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0058c6]/30 focus:border-[#0058c6] focus:bg-white transition-all"
                  />
                </div>

                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Gmail address (e.g. name@gmail.com)"
                    className="w-full rounded-xl bg-slate-100 border border-slate-200/80 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0058c6]/30 focus:border-[#0058c6] focus:bg-white transition-all"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password (min 6 chars)"
                    className="w-full rounded-xl bg-slate-100 border border-slate-200/80 pl-10 pr-16 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0058c6]/30 focus:border-[#0058c6] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-[#0b3b75] hover:text-[#0058c6] uppercase tracking-wider cursor-pointer"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#0b3b75] focus:ring-[#0b3b75] cursor-pointer"
                  />
                  <span>
                    I agree to{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setTermsModalOpen(true);
                      }}
                      className="font-semibold text-[#0b3b75] underline cursor-pointer"
                    >
                      Privacy &amp; Terms
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full min-h-[44px] py-2.5 px-5 rounded-xl bg-[#0b3b75] hover:bg-[#082d5c] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Gmail verification...</span>
                    </>
                  ) : (
                    <span>Create Account &amp; Verify Gmail</span>
                  )}
                </button>
              </form>
            )}

            {/* MODE 3: GMAIL VERIFICATION */}
            {mode === 'verify' && (
              <form onSubmit={handleVerifyGmail} className="space-y-3">
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-900 space-y-1.5 leading-relaxed">
                  <div>
                    1. Open <b>{pendingVerifyEmail || email}</b> in Gmail (check Inbox or Spam) and tap the verification link.
                  </div>
                  <div>
                    2. This page auto-unlocks once verified — or paste the verification link / code below.
                  </div>
                </div>

                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#0b3b75] font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Open Gmail Inbox</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Paste verification link or oobCode (optional)"
                    className="w-full rounded-xl bg-slate-100 border border-slate-200/80 pl-10 pr-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0058c6]/30 focus:border-[#0058c6] focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[44px] py-2.5 px-5 rounded-xl bg-[#0b3b75] hover:bg-[#082d5c] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking Gmail verification...</span>
                    </>
                  ) : (
                    <span>I&apos;ve Verified — Continue</span>
                  )}
                </button>

                <div className="flex items-center justify-between gap-2 text-xs pt-1">
                  <button
                    type="button"
                    disabled={isLoading || resendCooldown > 0}
                    onClick={handleResendVerification}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#0b3b75] hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Gmail'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await signOutFirebase().catch(() => {});
                      setVerificationCode('');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setMode('signin');
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign in</span>
                  </button>
                </div>
              </form>
            )}

            {/* MODE 4: FORGOT PASSWORD */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your Gmail address"
                    className="w-full rounded-xl bg-slate-100 border border-slate-200/80 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0058c6]/30 focus:border-[#0058c6] focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[44px] py-2.5 px-5 rounded-xl bg-[#0b3b75] hover:bg-[#082d5c] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset email...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('signin');
                  }}
                  className="w-full py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign in</span>
                </button>
              </form>
            )}

            {/* MODE SWITCH FOOTER (Sign in / Sign up toggle) */}
            {(mode === 'signin' || mode === 'signup') && (
              <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-xs">
                <div className="text-slate-500">
                  {mode === 'signin' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setSuccessMsg(null);
                          setMode('signup');
                        }}
                        className="font-bold text-[#0b3b75] hover:underline cursor-pointer"
                      >
                        Sign Up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setSuccessMsg(null);
                          setMode('signin');
                        }}
                        className="font-bold text-[#0b3b75] hover:underline cursor-pointer"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {termsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg border border-slate-200 space-y-4">
            <h2 className="font-bold text-slate-900 text-base">Privacy &amp; Terms</h2>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>One verified Gmail account gives you seamless access to both Users (Consumer) and Company features.</p>
              <p>Wallet balances, payouts, and subscriptions are protected under owner-only Firestore security rules.</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreeTerms(true);
                  setTermsModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-[#0b3b75] hover:bg-[#082d5c] text-white text-xs font-semibold cursor-pointer"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

