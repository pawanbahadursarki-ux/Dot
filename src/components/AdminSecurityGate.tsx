import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, Building2, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { auth, formatFirestoreErrorMessage } from '../firebase';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  isBootstrappedAdminUser,
  signInWithGooglePopup,
  ensureUserDocsInFirestore,
} from '../services/firebaseService';

interface AdminSecurityGateProps {
  currentUser: UserProfile;
  onUnlockSuccess: (adminProfile?: UserProfile) => void;
  onCancel: () => void;
}

export const AdminSecurityGate: React.FC<AdminSecurityGateProps> = ({
  currentUser,
  onUnlockSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const firebaseUser = auth.currentUser;
  const isVerifiedAdmin = isBootstrappedAdminUser(firebaseUser);

  const handleVerifyWithGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isBootstrappedAdminUser(auth.currentUser)) {
        onUnlockSuccess();
        return;
      }

      const signedUser = await signInWithGooglePopup();
      if (!isBootstrappedAdminUser(signedUser)) {
        setErrorMessage(
          `Signed in as ${signedUser.email || 'unknown'}. Only the verified platform administrator (${BOOTSTRAPPED_ADMIN_EMAIL}) is authorized by Firestore security rules.`
        );
        return;
      }

      const profile = await ensureUserDocsInFirestore(signedUser);
      onUnlockSuccess(profile);
    } catch (err: unknown) {
      setErrorMessage(formatFirestoreErrorMessage(err, 'Google Admin verification failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex items-center justify-center p-4 min-h-screen">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl ring-8 ring-amber-500/10">
              <Lock className="w-10 h-10 text-amber-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="text-center space-y-1 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 uppercase tracking-wider mb-1">
            <span>RESTRICTED ACCESS · ADMIN ONLY</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Admin Security Verification
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            User moderation, payout approvals, and platform-wide audit controls are enforced by Firebase Authentication and Cloud Firestore rules.
          </p>
        </div>

        <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-slate-800/90 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
            {(currentUser.name || 'A').charAt(0)}
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white truncate">
                {currentUser.isLoggedIn ? currentUser.name : 'Not Signed In'}
              </span>
              {isVerifiedAdmin && (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Verified Admin
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-mono block truncate">
              {currentUser.isLoggedIn ? currentUser.email : `Required: ${BOOTSTRAPPED_ADMIN_EMAIL}`}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleVerifyWithGoogle}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Google Admin Identity...</span>
            </>
          ) : isVerifiedAdmin ? (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Enter User Provisions & Admin Console →</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In with Admin Google Account</span>
            </>
          )}
        </button>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>← Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
