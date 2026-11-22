import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  User, 
  Check, 
  X, 
  ShieldCheck, 
  Building2, 
  Sparkles, 
  RefreshCw, 
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AtSign
} from 'lucide-react';
import { UserProfile } from '../types';

interface UserProfileProps {
  user?: UserProfile;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  isModal?: boolean;
}

// Curated avatar presets for quick 1-tap selection
const CURATED_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=250&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=250&auto=format&fit=crop&q=80',
];

export const UserProfileComponent: React.FC<UserProfileProps> = ({
  user,
  onUpdateUser,
  isOpen = true,
  onClose,
  title,
  isModal = true,
}) => {
  // Editable form state
  const [displayName, setDisplayName] = useState<string>(user?.name || '');
  const [nickname, setNickname] = useState<string>(user?.nickname || user?.name?.toLowerCase().replace(/\s+/g, '_') || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [city, setCity] = useState<string>(user?.city || 'Kathmandu');
  const [currentAvatar, setCurrentAvatar] = useState<string>(user?.avatar || '');

  // UI status feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gallery file upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera video capture states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync state when user prop changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setNickname(user.nickname || user.name?.toLowerCase().replace(/\s+/g, '_') || '');
      setPhone(user.phone || '');
      setCity(user.city || 'Kathmandu');
      setCurrentAvatar(user.avatar || '');
    }
  }, [user]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start Live Camera Capture
  const handleStartCamera = async () => {
    setCameraError(null);
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this device/browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);

      // Attach stream to video tag
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in browser settings or upload from gallery.'
          : 'Unable to access camera on this device. Please choose a photo from your gallery instead.'
      );
      setIsCameraActive(false);
    }
  };

  // Take Snapshot from Camera
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Crop center square
        const startX = ((video.videoWidth || size) - size) / 2;
        const startY = ((video.videoHeight || size) - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setCurrentAvatar(photoDataUrl);
        setSuccessMsg('Photo captured from camera! Click Save to apply.');
      }
    } catch (err) {
      setErrorMsg('Failed to process camera snapshot.');
    } finally {
      stopCameraStream();
    }
  };

  // Handle Gallery Image Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    // Check size (< 6MB)
    if (file.size > 6 * 1024 * 1024) {
      setErrorMsg('Image is too large (max 6MB). Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCurrentAvatar(result);
        setSuccessMsg('Photo selected from gallery! Click Save to apply.');
        setErrorMsg(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to load selected photo from gallery.');
    };
    reader.readAsDataURL(file);

    // Clear input so same file can be re-selected if needed
    e.target.value = '';
  };

  // Save changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setErrorMsg('Display name cannot be empty.');
      return;
    }

    const cleanedNickname = nickname.trim().replace(/^@/, '');
    const isDataUrl = currentAvatar.startsWith('data:');

    const updatedData: Partial<UserProfile> = {
      name: trimmedName,
      nickname: cleanedNickname || trimmedName.toLowerCase().replace(/\s+/g, '_'),
      avatar: isDataUrl ? user?.avatar : (currentAvatar || user?.avatar),
      phone: phone.trim(),
      city: city.trim(),
    };

    if (onUpdateUser) {
      onUpdateUser(updatedData);
    }

    setSuccessMsg(
      isDataUrl
        ? 'Name, city & phone saved to Firestore! Note: choose a preset avatar or HTTPS URL for cross-device avatar sync.'
        : 'Profile updated in Firestore successfully!'
    );
    setTimeout(() => {
      setSuccessMsg(null);
      if (onClose) onClose();
    }, 900);
  };

  if (isModal && !isOpen) return null;

  const content = (
    <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl border border-slate-200/80 w-full max-w-lg transition-all text-slate-900">
      {/* Header Bar */}
      <div className="px-6 py-4.5 bg-gradient-to-r from-[#17002e] via-[#350854] to-[#17002e] text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
            {user?.role === 'company_admin' ? (
              <Building2 className="w-5 h-5 text-amber-300" />
            ) : (
              <User className="w-5 h-5 text-purple-200" />
            )}
          </div>
          <div>
            <h3 className="font-black text-base leading-tight">
              {title || (user?.role === 'company_admin' ? 'Edit Company & Brand Profile' : 'Edit Profile & Photo')}
            </h3>
            <p className="text-[11px] text-purple-200/80">
              {user?.role === 'company_admin'
                ? 'Update brand identity, company logo, and manager nickname'
                : 'Upload photo from gallery or take a camera selfie'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
        
        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* =========================================================================
            PROFILE PHOTO / AVATAR CONTROLS (CAMERA + GALLERY + PRESETS)
            ========================================================================= */}
        <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-50/80 rounded-3xl border border-slate-200/70">
          
          {/* Live Camera Viewfinder (if active) */}
          {isCameraActive ? (
            <div className="relative w-52 h-52 rounded-full overflow-hidden border-4 border-purple-600 shadow-xl bg-black mb-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 pointer-events-none border-2 border-white/40 rounded-full" />
              <div className="absolute bottom-2 inset-x-0 flex justify-center gap-2 z-10">
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Snap Photo</span>
                </button>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black text-white font-bold text-xs shadow-lg flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            /* Current Avatar Preview */
            <div className="relative mb-3 group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-purple-500/30 bg-gradient-to-tr from-[#1b0036] to-[#3a0a59] flex items-center justify-center shadow-lg">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-black text-3xl">
                    {(displayName || 'U').charAt(0)}
                  </span>
                )}
              </div>

              {/* Role Badge */}
              <span className="absolute -bottom-1.5 right-0 px-2.5 py-0.5 rounded-full bg-purple-900 text-white text-[10px] font-black uppercase tracking-wider border-2 border-white shadow-xs">
                {user?.role === 'company_admin' ? 'Company' : 'Reviewer'}
              </span>
            </div>
          )}

          {cameraError && (
            <p className="text-[11px] text-rose-600 font-semibold mb-2 max-w-xs">{cameraError}</p>
          )}

          {/* Upload and Camera Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
            {/* Gallery Upload Button */}
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                fileInputRef.current?.click();
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-purple-700" />
              <span>Upload from Gallery</span>
            </button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Take Photo via Camera Button */}
            <button
              type="button"
              onClick={handleStartCamera}
              className="px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-purple-200" />
              <span>Take a Photo</span>
            </button>
          </div>

          {/* Quick Preset Avatars */}
          <div className="mt-3 pt-3 border-t border-slate-200/70 w-full">
            <span className="text-[11px] font-bold text-slate-500 block mb-2">
              Or pick a fast avatar preset:
            </span>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {CURATED_AVATARS.map((av, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setCurrentAvatar(av);
                    setSuccessMsg('Avatar preset selected! Click Save to apply.');
                  }}
                  className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform hover:scale-110 cursor-pointer ${
                    currentAvatar === av ? 'border-purple-600 ring-2 ring-purple-400' : 'border-slate-200'
                  }`}
                >
                  <img src={av} alt="Preset avatar" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            EDITABLE USER / COMPANY INFORMATION FIELDS
            ========================================================================= */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Display Name */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              {user?.role === 'company_admin' ? 'Company / Brand Name' : 'Display Name'}
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user?.role === 'company_admin' ? 'e.g. Samsung Nepal Brand Ops' : 'e.g. Pawan Bahadur Sarki'}
                className="w-full bg-slate-50 rounded-2xl py-2.5 px-4 text-sm font-bold text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          {/* Nickname / Handle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Nickname / Handle
              </label>
              <span className="text-[11px] text-purple-700 font-mono font-bold">
                @{nickname.replace(/^@/, '') || 'nickname'}
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <AtSign className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={nickname.replace(/^@/, '')}
                onChange={(e) => setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder={user?.role === 'company_admin' ? 'samsung_ops' : 'pawan_tech'}
                className="w-full bg-slate-50 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-mono font-bold text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Unique nickname shown on verified video reviews, comments, and leaderboard podium.
            </p>
          </div>

          {/* Email (Readonly) */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Email Address (Google Identity)
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full bg-slate-100 rounded-2xl py-2 px-4 text-xs font-mono text-slate-600 border border-slate-200 cursor-not-allowed"
            />
          </div>

          {/* City & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kathmandu, Pokhara"
                className="w-full bg-slate-50 rounded-2xl py-2 px-4 text-xs font-bold text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9841234567"
                className="w-full bg-slate-50 rounded-2xl py-2 px-4 text-xs font-bold text-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="flex-1 py-2.5 px-5 rounded-full bg-gradient-to-r from-[#17002e] via-[#350854] to-[#17002e] hover:brightness-110 text-white text-xs font-black shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      {content}
    </div>
  );
};
