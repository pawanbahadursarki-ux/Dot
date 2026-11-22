import React from 'react';
import { 
  Smartphone, Building2, ShieldCheck, Wallet, Maximize2, Minimize2, 
  Type, LogIn, Sparkles, BarChart3, Users, Lock, LogOut
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
  currentScreen = 'home',
  onSwitchView,
  onNavigateScreen,
  onNavigate,
  user,
  onOpenAuth,
  onLogout,
  deviceFrameMode,
  onToggleDeviceFrame,
  textSize,
  onCycleTextSize,
  isAdminUnlocked = false,
}) => {
  // Unified navigation helper
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

  const isCompany = currentView === 'company';
  const isCustomer = currentView === 'customer';
  const isAdmin = currentView === 'admin';

  const isAdminUser = Boolean(isAdminUnlocked || user?.role === 'company_admin');
  const lockedMode = user?.isLoggedIn && !isAdminUser ? user.accountMode : undefined;
  const canAccessCompany = !lockedMode || lockedMode === 'company';
  const canAccessCustomer = !lockedMode || lockedMode === 'customer';
  const canAccessAdmin = !user?.isLoggedIn || isAdminUser;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      
      {/* =========================================================
          MAIN CLEAN NAV BAR (SINGLE ROW - SLEEK & SIMPLE)
          ========================================================= */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
        
        {/* Left: Brand Identity */}
        <div 
          onClick={() => handleJump(lockedMode === 'customer' ? 'customer' : 'company')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none group"
          title="Dot Platform"
        >
          <DotLogo size="md" variant="gradient" className="group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="font-black text-slate-900 text-sm sm:text-base leading-none tracking-tight">
              Dot
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              SaaS Video Insights
            </span>
          </div>
        </div>

        {/* Center: Clean Segmented Mode Switcher (Strictly enforces 1 Gmail = 1 Portal Access) */}
        <nav className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-inner gap-1">
          
          {/* 1. Company Dashboard */}
          {canAccessCompany && (
            <button
              type="button"
              onClick={() => handleJump('company')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isCompany
                  ? 'bg-slate-900 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="Company Dashboard: Board SaaS chart, AI cart, and video reviews"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Company Dashboard</span>
            </button>
          )}

          {/* 2. Consumer App */}
          {canAccessCustomer && (
            <button
              type="button"
              onClick={() => handleJump('customer', 'home')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isCustomer
                  ? 'bg-blue-600 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="Consumer App: Pick phone, record video, and earn rewards"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-300" />
              <span>Consumer App</span>
            </button>
          )}

          {/* 3. User Provisions & Admin */}
          {canAccessAdmin && (
            <button
              type="button"
              onClick={() => handleJump('admin')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isAdmin
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="Admin & User Provisions: User directory, moderation, payouts"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">User Provisions & Admin</span>
              <span className="sm:hidden">Provisions</span>
            </button>
          )}

          {/* Single-account lock indicator + Switch Gmail option */}
          {lockedMode && (
            <div className="hidden md:flex items-center gap-1.5 pl-2 pr-1 text-[10px] font-mono font-bold text-slate-600">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>1 Gmail = {lockedMode === 'company' ? 'Company Only' : 'Customer Only'}</span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 px-2 py-0.5 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                  title="Sign out to switch to a different Google account"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  <span>Switch</span>
                </button>
              )}
            </div>
          )}

        </nav>

        {/* Right: Quick Controls & Profile */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Text size button for accessibility */}
          <button
            type="button"
            onClick={onCycleTextSize}
            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
            title={`Text size: ${textSize}`}
          >
            <Type className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden lg:inline">{textSize}</span>
          </button>

          {/* Frame toggle for consumer app */}
          {isCustomer && (
            <button
              type="button"
              onClick={onToggleDeviceFrame}
              className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              title={deviceFrameMode ? 'Switch to Full Width' : 'Switch to Phone Simulator'}
            >
              {deviceFrameMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline">{deviceFrameMode ? 'Phone' : 'Full'}</span>
            </button>
          )}

          {/* Balance badge (customer-accessible only) */}
          {user?.isLoggedIn && canAccessCustomer && (
            <button
              type="button"
              onClick={() => handleJump('customer', 'wallet')}
              className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Wallet Balance"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rs. {(user?.walletBalance ?? 0).toLocaleString('en-IN')}</span>
            </button>
          )}

          {/* User profile / login avatar */}
          {user?.isLoggedIn ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 cursor-pointer transition-colors"
              title="Account Settings"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name || 'User'} className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {(user?.name || 'Pawan').charAt(0)}
                </div>
              )}
              <span className="hidden xl:inline text-xs font-bold text-slate-800 max-w-[80px] truncate">
                {(user?.name || 'User').split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleJump('login')}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

        </div>

      </div>

    </header>
  );
};
