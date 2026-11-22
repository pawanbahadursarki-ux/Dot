import React, { useEffect, useState } from 'react';
import { ImageOff, Loader2, Maximize2 } from 'lucide-react';
import { getFirebaseIdToken } from '../services/firebaseService';

interface PrivatePaymentScreenshotProps {
  src?: string;
  alt?: string;
  className?: string;
  onPreview?: (objectUrl: string) => void;
}

export const PrivatePaymentScreenshot: React.FC<PrivatePaymentScreenshotProps> = ({
  src,
  alt = 'Payment screenshot evidence',
  className = 'w-16 h-16 object-cover rounded-lg border border-slate-200',
  onPreview,
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!src) {
      setObjectUrl(null);
      setError(false);
      return;
    }
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      setObjectUrl(src);
      setError(false);
      setLoading(false);
      return;
    }

    let revoked = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const token = await getFirebaseIdToken();
        const resp = await fetch(src, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const blob = await resp.blob();
        createdUrl = URL.createObjectURL(blob);
        if (!revoked) {
          setObjectUrl(createdUrl);
        } else {
          URL.revokeObjectURL(createdUrl);
        }
      } catch {
        if (!revoked) {
          setError(true);
          setObjectUrl(null);
        }
      } finally {
        if (!revoked) {
          setLoading(false);
        }
      }
    })();

    return () => {
      revoked = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  if (!src) return null;

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 text-[10px] p-1 text-center ${className}`}
        title="Unable to load private payment screenshot"
      >
        <ImageOff className="w-4 h-4 mb-0.5" />
        <span>Unavailable</span>
      </div>
    );
  }

  if (onPreview) {
    return (
      <button
        type="button"
        onClick={() => onPreview(objectUrl)}
        className="relative group inline-block cursor-pointer focus:outline-none"
        title="Click to enlarge payment screenshot"
      >
        <img src={objectUrl} alt={alt} className={className} />
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white">
          <Maximize2 className="w-4 h-4" />
        </span>
      </button>
    );
  }

  return <img src={objectUrl} alt={alt} className={className} />;
};
