import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Listing } from '../lib/types';
import { Icon } from '../components/Icons';
import Thumb from '../components/Thumb';
import Card from '../components/Card';

interface ListingDetailProps {
  setView: (v: string) => void;
  listingId?: string;
}

const DURATIONS = ['6 months', '1 year', '2 years'];

export default function ListingDetail({ setView, listingId }: ListingDetailProps) {
  const { user, profile } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [activeThumb, setActiveThumb] = useState(0);
  const [moveInDate, setMoveInDate] = useState('');
  const [duration, setDuration] = useState(DURATIONS[1]);
  const [showLease, setShowLease] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [msgSent, setMsgSent] = useState(false);
  const [leaseSent, setLeaseSent] = useState(false);
  const [leaseLoading, setLeaseLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);

  const [similar, setSimilar] = useState<Listing[]>([]);
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const palettes: [string, string][] = [
    (listing?.pal as [string, string]) ?? ['#C9BCFF', '#8B6FE8'],
    ['#C5D4F0', '#9FB0DC'],
    ['#D4EEF0', '#80C8D0'],
    ['#F0DCC5', '#DCA87A'],
    ['#D4C5F0', '#B09FDC'],
    ['#C5F0D4', '#7ADC9F'],
  ];

  useEffect(() => {
    if (!listingId) return;
    async function load() {
      const { data } = await supabase
        .from('listings')
        .select('*, owner:profiles(*)')
        .eq('id', listingId)
        .single();
      if (data) {
        const l = data as Listing;
        setListing(l);
        const { data: sim } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'live')
          .neq('id', l.id)
          .or(`city.eq.${l.city},type.eq.${l.type}`)
          .limit(3);
        if (sim) setSimilar(sim as Listing[]);
      }
    }
    load();
  }, [listingId]);

  /* Check if this listing is already saved by the current user */
  useEffect(() => {
    if (!user || !listing) return;
    supabase
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listing.id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, listing]);

  async function toggleSave() {
    if (!user) { setView('signin'); return; }
    setSaveLoading(true);
    if (saved) {
      const { error } = await supabase.from('saved_listings').delete()
        .eq('user_id', user.id).eq('listing_id', listing!.id);
      if (error) { console.error('[toggleSave] delete error:', error); }
      else setSaved(false);
    } else {
      const { error } = await supabase.from('saved_listings').insert(
        { user_id: user.id, listing_id: listing!.id }
      );
      if (!error) setSaved(true);
    }
    setSaveLoading(false);
  }

  if (!listing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lav-50)' }}>
        <p style={{ color: 'var(--slate2)', fontFamily: "'DM Sans', sans-serif", fontSize: 15 }}>
          {listingId ? 'Loading…' : 'No listing selected.'}
        </p>
      </div>
    );
  }

  const photos = listing.photo_urls && listing.photo_urls.length > 0 ? listing.photo_urls : [];
  const hasPhotos = photos.length > 0;

  const deposit = listing.deposit ?? 0;
  const platformFee = 0;
  const total = listing.price + deposit + platformFee;

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setView('signin'); return; }
    if (!listing) return;
    setMsgLoading(true);
    const { data: existing } = await supabase
      .from('inquiries')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('sender_id', user.id)
      .maybeSingle();
    if (!existing) {
      await supabase.from('inquiries').insert({
        listing_id: listing.id,
        sender_id: user.id,
        owner_id: listing.owner_id,
        message: msgText,
      });
    }
    setMsgLoading(false);
    setMsgSent(true);
    setMsgText('');
    setTimeout(() => { setShowMessage(false); setMsgSent(false); }, 2000);
  }

  async function handleSignLease(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setView('signin'); return; }
    if (!listing) return;
    setLeaseLoading(true);
    const startDate = moveInDate || new Date().toISOString().split('T')[0];
    // Calculate end date based on duration
    const months = duration === '6 months' ? 6 : duration === '1 year' ? 12 : 24;
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + months);
    await supabase.from('leases').insert({
      listing_id: listing.id,
      tenant_id: user.id,
      owner_id: listing.owner_id,
      start_date: startDate,
      end_date: end.toISOString().split('T')[0],
      monthly_rent: listing.price,
      status: 'pending',
    });
    setLeaseLoading(false);
    setLeaseSent(true);
    setTimeout(() => { setShowLease(false); setLeaseSent(false); }, 2500);
  }

  const ownerName = listing.owner?.full_name ?? 'Property Owner';
  const ownerInitial = ownerName.charAt(0).toUpperCase();

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '10px 13px',
    borderRadius: 10,
    border: '1.5px solid var(--lav-200)',
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: 'var(--ink)',
    background: '#fff',
    outline: 'none',
  };

  const cardBox: React.CSSProperties = {
    background: '#fff',
    borderRadius: 20,
    boxShadow: 'var(--shadow)',
    padding: '24px',
    marginBottom: 20,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--lav-50)',
        fontFamily: "'DM Sans', sans-serif",
        paddingTop: 66,
      }}
    >
      <div
        style={{
          maxWidth: 1260,
          margin: '0 auto',
          padding: '0 24px 60px',
        }}
      >
        {/* Breadcrumb */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '18px 0 22px',
            fontSize: 13,
            color: 'var(--slate3)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <button
            onClick={() => setView('home')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--lav-600)',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
          >
            <Icon type="home" size={14} />
            Home
          </button>
          <span>›</span>
          <button
            onClick={() => setView('listings')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--lav-600)',
              fontFamily: "'DM Sans', sans-serif",
              padding: 0,
            }}
          >
            Listings
          </button>
          <span>›</span>
          <span
            style={{
              color: 'var(--ink)',
              fontWeight: 500,
              maxWidth: 240,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {listing.title}
          </span>
        </nav>

        {/* Main Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: 28,
            alignItems: 'start',
          }}
        >
          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Photo Gallery */}
            <div style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
              {/* Main image */}
              <div style={{ position: 'relative', borderRadius: '24px 24px 0 0', overflow: 'hidden' }}>
                <Thumb
                  pal={palettes[Math.min(activeThumb, palettes.length - 1)]}
                  h={440}
                  imageUrl={hasPhotos ? photos[Math.min(activeThumb, photos.length - 1)] : undefined}
                  style={{ borderRadius: 0 }}
                />
                {/* Verified badge */}
                {listing.verified && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 18,
                      left: 18,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(30,27,46,0.80)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: 99,
                      padding: '5px 12px',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ color: 'var(--lav-400)' }}>
                      <Icon type="verified" size={14} />
                    </span>
                    Verified Listing
                  </div>
                )}
                {/* Tag badge */}
                {listing.tag && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 18,
                      right: 18,
                      background: 'var(--lav-500)',
                      color: '#fff',
                      borderRadius: 99,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {listing.tag}
                  </div>
                )}
              </div>
              {/* Small thumbs row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${hasPhotos ? Math.min(photos.length, 5) : 5}, 1fr)`,
                  gap: 4,
                  background: 'var(--lav-100)',
                  padding: '4px',
                  borderRadius: '0 0 24px 24px',
                }}
              >
                {hasPhotos
                  ? photos.slice(0, 5).map((url, i) => (
                      <div
                        key={i}
                        onClick={() => setActiveThumb(i)}
                        style={{
                          borderRadius: 14,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          opacity: activeThumb === i ? 1 : 0.65,
                          transform: activeThumb === i ? 'scale(1.03)' : 'scale(1)',
                          transition: 'all 0.2s',
                          outline: activeThumb === i ? '2px solid var(--lav-500)' : 'none',
                        }}
                      >
                        <Thumb pal={palettes[0]} h={72} imageUrl={url} style={{ borderRadius: 0 }} />
                      </div>
                    ))
                  : palettes.slice(1).map((pal, i) => (
                      <div
                        key={i}
                        onClick={() => setActiveThumb(i + 1)}
                        style={{
                          borderRadius: 14,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          opacity: activeThumb === i + 1 ? 1 : 0.65,
                          transform: activeThumb === i + 1 ? 'scale(1.03)' : 'scale(1)',
                          transition: 'all 0.2s',
                          outline: activeThumb === i + 1 ? '2px solid var(--lav-500)' : 'none',
                        }}
                      >
                        <Thumb pal={pal} h={72} style={{ borderRadius: 0 }} />
                      </div>
                    ))}
              </div>
            </div>

            {/* Title Row */}
            <div style={{ marginBottom: 20 }}>
              <h1
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 34,
                  color: 'var(--ink)',
                  marginBottom: 8,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                {listing.title}
              </h1>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <p style={{ fontSize: 14, color: 'var(--slate2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📍</span>
                  {listing.location} · {listing.type}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: 24,
                      color: 'var(--ink)',
                    }}
                  >
                    Nu {listing.price.toLocaleString()}
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        color: 'var(--slate3)',
                        fontWeight: 400,
                      }}
                    >
                      {' '}/month
                    </span>
                  </span>
                  {listing.review_count > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 14,
                        color: 'var(--slate2)',
                      }}
                    >
                      <span style={{ color: '#F5A623' }}>
                        <Icon type="star" size={15} />
                      </span>
                      {listing.rating.toFixed(1)}
                      <span style={{ color: 'var(--slate4)' }}>({listing.review_count})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Facts Strip */}
            <div style={{ ...cardBox, padding: '18px 24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                  flexWrap: 'wrap',
                }}
              >
                {[
                  { icon: 'bed' as const, label: `${listing.beds} Bed${listing.beds !== 1 ? 's' : ''}` },
                  { icon: 'bed' as const, label: `${listing.baths} Bath${listing.baths !== 1 ? 's' : ''}`, alt: '🛁' },
                  ...(listing.has_wifi ? [{ icon: 'wifi' as const, label: 'WiFi' }] : []),
                  ...(listing.has_heat ? [{ icon: 'heat' as const, label: 'Heating' }] : []),
                  ...(listing.sqft ? [{ icon: 'home' as const, label: `${listing.sqft} sqft` }] : []),
                ].map((fact, i, arr) => (
                  <React.Fragment key={i}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 20px',
                        color: 'var(--slate)',
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ color: 'var(--lav-500)' }}>
                        {fact.alt ? <span style={{ fontSize: 16 }}>{fact.alt}</span> : <Icon type={fact.icon} size={18} />}
                      </span>
                      {fact.label}
                    </div>
                    {i < arr.length - 1 && (
                      <div
                        style={{
                          width: 1,
                          height: 28,
                          background: 'var(--lav-200)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={cardBox}>
              <h3
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 20,
                  color: 'var(--ink)',
                  marginBottom: 12,
                }}
              >
                About this property
              </h3>
              <p style={{ fontSize: 14, color: 'var(--slate2)', lineHeight: 1.8 }}>
                {listing.description ??
                  `This beautifully maintained ${listing.type.toLowerCase()} is located in the heart of ${listing.city}, offering comfortable living with modern amenities. The property features ${listing.beds} bedroom${listing.beds !== 1 ? 's' : ''} and ${listing.baths} bathroom${listing.baths !== 1 ? 's' : ''}, making it ideal for ${listing.beds > 1 ? 'families or professionals' : 'individuals or couples'}. ${listing.has_wifi ? 'High-speed internet is included.' : ''} ${listing.has_heat ? 'Central heating keeps you warm in winter.' : ''} The ${listing.duration.toLowerCase()} lease terms offer flexibility, and all utilities are either included or easily arranged.`}
              </p>
            </div>

            {/* Owner / Host Card */}
            <div style={cardBox}>
              <h3
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 20,
                  color: 'var(--ink)',
                  marginBottom: 16,
                }}
              >
                Meet your host
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--lav-400), var(--lav-600))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {ownerInitial}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: "'DM Serif Display', serif",
                        fontSize: 17,
                        color: 'var(--ink)',
                      }}
                    >
                      {ownerName}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'var(--lav-100)',
                        color: 'var(--lav-700)',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 99,
                      }}
                    >
                      <Icon type="verified" size={11} />
                      Verified Owner
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--slate3)' }}>
                    Member since {new Date(listing.created_at).getFullYear()}
                  </p>
                </div>
                <button
                  onClick={() => setShowMessage(true)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 12,
                    border: '1.5px solid var(--lav-400)',
                    background: 'var(--lav-50)',
                    color: 'var(--lav-700)',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Message Host
                </button>
              </div>
            </div>


            {/* Similar Listings */}
            {similar.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h3
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 24,
                    color: 'var(--ink)',
                    marginBottom: 16,
                  }}
                >
                  Similar listings
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                  }}
                >
                  {similar.map((l) => (
                    <Card
                      key={l.id}
                      listing={l}
                      layout="grid"
                      onClick={() => setView('listing-' + l.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ position: 'sticky', top: 82 }}>
            <div
              style={{
                background: '#fff',
                borderRadius: 24,
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
              }}
            >
              {/* Price header */}
              <div
                style={{
                  padding: '22px 24px 16px',
                  borderBottom: '1px solid var(--lav-100)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: 30,
                      color: 'var(--ink)',
                    }}
                  >
                    Nu {listing.price.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--slate3)' }}>/month</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--slate2)' }}>
                  <span style={{ color: '#F5A623' }}>
                    <Icon type="star" size={13} />
                  </span>
                  {listing.rating.toFixed(1)}
                  <span style={{ color: 'var(--slate4)' }}>· {listing.review_count} reviews</span>
                  <span style={{ color: 'var(--lav-400)', marginLeft: 4 }}>
                    <Icon type="verified" size={13} />
                  </span>
                </div>
              </div>

              {/* Date & Duration */}
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--slate)',
                      marginBottom: 5,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Move-in Date
                  </label>
                  <input
                    type="date"
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                    style={{ ...inputBase, cursor: 'pointer' }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--slate)',
                      marginBottom: 5,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Lease Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    style={{ ...inputBase, cursor: 'pointer' }}
                  >
                    {DURATIONS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CTA Buttons */}
              <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => setShowLease(true)}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 14,
                    border: 'none',
                    background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    boxShadow: '0 4px 18px rgba(139,111,232,0.32)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Icon type="doc" size={17} />
                  Request Digital Lease
                </button>
                <button
                  onClick={() => setShowMessage(true)}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 14,
                    border: '1.5px solid var(--lav-300)',
                    background: 'var(--lav-50)',
                    color: 'var(--lav-700)',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                  }}
                >
                  Message Host
                </button>
                <button
                  onClick={toggleSave}
                  disabled={saveLoading}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 14,
                    border: `1.5px solid ${saved ? '#FCA5A5' : 'var(--lav-200)'}`,
                    background: saved ? '#FEF2F2' : 'white',
                    color: saved ? '#DC2626' : 'var(--slate2)',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: saveLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'all 0.18s',
                  }}
                >
                  {saved ? '♥ Saved' : '♡ Save Listing'}
                </button>
              </div>

              {/* Price breakdown */}
              <div
                style={{
                  padding: '16px 24px 20px',
                  borderTop: '1px solid var(--lav-100)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <h4
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--slate)',
                    fontFamily: "'DM Sans', sans-serif",
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Price breakdown
                </h4>
                {[
                  { label: 'Monthly rent', value: `Nu ${listing.price.toLocaleString()}` },
                  { label: 'Security deposit', value: `Nu ${deposit.toLocaleString()}` },
                  { label: 'Platform fee', value: 'Nu 0', muted: true },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      color: row.muted ? 'var(--slate3)' : 'var(--slate2)',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <span>{row.label}</span>
                    <span style={{ fontWeight: row.muted ? 400 : 500, color: row.muted ? 'var(--slate3)' : 'var(--ink)' }}>
                      {row.value}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    borderTop: '1.5px solid var(--lav-200)',
                    paddingTop: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <span>First-month total</span>
                  <span>Nu {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Affordability Split Calculator */}
              <div style={{
                margin: '0 16px 20px',
                background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
                border: '1.5px solid var(--lav-200)',
                borderRadius: 16,
                padding: '16px 18px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 12,
                }}>
                  <span style={{ fontSize: 16 }}>🏠</span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12, fontWeight: 700,
                    color: 'var(--lav-700)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    Split Rent Calculator
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[2, 3, 4].map(n => (
                    <div key={n} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#fff',
                      borderRadius: 10,
                      padding: '9px 14px',
                      border: '1px solid var(--lav-100)',
                    }}>
                      <span style={{ fontSize: 13, color: 'var(--slate2)', fontFamily: "'DM Sans', sans-serif" }}>
                        {n} people sharing
                      </span>
                      <span style={{
                        fontFamily: "'DM Serif Display', serif",
                        fontSize: 17, color: 'var(--lav-600)',
                        fontWeight: 400,
                      }}>
                        Nu {Math.ceil(listing.price / n).toLocaleString()}
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--slate3)', fontWeight: 400 }}> /person</span>
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setView('roommates')}
                  style={{
                    marginTop: 12, width: '100%',
                    background: 'var(--lav-500)', color: '#fff',
                    border: 'none', borderRadius: 10,
                    padding: '9px 0', fontSize: 13, fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6,
                  }}
                >
                  👥 Find a Roommate
                </button>
              </div>

              {/* Trust box */}
              <div
                style={{
                  margin: '0 16px 20px',
                  background: 'var(--lav-50)',
                  border: '1px solid var(--lav-200)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ color: 'var(--lav-500)', flexShrink: 0, marginTop: 1 }}>
                  <Icon type="shield" size={18} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--lav-700)',
                      marginBottom: 3,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    DrukNest Protected
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--slate3)', lineHeight: 1.5 }}>
                    All transactions are secured. Digital leases are legally recognised under Bhutan's Digital Information and Communication Act.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── LEASE MODAL ── */}
      {showLease && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(30,27,46,0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLease(false); }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 24,
              boxShadow: 'var(--shadow-xl)',
              width: '100%',
              maxWidth: 520,
              maxHeight: '92vh',
              overflow: 'auto',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: '22px 26px 18px',
                borderBottom: '1px solid var(--lav-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--lav-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--lav-600)',
                  }}
                >
                  <Icon type="doc" size={18} />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: 19,
                      color: 'var(--ink)',
                      margin: 0,
                    }}
                  >
                    Digital Lease Agreement
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--slate3)', margin: 0 }}>
                    DrukNest Secure Document
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLease(false)}
                style={{
                  background: 'var(--lav-100)',
                  border: 'none',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: 'var(--slate)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSignLease} style={{ padding: '22px 26px 26px' }}>
              {/* Details grid */}
              <div
                style={{
                  background: 'var(--lav-50)',
                  border: '1px solid var(--lav-200)',
                  borderRadius: 14,
                  padding: '16px 18px',
                  marginBottom: 20,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px 20px',
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {[
                  { label: 'Property', value: listing.title },
                  { label: 'Location', value: listing.location },
                  { label: 'Tenant', value: profile?.full_name ?? 'Your Name' },
                  { label: 'Owner', value: ownerName },
                  { label: 'Duration', value: duration },
                  { label: 'Monthly Rent', value: `Nu ${listing.price.toLocaleString()}` },
                ].map((row) => (
                  <div key={row.label}>
                    <p style={{ fontSize: 11, color: 'var(--slate3)', marginBottom: 2 }}>{row.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{row.value}</p>
                  </div>
                ))}
              </div>

              <p
                style={{
                  fontSize: 12,
                  color: 'var(--slate3)',
                  lineHeight: 1.6,
                  marginBottom: 20,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                By submitting this lease request, you agree to DrukNest's terms of service and confirm that the information provided is accurate. An OTP will be sent to your registered phone for digital signing.
              </p>

              {leaseSent && (
                <div
                  style={{
                    background: '#EEFBF3',
                    border: '1px solid #A8E8C0',
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 16,
                    fontSize: 13,
                    color: '#1A7A40',
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Lease request submitted! The owner will review and respond shortly.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowLease(false)}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    borderRadius: 12,
                    border: '1.5px solid var(--lav-200)',
                    background: '#fff',
                    color: 'var(--slate)',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaseLoading || leaseSent}
                  style={{
                    flex: 2,
                    padding: '12px 0',
                    borderRadius: 12,
                    border: 'none',
                    background: leaseSent
                      ? '#1A7A40'
                      : 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    opacity: leaseLoading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 18px rgba(139,111,232,0.28)',
                  }}
                >
                  <Icon type="doc" size={16} />
                  {leaseLoading ? 'Submitting…' : leaseSent ? 'Submitted!' : 'Sign & Submit Lease'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MESSAGE MODAL ── */}
      {showMessage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(30,27,46,0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowMessage(false); }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 24,
              boxShadow: 'var(--shadow-xl)',
              width: '100%',
              maxWidth: 460,
            }}
          >
            <div
              style={{
                padding: '22px 26px 18px',
                borderBottom: '1px solid var(--lav-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 20,
                  color: 'var(--ink)',
                  margin: 0,
                }}
              >
                Message {ownerName}
              </h3>
              <button
                onClick={() => setShowMessage(false)}
                style={{
                  background: 'var(--lav-100)',
                  border: 'none',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: 'var(--slate)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: '22px 26px 26px' }}>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--slate2)',
                  marginBottom: 14,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Introduce yourself and ask any questions about <strong>{listing.title}</strong>.
              </p>
              <textarea
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder={`Hi ${ownerName.split(' ')[0]}, I am interested in your property…`}
                required
                rows={5}
                style={{
                  ...inputBase,
                  resize: 'vertical',
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--lav-400)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--lav-200)')}
              />

              {msgSent && (
                <div
                  style={{
                    background: '#EEFBF3',
                    border: '1px solid #A8E8C0',
                    borderRadius: 12,
                    padding: '10px 14px',
                    marginBottom: 14,
                    fontSize: 13,
                    color: '#1A7A40',
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  Message sent! The owner will get back to you soon.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowMessage(false)}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    borderRadius: 12,
                    border: '1.5px solid var(--lav-200)',
                    background: '#fff',
                    color: 'var(--slate)',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={msgLoading || msgSent}
                  style={{
                    flex: 2,
                    padding: '12px 0',
                    borderRadius: 12,
                    border: 'none',
                    background: msgSent
                      ? '#1A7A40'
                      : 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    opacity: msgLoading ? 0.7 : 1,
                    boxShadow: '0 4px 14px rgba(139,111,232,0.28)',
                  }}
                >
                  {msgLoading ? 'Sending…' : msgSent ? 'Sent!' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
