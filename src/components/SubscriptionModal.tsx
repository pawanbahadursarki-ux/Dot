import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  X, Check, Sparkles, Building2, Shield, Zap, Lock, Unlock, 
  Smartphone, Play, CreditCard, Award, ArrowRight, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { SubscriptionTier, BrandCategoryPass, UserProfile, PaymentOrderRecord } from '../types';
import { SUBSCRIPTION_PLANS, BRAND_CATEGORY_PASSES } from '../data/initialData';

const PaymentCheckoutModal = lazy(() =>
  import('./PaymentCheckoutModal').then((m) => ({ default: m.PaymentCheckoutModal }))
);

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlan: SubscriptionTier;
  onSelectPlan: (plan: SubscriptionTier) => void;
  initialBrandTarget?: string;
  user?: UserProfile;
  paymentOrders?: PaymentOrderRecord[];
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  activePlan,
  onSelectPlan,
  initialBrandTarget,
  user,
  paymentOrders = [],
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const resolveBrandId = (raw?: string): string => {
    const b = (raw || '').toLowerCase();
    if (!b || b === 'all') return '';
    if (b.includes('apple') || b.includes('iphone')) return 'apple';
    if (b.includes('samsung') || b.includes('galaxy')) return 'samsung';
    if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco')) return 'xiaomi';
    if (b.includes('vivo') || b.includes('iqoo')) return 'vivo';
    if (b.includes('oneplus')) return 'oneplus';
    if (b.includes('google') || b.includes('pixel')) return 'google';
    return '';
  };

  const [selectedBrandPass, setSelectedBrandPass] = useState<string>(() => {
    return (
      resolveBrandId(initialBrandTarget) ||
      resolveBrandId(activePlan?.targetCategory) ||
      resolveBrandId(user?.unlockedBrandFolders?.[0]) ||
      'samsung'
    );
  });

  // Sync when initialBrandTarget changes or modal reopens
  useEffect(() => {
    const nextBrand =
      resolveBrandId(initialBrandTarget) ||
      resolveBrandId(activePlan?.targetCategory) ||
      resolveBrandId(user?.unlockedBrandFolders?.[0]);
    if (nextBrand) {
      setSelectedBrandPass(nextBrand);
    }
  }, [initialBrandTarget, activePlan?.targetCategory, user?.unlockedBrandFolders, isOpen]);

  // State for opening payment checkout modal
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionTier | null>(null);

  if (!isOpen) return null;

  const currentBrandPassInfo = BRAND_CATEGORY_PASSES.find((p) => p.brandId === selectedBrandPass) || BRAND_CATEGORY_PASSES[0];
  const existingBrandId = resolveBrandId(activePlan?.targetCategory) || resolveBrandId(user?.unlockedBrandFolders?.[0]);
  const existingBrandInfo = existingBrandId ? BRAND_CATEGORY_PASSES.find((p) => p.brandId === existingBrandId) : null;
  const isSwitchingBrand = Boolean(existingBrandId && existingBrandId !== currentBrandPassInfo.brandId && (activePlan?.priceUSD || 0) > 0);

  // Pricing details based on billing cycle
  const basicPrice = billingCycle === 'yearly' ? '11.99' : '15.99';
  const standardPrice = billingCycle === 'yearly' ? '19.99' : '25.99';
  const premiumPrice = billingCycle === 'yearly' ? '27.99' : '35.99';
  const basicNPR = Math.round(Number(basicPrice) * 135).toLocaleString('en-IN');
  const standardNPR = Math.round(Number(standardPrice) * 135).toLocaleString('en-IN');
  const premiumNPR = Math.round(Number(premiumPrice) * 135).toLocaleString('en-IN');

  const handleOpenBuy = (tierId: 'basic' | 'standard' | 'premium') => {
    let targetPlan: SubscriptionTier;

    if (tierId === 'basic') {
      const singlePlanTemplate = SUBSCRIPTION_PLANS.find((p) => p.id === 'single_category') || SUBSCRIPTION_PLANS[0];
      targetPlan = {
        ...singlePlanTemplate,
        name: `Single Brand Starter (${currentBrandPassInfo.brandName})`,
        priceUSD: billingCycle === 'yearly' ? 11.99 : 15.99,
        reviewQuota: billingCycle === 'yearly' ? 200 : 150,
        targetCategory: currentBrandPassInfo.brandId,
        categoryName: currentBrandPassInfo.brandName,
        unlockedCategories: [currentBrandPassInfo.brandId],
        features: [
          `Unlocks verified video reviews ONLY for ${currentBrandPassInfo.brandName}`,
          `${billingCycle === 'yearly' ? '200' : '150'} 1-Minute Video Reviews / month`,
          'Playable video player with speech transcript',
          'Gemini AI defect & sentiment analysis',
          'Standard customer cart & export access',
        ],
      };
    } else if (tierId === 'standard') {
      const growthPlan = SUBSCRIPTION_PLANS.find((p) => p.id === 'growth') || SUBSCRIPTION_PLANS[1];
      targetPlan = {
        ...growthPlan,
        name: `Single Brand Pro (${currentBrandPassInfo.brandName})`,
        priceUSD: billingCycle === 'yearly' ? 19.99 : 25.99,
        reviewQuota: billingCycle === 'yearly' ? 600 : 500,
        targetCategory: currentBrandPassInfo.brandId,
        categoryName: currentBrandPassInfo.brandName,
        unlockedCategories: [currentBrandPassInfo.brandId],
        features: [
          `Unlocks all models under ${currentBrandPassInfo.brandName} only`,
          `${billingCycle === 'yearly' ? '600' : '500'} Verified Video Reviews / month`,
          'Direct 1-on-1 customer chat & feedback reply',
          'AI Defect Synthesis & Sentiment Intelligence',
          `Export verified ${currentBrandPassInfo.brandName} records to CSV`,
        ],
      };
    } else {
      const entPlan = SUBSCRIPTION_PLANS.find((p) => p.id === 'enterprise') || SUBSCRIPTION_PLANS[2];
      targetPlan = {
        ...entPlan,
        name: `Single Brand Unlimited (${currentBrandPassInfo.brandName})`,
        priceUSD: billingCycle === 'yearly' ? 27.99 : 35.99,
        reviewQuota: 999999,
        targetCategory: currentBrandPassInfo.brandId,
        categoryName: currentBrandPassInfo.brandName,
        unlockedCategories: [currentBrandPassInfo.brandId],
        features: [
          `Unlimited Video Reviews for ${currentBrandPassInfo.brandName} models`,
          'Instant AI Hardware Defect Roadmap',
          'Dedicated 24/7 account support & VIP SLA',
          `Full ${currentBrandPassInfo.brandName} CSV downloads with raw analytics`,
          'Switching to any other brand requires purchasing a new subscription',
        ],
      };
    }

    setCheckoutPlan(targetPlan);
  };

  const handlePaymentSuccess = (confirmedPlan: SubscriptionTier) => {
    onSelectPlan(confirmedPlan);
    setCheckoutPlan(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden max-h-[92vh] overflow-y-auto">
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header: Clean & Simple */}
          <div className="text-center max-w-xl mx-auto mb-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full inline-block mb-2">
              dot Business Plans
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Select Your Feedback Subscription
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Access real 1-minute customer video reviews, defect roadmaps, and AI sentiment analysis.
            </p>

            {/* Billing Cycle Switcher */}
            <div className="mt-3.5 inline-flex p-1 rounded-full bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500 text-white rounded-full font-bold">
                  Save 30%
                </span>
              </button>
            </div>
          </div>

          {/* Category Selector for Single Brand Pass */}
          <div className="mb-3 max-w-md mx-auto p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block leading-none">Active Mobile Brand Target:</span>
                <span className="text-xs font-bold text-slate-900">{currentBrandPassInfo.brandName}</span>
              </div>
            </div>
            <select
              value={selectedBrandPass}
              onChange={(e) => setSelectedBrandPass(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-white py-1 px-2.5 rounded-xl border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {BRAND_CATEGORY_PASSES.map((b) => (
                <option key={b.brandId} value={b.brandId}>
                  {b.iconEmoji} {b.brandName}
                </option>
              ))}
            </select>
          </div>

          <div className={`mb-5 max-w-2xl mx-auto px-3.5 py-2.5 rounded-xl border text-xs flex items-center gap-2 ${
            isSwitchingBrand
              ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
              : 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-medium'
          }`}>
            <Lock className={`w-4 h-4 shrink-0 ${isSwitchingBrand ? 'text-amber-600' : 'text-indigo-600'}`} />
            <span>
              {isSwitchingBrand
                ? `1 Subscription = 1 Brand Policy: Buying ${currentBrandPassInfo.brandName} will switch your active access away from ${existingBrandInfo?.brandName || existingBrandId}. Other brands remain locked unless you buy a subscription for them.`
                : `One Time, One Subscription: Each subscription unlocks ONLY ${currentBrandPassInfo.brandName} models. To inspect another brand (e.g., iPhone, Pixel, Xiaomi), purchase a subscription for that brand.`}
            </span>
          </div>

          {/* 3 Streamlined Single-Brand Subscription Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
            
            {/* Card 1: Basic (Single Brand Starter) */}
            <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-700">Brand Starter</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    1 Brand Only
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">NPR {basicNPR}</span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mb-2">
                  (${basicPrice} USD{billingCycle === 'yearly' ? ' · billed annually' : ''})
                </div>
                <p className="text-[11px] text-slate-600 mb-3">
                  Unlocks feedback strictly for <b>{currentBrandPassInfo.brandName}</b>.
                </p>

                <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-200">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><b>{currentBrandPassInfo.brandName}</b> all models only</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{billingCycle === 'yearly' ? '200' : '150'} verified video reviews/mo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Customer speech transcript & stars</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Instant Gemini AI sentiment score</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleOpenBuy('basic')}
                className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Buy {currentBrandPassInfo.brandName} Starter</span>
              </button>
            </div>

            {/* Card 2: Standard (Single Brand Pro - Popular) */}
            <div className="bg-white rounded-2xl p-4 border-2 border-indigo-600 flex flex-col justify-between shadow-md relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wide shadow-xs">
                ★ Most Popular
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 pt-1">
                  <span className="text-xs font-black text-indigo-700">{currentBrandPassInfo.brandName} Pro</span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    1 Brand Only
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">NPR {standardNPR}</span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                </div>
                <div className="text-[11px] font-semibold text-indigo-600 mb-2">
                  (${standardPrice} USD{billingCycle === 'yearly' ? ' · billed annually' : ''})
                </div>
                <p className="text-[11px] text-slate-600 mb-3">
                  High-volume intelligence strictly for <b>{currentBrandPassInfo.brandName}</b> models.
                </p>

                <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><b>{currentBrandPassInfo.brandName} unlocked</b> (1 brand per plan)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><b>{billingCycle === 'yearly' ? '600' : '500'} video reviews/mo</b></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><b>1-on-1 Chat</b> with customer reviewers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><b>AI Hardware Defect Synthesis</b></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><b>CSV / Excel Data Export</b></span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleOpenBuy('standard')}
                className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Buy {currentBrandPassInfo.brandName} Pro</span>
              </button>
            </div>

            {/* Card 3: Enterprise Unlimited (Single Brand Unlimited) */}
            <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-700">Brand Unlimited</span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                    1 Brand Unlimited
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">NPR {premiumNPR}</span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mb-2">
                  (${premiumPrice} USD{billingCycle === 'yearly' ? ' · billed annually' : ''})
                </div>
                <p className="text-[11px] text-slate-600 mb-3">
                  Unlimited video quota for <b>{currentBrandPassInfo.brandName}</b> models only.
                </p>

                <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-200">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span><b>UNLIMITED {currentBrandPassInfo.brandName} Reviews</b></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span>Priority Reviewer Verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span>{currentBrandPassInfo.brandName} Database CSV Download</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span>Dedicated 24/7 SLA Support</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleOpenBuy('premium')}
                className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Award className="w-3.5 h-3.5 text-purple-400" />
                <span>Buy {currentBrandPassInfo.brandName} Unlimited</span>
              </button>
            </div>

          </div>

          {/* Own Khalti QR Submission Status (Private to Signed-In Customer) */}
          {(() => {
            const ownOrders = paymentOrders.filter(
              (o) => !user?.googleId || o.uid === user.googleId
            );
            if (ownOrders.length === 0) return null;
            return (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between gap-2">
                  <span>Your Khalti QR Payment Submissions</span>
                  <span className="text-[11px] font-normal text-slate-500">Visible only to your account</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {ownOrders.slice(0, 4).map((ord) => {
                    const isApproved = ord.status === 'verified' || ord.status === 'completed';
                    const isRejected = ord.status === 'rejected' || ord.status === 'failed';
                    return (
                      <div
                        key={ord.id}
                        className="bg-white rounded-xl border border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-[11px] flex-wrap"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-slate-900">{ord.purchaseOrderId}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="font-semibold text-slate-700">{ord.categoryName}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="font-bold text-emerald-700">NPR {ord.amountNPR.toLocaleString('en-IN')}</span>
                          {ord.transactionReference && (
                            <span className="text-slate-500 ml-1.5 font-mono">({ord.transactionReference})</span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isApproved ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved</span>
                            </>
                          ) : isRejected ? (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Pending Verification</span>
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Simple Trust Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-500 gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Pay easily via Khalti, eSewa, Fonepay QR, bank wire, or card. Manual QR orders activate after Admin verification.</span>
          </div>

        </div>
      </div>

      {/* Real Payment & Banking Checkout Modal */}
      {checkoutPlan && (
        <Suspense fallback={null}>
          <PaymentCheckoutModal
            isOpen={!!checkoutPlan}
            onClose={() => setCheckoutPlan(null)}
            plan={checkoutPlan}
            billingCycle={billingCycle}
            selectedBrandCategory={selectedBrandPass}
            brandCategoryInfo={currentBrandPassInfo}
            user={user}
            paymentOrders={paymentOrders}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </Suspense>
      )}
    </>
  );
};
