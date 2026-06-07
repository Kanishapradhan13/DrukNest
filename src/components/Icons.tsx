import React from 'react';
import {
  BadgeCheck,
  Wifi,
  Flame,
  BedDouble,
  Search,
  ShieldCheck,
  FileText,
  Home,
  Star,
  SquareParking,
  Droplets,
  Zap,
  UserCheck,
} from 'lucide-react';

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
  if (type === 'logo') {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2 C6 2 3 5 3 9 C3 11 4 13 6 14.5 L6 17 L8 16 L10 18 L12 16 L14 17 L14 14.5 C16 13 17 11 17 9 C17 5 14 2 10 2Z"
          fill="rgba(255,255,255,0.9)"
        />
        <circle cx="7.5" cy="9" r="1.2" fill="rgba(139,111,232,0.8)" />
        <circle cx="12.5" cy="9" r="1.2" fill="rgba(139,111,232,0.8)" />
      </svg>
    );
  }

  const props = { size, strokeWidth: 1.8 };

  const icons: Record<Exclude<IconType, 'logo'>, React.ReactElement> = {
    verified:    <BadgeCheck {...props} />,
    wifi:        <Wifi {...props} />,
    heat:        <Flame {...props} />,
    bed:         <BedDouble {...props} />,
    search:      <Search {...props} />,
    shield:      <ShieldCheck {...props} />,
    doc:         <FileText {...props} />,
    home:        <Home {...props} />,
    star:        <Star {...props} fill="currentColor" />,
    parking:     <SquareParking {...props} />,
    water:       <Droplets {...props} />,
    electricity: <Zap {...props} />,
    security:    <UserCheck {...props} />,
  };

  return icons[type] ?? null;
}
