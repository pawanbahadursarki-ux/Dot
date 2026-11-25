import React from 'react';
import {
  Smartphone,
  ShieldCheck,
  Wallet,
  Maximize2,
  Minimize2,
  Type,
  LogIn,
  BarChart3,
} from 'lucide-react';
import { UserProfile } from '../types';
import { DotLogo } from './DotLogo';

export interface HeaderProps {
  currentView: 'customer' | 'company' | 'login' | 'admin' | 'dual';
  currentScreen?: string;
  onSwitchView: (view: 'customer' | 'company' | 'login' | 'admin' | 'dual') => void;
  onNavigateScreen?: (screen: string) => void;
  onNavigate?: (target: { view: 'customer' | 'company' | 'login' | 'admin' | 'dual'; screen?: string }) => void;
  user: UserProfile;
  onOpenAuth: () => void;
  onOpenRegister?: () => void;
  onLogout?: () => void;
  onOpenWallet: () => void;
  deviceFrameMode: boolean;
  onToggleDeviceFrame: () => void;
  textSize: string;
  onCycleTextSize: () => void;
  onOpenHappyFaces?: () => void;
  onOpenSubscriptionModal?: () => void;
  isAdminUnlocked?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSwitchView,
  onNavigateScreen,
  onNavigate,
  user,
  onOpenAuth,
  deviceFrameMode,
  onToggleDeviceFrame,
  textSize,
  onCycleTextSize,
  isAdminUnlocked = false,
}) => {
  const handleJump = (targetView: 'customer' | 'company' | 'login' | 'admin', targetScreen?: string) => {
    if (onNavigate) {
      onNavigate({ view: targetView, screen: targetScreen });
    } else {
      onSwitchView(targetView);
      if (targetScreen && onNavigateScreen) {
        onNavigateScreen(targetScreen);
      }
    }
  };

  // Before login: do not display Users / Company / Admin bar at top on Login screen
  if (!user?.isLoggedIn && currentView !== 'admin') {
    return null;
  }

  // Before login on Admin gate: show only minimal brand + back to Sign In
  if (!user?.isLoggedIn && currentView === 'admin') {
    return (
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-12 sm:h-13 flex items-center justify-between gap-2">
          <div
            onClick={() => handleJump('login')}
            className="flex items-center gap-2 cursor-pointer shrink-0 select-none"
            title="Dot Platform"
          >
            <DotLogo size="md" variant="gradient" />
            <span className="font-black text-white text-sm sm:text-base leading-none tracking-tight whitespace-nowrap">
              Dot
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleJump('login')}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </header>
    );
  }

  const isCompany = currentView === 'company';
  const isCustomer = currentView === 'customer';
  const isAdmin = currentView === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-12 sm:h-13 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Brand Identity */}
        <div
          onClick={() => handleJump('company')}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 select-none group"
          title="Dot Platform"
        >
          <DotLogo size="sm" variant="gradient" className="group-hover:scale-105 transition-transform sm:scale-110" />
          <span className="font-black text-slate-900 text-sm sm:text-base leading-none tracking-tight whitespace-nowrap">
            Dot
          </span>
        </div>

        {/* Center: One-Tap Role Switcher (Users / Company, plus Admin ONLY when authenticated as admin) */}
        <nav
          aria-label="Workspace mode"
          className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80 gap-0.5 min-w-0 overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            onClick={() => handleJump('customer', 'home')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              isCustomer
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
            title="Users & Consumer App"
          >
            <Smartphone className={`hidden sm:block w-3.5 h-3.5 shrink-0 ${isCustomer ? 'text-blue-200' : 'text-blue-500'}`} />
            <span>Users</span>
          </button>

          <button
            type="button"
            onClick={() => handleJump('company')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              isCompany
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
            title="Company Dashboard"
          >
            <BarChart3 className={`hidden sm:block w-3.5 h-3.5 shrink-0 ${isCompany ? 'text-indigo-300' : 'text-indigo-500'}`} />
            <span>Company</span>
          </button>

          {isAdminUnlocked && (
            <button
              type="button"
              onClick={() => handleJump('admin')}
              className={`px-2 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                isAdmin
                  ? 'bg-amber-500 text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
              title="Admin Console"
            >
              <ShieldCheck className={`hidden sm:block w-3.5 h-3.5 shrink-0 ${isAdmin ? 'text-slate-950' : 'text-amber-500'}`} />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Right: Quick Controls & Compact Wallet + User Badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onCycleTextSize}
            className="hidden md:flex p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-[11px] items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            title={`Text size: ${textSize}`}
          >
            <Type className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden lg:inline">{textSize}</span>
          </button>

          {isCustomer && (
            <button
              type="button"
              onClick={onToggleDeviceFrame}
              className="hidden md:flex p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-[11px] items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
              title={deviceFrameMode ? 'Switch to Full Width' : 'Switch to Phone Simulator'}
            >
              {deviceFrameMode ? <Maximize2 className="w-3.5 h-3.5 shrink-0" /> : <Minimize2 className="w-3.5 h-3.5 shrink-0" />}
              <span className="hidden lg:inline">{deviceFrameMode ? 'Phone' : 'Full'}</span>
            </button>
          )}

          {user?.isLoggedIn && (
            <button
              type="button"
              onClick={() => handleJump('customer', 'wallet')}
              className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-bold font-mono tabular-nums transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
              title="Wallet Balance"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Rs. {(user?.walletBalance ?? 0).toLocaleString('en-IN')}</span>
            </button>
          )}

          {user?.isLoggedIn ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 p-0.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 cursor-pointer transition-colors shrink-0"
              title="Account Settings"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name || 'User'} className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden xl:inline text-xs font-bold text-slate-800 max-w-[80px] truncate pr-1">
                {(user?.name || 'User').split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleJump('login')}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

