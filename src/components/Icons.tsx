import React from 'react';

type IconType =
  | 'verified'
  | 'wifi'
  | 'heat'
  | 'bed'
  | 'search'
  | 'shield'
  | 'doc'
  | 'home'
  | 'star'
  | 'logo'
  | 'parking'
  | 'water'
  | 'electricity'
  | 'security';

export function Icon({ type, size = 24 }: { type: IconType; size?: number }) {
  const icons: Record<IconType, React.ReactElement> = {
    verified: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L14.4 8.4L21 9.3L16.2 14L17.5 21L12 17.8L6.5 21L7.8 14L3 9.3L9.6 8.4Z"
          fill="currentColor"
          opacity=".15"
        />
        <polyline
          points="6,12 10,16 18,8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
    wifi: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5C7.2 10.3 9.9 9 12 9s4.8 1.3 7 3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 16c1.1-1.1 2.4-1.8 4-1.8s2.9.7 4 1.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="19" r="1" fill="currentColor" />
      </svg>
    ),
    heat: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M8 14c0-2 2-3 2-5M12 14c0-2 2-3 2-5M16 14c0-2 2-3 2-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    bed: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="11" width="18" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M3 11V8a2 2 0 012-2h14a2 2 0 012 2v3"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M3 15h18" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path
          d="m20 20-3.5-3.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    shield: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l8 3.5v5C20 16 16.5 20 12 21 7.5 20 4 16 4 11.5V6.5L12 3z"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="currentColor"
          fillOpacity=".1"
        />
        <polyline
          points="8,12 11,15 16,9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
    doc: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 7h6M8 11h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    home: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12L12 4l9 8v9a1 1 0 01-1 1H5a1 1 0 01-1-1z"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="currentColor"
          fillOpacity=".1"
        />
        <path d="M9 21V13h6v8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
    star: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M12 2l2.9 6.4 6.8.9-4.9 4.8 1.2 7-6-3.3-6 3.3 1.2-7L2 9.3l6.8-.9z"
          opacity=".9"
        />
      </svg>
    ),
    logo: (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2 C6 2 3 5 3 9 C3 11 4 13 6 14.5 L6 17 L8 16 L10 18 L12 16 L14 17 L14 14.5 C16 13 17 11 17 9 C17 5 14 2 10 2Z"
          fill="rgba(255,255,255,0.9)"
        />
        <circle cx="7.5" cy="9" r="1.2" fill="rgba(139,111,232,0.8)" />
        <circle cx="12.5" cy="9" r="1.2" fill="rgba(139,111,232,0.8)" />
      </svg>
    ),
    parking: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M9 17V7h4a3 3 0 010 6H9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    water: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C6 10 4 14 4 16a8 8 0 0016 0c0-2-2-6-8-14z"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="currentColor"
          fillOpacity=".1"
        />
      </svg>
    ),
    electricity: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity=".1"
        />
      </svg>
    ),
    security: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return icons[type] ?? null;
}
