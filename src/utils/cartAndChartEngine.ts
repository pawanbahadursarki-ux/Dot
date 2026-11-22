import { FeedbackItem, CartData } from '../types';
import { phoneById } from '../data/initialData';

export interface CartOrderRecord {
  id: string;
  orderId: string;
  customer: string;
  avatar: string;
  city: string;
  product: string;
  phoneId: string;
  amount: string;
  amountNumeric: number;
  status: 'Completed' | 'Verified' | 'Investigating' | 'Cancelled' | 'Fixed';
  statusColor: string;
  date: string;
  appVersion: string;
  osVersion: string;
  reportedError: string;
  defectStatus: 'open' | 'investigating' | 'fixing' | 'resolved';
  defectFixedInVersion?: string;
  defectResolutionNote?: string;
  feedbackItem: FeedbackItem;
}

export interface DayRevenueBar {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  x: number;
  height: number;
  y: number;
  val: string;
  numericVal: number;
  count: number;
}

export interface DevicesDistribution {
  mobilePct: number; // e.g. Cyan
  desktopPct: number; // e.g. Royal Purple
  tabletPct: number; // e.g. Orange
  mobileDash: string;
  desktopDash: string;
  tabletDash: string;
}

export interface DailyVolumePoint {
  dateKey: string;
  label: string;
  count: number;
  resolved: number;
  open: number;
}

export interface ChartMetrics {
  totalRevenue: string;
  totalRevenueNumeric: number;
  revenueGrowth: string;
  newUsers: string;
  userGrowth: string;
  orders: string;
  ordersGrowth: string;
  conversion: string;
  conversionGrowth: string;
  weeklyBars: DayRevenueBar[];
  dailyVolume30d: DailyVolumePoint[];
  devices: DevicesDistribution;
  activeUsers: number;
  activeUsersGrowth: string;
  recentOrders: CartOrderRecord[];
}

/**
 * Returns the OS version associated with a phone model
 */
export const getPhoneOS = (phoneId: string): string => {
  const p = phoneById(phoneId);
  const brand = (p.brand || '').toLowerCase();
  const name = (p.name || '').toLowerCase();

  if (brand.includes('apple') || name.includes('iphone')) {
    if (name.includes('16')) return 'iOS 18.2 (22C152)';
    if (name.includes('15')) return 'iOS 18.1.1 (22B91)';
    return 'iOS 18.0';
  }
  if (brand.includes('samsung') || name.includes('galaxy')) {
    if (name.includes('fold') || name.includes('flip')) return 'One UI 6.1.1 (Android 14 Fold)';
    if (name.includes('s24')) return 'One UI 6.1 (Android 14)';
    return 'One UI 6.0 (Android 14)';
  }
  if (brand.includes('google') || name.includes('pixel')) {
    return 'Android 15 (Pixel Drop)';
  }
  if (brand.includes('xiaomi') || name.includes('redmi') || name.includes('poco')) {
    return 'HyperOS 1.0.8 (Android 14)';
  }
  if (brand.includes('oneplus')) {
    return 'OxygenOS 14.1 (Android 14)';
  }
  if (brand.includes('vivo') || brand.includes('iqoo')) {
    return 'Funtouch OS 14 (Android 14)';
  }
  return 'Android 14 (Stock)';
};

export const convertFeedbackToCartOrder = (item: FeedbackItem, index: number = 0): CartOrderRecord => {
  const phone = phoneById(item.phone);

  let priceUSD = item.cartData?.priceUSD;
  if (!priceUSD || priceUSD <= 0) {
    if (phone.brand.toLowerCase() === 'apple') priceUSD = 1199;
    else if (phone.id.includes('fold')) priceUSD = 1899;
    else if (phone.id.includes('s24u')) priceUSD = 1299;
    else if (phone.id.includes('px9')) priceUSD = 999;
    else if (phone.id.includes('xm14')) priceUSD = 1099;
    else priceUSD = Math.round((phone.reward || 150) * 0.8) + 449;
  }

  const rawId = (item.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4) || String(1000 + index);
  const orderId = item.cartData?.orderId || `ORD-${(phone.brand || 'FP').toUpperCase().slice(0, 3)}-${rawId}`;
  const appVersion = item.appVersion || item.cartData?.appVersion || 'v2.4.2';
  const osVersion = item.osVersion || item.cartData?.osVersion || getPhoneOS(item.phone);
  const reportedError = item.dislike || item.improve || 'No critical defects reported';
  const defectStatus = item.defectStatus || (item.feedbackCategory === 'Bug Report' ? 'open' : 'resolved');

  let status: CartOrderRecord['status'] = 'Completed';
  let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

  if (defectStatus === 'resolved') {
    status = 'Fixed';
    statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
  } else if (defectStatus === 'investigating' || defectStatus === 'fixing') {
    status = 'Investigating';
    statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
  } else if (item.payoutStatus === 'credited' || item.moderationStatus === 'approved') {
    status = 'Completed';
    statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else {
    status = 'Verified';
    statusColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
  }

  const avatar = item.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'User')}&background=5542f6&color=fff`;

  return {
    id: item.id,
    orderId,
    customer: item.user,
    avatar,
    city: item.city,
    product: item.cartData?.productName || `${phone.brand} ${phone.name}`,
    phoneId: item.phone,
    amount: `$${priceUSD.toLocaleString()}`,
    amountNumeric: priceUSD,
    status,
    statusColor,
    date: item.time || 'Recently',
    appVersion,
    osVersion,
    reportedError,
    defectStatus,
    defectFixedInVersion: item.defectFixedInVersion,
    defectResolutionNote: item.defectResolutionNote,
    feedbackItem: item,
  };
};

export const computeChartMetricsFromFeedback = (
  feedbackList: FeedbackItem[],
  brandFilter: string = 'all'
): ChartMetrics => {
  const normalizedFilter = brandFilter.toLowerCase().trim();
  const isAll = !normalizedFilter || normalizedFilter === 'all' || normalizedFilter.includes('all brands');

  const activeList = isAll
    ? feedbackList
    : feedbackList.filter((f) => {
        const phone = phoneById(f.phone);
        const brand = (phone.brand || '').toLowerCase();
        const folder = (f.brandFolder || '').toLowerCase();
        return brand.includes(normalizedFilter) || folder.includes(normalizedFilter) || normalizedFilter.includes(brand);
      });

  const recentOrders = activeList.map((item, idx) => convertFeedbackToCartOrder(item, idx));
  const totalRevenueNumeric = recentOrders.reduce((sum, ord) => sum + ord.amountNumeric, 0);
  const totalRevenue = `$${totalRevenueNumeric.toLocaleString()}`;

  const uniqueUsers = new Set(activeList.map((f) => (f.user || '').toLowerCase()).filter(Boolean)).size;
  const newUsers = uniqueUsers.toLocaleString();
  const orders = recentOrders.length.toLocaleString();

  const positiveOrVerified = activeList.filter(
    (f) => f.rating >= 4 || f.moderationStatus === 'approved'
  ).length;
  const conversionRate = activeList.length > 0 ? (positiveOrVerified / activeList.length) * 100 : 0;
  const conversion = `${conversionRate.toFixed(1)}%`;

  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayLabels: DayRevenueBar['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  recentOrders.forEach((ord) => {
    const dt = ord.feedbackItem.createdAt ? new Date(ord.feedbackItem.createdAt) : new Date();
    const jsDay = Number.isNaN(dt.getTime()) ? 0 : dt.getDay();
    const monFirstIdx = jsDay === 0 ? 6 : jsDay - 1;
    dayTotals[monFirstIdx] += ord.amountNumeric;
    dayCounts[monFirstIdx] += 1;
  });

  const maxVal = Math.max(...dayTotals, 1);
  const chartHeightMax = 170;

  const weeklyBars: DayRevenueBar[] = dayLabels.map((day, idx) => {
    const numericVal = dayTotals[idx];
    const normalizedHeight = numericVal === 0 ? 8 : Math.min(170, Math.max(20, Math.round((numericVal / maxVal) * chartHeightMax)));
    const y = 200 - normalizedHeight;
    const x = 80 + idx * 75;

    return {
      day,
      x,
      height: normalizedHeight,
      y,
      val: `$${numericVal.toLocaleString()}`,
      numericVal,
      count: dayCounts[idx],
    };
  });

  let mobileCount = 0;
  let desktopCount = 0;
  let tabletCount = 0;

  activeList.forEach((f) => {
    const p = phoneById(f.phone);
    const brand = (p.brand || '').toLowerCase();
    const name = (p.name || '').toLowerCase();

    if (name.includes('fold') || name.includes('flip') || name.includes('pad')) {
      tabletCount += 1;
    } else if (brand.includes('apple') || name.includes('iphone')) {
      desktopCount += 1;
    } else {
      mobileCount += 1;
    }
  });

  const totalDevices = mobileCount + desktopCount + tabletCount;
  const mobilePct = totalDevices > 0 ? Math.round((mobileCount / totalDevices) * 100) : 0;
  const desktopPct = totalDevices > 0 ? Math.round((desktopCount / totalDevices) * 100) : 0;
  const tabletPct = totalDevices > 0 ? Math.max(0, 100 - mobilePct - desktopPct) : 0;

  const circum = 427.25;
  const mobileDash = `${Math.round((mobilePct / 100) * circum)} ${circum}`;
  const desktopDash = `${Math.round((desktopPct / 100) * circum)} ${circum}`;
  const tabletDash = `${Math.round((tabletPct / 100) * circum)} ${circum}`;

  // Build chronological last-30-days daily feedback volume time series (100% real data)
  const formatDateKey = (dt: Date): string => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const volumeByDay = new Map<string, { count: number; resolved: number; open: number }>();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let offset = 29; offset >= 0; offset--) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    volumeByDay.set(formatDateKey(d), { count: 0, resolved: 0, open: 0 });
  }

  recentOrders.forEach((ord) => {
    if (!ord.feedbackItem.createdAt) return;
    const dt = new Date(ord.feedbackItem.createdAt);
    if (Number.isNaN(dt.getTime())) return;
    dt.setHours(0, 0, 0, 0);
    const key = formatDateKey(dt);
    const bucket = volumeByDay.get(key);
    if (bucket) {
      bucket.count += 1;
      if (ord.defectStatus === 'resolved') {
        bucket.resolved += 1;
      } else {
        bucket.open += 1;
      }
    }
  });

  const dailyVolume30d: DailyVolumePoint[] = [];
  for (let offset = 29; offset >= 0; offset--) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    const dateKey = formatDateKey(d);
    const bucket = volumeByDay.get(dateKey) || { count: 0, resolved: 0, open: 0 };
    dailyVolume30d.push({
      dateKey,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: bucket.count,
      resolved: bucket.resolved,
      open: bucket.open,
    });
  }

  return {
    totalRevenue,
    totalRevenueNumeric,
    revenueGrowth: activeList.length > 0 ? 'Live' : '0%',
    newUsers,
    userGrowth: uniqueUsers > 0 ? `${uniqueUsers} verified` : '0',
    orders,
    ordersGrowth: `${recentOrders.length} total`,
    conversion,
    conversionGrowth: activeList.length > 0 ? 'Approval rate' : '0%',
    weeklyBars,
    dailyVolume30d,
    devices: {
      mobilePct,
      desktopPct,
      tabletPct,
      mobileDash,
      desktopDash,
      tabletDash,
    },
    activeUsers: uniqueUsers,
    activeUsersGrowth: `+${uniqueUsers}`,
    recentOrders,
  };
};

