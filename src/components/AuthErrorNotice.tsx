import React, { useState } from 'react';
import { AlertCircle, Check, Copy, ExternalLink } from 'lucide-react';

interface AuthErrorNoticeProps {
  message: string;
  variant?: 'light' | 'dark';
  className?: string;
}

const FIREBASE_AUTH_SETTINGS_URL =
  'https://console.firebase.google.com/project/gen-lang-client-0580095840/authentication/settings';

export const AuthErrorNotice: React.FC<AuthErrorNoticeProps> = ({
  message,
  variant = 'light',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const isUnauthorizedDomain =
    /unauthorized-domain|not yet authorized in Firebase Authentication|Authorized domains/i.test(message);

  const currentHost =
    (typeof window !== 'undefined' && window.location.hostname) || 'pawanbahadursarki-ux.github.io';

  const handleCopyDomain = async () => {
    try {
      await navigator.clipboard?.writeText(currentHost);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard permission errors
    }
  };

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
        <span>{message}</span>
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
        <div>
          <div>Firebase Auth requires this domain to be allowlisted:</div>
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
        Firebase Console project owners must add <span className="font-mono font-bold">{currentHost}</span> under{' '}
        <b>Authentication → Settings → Authorized domains</b>.
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
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
          href={FIREBASE_AUTH_SETTINGS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
        >
          <span>Open Firebase Authorized Domains</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
