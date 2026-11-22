import React, { useState } from 'react';
import {
  Bell, Mail, AlertTriangle, ShieldCheck, CheckCircle2,
  Send, Save, RefreshCw, Sliders, Flame,
  Sparkles, X, Check
} from 'lucide-react';
import { UserProfile, FeedbackItem } from '../types';

export interface CompanyAlertConfig {
  emailEnabled: boolean;
  adminEmail: string;
  secondaryEmails: string;
  notifyOnNegativeReview: boolean;
  negativeStarThreshold: number; // 1 or 2
  notifyOnLowSentiment: boolean;
  minSentimentThreshold: number; // 20 to 60
  notifyOnModerationFlags: boolean;
  notifyOnVipUsers: boolean;
  frequency: 'instant' | 'hourly' | 'daily';
  includeVideoTranscript: boolean;
  lastUpdated?: string;
}

const DEFAULT_CONFIG: CompanyAlertConfig = {
  emailEnabled: true,
  adminEmail: '',
  secondaryEmails: '',
  notifyOnNegativeReview: true,
  negativeStarThreshold: 2,
  notifyOnLowSentiment: true,
  minSentimentThreshold: 50,
  notifyOnModerationFlags: true,
  notifyOnVipUsers: true,
  frequency: 'instant',
  includeVideoTranscript: true,
  lastUpdated: new Date().toISOString(),
};

interface CompanyNotificationSettingsProps {
  currentUser?: UserProfile;
  feedbackList?: FeedbackItem[];
  onNavigateToModeration?: () => void;
}

export const CompanyNotificationSettings: React.FC<CompanyNotificationSettingsProps> = ({
  currentUser,
  feedbackList = [],
  onNavigateToModeration,
}) => {
  const [config, setConfig] = useState<CompanyAlertConfig>(() => ({
    ...DEFAULT_CONFIG,
    adminEmail: currentUser?.email || '',
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmailData, setTestEmailData] = useState<any>(null);
  const [activePreset, setActivePreset] = useState<'strict' | 'standard' | 'minimal'>('standard');

  // Quick preset application
  const applyPreset = (preset: 'strict' | 'standard' | 'minimal') => {
    setActivePreset(preset);
    if (preset === 'strict') {
      setConfig((prev) => ({
        ...prev,
        emailEnabled: true,
        notifyOnNegativeReview: true,
        negativeStarThreshold: 3,
        notifyOnLowSentiment: true,
        minSentimentThreshold: 60,
        notifyOnModerationFlags: true,
        notifyOnVipUsers: true,
        frequency: 'instant',
      }));
    } else if (preset === 'standard') {
      setConfig((prev) => ({
        ...prev,
        emailEnabled: true,
        notifyOnNegativeReview: true,
        negativeStarThreshold: 2,
        notifyOnLowSentiment: true,
        minSentimentThreshold: 50,
        notifyOnModerationFlags: true,
        notifyOnVipUsers: true,
        frequency: 'instant',
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        emailEnabled: true,
        notifyOnNegativeReview: true,
        negativeStarThreshold: 1,
        notifyOnLowSentiment: true,
        minSentimentThreshold: 35,
        notifyOnModerationFlags: true,
        notifyOnVipUsers: false,
        frequency: 'hourly',
      }));
    }
  };

  // Save handler (session preference state)
  const handleSave = async () => {
    setIsSaving(true);
    const updated = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };
    setConfig(updated);

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 250);
  };

  // Preview alert email from latest real Firestore feedback (if present)
  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    const flaggedSample =
      feedbackList.find(
        (f) => f.rating <= config.negativeStarThreshold || (f.sentimentScore ?? 100) < config.minSentimentThreshold
      ) || feedbackList[0];

    if (flaggedSample) {
      setTestEmailData({
        to: config.adminEmail || currentUser?.email || 'No admin email set',
        subject: `Alert: ${flaggedSample.rating}★ Review on ${flaggedSample.phoneName || flaggedSample.phone}`,
        reviewer: flaggedSample.user,
        city: flaggedSample.city || 'Verified Location',
        phone: flaggedSample.phoneName || flaggedSample.phone,
        sentimentScore: flaggedSample.sentimentScore ?? Math.round((flaggedSample.rating || 0) * 20),
        rating: flaggedSample.rating,
        dislikeQuote: flaggedSample.dislike || flaggedSample.improve || 'No defect quote recorded.',
        seconds: flaggedSample.seconds || 0,
        rewardAmount: flaggedSample.rewardAmount || 0,
      });
    } else {
      setTestEmailData({
        to: config.adminEmail || currentUser?.email || 'No admin email set',
        subject: `Threshold Alert Preview (≤${config.negativeStarThreshold}★ or <${config.minSentimentThreshold}% sentiment)`,
        reviewer: currentUser?.name || 'Company Admin',
        city: currentUser?.city || 'Verified Account',
        phone: 'No device feedback submitted yet',
        sentimentScore: 0,
        rating: 0,
        dislikeQuote: 'No negative feedback alerts triggered yet. Real alerts will populate here when matching reviews arrive.',
        seconds: 0,
        rewardAmount: 0,
      });
    }
    setTestModalOpen(true);
    setIsSendingTest(false);
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-8 max-w-6xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black tracking-wide uppercase mb-3">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            Enterprise Alert System
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            High-Priority Email Notification Engine
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Automatically dispatch real-time email notifications to company product managers and hardware QA teams whenever customers submit negative reviews (1★ & 2★), low sentiment scores, or safety defects.
          </p>
        </div>

        {/* Master Toggle Card */}
        <div className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
          config.emailEnabled
            ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-200'
            : 'bg-slate-100 border-slate-300 opacity-80'
        }`}>
          <div>
            <div className="text-xs font-black text-slate-900">
              {config.emailEnabled ? '⚡ Alerts Active' : '⏸️ Alerts Paused'}
            </div>
            <div className="text-[11px] text-slate-600">
              {config.emailEnabled ? 'Dispatching on high priority' : 'No emails will be sent'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfig((p) => ({ ...p, emailEnabled: !p.emailEnabled }))}
            className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer focus:outline-hidden ${
              config.emailEnabled ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-transform shadow-md flex items-center justify-center ${
                config.emailEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            >
              {config.emailEnabled ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-400 stroke-[3]" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Main Grid: Settings & Triggers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Notification Triggers & Thresholds */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Presets */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Quick Escalation Presets</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">1-click configuration</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => applyPreset('strict')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  activePreset === 'strict'
                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="text-xs font-black text-rose-700">Strict & Ultra-Sensitive</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Alerts on ≤3★, &lt;60% sentiment</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  activePreset === 'standard'
                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="text-xs font-black text-blue-700">Standard Enterprise (Rec.)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Alerts on ≤2★, &lt;50% sentiment</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('minimal')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  activePreset === 'minimal'
                    ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="text-xs font-black text-amber-700">Critical Only</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Alerts on 1★ only, &lt;35% sentiment</div>
              </button>
            </div>
          </div>

          {/* Trigger 1: Negative Star Reviews */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Negative Customer Reviews (1★ & 2★ Submissions)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Instantly trigger an email alert whenever an authentic customer awards poor star ratings on any smartphone.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.notifyOnNegativeReview}
                onChange={(e) => setConfig((p) => ({ ...p, notifyOnNegativeReview: e.target.checked }))}
                className="w-5 h-5 accent-rose-600 rounded cursor-pointer mt-1"
              />
            </div>

            {config.notifyOnNegativeReview && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs font-bold text-slate-700">Rating Threshold for Alert:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, negativeStarThreshold: 1 }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      config.negativeStarThreshold === 1
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    1 Star Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, negativeStarThreshold: 2 }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      config.negativeStarThreshold === 2
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    1 & 2 Stars (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, negativeStarThreshold: 3 }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      config.negativeStarThreshold === 3
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    ≤ 3 Stars (All Critical)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trigger 2: Low Gemini Sentiment Score */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Low Gemini Sentiment Score Alert (&lt; {config.minSentimentThreshold}%)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Trigger alert when the video transcript or facial tone reveals user dissatisfaction, even if they gave average stars.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.notifyOnLowSentiment}
                onChange={(e) => setConfig((p) => ({ ...p, notifyOnLowSentiment: e.target.checked }))}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer mt-1"
              />
            </div>

            {config.notifyOnLowSentiment && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>Sentiment Threshold:</span>
                  <span className="text-amber-600 font-black font-mono">
                    Below {config.minSentimentThreshold}% (Dissatisfied)
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="65"
                  step="5"
                  value={config.minSentimentThreshold}
                  onChange={(e) => setConfig((p) => ({ ...p, minSentimentThreshold: Number(e.target.value) }))}
                  className="w-full accent-amber-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1">
                  <span>20% (Severe Anger)</span>
                  <span>40% (Strong Dislike)</span>
                  <span>50% (Standard)</span>
                  <span>65% (Mildly Unhappy)</span>
                </div>
              </div>
            )}
          </div>

          {/* Trigger 3: Hardware Moderation & Defect Flags */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Safety, Battery Swelling & Hardware Defect Flags
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Immediate notification when video mentions smoke, heating during charging, screen green lines, or physical defects.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.notifyOnModerationFlags}
                onChange={(e) => setConfig((p) => ({ ...p, notifyOnModerationFlags: e.target.checked }))}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer mt-1"
              />
            </div>
          </div>

          {/* Trigger 4: VIP & Verified Hardware Submissions */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    100% Verified Hardware Identity Submissions
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Prioritize alerts for submissions that pass hardware auto-verification (🔒 Verified Device) with genuine customer identity.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.notifyOnVipUsers}
                onChange={(e) => setConfig((p) => ({ ...p, notifyOnVipUsers: e.target.checked }))}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Email Routing & Test Dispatcher */}
        <div className="space-y-6">
          {/* Recipient Details Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Email Dispatch Routing</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Admin Email:
                </label>
                <input
                  type="email"
                  value={config.adminEmail}
                  onChange={(e) => setConfig((p) => ({ ...p, adminEmail: e.target.value }))}
                  placeholder="admin@brand.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Receives instant urgent alerts with direct moderation link.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CC Secondary Emails (Optional):
                </label>
                <textarea
                  rows={2}
                  value={config.secondaryEmails}
                  onChange={(e) => setConfig((p) => ({ ...p, secondaryEmails: e.target.value }))}
                  placeholder="qa@brand.com, support@brand.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Separate multiple emails with commas.
                </span>
              </div>

              {/* Delivery Frequency */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Notification Schedule:
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'instant', title: 'Instant Real-Time (Recommended)', desc: 'Sent within 30s of video submission' },
                    { id: 'hourly', title: 'Hourly Batch Digest', desc: 'Bundles negative reviews once every hour' },
                    { id: 'daily', title: 'Daily Executive Digest', desc: 'Summary report at 09:00 AM daily' },
                  ].map((freq) => (
                    <label
                      key={freq.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        config.frequency === freq.id
                          ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="frequency"
                        checked={config.frequency === freq.id}
                        onChange={() => setConfig((p) => ({ ...p, frequency: freq.id as any }))}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{freq.title}</div>
                        <div className="text-[10px] text-slate-500">{freq.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Include Video Transcript */}
              <label className="flex items-center gap-2 pt-2 border-t border-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeVideoTranscript}
                  onChange={(e) => setConfig((p) => ({ ...p, includeVideoTranscript: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Attach AI speech-to-text transcript in email body
                </span>
              </label>
            </div>
          </div>

          {/* Action CTAs: Save & Live Test */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Settings Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Notification Preferences</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-300"
            >
              {isSendingTest ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                  <span>Generating Alert Dispatch...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-rose-600" />
                  <span>Send Test High-Priority Email</span>
                </>
              )}
            </button>

            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-medium">
                Last updated:{' '}
                {config.lastUpdated
                  ? new Date(config.lastUpdated).toLocaleDateString() + ' ' + new Date(config.lastUpdated).toLocaleTimeString()
                  : 'Default'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          LIVE SIMULATED EMAIL DISPATCH MODAL
          ========================================================= */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black">Email Client Dispatch Preview</div>
                  <div className="text-[10px] text-slate-400">dot High-Priority Notification Delivery</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Email Client Envelope */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 space-y-1 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 w-16">From:</span>
                <span className="text-slate-900 font-mono">alerts@dot.app</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 w-16">To:</span>
                <span className="text-blue-700 font-mono font-semibold">{testEmailData?.to || config.adminEmail || 'Not configured'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 w-16">Subject:</span>
                <span className="text-rose-700 font-black">{testEmailData?.subject || 'Alert Threshold Preview'}</span>
              </div>
            </div>

            {/* Email Body Preview (Enterprise Format) */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="border border-rose-200 bg-rose-50/60 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                    NEGATIVE FEEDBACK ALERT RULE
                  </span>
                  <div className="text-xs font-bold text-rose-950 mt-1">
                    Triggered when rating ≤ {config.negativeStarThreshold}★ or sentiment &lt; {config.minSentimentThreshold}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-rose-600 font-mono">{testEmailData?.sentimentScore ?? 0}%</div>
                  <div className="text-[10px] font-bold text-rose-800">Sentiment</div>
                </div>
              </div>

              {/* Review Details Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {(testEmailData?.reviewer || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">{testEmailData?.reviewer || 'No reviewer yet'}</div>
                      <div className="text-[10px] text-slate-500">{testEmailData?.city || 'Location pending'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-500 text-sm font-black">
                      {testEmailData?.rating > 0 ? `${'★'.repeat(testEmailData.rating)}${'☆'.repeat(5 - testEmailData.rating)} (${testEmailData.rating}.0)` : 'No rating yet'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Model Under Review:
                  </div>
                  <div className="text-xs font-extrabold text-slate-900">
                    {testEmailData?.phone || 'None yet'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Customer Pain Point / Dislike:</span>
                  </div>
                  <p className="text-xs text-slate-800 italic leading-relaxed">
                    "{testEmailData?.dislikeQuote || 'No negative feedback alerts triggered yet.'}"
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Video Duration: {testEmailData?.seconds || 0}s</span>
                  <span>Payout: Rs {testEmailData?.rewardAmount || 0}</span>
                </div>
              </div>

              {/* Action Buttons in Email */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTestModalOpen(false);
                    if (onNavigateToModeration) onNavigateToModeration();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs text-center transition-all cursor-pointer shadow-sm"
                >
                  Open in Video Moderation Queue →
                </button>
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
