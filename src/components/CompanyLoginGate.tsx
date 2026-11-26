import React, { useState } from 'react';
import { Building2, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import {
  signInWithGooglePopup,
  ensureUserDocsInFirestore,
  setPendingAuthAccountMode,
} from '../services/firebaseService';
import { AuthErrorNotice } from './AuthErrorNotice';

interface CompanyLoginGateProps {
  onAuthenticated: (profile: UserProfile) => void;
  onSwitchToCustomer: () => void;
}

export const CompanyLoginGate: React.FC<CompanyLoginGateProps> = ({
  onAuthenticated,
  onSwitchToCustomer,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      setPendingAuthAccountMode('company');
      const firebaseUser = await signInWithGooglePopup();
      const profile = await ensureUserDocsInFirestore(firebaseUser, 'company');
      setSuccess(`Verified ${profile.email}. Entering Company Dashboard...`);
      onAuthenticated(profile);
    } catch (err: any) {
      setPendingAuthAccountMode(null);
      setError(err?.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6 min-h-[85vh]">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-500/30 mb-3">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>ENTERPRISE PORTAL AUTHENTICATION</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Sign In to Access Company Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Authenticate with your verified Google account to manage company subscriptions, customer analytics, and video reviews stored in Cloud Firestore.
          </p>
        </div>

        {error && (
          <AuthErrorNotice
            message={error}
            variant="dark"
            className="mb-4"
            onUseGoogleSignIn={handleGoogleSignIn}
          />
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3.5 px-5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Verifying Google Identity...</span>
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Continue with Google to Company Dashboard</span>
            </>
          )}
        </button>

        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Submitting a smartphone review instead?{' '}
            <button
              type="button"
              onClick={onSwitchToCustomer}
              className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
            >
              Switch to Customer App →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
