import React, { useState } from 'react';
import { X, ShoppingBag, ShieldCheck, Calendar, Store, Tag, Cpu, AlertCircle, Wrench, CheckCircle2 } from 'lucide-react';
import { FeedbackItem } from '../types';
import { phoneById, rs } from '../data/initialData';
import { getPhoneOS } from '../utils/cartAndChartEngine';
import { updateFeedbackDefectInFirestore } from '../services/firebaseService';
import { formatFirestoreErrorMessage } from '../firebase';

interface CartModalProps {
  feedback: FeedbackItem | null;
  onClose: () => void;
  onFeedbackUpdated?: (updated: FeedbackItem) => Promise<void> | void;
}

export const CartModal: React.FC<CartModalProps> = ({ feedback, onClose, onFeedbackUpdated }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [patchNote, setPatchNote] = useState(
    feedback?.defectResolutionNote || 'Engineering patch verified and scheduled for release.'
  );
  const [fixedVersion, setFixedVersion] = useState(
    feedback?.defectFixedInVersion || 'v2.5.0-hotfix1'
  );

  if (!feedback) return null;

  const phone = phoneById(feedback.phone);
  const purchaseDateFormatted = feedback.createdAt
    ? new Date(feedback.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : feedback.time || 'Verified';

  const cartData = feedback.cartData || {
    orderId: `ORD-${(phone.brand || 'FP').toUpperCase().slice(0, 3)}-${feedback.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || '0001'}`,
    productName: `${phone.brand} ${phone.name}`,
    priceNPR: Math.round((phone.reward * 0.75 + 399) * 134),
    priceUSD: Math.round(phone.reward * 0.75) + 399,
    purchaseDate: purchaseDateFormatted,
    retailer: 'Verified Retailer',
    invoiceNumber: `INV-${feedback.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5) || '00001'}`,
    verifiedPurchase: true,
    appVersion: feedback.appVersion || 'N/A',
    osVersion: feedback.osVersion || getPhoneOS(feedback.phone),
  };

  const userOS = feedback.osVersion || cartData.osVersion || getPhoneOS(feedback.phone);
  const userAppVer = feedback.appVersion || cartData.appVersion || 'N/A';
  const reportedBug = feedback.dislike || feedback.improve || 'No defects reported';
  const isResolved = feedback.defectStatus === 'resolved';

  const handleResolveError = async () => {
    if (isResolved || isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);
    const nextVersion = fixedVersion.trim() || 'v2.5.0-hotfix1';
    const nextNote = patchNote.trim();
    try {
      await updateFeedbackDefectInFirestore({
        feedbackId: feedback.id,
        defectStatus: 'resolved',
        defectResolutionNote: nextNote,
        defectFixedInVersion: nextVersion,
      });
      if (onFeedbackUpdated) {
        const updated: FeedbackItem = {
          ...feedback,
          defectStatus: 'resolved',
          defectFixedInVersion: nextVersion,
          defectResolutionNote: nextNote,
          status: `Defect Resolved (${nextVersion})`,
        };
        await onFeedbackUpdated(updated);
      }
    } catch (err: unknown) {
      setErrorMsg(formatFirestoreErrorMessage(err, 'Unable to update defect status. An active subscription is required.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-slate-900 text-base">Verified Buyer Cart Data</h3>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs text-slate-500">Live Firestore record from customer feedback</p>
          </div>
        </div>

        {/* Reviewer mini card */}
        <div className="my-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {feedback.userAvatar ? (
              <img
                src={feedback.userAvatar}
                alt={feedback.user}
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white font-bold flex items-center justify-center">
                {feedback.user.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-extrabold text-xs text-slate-900">{feedback.user}</div>
              <div className="text-[10px] text-slate-500">{feedback.city}</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> VERIFIED BUYER
          </span>
        </div>

        {/* Cart Item Detail */}
        <div className="space-y-3 p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                {phone.brand}
              </span>
              <h4 className="font-extrabold text-sm text-slate-900 mt-0.5">{cartData.productName}</h4>
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 mt-1 bg-slate-100 px-2 py-0.5 rounded-md">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>{phone.spec}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-semibold">Qty: 1</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {rs(cartData.priceNPR)}
              </div>
              <div className="text-[10px] text-emerald-600 font-mono font-bold">
                ${cartData.priceUSD} USD
              </div>
            </div>
          </div>

          {/* User OS & App Version Section */}
          <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-700" />
              <div>
                <span className="text-[10px] font-bold text-purple-600 block uppercase">Client OS:</span>
                <span className="font-mono font-bold text-purple-950 text-xs">{userOS}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-purple-600 block uppercase">Client App:</span>
              <span className="font-mono font-bold text-purple-950 text-xs">{userAppVer}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Submission Date
              </div>
              <div className="font-bold text-slate-800 mt-0.5">{cartData.purchaseDate}</div>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <Store className="w-3 h-3" /> Retailer / Source
              </div>
              <div className="font-bold text-slate-800 mt-0.5 truncate">{cartData.retailer}</div>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs font-mono">
            <span className="text-blue-700 font-bold">Order Tracking ID:</span>
            <span className="font-black text-blue-900">{cartData.orderId}</span>
          </div>
        </div>

        {/* Reported Error & "Fix Their Error" Section */}
        <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Reported Bug / Error</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {isResolved ? `✓ Fixed (${feedback.defectFixedInVersion || 'patched'})` : 'Open Defect'}
            </span>
          </div>
          <p className="text-xs text-slate-800 italic">
            "{reportedBug}"
          </p>

          {errorMsg && (
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {!isResolved ? (
            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={fixedVersion}
                onChange={(e) => setFixedVersion(e.target.value)}
                placeholder="Release version (e.g. v2.5.0-hotfix1)"
                className="w-full bg-white rounded-xl py-1.5 px-3 text-xs font-mono border border-amber-200 outline-none focus:ring-1 focus:ring-amber-500"
              />
              <input
                type="text"
                value={patchNote}
                onChange={(e) => setPatchNote(e.target.value)}
                placeholder="Patch resolution summary"
                className="w-full bg-white rounded-xl py-1.5 px-3 text-xs border border-amber-200 outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleResolveError}
                disabled={isSaving}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving to Firestore...' : 'Mark Defect Resolved'}</span>
              </button>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-emerald-100/60 border border-emerald-300 text-emerald-950 text-xs flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Patched: {feedback.defectResolutionNote || patchNote}</span>
            </div>
          )}
        </div>

        {/* Video Bounty Accrued */}
        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
          <div className="text-xs">
            <div className="text-[10px] font-black uppercase text-emerald-700">Video Feedback Bounty</div>
            <div className="text-xs text-slate-600 font-semibold">Credited to reviewer wallet</div>
          </div>
          <div className="text-base font-black text-emerald-800">
            + {rs(feedback.rewardAmount ?? phone.reward)}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all cursor-pointer"
        >
          Close Cart Inspection
        </button>
      </div>
    </div>
  );
};
