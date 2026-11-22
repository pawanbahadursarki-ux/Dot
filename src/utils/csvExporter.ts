/**
 * CSV Exporter Utility for dot Admin
 * RFC-4180 compliant CSV generator with UTF-8 BOM for Microsoft Excel / Google Sheets compatibility.
 * Provides separate and combined export routines for manual record keeping.
 */

import { FeedbackItem, WithdrawalTransaction } from '../types';

/**
 * Escapes a cell value according to RFC 4180:
 * - Wrap in double quotes if it contains commas, quotes, or newlines
 * - Escape internal double quotes with double-quotes ("" -> ")
 */
export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Triggers a direct browser file download for CSV content with UTF-8 BOM
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  // UTF-8 BOM (\uFEFF) ensures Excel opens foreign characters and accents properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats a Date to ISO date-time string YYYY-MM-DD_HH-mm-ss for filenames
 */
export function getTimestampForFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

/**
 * Export Feedback Database to CSV
 */
export function exportFeedbackToCsv(feedbackList: FeedbackItem[]): { filename: string; rowCount: number } {
  const headers = [
    'Feedback ID',
    'Date / Time',
    'Reviewer Name',
    'Reviewer Email',
    'Reviewer Age',
    'Reviewer City',
    'Phone Model',
    'Phone Brand',
    'Brand Category Folder',
    'Star Rating (1-5)',
    'Sentiment Score (%)',
    'Sentiment Tone',
    'Feedback Category',
    'What Reviewer Liked (Strengths)',
    'What Reviewer Disliked (Issues/Defects)',
    'Ergonomic Comfort',
    'Suggested Improvement',
    'Video Duration (Seconds)',
    'Reward Amount (NPR)',
    'Moderation Status',
    'Moderation Reason',
    'Moderated By',
    'Moderated At',
    'Payout Status',
    'Verified Device Hardware',
    'Video File / Stream URL',
  ];

  const rows = feedbackList.map((item) => {
    return [
      item.id,
      item.createdAt || item.time || new Date().toISOString(),
      item.user,
      (item as any).userEmail || '',
      item.age || '',
      item.city || 'Nepal',
      item.phoneName || item.phone,
      item.phoneBrand || '',
      item.brandFolder || '',
      item.rating,
      item.sentimentScore ?? 85,
      item.sentimentTone || 'Constructive',
      (item as any).feedbackCategory || 'Video Review',
      item.like || '',
      item.dislike || '',
      item.comfort || '',
      item.improve || '',
      item.seconds || 60,
      item.rewardAmount || 150,
      item.moderationStatus || 'approved',
      item.moderationReason || '',
      item.moderatedBy || 'Platform Admin',
      item.moderatedAt || '',
      item.payoutStatus || 'credited',
      item.verifiedDevice || '🔒 Verified Android Hardware',
      item.videoUrl || '',
    ].map(escapeCsvCell).join(',');
  });

  const csvContent = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const filename = `dot_Video_Reviews_${getTimestampForFilename()}.csv`;
  downloadCsvFile(filename, csvContent);

  return { filename, rowCount: rows.length };
}

/**
 * Export Financial Transactions & Withdrawals to CSV
 */
export function exportTransactionsToCsv(
  transactions: WithdrawalTransaction[] = [],
  withdrawals: any[] = []
): { filename: string; rowCount: number } {
  const headers = [
    'Record ID',
    'Record Type',
    'Date & Time',
    'User / Account Name',
    'User Email / Phone',
    'Description / Title',
    'Payment Gateway / Method',
    'Account Number / Dest',
    'Gross Amount',
    'Currency',
    'Company Fee',
    'Net Payout / Total Charge',
    'Transaction Status',
    'Reference ID / UTR',
    'Admin Decision By',
    'Rejection Reason',
  ];

  const rows: string[] = [];

  // 1. Withdrawal Requests
  withdrawals.forEach((w) => {
    rows.push([
      w.id,
      'Creator Withdrawal',
      w.requestedAt || new Date().toISOString(),
      w.user,
      w.userEmail || w.accountNumber || '',
      `Creator Wallet Cashout (${w.gateway})`,
      w.gateway || 'Mobile Wallet',
      w.accountNumber || '',
      w.amountNPR,
      'NPR',
      w.companyFeeNPR || 0,
      w.netPayoutNPR || w.amountNPR,
      w.status?.toUpperCase() || 'PENDING',
      w.referenceId || 'N/A',
      w.decidedBy || 'Admin System',
      w.rejectionReason || '',
    ].map(escapeCsvCell).join(','));
  });

  // 2. Initial / Stored Ledger Transactions
  transactions.forEach((tx) => {
    rows.push([
      tx.id,
      'Ledger Entry',
      tx.when || new Date().toISOString(),
      'Community Creator',
      tx.accountNumber || '',
      tx.title || 'Platform Review Credit',
      tx.gateway || 'Internal Wallet',
      tx.accountNumber || 'Wallet',
      tx.amount,
      tx.currency || 'NPR',
      tx.companyProcessingFee || 0,
      tx.totalCompanyCharge || tx.amount,
      tx.status?.toUpperCase() || 'COMPLETED',
      tx.referenceId || 'N/A',
      'System Automated',
      '',
    ].map(escapeCsvCell).join(','));
  });

  const csvContent = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const filename = `dot_Financial_Transactions_${getTimestampForFilename()}.csv`;
  downloadCsvFile(filename, csvContent);

  return { filename, rowCount: rows.length };
}

/**
 * Export All Combined Records (Summary + Feedback + Transactions) for Comprehensive Manual Record Keeping
 */
export function exportCombinedAuditCsv(
  feedbackList: FeedbackItem[],
  transactions: WithdrawalTransaction[] = [],
  withdrawals: any[] = [],
  registeredUsers: any[] = []
): { filename: string; rowCount: number } {
  const generatedAt = new Date().toLocaleString();
  const totalApproved = feedbackList.filter(f => f.moderationStatus === 'approved').length;
  const totalPending = feedbackList.filter(f => f.moderationStatus === 'pending').length;
  const totalRejected = feedbackList.filter(f => f.moderationStatus === 'rejected').length;
  const totalPaidOutNPR = feedbackList
    .filter(f => f.moderationStatus === 'approved')
    .reduce((s, f) => s + (f.rewardAmount || 150), 0);

  const lines: string[] = [
    '# =====================================================================',
    '# DOT ENTERPRISE COMPREHENSIVE AUDIT & RECORD ARCHIVE',
    `# Generated At: ${generatedAt}`,
    '# Compliance: Manual Record Keeping, Tax Filing, Community Moderation',
    '# =====================================================================',
    '',
    '### EXECUTIVE PLATFORM SUMMARY ###',
    'Metric,Value,Notes',
    `Total Video Reviews Recorded,${feedbackList.length},Smartphone community video submissions`,
    `Approved Reviews,${totalApproved},Verified and credited to reviewers`,
    `Pending Reviews,${totalPending},Currently in moderation queue`,
    `Disapproved / Rejected Reviews,${totalRejected},Failed quality or audio guidelines`,
    `Total Creator Rewards Paid (NPR),Rs. ${totalPaidOutNPR},Disbursed via eSewa / Khalti / ConnectIPS`,
    `Total Registered Accounts,${registeredUsers.length},Community creators and enterprise administrators`,
    `Total Financial Ledger Events,${transactions.length + withdrawals.length},Combined payouts and wallet debits`,
    '',
    '### SECTION 1: VERIFIED SMARTPHONE VIDEO REVIEWS DATABASE ###',
  ];

  // Feedback Header & Rows
  const feedbackHeaders = [
    'Feedback ID',
    'Timestamp',
    'Reviewer',
    'Email',
    'Phone Model',
    'Brand',
    'Rating',
    'Sentiment %',
    'Tone',
    'Category',
    'Strengths (Like)',
    'Defects (Dislike)',
    'Comfort',
    'Fix Suggestion',
    'Duration (s)',
    'Reward (NPR)',
    'Moderation Status',
    'Moderation Reason',
    'Hardware Device',
  ];
  lines.push(feedbackHeaders.map(escapeCsvCell).join(','));

  feedbackList.forEach((item) => {
    lines.push([
      item.id,
      item.createdAt || item.time || '',
      item.user,
      (item as any).userEmail || '',
      item.phoneName || item.phone,
      item.phoneBrand || '',
      item.rating,
      item.sentimentScore ?? 85,
      item.sentimentTone || '',
      (item as any).feedbackCategory || 'Review',
      item.like || '',
      item.dislike || '',
      item.comfort || '',
      item.improve || '',
      item.seconds || 60,
      item.rewardAmount || 150,
      item.moderationStatus || 'approved',
      item.moderationReason || '',
      item.verifiedDevice || 'Verified Android',
    ].map(escapeCsvCell).join(','));
  });

  lines.push('');
  lines.push('### SECTION 2: FINANCIAL TRANSACTIONS & WITHDRAWAL PAYOUTS ###');

  const txnHeaders = [
    'Txn ID',
    'Type',
    'Date & Time',
    'Recipient / User',
    'Gateway',
    'Account / Dest',
    'Gross Amount',
    'Currency',
    'Fee',
    'Net Payout',
    'Status',
    'Reference ID',
    'Admin Decided By',
    'Rejection Reason',
  ];
  lines.push(txnHeaders.map(escapeCsvCell).join(','));

  withdrawals.forEach((w) => {
    lines.push([
      w.id,
      'Creator Withdrawal',
      w.requestedAt || '',
      w.user,
      w.gateway || 'eSewa',
      w.accountNumber || '',
      w.amountNPR,
      'NPR',
      w.companyFeeNPR || 0,
      w.netPayoutNPR || w.amountNPR,
      w.status?.toUpperCase() || 'PENDING',
      w.referenceId || 'N/A',
      w.decidedBy || 'Admin',
      w.rejectionReason || '',
    ].map(escapeCsvCell).join(','));
  });

  transactions.forEach((tx) => {
    lines.push([
      tx.id,
      'Ledger Credit',
      tx.when || '',
      'Community Creator',
      tx.gateway || 'Platform Reward',
      tx.accountNumber || 'Wallet',
      tx.amount,
      tx.currency || 'NPR',
      tx.companyProcessingFee || 0,
      tx.totalCompanyCharge || tx.amount,
      tx.status?.toUpperCase() || 'COMPLETED',
      tx.referenceId || 'N/A',
      'System',
      '',
    ].map(escapeCsvCell).join(','));
  });

  const fullContent = lines.join('\r\n');
  const filename = `dot_Complete_Audit_Record_${getTimestampForFilename()}.csv`;
  downloadCsvFile(filename, fullContent);

  return { filename, rowCount: feedbackList.length + withdrawals.length + transactions.length };
}
