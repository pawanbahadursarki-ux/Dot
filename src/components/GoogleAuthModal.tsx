import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Sparkles,
  Wallet,
  Camera,
  Loader2,
} from 'lucide-react';
import { UserProfile } from '../types';
import { UserProfileComponent } from './UserProfile';
import {
  signInWithGooglePopup,
  ensureUserDocsInFirestore,
  setPendingAuthAccountMode,
} from '../services/firebaseService';
import { formatFirestoreErrorMessage } from '../firebase';
import { AuthErrorNotice } from './AuthErrorNotice';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  preferredAccountMode?: 'customer' | 'company';
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onAuthenticated: (profile: UserProfile) => void;
  onLogout: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  user,
  preferredAccountMode = 'customer',
  onUpdateUser,
  onAuthenticated,
  onLogout,
}) => {
  const [editName, setEditName] = useState<string>(user.name || '');
  const [editNickname, setEditNickname] = useState<string>(user.nickname || '');
  const [editPhone, setEditPhone] = useState<string>(user.phone || '');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showFullProfileModal, setShowFullProfileModal] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setAuthError(null);
      setProfileSuccessMsg(null);
      setEditName(user.name || '');
      setEditNickname(user.nickname || '');
      setEditPhone(user.phone || '');
    }
  }, [isOpen, user.name, user.nickname, user.phone]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      setPendingAuthAccountMode(preferredAccountMode);
      const firebaseUser = await signInWithGooglePopup();
      const profile = await ensureUserDocsInFirestore(firebaseUser, preferredAccountMode);
      onAuthenticated(profile);
      onClose();
    } catch (err: unknown) {
      setPendingAuthAccountMode(null);
      setAuthError(formatFirestoreErrorMessage(err, 'Google Sign-In cancelled or failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name: editName.trim() || user.name,
      nickname: editNickname.trim().replace(/^@+/, '') || user.nickname,
      phone: editPhone.trim(),
    });
    setProfileSuccessMsg('Profile updated in Firestore!');
    setTimeout(() => setProfileSuccessMsg(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md transition-all duration-300">
        <div className="flex items-center justify-end mb-2 px-1 text-xs">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/20 cursor-pointer shrink-0 ml-auto"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {user.isLoggedIn ? (
          <div className="bg-[#F4F5F7] rounded-[36px] overflow-hidden shadow-2xl border border-slate-200 p-6 sm:p-7 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setShowFullProfileModal(true)}
                  className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-[#1b0036] to-[#3a0a59] flex items-center justify-center shadow-md cursor-pointer group"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-lg">{user.name?.charAt(0) || 'U'}</span>
                  )}
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight flex items-center gap-1.5">
                    <span>{user.name}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-purple-700 font-mono font-bold">
                      @{user.nickname || (user.email ? user.email.split('@')[0] : 'user')}
                    </span>
                    <span className="text-slate-300">•</span>
                    <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-slate-600">
                    Access Scope:{' '}
                    <span className="text-indigo-700 font-mono">
                      {user.role === 'company_admin'
                        ? 'Admin (All Portals)'
                        : user.accountMode === 'company'
                        ? 'Company Portal Only (1 Gmail = 1 Access)'
                        : 'Customer App Only (1 Gmail = 1 Access)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 bg-white rounded-2xl shadow-xs border border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Wallet Balance</span>
                </div>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  Rs {(user.walletBalance ?? 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl shadow-xs border border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Total Earned</span>
                </div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  Rs {(user.totalEarned ?? 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white rounded-full py-2.5 px-5 text-xs font-semibold text-slate-800 shadow-xs border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nickname / Handle</label>
                <input
                  type="text"
                  value={editNickname.replace(/^@+/, '')}
                  onChange={(e) => setEditNickname(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
                  className="w-full bg-white rounded-full py-2.5 px-5 text-xs font-semibold text-slate-800 shadow-xs border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              {profileSuccessMsg && (
                <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-full bg-gradient-to-r from-[#1b0036] to-[#3a0a59] text-white text-xs font-bold shadow-md hover:brightness-110 cursor-pointer"
                >
                  Save Profile Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="py-2.5 px-4 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] p-7 shadow-2xl border border-slate-200 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Sign In with Google</h3>
              <p className="text-xs text-slate-500 mt-1">
                Verified Google identity protects your private wallet, payouts, and company subscription.
              </p>
            </div>
            {authError && <AuthErrorNotice message={authError} variant="light" />}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in with Google...</span>
                </>
              ) : (
                <span>Continue with Google</span>
              )}
            </button>
          </div>
        )}
      </div>

      {showFullProfileModal && (
        <UserProfileComponent
          user={user}
          onUpdateUser={onUpdateUser}
          isOpen={showFullProfileModal}
          onClose={() => setShowFullProfileModal(false)}
        />
      )}
    </div>
  );
};
