import React, { useState, useMemo } from 'react';
import { 
  Search, X, Check, Smartphone, Sparkles, Filter, ArrowRight,
  Folder, FolderOpen, ChevronRight, ChevronDown, Layers, Grid,
  Camera, Zap, Video
} from 'lucide-react';
import { PhoneProduct } from '../types';
import { PHONE_BRANDS, PhoneBrandCategory, getPhoneGenerationGroup, getPhoneCapabilities } from '../data/allPhones';
import { rs } from '../data/initialData';

interface PhoneSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  phones: PhoneProduct[];
  selectedPhoneId: string;
  onSelectPhone: (phoneId: string) => void;
  initialBrand?: string;
}

export const PhoneSelectorModal: React.FC<PhoneSelectorModalProps> = ({
  isOpen,
  onClose,
  phones,
  selectedPhoneId,
  onSelectPhone,
  initialBrand = 'all',
}) => {
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'folders' | 'grid'>('folders');
  const [folderGenFilter, setFolderGenFilter] = useState<Record<string, string>>({});
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    apple: true, // Default open Apple iPhone folder (Models 1 to 18)
    samsung: false,
    vivo: false,
    oppo: false,
    google: false,
    oneplus: false,
    xiaomi: false,
  });

  // Toggle folder accordion
  const toggleFolder = (brandId: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [brandId]: !prev[brandId],
    }));
  };

  // Group phones by Brand Folder
  const phonesByFolder = useMemo(() => {
    const map: Record<string, PhoneProduct[]> = {
      apple: [],
      samsung: [],
      google: [],
      oneplus: [],
      xiaomi: [],
      vivo: [],
      oppo: [],
      nothing: [],
      gaming: [],
    };

    phones.forEach((p) => {
      const b = p.brand.toLowerCase();
      const n = p.name.toLowerCase();

      if (b === 'apple' || n.includes('iphone')) {
        map.apple.push(p);
      } else if (b === 'samsung' || n.includes('galaxy')) {
        map.samsung.push(p);
      } else if (b === 'google' || n.includes('pixel')) {
        map.google.push(p);
      } else if (b === 'oneplus') {
        map.oneplus.push(p);
      } else if (['xiaomi', 'poco', 'redmi'].includes(b) || n.includes('redmi') || n.includes('poco')) {
        map.xiaomi.push(p);
      } else if (['vivo', 'iqoo'].includes(b)) {
        map.vivo.push(p);
      } else if (['oppo', 'realme'].includes(b)) {
        map.oppo.push(p);
      } else if (b === 'nothing') {
        map.nothing.push(p);
      } else {
        map.gaming.push(p);
      }
    });

    return map;
  }, [phones]);

  // Filtered phones for general grid view
  const filteredPhones = useMemo(() => {
    return phones.filter((p) => {
      // Brand filter
      let brandMatch = true;
      if (selectedBrand === 'apple') {
        brandMatch = p.brand.toLowerCase() === 'apple' || p.name.toLowerCase().includes('iphone');
      } else if (selectedBrand === 'samsung') {
        brandMatch = p.brand.toLowerCase() === 'samsung' || p.name.toLowerCase().includes('galaxy');
      } else if (selectedBrand === 'google') {
        brandMatch = p.brand.toLowerCase() === 'google' || p.name.toLowerCase().includes('pixel');
      } else if (selectedBrand === 'oneplus') {
        brandMatch = p.brand.toLowerCase() === 'oneplus';
      } else if (selectedBrand === 'xiaomi') {
        brandMatch = ['xiaomi', 'poco', 'redmi'].includes(p.brand.toLowerCase()) || 
          p.name.toLowerCase().includes('redmi') || p.name.toLowerCase().includes('poco');
      } else if (selectedBrand === 'vivo') {
        brandMatch = ['vivo', 'iqoo'].includes(p.brand.toLowerCase());
      } else if (selectedBrand === 'oppo') {
        brandMatch = ['oppo', 'realme'].includes(p.brand.toLowerCase());
      } else if (selectedBrand === 'nothing') {
        brandMatch = p.brand.toLowerCase() === 'nothing';
      } else if (selectedBrand === 'gaming') {
        brandMatch = p.category === 'gaming' || ['asus', 'nubia'].includes(p.brand.toLowerCase());
      }

      // Search query
      const q = searchQuery.toLowerCase().trim();
      const searchMatch = !q || 
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.spec.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q);

      return brandMatch && searchMatch;
    });
  }, [phones, selectedBrand, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-neutral-900 border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-neutral-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>Mobile Brand Folders Directory</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/40">
                  {phones.length} Models
                </span>
              </h2>
              <p className="text-white/60 text-xs">
                Organized folder categorization: Apple iPhone 1–18, Samsung Galaxy, Vivo, OPPO...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-white/10 p-1 rounded-xl flex items-center gap-1 border border-white/15">
              <button
                type="button"
                onClick={() => setViewMode('folders')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                  viewMode === 'folders'
                    ? 'bg-sky-500 text-neutral-950 shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
                title="Folder Category View"
              >
                <Folder className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Folders</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-sky-500 text-neutral-950 shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
                title="All Models Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 bg-neutral-900 border-b border-white/10">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by model e.g. iPhone 16 Pro, Galaxy S24, Vivo X100, Pixel 9..."
              className="w-full bg-neutral-950 border border-white/20 rounded-xl py-2 pl-10 pr-10 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-sky-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-xs text-white/50 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Brand Tabs (Horizontal Scrollable) */}
        <div className="px-3 py-2 bg-neutral-950/70 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {PHONE_BRANDS.map((b) => {
            const isSelected = selectedBrand === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedBrand(b.id);
                  if (b.id !== 'all') {
                    setOpenFolders((prev) => ({ ...prev, [b.id]: true }));
                  }
                }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500 text-neutral-950 shadow-md scale-[1.02]'
                    : 'bg-white/5 hover:bg-white/10 text-white/75 border border-white/10'
                }`}
              >
                <span>{b.iconEmoji}</span>
                <span>{b.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area: Folders View OR Grid View */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3">
          {viewMode === 'folders' ? (
            /* ========================================================
               📁 FOLDER CATEGORIZATION ACCORDION VIEW
               ======================================================== */
            <div className="space-y-3">
              {PHONE_BRANDS.filter((b) => b.id !== 'all').map((b) => {
                const folderPhones = phonesByFolder[b.id] || [];
                const q = searchQuery.toLowerCase().trim();
                const matchedInFolder = folderPhones.filter((p) => 
                  !q ||
                  p.name.toLowerCase().includes(q) ||
                  p.brand.toLowerCase().includes(q) ||
                  p.spec.toLowerCase().includes(q)
                );

                // Auto-expand folder if search matches
                const isOpenFolder = q ? matchedInFolder.length > 0 : !!openFolders[b.id];

                if (q && matchedInFolder.length === 0) return null;

                return (
                  <div
                    key={b.id}
                    className="border border-white/15 rounded-2xl bg-neutral-950/70 overflow-hidden shadow-lg transition-all"
                  >
                    {/* Folder Header Banner */}
                    <div
                      onClick={() => toggleFolder(b.id)}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300 shadow-sm shrink-0">
                          {isOpenFolder ? (
                            <FolderOpen className="w-5 h-5 text-sky-400" />
                          ) : (
                            <Folder className="w-5 h-5 text-sky-400" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="text-white font-extrabold text-sm sm:text-base flex items-center gap-2">
                            <span>{b.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold">
                              {matchedInFolder.length} Models
                            </span>
                          </div>
                          <div className="text-[11px] text-white/55 truncate max-w-sm sm:max-w-md">
                            {b.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-sky-400 hidden sm:inline">
                          {isOpenFolder ? 'Collapse' : 'Browse Models'}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70">
                          {isOpenFolder ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inner Models Grid */}
                    {isOpenFolder && (
                      <div className="p-3 bg-neutral-900/90 border-t border-white/10">
                        {/* Sub-generation Era Filter Chips (e.g. iPhone 16-18, 12-15, X-11, 6-8, 1-5s) */}
                        {b.generations && b.generations.length > 1 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-2.5 border-b border-white/10 scrollbar-none">
                            {b.generations.map((gen) => {
                              const activeGen = folderGenFilter[b.id] || b.generations![0];
                              const isAct = activeGen === gen;
                              return (
                                <button
                                  key={gen}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFolderGenFilter((prev) => ({ ...prev, [b.id]: gen }));
                                  }}
                                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                    isAct
                                      ? 'bg-sky-400 text-neutral-950 font-black shadow-xs scale-[1.02]'
                                      : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                                  }`}
                                >
                                  {gen}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {matchedInFolder.filter((phone) => {
                            if (!b.generations || b.generations.length <= 1) return true;
                            const activeGen = folderGenFilter[b.id] || b.generations[0];
                            if (activeGen === b.generations[0] || activeGen.startsWith('All')) return true;
                            return getPhoneGenerationGroup(phone) === activeGen;
                          }).map((phone) => {
                            const isCurrent = phone.id === selectedPhoneId;
                            return (
                              <div
                                key={phone.id}
                                onClick={() => {
                                  onSelectPhone(phone.id);
                                  onClose();
                                }}
                                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center gap-3 relative ${
                                  isCurrent
                                    ? 'bg-sky-950/70 border-sky-400 ring-2 ring-sky-400/60 shadow-lg'
                                    : 'bg-neutral-950/80 hover:bg-neutral-800 border-white/10 hover:border-white/30 hover:scale-[1.01]'
                                }`}
                              >
                                {/* Phone Image */}
                                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-black/70 p-1 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                                  <img
                                    src={phone.img}
                                    alt={phone.name}
                                    className="w-full h-full object-contain drop-shadow"
                                    loading="lazy"
                                  />
                                </div>

                                {/* Phone Details */}
                                <div className="flex-1 min-w-0 pr-6">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                                      {phone.brand}
                                    </span>
                                    {phone.releaseYear && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-mono">
                                        {phone.releaseYear}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-white font-black text-sm truncate leading-snug">
                                    {phone.name}
                                  </h4>
                                  {/* Hardware Capabilities */}
                                  {(() => {
                                    const cap = getPhoneCapabilities(phone);
                                    return (
                                      <div className="mt-1 space-y-0.5">
                                        <div className="text-[10px] text-white/70 flex items-center gap-1 truncate">
                                          <Camera className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                                          <span className="truncate">{cap.camera}</span>
                                        </div>
                                        <div className="text-[10px] text-white/70 flex items-center gap-1 truncate">
                                          <Zap className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                          <span className="truncate">{cap.chipset}</span>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Reward Badge */}
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-extrabold text-[10px]">
                                      💰 Earn {rs(phone.reward)}
                                    </span>
                                    <span className="text-[10px] text-white/40">
                                      {phone.reviews} reviews
                                    </span>
                                  </div>
                                </div>

                                {/* Selection Checkmark */}
                                <div className="absolute top-3 right-3">
                                  {isCurrent ? (
                                    <div className="w-6 h-6 rounded-full bg-sky-400 text-neutral-950 flex items-center justify-center shadow-md">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/30 hover:text-white/80">
                                      <ArrowRight className="w-3 h-3" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================
               📱 ALL MODELS FLAT GRID VIEW
               ======================================================== */
            <div>
              {filteredPhones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredPhones.map((phone) => {
                    const isCurrent = phone.id === selectedPhoneId;
                    return (
                      <div
                        key={phone.id}
                        onClick={() => {
                          onSelectPhone(phone.id);
                          onClose();
                        }}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-center gap-3 relative ${
                          isCurrent
                            ? 'bg-sky-950/60 border-sky-400 ring-2 ring-sky-400/50 shadow-lg'
                            : 'bg-neutral-950/80 hover:bg-neutral-800 border-white/10 hover:border-white/25'
                        }`}
                      >
                        {/* Phone Image */}
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-black/60 p-1 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                          <img
                            src={phone.img}
                            alt={phone.name}
                            className="w-full h-full object-contain drop-shadow"
                            loading="lazy"
                          />
                        </div>

                        {/* Phone Details */}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                              {phone.brand}
                            </span>
                            {phone.releaseYear && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-mono">
                                {phone.releaseYear}
                              </span>
                            )}
                          </div>
                          <h4 className="text-white font-black text-sm truncate leading-snug">
                            {phone.name}
                          </h4>
                          <div className="text-[11px] text-white/50 truncate">
                            {phone.spec}
                          </div>

                          {/* Hardware Capabilities */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">
                              <Camera className="w-2.5 h-2.5 text-sky-400" />
                              <span className="truncate max-w-[110px]">{getPhoneCapabilities(phone).camera}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">
                              <Zap className="w-2.5 h-2.5 text-amber-400" />
                              <span className="truncate max-w-[110px]">{getPhoneCapabilities(phone).chipset}</span>
                            </span>
                          </div>

                          {/* Reward Badge */}
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-extrabold text-[10px]">
                              Earn {rs(phone.reward)}
                            </span>
                            <span className="text-[10px] text-white/40">
                              {phone.reviews} reviews
                            </span>
                          </div>
                        </div>

                        {/* Checkmark Indicator */}
                        <div className="absolute top-3 right-3">
                          {isCurrent ? (
                            <div className="w-6 h-6 rounded-full bg-sky-400 text-neutral-950 flex items-center justify-center shadow-md">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/30 hover:text-white/80">
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-white/50 text-sm">
                  <Smartphone className="w-10 h-10 mx-auto text-white/20 mb-2" />
                  <p>No phone model matches "{searchQuery}".</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedBrand('all');
                    }}
                    className="mt-3 text-xs text-sky-400 hover:underline cursor-pointer"
                  >
                    Reset filters to view all {phones.length} models
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-neutral-950 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <span>Showing {phones.length} models in 9 brand folders</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
