import React from 'react';

interface DotLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'gradient' | 'dark';
  className?: string;
}

export const DotLogo: React.FC<DotLogoProps> = ({
  size = 'md',
  variant = 'gradient',
  className = '',
}) => {
  const boxSize =
    size === 'sm' ? 'w-7 h-7 rounded-lg' : size === 'lg' ? 'w-11 h-11 rounded-2xl' : 'w-8 h-8 rounded-xl';

  const bgClass =
    variant === 'dark'
      ? 'bg-slate-900 shadow-sm'
      : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-md shadow-indigo-500/20';

  return (
    <span
      className={`${boxSize} ${bgClass} inline-flex items-center justify-center shrink-0 ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="w-[70%] h-[70%]" fill="none">
        <circle cx="16" cy="16" r="10.5" fill="#FFFFFF" fillOpacity="0.22" />
        <circle cx="16" cy="16" r="6" fill="#FFFFFF" />
      </svg>
    </span>
  );
};
