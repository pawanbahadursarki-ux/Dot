import type Tesseract from 'tesseract.js';

export interface ScannedKhaltiReceipt {
  rawText: string;
  extractedTxnId: string | null;
  candidateTxnIds: string[];
  extractedAmountNPR: number | null;
  isKhaltiReceipt: boolean;
  recipientDetected: string | null;
  recipientMatchesExpected: boolean | null;
  confidence: number;
  warnings: string[];
}

export interface DualCheckItem {
  id: string;
  label: string;
  source: 'Screenshot Scan' | 'Form Input' | 'Cross-Check';
  status: 'pass' | 'fail' | 'warn' | 'pending';
  message: string;
}

const DUMMY_TXN_PATTERNS = new Set([
  '1234',
  '12345',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '012345',
  '0123456',
  '01234567',
  '012345678',
  '0123456789',
  '987654',
  '9876543',
  '98765432',
  '987654321',
  '0000',
  '00000',
  '000000',
  'TEST',
  'TESTING',
  'DEMO',
  'FAKE',
  'ABCD',
  'NONE',
  'NULL',
  'SAMPLE',
]);

export function isPlaceholderTxnId(txnId: string): boolean {
  const clean = txnId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length < 4) return true;
  if (DUMMY_TXN_PATTERNS.has(clean)) return true;
  if (/^(.)\1+$/.test(clean)) return true;
  return false;
}

export interface KhaltiTxnValidationResult {
  valid: boolean;
  normalized: string;
  reason?: string;
}

/**
 * Validates that the provided Transaction ID follows the expected Khalti numeric format:
 * - Digits only (0-9), no letters, spaces, or punctuation
 * - 6 to 20 digits long
 * - Not a repeated-digit or sequential placeholder
 */
export function validateKhaltiNumericTxnId(txnId: string): KhaltiTxnValidationResult {
  const trimmed = txnId.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      reason: 'Enter your numeric Khalti Transaction ID (6–20 digits).',
    };
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      reason: 'Invalid Khalti format: Transaction ID must be numeric digits only (0–9, no letters or spaces).',
    };
  }
  if (trimmed.length < 6 || trimmed.length > 20) {
    return {
      valid: false,
      normalized: trimmed,
      reason: 'Invalid Khalti format: Numeric Transaction ID must be 6 to 20 digits long.',
    };
  }
  if (DUMMY_TXN_PATTERNS.has(trimmed) || /^(\d)\1+$/.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      reason: 'Placeholder or sequential number rejected. Enter the real numeric Khalti Transaction ID.',
    };
  }
  return {
    valid: true,
    normalized: trimmed,
  };
}

async function preprocessImageForOcr(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read receipt image for scanning.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file could not be decoded as an image.'));
      img.onload = () => {
        const minTargetWidth = 1000;
        const maxTargetWidth = 1800;
        const w = img.width || 800;
        const h = img.height || 800;
        const scale =
          w < minTargetWidth
            ? Math.min(2.2, minTargetWidth / w)
            : w > maxTargetWidth
            ? maxTargetWidth / w
            : 1;

        const outW = Math.max(1, Math.round(w * scale));
        const outH = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable for receipt scanning.'));
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, 0, 0, outW, outH);

        // Increase contrast slightly on grayscale luminance for crisp OCR on Khalti receipts
        try {
          const imgData = ctx.getImageData(0, 0, outW, outH);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const contrasted = Math.max(0, Math.min(255, (lum - 128) * 1.35 + 128));
            data[i] = contrasted;
            data[i + 1] = contrasted;
            data[i + 2] = contrasted;
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {
          // Non-fatal if pixel read fails
        }

        resolve(canvas);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function extractTransactionIds(text: string, expectedAmountNPR?: number): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const expectedPriceStr = expectedAmountNPR ? String(Math.round(expectedAmountNPR)) : '';

  const addNumericCandidate = (raw: string, allowPhoneLength = false) => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length < 6 || digitsOnly.length > 20) return;
    if (expectedPriceStr && digitsOnly === expectedPriceStr) return;
    if (!allowPhoneLength && /^(?:97|98)\d{8}$/.test(digitsOnly)) return;
    if (DUMMY_TXN_PATTERNS.has(digitsOnly) || /^(\d)\1+$/.test(digitsOnly)) return;
    if (!seen.has(digitsOnly)) {
      seen.add(digitsOnly);
      candidates.push(digitsOnly);
    }
  };

  // 1. Explicit labeled lines in Khalti receipts (normalize common OCR O->0, I/l->1 on labeled digits)
  const labelPatterns = [
    /(?:transaction\s*(?:id|code|no|number|ref(?:erence)?)|txn\s*(?:id|code|ref)|reference\s*(?:id|code|no)|ref\s*id|pidx|idx)\s*[:#\-]?\s*([0-9OlI\s-]{6,24})/gi,
    /(?:trans(?:action)?\s*(?:id|code))\s*\n+\s*([0-9OlI\s-]{6,24})/gi,
  ];
  for (const regex of labelPatterns) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m[1]) {
        const normalizedOcr = m[1].replace(/[Oo]/g, '0').replace(/[Il]/g, '1');
        addNumericCandidate(normalizedOcr, true);
      }
    }
  }

  // 2. Standalone numeric Khalti transaction ID tokens (6–20 digits)
  const numericTokenRegex = /\b(\d{6,20})\b/g;
  let tm: RegExpExecArray | null;
  while ((tm = numericTokenRegex.exec(text)) !== null) {
    if (tm[1]) {
      addNumericCandidate(tm[1], false);
    }
  }

  return candidates;
}

function extractAmountNPR(text: string, expectedNPR?: number): number | null {
  const amounts: number[] = [];

  // Currency-prefixed amounts: NPR 2,159.00 / Rs. 2159 / NRS 2,159
  const currencyRegex = /(?:NPR|NRS|RS\.?|रु\.?)\s*[:\-]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;
  let m: RegExpExecArray | null;
  while ((m = currencyRegex.exec(text)) !== null) {
    const val = Math.round(Number(m[1].replace(/,/g, '')));
    if (Number.isFinite(val) && val > 0 && val < 10_000_000) {
      amounts.push(val);
    }
  }

  // Labeled amount lines
  const labelRegex = /(?:total\s*amount|amount\s*paid|paid\s*amount|amount|total)\s*[:\-]?\s*(?:NPR|NRS|RS\.?)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;
  while ((m = labelRegex.exec(text)) !== null) {
    const val = Math.round(Number(m[1].replace(/,/g, '')));
    if (Number.isFinite(val) && val > 0 && val < 10_000_000) {
      amounts.push(val);
    }
  }

  if (amounts.length === 0) return null;
  if (expectedNPR && amounts.includes(Math.round(expectedNPR))) {
    return Math.round(expectedNPR);
  }
  return amounts[0];
}

async function hasLocalExpressOcrBackend(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1500);
    const resp = await fetch(`${window.location.origin}/tesseract-worker/worker.min.js`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!resp.ok) return false;
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    return ct.includes('javascript') || ct.includes('ecmascript');
  } catch {
    return false;
  }
}

export async function scanKhaltiReceiptScreenshot(
  file: File,
  options?: {
    expectedAccountHolderName?: string;
    expectedAmountNPR?: number;
    onProgress?: (pct: number, statusText: string) => void;
  }
): Promise<ScannedKhaltiReceipt> {
  options?.onProgress?.(5, 'Preparing receipt image for OCR scan...');
  const [canvas, { default: Tesseract }, useLocalWorker] = await Promise.all([
    preprocessImageForOcr(file),
    import('tesseract.js'),
    hasLocalExpressOcrBackend(),
  ]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  let worker: Tesseract.Worker | null = null;
  let result: Tesseract.RecognizeResult;

  try {
    worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
      ...(useLocalWorker && origin
        ? {
            workerPath: `${origin}/tesseract-worker/worker.min.js`,
            corePath: `${origin}/tesseract-core`,
            langPath: `${origin}/api/ocr/tessdata`,
            workerBlobURL: false,
          }
        : {}),
      logger: (info) => {
        if (info.status === 'recognizing text' && typeof info.progress === 'number') {
          const pct = Math.min(98, Math.max(15, Math.round(20 + info.progress * 78)));
          options?.onProgress?.(pct, 'Scanning Khalti screenshot text...');
        } else if (info.status) {
          options?.onProgress?.(14, useLocalWorker ? 'Initializing local receipt OCR scanner...' : 'Initializing browser receipt OCR scanner...');
        }
      },
      errorHandler: () => {
        // Handled cleanly by promise rejection
      },
    });

    result = await worker.recognize(canvas);
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }

  options?.onProgress?.(100, 'Receipt scan complete');

  const rawText = String(result?.data?.text || '').trim();
  const normalizedUpper = rawText.toUpperCase();
  const confidence = Math.round(Number(result?.data?.confidence || 0));

  const candidateTxnIds = extractTransactionIds(rawText, options?.expectedAmountNPR);
  const extractedTxnId = candidateTxnIds[0] || null;
  const extractedAmountNPR = extractAmountNPR(rawText, options?.expectedAmountNPR);

  const khaltiCueWords = ['KHALTI', 'IME', 'TRANSACTION', 'PAYMENT', 'PAID', 'SUCCESS', 'NPR', 'RS', 'RECEIPT', 'AMOUNT'];
  const cueHits = khaltiCueWords.filter((w) => normalizedUpper.includes(w));
  const isKhaltiReceipt = cueHits.length >= 2 || (cueHits.length >= 1 && Boolean(extractedTxnId || extractedAmountNPR));

  let recipientDetected: string | null = null;
  let recipientMatchesExpected: boolean | null = null;
  const expectedHolder = (options?.expectedAccountHolderName || '').trim();
  if (expectedHolder) {
    const tokens = expectedHolder
      .toUpperCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    const matchedTokens = tokens.filter((t) => normalizedUpper.includes(t));
    if (matchedTokens.length === tokens.length && tokens.length > 0) {
      recipientDetected = expectedHolder;
      recipientMatchesExpected = true;
    } else if (matchedTokens.length > 0) {
      recipientDetected = matchedTokens.join(' ');
      recipientMatchesExpected = true;
    } else if (rawText.length > 20) {
      recipientMatchesExpected = false;
    }
  }

  const warnings: string[] = [];
  if (!rawText || rawText.length < 10) {
    warnings.push('No readable text detected in this image. Upload a clearer Khalti transaction receipt screenshot.');
  } else if (!isKhaltiReceipt) {
    warnings.push('Image does not look like a clear Khalti payment receipt.');
  }
  if (!extractedTxnId) {
    warnings.push('Could not auto-detect a numeric Khalti Transaction ID from screenshot. Enter the 6–20 digit numeric ID manually.');
  }
  if (
    options?.expectedAmountNPR &&
    extractedAmountNPR !== null &&
    Math.round(extractedAmountNPR) !== Math.round(options.expectedAmountNPR)
  ) {
    warnings.push(
      `Screenshot amount (NPR ${extractedAmountNPR.toLocaleString('en-IN')}) does not match subscription price (NPR ${Math.round(
        options.expectedAmountNPR
      ).toLocaleString('en-IN')}).`
    );
  }
  if (recipientMatchesExpected === false && expectedHolder) {
    warnings.push(`Expected recipient "${expectedHolder}" was not detected on the scanned receipt.`);
  }

  return {
    rawText,
    extractedTxnId,
    candidateTxnIds,
    extractedAmountNPR,
    isKhaltiReceipt,
    recipientDetected,
    recipientMatchesExpected,
    confidence,
    warnings,
  };
}
