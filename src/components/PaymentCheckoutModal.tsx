import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  CreditCard,
  Building2,
  ArrowRight,
  Copy,
  CheckCircle2,
  QrCode,
  Lock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  Trash2,
  ScanLine,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { triggerConfetti } from '../utils/confettiEffect';
import { resolveAssetUrl } from '../utils/assetUrl';
import {
  SubscriptionTier,
  BrandCategoryPass,
  UserProfile,
  KhaltiQrSettings,
  PaymentOrderRecord,
} from '../types';
import { auth, formatFirestoreErrorMessage } from '../firebase';
import {
  completeSubscriptionPaymentBatch,
  DEFAULT_KHALTI_QR_SETTINGS,
  fetchKhaltiGatewayConfig,
  makeSafeId,
  submitStage1KhaltiQrOrder,
  uploadKhaltiPaymentScreenshot,
} from '../services/firebaseService';
import { PrivatePaymentScreenshot } from './PrivatePaymentScreenshot';
import {
  DualCheckItem,
  scanKhaltiReceiptScreenshot,
  ScannedKhaltiReceipt,
  validatePaymentTxnReference,
} from '../utils/khaltiReceiptScanner';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  selectedBrandCategory: string;
  brandCategoryInfo?: BrandCategoryPass;
  user?: UserProfile;
  paymentOrders?: PaymentOrderRecord[];
  onPaymentSuccess: (plan: SubscriptionTier) => void;
}

const UNIVERSAL_QR_CHANNEL = 'Khalti / eSewa / Bank QR';

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingCycle,
  selectedBrandCategory,
  brandCategoryInfo,
  user,
  paymentOrders = [],
  onPaymentSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'khalti_qr' | 'bank' | 'card'>('khalti_qr');
  const [selectedBankType, setSelectedBankType] = useState<'nepal' | 'international'>('nepal');
  const [bankRefId, setBankRefId] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentDone, setPaymentDone] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmedPaymentRef, setConfirmedPaymentRef] = useState<string>('');

  // Card form state
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');

  // Streamlined 2-Step QR Checkout state
  const [khaltiConfig, setKhaltiConfig] = useState<{
    stage1Enabled: boolean;
    qrSettings: KhaltiQrSettings;
  }>({
    stage1Enabled: true,
    qrSettings: DEFAULT_KHALTI_QR_SETTINGS,
  });
  const [stage1OrderId, setStage1OrderId] = useState<string>(() => makeSafeId('ord_qr'));
  const [stage1PurchaseOrderId, setStage1PurchaseOrderId] = useState<string>(
    () => `FP-QR-${Date.now().toString().slice(-8)}`
  );
  const [companyNameInput, setCompanyNameInput] = useState<string>('');
  const [khaltiTxnRef, setKhaltiTxnRef] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);
  const [uploadedScreenshotUrl, setUploadedScreenshotUrl] = useState<string | undefined>(undefined);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState<boolean>(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStatusText, setScanStatusText] = useState<string>('');
  const [scanResult, setScanResult] = useState<ScannedKhaltiReceipt | null>(null);
  const [stage1PendingOrder, setStage1PendingOrder] = useState<PaymentOrderRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadSessionRef = useRef<number>(0);

  // Price calculations (must match across renders)
  const baseMonthlyPrice = plan.priceUSD;
  const effectiveMonthlyPrice =
    billingCycle === 'yearly' ? Math.round(baseMonthlyPrice * 0.7 * 100) / 100 : baseMonthlyPrice;
  const totalMonths = billingCycle === 'yearly' ? 12 : 1;
  const totalUSD = Math.round(effectiveMonthlyPrice * totalMonths * 100) / 100;
  const totalNPR = Math.round(totalUSD * 135);

  useEffect(() => {
    if (!isOpen) return;
    uploadSessionRef.current += 1;
    setPaymentMethod('khalti_qr');
    setPaymentError(null);
    setPaymentDone(false);
    setStage1PendingOrder(null);
    setStage1OrderId(makeSafeId('ord_qr'));
    setStage1PurchaseOrderId(`FP-QR-${Date.now().toString().slice(-8)}`);
    setCompanyNameInput(user?.name || auth.currentUser?.displayName || '');
    setKhaltiTxnRef('');
    setScreenshotFile(null);
    setUploadedScreenshotUrl(undefined);
    setIsUploadingScreenshot(false);
    setScanResult(null);
    setIsScanningReceipt(false);
    setScanProgress(0);
    setScanStatusText('');
    setScreenshotPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    let cancelled = false;
    fetchKhaltiGatewayConfig()
      .then((cfg) => {
        if (cancelled) return;
        setKhaltiConfig(cfg);
      })
      .catch(() => {
        // Keep default fallback settings
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, plan?.id, selectedBrandCategory, totalNPR, user?.name]);

  useEffect(() => {
    return () => {
      if (screenshotPreviewUrl) {
        URL.revokeObjectURL(screenshotPreviewUrl);
      }
    };
  }, [screenshotPreviewUrl]);

  if (!isOpen) return null;

  const resolvedSingleBrand =
    (selectedBrandCategory && selectedBrandCategory.toLowerCase() !== 'all' ? selectedBrandCategory : '') ||
    (plan.targetCategory && plan.targetCategory.toLowerCase() !== 'all' ? plan.targetCategory : '') ||
    (plan.unlockedCategories || []).find((b) => b && b.toLowerCase() !== 'all') ||
    'samsung';

  const resolvedBrandDisplay =
    brandCategoryInfo?.brandName ||
    (selectedBrandCategory !== 'all' ? selectedBrandCategory : plan.targetCategory) ||
    'Selected Brand';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const runReceiptScan = async (file: File, expectedHolderName: string, sessionId?: number) => {
    const activeSession = sessionId ?? uploadSessionRef.current;
    setIsScanningReceipt(true);
    setScanProgress(5);
    setScanStatusText('Scanning receipt QR & Transaction ID...');
    try {
      const result = await scanKhaltiReceiptScreenshot(file, {
        expectedAccountHolderName: expectedHolderName,
        expectedAmountNPR: totalNPR,
        onProgress: (pct, statusText) => {
          if (uploadSessionRef.current !== activeSession) return;
          setScanProgress(pct);
          setScanStatusText(statusText);
        },
      });
      if (uploadSessionRef.current !== activeSession) return;
      setScanResult(result);
      if (result.extractedTxnId) {
        setKhaltiTxnRef(result.extractedTxnId);
      }
    } catch {
      if (uploadSessionRef.current !== activeSession) return;
      setScanResult(null);
      setScanStatusText('Auto-scan unavailable — enter Transaction ID manually.');
    } finally {
      if (uploadSessionRef.current === activeSession) {
        setIsScanningReceipt(false);
      }
    }
  };

  const handleScreenshotSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPaymentError(null);
    setScanResult(null);

    if (!file.type.startsWith('image/')) {
      setPaymentError('Please choose a valid PNG, JPG, or WebP screenshot image.');
      return;
    }

    const sessionId = ++uploadSessionRef.current;
    const preview = URL.createObjectURL(file);
    setScreenshotPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return preview;
    });
    setScreenshotFile(file);
    setUploadedScreenshotUrl(undefined);
    setIsUploadingScreenshot(true);

    const scanPromise = runReceiptScan(file, khaltiConfig.qrSettings.accountHolderName, sessionId);
    const uploadPromise = uploadKhaltiPaymentScreenshot(file)
      .then((serverUrl) => {
        if (uploadSessionRef.current !== sessionId) return;
        setUploadedScreenshotUrl(serverUrl);
      })
      .catch((err: unknown) => {
        if (uploadSessionRef.current !== sessionId) return;
        setUploadedScreenshotUrl(undefined);
        setPaymentError(formatFirestoreErrorMessage(err, 'Unable to upload payment screenshot.'));
      })
      .finally(() => {
        if (uploadSessionRef.current === sessionId) {
          setIsUploadingScreenshot(false);
        }
      });

    await Promise.allSettled([scanPromise, uploadPromise]);
  };

  const handleRemoveScreenshot = () => {
    uploadSessionRef.current += 1;
    setScreenshotFile(null);
    setUploadedScreenshotUrl(undefined);
    setIsUploadingScreenshot(false);
    setScanResult(null);
    setIsScanningReceipt(false);
    setScanProgress(0);
    setScanStatusText('');
    setPaymentError(null);
    setScreenshotPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cleanEnteredRef = khaltiTxnRef.trim();
  const cleanCompanyName = companyNameInput.trim();
  const txnValidation = validatePaymentTxnReference(cleanEnteredRef, UNIVERSAL_QR_CHANNEL);
  const duplicateInOwnHistory = Boolean(
    cleanEnteredRef.length >= 6 &&
      paymentOrders.some(
        (o) =>
          o.status !== 'rejected' &&
          o.status !== 'failed' &&
          o.status !== 'cancelled' &&
          ((o.transactionReference || '').trim().toUpperCase() === cleanEnteredRef.toUpperCase() ||
            (o.khaltiTransactionId || '').trim().toUpperCase() === cleanEnteredRef.toUpperCase())
      )
  );

  const dualChecks: DualCheckItem[] = (() => {
    const items: DualCheckItem[] = [];

    if (!cleanEnteredRef) {
      items.push({
        id: 'form_txn',
        label: 'Transaction ID',
        source: 'Form Input',
        status: 'pending',
        message: 'Enter your Transaction ID from Khalti, eSewa, or Bank receipt.',
      });
    } else if (!txnValidation.valid) {
      items.push({
        id: 'form_txn',
        label: 'Transaction ID',
        source: 'Form Input',
        status: 'fail',
        message: txnValidation.reason || 'Invalid Transaction ID format.',
      });
    } else if (duplicateInOwnHistory) {
      items.push({
        id: 'form_txn',
        label: 'Transaction ID',
        source: 'Form Input',
        status: 'fail',
        message: `"${cleanEnteredRef}" was already submitted.`,
      });
    } else {
      items.push({
        id: 'form_txn',
        label: 'Transaction ID',
        source: 'Form Input',
        status: 'pass',
        message: `${cleanEnteredRef}`,
      });
    }

    if (isScanningReceipt) {
      items.push({
        id: 'ocr_scan',
        label: 'Receipt Scan',
        source: 'Screenshot Scan',
        status: 'pending',
        message: `${scanStatusText || 'Scanning...'} (${scanProgress}%)`,
      });
    } else if (scanResult) {
      if (scanResult.isKhaltiReceipt) {
        items.push({
          id: 'ocr_receipt',
          label: 'Receipt Verification',
          source: 'Screenshot Scan',
          status: 'pass',
          message: scanResult.qrExtractedTxnId
            ? `QR Txn ID decoded (${scanResult.qrExtractedTxnId}).`
            : `Receipt verified (${scanResult.confidence}% clarity).`,
        });
      }

      if (scanResult.extractedAmountNPR !== null) {
        const matchesPlan = scanResult.extractedAmountNPR === totalNPR;
        items.push({
          id: 'ocr_amount',
          label: 'Receipt Amount',
          source: 'Cross-Check',
          status: matchesPlan ? 'pass' : 'fail',
          message: matchesPlan
            ? `Matches NPR ${scanResult.extractedAmountNPR.toLocaleString('en-IN')}.`
            : `Screenshot shows NPR ${scanResult.extractedAmountNPR.toLocaleString('en-IN')} ≠ NPR ${totalNPR.toLocaleString('en-IN')}.`,
        });
      }

      if (scanResult.candidateTxnIds.length > 0 && cleanEnteredRef) {
        const matchesCandidate = scanResult.candidateTxnIds.some(
          (c) => c.toUpperCase() === cleanEnteredRef.toUpperCase()
        );
        items.push({
          id: 'ocr_txn_match',
          label: 'Receipt Txn Match',
          source: 'Cross-Check',
          status: matchesCandidate ? 'pass' : 'fail',
          message: matchesCandidate
            ? `Matches scanned code (${cleanEnteredRef}).`
            : `Entered "${cleanEnteredRef}" ≠ scanned "${scanResult.extractedTxnId}".`,
        });
      }
    }

    return items;
  })();

  const hasHardValidationError = dualChecks.some((c) => c.status === 'fail');

  const handleQrFormSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setPaymentError(null);
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setPaymentError('Please sign in with Google before submitting a subscription payment.');
      return;
    }
    if (!khaltiConfig.stage1Enabled) {
      setPaymentError('Manual QR payments are currently disabled by Admin.');
      return;
    }
    if (!cleanCompanyName) {
      setPaymentError('Please enter your Company Name.');
      return;
    }
    if (isScanningReceipt) {
      setPaymentError('Please wait for the receipt scanner to finish reading your screenshot.');
      return;
    }
    if (isUploadingScreenshot) {
      setPaymentError('Please wait for your screenshot upload to finish.');
      return;
    }

    const cleanRef = cleanEnteredRef;
    if (!txnValidation.valid) {
      setPaymentError(txnValidation.reason || 'Enter a valid Transaction ID.');
      return;
    }
    if (duplicateInOwnHistory) {
      setPaymentError(`Duplicate Transaction ID "${cleanRef}": This code was already submitted.`);
      return;
    }

    if (screenshotFile && scanResult) {
      if (scanResult.extractedAmountNPR !== null && scanResult.extractedAmountNPR !== totalNPR) {
        setPaymentError(
          `Receipt Amount Error: Scanned screenshot shows NPR ${scanResult.extractedAmountNPR.toLocaleString('en-IN')} instead of NPR ${totalNPR.toLocaleString('en-IN')}.`
        );
        return;
      }
      if (
        scanResult.candidateTxnIds.length > 0 &&
        !scanResult.candidateTxnIds.some((c) => c.toUpperCase() === cleanRef.toUpperCase())
      ) {
        setPaymentError(
          `Transaction ID Mismatch: Entered "${cleanRef}" does not match scanned receipt code "${scanResult.extractedTxnId}".`
        );
        return;
      }
    }

    setIsProcessing(true);
    try {
      const order = await submitStage1KhaltiQrOrder({
        uid: firebaseUser.uid,
        orderId: stage1OrderId,
        purchaseOrderId: stage1PurchaseOrderId,
        companyName: cleanCompanyName,
        companyEmail: user?.email || firebaseUser.email || undefined,
        plan,
        billingCycle,
        brandCategory: resolvedSingleBrand,
        amountUSD: totalUSD,
        amountNPR: totalNPR,
        submittedAmountNPR: totalNPR,
        transactionReference: cleanRef,
        paidVia: UNIVERSAL_QR_CHANNEL,
        receiverKhaltiNumber: khaltiConfig.qrSettings.khaltiNumber || undefined,
        screenshotUrl: uploadedScreenshotUrl,
      });

      setStage1PendingOrder(order);
    } catch (err: unknown) {
      setPaymentError(formatFirestoreErrorMessage(err, 'Unable to submit payment details.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBankOrCardConfirm = async () => {
    setPaymentError(null);

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setPaymentError('Please sign in with Google before completing subscription payment.');
      return;
    }

    if (paymentMethod === 'card') {
      const digits = cardNumber.replace(/\D/g, '');
      if (!cardName.trim() || digits.length < 12 || !cardExpiry.trim() || cardCvc.trim().length < 3) {
        setPaymentError('Please enter valid cardholder name, card number, expiry (MM/YY), and CVC.');
        return;
      }
    }

    const gatewayName =
      paymentMethod === 'bank'
        ? selectedBankType === 'nepal'
          ? 'Corporate Nepal Bank Wire'
          : 'International SWIFT Wire'
        : 'Card / Stripe';

    const referenceId =
      bankRefId.trim() ||
      (paymentMethod === 'card'
        ? `CARD-${cardNumber.replace(/\D/g, '').slice(-4) || '0000'}-${Date.now().toString().slice(-5)}`
        : `${gatewayName.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`);

    setIsProcessing(true);
    try {
      const { payment } = await completeSubscriptionPaymentBatch({
        uid: firebaseUser.uid,
        payerName: cardName.trim() || cleanCompanyName || user?.name || firebaseUser.displayName || 'Company Subscriber',
        plan,
        billingCycle,
        brandCategory: resolvedSingleBrand,
        unlockedBrands: [resolvedSingleBrand],
        amountUSD: totalUSD,
        amountNPR: totalNPR,
        method: paymentMethod === 'bank' ? 'bank' : 'card',
        gateway: gatewayName,
        referenceId,
      });

      setConfirmedPaymentRef(payment.referenceId || payment.id);
      setIsProcessing(false);
      setPaymentDone(true);
      triggerConfetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        onPaymentSuccess(plan);
        onClose();
        setPaymentDone(false);
      }, 1100);
    } catch (err: unknown) {
      setIsProcessing(false);
      setPaymentError(formatFirestoreErrorMessage(err, 'Unable to process subscription payment in Firestore.'));
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 relative overflow-hidden max-h-[94vh] flex flex-col">
        {/* Clean SaaS Dark Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Complete Company Subscription · {resolvedBrandDisplay}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white truncate mt-0.5">
              {plan.name} — NPR {totalNPR.toLocaleString('en-IN')}{' '}
              <span className="text-xs font-normal text-slate-300">
                (${totalUSD} {billingCycle === 'yearly' ? '/ yr · 30% OFF' : '/ mo'})
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {paymentDone ? (
            <div className="text-center py-12 px-6 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Subscription Activated!</h3>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                Your payment for <b>{plan.name}</b> ({billingCycle === 'yearly' ? 'Annual Plan' : 'Monthly Plan'}) has been verified and saved.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-mono text-slate-700">
                <span>Ref: {confirmedPaymentRef}</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">PAID</span>
              </div>
            </div>
          ) : stage1PendingOrder ? (
            <div className="text-center py-8 px-6 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3 ring-8 ring-amber-50">
                <Clock className="w-8 h-8" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-900">
                Status: Pending Verification
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-3">
                Payment Submitted!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                Thank you, <b>{stage1PendingOrder.companyName}</b>! We saved your{' '}
                <b>{stage1PendingOrder.payerAccountOrBank || 'QR'}</b> reference (
                <span className="font-mono font-bold">{stage1PendingOrder.transactionReference}</span>) for{' '}
                <b>NPR {stage1PendingOrder.amountNPR.toLocaleString('en-IN')}</b>. Your{' '}
                <b>{resolvedBrandDisplay}</b> portal unlocks as soon as Admin confirms your Transaction ID.
              </p>

              <div className="mt-5 max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Order Reference:</span>
                  <span className="font-mono font-bold text-slate-900">{stage1PendingOrder.purchaseOrderId}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Paid Via:</span>
                  <span className="font-bold text-purple-800">
                    {stage1PendingOrder.payerAccountOrBank || 'Khalti Wallet'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-mono font-bold text-slate-900">{stage1PendingOrder.transactionReference}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Amount Payable:</span>
                  <span className="font-bold text-emerald-700">
                    NPR {stage1PendingOrder.amountNPR.toLocaleString('en-IN')} (${stage1PendingOrder.amountUSD})
                  </span>
                </div>
                {stage1PendingOrder.screenshotUrl && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
                    <span className="text-slate-500">Receipt Screenshot:</span>
                    <PrivatePaymentScreenshot
                      src={stage1PendingOrder.screenshotUrl}
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Back to Company Dashboard
              </button>
            </div>
          ) : (
            <div className="p-5 sm:p-6 space-y-4">
              {/* Compact Payment Channel Switcher */}
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-3">
                <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('khalti_qr');
                      setPaymentError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      paymentMethod === 'khalti_qr'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Khalti / eSewa / Bank QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('bank');
                      setPaymentError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      paymentMethod === 'bank'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Bank Wire</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('card');
                      setPaymentError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card</span>
                  </button>
                </div>

                {billingCycle === 'yearly' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    <span>Annual 30% Discount Applied</span>
                  </span>
                )}
              </div>

              {/* PRIMARY FLOW: Clean 2-Step QR Checkout */}
              {paymentMethod === 'khalti_qr' && (
                <form onSubmit={handleQrFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                  {/* STEP 1: QR Code + Copyable Khalti Number + Total Amount */}
                  <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4 flex flex-col items-center justify-between text-center space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-3 py-0.5 rounded-full">
                      Step 1 · Scan &amp; Pay
                    </span>

                    <div className="bg-white p-2.5 rounded-xl border border-purple-200 shadow-xs w-44">
                      <img
                        src={resolveAssetUrl(khaltiConfig.qrSettings.qrImagePath)}
                        alt={`QR code for ${khaltiConfig.qrSettings.accountHolderName}`}
                        className="w-full h-auto rounded-lg object-contain"
                      />
                    </div>

                    <p className="text-[11px] font-semibold text-purple-950">
                      Khalti · eSewa · Mobile Banking
                    </p>

                    <div className="w-full space-y-2 text-left">
                      <div className="bg-white border border-purple-200/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">Total Amount</span>
                        <span className="text-base font-black text-purple-700 font-mono tabular-nums">
                          NPR {totalNPR.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {khaltiConfig.qrSettings.khaltiNumber ? (
                        <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Khalti Number
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-900">
                              {khaltiConfig.qrSettings.khaltiNumber}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(khaltiConfig.qrSettings.khaltiNumber || '', 'khalti_num')}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            {copiedField === 'khalti_num' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-500">Receiver</span>
                          <span className="font-bold text-slate-900 truncate">
                            {khaltiConfig.qrSettings.accountHolderName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STEP 2: Company Name + Transaction ID + Submit Payment */}
                  <div className="flex flex-col justify-between space-y-4">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-0.5 rounded-full">
                          Step 2 · Verify Payment
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {resolvedBrandDisplay}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Company Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Himalayan Mobile Pvt. Ltd."
                          value={companyNameInput}
                          onChange={(e) => {
                            setCompanyNameInput(e.target.value);
                            setPaymentError(null);
                          }}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter Transaction / Reference ID"
                          value={khaltiTxnRef}
                          onChange={(e) => {
                            setKhaltiTxnRef(e.target.value);
                            setPaymentError(null);
                          }}
                          className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono text-slate-900 outline-none focus:ring-2 ${
                            cleanEnteredRef && !txnValidation.valid
                              ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500/30'
                              : cleanEnteredRef && txnValidation.valid
                              ? 'border-emerald-400 bg-white focus:ring-emerald-500/30'
                              : 'border-slate-300 bg-white focus:border-purple-600 focus:ring-purple-500/20'
                          }`}
                        />
                        {cleanEnteredRef && !txnValidation.valid && (
                          <p className="mt-1 text-[11px] font-medium text-rose-700">
                            {txnValidation.reason}
                          </p>
                        )}
                      </div>

                      {/* Lightweight Optional Receipt Auto-Scan */}
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleScreenshotSelected}
                          className="hidden"
                        />
                        {!screenshotPreviewUrl ? (
                          <button
                            type="button"
                            disabled={isUploadingScreenshot}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 hover:text-purple-900 cursor-pointer disabled:opacity-60"
                          >
                            <ScanLine className="w-3.5 h-3.5" />
                            <span>Have a screenshot? Upload to auto-fill Transaction ID</span>
                          </button>
                        ) : (
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={screenshotPreviewUrl}
                                alt="Receipt preview"
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-slate-800 truncate flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3 text-purple-600 shrink-0" />
                                  <span className="truncate">{screenshotFile?.name || 'Receipt'}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {isScanningReceipt
                                    ? `${scanStatusText} (${scanProgress}%)`
                                    : isUploadingScreenshot
                                    ? 'Uploading...'
                                    : scanResult?.extractedTxnId
                                    ? `Detected ID: ${scanResult.extractedTxnId}`
                                    : 'Screenshot attached'}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveScreenshot}
                              className="p-1 rounded-md text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                              aria-label="Remove screenshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {hasHardValidationError && scanResult && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 space-y-1 text-[11px] text-rose-700">
                          <div className="flex items-center gap-1.5 font-bold">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>Receipt mismatch</span>
                          </div>
                          {dualChecks
                            .filter((c) => c.status === 'fail' && c.source !== 'Form Input')
                            .map((chk) => (
                              <div key={chk.id}>• {chk.message}</div>
                            ))}
                        </div>
                      )}
                    </div>

                    {paymentError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <button
                        type="submit"
                        disabled={isProcessing || isUploadingScreenshot || isScanningReceipt}
                        className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : isUploadingScreenshot ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : isScanningReceipt ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Scanning ({scanProgress}%)...</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Payment</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Unlocks after Admin verifies your Transaction ID.</span>
                      </p>
                    </div>
                  </div>
                </form>
              )}

              {/* SECONDARY METHOD 1: Bank Wire Details */}
              {paymentMethod === 'bank' && (
                <div className="space-y-4">
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex gap-2 pb-2 border-b border-slate-200 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedBankType('nepal')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          selectedBankType === 'nepal'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        Nepal Corporate Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedBankType('international')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          selectedBankType === 'international'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        International Wire (USD / SWIFT)
                      </button>
                    </div>

                    {selectedBankType === 'nepal' ? (
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Beneficiary Entity</span>
                            <span className="font-bold text-slate-900">dot Technologies Pvt. Ltd.</span>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                            NPR {totalNPR.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Deposit Reference ID / Voucher Code (Optional):
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. TXN-948123 or Voucher #"
                            value={bankRefId}
                            onChange={(e) => setBankRefId(e.target.value)}
                            className="w-full bg-white rounded-xl py-2 px-3 text-xs text-slate-800 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Intermediary / Wire Bank</span>
                            <span className="font-bold text-slate-900">JPMorgan Chase Bank, N.A. (New York)</span>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">USD Wire</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-white rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">ABA / Routing</span>
                            <span className="font-mono font-bold text-slate-800">021000021</span>
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">SWIFT / BIC</span>
                            <span className="font-mono font-bold text-slate-800">CHASUS33</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {paymentError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleBankOrCardConfirm}
                    disabled={isProcessing}
                    className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>{isProcessing ? 'Processing...' : `Confirm Bank Wire (${totalNPR.toLocaleString('en-IN')} NPR)`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* SECONDARY METHOD 2: Credit Card */}
              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>256-Bit SSL Encrypted Card Checkout</span>
                      </div>
                      <span className="font-bold text-slate-700">Visa / Mastercard / Amex</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Company Billing Manager"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full bg-white rounded-xl py-2 px-3 text-xs text-slate-800 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Card Number</label>
                      <input
                        type="text"
                        placeholder="4242 •••• •••• 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-white rounded-xl py-2 px-3 text-xs text-slate-800 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          placeholder="12/28"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-white rounded-xl py-2 px-3 text-xs text-slate-800 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">CVC / CVV</label>
                        <input
                          type="text"
                          placeholder="•••"
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full bg-white rounded-xl py-2 px-3 text-xs text-slate-800 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleBankOrCardConfirm}
                    disabled={isProcessing}
                    className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>{isProcessing ? 'Processing...' : `Pay $${totalUSD} & Activate Now`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
