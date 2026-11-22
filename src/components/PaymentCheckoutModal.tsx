import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  CreditCard,
  Building2,
  Smartphone,
  ArrowRight,
  Copy,
  CheckCircle2,
  QrCode,
  Lock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock,
  Upload,
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
  validateKhaltiNumericTxnId,
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
  const [paymentMethod, setPaymentMethod] = useState<'khalti_qr' | 'bank' | 'online' | 'card'>('khalti_qr');
  const [selectedOnlineWallet, setSelectedOnlineWallet] = useState<'esewa' | 'connectips' | 'fonepay'>('esewa');
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

  // Manual Khalti QR checkout state
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
  const [confirmAmountNPR, setConfirmAmountNPR] = useState<string>('');
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
    setPaymentError(null);
    setPaymentDone(false);
    setStage1PendingOrder(null);
    setStage1OrderId(makeSafeId('ord_qr'));
    setStage1PurchaseOrderId(`FP-QR-${Date.now().toString().slice(-8)}`);
    setConfirmAmountNPR(String(totalNPR));
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
  }, [isOpen, plan?.id, selectedBrandCategory, totalNPR]);

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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const runReceiptScan = async (file: File, expectedHolderName: string, sessionId?: number) => {
    const activeSession = sessionId ?? uploadSessionRef.current;
    setIsScanningReceipt(true);
    setScanProgress(5);
    setScanStatusText('Initializing client-side Khalti receipt scanner...');
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
      setScanStatusText('Auto-scan unavailable — enter numeric Khalti Transaction ID manually.');
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

  // Compute live Dual Verification Check (Both Scanned Screenshot Receipt + Entered Form Data)
  const cleanEnteredRef = khaltiTxnRef.trim();
  const txnValidation = validateKhaltiNumericTxnId(cleanEnteredRef);
  const enteredAmountNum = Math.round(Number(confirmAmountNPR || 0));
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

    // 1. Entered Exact Amount check
    if (!confirmAmountNPR.trim()) {
      items.push({
        id: 'form_amount',
        label: 'Exact Subscription Price (Form Input)',
        source: 'Form Input',
        status: 'fail',
        message: `Enter exact NPR ${totalNPR.toLocaleString('en-IN')}.`,
      });
    } else if (enteredAmountNum !== totalNPR) {
      items.push({
        id: 'form_amount',
        label: 'Exact Subscription Price (Form Input)',
        source: 'Form Input',
        status: 'fail',
        message: `Entered NPR ${enteredAmountNum.toLocaleString('en-IN')} ≠ required NPR ${totalNPR.toLocaleString('en-IN')} (blocked).`,
      });
    } else {
      items.push({
        id: 'form_amount',
        label: 'Exact Subscription Price (Form Input)',
        source: 'Form Input',
        status: 'pass',
        message: `Exact NPR ${totalNPR.toLocaleString('en-IN')} confirmed.`,
      });
    }

    // 2. Entered Numeric Khalti Transaction ID check
    if (!cleanEnteredRef) {
      items.push({
        id: 'form_txn',
        label: 'Khalti Numeric Txn ID (Form Input)',
        source: 'Form Input',
        status: 'pending',
        message: 'Scan your Khalti screenshot or enter your 6–20 digit numeric Transaction ID.',
      });
    } else if (!txnValidation.valid) {
      items.push({
        id: 'form_txn',
        label: 'Khalti Numeric Txn ID (Form Input)',
        source: 'Form Input',
        status: 'fail',
        message: txnValidation.reason || 'Must follow Khalti numeric format (digits only).',
      });
    } else if (duplicateInOwnHistory) {
      items.push({
        id: 'form_txn',
        label: 'Khalti Numeric Txn ID (Form Input)',
        source: 'Form Input',
        status: 'fail',
        message: `Transaction ID "${cleanEnteredRef}" was already submitted.`,
      });
    } else {
      items.push({
        id: 'form_txn',
        label: 'Khalti Numeric Txn ID (Form Input)',
        source: 'Form Input',
        status: 'pass',
        message: `Valid numeric Khalti Transaction ID (${cleanEnteredRef}).`,
      });
    }

    // 3. Screenshot OCR Detection & Cross-Check (when screenshot is attached)
    if (isScanningReceipt) {
      items.push({
        id: 'ocr_scan',
        label: 'Khalti Screenshot Scan',
        source: 'Screenshot Scan',
        status: 'pending',
        message: `${scanStatusText || 'Scanning screenshot...'} (${scanProgress}%)`,
      });
    } else if (scanResult) {
      if (!scanResult.isKhaltiReceipt) {
        items.push({
          id: 'ocr_receipt',
          label: 'Khalti Receipt Detection',
          source: 'Screenshot Scan',
          status: 'fail',
          message: 'Uploaded image could not be verified as a readable Khalti payment receipt.',
        });
      } else {
        items.push({
          id: 'ocr_receipt',
          label: 'Khalti Receipt Detection',
          source: 'Screenshot Scan',
          status: 'pass',
          message: `Khalti receipt text detected (${scanResult.confidence}% OCR clarity).`,
        });
      }

      if (scanResult.extractedAmountNPR !== null) {
        const matchesPlan = scanResult.extractedAmountNPR === totalNPR;
        items.push({
          id: 'ocr_amount',
          label: 'Receipt Amount Cross-Check',
          source: 'Cross-Check',
          status: matchesPlan ? 'pass' : 'fail',
          message: matchesPlan
            ? `Receipt shows exact NPR ${scanResult.extractedAmountNPR.toLocaleString('en-IN')}.`
            : `Receipt shows NPR ${scanResult.extractedAmountNPR.toLocaleString('en-IN')} ≠ required NPR ${totalNPR.toLocaleString('en-IN')} (blocked).`,
        });
      } else {
        items.push({
          id: 'ocr_amount',
          label: 'Receipt Amount Cross-Check',
          source: 'Screenshot Scan',
          status: 'warn',
          message: 'Amount text unclear in screenshot; exact form amount will be checked by Admin.',
        });
      }

      if (scanResult.candidateTxnIds.length > 0 && cleanEnteredRef) {
        const matchesCandidate = scanResult.candidateTxnIds.some(
          (c) => c.toUpperCase() === cleanEnteredRef.toUpperCase()
        );
        items.push({
          id: 'ocr_txn_match',
          label: 'Receipt vs. Entered Txn ID Check',
          source: 'Cross-Check',
          status: matchesCandidate ? 'pass' : 'fail',
          message: matchesCandidate
            ? `Matches scanned receipt code (${cleanEnteredRef}).`
            : `Entered "${cleanEnteredRef}" does not match scanned code (${scanResult.extractedTxnId}).`,
        });
      }

      if (scanResult.recipientMatchesExpected === false) {
        items.push({
          id: 'ocr_recipient',
          label: `Recipient (${khaltiConfig.qrSettings.accountHolderName})`,
          source: 'Screenshot Scan',
          status: 'fail',
          message: `Recipient "${khaltiConfig.qrSettings.accountHolderName}" was not found on scanned receipt.`,
        });
      } else if (scanResult.recipientMatchesExpected === true) {
        items.push({
          id: 'ocr_recipient',
          label: `Recipient (${khaltiConfig.qrSettings.accountHolderName})`,
          source: 'Screenshot Scan',
          status: 'pass',
          message: `Recipient "${scanResult.recipientDetected || khaltiConfig.qrSettings.accountHolderName}" detected on receipt.`,
        });
      }
    }

    return items;
  })();

  const hasHardValidationError = dualChecks.some((c) => c.status === 'fail');

  const handleKhaltiQrSubmit = async () => {
    setPaymentError(null);
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setPaymentError('Please sign in with Google before submitting a Khalti QR payment.');
      return;
    }
    if (!khaltiConfig.stage1Enabled) {
      setPaymentError('Manual Khalti QR payments are currently disabled by Admin.');
      return;
    }
    if (isScanningReceipt) {
      setPaymentError('Please wait for the client-side screenshot scan to finish extracting your Transaction ID.');
      return;
    }
    if (isUploadingScreenshot) {
      setPaymentError('Please wait for your screenshot upload to finish.');
      return;
    }

    const cleanRef = cleanEnteredRef;
    const enteredNPR = enteredAmountNum;

    // Hard local validation guards: if wrong information or mismatched amount, exit & NEVER send anywhere!
    if (!enteredNPR || enteredNPR !== totalNPR) {
      setPaymentError(
        `Amount Mismatch Error: You entered NPR ${(enteredNPR || 0).toLocaleString('en-IN')}, but this subscription requires exact NPR ${totalNPR.toLocaleString('en-IN')}. Payment blocked and NOT sent.`
      );
      return;
    }
    if (!txnValidation.valid) {
      setPaymentError(
        `${txnValidation.reason || 'Invalid numeric Khalti Transaction ID.'} Payment NOT sent.`
      );
      return;
    }
    if (duplicateInOwnHistory) {
      setPaymentError(
        `Duplicate Transaction ID "${cleanRef}": This Transaction ID already exists in your payment history. Payment NOT sent.`
      );
      return;
    }

    if (screenshotFile && scanResult) {
      if (!scanResult.isKhaltiReceipt) {
        setPaymentError(
          'Receipt Validation Error: The uploaded screenshot does not appear to be a valid readable Khalti receipt. Upload a clear Khalti receipt screenshot or remove the invalid image. Payment NOT sent.'
        );
        return;
      }
      if (scanResult.extractedAmountNPR !== null && scanResult.extractedAmountNPR !== totalNPR) {
        setPaymentError(
          `Receipt Amount Error: Your scanned Khalti screenshot shows NPR ${scanResult.extractedAmountNPR.toLocaleString('en-IN')}, which does not match required NPR ${totalNPR.toLocaleString('en-IN')}. Payment blocked and NOT sent.`
        );
        return;
      }
      if (
        scanResult.candidateTxnIds.length > 0 &&
        !scanResult.candidateTxnIds.some((c) => c.toUpperCase() === cleanRef.toUpperCase())
      ) {
        setPaymentError(
          `Transaction ID Mismatch: You entered "${cleanRef}", but your scanned Khalti screenshot shows "${scanResult.extractedTxnId}". Please fix to match your real receipt. Payment NOT sent.`
        );
        return;
      }
      if (scanResult.recipientMatchesExpected === false) {
        setPaymentError(
          `Recipient Mismatch: Scanned receipt did not show expected recipient "${khaltiConfig.qrSettings.accountHolderName}". Payment blocked and NOT sent.`
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
        companyName: user?.name || firebaseUser.displayName || 'Company Subscriber',
        companyEmail: user?.email || firebaseUser.email || undefined,
        plan,
        billingCycle,
        brandCategory: resolvedSingleBrand,
        amountUSD: totalUSD,
        amountNPR: totalNPR,
        submittedAmountNPR: enteredNPR,
        transactionReference: cleanRef,
        screenshotUrl: uploadedScreenshotUrl,
      });

      // Manual Khalti QR NEVER activates subscriptions automatically. Keep order in Pending Verification.
      setStage1PendingOrder(order);
    } catch (err: unknown) {
      setPaymentError(formatFirestoreErrorMessage(err, 'Unable to submit Khalti QR payment details.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (paymentMethod === 'khalti_qr') {
      await handleKhaltiQrSubmit();
      return;
    }

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
        : paymentMethod === 'online'
        ? selectedOnlineWallet.toUpperCase()
        : 'Card / Stripe';

    const referenceId =
      bankRefId.trim() ||
      (paymentMethod === 'card'
        ? `CARD-${cardNumber.replace(/\D/g, '').slice(-4) || '0000'}-${Date.now().toString().slice(-5)}`
        : `${gatewayName.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`);

    const unlockedBrands = [resolvedSingleBrand];

    setIsProcessing(true);
    try {
      const { payment } = await completeSubscriptionPaymentBatch({
        uid: firebaseUser.uid,
        payerName: cardName.trim() || user?.name || firebaseUser.displayName || 'Company Subscriber',
        plan,
        billingCycle,
        brandCategory: resolvedSingleBrand,
        unlockedBrands,
        amountUSD: totalUSD,
        amountNPR: totalNPR,
        method: paymentMethod,
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
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden max-h-[94vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          aria-label="Close checkout"
        >
          <X className="w-5 h-5" />
        </button>

        {paymentDone ? (
          <div className="text-center py-12 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Subscription Activated!</h3>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              Your payment for the <b>{plan.name}</b> ({billingCycle === 'yearly' ? '1-Year Annual Plan' : 'Monthly Plan'}) has been verified and saved in Firestore.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-mono text-slate-700">
              <span>Invoice Ref: {confirmedPaymentRef}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">PAID</span>
            </div>
          </div>
        ) : stage1PendingOrder ? (
          <div className="text-center py-6 sm:py-8 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-amber-50">
              <Clock className="w-9 h-9" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-900">
              Status: Pending Verification
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-3">
              Khalti Payment Submitted
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
              Your subscription for <b>{plan.name}</b> is saved as <b>Pending Verification</b> and is{' '}
              <b>NOT active yet</b>. The Admin will manually confirm that NPR{' '}
              <b>{stage1PendingOrder.amountNPR.toLocaleString('en-IN')}</b> arrived in Khalti account{' '}
              <b>{stage1PendingOrder.receiverAccountName}</b> before activating your subscription.
            </p>

            <div className="mt-5 max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Payment Reference ID:</span>
                <span className="font-mono font-bold text-slate-900">{stage1PendingOrder.purchaseOrderId}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Khalti Display Name:</span>
                <span className="font-bold text-purple-800">{stage1PendingOrder.receiverAccountName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Subscription Price:</span>
                <span className="font-bold text-emerald-700">
                  NPR {stage1PendingOrder.amountNPR.toLocaleString('en-IN')} (${stage1PendingOrder.amountUSD})
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Khalti Transaction ID:</span>
                <span className="font-mono font-bold text-slate-900">{stage1PendingOrder.transactionReference}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Submitted At:</span>
                <span className="text-slate-700">
                  {new Date(stage1PendingOrder.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>
              {stage1PendingOrder.screenshotUrl && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
                  <span className="text-slate-500">Supporting Screenshot:</span>
                  <PrivatePaymentScreenshot
                    src={stage1PendingOrder.screenshotUrl}
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black cursor-pointer"
            >
              Done · Await Admin Confirmation
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="border-b border-slate-200 pb-4 mb-4 sm:mb-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-700 mb-1">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Enterprise Billing & Secure Checkout</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">
                Complete Your Subscription
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Access for <b>{plan.name}</b> · Unlocks <b>{brandCategoryInfo?.brandName || (selectedBrandCategory !== 'all' ? selectedBrandCategory : plan.targetCategory) || 'Selected Brand'}</b> models only (1 subscription = 1 brand)
              </p>
            </div>

            {/* Plan Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 mb-4 sm:mb-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Selected Plan</span>
                  <div className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>{plan.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                      {billingCycle === 'yearly' ? '1-Year Plan (30% OFF)' : 'Monthly'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Single Brand Access:{' '}
                    <b className="text-indigo-900">
                      {brandCategoryInfo?.brandName || (selectedBrandCategory !== 'all' ? selectedBrandCategory : plan.targetCategory) || 'Selected Brand'}
                    </b>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Exact Price</span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900">
                    ${totalUSD}{' '}
                    <span className="text-xs font-medium text-slate-500 font-mono">
                      / {billingCycle === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700">
                    NPR {totalNPR.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {billingCycle === 'yearly' && (
                <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-emerald-700 font-bold flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Annual Bonuses Included: 50 Extra Video Auditions + 2 Months Free!</span>
                  </div>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-md text-[10px]">SAVED $72</span>
                </div>
              )}
            </div>

            {/* Payment Method Tabs */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-700 block mb-2">Select Payment Method:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('khalti_qr');
                    setPaymentError(null);
                  }}
                  className={`py-2.5 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    paymentMethod === 'khalti_qr'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs ring-2 ring-purple-500/20'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-purple-700" />
                  <span className="text-center leading-tight">Pay with Khalti QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('bank');
                    setPaymentError(null);
                  }}
                  className={`py-2.5 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    paymentMethod === 'bank'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-center leading-tight">Direct Bank Wire</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('online');
                    setPaymentError(null);
                  }}
                  className={`py-2.5 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    paymentMethod === 'online'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span className="text-center leading-tight">Online Wallets</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('card');
                    setPaymentError(null);
                  }}
                  className={`py-2.5 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    paymentMethod === 'card'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span className="text-center leading-tight">Credit Card</span>
                </button>
              </div>
            </div>

            {/* PAYMENT METHOD 0: Manual Khalti QR */}
            {paymentMethod === 'khalti_qr' && (
              <div className="space-y-3.5 p-3.5 sm:p-4 bg-purple-50/40 border border-purple-200 rounded-2xl animate-in fade-in text-xs">
                {/* Price & Unique Payment Reference Bar */}
                <div className="bg-white rounded-xl border border-purple-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-700 block">
                      Unique Payment Reference / Order ID
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {stage1PurchaseOrderId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(stage1PurchaseOrderId, 'order_ref')}
                        className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedField === 'order_ref' ? (
                          <Check className="w-3 h-3 text-emerald-700" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedField === 'order_ref' ? 'Copied' : 'Copy Reference'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      Exact Subscription Price
                    </span>
                    <span className="font-black text-emerald-700 text-base">
                      NPR {totalNPR.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1">(${totalUSD})</span>
                  </div>
                </div>

                {/* QR Image + Instructions (Mobile-Friendly Stack -> 2-Col Desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-white p-2 rounded-xl border border-purple-200 shadow-xs w-44 sm:w-48">
                      <img
                        src={resolveAssetUrl(khaltiConfig.qrSettings.qrImagePath)}
                        alt={`Official Khalti QR code for ${khaltiConfig.qrSettings.accountHolderName}`}
                        className="w-full h-auto rounded-lg object-contain"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100">
                      <span className="text-[10px] text-purple-700 uppercase font-black block">
                        Khalti Account Display Name
                      </span>
                      <span className="font-black text-slate-900 text-sm">
                        {khaltiConfig.qrSettings.accountHolderName}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-700 leading-relaxed">
                      <div className="font-extrabold text-slate-900">Payment Instructions:</div>
                      <p>
                        1. Open your <b>Khalti</b> app and scan the QR code shown here.
                      </p>
                      <p>
                        2. Enter the <b>exact payment amount of NPR {totalNPR.toLocaleString('en-IN')}</b> when scanning the QR.
                      </p>
                      <p>
                        3. Copy your Payment Reference (<span className="font-mono font-bold">{stage1PurchaseOrderId}</span>) into Khalti remarks if available, complete the transfer, and submit your Khalti Transaction ID below.
                      </p>
                    </div>
                  </div>
                </div>

                {khaltiConfig.qrSettings.stage1Notice && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                    {khaltiConfig.qrSettings.stage1Notice}
                  </div>
                )}

                {/* Manual Payment Submission Form + Client-Side Receipt Scanner */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
                  <div className="font-black text-slate-900 text-xs flex items-center justify-between gap-2 flex-wrap">
                    <span>Submit & Scan Payment Confirmation</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      Dual Receipt & Input Check
                    </span>
                  </div>

                  {/* Step 1 inside form: Scan Khalti Screenshot to Auto-Extract Transaction ID */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Scan Khalti Payment Screenshot (Auto-Extracts Transaction ID & Checks Receipt)
                    </label>
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
                        className="w-full py-3.5 px-3 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-50 text-purple-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
                      >
                        {isUploadingScreenshot ? (
                          <>
                            <Loader2 className="w-4 h-4 text-purple-700 animate-spin" />
                            <span>Uploading Screenshot Image...</span>
                          </>
                        ) : (
                          <>
                            <ScanLine className="w-4 h-4 text-purple-700" />
                            <span>Upload & Scan Khalti Screenshot to Auto-Extract Numeric Txn ID</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                              <img
                                src={screenshotPreviewUrl}
                                alt="Uploaded receipt preview"
                                className={`w-full h-full object-cover transition-opacity ${
                                  isUploadingScreenshot ? 'opacity-45 blur-[1px]' : 'opacity-100'
                                }`}
                              />
                              {isUploadingScreenshot && (
                                <div className="absolute inset-0 bg-slate-900/45 flex flex-col items-center justify-center text-white">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span className="truncate">{screenshotFile?.name || 'Receipt image'}</span>
                              </div>
                              <div className="text-[11px] flex items-center gap-1.5 flex-wrap mt-0.5">
                                {isUploadingScreenshot && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    Uploading image...
                                  </span>
                                )}
                                {!isUploadingScreenshot && uploadedScreenshotUrl && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Image uploaded
                                  </span>
                                )}
                                <span className="text-slate-500">
                                  {isScanningReceipt
                                    ? `${scanStatusText} (${scanProgress}%)`
                                    : scanResult?.extractedTxnId
                                    ? `Auto-extracted Numeric ID: ${scanResult.extractedTxnId}`
                                    : scanStatusText || 'Scanned — review detected details below'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {screenshotFile && !isScanningReceipt && !isUploadingScreenshot && (
                              <button
                                type="button"
                                onClick={() => runReceiptScan(screenshotFile, khaltiConfig.qrSettings.accountHolderName)}
                                className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[11px] cursor-pointer"
                                title="Re-scan screenshot"
                              >
                                Re-scan
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleRemoveScreenshot}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Remove screenshot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {isUploadingScreenshot && (
                          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                              <span className="flex items-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                <span>Uploading payment screenshot securely...</span>
                              </span>
                              <span className="text-[10px] uppercase tracking-wider text-indigo-700">Uploading</span>
                            </div>
                            <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                              <div className="h-full w-2/3 bg-indigo-600 rounded-full animate-pulse" />
                            </div>
                          </div>
                        )}

                        {isScanningReceipt && (
                          <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-700 transition-all duration-200"
                              style={{ width: `${scanProgress}%` }}
                            />
                          </div>
                        )}

                        {scanResult && scanResult.candidateTxnIds.length > 1 && (
                          <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-500">Detected numeric codes:</span>
                            {scanResult.candidateTxnIds.slice(0, 4).map((cand) => (
                              <button
                                key={cand}
                                type="button"
                                onClick={() => {
                                  setKhaltiTxnRef(cand);
                                  setPaymentError(null);
                                }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border cursor-pointer ${
                                  khaltiTxnRef.trim() === cand
                                    ? 'bg-purple-700 text-white border-purple-700'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-purple-400'
                                }`}
                              >
                                {cand}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Numeric Transaction ID & Exact Amount Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Khalti Transaction ID (Numeric) *
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">6–20 digits</span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="e.g. 4598217341 (numbers only)"
                        value={khaltiTxnRef}
                        onChange={(e) => {
                          setKhaltiTxnRef(e.target.value);
                          setPaymentError(null);
                        }}
                        className={`w-full bg-slate-50 rounded-xl py-2.5 px-3 text-xs text-slate-900 border outline-none focus:ring-2 font-mono ${
                          cleanEnteredRef && !txnValidation.valid
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/40'
                            : cleanEnteredRef && txnValidation.valid
                            ? 'border-emerald-400 focus:ring-emerald-500'
                            : 'border-slate-200 focus:ring-purple-500'
                        }`}
                      />
                      {cleanEnteredRef && !txnValidation.valid && (
                        <p className="mt-1 text-[10px] font-semibold text-rose-700">
                          {txnValidation.reason}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Exact Amount Paid (NPR) *
                      </label>
                      <input
                        type="number"
                        placeholder={String(totalNPR)}
                        value={confirmAmountNPR}
                        onChange={(e) => {
                          setConfirmAmountNPR(e.target.value);
                          setPaymentError(null);
                        }}
                        className="w-full bg-slate-50 rounded-xl py-2.5 px-3 text-xs text-slate-900 border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Dual Verification Check Panel (Checks BOTH Screenshot Scan & Form Inputs) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                        {hasHardValidationError ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>Payment Detection Check (Receipt Scan + Entered Data)</span>
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          hasHardValidationError
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {hasHardValidationError ? 'BLOCKED — FIX ERRORS' : 'CHECKS OK'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {dualChecks.map((chk) => (
                        <div
                          key={chk.id}
                          className="flex items-start justify-between gap-2 text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800">{chk.label}: </span>
                            <span
                              className={
                                chk.status === 'fail'
                                  ? 'text-rose-700 font-semibold'
                                  : chk.status === 'warn'
                                  ? 'text-amber-700'
                                  : chk.status === 'pass'
                                  ? 'text-emerald-700'
                                  : 'text-slate-500'
                              }
                            >
                              {chk.message}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                              chk.status === 'pass'
                                ? 'bg-emerald-100 text-emerald-800'
                                : chk.status === 'fail'
                                ? 'bg-rose-100 text-rose-800'
                                : chk.status === 'warn'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {chk.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 text-purple-700 shrink-0 mt-0.5" />
                    <span>
                      Submission sets status to <b>Pending Verification</b>. Wrong amounts or mismatched receipt details are blocked before sending. Subscriptions activate only after Admin confirms payment arrived in the Khalti account.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENT METHOD 1: Bank Wire Details */}
            {paymentMethod === 'bank' && (
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
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
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Beneficiary Entity</span>
                        <span className="font-bold text-slate-900">dot Technologies Pvt. Ltd.</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                        Corporate Billing
                      </span>
                    </div>

                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg border border-indigo-200 flex items-center justify-center shadow-xs">
                          <QrCode className="w-6 h-6 text-indigo-900" />
                        </div>
                        <div>
                          <div className="font-bold text-indigo-950 text-xs">Corporate Invoice / Khalti QR</div>
                          <div className="text-[11px] text-indigo-700">
                            Switch to <b>Pay with Khalti QR</b> for direct QR settlement
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-1 bg-white font-mono font-bold text-indigo-900 rounded-lg border border-indigo-200">
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

                    <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Beneficiary Name</span>
                        <span className="font-bold text-slate-900">dot Global Inc.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('dot Global Inc.', 'ben_name')}
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedField === 'ben_name' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">ABA / Routing Number</span>
                        <span className="font-mono font-bold text-slate-800">021000021</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">SWIFT / BIC Code</span>
                        <span className="font-mono font-bold text-slate-800">CHASUS33</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAYMENT METHOD 2: Online Wallets */}
            {paymentMethod === 'online' && (
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
                <label className="text-xs font-bold text-slate-700 block">Choose Digital Wallet:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'esewa', name: 'eSewa', icon: '🟢' },
                    { id: 'khalti_qr', name: 'Khalti QR', icon: '🟣' },
                    { id: 'connectips', name: 'ConnectIPS', icon: '🔵' },
                    { id: 'fonepay', name: 'Fonepay', icon: '🔴' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        if (w.id === 'khalti_qr') {
                          setPaymentMethod('khalti_qr');
                          setPaymentError(null);
                          return;
                        }
                        setSelectedOnlineWallet(w.id as 'esewa' | 'connectips' | 'fonepay');
                        setPaymentError(null);
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        selectedOnlineWallet === w.id
                          ? 'border-indigo-600 bg-white shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-base">{w.icon}</span>
                      <span>{w.name}</span>
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Merchant Account:</span>
                    <span className="font-mono font-bold text-slate-900">DOT_ENTERPRISE</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-slate-600">Amount Payable:</span>
                    <span className="font-bold text-emerald-700 text-sm">NPR {totalNPR.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENT METHOD 3: Credit Card */}
            {paymentMethod === 'card' && (
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>256-Bit SSL Encrypted Card Processing</span>
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
            )}

            {paymentError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={
                  isProcessing ||
                  (paymentMethod === 'khalti_qr' && (isUploadingScreenshot || isScanningReceipt))
                }
                className={`flex-1 py-3 px-5 rounded-xl text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 ${
                  paymentMethod === 'khalti_qr'
                    ? 'bg-purple-700 hover:bg-purple-800'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-300" />
                    <span>
                      {paymentMethod === 'khalti_qr'
                        ? 'Submitting Payment for Admin Verification...'
                        : 'Processing Payment...'}
                    </span>
                  </>
                ) : paymentMethod === 'khalti_qr' && isUploadingScreenshot ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                    <span>Uploading Screenshot Image...</span>
                  </>
                ) : paymentMethod === 'khalti_qr' && isScanningReceipt ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
                    <span>Scanning Receipt ({scanProgress}%)...</span>
                  </>
                ) : paymentMethod === 'khalti_qr' ? (
                  <>
                    <QrCode className="w-4 h-4 text-purple-200" />
                    <span>Submit Payment (Pending Verification)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>
                      Pay ${totalUSD} ({totalNPR.toLocaleString('en-IN')} NPR) & Activate Now
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
