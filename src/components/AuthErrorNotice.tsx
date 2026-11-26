import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Copy, ExternalLink, RefreshCw, Rocket } from 'lucide-react';
import {
  AuthorizedDomainsStatus,
  fetchAuthorizedFirebaseDomains,
} from '../services/firebaseService';

interface AuthErrorNoticeProps {
  message: string;
  variant?: 'light' | 'dark';
  className?: string;
  onDomainAuthorized?: () => void;
  onUseGoogleSignIn?: () => void;
}

export const AuthErrorNotice: React.FC<AuthErrorNoticeProps> = ({
  message,
  variant = 'light',
  className = '',
  onDomainAuthorized,
  onUseGoogleSignIn,
}) => {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [domainStatus, setDomainStatus] = useState<AuthorizedDomainsStatus | null>(null);

  const safeMessage = (message || '').trim() || 'Authentication could not be completed. Please try again.';

  const isUnauthorizedDomain =
    /unauthorized-domain|not yet authorized in Firebase Authentication|Authorized domains/i.test(safeMessage);

  const isProviderDisabled =
    /Email\/Password sign-in is not yet enabled|operation-not-allowed|admin-restricted-operation|PASSWORD_LOGIN_DISABLED|ADMIN_ONLY_OPERATION/i.test(safeMessage);

  const isPopupBlocked =
    /popup was blocked|auth\/popup-blocked|cancelled-popup-request|embedded preview|restricts Google popups/i.test(safeMessage);

  const currentHost =
    (typeof window !== 'undefined' && window.location.hostname) || 'pawanbahadursarki-ux.github.io';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://pawanbahadursarki-ux.github.io/Dot/';

  const runLiveCheck = async () => {
    setChecking(true);
    try {
      const status = await fetchAuthorizedFirebaseDomains();
      setDomainStatus(status);
      if (status.isCurrentDomainAuthorized) {
        onDomainAuthorized?.();
      }
    } catch {
      // Keep UI resilient if offline
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isUnauthorizedDomain) {
      void runLiveCheck();
    }
  }, [isUnauthorizedDomain]);

  const handleCopyDomain = async () => {
    try {
      await navigator.clipboard?.writeText(currentHost);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  if (isPopupBlocked) {
    return (
      <div
        className={`p-3 rounded-xl text-xs space-y-2.5 text-left ${
          variant === 'dark'
            ? 'bg-amber-950/80 border border-amber-500/40 text-amber-100'
            : 'bg-amber-50 border border-amber-200 text-amber-950'
        } ${className}`}
      >
        <div className="flex items-start gap-2 font-semibold">
          <AlertCircle
            className={`w-4 h-4 shrink-0 mt-0.5 ${variant === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}
          />
          <span>{safeMessage}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#0b3b75] hover:bg-[#082d5c] text-white transition-colors"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Open Dot in New Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          {onUseGoogleSignIn && (
            <button
              type="button"
              onClick={onUseGoogleSignIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Google Popup</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isProviderDisabled) {
    return (
      <div
        className={`p-3 rounded-xl text-xs space-y-2 text-left ${
          variant === 'dark'
            ? 'bg-amber-950/80 border border-amber-500/40 text-amber-100'
            : 'bg-amber-50 border border-amber-200 text-amber-950'
        } ${className}`}
      >
        <div className="flex items-start gap-2 font-semibold">
          <AlertCircle
            className={`w-4 h-4 shrink-0 mt-0.5 ${variant === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}
          />
          <span>Email/Password sign-in is disabled in Firebase right now.</span>
        </div>
        <ol className={`list-decimal pl-5 space-y-1 text-[11px] leading-relaxed ${variant === 'dark' ? 'text-amber-200/90' : 'text-amber-900'}`}>
          <li>Use <b>Continue with Google</b> to pick your Gmail account immediately (no password needed).</li>
          <li>Or open <b>Firebase Sign-in Providers</b> below → select <b>Email/Password</b> → toggle <b>Enable</b> → click <b>Save</b>.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-2">
          {onUseGoogleSignIn && (
            <button
              type="button"
              onClick={onUseGoogleSignIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#0b3b75] hover:bg-[#082d5c] text-white transition-colors cursor-pointer"
            >
              <span>Sign in with Google Account</span>
            </button>
          )}
          <a
            href="https://console.firebase.google.com/project/gen-lang-client-0580095840/authentication/providers"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            <span>Open Firebase Sign-in Providers</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  if (!isUnauthorizedDomain) {
    return (
      <div
        className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 text-left ${
          variant === 'dark'
            ? 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        } ${className}`}
      >
        <AlertCircle
          className={`w-4 h-4 shrink-0 mt-0.5 ${variant === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}
        />
        <span>{safeMessage}</span>
      </div>
    );
  }

  const projectId = domainStatus?.projectId || 'gen-lang-client-0580095840';
  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
  const workingAppUrl = domainStatus?.authorizedAppUrl || null;
  const isGitHubPagesAuthorized = Boolean(
    domainStatus?.authorizedDomains?.some((d) => d.trim().toLowerCase() === 'pawanbahadursarki-ux.github.io')
  );
  const publicGitHubPagesUrl =
    isGitHubPagesAuthorized && currentHost.toLowerCase() !== 'pawanbahadursarki-ux.github.io'
      ? 'https://pawanbahadursarki-ux.github.io/Dot/'
      : null;

  if (domainStatus?.isCurrentDomainAuthorized) {
    return (
      <div
        className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 text-left ${
          variant === 'dark'
            ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
        } ${className}`}
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <span className="font-mono font-bold">{currentHost}</span> is now authorized! Click <b>Continue with Google</b> again.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-3.5 rounded-xl text-xs space-y-2.5 text-left ${
        variant === 'dark'
          ? 'bg-amber-950/80 border border-amber-500/40 text-amber-100'
          : 'bg-amber-50 border border-amber-200 text-amber-950'
      } ${className}`}
    >
      <div className="flex items-start gap-2 font-semibold">
        <AlertCircle
          className={`w-4 h-4 shrink-0 mt-0.5 ${variant === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}
        />
        <div className="min-w-0 flex-1">
          <div>
            Domain not yet saved on Firebase project <span className="font-mono font-bold">{projectId}</span>
            {domainStatus?.projectNumber ? (
              <span className="opacity-75 font-mono"> (#{domainStatus.projectNumber})</span>
            ) : null}
            :
          </div>
          <div
            className={`mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
              variant === 'dark' ? 'bg-white/10 text-amber-200' : 'bg-amber-200/60 text-amber-950'
            }`}
          >
            <span>{currentHost}</span>
          </div>
        </div>
      </div>

      <p className={`text-[11px] leading-relaxed ${variant === 'dark' ? 'text-amber-200/90' : 'text-amber-900/90'}`}>
        In Firebase Console under project <span className="font-mono font-bold">{projectId}</span>, open{' '}
        <b>Authentication → Settings → Authorized domains</b>, click <b>Add domain</b>, and enter{' '}
        <span className="font-mono font-bold">{currentHost}</span> (exact hostname only — do not include{' '}
        <code className="font-mono">https://</code> or a path like <code className="font-mono">/Dot</code>).
      </p>

      {domainStatus && domainStatus.authorizedDomains.length > 0 && (
        <div
          className={`p-2 rounded-lg text-[10px] font-mono space-y-1 ${
            variant === 'dark' ? 'bg-black/30 text-amber-200/90' : 'bg-white/80 text-slate-700 border border-amber-200/80'
          }`}
        >
          <div className="font-sans font-bold uppercase tracking-wider opacity-75">
            Live Authorized Domains on {projectId}:
          </div>
          <div className="break-all leading-relaxed">
            {domainStatus.authorizedDomains.join(', ')}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        {workingAppUrl && (
          <a
            href={workingAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Open Working Authorized App</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {publicGitHubPagesUrl && (
          <a
            href={publicGitHubPagesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Open Public GitHub Pages App</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        <button
          type="button"
          onClick={handleCopyDomain}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
            variant === 'dark'
              ? 'bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-500/30'
              : 'bg-white hover:bg-amber-100/70 text-amber-950 border border-amber-300'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Domain Copied' : `Copy "${currentHost}"`}</span>
        </button>

        <a
          href={firebaseAuthSettingsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
        >
          <span>Open Firebase Settings</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <button
          type="button"
          onClick={runLiveCheck}
          disabled={checking}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-60 ${
            variant === 'dark'
              ? 'bg-amber-900/50 hover:bg-amber-800 text-amber-100 border border-amber-500/30'
              : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? 'Checking...' : 'Re-check Firebase'}</span>
        </button>
      </div>
    </div>
  );
};
