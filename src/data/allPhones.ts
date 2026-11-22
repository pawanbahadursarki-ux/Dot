import { PhoneProduct } from '../types';

export interface PhoneBrandCategory {
  id: string;
  name: string;
  iconEmoji: string;
  badge: string;
  description: string;
  modelsCount: number;
  photo?: string;
  generations?: string[];
}

export const PHONE_BRANDS: PhoneBrandCategory[] = [
  { 
    id: 'all', 
    name: 'All Mobile Models', 
    iconEmoji: '📱', 
    badge: '129 Models', 
    description: 'Every smartphone brand and generation available for review.', 
    modelsCount: 129,
    photo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    generations: ['All Brands', 'Flagships', 'Midrange', 'Foldables', 'Gaming']
  },
  { 
    id: 'apple', 
    name: 'iPhone (Models 1 to 18)', 
    iconEmoji: '🍏', 
    badge: 'iPhone 1–18 (30 Models)', 
    description: 'Complete collection from original iPhone 1 (2007) to futuristic iPhone 18 Pro Max.', 
    modelsCount: 30,
    photo: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    generations: [
      'All iPhone Models',
      'iPhone 16–18 (Latest & Titanium)',
      'iPhone 12–15 (5G Era)',
      'iPhone X–11 (All-Screen Era)',
      'iPhone 6–8 (Aluminum Era)',
      'iPhone 1–5s (Classic 2007–2013)'
    ]
  },
  { 
    id: 'samsung', 
    name: 'Samsung Galaxy (S1 to S25)', 
    iconEmoji: '🌌', 
    badge: 'S1 to S25 Ultra (24 Models)', 
    description: 'Galaxy S1 (2010) to S25 Ultra, Z Fold, Z Flip, and A-series.', 
    modelsCount: 24,
    photo: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=80',
    generations: [
      'All Galaxy Models',
      'Galaxy S20–S25 Ultra',
      'Galaxy Fold & Flip',
      'Galaxy A-Series',
      'Galaxy S1–S10 (Classic Flagships)'
    ]
  },
  { 
    id: 'vivo', 
    name: 'Vivo & iQOO', 
    iconEmoji: '📸', 
    badge: 'ZEISS & Aura (15 Models)', 
    description: 'X100 Ultra to X80, V40 to V20, X Fold 3, and iQOO 13.', 
    modelsCount: 15,
    photo: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&auto=format&fit=crop&q=80',
    generations: [
      'All Vivo & iQOO',
      'Vivo X-Series (ZEISS Optics)',
      'Vivo V-Series (Aura Portrait)',
      'iQOO Esports & Speed'
    ]
  },
  { 
    id: 'oppo', 
    name: 'OPPO & Realme', 
    iconEmoji: '🟢', 
    badge: 'Find & GT (14 Models)', 
    description: 'Find X7 Ultra, Find N3 Fold, Reno 12, and Realme GT 7.', 
    modelsCount: 14,
    photo: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
    generations: [
      'All OPPO & Realme',
      'OPPO Find Flagships',
      'OPPO Reno Portraits',
      'Realme GT Speed'
    ]
  },
  { 
    id: 'google', 
    name: 'Google Pixel (Pixel 1 to 9)', 
    iconEmoji: '🔍', 
    badge: 'Pixel 1–9 Pro (15 Models)', 
    description: 'Pure Android, Tensor G4, and Google Gemini AI cameras.', 
    modelsCount: 15,
    photo: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
    generations: [
      'All Pixel Models',
      'Pixel 7–9 (Gemini AI Era)',
      'Pixel 1–6 (Origins & Neural)'
    ]
  },
  { 
    id: 'oneplus', 
    name: 'OnePlus (One to 13)', 
    iconEmoji: '⚡', 
    badge: 'One to 13 (14 Models)', 
    description: 'From OnePlus One (2014) to OnePlus 13, Open, and Nord.', 
    modelsCount: 14,
    photo: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80',
    generations: [
      'All OnePlus Models',
      'OnePlus 11–13 & Open',
      'OnePlus One–10 Classics'
    ]
  },
  { 
    id: 'xiaomi', 
    name: 'Xiaomi / Redmi / POCO', 
    iconEmoji: '🟠', 
    badge: 'HyperOS & Leica (11 Models)', 
    description: 'Xiaomi 14 Ultra to Mi 1, POCO F1 to F6, and Redmi Note.', 
    modelsCount: 11,
    photo: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80',
    generations: [
      'All Xiaomi Models',
      'Xiaomi Flagship & Leica',
      'Redmi Note Value Kings',
      'POCO Speed & Gaming'
    ]
  },
  { 
    id: 'nothing', 
    name: 'Nothing Phone', 
    iconEmoji: '⚪', 
    badge: 'Glyph Lights (4 Models)', 
    description: 'Nothing Phone (2), (2a) Plus, Phone (1), and CMF.', 
    modelsCount: 4,
    photo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    generations: [
      'All Nothing Models',
      'Phone (1) & (2) Flagships',
      'Phone (2a) & CMF'
    ]
  },
  { 
    id: 'gaming', 
    name: 'Gaming Beasts', 
    iconEmoji: '🎮', 
    badge: '165Hz & Cooling (2 Models)', 
    description: 'ROG Phone 8 Pro, RedMagic 9S Pro, and extreme cooling.', 
    modelsCount: 2,
    photo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    generations: ['Esports Gaming Devices']
  },
];

// Determine brand folder category for any phone
export const getPhoneBrandFolderId = (phone: { brand?: string; name?: string }): string => {
  const b = (phone.brand || '').toLowerCase();
  const n = (phone.name || '').toLowerCase();
  if (b === 'apple' || n.includes('iphone')) return 'apple';
  if (b === 'samsung' || n.includes('galaxy')) return 'samsung';
  if (b === 'google' || n.includes('pixel')) return 'google';
  if (b === 'oneplus') return 'oneplus';
  if (['xiaomi', 'poco', 'redmi'].includes(b) || n.includes('redmi') || n.includes('poco')) return 'xiaomi';
  if (['vivo', 'iqoo'].includes(b) || n.includes('vivo') || n.includes('iqoo')) return 'vivo';
  if (['oppo', 'realme'].includes(b) || n.includes('oppo') || n.includes('realme')) return 'oppo';
  if (b === 'nothing') return 'nothing';
  return 'gaming';
};

// Determine generation group for sub-filtering
export const getPhoneGenerationGroup = (phone: { brand?: string; name?: string; releaseYear?: number }): string => {
  const b = (phone.brand || '').toLowerCase();
  const n = (phone.name || '').toLowerCase();
  if (b === 'apple' || n.includes('iphone')) {
    if (n.includes('18') || n.includes('17') || n.includes('16')) return 'iPhone 16–18 (Latest & Titanium)';
    if (n.includes('15') || n.includes('14') || n.includes('13') || n.includes('12')) return 'iPhone 12–15 (5G Era)';
    if (n.includes('11') || n.includes('xs') || n.includes('xr') || n.includes('x')) return 'iPhone X–11 (All-Screen Era)';
    if (n.includes('8') || n.includes('7') || n.includes('6s') || n.includes('6')) return 'iPhone 6–8 (Aluminum Era)';
    return 'iPhone 1–5s (Classic 2007–2013)';
  }
  if (b === 'samsung' || n.includes('galaxy')) {
    if (n.includes('fold') || n.includes('flip')) return 'Galaxy Fold & Flip';
    if (n.includes('s25') || n.includes('s24') || n.includes('s23') || n.includes('s22') || n.includes('s21') || n.includes('s20')) return 'Galaxy S20–S25 Ultra';
    if (n.includes('a55') || n.includes('a35') || n.includes('a15') || n.includes(' a')) return 'Galaxy A-Series';
    return 'Galaxy S1–S10 (Classic Flagships)';
  }
  if (['vivo', 'iqoo'].includes(b)) {
    if (n.includes('x100') || n.includes('x90') || n.includes('x80') || n.includes('fold')) return 'Vivo X-Series (ZEISS Optics)';
    if (n.includes('iqoo')) return 'iQOO Esports & Speed';
    return 'Vivo V-Series (Aura Portrait)';
  }
  if (['oppo', 'realme'].includes(b)) {
    if (n.includes('find')) return 'OPPO Find Flagships';
    if (n.includes('gt')) return 'Realme GT Speed';
    return 'OPPO Reno Portraits';
  }
  if (b === 'google' || n.includes('pixel')) {
    if (n.includes('9') || n.includes('8') || n.includes('7')) return 'Pixel 7–9 (Gemini AI Era)';
    return 'Pixel 1–6 (Origins & Neural)';
  }
  if (b === 'oneplus') {
    if (n.includes('13') || n.includes('12') || n.includes('open')) return 'OnePlus 11–13 & Open';
    return 'OnePlus One–10 Classics';
  }
  if (['xiaomi', 'poco', 'redmi'].includes(b)) {
    if (n.includes('redmi')) return 'Redmi Note Value Kings';
    if (n.includes('poco')) return 'POCO Speed & Gaming';
    return 'Xiaomi Flagship & Leica';
  }
  return 'All Models';
};

export interface PhoneCapabilities {
  camera: string;
  display: string;
  chipset: string;
  battery: string;
  keyFeature: string;
}

export const getPhoneCapabilities = (p: PhoneProduct): PhoneCapabilities => {
  const name = (p.name || '').toLowerCase();
  const desc = (p.description || '').toLowerCase();
  const brand = (p.brand || '').toLowerCase();

  // 1. Camera capability
  let camera = '50MP Main OIS Dual Camera';
  if (desc.includes('200mp') || name.includes('s25 u') || name.includes('s24 u') || name.includes('s23 u')) {
    camera = '200MP Quad Zoom & 8K Video';
  } else if (desc.includes('48mp') || name.includes('16 pro') || name.includes('15 pro') || name.includes('14 pro')) {
    camera = '48MP Fusion · 5x Optical Periscope';
  } else if (desc.includes('108mp') || name.includes('s22 u') || name.includes('s21 u') || name.includes('s20 u')) {
    camera = '108MP Space Zoom 100X';
  } else if (desc.includes('zeiss') || name.includes('x100') || name.includes('x90')) {
    camera = '50MP 1-inch ZEISS APO Telephoto';
  } else if (desc.includes('leica') || name.includes('14 ultra') || name.includes('13 ultra')) {
    camera = '50MP Quad Leica 1-inch Stepless OIS';
  } else if (desc.includes('hasselblad') || name.includes('oneplus 12') || name.includes('find x7')) {
    camera = '50MP Dual Periscope Hasselblad';
  } else if (name.includes('fold') || name.includes('flip')) {
    camera = '50MP Dual OIS & Handsfree FlexCam';
  } else if (name.includes('pixel')) {
    camera = '50MP Octa PD · Ultra-Res Zoom';
  } else if (p.releaseYear && p.releaseYear < 2015) {
    camera = '8MP Autofocus Classic Lens';
  }

  // 2. Display capability
  let display = '6.6" 120Hz Super AMOLED';
  if (name.includes('ultra') || name.includes('pro max') || name.includes('plus')) {
    display = '6.8" 120Hz Dynamic AMOLED 2X';
  } else if (name.includes('fold')) {
    display = '7.6" Foldable AMOLED 120Hz Dynamic';
  } else if (name.includes('flip')) {
    display = '6.7" Dynamic AMOLED Flex Display';
  } else if (brand === 'apple') {
    display = name.includes('pro') ? '6.9" Super Retina XDR ProMotion' : '6.1" Super Retina OLED';
  } else if (desc.includes('165hz') || name.includes('rog') || name.includes('redmagic')) {
    display = '6.78" 165Hz AMOLED Esports Panel';
  } else if (name.includes('pixel')) {
    display = '6.7" Actua OLED 120Hz High-Bright';
  } else if (p.releaseYear && p.releaseYear < 2014) {
    display = '3.5" – 4.0" Classic Retina Display';
  }

  // 3. Chipset / Performance
  let chipset = 'Snapdragon 8 Series / High-Speed';
  if (name.includes('s25')) chipset = 'Snapdragon 8 Elite 3nm / Galaxy AI';
  else if (name.includes('s24')) chipset = 'Snapdragon 8 Gen 3 / Galaxy AI 1.0';
  else if (name.includes('s23')) chipset = 'Snapdragon 8 Gen 2 for Galaxy';
  else if (name.includes('18 pro') || name.includes('18')) chipset = 'Apple A20 Bionic 2nm Neural Engine';
  else if (name.includes('17 pro') || name.includes('17')) chipset = 'Apple A19 Pro Bionic Chip';
  else if (name.includes('16 pro') || name.includes('16')) chipset = 'Apple A18 Pro 3nm Silicon';
  else if (name.includes('15 pro')) chipset = 'Apple A17 Pro 3nm Bionic';
  else if (brand === 'apple') chipset = 'Apple A-Series Bionic Engine';
  else if (name.includes('pixel 9')) chipset = 'Google Tensor G4 Gemini Engine';
  else if (name.includes('pixel 8')) chipset = 'Google Tensor G3 AI Chip';
  else if (name.includes('x100') || name.includes('dimensity')) chipset = 'Dimensity 9300+ Extreme Edition';
  else if (name.includes('a55') || name.includes('a35')) chipset = 'Exynos 1480 4nm AMD RDNA GPU';
  else if (name.includes('redmi note 13')) chipset = 'Dimensity 7200 Ultra / 12GB RAM';

  // 4. Battery & Charging
  let battery = '5000mAh · 45W Fast Charging';
  if (name.includes('ultra') || name.includes('s24') || name.includes('s25')) battery = '5000mAh · 45W Super Fast 2.0';
  else if (name.includes('fold') || name.includes('flip')) battery = '4400mAh Dual-Cell Flex Charging';
  else if (brand === 'apple') battery = 'All-Day Battery · MagSafe Wireless';
  else if (name.includes('oneplus') || name.includes('gt')) battery = '5400mAh · 100W SuperVOOC Turbo';
  else if (name.includes('rog') || name.includes('redmagic')) battery = '5500mAh · 65W Bypass Gaming Charge';
  else if (name.includes('m15') || name.includes('budget')) battery = '6000mAh Massive 2-Day Endurance';

  // 5. Standout capability highlight
  let keyFeature = 'Galaxy AI & Pro Recording';
  if (brand === 'apple') keyFeature = 'Camera Control & Apple Intelligence';
  else if (name.includes('s-pen') || name.includes('ultra')) keyFeature = 'Built-in S-Pen Stylus & Gorilla Armor';
  else if (name.includes('fold') || name.includes('flip')) keyFeature = 'Zero-Gap Hinge & Dual-Screen Multitask';
  else if (name.includes('pixel')) keyFeature = 'Magic Eraser & Gemini Nano On-Device';
  else if (name.includes('zeiss')) keyFeature = 'ZEISS T* Anti-Reflective Optics Coating';
  else if (name.includes('nothing')) keyFeature = 'Glyph Matrix Notification LED Interface';

  return { camera, display, chipset, battery, keyFeature };
};

export const ALL_COMPANIES_PHONES: PhoneProduct[] = [
  // ==========================================
  // 🍏 APPLE IPHONE GENERATIONS (iPhone 1 to 18)
  // ==========================================
  {
    id: 'ip18pm',
    brand: 'Apple',
    name: 'iPhone 18 Pro Max',
    spec: '256 GB · Cosmic Titanium',
    img: './assets/phones/iphone16.png',
    reward: 200,
    reviews: 88,
    category: 'flagships',
    description: 'Next-gen A20 Bionic 2nm chipset, under-display Face ID, 200MP Quad Prism Periscope, and all-day AI assistant.',
    priceNPR: 245000,
    releaseYear: 2026
  },
  {
    id: 'ip17p',
    brand: 'Apple',
    name: 'iPhone 17 Pro',
    spec: '256 GB · Sleek Aluminum-Titanium',
    img: './assets/phones/iphone16.png',
    reward: 180,
    reviews: 142,
    category: 'flagships',
    description: 'A19 Pro chip, ultra-slim design, ProMotion 120Hz across all models, and 48MP front selfie with OIS.',
    priceNPR: 215000,
    releaseYear: 2025
  },
  {
    id: 'ip16pm',
    brand: 'Apple',
    name: 'iPhone 16 Pro Max',
    spec: '256 GB · Desert Titanium',
    img: './assets/phones/iphone16.png',
    reward: 150,
    reviews: 420,
    category: 'flagships',
    description: '6.9-inch Super Retina XDR, A18 Pro chip, Camera Control tactile button, and 5x optical tetraprism zoom.',
    priceNPR: 210000,
    releaseYear: 2024
  },
  {
    id: 'ip16p',
    brand: 'Apple',
    name: 'iPhone 16 Pro',
    spec: '128 GB · Natural Titanium',
    img: './assets/phones/iphone16.png',
    reward: 150,
    reviews: 312,
    category: 'flagships',
    description: 'A18 Pro chip, 48MP Fusion camera system, ProMotion 120Hz display, and dedicated capacitive Camera Control.',
    priceNPR: 195000,
    releaseYear: 2024
  },
  {
    id: 'ip16',
    brand: 'Apple',
    name: 'iPhone 16',
    spec: '128 GB · Ultramarine Blue',
    img: './assets/phones/iphone16.png',
    reward: 130,
    reviews: 265,
    category: 'flagships',
    description: 'A18 chip, vibrant color-infused glass, Action Button, Spatial Audio capture, and dual vertical 48MP cameras.',
    priceNPR: 145000,
    releaseYear: 2024
  },
  {
    id: 'ip15pm',
    brand: 'Apple',
    name: 'iPhone 15 Pro Max',
    spec: '256 GB · Blue Titanium',
    img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
    reward: 140,
    reviews: 390,
    category: 'flagships',
    description: 'First aerospace-grade titanium frame, A17 Pro console-level gaming GPU, USB-C 3.0, and 5x telephoto lens.',
    priceNPR: 185000,
    releaseYear: 2023
  },
  {
    id: 'ip15p',
    brand: 'Apple',
    name: 'iPhone 15 Pro',
    spec: '128 GB · Black Titanium',
    img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
    reward: 130,
    reviews: 340,
    category: 'flagships',
    description: 'A17 Pro chip with hardware ray tracing, customizable Action Button, USB-C port, and lightweight titanium edges.',
    priceNPR: 168000,
    releaseYear: 2023
  },
  {
    id: 'ip15',
    brand: 'Apple',
    name: 'iPhone 15',
    spec: '128 GB · Pastel Pink',
    img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
    reward: 120,
    reviews: 280,
    category: 'flagships',
    description: 'Dynamic Island interactive cutout, 48MP main sensor with 2x lossless zoom, and USB-C universal charging.',
    priceNPR: 125000,
    releaseYear: 2023
  },
  {
    id: 'ip14pm',
    brand: 'Apple',
    name: 'iPhone 14 Pro Max',
    spec: '128 GB · Deep Purple',
    img: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=600&auto=format&fit=crop&q=80',
    reward: 120,
    reviews: 310,
    category: 'flagships',
    description: 'First phone with Dynamic Island, Always-On Display, A16 Bionic processor, and 48MP ProRAW photography.',
    priceNPR: 155000,
    releaseYear: 2022
  },
  {
    id: 'ip14',
    brand: 'Apple',
    name: 'iPhone 14',
    spec: '128 GB · Midnight Black',
    img: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=600&auto=format&fit=crop&q=80',
    reward: 110,
    reviews: 220,
    category: 'flagships',
    description: 'Super Retina XDR, Crash Detection safety, Photonic Engine computational camera, and all-day battery life.',
    priceNPR: 105000,
    releaseYear: 2022
  },
  {
    id: 'ip13p',
    brand: 'Apple',
    name: 'iPhone 13 Pro',
    spec: '128 GB · Sierra Blue',
    img: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=600&auto=format&fit=crop&q=80',
    reward: 110,
    reviews: 245,
    category: 'flagships',
    description: 'First 120Hz ProMotion iPhone, Cinematic video mode with rack focus, A15 Bionic, and massive battery leap.',
    priceNPR: 120000,
    releaseYear: 2021
  },
  {
    id: 'ip13',
    brand: 'Apple',
    name: 'iPhone 13',
    spec: '128 GB · Starlight',
    img: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=600&auto=format&fit=crop&q=80',
    reward: 100,
    reviews: 195,
    category: 'flagships',
    description: 'Diagonal dual camera layout with Sensor-Shift OIS, brighter Super Retina OLED, and dependable A15 power.',
    priceNPR: 88000,
    releaseYear: 2021
  },
  {
    id: 'ip12p',
    brand: 'Apple',
    name: 'iPhone 12 Pro',
    spec: '128 GB · Pacific Blue',
    img: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=600&auto=format&fit=crop&q=80',
    reward: 100,
    reviews: 180,
    category: 'flagships',
    description: 'First 5G iPhone, surgical-grade stainless steel flat edges, MagSafe magnetic back, and LiDAR depth sensor.',
    priceNPR: 85000,
    releaseYear: 2020
  },
  {
    id: 'ip12',
    brand: 'Apple',
    name: 'iPhone 12',
    spec: '64 GB · Classic Blue',
    img: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=600&auto=format&fit=crop&q=80',
    reward: 90,
    reviews: 160,
    category: 'flagships',
    description: 'Flat aluminum chassis, Ceramic Shield glass front, OLED Super Retina display, and MagSafe wireless charging.',
    priceNPR: 68000,
    releaseYear: 2020
  },
  {
    id: 'ip11p',
    brand: 'Apple',
    name: 'iPhone 11 Pro',
    spec: '64 GB · Midnight Green',
    img: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600&auto=format&fit=crop&q=80',
    reward: 90,
    reviews: 175,
    category: 'flagships',
    description: 'Apple first "Pro" naming, iconic triple camera triangle with 0.5x ultra-wide, matte frosted glass, and Night Mode.',
    priceNPR: 60000,
    releaseYear: 2019
  },
  {
    id: 'ip11',
    brand: 'Apple',
    name: 'iPhone 11',
    spec: '64 GB · Pastel Purple',
    img: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600&auto=format&fit=crop&q=80',
    reward: 80,
    reviews: 210,
    category: 'flagships',
    description: 'One of the best-selling iPhones ever: Dual 12MP cameras with Night Mode, A13 Bionic chip, and 6 vibrant colors.',
    priceNPR: 48000,
    releaseYear: 2019
  },
  {
    id: 'ipxs',
    brand: 'Apple',
    name: 'iPhone XS Max',
    spec: '64 GB · Gold Stainless',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 80,
    reviews: 130,
    category: 'flagships',
    description: '6.5-inch Super Retina OLED, A12 Bionic with 7nm neural engine, dual OIS cameras, and premium gold polish.',
    priceNPR: 42000,
    releaseYear: 2018
  },
  {
    id: 'ipxr',
    brand: 'Apple',
    name: 'iPhone XR',
    spec: '64 GB · Coral Orange',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 70,
    reviews: 145,
    category: 'flagships',
    description: '6.1-inch Liquid Retina LCD, single-lens computational portrait mode, long battery endurance, and aluminum frame.',
    priceNPR: 35000,
    releaseYear: 2018
  },
  {
    id: 'ipx',
    brand: 'Apple',
    name: 'iPhone X',
    spec: '64 GB · Space Gray',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 80,
    reviews: 190,
    category: 'flagships',
    description: 'The 10th anniversary milestone: Introduced edge-to-edge OLED, swipe gestures, Face ID TrueDepth, and Animoji.',
    priceNPR: 32000,
    releaseYear: 2017
  },
  {
    id: 'ip8',
    brand: 'Apple',
    name: 'iPhone 8 Plus',
    spec: '64 GB · Silver White',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 70,
    reviews: 120,
    category: 'flagships',
    description: 'Dual portrait cameras with Portrait Lighting, glass back with Qi wireless charging, and classic Touch ID home button.',
    priceNPR: 25000,
    releaseYear: 2017
  },
  {
    id: 'ip7',
    brand: 'Apple',
    name: 'iPhone 7',
    spec: '32 GB · Jet Black',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 60,
    reviews: 110,
    category: 'flagships',
    description: 'First water-resistant IP67 iPhone, Taptic Engine solid-state home button, and dual stereo speakers.',
    priceNPR: 18000,
    releaseYear: 2016
  },
  {
    id: 'ip6s',
    brand: 'Apple',
    name: 'iPhone 6s',
    spec: '16 GB · Rose Gold',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 60,
    reviews: 95,
    category: 'flagships',
    description: '7000-series strong aluminum, 3D Touch pressure screen, 12MP camera with 4K video recording, and Live Photos.',
    priceNPR: 14000,
    releaseYear: 2015
  },
  {
    id: 'ip6',
    brand: 'Apple',
    name: 'iPhone 6',
    spec: '16 GB · Space Gray',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 80,
    category: 'flagships',
    description: 'First big redesign with 4.7-inch curved Retina HD display, ultra-thin 6.9mm chassis, and Apple Pay NFC.',
    priceNPR: 12000,
    releaseYear: 2014
  },
  {
    id: 'ip5s',
    brand: 'Apple',
    name: 'iPhone 5s',
    spec: '16 GB · Champagne Gold',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 70,
    category: 'flagships',
    description: 'World first 64-bit smartphone (A7 chip), introduced Touch ID biometric fingerprint in the home button.',
    priceNPR: 10000,
    releaseYear: 2013
  },
  {
    id: 'ip5',
    brand: 'Apple',
    name: 'iPhone 5',
    spec: '16 GB · Slate Black',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 65,
    category: 'flagships',
    description: 'First 4-inch 16:9 Retina display, two-tone anodized aluminum back, and introduced the reversible Lightning cable.',
    priceNPR: 8000,
    releaseYear: 2012
  },
  {
    id: 'ip4s',
    brand: 'Apple',
    name: 'iPhone 4s',
    spec: '16 GB · White Glass',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 60,
    category: 'flagships',
    description: 'Introduced Siri voice assistant, dual-core A5 chip, 1080p full HD video recording, and glass sandwich design.',
    priceNPR: 7000,
    releaseYear: 2011
  },
  {
    id: 'ip4',
    brand: 'Apple',
    name: 'iPhone 4',
    spec: '16 GB · Black Glass',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 55,
    category: 'flagships',
    description: 'Legendary industrial design by Jony Ive: First 326 ppi Retina Display, stainless steel antenna frame, and FaceTime camera.',
    priceNPR: 6000,
    releaseYear: 2010
  },
  {
    id: 'ip3gs',
    brand: 'Apple',
    name: 'iPhone 3GS',
    spec: '16 GB · Glossy Black',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 45,
    category: 'flagships',
    description: '"S for Speed" — Introduced video recording, digital compass, autofocus camera, and voice control.',
    priceNPR: 5000,
    releaseYear: 2009
  },
  {
    id: 'ip3g',
    brand: 'Apple',
    name: 'iPhone 3G',
    spec: '8 GB · Black Plastic',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 40,
    category: 'flagships',
    description: 'Introduced the App Store, fast 3G cellular network data speeds, and built-in GPS mapping.',
    priceNPR: 4500,
    releaseYear: 2008
  },
  {
    id: 'ip1',
    brand: 'Apple',
    name: 'iPhone 1 (Original 2007)',
    spec: '4 GB · Brushed Aluminum',
    img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
    reward: 100,
    reviews: 150,
    category: 'flagships',
    description: 'The revolutionary smartphone unveiled by Steve Jobs: Multi-Touch capacitive touchscreen, Safari web browser, and iPod in one.',
    priceNPR: 250000,
    releaseYear: 2007
  },

  // ==========================================
  // 🌌 SAMSUNG GALAXY GENERATIONS (Galaxy S1 to S25 Ultra)
  // ==========================================
  {
    id: 's25u',
    brand: 'Samsung',
    name: 'Galaxy S25 Ultra',
    spec: '256 GB · Titanium Silver',
    img: './assets/phones/s24ultra.jpg',
    reward: 180,
    reviews: 95,
    category: 'flagships',
    description: 'Snapdragon 8 Elite chipset, rounded ergonomic corners, Galaxy AI 2.0 generative tools, 200MP ISOCELL sensor, and S-Pen.',
    priceNPR: 215000,
    releaseYear: 2026
  },
  {
    id: 's24u',
    brand: 'Samsung',
    name: 'Galaxy S24 Ultra',
    spec: '256 GB · Titanium Black',
    img: './assets/phones/s24ultra.jpg',
    reward: 150,
    reviews: 274,
    category: 'flagships',
    description: 'Snapdragon 8 Gen 3, Galaxy AI suite, 200MP quad telephoto, anti-reflective Gorilla Armor glass, and integrated S-Pen.',
    priceNPR: 184999,
    releaseYear: 2024
  },
  {
    id: 's24p',
    brand: 'Samsung',
    name: 'Galaxy S24+',
    spec: '256 GB · Cobalt Violet',
    img: './assets/phones/titanium-yellow-1.png',
    reward: 130,
    reviews: 165,
    category: 'flagships',
    description: '6.7-inch QHD+ Dynamic AMOLED 2X, 12GB RAM, 4900mAh battery, Galaxy AI Live Translate, and Armor Aluminum 2.0.',
    priceNPR: 142000,
    releaseYear: 2024
  },
  {
    id: 's24',
    brand: 'Samsung',
    name: 'Galaxy S24',
    spec: '128 GB · Amber Yellow',
    img: './assets/phones/titanium-yellow-1.png',
    reward: 130,
    reviews: 145,
    category: 'compact',
    description: 'Ultra-compact 6.2-inch Dynamic AMOLED 2X, 167g featherweight chassis, Armor Aluminum 2.0, and full Galaxy AI capabilities.',
    priceNPR: 119999,
    releaseYear: 2024
  },
  {
    id: 's23u',
    brand: 'Samsung',
    name: 'Galaxy S23 Ultra',
    spec: '256 GB · Botanic Green',
    img: './assets/phones/s24ultra.jpg',
    reward: 130,
    reviews: 310,
    category: 'flagships',
    description: 'Snapdragon 8 Gen 2 for Galaxy, 200MP main camera with 100x Space Zoom, 5000mAh battery, and S-Pen stylus.',
    priceNPR: 145000,
    releaseYear: 2023
  },
  {
    id: 's22u',
    brand: 'Samsung',
    name: 'Galaxy S22 Ultra',
    spec: '256 GB · Burgundy Red',
    img: './assets/phones/s24ultra.jpg',
    reward: 120,
    reviews: 240,
    category: 'flagships',
    description: 'First Galaxy S-series to embed the Note S-Pen stylus, 108MP camera, 1750-nit Dynamic AMOLED, and 45W fast charging.',
    priceNPR: 115000,
    releaseYear: 2022
  },
  {
    id: 's21u',
    brand: 'Samsung',
    name: 'Galaxy S21 Ultra',
    spec: '128 GB · Phantom Black',
    img: './assets/phones/s24ultra.jpg',
    reward: 110,
    reviews: 220,
    category: 'flagships',
    description: 'Contour-cut camera housing, dual telephoto zoom lenses (3x & 10x periscope), and 120Hz at full QHD+ resolution.',
    priceNPR: 88000,
    releaseYear: 2021
  },
  {
    id: 'note20u',
    brand: 'Samsung',
    name: 'Galaxy Note 20 Ultra',
    spec: '256 GB · Mystic Bronze',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 110,
    reviews: 195,
    category: 'flagships',
    description: 'The pinnacle of the Galaxy Note series: 9ms S-Pen latency, laser autofocus 108MP camera, and 120Hz Dynamic AMOLED.',
    priceNPR: 75000,
    releaseYear: 2020
  },
  {
    id: 's20u',
    brand: 'Samsung',
    name: 'Galaxy S20 Ultra',
    spec: '128 GB · Cosmic Gray',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 100,
    reviews: 180,
    category: 'flagships',
    description: 'First phone with 100x Space Zoom, 108MP sensor, 8K video recording, 5000mAh battery, and 120Hz high refresh rate.',
    priceNPR: 62000,
    releaseYear: 2020
  },
  {
    id: 's10p',
    brand: 'Samsung',
    name: 'Galaxy S10+',
    spec: '128 GB · Prism White',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 90,
    reviews: 165,
    category: 'flagships',
    description: '10th anniversary Galaxy: Infinity-O dual punch-hole display, ultrasonic in-screen fingerprint, triple rear cameras, and 3.5mm jack.',
    priceNPR: 42000,
    releaseYear: 2019
  },
  {
    id: 's9p',
    brand: 'Samsung',
    name: 'Galaxy S9+',
    spec: '64 GB · Lilac Purple',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 80,
    reviews: 140,
    category: 'flagships',
    description: 'Mechanical dual-aperture camera (f/1.5 & f/2.4), 960fps super slow-motion video, stereo AKG speakers, and iris scanner.',
    priceNPR: 30000,
    releaseYear: 2018
  },
  {
    id: 's8',
    brand: 'Samsung',
    name: 'Galaxy S8',
    spec: '64 GB · Midnight Black',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 70,
    reviews: 155,
    category: 'flagships',
    description: 'Pioneered the Infinity Display with curved bezel-less 18.5:9 aspect ratio, DeX desktop mode, and Bixby physical button.',
    priceNPR: 22000,
    releaseYear: 2017
  },
  {
    id: 's7e',
    brand: 'Samsung',
    name: 'Galaxy S7 Edge',
    spec: '32 GB · Gold Platinum',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 70,
    reviews: 125,
    category: 'flagships',
    description: 'Curved dual edge display, lightning fast Dual Pixel phase detection autofocus, IP68 water resistance, and microSD slot.',
    priceNPR: 18000,
    releaseYear: 2016
  },
  {
    id: 's6e',
    brand: 'Samsung',
    name: 'Galaxy S6 Edge',
    spec: '32 GB · Emerald Green',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 60,
    reviews: 95,
    category: 'flagships',
    description: 'World first dual-curved screen smartphone, crafted from aerospace aluminum and Gorilla Glass 4, with 14nm Exynos 7420.',
    priceNPR: 15000,
    releaseYear: 2015
  },
  {
    id: 's5',
    brand: 'Samsung',
    name: 'Galaxy S5',
    spec: '16 GB · Charcoal Black',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 80,
    category: 'flagships',
    description: 'Perforated textured back, built-in heart rate monitor, swipe fingerprint sensor, IP67 water seal flap, and removable battery.',
    priceNPR: 11000,
    releaseYear: 2014
  },
  {
    id: 's4',
    brand: 'Samsung',
    name: 'Galaxy S4',
    spec: '16 GB · White Frost',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 85,
    category: 'flagships',
    description: 'Best-selling Android phone of all time (80M+ sold): 5-inch 1080p Super AMOLED, Air Gesture sensors, Smart Scroll, and IR blaster.',
    priceNPR: 9000,
    releaseYear: 2013
  },
  {
    id: 's3',
    brand: 'Samsung',
    name: 'Galaxy S3',
    spec: '16 GB · Pebble Blue',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 75,
    category: 'flagships',
    description: '"Designed for Humans" pebble-curved chassis, Nature UX water ripple lockscreen, Pop-up Play floating video, and Exynos 4 Quad.',
    priceNPR: 7500,
    releaseYear: 2012
  },
  {
    id: 's2',
    brand: 'Samsung',
    name: 'Galaxy S2',
    spec: '16 GB · Piano Black',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 70,
    category: 'flagships',
    description: 'Super-thin 8.49mm body, 4.3-inch Super AMOLED Plus display, 1080p video recording, and legendary speed that beat the iPhone 4.',
    priceNPR: 6000,
    releaseYear: 2011
  },
  {
    id: 's1',
    brand: 'Samsung',
    name: 'Galaxy S (Original 2010)',
    spec: '8 GB · Metallic Black',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 70,
    reviews: 60,
    category: 'flagships',
    description: 'The foundation of the Galaxy dynasty: 4-inch Super AMOLED display, 1GHz Hummingbird processor, and Android 2.1 Eclair.',
    priceNPR: 12000,
    releaseYear: 2010
  },
  {
    id: 'zfold6',
    brand: 'Samsung',
    name: 'Galaxy Z Fold 6',
    spec: '256 GB · Silver Shadow',
    img: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
    reward: 180,
    reviews: 84,
    category: 'foldables',
    description: '7.6-inch Dynamic AMOLED 2X folding screen, dual-rail hinge, IP48 water resistance, and S-Pen fold edition support.',
    priceNPR: 234999,
    releaseYear: 2024
  },
  {
    id: 'zflip6',
    brand: 'Samsung',
    name: 'Galaxy Z Flip 6',
    spec: '256 GB · Mint Green',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 140,
    reviews: 119,
    category: 'foldables',
    description: 'Pocket-sized clamshell design with 3.4-inch FlexWindow, 50MP main camera with Auto Zoom, and 4000mAh battery.',
    priceNPR: 149999,
    releaseYear: 2024
  },
  {
    id: 'a55',
    brand: 'Samsung',
    name: 'Galaxy A55 5G',
    spec: '128 GB · Awesome Iceblue',
    img: './assets/phones/a55.jpg',
    reward: 100,
    reviews: 198,
    category: 'midrange',
    description: 'Premium metal frame, 6.6-inch 120Hz Super AMOLED with Vision Booster, 50MP OIS camera, and IP67 water/dust resistance.',
    priceNPR: 62999,
    releaseYear: 2024
  },
  {
    id: 'a35',
    brand: 'Samsung',
    name: 'Galaxy A35 5G',
    spec: '128 GB · Awesome Lilac',
    img: './assets/phones/a55.jpg',
    reward: 90,
    reviews: 140,
    category: 'midrange',
    description: 'Infinity-O 120Hz Super AMOLED display, 50MP OIS triple camera, 5000mAh battery, and Knox Vault hardware security.',
    priceNPR: 46999,
    releaseYear: 2024
  },
  {
    id: 'a15',
    brand: 'Samsung',
    name: 'Galaxy A15 5G',
    spec: '128 GB · Blue Black',
    img: './assets/phones/a55.jpg',
    reward: 80,
    reviews: 230,
    category: 'budget',
    description: 'Affordable 5G champion with 90Hz Super AMOLED display, 50MP primary lens, and 5000mAh battery with 25W fast charge.',
    priceNPR: 27999,
    releaseYear: 2024
  },

  // ==========================================
  // 🔍 GOOGLE PIXEL GENERATIONS (Pixel 1 to 9)
  // ==========================================
  {
    id: 'pixel9pf',
    brand: 'Google',
    name: 'Pixel 9 Pro Fold',
    spec: '256 GB · Obsidian',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 180,
    reviews: 72,
    category: 'foldables',
    description: '8-inch Super Actua Flex inner display, fluid steel hinge, Tensor G4 processor, and Google Gemini Live AI.',
    priceNPR: 240000,
    releaseYear: 2024
  },
  {
    id: 'pixel9pxl',
    brand: 'Google',
    name: 'Pixel 9 Pro XL',
    spec: '256 GB · Porcelain White',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 150,
    reviews: 188,
    category: 'flagships',
    description: '6.8-inch Super Actua display (3000 nits), 50MP triple camera with 30x Super Res Zoom, and Gemini Nano multimodal AI.',
    priceNPR: 185000,
    releaseYear: 2024
  },
  {
    id: 'pixel9p',
    brand: 'Google',
    name: 'Pixel 9 Pro',
    spec: '128 GB · Hazel Green',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 150,
    reviews: 168,
    category: 'flagships',
    description: 'Compact 6.3-inch pro flagship, Tensor G4 chip, 42MP front camera with autofocus, and 7 years of Pixel Feature Drops.',
    priceNPR: 165000,
    releaseYear: 2024
  },
  {
    id: 'pixel9',
    brand: 'Google',
    name: 'Pixel 9',
    spec: '128 GB · Peony Pink',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 120,
    reviews: 140,
    category: 'flagships',
    description: 'Dual 50MP main + 48MP ultra-wide cameras with Macro Focus, vibrant Actua display, and Magic Editor AI tools.',
    priceNPR: 125000,
    releaseYear: 2024
  },
  {
    id: 'pixel8p',
    brand: 'Google',
    name: 'Pixel 8 Pro',
    spec: '128 GB · Bay Blue',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 120,
    reviews: 210,
    category: 'flagships',
    description: 'Tensor G3 chip, Best Take group photo AI, Audio Magic Eraser, temperature sensor, and 5x optical zoom.',
    priceNPR: 135000,
    releaseYear: 2023
  },
  {
    id: 'pixel8',
    brand: 'Google',
    name: 'Pixel 8',
    spec: '128 GB · Rose Pink',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 110,
    reviews: 175,
    category: 'compact',
    description: 'Compact 6.2-inch 120Hz Actua display, Tensor G3, Macro Focus, and 7 years of full OS updates.',
    priceNPR: 98000,
    releaseYear: 2023
  },
  {
    id: 'pixel8a',
    brand: 'Google',
    name: 'Pixel 8a',
    spec: '128 GB · Aloe Green',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 100,
    reviews: 185,
    category: 'midrange',
    description: 'Flagship Tensor G3 power in a budget package, 120Hz Actua display, IP67 water protection, and 7 years of updates.',
    priceNPR: 68000,
    releaseYear: 2024
  },
  {
    id: 'pixel7p',
    brand: 'Google',
    name: 'Pixel 7 Pro',
    spec: '128 GB · Snow White',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 90,
    reviews: 195,
    category: 'flagships',
    description: 'Polished aluminum camera visor, 30x Super Res Zoom, Macro Focus, Photo Unblur, and Tensor G2 processor.',
    priceNPR: 82000,
    releaseYear: 2022
  },
  {
    id: 'pixel7',
    brand: 'Google',
    name: 'Pixel 7',
    spec: '128 GB · Lemongrass',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 90,
    reviews: 160,
    category: 'compact',
    description: 'Matte aluminum camera bar, 50MP computational camera, 90Hz OLED, and Tensor G2 security chip.',
    priceNPR: 65000,
    releaseYear: 2022
  },
  {
    id: 'pixel6p',
    brand: 'Google',
    name: 'Pixel 6 Pro',
    spec: '128 GB · Cloudy White',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 80,
    reviews: 180,
    category: 'flagships',
    description: 'First phone with Google custom Tensor G1 silicon, iconic horizontal camera visor, and Magic Eraser AI.',
    priceNPR: 52000,
    releaseYear: 2021
  },
  {
    id: 'pixel5',
    brand: 'Google',
    name: 'Pixel 5',
    spec: '128 GB · Just Black',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 70,
    reviews: 140,
    category: 'compact',
    description: 'Featherlight recycled bio-resin aluminum body, symmetrical 90Hz bezels, physical rear Pixel Imprint fingerprint.',
    priceNPR: 35000,
    releaseYear: 2020
  },
  {
    id: 'pixel4xl',
    brand: 'Google',
    name: 'Pixel 4 XL',
    spec: '64 GB · Oh So Orange',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 60,
    reviews: 110,
    category: 'flagships',
    description: 'Soli radar chip with Motion Sense air gestures, 3D Face Unlock, 90Hz Smooth Display, and Astrophotography mode.',
    priceNPR: 28000,
    releaseYear: 2019
  },
  {
    id: 'pixel3xl',
    brand: 'Google',
    name: 'Pixel 3 XL',
    spec: '64 GB · Clearly White',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 60,
    reviews: 95,
    category: 'flagships',
    description: 'Legendary single-lens computational photography that invented Night Sight, dual front selfie cameras, and active edge squeeze.',
    priceNPR: 22000,
    releaseYear: 2018
  },
  {
    id: 'pixel2xl',
    brand: 'Google',
    name: 'Pixel 2 XL',
    spec: '64 GB · Black & White Panda',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 50,
    reviews: 90,
    category: 'flagships',
    description: 'Iconic Panda two-tone design, front-facing stereo speakers, Pixel Visual Core co-processor, and single-lens portrait mode.',
    priceNPR: 16000,
    releaseYear: 2017
  },
  {
    id: 'pixel1',
    brand: 'Google',
    name: 'Google Pixel (Original 2016)',
    spec: '32 GB · Very Silver',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 60,
    reviews: 80,
    category: 'flagships',
    description: '"Phone by Google": Introduced the Google Assistant, unlimited original-quality Google Photos backup for life, and top DxOMark camera.',
    priceNPR: 14000,
    releaseYear: 2016
  },

  // ==========================================
  // ⚡ ONEPLUS GENERATIONS (OnePlus One to 13)
  // ==========================================
  {
    id: 'op13',
    brand: 'OnePlus',
    name: 'OnePlus 13',
    spec: '256 GB · Midnight Ocean',
    img: './assets/phones/oneplus12.jpg',
    reward: 160,
    reviews: 75,
    category: 'flagships',
    description: 'Snapdragon 8 Elite, 6000mAh Glacier silicon battery, 2K 120Hz BOE X2 display, and IP68 + IP69 extreme water proofing.',
    priceNPR: 155000,
    releaseYear: 2025
  },
  {
    id: 'op12',
    brand: 'OnePlus',
    name: 'OnePlus 12',
    spec: '256 GB · Flowy Emerald',
    img: './assets/phones/oneplus12.jpg',
    reward: 120,
    reviews: 96,
    category: 'flagships',
    description: '4th Gen Hasselblad camera, 2K 120Hz 4500-nit ProXDR display, Snapdragon 8 Gen 3, and 100W SUPERVOOC fast charge.',
    priceNPR: 139999,
    releaseYear: 2024
  },
  {
    id: 'op11',
    brand: 'OnePlus',
    name: 'OnePlus 11 5G',
    spec: '128 GB · Titan Black',
    img: './assets/phones/oneplus12.jpg',
    reward: 110,
    reviews: 145,
    category: 'flagships',
    description: 'Circular black-hole camera housing, Snapdragon 8 Gen 2, 3rd Gen Hasselblad calibration, and 100W SuperVOOC.',
    priceNPR: 95000,
    releaseYear: 2023
  },
  {
    id: 'op10p',
    brand: 'OnePlus',
    name: 'OnePlus 10 Pro',
    spec: '128 GB · Volcanic Black',
    img: './assets/phones/oneplus12.jpg',
    reward: 100,
    reviews: 130,
    category: 'flagships',
    description: 'Ceramic camera plate merging into aluminum frame, 150-degree ultra-wide lens, 80W charging, and Snapdragon 8 Gen 1.',
    priceNPR: 72000,
    releaseYear: 2022
  },
  {
    id: 'op9p',
    brand: 'OnePlus',
    name: 'OnePlus 9 Pro',
    spec: '128 GB · Morning Mist',
    img: './assets/phones/oneplus12.jpg',
    reward: 90,
    reviews: 150,
    category: 'flagships',
    description: 'First OnePlus with Hasselblad partnership, 50MP freeform ultra-wide lens, 65W Warp Charge, and 50W wireless charging.',
    priceNPR: 58000,
    releaseYear: 2021
  },
  {
    id: 'op8p',
    brand: 'OnePlus',
    name: 'OnePlus 8 Pro',
    spec: '128 GB · Glacial Green',
    img: './assets/phones/oneplus12.jpg',
    reward: 80,
    reviews: 160,
    category: 'flagships',
    description: 'First OnePlus phone with official IP68 water resistance, 30W wireless charging, and 120Hz QHD+ Fluid Display.',
    priceNPR: 45000,
    releaseYear: 2020
  },
  {
    id: 'op7tp',
    brand: 'OnePlus',
    name: 'OnePlus 7T Pro',
    spec: '256 GB · Haze Blue',
    img: './assets/phones/oneplus12.jpg',
    reward: 80,
    reviews: 135,
    category: 'flagships',
    description: 'Legendary motorized pop-up selfie camera, completely uninterrupted 90Hz QHD+ Fluid AMOLED, and Snapdragon 855+.',
    priceNPR: 38000,
    releaseYear: 2019
  },
  {
    id: 'op7p',
    brand: 'OnePlus',
    name: 'OnePlus 7 Pro',
    spec: '128 GB · Nebula Blue',
    img: './assets/phones/oneplus12.jpg',
    reward: 70,
    reviews: 190,
    category: 'flagships',
    description: 'The phone that made 90Hz refresh rate famous worldwide: Notch-free screen, pop-up camera, and triple focal lengths.',
    priceNPR: 32000,
    releaseYear: 2019
  },
  {
    id: 'op6t',
    brand: 'OnePlus',
    name: 'OnePlus 6T',
    spec: '128 GB · Mirror Black',
    img: './assets/phones/oneplus12.jpg',
    reward: 60,
    reviews: 140,
    category: 'flagships',
    description: 'First OnePlus with in-display optical fingerprint sensor, minimalist teardrop notch, and Dash Fast Charging.',
    priceNPR: 22000,
    releaseYear: 2018
  },
  {
    id: 'op5t',
    brand: 'OnePlus',
    name: 'OnePlus 5T',
    spec: '64 GB · Midnight Black',
    img: './assets/phones/oneplus12.jpg',
    reward: 50,
    reviews: 110,
    category: 'flagships',
    description: 'First 18:9 tall display OnePlus, ultra-fast Face Unlock, ceramic rear fingerprint reader, and Dash Charge.',
    priceNPR: 16000,
    releaseYear: 2017
  },
  {
    id: 'op3t',
    brand: 'OnePlus',
    name: 'OnePlus 3T',
    spec: '64 GB · Gunmetal Gray',
    img: './assets/phones/oneplus12.jpg',
    reward: 50,
    reviews: 95,
    category: 'flagships',
    description: 'All-metal unibody craftsmanship, Snapdragon 821, front ceramic fingerprint reader, and 5V/4A Dash Charging.',
    priceNPR: 12000,
    releaseYear: 2016
  },
  {
    id: 'opone',
    brand: 'OnePlus',
    name: 'OnePlus One (Original 2014)',
    spec: '64 GB · Sandstone Black',
    img: './assets/phones/oneplus12.jpg',
    reward: 80,
    reviews: 130,
    category: 'flagships',
    description: 'The original 2014 "Flagship Killer": Sandstone tactile texture, CyanogenMod OS, Snapdragon 801, and $299 price disruption.',
    priceNPR: 25000,
    releaseYear: 2014
  },
  {
    id: 'opopen',
    brand: 'OnePlus',
    name: 'OnePlus Open',
    spec: '512 GB · Emerald Dusk',
    img: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
    reward: 170,
    reviews: 65,
    category: 'foldables',
    description: 'Near-crease-free 7.82-inch Flexi-fluid AMOLED, Hasselblad triple camera with 3x periscope, and Open Canvas multitasking.',
    priceNPR: 220000,
    releaseYear: 2023
  },
  {
    id: 'opnord4',
    brand: 'OnePlus',
    name: 'OnePlus Nord 4',
    spec: '256 GB · Oasis Green',
    img: './assets/phones/oneplus12.jpg',
    reward: 90,
    reviews: 125,
    category: 'midrange',
    description: 'First all-metal unibody 5G smartphone in years, Snapdragon 7+ Gen 3 chip, 5500mAh battery, and 100W charging.',
    priceNPR: 52999,
    releaseYear: 2024
  },

  // ==========================================
  // 🟠 XIAOMI / REDMI / POCO
  // ==========================================
  {
    id: 'mi14u',
    brand: 'Xiaomi',
    name: 'Xiaomi 14 Ultra',
    spec: '512 GB · White Vegan Leather',
    img: './assets/phones/CGG-Xiaomi-Redmi-Note-13-Pro-Plus-5G.png',
    reward: 160,
    reviews: 82,
    category: 'flagships',
    description: 'Leica Summilux quad 50MP cameras with 1-inch stepless variable aperture, 8K video, and Snapdragon 8 Gen 3.',
    priceNPR: 185000,
    releaseYear: 2024
  },
  {
    id: 'mi13p',
    brand: 'Xiaomi',
    name: 'Xiaomi 13 Pro',
    spec: '256 GB · Ceramic Black',
    img: './assets/phones/CGG-Xiaomi-Redmi-Note-13-Pro-Plus-5G.png',
    reward: 120,
    reviews: 140,
    category: 'flagships',
    description: '1-inch Sony IMX989 sensor with Leica optics, 75mm floating telephoto, 120W HyperCharge, and ceramic back plate.',
    priceNPR: 110000,
    releaseYear: 2023
  },
  {
    id: 'mi11u',
    brand: 'Xiaomi',
    name: 'Xiaomi Mi 11 Ultra',
    spec: '256 GB · Ceramic White',
    img: './assets/phones/CGG-Xiaomi-Redmi-Note-13-Pro-Plus-5G.png',
    reward: 110,
    reviews: 155,
    category: 'flagships',
    description: 'The "King of Android": Massive 1/1.12-inch GN2 sensor, secondary rear selfie screen in camera island, and 67W wireless charging.',
    priceNPR: 78000,
    releaseYear: 2021
  },
  {
    id: 'mimix',
    brand: 'Xiaomi',
    name: 'Xiaomi Mi MIX (Original 2016)',
    spec: '128 GB · Glossy Ceramic',
    img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    reward: 90,
    reviews: 95,
    category: 'flagships',
    description: 'Philippe Starck conceptual masterpiece that started the bezel-less revolution: Full ceramic unibody and piezoelectric ear speaker.',
    priceNPR: 45000,
    releaseYear: 2016
  },
  {
    id: 'poco_f6',
    brand: 'Xiaomi',
    name: 'POCO F6 Pro 5G',
    spec: '256 GB · Shadow Black',
    img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    reward: 110,
    reviews: 215,
    category: 'gaming',
    description: 'Snapdragon 8 Gen 2 gaming chip, LiquidCool Technology 4.0 with IceLoop, 120W HyperCharge, and 120Hz WQHD+ display.',
    priceNPR: 64999,
    releaseYear: 2024
  },
  {
    id: 'poco_f1',
    brand: 'Xiaomi',
    name: 'POCO F1 (Pocophone 2018)',
    spec: '64 GB · Armoured Kevlar',
    img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    reward: 80,
    reviews: 320,
    category: 'gaming',
    description: 'The legendary "Master of Speed": Snapdragon 845 flagship chip, LiquidCool copper heat pipe, IR face unlock, and 4000mAh battery for $300.',
    priceNPR: 24000,
    releaseYear: 2018
  },
  {
    id: 'redmi13pro',
    brand: 'Xiaomi',
    name: 'Redmi Note 13 Pro+ 5G',
    spec: '256 GB · Midnight Black',
    img: './assets/phones/CGG-Xiaomi-Redmi-Note-13-Pro-Plus-5G.png',
    reward: 100,
    reviews: 188,
    category: 'midrange',
    description: '200MP OIS camera, 1.5K 120Hz curved AMOLED, 120W HyperCharge, IP68 water resistance, and MediaTek Dimensity 7200-Ultra.',
    priceNPR: 52999,
    releaseYear: 2024
  },
  {
    id: 'redmi12pro',
    brand: 'Xiaomi',
    name: 'Redmi Note 12 Pro+ 5G',
    spec: '256 GB · Arctic White',
    img: './assets/phones/CGG-Xiaomi-Redmi-Note-13-Pro-5G.png',
    reward: 90,
    reviews: 170,
    category: 'midrange',
    description: '200MP HPX sensor with OIS, 120W fast charging, 120Hz Dolby Vision Pro AMOLED screen, and MediaTek Dimensity 1080.',
    priceNPR: 39999,
    releaseYear: 2023
  },
  {
    id: 'redmi10pro',
    brand: 'Xiaomi',
    name: 'Redmi Note 10 Pro',
    spec: '128 GB · Vintage Bronze',
    img: './assets/phones/CGG-Xiaomi-Redmi-Note-13-Pro-5G.png',
    reward: 80,
    reviews: 280,
    category: 'midrange',
    description: 'Pioneered 120Hz AMOLED and 108MP camera in the budget segment, with telemacro super-close photos and dual speakers.',
    priceNPR: 28000,
    releaseYear: 2021
  },
  {
    id: 'redmi7pro',
    brand: 'Xiaomi',
    name: 'Redmi Note 7 Pro',
    spec: '64 GB · Nebula Red',
    img: './assets/phones/CGG-Xiaomi-Redmi-Note-13-Pro-5G.png',
    reward: 70,
    reviews: 210,
    category: 'budget',
    description: 'First budget phone with 48MP Sony IMX586 sensor, glass gradient back with Gorilla Glass 5, and Snapdragon 675.',
    priceNPR: 18000,
    releaseYear: 2019
  },
  {
    id: 'redmi13c',
    brand: 'Xiaomi',
    name: 'Redmi 13C 5G',
    spec: '128 GB · Starshine Green',
    img: './assets/phones/CGG-Xiaomi-Redmi-Note-13-Pro-5G.png',
    reward: 70,
    reviews: 310,
    category: 'budget',
    description: 'Popular budget champion: 50MP AI dual camera, MediaTek Dimensity 6100+ 5G processor, and 5000mAh battery with 18W charging.',
    priceNPR: 18999,
    releaseYear: 2024
  },

  // ==========================================
  // 📸 VIVO & IQOO (Every generation & flagship)
  // ==========================================
  {
    id: 'vivox100u',
    brand: 'vivo',
    name: 'vivo X100 Ultra',
    spec: '512 GB · Titanium Grey',
    img: './assets/phones/vivov30.jpg',
    reward: 160,
    reviews: 124,
    category: 'camera',
    description: 'The "Thanos" of camera phones: 200MP ZEISS APO telephoto, 1-inch Sony LYT-900 sensor, V3+ imaging chip, and Snapdragon 8 Gen 3.',
    priceNPR: 185000,
    releaseYear: 2024
  },
  {
    id: 'vivox100p',
    brand: 'vivo',
    name: 'vivo X100 Pro',
    spec: '512 GB · Sunset Orange',
    img: './assets/phones/vivov30.jpg',
    reward: 150,
    reviews: 110,
    category: 'camera',
    description: 'ZEISS APO 100mm floating periscope telephoto, 1-inch Sony IMX989 sensor, V3 imaging chip, and Dimensity 9300.',
    priceNPR: 165000,
    releaseYear: 2024
  },
  {
    id: 'vivox100',
    brand: 'vivo',
    name: 'vivo X100 5G',
    spec: '256 GB · Starlight Blue',
    img: './assets/phones/vivov30.jpg',
    reward: 130,
    reviews: 98,
    category: 'camera',
    description: 'ZEISS T* multi-focal portrait camera, custom Sony IMX920 VCS sensor, 120W Dual-Cell FlashCharge, and Dimensity 9300.',
    priceNPR: 115000,
    releaseYear: 2024
  },
  {
    id: 'vivoxfold3p',
    brand: 'vivo',
    name: 'vivo X Fold 3 Pro',
    spec: '512 GB · Solar White',
    img: './assets/phones/vivov30.jpg',
    reward: 180,
    reviews: 75,
    category: 'flagships',
    description: 'World thinnest and lightest foldable with carbon fiber hinge, IPX8 waterproof, 64MP ZEISS periscope telephoto, and Snapdragon 8 Gen 3.',
    priceNPR: 235000,
    releaseYear: 2024
  },
  {
    id: 'vivox90p',
    brand: 'vivo',
    name: 'vivo X90 Pro',
    spec: '256 GB · Legendary Black Leather',
    img: './assets/phones/vivov30.jpg',
    reward: 120,
    reviews: 95,
    category: 'camera',
    description: '1-inch Sony sensor with ZEISS T* lens coating, V2 custom imaging chip, 120W Dual-Cell FlashCharge, and vegan leather.',
    priceNPR: 120000,
    releaseYear: 2023
  },
  {
    id: 'vivov40p',
    brand: 'vivo',
    name: 'vivo V40 Pro 5G',
    spec: '256 GB · Ganges Blue',
    img: './assets/phones/vivov30.jpg',
    reward: 115,
    reviews: 160,
    category: 'camera',
    description: 'First V-series with full ZEISS multi-focal portrait system, 50MP Sony IMX921 OIS camera, 5500mAh BlueVolt battery in ultra-slim body.',
    priceNPR: 74999,
    releaseYear: 2024
  },
  {
    id: 'vivov40',
    brand: 'vivo',
    name: 'vivo V40 5G',
    spec: '256 GB · Titanium Grey',
    img: './assets/phones/vivov30.jpg',
    reward: 105,
    reviews: 145,
    category: 'camera',
    description: 'ZEISS co-engineered 50MP OIS portrait camera, 5500mAh massive battery in 7.58mm body, IP68 water resistance, and 80W charging.',
    priceNPR: 62999,
    releaseYear: 2024
  },
  {
    id: 'v30',
    brand: 'vivo',
    name: 'vivo V30 5G',
    spec: '256 GB · Peacock Green',
    img: './assets/phones/vivov30.jpg',
    reward: 100,
    reviews: 143,
    category: 'camera',
    description: 'Studio-quality Aura Light portrait system, ultra-slim 3D curved 1.5K AMOLED, 50MP VCS True Color OIS camera, 5000mAh battery.',
    priceNPR: 60999,
    releaseYear: 2024
  },
  {
    id: 'v29p',
    brand: 'vivo',
    name: 'vivo V29 Pro 5G',
    spec: '256 GB · Himalayan Blue',
    img: './assets/phones/vivov30.jpg',
    reward: 90,
    reviews: 120,
    category: 'camera',
    description: 'Smart Aura Light portrait flash, 50MP Sony IMX766V OIS camera, 3D magnetic particle glass, and 80W FlashCharge.',
    priceNPR: 48999,
    releaseYear: 2023
  },
  {
    id: 'vivot3p',
    brand: 'vivo',
    name: 'vivo T3 Pro 5G',
    spec: '256 GB · Sandstone Orange Leather',
    img: './assets/phones/vivov30.jpg',
    reward: 85,
    reviews: 135,
    category: 'midrange',
    description: 'Snapdragon 7 Gen 3 performance, 120Hz 3D curved AMOLED, 50MP Sony IMX882 OIS camera, and 5500mAh battery.',
    priceNPR: 38999,
    releaseYear: 2024
  },
  {
    id: 'vivoy200',
    brand: 'vivo',
    name: 'vivo Y200 5G',
    spec: '128 GB · Desert Gold',
    img: './assets/phones/vivov30.jpg',
    reward: 75,
    reviews: 190,
    category: 'budget',
    description: 'Smart Aura ring light, 64MP OIS anti-shake camera, 120Hz Ultra Vision AMOLED display, and 44W FlashCharge.',
    priceNPR: 29999,
    releaseYear: 2023
  },
  {
    id: 'iqoo13',
    brand: 'iQOO',
    name: 'iQOO 13 5G',
    spec: '512 GB · Track Edition',
    img: './assets/phones/vivov30.jpg',
    reward: 140,
    reviews: 95,
    category: 'gaming',
    description: 'Snapdragon 8 Elite cutting-edge chipset, 2K 144Hz Q10 OLED, 6150mAh silicon battery with 120W charging, and Monster Halo RGB LED.',
    priceNPR: 115000,
    releaseYear: 2024
  },
  {
    id: 'iqoo12',
    brand: 'iQOO',
    name: 'iQOO 12 5G',
    spec: '256 GB · Legend White',
    img: './assets/phones/vivov30.jpg',
    reward: 120,
    reviews: 135,
    category: 'gaming',
    description: 'Snapdragon 8 Gen 3 gaming phone, 144Hz AMOLED screen, Q1 e-sports display chip, and 50MP periscope zoom lens.',
    priceNPR: 89999,
    releaseYear: 2024
  },
  {
    id: 'iqooneo9',
    brand: 'iQOO',
    name: 'iQOO Neo 9 Pro',
    spec: '256 GB · Fiery Red Dual Tone',
    img: './assets/phones/vivov30.jpg',
    reward: 100,
    reviews: 155,
    category: 'gaming',
    description: 'Snapdragon 8 Gen 2 flagship chip, 144Hz LTPO AMOLED, 50MP Sony IMX920 night camera, and 120W FlashCharge.',
    priceNPR: 56999,
    releaseYear: 2024
  },
  {
    id: 'iqooz9turbo',
    brand: 'iQOO',
    name: 'iQOO Z9 Turbo 5G',
    spec: '256 GB · Starburst White',
    img: './assets/phones/vivov30.jpg',
    reward: 85,
    reviews: 110,
    category: 'gaming',
    description: 'Snapdragon 8s Gen 3, 6000mAh monster battery, 144Hz 1.5K display, and 6043mm² vapor chamber cooling.',
    priceNPR: 42999,
    releaseYear: 2024
  },

  // ==========================================
  // 🟢 OPPO & REALME (Find, Reno, A-series, GT)
  // ==========================================
  {
    id: 'findx7u',
    brand: 'OPPO',
    name: 'OPPO Find X7 Ultra',
    spec: '256 GB · Ocean Blue Leather',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 150,
    reviews: 90,
    category: 'camera',
    description: 'World first dual periscope telephoto camera system (3x & 6x), 1-inch Sony LYT-900 sensor, Hasselblad portrait mode, and 100W SuperVOOC.',
    priceNPR: 175000,
    releaseYear: 2024
  },
  {
    id: 'findx7',
    brand: 'OPPO',
    name: 'OPPO Find X7',
    spec: '256 GB · Smokey Purple',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 125,
    reviews: 78,
    category: 'camera',
    description: 'Dimensity 9300 flagship, Hasselblad HyperTone camera system, 64MP periscope telephoto, and 100W SuperVOOC.',
    priceNPR: 118000,
    releaseYear: 2024
  },
  {
    id: 'findn3fold',
    brand: 'OPPO',
    name: 'OPPO Find N3 Fold',
    spec: '512 GB · Champagne Gold',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 180,
    reviews: 65,
    category: 'flagships',
    description: 'Zero-crease Flexion Hinge, Boundless View multitasking, 3x periscope telephoto Hasselblad camera, and Snapdragon 8 Gen 2.',
    priceNPR: 225000,
    releaseYear: 2024
  },
  {
    id: 'findn3flip',
    brand: 'OPPO',
    name: 'OPPO Find N3 Flip',
    spec: '256 GB · Sleek Black',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 140,
    reviews: 82,
    category: 'flagships',
    description: 'Only flip phone with triple Hasselblad cameras: 32MP 2x portrait lens, large intuitive vertical cover screen, and 44W SuperVOOC.',
    priceNPR: 145000,
    releaseYear: 2023
  },
  {
    id: 'reno12',
    brand: 'OPPO',
    name: 'OPPO Reno 12 Pro 5G',
    spec: '256 GB · Nebula Silver',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 100,
    reviews: 167,
    category: 'camera',
    description: 'Infinite View Quad-Curved screen, GenAI photo tools (AI Eraser 2.0 & AI Best Face), 50MP telephoto portrait, and 80W flash charging.',
    priceNPR: 65999,
    releaseYear: 2024
  },
  {
    id: 'reno12reg',
    brand: 'OPPO',
    name: 'OPPO Reno 12 5G',
    spec: '256 GB · Astro Silver',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 95,
    reviews: 142,
    category: 'camera',
    description: 'Futuristic Fluid Design, 50MP Sony LYT-600 OIS camera, AI Studio avatar creator, and MediaTek Dimensity 7300-Energy.',
    priceNPR: 56999,
    releaseYear: 2024
  },
  {
    id: 'reno11p',
    brand: 'OPPO',
    name: 'OPPO Reno 11 Pro 5G',
    spec: '256 GB · Pearl White',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 90,
    reviews: 150,
    category: 'camera',
    description: '32MP portrait telephoto camera, 120Hz 3D curved OLED, 80W SuperVOOC charging, and MediaTek Dimensity 8200.',
    priceNPR: 52999,
    releaseYear: 2024
  },
  {
    id: 'oppof27',
    brand: 'OPPO',
    name: 'OPPO F27 Pro+ 5G',
    spec: '256 GB · Dusk Pink Leather',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 90,
    reviews: 130,
    category: 'midrange',
    description: 'First waterproof IP69, IP68, and IP66 certified smartphone in its class: 360-degree Armor Body and 67W SuperVOOC.',
    priceNPR: 42999,
    releaseYear: 2024
  },
  {
    id: 'oppoa79',
    brand: 'OPPO',
    name: 'OPPO A79 5G',
    spec: '128 GB · Glowing Green',
    img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    reward: 75,
    reviews: 185,
    category: 'budget',
    description: 'Glowing Feather design, 50MP AI camera, Dual Stereo Speakers with 300% Ultra Volume mode, and 33W SUPERVOOC.',
    priceNPR: 28999,
    releaseYear: 2023
  },
  {
    id: 'realmegt7p',
    brand: 'Realme',
    name: 'Realme GT 7 Pro',
    spec: '512 GB · Mars Orange',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 140,
    reviews: 88,
    category: 'flagships',
    description: 'Snapdragon 8 Elite chipset, Eco² OLED Plus display, massive 6500mAh Titan battery, underwater camera mode, and 120W charging.',
    priceNPR: 110000,
    releaseYear: 2024
  },
  {
    id: 'realmegt6',
    brand: 'Realme',
    name: 'Realme GT 6',
    spec: '256 GB · Fluid Silver',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 110,
    reviews: 140,
    category: 'midrange',
    description: 'Snapdragon 8s Gen 3, world brightest 6000-nit 8T LTPO screen, 50MP Sony LYT-808 OIS camera, and 120W charging.',
    priceNPR: 62999,
    releaseYear: 2024
  },
  {
    id: 'realme13p',
    brand: 'Realme',
    name: 'Realme 13 Pro+ 5G',
    spec: '256 GB · Monet Gold',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 100,
    reviews: 135,
    category: 'camera',
    description: 'HYPERIMAGE+ AI camera system, dual Sony 50MP OIS sensors with periscope telephoto, inspired by Claude Monet paintings.',
    priceNPR: 52999,
    releaseYear: 2024
  },
  {
    id: 'realme12p',
    brand: 'Realme',
    name: 'Realme 12 Pro+ 5G',
    spec: '256 GB · Submarine Blue',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 90,
    reviews: 165,
    category: 'camera',
    description: 'Luxury watch dial camera design with golden fluted bezel, 64MP periscope telephoto with 120x zoom, and vegan leather back.',
    priceNPR: 44999,
    releaseYear: 2024
  },
  {
    id: 'realmenarzo70',
    brand: 'Realme',
    name: 'Realme Narzo 70 Pro 5G',
    spec: '128 GB · Glass Green',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    reward: 80,
    reviews: 210,
    category: 'midrange',
    description: 'Flagship Sony IMX890 OIS camera in budget segment, Creative Air Gestures without touching screen, and 67W SuperVOOC.',
    priceNPR: 32999,
    releaseYear: 2024
  },

  // ==========================================
  // ⚪ NOTHING PHONE
  // ==========================================
  {
    id: 'nothing2',
    brand: 'Nothing',
    name: 'Nothing Phone (2)',
    spec: '256 GB · Dark Grey',
    img: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80',
    reward: 110,
    reviews: 172,
    category: 'midrange',
    description: 'Iconic transparent back with 33-zone Glyph lighting interface, Nothing OS 2.5 monochrome minimalism, and Snapdragon 8+ Gen 1.',
    priceNPR: 68999,
    releaseYear: 2023
  },
  {
    id: 'nothing2a',
    brand: 'Nothing',
    name: 'Nothing Phone (2a) Plus',
    spec: '256 GB · Metallic Grey',
    img: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80',
    reward: 95,
    reviews: 120,
    category: 'midrange',
    description: 'Custom MediaTek Dimensity 7350 Pro 5G, unique central eyes camera layout, 50MP selfie lens, and 50W fast charging.',
    priceNPR: 45999,
    releaseYear: 2024
  },
  {
    id: 'nothing1',
    brand: 'Nothing',
    name: 'Nothing Phone (1)',
    spec: '128 GB · Pure White',
    img: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80',
    reward: 80,
    reviews: 190,
    category: 'midrange',
    description: 'First transparent Glyph light phone, 100% recycled aluminum chassis, wireless charging with reverse charge, and Nothing OS.',
    priceNPR: 38000,
    releaseYear: 2022
  },
  {
    id: 'cmf1',
    brand: 'Nothing',
    name: 'CMF Phone 1',
    spec: '128 GB · Bright Orange',
    img: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80',
    reward: 85,
    reviews: 195,
    category: 'budget',
    description: 'Modular smartphone with removable back cover screws, accessory mount point (kickstand/lanyard), and Super AMOLED 120Hz.',
    priceNPR: 28999,
    releaseYear: 2024
  },

  // ==========================================
  // 🎮 GAMING BEASTS
  // ==========================================
  {
    id: 'rog8',
    brand: 'ASUS',
    name: 'ROG Phone 8 Pro',
    spec: '512 GB · Phantom Black',
    img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    reward: 150,
    reviews: 132,
    category: 'gaming',
    description: '165Hz Samsung AMOLED, Snapdragon 8 Gen 3, AirTrigger ultrasonic shoulder controls, AniMe Vision mini-LED matrix.',
    priceNPR: 155000,
    releaseYear: 2024
  },
  {
    id: 'redmagic9s',
    brand: 'Nubia',
    name: 'RedMagic 9S Pro',
    spec: '512 GB · Cyclone Transparent',
    img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    reward: 150,
    reviews: 98,
    category: 'gaming',
    description: 'Completely flat rear back with no camera bump, built-in 22,000 RPM RGB cooling fan, Snapdragon 8 Gen 3 Leading Version, and 6500mAh battery.',
    priceNPR: 148000,
    releaseYear: 2024
  }
];

export const phoneByIdFromAll = (id: string): PhoneProduct => {
  return ALL_COMPANIES_PHONES.find(p => p.id === id) || ALL_COMPANIES_PHONES[0];
};
