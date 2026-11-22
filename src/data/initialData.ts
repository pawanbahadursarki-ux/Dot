import { PhoneProduct, ProductCategory, MobileQuestion, Gateway, SubscriptionTier } from '../types';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'all',
    name: 'All Smartphones',
    icon: 'Smartphone',
    emoji: '📱',
    badge: 'Complete Catalog',
    phoneCount: 16,
    priceRange: 'Rs 14K – 240K',
    photo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    description: 'Browse all smartphone models eligible for verified 1-minute video feedback.'
  },
  {
    id: 'flagships',
    name: 'Ultra Flagships & Pro',
    icon: 'Crown',
    emoji: '👑',
    badge: 'Pro Grade & Titanium',
    phoneCount: 4,
    priceRange: 'Rs 140K – 240K',
    photo: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    description: 'Top-tier silicon (A18 Pro, Snapdragon 8 Gen 3), periscope 5x telephoto, titanium framing, and Galaxy/Apple AI tools.'
  },
  {
    id: 'foldables',
    name: 'Foldable & Flip Innovations',
    icon: 'Layers',
    emoji: '🔄',
    badge: 'Dual Screen & Flex',
    phoneCount: 2,
    priceRange: 'Rs 120K – 235K',
    photo: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
    description: 'Foldable inner AMOLED displays, zero-gap tear-drop hinges, flex-mode handsfree video recording, and tablet multitasking.'
  },
  {
    id: 'gaming',
    name: 'Gaming Beasts & Esports',
    icon: 'Gamepad2',
    emoji: '🎮',
    badge: '165Hz & Vapor Cooling',
    phoneCount: 2,
    priceRange: 'Rs 58K – 135K',
    photo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    description: 'Ultra-fast 165Hz displays, dual ultrasonic shoulder triggers, bypass charging, and custom active vapor cooling.'
  },
  {
    id: 'camera',
    name: 'Camera & Studio Portraits',
    icon: 'Camera',
    emoji: '📸',
    badge: 'Aura Light & ZEISS',
    phoneCount: 3,
    priceRange: 'Rs 45K – 110K',
    photo: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&auto=format&fit=crop&q=80',
    description: 'Rear studio Aura Ring flash lights, ZEISS/Hasselblad color science, 50MP selfie autofocus, and 4K 60fps HDR cinematic video.'
  },
  {
    id: 'midrange',
    name: 'Flagship Killers & Mid-Range',
    icon: 'Zap',
    emoji: '⚡',
    badge: 'Best Value Per Rupee',
    phoneCount: 4,
    priceRange: 'Rs 35K – 68K',
    photo: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
    description: '120Hz curved AMOLED, metal chassis, 67W–100W turbo charging, and near-flagship performance without the premium tax.'
  },
  {
    id: 'budget',
    name: 'Budget Champions & Battery',
    icon: 'BatteryCharging',
    emoji: '🔋',
    badge: '6000mAh Under 25K',
    phoneCount: 2,
    priceRange: 'Rs 14K – 28K',
    photo: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80',
    description: 'Massive 6000mAh 2-day battery packs, drop-resistant durability, 3.5mm headphone jacks, and reliable 5G under 25K.'
  },
  {
    id: 'compact',
    name: 'Compact Flagships (Lightweight)',
    icon: 'Feather',
    emoji: '🪶',
    badge: 'Under 170g Light',
    phoneCount: 2,
    priceRange: 'Rs 85K – 130K',
    photo: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80',
    description: 'Pocket-friendly under 6.2-inch screens, sub-170g weight, effortless one-handed typing, and zero compromises on speed or cameras.'
  }
];

import { ALL_COMPANIES_PHONES, PHONE_BRANDS, PhoneBrandCategory, getPhoneCapabilities, PhoneCapabilities } from './allPhones';

export { PHONE_BRANDS, type PhoneBrandCategory, getPhoneCapabilities, type PhoneCapabilities };
export const PHONES: PhoneProduct[] = ALL_COMPANIES_PHONES;

export const QUESTIONS: MobileQuestion[] = [
  {
    k: 'unboxing',
    title: '1. Unboxing & Retail Box Experience',
    subtitle: 'Where Bought, Packaging & In-Box Accessories',
    hint: 'Where did you buy it? Was the packaging safe? What accessories came in the retail box?',
    companyFocus: 'Retail Distribution, Packaging Protection & In-Box Value',
    color: '#0D9488',
    tint: '#CCFBF1',
    icon: 'package',
    emoji: '📦',
    categoryGroup: 'hardware_build'
  },
  {
    k: 'comfort',
    title: '2. Hand Grip, Ergonomics & Weight',
    subtitle: 'One-Handed Typing & Palm Comfort',
    hint: 'Is the phone comfortable to hold for 30+ minutes? Do the edges dig into your palm or feel slippery?',
    companyFocus: 'Industrial Design, Weight Distribution & Bezel Ergonomics',
    color: '#D97706',
    tint: '#FEF3C7',
    icon: 'hand',
    emoji: '🖐️',
    categoryGroup: 'hardware_build'
  },
  {
    k: 'display',
    title: '3. Display Smoothness & 120Hz Refresh Rate',
    subtitle: '120Hz Fluidity, AMOLED Colors & Resolution',
    hint: 'Is the 120Hz scrolling butter smooth? How vivid and color-accurate is the display for videos?',
    companyFocus: 'Display Nits Peak Brightness, PWM Dimming & Panel Color Calibration',
    color: '#2563EB',
    tint: '#DBEAFE',
    icon: 'smartphone',
    emoji: '📱',
    categoryGroup: 'camera_display'
  },
  {
    k: 'brightness',
    title: '4. Outdoor Sunlight Visibility & Peak Brightness',
    subtitle: 'Direct Sunlight Legibility & Auto-Brightness',
    hint: 'Can you clearly read text outdoors under direct harsh midday sunlight? How fast is auto-brightness?',
    companyFocus: 'Outdoor Sunlight Legibility & Ambient Light Sensor Calibration',
    color: '#EAB308',
    tint: '#FEF9C3',
    icon: 'sun',
    emoji: '☀️',
    categoryGroup: 'camera_display'
  },
  {
    k: 'like',
    title: '5. Daylight Main Camera Quality & Sharpness',
    subtitle: 'Daylight 50MP/200MP Details, HDR & Colors',
    hint: 'How sharp are daytime photos and 4K videos? How is skin tone accuracy and low-light night mode?',
    companyFocus: 'Camera ISP, Sensor Tuning & Optical Image Stabilization (OIS)',
    color: '#0284C7',
    tint: '#E0F2FE',
    icon: 'camera',
    emoji: '📸',
    categoryGroup: 'camera_display'
  },
  {
    k: 'camera_night',
    title: '6. Low-Light & Night Mode Photography',
    subtitle: 'Night Shots, Lens Flare & Noise Control',
    hint: 'How does it perform in dark rooms and night streets? Does Night Mode brighten dark scenes cleanly?',
    companyFocus: 'Night Algorithm ISP, Multi-Frame Stacking & Optical Clarity',
    color: '#6366F1',
    tint: '#EEF2FF',
    icon: 'moon',
    emoji: '🌙',
    categoryGroup: 'camera_display'
  },
  {
    k: 'camera_portrait',
    title: '7. Portrait Mode, Bokeh & Skin Tone Accuracy',
    subtitle: 'Natural Depth Blur & Hair Edge Detection',
    hint: 'How natural are skin tones in portrait shots? Does the blur separate hair and glasses cleanly?',
    companyFocus: 'Depth Mapping, AI Semantic Segmentation & Edge Separation',
    color: '#EC4899',
    tint: '#FCE7F3',
    icon: 'userCheck',
    emoji: '🎭',
    categoryGroup: 'camera_display'
  },
  {
    k: 'camera_zoom',
    title: '8. Ultra-Wide & Optical Zoom Capabilities',
    subtitle: '120° Wide Landscape & 3x/5x Telephoto Zoom',
    hint: 'How sharp are 0.5x ultra-wide landscape shots and optical zoom photos without pixelation?',
    companyFocus: 'Periscope Telephoto Tuning & Ultra-Wide Lens Distortion Correction',
    color: '#8B5CF6',
    tint: '#F3E8FF',
    icon: 'zoomIn',
    emoji: '🔍',
    categoryGroup: 'camera_display'
  },
  {
    k: 'camera_video',
    title: '9. Video Recording Smoothness & OIS Stabilization',
    subtitle: '4K/60fps Handheld Walking Video & Stereo Audio',
    hint: 'How steady is walking 4K video? Is the optical image stabilization gimbal-smooth? How is mic audio?',
    companyFocus: 'Sensor-Shift OIS, Video Gyro EIS & Stereo Microphone Array',
    color: '#EF4444',
    tint: '#FEE2E2',
    icon: 'video',
    emoji: '🎥',
    categoryGroup: 'camera_display'
  },
  {
    k: 'camera_selfie',
    title: '10. Front Selfie Camera & Video Calling Clarity',
    subtitle: 'Natural Skin Tones & WhatsApp/FaceTime Clarity',
    hint: 'How clear is the front camera for selfies and video calls? Does it avoid excessive artificial smoothing?',
    companyFocus: 'Front Sensor Aperture, HDR Video Calling & Natural Tone Reproduction',
    color: '#F43F5E',
    tint: '#FFE4E6',
    icon: 'smile',
    emoji: '🤳',
    categoryGroup: 'camera_display'
  },
  {
    k: 'performance',
    title: '11. Daily Speed, App Switching & RAM Multitasking',
    subtitle: 'Zero-Lag App Launching & 15+ Background Apps',
    hint: 'How snappy is the phone during daily multitasking? Do apps open immediately without restarting?',
    companyFocus: 'SoC Optimization, UFS Storage Read/Write & RAM Management',
    color: '#06B6D4',
    tint: '#CFFAFE',
    icon: 'zap',
    emoji: '⚡',
    categoryGroup: 'battery_performance'
  },
  {
    k: 'gaming',
    title: '12. Gaming & Extreme Processing Power',
    subtitle: 'PUBG, Free Fire, FPS Stability & Gyro',
    hint: 'How does it run heavy games? Any frame drops, stutter, touch lag, or gyroscope delay after 30 minutes?',
    companyFocus: 'SoC Chipset Peak Performance & GPU Driver Stability',
    color: '#7C3AED',
    tint: '#EDE9FE',
    icon: 'gamepad',
    emoji: '🎮',
    categoryGroup: 'battery_performance'
  },
  {
    k: 'heating',
    title: '13. Thermal Management & Heat Dissipation',
    subtitle: 'Overheating in Camera & Summer Weather',
    hint: 'Does the metal frame or camera glass get uncomfortably hot during 4K recording, GPS, or long video calls?',
    companyFocus: 'Vapor Chamber Cooling Area & Thermal Dissipation Architecture',
    color: '#E11D48',
    tint: '#FFE4E6',
    icon: 'flame',
    emoji: '🔥',
    categoryGroup: 'battery_performance'
  },
  {
    k: 'battery',
    title: '14. Battery Life & Screen-on-Time',
    subtitle: 'Full-Day Endurance & Standby Drain',
    hint: 'Does the battery last a full heavy day of TikTok, GPS, and gaming? How many hours of Screen-on-Time?',
    companyFocus: 'Battery Capacity (mAh) & Background Power Optimization',
    color: '#16A34A',
    tint: '#DCFCE7',
    icon: 'battery',
    emoji: '🔋',
    categoryGroup: 'battery_performance'
  },
  {
    k: 'charging',
    title: '15. Fast Charging Speed & Temperature',
    subtitle: '0 to 100% Minutes & Adapter Heat',
    hint: 'How fast does it reach 100%? Does the phone body or charger get uncomfortably warm during charging?',
    companyFocus: 'Wattage Charging Curve & Thermal Throttling Safety',
    color: '#EA580C',
    tint: '#FFEDD5',
    icon: 'zap',
    emoji: '⚡',
    categoryGroup: 'battery_performance'
  },
  {
    k: 'os_ui',
    title: '16. Software OS, Bloatware & Ads',
    subtitle: 'UI Cleanliness, Stutter & Pre-installed Apps',
    hint: 'Is the software fast and clean? Are there unwanted push notifications, lockscreen ads, or junk bloatware?',
    companyFocus: 'Custom Android Skin (HyperOS, One UI, OxygenOS, iOS) Experience',
    color: '#0D9488',
    tint: '#CCFBF1',
    icon: 'settings',
    emoji: '⚙️',
    categoryGroup: 'software_ecosystem'
  },
  {
    k: 'ai_features',
    title: '17. Brand AI Features & Smart Productivity',
    subtitle: 'Photo Eraser, Live Translate & Summary',
    hint: 'Do you genuinely use the company’s AI features (object eraser, voice translation, AI notes) in real life?',
    companyFocus: 'On-Device NPU Machine Learning & Practical AI Feature Adoption',
    color: '#6366F1',
    tint: '#E0E7FF',
    icon: 'sparkles',
    emoji: '🤖',
    categoryGroup: 'software_ecosystem'
  },
  {
    k: 'biometrics',
    title: '18. Fingerprint Scanner & Face Recognition',
    subtitle: 'Unlock Speed & Low-Light Recognition',
    hint: 'How instantly does the fingerprint sensor unlock with dry/wet fingers? Does face unlock work in dark rooms?',
    companyFocus: 'Ultrasonic / Optical Sensor Latency & Facial Auth Security',
    color: '#059669',
    tint: '#D1FAE5',
    icon: 'eye',
    emoji: '👁️',
    categoryGroup: 'software_ecosystem'
  },
  {
    k: 'sound_haptics',
    title: '19. Dual Stereo Speakers & Haptic Motor',
    subtitle: 'Call Volume, Loudness & Typing Vibration',
    hint: 'How loud and crisp are dual stereo speakers for movies and calls? Is the typing vibration premium or buzzing?',
    companyFocus: 'Acoustic Sound Pressure & Linear X-Axis Haptic Resonance',
    color: '#9333EA',
    tint: '#F3E8FF',
    icon: 'volume',
    emoji: '🔊',
    categoryGroup: 'hardware_build'
  },
  {
    k: 'network_5g',
    title: '20. 5G Network, Wi-Fi & Call Quality',
    subtitle: 'Signal Reception & Dual SIM Switching',
    hint: 'Does it keep a strong 5G/4G signal in basements or elevators? Are phone call voices crystal clear on VoLTE?',
    companyFocus: '360° Antenna Array & RF Cellular Modem Performance',
    color: '#0284C7',
    tint: '#E0F2FE',
    icon: 'wifi',
    emoji: '📶',
    categoryGroup: 'hardware_build'
  },
  {
    k: 'improve',
    title: '21. Critical Flaws, Recommendation & Stars',
    subtitle: 'Single Biggest Upgrade Needed & Final 1-5 Star Rating',
    hint: 'What is the single most urgent problem the brand MUST fix in the next model? Would you recommend it?',
    companyFocus: 'Product Roadmap Prioritization & Net Promoter Score (NPS)',
    color: '#E11D48',
    tint: '#FFE4E6',
    icon: 'lightbulb',
    emoji: '🌟',
    categoryGroup: 'value_service'
  }
];

export const GATEWAYS: Gateway[] = [
  {
    id: 'esewa',
    name: 'eSewa',
    sub: 'Wallet',
    mark: 'e',
    bg: '#60BB46',
    field: 'eSewa mobile number (98xxxxxxxx)',
    val: '9841234567',
    isNepal: true
  },
  {
    id: 'khalti',
    name: 'Khalti',
    sub: 'Wallet',
    mark: 'K',
    bg: '#5C2D91',
    field: 'Khalti mobile number (98xxxxxxxx)',
    val: '9841234567',
    isNepal: true
  },
  {
    id: 'bank',
    name: 'Bank',
    sub: 'ConnectIPS',
    mark: 'B',
    bg: '#0055A5',
    field: 'Bank account number',
    val: '0012 3456 7890',
    isNepal: true
  },
  {
    id: 'topup',
    name: 'Top-up',
    sub: 'NTC / Ncell',
    mark: 'T',
    bg: '#1B1B1F',
    field: 'Mobile number to recharge',
    val: '9841234567',
    isNepal: true
  },
  {
    id: 'global',
    name: 'Global Wire',
    sub: 'Swift / PayPal',
    mark: 'W',
    bg: '#2563EB',
    field: 'PayPal Email or Bank IBAN',
    val: 'your-paypal@domain.com',
    isNepal: false
  }
];

export const BRAND_CATEGORY_PASSES = [
  {
    id: 'pass-samsung',
    brandId: 'samsung',
    brandName: 'Samsung Galaxy Category Pass',
    iconEmoji: '🌌',
    priceUSD: 149,
    description: 'Unlocks all 24 models under Samsung Galaxy (S1 to S25 Ultra, Z Fold, Z Flip, A-Series).',
    modelsIncluded: 'Galaxy S25 Ultra, S24 Ultra, S23, S22, A55, Z Fold 6, Flip 6...',
  },
  {
    id: 'pass-apple',
    brandId: 'apple',
    brandName: 'Apple iPhone Category Pass',
    iconEmoji: '🍏',
    priceUSD: 149,
    description: 'Unlocks all 30 models under Apple iPhone (iPhone 1 to 18 Pro Max, SE, Plus, Mini).',
    modelsIncluded: 'iPhone 18 Pro Max, 17 Pro, 16 Pro, 15, 14, 13, 12, 11, X...',
  },
  {
    id: 'pass-google',
    brandId: 'google',
    brandName: 'Google Pixel Category Pass',
    iconEmoji: '🔍',
    priceUSD: 129,
    description: 'Unlocks all Google Pixel models (Pixel 1 to Pixel 9 Pro XL, Pixel Fold, Pixel A-Series).',
    modelsIncluded: 'Pixel 9 Pro XL, Pixel 9, Pixel 8 Pro, Pixel 7a, Pixel Fold...',
  },
  {
    id: 'pass-xiaomi',
    brandId: 'xiaomi',
    brandName: 'Xiaomi / Redmi / POCO Pass',
    iconEmoji: '⚡',
    priceUSD: 129,
    description: 'Unlocks all models under Xiaomi, Redmi Note series, and POCO speed flagships.',
    modelsIncluded: 'Redmi Note 14 Pro+, Note 13 Pro, Xiaomi 14 Ultra, POCO F6...',
  },
  {
    id: 'pass-oneplus',
    brandId: 'oneplus',
    brandName: 'OnePlus Category Pass',
    iconEmoji: '🚀',
    priceUSD: 129,
    description: 'Unlocks all models under OnePlus (OnePlus 1 to 13, OnePlus Open, Nord Series).',
    modelsIncluded: 'OnePlus 13, OnePlus 12, OnePlus Open, Nord 4, 11R...',
  },
  {
    id: 'pass-vivo',
    brandId: 'vivo',
    brandName: 'Vivo & iQOO Category Pass',
    iconEmoji: '📸',
    priceUSD: 129,
    description: 'Unlocks all models under Vivo V-series, X-series Zeiss flagships, and iQOO gaming.',
    modelsIncluded: 'Vivo X100 Pro, V40, V30, V29, iQOO 12 Pro...',
  },
  {
    id: 'pass-oppo',
    brandId: 'oppo',
    brandName: 'OPPO & Realme Category Pass',
    iconEmoji: '🟢',
    priceUSD: 129,
    description: 'Unlocks Find X series, Reno series, and Realme GT speed models.',
    modelsIncluded: 'Find X7 Ultra, Reno 12, Realme GT 6, Realme 12 Pro+...',
  },
  {
    id: 'pass-nothing',
    brandId: 'nothing',
    brandName: 'Nothing Phone Category Pass',
    iconEmoji: '⚪',
    priceUSD: 99,
    description: 'Unlocks Nothing Phone 1, Phone 2, Phone 2a, and CMF Phone series.',
    modelsIncluded: 'Nothing Phone 2, Phone 2a, Phone 1, CMF Phone 1...',
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionTier[] = [
  {
    id: 'single_category',
    name: 'Single Brand Starter',
    priceUSD: 15.99,
    priceYearlyUSD: 149,
    reviewQuota: 150,
    planType: 'single_category',
    targetCategory: 'samsung',
    categoryName: 'Samsung Galaxy (All Models)',
    unlockedCategories: ['samsung'],
    features: [
      'Strictly 1 chosen mobile brand active per subscription',
      '150 1-Minute Video Reviews / month for the selected brand',
      'To access another brand later, purchase a subscription for that brand',
      'Playable video player with Q&A transcript & defect details',
      'Gemini AI sentiment score & auto-tags (Camera, Battery, UX)',
      'Available as 1 Month ($15.99) or 1 Year ($149/yr)'
    ]
  },
  {
    id: 'growth',
    name: 'Single Brand Pro',
    priceUSD: 25.99,
    priceYearlyUSD: 249,
    reviewQuota: 500,
    popular: true,
    planType: 'durable_limited',
    targetCategory: 'samsung',
    categoryName: '1 Selected Mobile Brand (Pro Quota)',
    unlockedCategories: ['samsung'],
    features: [
      'Strictly 1 chosen mobile brand active per subscription',
      '500 1-Minute Video Reviews / month for your chosen brand',
      'Direct 1-on-1 Chat with verified customers of that brand',
      'AI Defect Synthesis & Hardware Improvement Roadmap',
      'Raw CSV Data Export for your subscribed brand',
      'To view another mobile brand, purchase a separate subscription'
    ]
  },
  {
    id: 'enterprise',
    name: 'Single Brand Unlimited',
    priceUSD: 35.99,
    priceYearlyUSD: 349,
    reviewQuota: 99999,
    planType: 'unlimited',
    targetCategory: 'samsung',
    categoryName: '1 Selected Mobile Brand (Unlimited)',
    unlockedCategories: ['samsung'],
    features: [
      'Strictly 1 chosen mobile brand active per subscription',
      'UNLIMITED Video Reviews across all models of that single brand',
      'Priority defect triage & full engineering Q&A inspection',
      'Custom model benchmarks & AI copilot analytics for that brand',
      'Direct 1-on-1 Reviewer Chat & CSV downloads',
      'Buy a new subscription anytime to switch to a different brand'
    ]
  }
];

export const phoneById = (id: string): PhoneProduct => {
  if (!id) return PHONES[0];
  const q = id.trim().toLowerCase();
  
  // 1. Exact ID match (case-insensitive)
  const exact = PHONES.find(p => p.id.toLowerCase() === q);
  if (exact) return exact;

  // 2. Partial ID match
  const partialId = PHONES.find(p => p.id.toLowerCase().includes(q) || q.includes(p.id.toLowerCase()));
  if (partialId) return partialId;

  // 3. Name match
  const nameMatch = PHONES.find(p => p.name.toLowerCase().includes(q));
  if (nameMatch) return nameMatch;

  // 4. Brand match (if brand keyword like 'vivo', 'apple', 'samsung' was passed)
  if (q.includes('vivo') || q.includes('iqoo')) {
    const v = PHONES.find(p => p.brand.toLowerCase() === 'vivo' || p.id === 'v30' || p.id.startsWith('vivo'));
    if (v) return v;
  }
  if (q.includes('apple') || q.includes('iphone')) {
    const a = PHONES.find(p => p.brand.toLowerCase() === 'apple' || p.id === 'ip16p');
    if (a) return a;
  }
  if (q.includes('oneplus')) {
    const op = PHONES.find(p => p.brand.toLowerCase() === 'oneplus');
    if (op) return op;
  }
  if (q.includes('xiaomi') || q.includes('redmi') || q.includes('poco')) {
    const x = PHONES.find(p => ['xiaomi', 'redmi', 'poco'].includes(p.brand.toLowerCase()));
    if (x) return x;
  }
  if (q.includes('pixel') || q.includes('google')) {
    const g = PHONES.find(p => p.brand.toLowerCase() === 'google');
    if (g) return g;
  }
  if (q.includes('oppo') || q.includes('realme')) {
    const o = PHONES.find(p => ['oppo', 'realme'].includes(p.brand.toLowerCase()));
    if (o) return o;
  }

  return PHONES[0];
};

export const rs = (n: number | undefined | null) => 'Rs ' + Number(n ?? 0).toLocaleString('en-IN');

