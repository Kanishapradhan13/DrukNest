import React, { useEffect, useState } from 'react';

function useWindowWidth() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Listing, Review } from '../lib/types';
import { Icon } from '../components/Icons';
import Thumb from '../components/Thumb';
import Card from '../components/Card';
import { useToast } from '../contexts/ToastContext';

interface ListingDetailProps {
  setView: (v: string) => void;
  listingId?: string;
}

const DURATIONS = ['6 months', '1 year', '2 years'];

export default function ListingDetail({ setView, listingId }: ListingDetailProps) {
  const { user, profile } = useAuth();
  const width = useWindowWidth();
  const isMobile = width <= 768;
  const { toast } = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [activeThumb, setActiveThumb] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [moveInDate, setMoveInDate] = useState('');
  const [moveOutDate, setMoveOutDate] = useState('');
  const [showHostProfile, setShowHostProfile] = useState(false);
  const [ownerListings, setOwnerListings] = useState<Listing[]>([]);
  const [duration] = useState(DURATIONS[1]);
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

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
        /* increment view counter */
        supabase.from('listings').update({ views: (l.views ?? 0) + 1 }).eq('id', l.id);
        const { data: sim } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'live')
          .neq('id', l.id)
          .or(`city.eq.${l.city},type.eq.${l.type}`)
          .limit(3);
        if (sim) setSimilar(sim as Listing[]);
        const { data: revData } = await supabase
          .from('reviews')
          .select('*, tenant:profiles(id, full_name, avatar_url, avatar_letter)')
          .eq('listing_id', l.id)
          .order('created_at', { ascending: false });
        if (revData) setReviews(revData as Review[]);
        const { data: ownerProps } = await supabase
          .from('listings')
          .select('*')
          .eq('owner_id', l.owner_id)
          .eq('status', 'live')
          .limit(6);
        if (ownerProps) setOwnerListings(ownerProps as Listing[]);
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
      await supabase.from('notifications').insert({
        user_id: listing.owner_id, type: 'new_inquiry',
        title: 'New Inquiry!',
        body: `${profile?.full_name ?? 'Someone'} is interested in "${listing.title}".`,
        link_view: 'owner',
      });
    }
    setMsgLoading(false);
    setMsgSent(true);
    setMsgText('');
    toast('Message sent to the owner!');
    setTimeout(() => { setShowMessage(false); setMsgSent(false); }, 2000);
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !listing) return;
    setReviewSubmitting(true);
    const { error } = await supabase.from('reviews').upsert({
      listing_id: listing.id,
      tenant_id: user.id,
      rating: reviewRating,
      comment: reviewComment,
    }, { onConflict: 'listing_id,tenant_id' });
    if (!error) {
      const newReview: Review = {
        id: Math.random().toString(36),
        listing_id: listing.id,
        tenant_id: user.id,
        rating: reviewRating,
        comment: reviewComment,
        created_at: new Date().toISOString(),
        tenant: profile ? { id: profile.id, full_name: profile.full_name, avatar_letter: profile.avatar_letter, cid_verified: profile.cid_verified, docs_verified: profile.docs_verified, email: profile.email, role: profile.role, created_at: profile.created_at } : undefined,
      };
      setReviews(prev => [newReview, ...prev.filter(r => r.tenant_id !== user.id)]);
      /* update listing rating */
      const allRatings = [reviewRating, ...reviews.filter(r => r.tenant_id !== user.id).map(r => r.rating)];
      const avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
      await supabase.from('listings').update({ rating: Math.round(avgRating * 10) / 10, review_count: allRatings.length }).eq('id', listing.id);
      toast('Review submitted!');
      setShowReviewForm(false);
      setReviewComment('');
    } else {
      toast('Failed to submit review', 'error');
    }
    setReviewSubmitting(false);
  }

  async function handleSignLease(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setView('signin'); return; }
    if (!listing) return;
    setLeaseLoading(true);
    const startDate = moveInDate || new Date().toISOString().split('T')[0];
    const endDate = moveOutDate || (() => {
      const months = duration === '6 months' ? 6 : duration === '1 year' ? 12 : 24;
      const e = new Date(startDate);
      e.setMonth(e.getMonth() + months);
      return e.toISOString().split('T')[0];
    })();
    await supabase.from('leases').insert({
      listing_id: listing.id,
      tenant_id: user.id,
      owner_id: listing.owner_id,
      start_date: startDate,
      end_date: endDate,
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
          padding: isMobile ? '0 14px 60px' : '0 24px 60px',
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
            gridTemplateColumns: isMobile ? '1fr' : '1fr 360px',
            gap: 28,
            alignItems: 'start',
          }}
        >
          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Photo Gallery */}
            <div style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
              {/* Main image */}
              <div
                style={{ position: 'relative', borderRadius: '24px 24px 0 0', overflow: 'hidden', cursor: hasPhotos ? 'zoom-in' : 'default' }}
                onClick={() => { if (hasPhotos) setLightboxUrl(photos[Math.min(activeThumb, photos.length - 1)]); }}
              >
                <Thumb
                  pal={palettes[Math.min(activeThumb, palettes.length - 1)]}
                  h={isMobile ? 240 : 440}
                  imageUrl={hasPhotos ? photos[Math.min(activeThumb, photos.length - 1)] : undefined}
                  style={{ borderRadius: 0 }}
                />
                {hasPhotos && (
                  <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'white', backdropFilter: 'blur(4px)' }}>
                    {activeThumb + 1} / {photos.length}  · Click to expand
                  </div>
                )}
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
                  gridTemplateColumns: `repeat(${hasPhotos ? Math.min(photos.length, isMobile ? 4 : 5) : (isMobile ? 4 : 5)}, 1fr)`,
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
                  fontSize: isMobile ? 24 : 34,
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
                  ...(listing.available_from ? [{ icon: 'home' as const, label: `Available ${new Date(listing.available_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, alt: '📅' }] : []),
                  ...((listing.views ?? 0) > 0 ? [{ icon: 'home' as const, label: `${listing.views} views`, alt: '👁' }] : []),
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

            {/* Reviews section */}
            <div style={cardBox}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', margin: 0 }}>
                  Reviews {reviews.length > 0 && <span style={{ fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: 'var(--slate3)', fontWeight: 400 }}>({reviews.length})</span>}
                </h3>
                {user && profile?.role === 'tenant' && (
                  <button
                    onClick={() => setShowReviewForm(v => !v)}
                    style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--lav-300)', background: 'var(--lav-50)', color: 'var(--lav-700)', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}
                  >
                    {showReviewForm ? 'Cancel' : '+ Write Review'}
                  </button>
                )}
              </div>

              {showReviewForm && (
                <form onSubmit={submitReview} style={{ background: 'var(--lav-50)', borderRadius: 14, padding: '16px 18px', marginBottom: 20, border: '1px solid var(--lav-200)' }}>
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Your Rating</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button" onClick={() => setReviewRating(n)}
                          style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: n <= reviewRating ? '#F5A623' : 'var(--lav-200)', lineHeight: 1, padding: '2px 0' }}>
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Share your experience…"
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--lav-200)', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: 'var(--ink)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button type="submit" disabled={reviewSubmitting}
                    style={{ marginTop: 10, padding: '9px 20px', borderRadius: 10, border: 'none', background: 'var(--lav-500)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              )}

              {reviews.length === 0 && !showReviewForm && (
                <p style={{ color: 'var(--slate3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No reviews yet. Be the first!</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ paddingBottom: 14, borderBottom: '1px solid var(--lav-100)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
                        {(r.tenant as typeof r.tenant & { avatar_url?: string })?.avatar_url
                          ? <img src={(r.tenant as typeof r.tenant & { avatar_url?: string }).avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (r.tenant?.avatar_letter ?? r.tenant?.full_name?.charAt(0) ?? 'U')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{r.tenant?.full_name ?? 'Tenant'}</p>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1,2,3,4,5].map(n => (
                            <span key={n} style={{ fontSize: 12, color: n <= r.rating ? '#F5A623' : 'var(--lav-200)' }}>★</span>
                          ))}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--slate3)' }}>
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {r.comment && <p style={{ fontSize: 13, color: 'var(--slate2)', lineHeight: 1.55, margin: 0 }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Owner / Host Card */}
            <div style={cardBox}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', marginBottom: 16 }}>
                Meet your host
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div
                  onClick={() => setShowHostProfile(true)}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--lav-400), var(--lav-600))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: "'DM Serif Display', serif", fontSize: 24,
                    flexShrink: 0, cursor: 'pointer', overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(139,111,232,0.25)',
                  }}
                >
                  {listing.owner?.avatar_url
                    ? <img src={listing.owner.avatar_url} alt={ownerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : ownerInitial}
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--ink)' }}>
                      {ownerName}
                    </span>
                    {listing.owner?.cid_status === 'verified' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F0FDF4', color: '#16A34A', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, border: '1px solid #86EFAC' }}>
                        <Icon type="verified" size={11} /> CID Verified
                      </span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--lav-100)', color: 'var(--lav-700)', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                      <Icon type="verified" size={11} /> Verified Owner
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--slate3)', marginBottom: 6 }}>
                    {listing.owner?.city && `📍 ${listing.owner.city} · `}Member since {new Date(listing.owner?.created_at ?? listing.created_at).getFullYear()}
                  </p>
                  {listing.owner?.bio && (
                    <p style={{ fontSize: 13, color: 'var(--slate2)', lineHeight: 1.5, margin: 0 }}>
                      {listing.owner.bio.length > 100 ? listing.owner.bio.slice(0, 100) + '…' : listing.owner.bio}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <button
                  onClick={() => setShowHostProfile(true)}
                  style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px solid var(--lav-300)', background: 'var(--lav-50)', color: 'var(--lav-700)', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}
                >
                  👤 View Profile
                </button>
                <button
                  onClick={() => setShowMessage(true)}
                  style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px solid var(--lav-400)', background: 'var(--lav-500)', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}
                >
                  💬 Message Host
                </button>
                {listing.owner?.whatsapp && (
                  <a
                    href={`https://wa.me/${listing.owner.whatsapp.replace(/\D/g, '')}`}
                    target="_blank" rel="noreferrer"
                    style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px solid #25D366', background: '#F0FDF4', color: '#16A34A', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    📱 WhatsApp
                  </a>
                )}
                {listing.owner?.phone && !listing.owner?.whatsapp && (
                  <a
                    href={`tel:${listing.owner.phone}`}
                    style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px solid var(--lav-300)', background: 'var(--lav-50)', color: 'var(--lav-700)', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    📞 Call
                  </a>
                )}
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
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
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
          <div style={isMobile ? {} : { position: 'sticky', top: 82 }}>
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>
                    Move-out Date
                  </label>
                  <input
                    type="date"
                    value={moveOutDate}
                    onChange={(e) => setMoveOutDate(e.target.value)}
                    style={{ ...inputBase, cursor: 'pointer' }}
                    min={moveInDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
                {moveInDate && moveOutDate && new Date(moveOutDate) > new Date(moveInDate) && (() => {
                  const months = Math.round((new Date(moveOutDate).getTime() - new Date(moveInDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
                  return (
                    <div style={{ background: 'var(--lav-50)', border: '1px solid var(--lav-200)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: 'var(--lav-700)', fontWeight: 500 }}>
                      Duration: <strong>{months} month{months !== 1 ? 's' : ''}</strong> · Total: <strong>Nu {(listing.price * months).toLocaleString()}</strong>
                    </div>
                  );
                })()}
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

      {/* ── HOST PROFILE MODAL ── */}
      {showHostProfile && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(30,27,46,0.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowHostProfile(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 24, boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1E1B2E 0%, #3B2D6E 100%)', borderRadius: '24px 24px 0 0', padding: '32px 28px 28px', position: 'relative' }}>
              <button
                onClick={() => setShowHostProfile(false)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--lav-300), var(--lav-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 30, fontFamily: "'DM Serif Display', serif", flexShrink: 0, overflow: 'hidden', boxShadow: '0 4px 20px rgba(139,111,232,0.4)' }}>
                  {listing.owner?.avatar_url
                    ? <img src={listing.owner.avatar_url} alt={ownerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : ownerInitial}
                </div>
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#fff', margin: '0 0 8px' }}>{ownerName}</h2>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, backdropFilter: 'blur(8px)' }}>
                      ✓ Verified Owner
                    </span>
                    {listing.owner?.cid_status === 'verified' && (
                      <span style={{ background: 'rgba(134,239,172,0.2)', border: '1px solid rgba(134,239,172,0.4)', color: '#7EE8A2', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>
                        🪪 CID Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px' }}>
              {/* Quick stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Properties', value: ownerListings.length },
                  { label: 'Member Since', value: new Date(listing.owner?.created_at ?? listing.created_at).getFullYear() },
                  { label: 'Response', value: 'Fast' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'var(--lav-50)', border: '1px solid var(--lav-100)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
                    <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--lav-600)', margin: 0 }}>{stat.value}</p>
                    <p style={{ fontSize: 11, color: 'var(--slate3)', margin: '2px 0 0' }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Contact details */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--ink)', marginBottom: 12 }}>Contact Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {listing.owner?.city && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate2)' }}>
                      <span style={{ width: 28, textAlign: 'center' }}>📍</span>
                      <span>{listing.owner.city}, Bhutan</span>
                    </div>
                  )}
                  {listing.owner?.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate2)' }}>
                      <span style={{ width: 28, textAlign: 'center' }}>📞</span>
                      <a href={`tel:${listing.owner.phone}`} style={{ color: 'var(--lav-600)', textDecoration: 'none' }}>{listing.owner.phone}</a>
                    </div>
                  )}
                  {listing.owner?.whatsapp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate2)' }}>
                      <span style={{ width: 28, textAlign: 'center' }}>📱</span>
                      <a href={`https://wa.me/${listing.owner.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#16A34A', textDecoration: 'none' }}>WhatsApp: {listing.owner.whatsapp}</a>
                    </div>
                  )}
                  {listing.owner?.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--slate2)' }}>
                      <span style={{ width: 28, textAlign: 'center' }}>✉️</span>
                      <span>{listing.owner.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {listing.owner?.bio && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--ink)', marginBottom: 8 }}>About</h4>
                  <p style={{ fontSize: 14, color: 'var(--slate2)', lineHeight: 1.65, margin: 0 }}>{listing.owner.bio}</p>
                </div>
              )}

              {/* Owner's listings */}
              {ownerListings.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--ink)', marginBottom: 12 }}>Properties by {ownerName.split(' ')[0]}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ownerListings.map(l => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--lav-50)', border: '1px solid var(--lav-100)', borderRadius: 12, padding: '10px 14px' }}>
                        {l.photo_urls?.[0] && (
                          <img src={l.photo_urls[0]} alt={l.title} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
                          <p style={{ fontSize: 12, color: 'var(--slate3)', margin: '2px 0 0' }}>📍 {l.city} · Nu {l.price.toLocaleString()}/mo</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setShowHostProfile(false); setShowMessage(true); }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: 'var(--lav-500)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  💬 Message Host
                </button>
                {listing.owner?.whatsapp && (
                  <a
                    href={`https://wa.me/${listing.owner.whatsapp.replace(/\D/g, '')}`}
                    target="_blank" rel="noreferrer"
                    style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #25D366', background: '#F0FDF4', color: '#16A34A', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    📱 WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  { label: 'Move-in', value: moveInDate || '(Today)' },
                  { label: 'Move-out', value: moveOutDate || '(Not set)' },
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

      {/* ── IMAGE LIGHTBOX ── */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}
        >
          <img src={lightboxUrl} alt="Full size" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', objectFit: 'contain' }} />
          {/* prev/next */}
          {photos.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); const prev = (activeThumb - 1 + photos.length) % photos.length; setActiveThumb(prev); setLightboxUrl(photos[prev]); }}
                style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 24, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >‹</button>
              <button
                onClick={e => { e.stopPropagation(); const next = (activeThumb + 1) % photos.length; setActiveThumb(next); setLightboxUrl(photos[next]); }}
                style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 24, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >›</button>
            </>
          )}
          <button
            onClick={() => setLightboxUrl(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 20, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>
      )}
    </div>
  );
}
