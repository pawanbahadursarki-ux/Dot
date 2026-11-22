import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Building2,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  signInWithGooglePopup,
  ensureUserDocsInFirestore,
  setPendingAuthAccountMode,
} from '../services/firebaseService';
import { formatFirestoreErrorMessage } from '../firebase';
import { DotLogo } from './DotLogo';

interface LoginScreenProps {
  onAuthenticated: (profile: UserProfile, preferredDestination?: 'customer' | 'company') => void;
  onSwitchView?: (view: 'customer' | 'company') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onAuthenticated,
}) => {
  const [destination, setDestination] = useState<'customer' | 'company'>('customer');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);
  const [termsModalOpen, setTermsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleAuth = async (targetDest: 'customer' | 'company') => {
    if (!agreeTerms) {
      setErrorMsg('Please agree to the Privacy & Terms to continue.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setPendingAuthAccountMode(targetDest);
      const firebaseUser = await signInWithGooglePopup();
      const profile = await ensureUserDocsInFirestore(firebaseUser, targetDest);
      setSuccessMsg(`Signed in as ${profile.email}`);
      onAuthenticated(profile, targetDest);
    } catch (err: unknown) {
      setPendingAuthAccountMode(null);
      setErrorMsg(formatFirestoreErrorMessage(err, 'Google sign-in failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full py-10 px-4 flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-7 space-y-5">
        {/* Brand & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <DotLogo size="md" variant="dark" />
            <span className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Dot
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            1 Gmail · 1 Portal
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in</h1>
          <p className="text-xs text-slate-500 mt-1">
            Choose your portal and continue with Google.
          </p>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Portal Selector */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setDestination('customer')}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              destination === 'customer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Customer App</span>
          </button>

          <button
            type="button"
            onClick={() => setDestination('company')}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              destination === 'company'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Company Portal</span>
          </button>
        </div>

        {/* Terms Agreement */}
        <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer select-none min-h-[28px]">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
          />
          <span>
            I agree to{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setTermsModalOpen(true);
              }}
              className="font-semibold text-slate-900 underline hover:text-indigo-700 cursor-pointer"
            >
              Privacy & Terms
            </button>
          </span>
        </label>

        {/* Google Sign-In CTA */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleGoogleAuth(destination)}
          className="w-full min-h-[46px] py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>
      </div>

      {termsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg border border-slate-200 space-y-4">
            <h2 className="font-bold text-slate-900 text-base">Privacy & Terms</h2>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>One Google account accesses one chosen portal (Customer App or Company Portal).</p>
              <p>Wallet balances, payouts, and subscriptions are stored under owner-only Firestore rules.</p>
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
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
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
