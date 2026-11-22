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
  qrDetected: boolean;
  qrRawText: string | null;
  qrExtractedTxnId: string | null;
  scanSource: 'qr' | 'ocr' | 'qr+ocr' | 'none';
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
    /(?:transaction\s*(?:id|code|no|number|ref(?:erence)?)|txn\s*(?:id|code|ref)|reference\s*(?:id|code|no)|ref\s*id|pidx|idx)\s*[:#=\-]?\s*([0-9OlI\s-]{6,24})/gi,
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

function extractTransactionIdsFromQrPayload(qrText: string, expectedAmountNPR?: number): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const expectedPriceStr = expectedAmountNPR ? String(Math.round(expectedAmountNPR)) : '';

  const pushCandidate = (value: unknown, fromTxnKey = false) => {
    if (typeof value !== 'string' && typeof value !== 'number') return;
    const raw = String(value).trim();
    if (!raw) return;
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length < 6 || digitsOnly.length > 20) return;
    if (expectedPriceStr && digitsOnly === expectedPriceStr) return;
    if (!fromTxnKey && /^(?:97|98)\d{8}$/.test(digitsOnly)) return;
    const validation = validateKhaltiNumericTxnId(digitsOnly);
    if (!validation.valid) return;
    if (!seen.has(validation.normalized)) {
      seen.add(validation.normalized);
      candidates.push(validation.normalized);
    }
  };

  // 1. Exact numeric QR payload (e.g., QR encodes the Transaction ID directly)
  const trimmed = qrText.trim();
  if (/^\d{6,20}$/.test(trimmed)) {
    pushCandidate(trimmed, true);
  }

  // 2. JSON payload inside QR
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      const priorityKeys = new Set([
        'txnid',
        'txn_id',
        'transactionid',
        'transaction_id',
        'transactioncode',
        'transaction_code',
        'refid',
        'ref_id',
        'reference',
        'referenceid',
        'pidx',
        'idx',
        'tid',
      ]);
      const visit = (node: unknown, depth = 0) => {
        if (!node || depth > 5) return;
        if (Array.isArray(node)) {
          node.forEach((item) => visit(item, depth + 1));
          return;
        }
        if (typeof node === 'object') {
          for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
            const lowerKey = k.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (priorityKeys.has(lowerKey) || /txn|transaction|ref|pidx|idx/.test(lowerKey)) {
              pushCandidate(v, true);
            }
            if (typeof v === 'object' && v !== null) {
              visit(v, depth + 1);
            }
          }
        }
      };
      visit(parsed);
    } catch {
      // Not valid JSON; continue with URL/text extractors
    }
  }

  // 3. URL / query-string payload inside QR
  try {
    const queryStr = trimmed.includes('?') ? trimmed.split('?').slice(1).join('?') : '';
    const params = queryStr ? new URLSearchParams(queryStr) : null;
    if (params) {
      const paramKeys = ['txnId', 'txn_id', 'transactionId', 'transaction_id', 'transaction_code', 'refId', 'ref', 'reference', 'pidx', 'idx', 'id'];
      for (const key of paramKeys) {
        const val = params.get(key) || params.get(key.toLowerCase());
        if (val) pushCandidate(val, true);
      }
      params.forEach((val, key) => {
        if (/txn|transaction|ref|pidx|idx/i.test(key)) {
          pushCandidate(val, true);
        }
      });
    }
  } catch {
    // Ignore malformed query strings
  }

  // 4. Generic labeled & standalone numeric tokens in QR text
  for (const cand of extractTransactionIds(trimmed, expectedAmountNPR)) {
    pushCandidate(cand, false);
  }

  return candidates;
}

function extractAmountFromQrPayload(qrText: string, expectedNPR?: number): number | null {
  const trimmed = qrText.trim();
  const normalizeAmount = (rawNum: unknown): number | null => {
    const num = Number(String(rawNum ?? '').replace(/,/g, '').trim());
    if (!Number.isFinite(num) || num <= 0 || num >= 1_000_000_000) return null;
    // Handle Khalti paisa (x100) if exact paisa matches expectedNPR * 100
    if (expectedNPR && Math.round(num) === Math.round(expectedNPR * 100)) {
      return Math.round(expectedNPR);
    }
    if (num < 10_000_000) return Math.round(num);
    return null;
  };

  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      for (const key of ['amount', 'total_amount', 'totalAmount', 'paidAmount', 'amt', 'paisa']) {
        if (obj[key] !== undefined && obj[key] !== null) {
          if (key === 'paisa' || key === 'amount_in_paisa') {
            const val = Number(obj[key]);
            if (Number.isFinite(val) && val > 0) return Math.round(val / 100);
          }
          const normalized = normalizeAmount(obj[key]);
          if (normalized !== null) return normalized;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  try {
    if (trimmed.includes('?')) {
      const params = new URLSearchParams(trimmed.split('?').slice(1).join('?'));
      for (const key of ['amount', 'total_amount', 'amt', 'a']) {
        const val = params.get(key);
        if (val) {
          const normalized = normalizeAmount(val);
          if (normalized !== null) return normalized;
        }
      }
    }
  } catch {
    // Ignore query parse errors
  }

  return extractAmountNPR(trimmed, expectedNPR);
}

async function scanQrFromImageFile(file: File): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
    return null;
  }

  const tempId = `dot-qr-scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const container = document.createElement('div');
  container.id = tempId;
  container.setAttribute('aria-hidden', 'true');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '-99999px';
  container.style.width = '1px';
  container.style.height = '1px';
  container.style.overflow = 'hidden';
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  document.body.appendChild(container);

  let html5Qr: { scanFile: (imageFile: File, showImage?: boolean) => Promise<string>; clear: () => void } | null = null;
  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    html5Qr = new Html5Qrcode(tempId, false);
    const decoded = await html5Qr.scanFile(file, false);
    const cleaned = typeof decoded === 'string' ? decoded.trim() : '';
    return cleaned || null;
  } catch {
    // Plain Khalti screenshot receipts without an embedded QR code naturally fail QR decode; fall back silently to OCR.
    return null;
  } finally {
    try {
      html5Qr?.clear();
    } catch {
      // Ignore clear errors
    }
    container.remove();
  }
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
  options?.onProgress?.(5, 'Scanning screenshot QR code & preparing receipt OCR...');

  const qrPromise = scanQrFromImageFile(file);
  const ocrPrepPromise = Promise.all([
    preprocessImageForOcr(file),
    import('tesseract.js'),
    hasLocalExpressOcrBackend(),
  ]);

  const [qrSettled, ocrPrepSettled] = await Promise.allSettled([qrPromise, ocrPrepPromise]);
  const qrRawText = qrSettled.status === 'fulfilled' ? qrSettled.value : null;
  const qrDetected = Boolean(qrRawText);
  const qrCandidates = qrRawText
    ? extractTransactionIdsFromQrPayload(qrRawText, options?.expectedAmountNPR)
    : [];
  const qrExtractedTxnId = qrCandidates[0] || null;
  const qrAmountNPR = qrRawText ? extractAmountFromQrPayload(qrRawText, options?.expectedAmountNPR) : null;

  if (qrExtractedTxnId) {
    options?.onProgress?.(35, `QR code Transaction ID detected (${qrExtractedTxnId}) — verifying receipt text...`);
  }

  let rawText = '';
  let confidence = 0;

  if (ocrPrepSettled.status === 'fulfilled') {
    const [canvas, { default: Tesseract }, useLocalWorker] = ocrPrepSettled.value;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let worker: Tesseract.Worker | null = null;

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
            const pct = Math.min(98, Math.max(qrExtractedTxnId ? 40 : 15, Math.round(20 + info.progress * 78)));
            options?.onProgress?.(
              pct,
              qrExtractedTxnId
                ? `QR Txn ID ${qrExtractedTxnId} found — checking receipt details...`
                : 'Scanning Khalti screenshot text & QR...'
            );
          } else if (info.status && !qrExtractedTxnId) {
            options?.onProgress?.(
              14,
              useLocalWorker ? 'Initializing local receipt scanner...' : 'Initializing browser receipt scanner...'
            );
          }
        },
        errorHandler: () => {
          // Handled cleanly by promise rejection / QR fallback
        },
      });

      const result = await worker.recognize(canvas);
      rawText = String(result?.data?.text || '').trim();
      confidence = Math.round(Number(result?.data?.confidence || 0));
    } catch {
      // If OCR fails but QR succeeded, allow QR result to continue seamlessly
      if (!qrDetected) {
        throw new Error('Failed to scan Khalti screenshot.');
      }
    } finally {
      if (worker) {
        await worker.terminate().catch(() => {});
      }
    }
  } else if (!qrDetected) {
    throw new Error('Failed to prepare receipt image for scanning.');
  }

  options?.onProgress?.(100, qrExtractedTxnId ? 'QR code & receipt scan complete' : 'Receipt scan complete');

  const combinedText = [qrRawText || '', rawText].filter(Boolean).join('\n');
  const normalizedUpper = combinedText.toUpperCase();

  const ocrCandidates = extractTransactionIds(rawText, options?.expectedAmountNPR);
  const candidateTxnIds = Array.from(new Set([...qrCandidates, ...ocrCandidates]));
  const extractedTxnId = qrExtractedTxnId || ocrCandidates[0] || null;
  const extractedAmountNPR = extractAmountNPR(rawText, options?.expectedAmountNPR) ?? qrAmountNPR;

  const khaltiCueWords = ['KHALTI', 'IME', 'TRANSACTION', 'PAYMENT', 'PAID', 'SUCCESS', 'NPR', 'RS', 'RECEIPT', 'AMOUNT'];
  const cueHits = khaltiCueWords.filter((w) => normalizedUpper.includes(w));
  const isKhaltiReceipt =
    cueHits.length >= 2 ||
    (cueHits.length >= 1 && Boolean(extractedTxnId || extractedAmountNPR)) ||
    (qrDetected && Boolean(qrExtractedTxnId));

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

  const scanSource: ScannedKhaltiReceipt['scanSource'] =
    qrDetected && rawText ? 'qr+ocr' : qrDetected ? 'qr' : rawText ? 'ocr' : 'none';

  const warnings: string[] = [];
  if (!combinedText || (combinedText.length < 10 && !qrExtractedTxnId)) {
    warnings.push('No readable QR code or text detected in this image. Upload a clearer Khalti transaction receipt screenshot.');
  } else if (!isKhaltiReceipt) {
    warnings.push('Image does not look like a clear Khalti payment receipt.');
  }
  if (!extractedTxnId) {
    warnings.push('Could not auto-detect a numeric Khalti Transaction ID from QR or screenshot text. Enter the 6–20 digit numeric ID manually.');
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
    qrDetected,
    qrRawText,
    qrExtractedTxnId,
    scanSource,
    warnings,
  };
}
