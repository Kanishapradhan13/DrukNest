import React, { useEffect, useState } from 'react';
import type { Listing } from '../lib/types';
import { BadgeCheck, BedDouble, Wifi, Flame, SquareParking, Star } from 'lucide-react';
import Thumb from './Thumb';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CardProps {
  listing: Listing;
  layout: 'grid' | 'list';
  onClick: () => void;
  setView?: (v: string) => void;
}

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  'New':        { bg: 'var(--lav-100)',  color: 'var(--lav-700)' },
  'Popular':    { bg: '#FFF3E0',         color: '#E57C00' },
  'Rare Find':  { bg: '#FDE8F5',         color: '#B0408A' },
  'Top Rated':  { bg: '#E8F9F0',         color: '#2D8A5E' },
  'Luxury':     { bg: '#FFF8DC',         color: '#B8860B' },
};

export default function Card({ listing, layout, onClick, setView }: CardProps) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const tagStyle = listing.tag ? (TAG_STYLES[listing.tag] ?? TAG_STYLES['New']) : null;

  useEffect(() => {
    if (!user) return;
    supabase
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listing.id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, listing.id]);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { setView?.('signin'); return; }
    if (saveLoading) return;
    setSaveLoading(true);
    if (saved) {
      const { error } = await supabase.from('saved_listings').delete()
        .eq('user_id', user.id).eq('listing_id', listing.id);
      if (!error) setSaved(false);
    } else {
      const { error } = await supabase.from('saved_listings').insert(
        { user_id: user.id, listing_id: listing.id }
      );
      if (!error) setSaved(true);
    }
    setSaveLoading(false);
  };

  /* ── GRID LAYOUT ──────────────────────────────────────────────── */
  if (layout === 'grid') {
    return (
      <article
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#ffffff',
          borderRadius: 20,
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow)',
          transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
          transition: 'transform 0.22s cubic-bezier(.22,1,.36,1), box-shadow 0.22s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Thumbnail area */}
        <div style={{ position: 'relative', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
          <Thumb
            pal={listing.pal as [string, string]}
            h={200}
            imageUrl={listing.photo_urls?.[0]}
            style={{ borderRadius: 0 }}
          />

          {/* Save button — top right */}
          <button
            onClick={handleSave}
            aria-label={saved ? 'Unsave listing' : 'Save listing'}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              color: saved ? '#e53e6e' : '#9A97B0',
              transition: 'color 0.2s, transform 0.15s',
              transform: saved ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            {saved ? '♥' : '♡'}
          </button>

          {/* Tag badge — top left */}
          {listing.tag && tagStyle && (
            <span
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: tagStyle.bg,
                color: tagStyle.color,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.04em',
                padding: '3px 9px',
                borderRadius: 99,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              {listing.tag}
            </span>
          )}

          {/* Verified badge — bottom left */}
          {listing.verified && (
            <span
              style={{
                position: 'absolute',
                bottom: 10,
                left: 12,
                background: 'rgba(30,27,46,0.75)',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                padding: '3px 8px',
                borderRadius: 99,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                backdropFilter: 'blur(6px)',
              }}
            >
              <span style={{ color: '#8B6FE8', lineHeight: 1 }}>
                <BadgeCheck size={13} strokeWidth={1.8} />
              </span>
              Verified
            </span>
          )}
        </div>

        {/* Card body */}
        <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Title */}
          <h3
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 16,
              fontWeight: 400,
              color: 'var(--ink)',
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            {listing.title}
          </h3>

          {/* Location */}
          <p
            style={{
              fontSize: 12,
              color: 'var(--slate2)',
              fontFamily: "'DM Sans', sans-serif",
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <span style={{ fontSize: 11 }}>📍</span>
            {listing.location}{listing.city ? `, ${listing.city}` : ''}
          </p>

          {/* Amenity icons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 4,
              color: 'var(--slate3)',
            }}
          >
            <span
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--slate2)' }}
            >
              <BedDouble size={15} strokeWidth={1.8} />
              {listing.beds}bd
            </span>
            {listing.has_wifi && (
              <span style={{ color: 'var(--lav-500)', display: 'flex', alignItems: 'center' }}>
                <Wifi size={15} strokeWidth={1.8} />
              </span>
            )}
            {listing.has_heat && (
              <span style={{ color: 'var(--lav-500)', display: 'flex', alignItems: 'center' }}>
                <Flame size={15} strokeWidth={1.8} />
              </span>
            )}
            {listing.has_parking && (
              <span style={{ color: 'var(--lav-500)', display: 'flex', alignItems: 'center' }}>
                <SquareParking size={15} strokeWidth={1.8} />
              </span>
            )}
          </div>

          {/* Price + reviews */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginTop: 'auto',
              paddingTop: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 20,
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                Nu {listing.price.toLocaleString()}
              </span>
              <span style={{ fontSize: 12, color: 'var(--slate3)', fontFamily: "'DM Sans', sans-serif" }}>
                /mo
              </span>
            </div>
            {listing.review_count > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: 'var(--slate2)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span style={{ color: '#F5A623', display: 'flex', alignItems: 'center' }}>
                  <Star size={13} strokeWidth={1.8} fill="currentColor" />
                </span>
                <span>{listing.rating.toFixed(1)}</span>
                <span style={{ color: 'var(--slate4)' }}>({listing.review_count})</span>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  /* ── LIST LAYOUT ──────────────────────────────────────────────── */
  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
      }}
    >
      {/* Left thumbnail */}
      <div style={{ width: 200, flexShrink: 0, position: 'relative' }}>
        <Thumb
          pal={listing.pal as [string, string]}
          h={160}
          imageUrl={listing.photo_urls?.[0]}
          style={{ height: '100%', borderRadius: 0 }}
        />
        {listing.tag && tagStyle && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: tagStyle.bg,
              color: tagStyle.color,
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              padding: '2px 8px',
              borderRadius: 99,
            }}
          >
            {listing.tag}
          </span>
        )}
      </div>

      {/* Right content */}
      <div
        style={{
          flex: 1,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <div>
          {/* Title + verified */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 17,
                fontWeight: 400,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              {listing.title}
            </h3>
            {listing.verified && (
              <span style={{ color: '#8B6FE8', display: 'flex', alignItems: 'center' }}>
                <BadgeCheck size={15} strokeWidth={1.8} />
              </span>
            )}
          </div>

          {/* Location */}
          <p
            style={{
              fontSize: 12,
              color: 'var(--slate2)',
              fontFamily: "'DM Sans', sans-serif",
              margin: '0 0 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <span style={{ fontSize: 11 }}>📍</span>
            {listing.location}{listing.city ? `, ${listing.city}` : ''}
          </p>

          {/* Amenities */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              color: 'var(--slate2)',
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <BedDouble size={14} strokeWidth={1.8} />
              {listing.beds} bed{listing.beds !== 1 ? 's' : ''}
            </span>
            {listing.has_wifi && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--lav-500)' }}>
                <Wifi size={14} strokeWidth={1.8} />
                WiFi
              </span>
            )}
            {listing.has_heat && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--lav-500)' }}>
                <Flame size={14} strokeWidth={1.8} />
                Heating
              </span>
            )}
            {listing.has_parking && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--lav-500)' }}>
                <SquareParking size={14} strokeWidth={1.8} />
                Parking
              </span>
            )}
          </div>
        </div>

        {/* Bottom row: price + button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 20,
                color: 'var(--ink)',
              }}
            >
              Nu {listing.price.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: 'var(--slate3)', fontFamily: "'DM Sans', sans-serif" }}>
              /mo
            </span>
            {listing.review_count > 0 && (
              <span
                style={{
                  marginLeft: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 12,
                  color: 'var(--slate2)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span style={{ color: '#F5A623', display: 'flex', alignItems: 'center' }}>
                  <Star size={12} strokeWidth={1.8} fill="currentColor" />
                </span>
                {listing.rating.toFixed(1)}
                <span style={{ color: 'var(--slate4)' }}>({listing.review_count})</span>
              </span>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              color: '#ffffff',
              background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
              border: 'none',
              borderRadius: 10,
              padding: '8px 20px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(139,111,232,0.28)',
              transition: 'opacity 0.2s',
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}
