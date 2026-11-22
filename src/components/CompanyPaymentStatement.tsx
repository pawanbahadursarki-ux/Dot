import React, { useState, useMemo } from 'react';
import { 
  ArrowDownLeft, ArrowUpRight, DollarSign, Download, Filter, 
  Search, ShieldCheck, CheckCircle2, Calendar, Clock, CreditCard,
  Building2, Wallet, RefreshCw, Zap
} from 'lucide-react';
import { rs } from '../data/initialData';

import { AdminWithdrawalRequest, FeedbackItem } from '../types';
import { PaymentRecord } from '../services/firebaseService';

export interface PaymentStatementRecord {
  id: string;
  type: 'income' | 'spend';
  title: string;
  sourceOrRecipient: string;
  channel: 'eSewa' | 'Khalti' | 'ConnectIPS' | 'Stripe Card' | 'QR Code' | 'Bank Wire';
  amountUSD: number;
  amountNPR: number;
  dateTime: string;
  status: 'Settled' | 'Verified' | 'Completed';
  category: 'Subscription' | 'User Payout' | 'Brand Pass' | 'Platform Fee' | 'Merchant Comm.';
  referenceNo: string;
}

interface CompanyPaymentStatementProps {
  className?: string;
  payments?: PaymentRecord[];
  withdrawals?: AdminWithdrawalRequest[];
  feedbackList?: FeedbackItem[];
}

export const CompanyPaymentStatement: React.FC<CompanyPaymentStatementProps> = ({
  className = '',
  payments = [],
  withdrawals = [],
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'spend'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Derive ledger dynamically from real Firestore payments and withdrawals (starts $0.00 when empty)
  const statementRecords = useMemo<PaymentStatementRecord[]>(() => {
    const mapChannel = (raw: string): PaymentStatementRecord['channel'] => {
      const s = (raw || '').toLowerCase();
      if (s.includes('khalti')) return 'Khalti';
      if (s.includes('connectips')) return 'ConnectIPS';
      if (s.includes('qr')) return 'QR Code';
      if (s.includes('bank')) return 'Bank Wire';
      if (s.includes('esewa')) return 'eSewa';
      return 'Stripe Card';
    };

    const paymentRows: PaymentStatementRecord[] = payments.map((p) => {
      const amountUSD = Number(p.amountUSD || 0);
      const amountNPR = Number(p.amountNPR || Math.round(amountUSD * 133));
      return {
        id: p.id,
        type: 'income',
        title: `${p.planName || 'Subscription'} (${p.brandCategory === 'all' ? 'All Brands' : p.brandCategory || 'General'})`,
        sourceOrRecipient: p.payerName || p.uid,
        channel: mapChannel(p.gateway),
        amountUSD,
        amountNPR,
        dateTime: p.createdAt ? new Date(p.createdAt).toLocaleString() : 'Live',
        status: p.status === 'completed' ? 'Settled' : 'Verified',
        category: p.brandCategory === 'all' ? 'Subscription' : 'Brand Pass',
        referenceNo: p.referenceId || p.id,
      };
    });

    const withdrawalRows: PaymentStatementRecord[] = withdrawals
      .filter((w) => w.status === 'approved' || w.status === 'pending')
      .map((w) => {
        const amountNPR = Number(w.amountNPR || 0);
        const amountUSD = Number((amountNPR / 133).toFixed(2));
        return {
          id: w.id,
          type: 'spend',
          title: `Reviewer Payout (${w.gateway || 'Wallet'})`,
          sourceOrRecipient: w.user || w.accountNumber || w.userEmail || 'Reviewer',
          channel: mapChannel(w.gateway),
          amountUSD,
          amountNPR,
          dateTime: w.requestedAt ? new Date(w.requestedAt).toLocaleString() : 'Live',
          status: w.status === 'approved' ? 'Completed' : 'Verified',
          category: 'User Payout',
          referenceNo: w.referenceId || w.id,
        };
      });

    return [...paymentRows, ...withdrawalRows];
  }, [payments, withdrawals]);

  // Financial Ledger Totals
  const totalMoneyInUSD = useMemo(() => {
    return statementRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amountUSD, 0);
  }, [statementRecords]);

  const totalMoneyInNPR = useMemo(() => {
    return statementRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amountNPR, 0);
  }, [statementRecords]);

  const totalMoneyOutUSD = useMemo(() => {
    return statementRecords
      .filter(r => r.type === 'spend')
      .reduce((sum, r) => sum + r.amountUSD, 0);
  }, [statementRecords]);

  const totalMoneyOutNPR = useMemo(() => {
    return statementRecords
      .filter(r => r.type === 'spend')
      .reduce((sum, r) => sum + r.amountNPR, 0);
  }, [statementRecords]);

  const netCompanyProfitUSD = totalMoneyInUSD - totalMoneyOutUSD;
  const netCompanyProfitNPR = totalMoneyInNPR - totalMoneyOutNPR;

  // Filtered rows
  const filteredRecords = useMemo(() => {
    return statementRecords.filter(r => {
      const matchesType = filterType === 'all' || r.type === filterType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        r.title.toLowerCase().includes(q) ||
        r.sourceOrRecipient.toLowerCase().includes(q) ||
        r.referenceNo.toLowerCase().includes(q) ||
        r.channel.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [statementRecords, filterType, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Type', 'Title / Description', 'Party / Source', 'Channel', 'Amount USD', 'Amount NPR', 'Date & Time', 'Status', 'Reference No'];
    const rows = filteredRecords.map(r => [
      r.id,
      r.type === 'income' ? 'Income (Money In)' : 'Spend (Money Out)',
      `"${r.title}"`,
      `"${r.sourceOrRecipient}"`,
      r.channel,
      r.amountUSD.toFixed(2),
      r.amountNPR,
      `"${r.dateTime}"`,
      r.status,
      r.referenceNo
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `company_payment_statement_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>TRANSPARENT COMPANY FINANCIAL LEDGER · VISIBLE TO EVERYONE</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Company Payment Statement</span>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-xl">
              Real-Time Money In & Out
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            Complete statement of how the company generates income (brand subscriptions, pass sales, merchant margins) versus expenditures (creator video payouts & gateway fees). Every transaction shows visible date and time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Statement (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Statement Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Money In (Income) */}
        <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>Money Received (Income)</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-2 font-mono">
            +${totalMoneyInUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-bold text-emerald-700 mt-0.5">
            ≈ {rs(totalMoneyInNPR)} gross income
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">
            From brand plans, category passes & QR volume
          </div>
        </div>

        {/* Card 2: Total Money Out (Spend / Creator Payouts) */}
        <div className="bg-gradient-to-br from-rose-50/70 to-orange-50/40 p-4 rounded-2xl border border-rose-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              <span>Money Spent (Payouts)</span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
              Disbursed
            </span>
          </div>
          <div className="text-2xl font-black text-rose-950 mt-2 font-mono">
            -${totalMoneyOutUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-bold text-rose-700 mt-0.5">
            ≈ {rs(totalMoneyOutNPR)} paid to reviewers
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">
            Rs. 125 net payout per approved 1-min video review
          </div>
        </div>

        {/* Card 3: Net Company Treasury Profit */}
        <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-4 rounded-2xl border border-blue-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-blue-800 uppercase tracking-wider flex items-center gap-1">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span>Net Company Balance</span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Retained
            </span>
          </div>
          <div className="text-2xl font-black text-blue-950 mt-2 font-mono">
            +${netCompanyProfitUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-bold text-blue-700 mt-0.5">
            ≈ {rs(netCompanyProfitNPR)} net retained margin
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">
            Income minus creator video disbursements
          </div>
        </div>

        {/* Card 4: Platform Margin & Fee Architecture */}
        <div className="bg-gradient-to-br from-amber-50/70 to-yellow-50/40 p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Platform Margin Model</span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              Zero User Deduction
            </span>
          </div>
          <div className="text-2xl font-black text-amber-950 mt-2 font-mono">
            +5.0%
          </div>
          <div className="text-xs font-bold text-amber-800 mt-0.5">
            Company pays Rs. 131.25, user gets Rs. 125
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">
            5% processing fee paid by company, not reviewer
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference, party, title, channel..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Transactions ({statementRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('income')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'income' ? 'bg-emerald-600 text-white shadow-xs font-black' : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Money In (Income)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('spend')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'spend' ? 'bg-rose-600 text-white shadow-xs font-black' : 'text-rose-700 hover:text-rose-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Money Out (Spend)</span>
          </button>
        </div>
      </div>

      {/* Transaction Table with Visible Timestamp on Every Record */}
      <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-wider">
                <th className="py-3 px-4">Exact Date & Time</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description & Transaction Details</th>
                <th className="py-3 px-4">Party / Source</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Amount (USD & NPR)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    No payment statement records found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isIncome = r.type === 'income';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Exact Visible Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{r.dateTime}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          Ref: {r.referenceNo}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isIncome 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {isIncome ? <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> : <ArrowUpRight className="w-3 h-3 text-rose-600" />}
                          <span>{isIncome ? 'Money In' : 'Money Out'}</span>
                        </span>
                      </td>

                      {/* Title & Category */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{r.title}</div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Category: {r.category}
                        </span>
                      </td>

                      {/* Source / Recipient */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {r.sourceOrRecipient}
                      </td>

                      {/* Channel */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200">
                          {r.channel}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-black">
                        <div className={`text-sm ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIncome ? '+' : '-'}${r.amountUSD.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          {isIncome ? '+' : '-'}{rs(r.amountNPR)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{r.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
